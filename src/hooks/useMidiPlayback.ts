import { useEffect, useRef } from 'react'
import { useTransportStore } from '../stores/transport-store'
import { useProjectStore } from '../stores/project-store'
import { useMidiOutputStore } from '../stores/midi-output-store'
import { resolveEventToRawMidi, getProfile } from '../engine/device-protocol'
import { sendMessages, sendClockStart, sendClockStop, sendClockPulse } from '../engine/midi-output'
import { positionToTotalTicks, secondsToPosition } from '../engine/clock'
import { TICKS_PER_BEAT } from '../types/midi'
import { isSweepCommand, applyEasing } from '../engine/sweep'

const CLOCK_PPQ = 24

export function useMidiPlayback() {
  const sentEventsRef = useRef<Set<string>>(new Set())
  const lastTickRef = useRef<number>(-1)
  const wasPlayingRef = useRef(false)
  const nextClockPulseRef = useRef<number>(0)
  const playStartTimeRef = useRef<number>(0)

  interface ActiveSweep {
    startTick: number
    endTick: number
    controller: number
    startValue: number
    endValue: number
    easingType: number
    lastSentValue: number
    channel: number
    port: MIDIOutput
  }
  const activeSweepsRef = useRef<Map<string, ActiveSweep>>(new Map())

  useEffect(() => {
    const unsubscribe = useTransportStore.subscribe((state) => {
      const { isPlaying, currentTimeSeconds } = state
      const song = useProjectStore.getState().activeSong()
      const devices = useProjectStore.getState().setlistDevices()
      const customProfiles = useProjectStore.getState().project.customProfiles
      const beatsPerBar = song.timeSignature[0]

      const clockPorts = useMidiOutputStore.getState().getClockPorts()

      if (!isPlaying && wasPlayingRef.current) {
        sentEventsRef.current.clear()
        activeSweepsRef.current.clear()
        lastTickRef.current = -1
        wasPlayingRef.current = false
        for (const port of clockPorts) sendClockStop(port)
        return
      }

      if (!isPlaying) return

      if (!wasPlayingRef.current) {
        wasPlayingRef.current = true
        const pos = secondsToPosition(currentTimeSeconds, song.bpm, beatsPerBar)
        lastTickRef.current = positionToTotalTicks(pos, beatsPerBar)
        sentEventsRef.current.clear()

        // Initialize clock: compute which pulse we're at based on current position
        const secondsPerBeat = 60 / song.bpm
        const secondsPerPulse = secondsPerBeat / CLOCK_PPQ
        nextClockPulseRef.current = Math.ceil(currentTimeSeconds / secondsPerPulse)
        playStartTimeRef.current = performance.now() - currentTimeSeconds * 1000

        for (const port of clockPorts) sendClockStart(port)
        return
      }

      const currentPos = secondsToPosition(currentTimeSeconds, song.bpm, beatsPerBar)
      const currentTick = positionToTotalTicks(currentPos, beatsPerBar)

      // Seek detected (jumped backward)
      if (currentTick < lastTickRef.current - 10) {
        sentEventsRef.current.clear()
        activeSweepsRef.current.clear()
        lastTickRef.current = currentTick

        const secondsPerBeat = 60 / song.bpm
        const secondsPerPulse = secondsPerBeat / CLOCK_PPQ
        nextClockPulseRef.current = Math.ceil(currentTimeSeconds / secondsPerPulse)
        playStartTimeRef.current = performance.now() - currentTimeSeconds * 1000
        return
      }

      // --- MIDI events ---
      const lastTick = lastTickRef.current

      for (const event of song.events) {
        if (sentEventsRef.current.has(event.id)) continue
        const eventTick = positionToTotalTicks(event.position, beatsPerBar)
        if (eventTick > lastTick && eventTick <= currentTick) {
          const device = devices.find((d) => d.id === event.deviceId)
          if (!device) continue
          const port = useMidiOutputStore.getState().getPortForDevice(device.id)
          if (!port) continue
          const profile = getProfile(device.profileId, customProfiles)
          if (!profile) continue

          if (event.commandId && isSweepCommand(event.commandId)) {
            const command = profile.commands.find((c) => c.id === event.commandId)
            const controller = command?.messages[0]?.controller
            if (controller !== undefined) {
              const params = event.parameters ?? {}
              const startValue = params.startValue ?? 0
              const durationBeats = params.durationBeats ?? 4
              activeSweepsRef.current.set(event.id, {
                startTick: eventTick,
                endTick: eventTick + durationBeats * TICKS_PER_BEAT,
                controller,
                startValue,
                endValue: params.endValue ?? 127,
                easingType: params.easingType ?? 0,
                lastSentValue: -1,
                channel: device.midiChannel,
                port
              })
              sendMessages(port, [{
                type: 'cc', channel: device.midiChannel, data: [controller, startValue]
              }])
            }
          } else {
            const messages = resolveEventToRawMidi(event, device, profile)
            sendMessages(port, messages)
          }
          sentEventsRef.current.add(event.id)
        }
      }

      // Interpolate active sweeps
      for (const [eventId, sweep] of activeSweepsRef.current) {
        const totalDuration = sweep.endTick - sweep.startTick
        const t = totalDuration > 0
          ? Math.min(1, (currentTick - sweep.startTick) / totalDuration)
          : 1
        const eased = applyEasing(t, sweep.easingType)
        const value = Math.round(sweep.startValue + (sweep.endValue - sweep.startValue) * eased)
        const clamped = Math.max(0, Math.min(127, value))

        if (clamped !== sweep.lastSentValue) {
          sendMessages(sweep.port, [{
            type: 'cc', channel: sweep.channel, data: [sweep.controller, clamped]
          }])
          sweep.lastSentValue = clamped
        }

        if (t >= 1) {
          activeSweepsRef.current.delete(eventId)
        }
      }

      lastTickRef.current = currentTick

      // --- MIDI Clock pulses ---
      if (clockPorts.length === 0) return

      const secondsPerBeat = 60 / song.bpm
      const secondsPerPulse = secondsPerBeat / CLOCK_PPQ
      const currentPulse = currentTimeSeconds / secondsPerPulse

      // Schedule pulses with precise timestamps using look-ahead
      const baseTime = playStartTimeRef.current
      while (nextClockPulseRef.current <= currentPulse + CLOCK_PPQ) {
        const pulseTime = nextClockPulseRef.current * secondsPerPulse * 1000 + baseTime
        // Only schedule future pulses (or pulses in the current frame window)
        if (pulseTime >= performance.now() - 5) {
          for (const port of clockPorts) sendClockPulse(port, pulseTime)
        }
        nextClockPulseRef.current++
        // Safety: don't schedule more than one beat ahead
        if (nextClockPulseRef.current > currentPulse + CLOCK_PPQ) break
      }
    })

    return unsubscribe
  }, [])
}
