import { useEffect, useRef } from 'react'
import { useTransportStore } from '../stores/transport-store'
import { useProjectStore } from '../stores/project-store'
import { useMidiOutputStore } from '../stores/midi-output-store'
import { resolveEventToRawMidi, getProfile } from '../engine/device-protocol'
import { sendMessages } from '../engine/midi-output'
import { positionToTotalTicks, secondsToPosition } from '../engine/clock'

export function useMidiPlayback() {
  const sentEventsRef = useRef<Set<string>>(new Set())
  const lastTickRef = useRef<number>(-1)
  const wasPlayingRef = useRef(false)

  useEffect(() => {
    const unsubscribe = useTransportStore.subscribe((state, prevState) => {
      const { isPlaying, currentTimeSeconds } = state
      const song = useProjectStore.getState().activeSong()
      const devices = useProjectStore.getState().setlistDevices()
      const customProfiles = useProjectStore.getState().project.customProfiles
      const beatsPerBar = song.timeSignature[0]

      if (!isPlaying && wasPlayingRef.current) {
        sentEventsRef.current.clear()
        lastTickRef.current = -1
        wasPlayingRef.current = false
        return
      }

      if (!isPlaying) return

      if (!wasPlayingRef.current) {
        wasPlayingRef.current = true
        const pos = secondsToPosition(currentTimeSeconds, song.bpm, beatsPerBar)
        lastTickRef.current = positionToTotalTicks(pos, beatsPerBar)
        sentEventsRef.current.clear()
        return
      }

      const currentPos = secondsToPosition(currentTimeSeconds, song.bpm, beatsPerBar)
      const currentTick = positionToTotalTicks(currentPos, beatsPerBar)

      // Seek detected (jumped backward)
      if (currentTick < lastTickRef.current - 10) {
        sentEventsRef.current.clear()
        lastTickRef.current = currentTick
        return
      }

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
          const messages = resolveEventToRawMidi(event, device, profile)
          sendMessages(port, messages)
          sentEventsRef.current.add(event.id)
        }
      }

      lastTickRef.current = currentTick
    })

    return unsubscribe
  }, [])
}
