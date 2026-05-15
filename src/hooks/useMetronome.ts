import { useEffect, useRef } from 'react'
import { useTransportStore } from '../stores/transport-store'
import { useProjectStore } from '../stores/project-store'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}

function scheduleClick(
  ctx: AudioContext,
  time: number,
  isDownbeat: boolean,
  volume: number
) {
  const freq = isDownbeat ? 880 : 440
  const duration = isDownbeat ? 0.04 : 0.03
  const gain = isDownbeat ? volume : volume * 0.6

  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  osc.frequency.value = freq
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)

  gainNode.gain.setValueAtTime(gain, time)
  gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration)

  osc.start(time)
  osc.stop(time + duration + 0.01)

  return osc
}

export function useMetronome() {
  const lastScheduledBeatRef = useRef(-1)
  const acOffsetRef = useRef(0)
  const wasPlayingRef = useRef(false)
  const wasEnabledRef = useRef(false)
  const scheduledNodesRef = useRef<OscillatorNode[]>([])
  const lastBpmRef = useRef(0)

  const cancelAll = () => {
    for (const node of scheduledNodesRef.current) {
      try { node.stop(0) } catch (_) {}
    }
    scheduledNodesRef.current = []
  }

  useEffect(() => {
    const unsubscribe = useTransportStore.subscribe((state) => {
      const { isPlaying, currentTimeSeconds, metronomeEnabled, metronomeVolume } = state
      const song = useProjectStore.getState().activeSong()
      const bpm = song.bpm
      const beatsPerBar = song.timeSignature[0]
      const secondsPerBeat = 60 / bpm

      if (!isPlaying && wasPlayingRef.current) {
        cancelAll()
        lastScheduledBeatRef.current = -1
        wasPlayingRef.current = false
        return
      }

      if (!isPlaying) return

      if (!metronomeEnabled) {
        if (wasEnabledRef.current) {
          cancelAll()
          lastScheduledBeatRef.current = -1
          wasEnabledRef.current = false
        }
        wasPlayingRef.current = true
        return
      }

      const ctx = getAudioContext()

      if (!wasPlayingRef.current || !wasEnabledRef.current) {
        ctx.resume()
        acOffsetRef.current = ctx.currentTime - currentTimeSeconds
        lastScheduledBeatRef.current = Math.floor(currentTimeSeconds / secondsPerBeat) - 1
        wasPlayingRef.current = true
        wasEnabledRef.current = true
        lastBpmRef.current = bpm
      }

      if (bpm !== lastBpmRef.current) {
        cancelAll()
        acOffsetRef.current = ctx.currentTime - currentTimeSeconds
        lastScheduledBeatRef.current = Math.floor(currentTimeSeconds / secondsPerBeat) - 1
        lastBpmRef.current = bpm
      }

      const currentBeat = Math.floor(currentTimeSeconds / secondsPerBeat)

      if (currentBeat < lastScheduledBeatRef.current - 1) {
        cancelAll()
        acOffsetRef.current = ctx.currentTime - currentTimeSeconds
        lastScheduledBeatRef.current = currentBeat - 1
      }

      const lookAheadSeconds = 0.1
      const aheadBeat = Math.floor((currentTimeSeconds + lookAheadSeconds) / secondsPerBeat)

      for (let b = lastScheduledBeatRef.current + 1; b <= aheadBeat; b++) {
        const beatTime = b * secondsPerBeat
        const acTime = acOffsetRef.current + beatTime
        if (acTime < ctx.currentTime - 0.01) continue
        const isDownbeat = b % beatsPerBar === 0
        const node = scheduleClick(ctx, acTime, isDownbeat, metronomeVolume)
        scheduledNodesRef.current.push(node)
      }

      lastScheduledBeatRef.current = Math.max(lastScheduledBeatRef.current, aheadBeat)
    })

    return unsubscribe
  }, [])
}
