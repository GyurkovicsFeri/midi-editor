import { useRef, useEffect, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'

interface WaveformLaneProps {
  audioUrl: string | null
  pixelsPerBeat: number
  beatsPerBar: number
  bpm: number
  scrollX: number
  audioOffsetMs: number
  isPlaying: boolean
  currentTimeSeconds: number
  onOffsetChange: (ms: number) => void
}

export function WaveformLane({
  audioUrl,
  pixelsPerBeat,
  bpm,
  scrollX,
  audioOffsetMs,
  isPlaying,
  currentTimeSeconds,
  onOffsetChange
}: WaveformLaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)
  const [volume, setVolume] = useState(1)

  const secondsPerBeat = 60 / bpm
  const msPerBeat = secondsPerBeat * 1000
  const pixelsPerSecond = pixelsPerBeat / secondsPerBeat
  // Positive audioOffsetMs = audio starts that many ms before bar 1
  // Shift waveform left by offsetPx so bar 1 in the audio aligns with bar 1 on the timeline
  const offsetPx = (audioOffsetMs / 1000) * pixelsPerSecond

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4b5563',
      progressColor: '#6b7280',
      cursorWidth: 0,
      height: 64,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      interact: false,
      normalize: true,
      fillParent: false,
      minPxPerSec: pixelsPerSecond
    })

    ws.load(audioUrl).catch((err) => {
      if (err?.name !== 'AbortError') throw err
    })
    wavesurferRef.current = ws

    return () => {
      ws.destroy()
      wavesurferRef.current = null
    }
  }, [audioUrl])

  useEffect(() => {
    const ws = wavesurferRef.current
    if (!ws || ws.getDuration() <= 0) return
    ws.zoom(pixelsPerSecond)
  }, [pixelsPerSecond])

  // Sync play/pause with transport
  useEffect(() => {
    const ws = wavesurferRef.current
    if (!ws) return

    const handleReady = () => {
      const duration = ws.getDuration()
      if (duration <= 0) return

      // audioOffsetMs is how far into the audio bar 1 occurs
      // so audio time = transport time + audioOffsetMs/1000
      const audioTime = currentTimeSeconds + audioOffsetMs / 1000
      const clampedTime = Math.max(0, Math.min(audioTime, duration))
      ws.setTime(clampedTime)

      if (isPlaying && audioTime >= 0 && audioTime < duration) {
        ws.play()
      }
    }

    // If wavesurfer is already ready (duration > 0), act immediately
    if (ws.getDuration() > 0) {
      const duration = ws.getDuration()
      const audioTime = currentTimeSeconds + audioOffsetMs / 1000
      const clampedTime = Math.max(0, Math.min(audioTime, duration))

      if (isPlaying) {
        // Seek then play
        ws.setTime(clampedTime)
        if (audioTime >= 0 && audioTime < duration) {
          ws.play()
        } else {
          ws.pause()
        }
      } else {
        ws.pause()
        ws.setTime(clampedTime)
      }
    } else {
      // Not ready yet — wait for ready event
      ws.on('ready', handleReady)
      return () => { ws.un('ready', handleReady) }
    }
  }, [isPlaying])

  useEffect(() => {
    const ws = wavesurferRef.current
    if (ws) ws.setVolume(volume)
  }, [volume])

  // Seek when currentTimeSeconds changes while not playing
  // (e.g. clicking the ruler or rewinding)
  useEffect(() => {
    const ws = wavesurferRef.current
    if (!ws || isPlaying) return
    const duration = ws.getDuration()
    if (duration <= 0) return

    const audioTime = currentTimeSeconds + audioOffsetMs / 1000
    const clampedTime = Math.max(0, Math.min(audioTime, duration))
    ws.setTime(clampedTime)
  }, [currentTimeSeconds, audioOffsetMs, isPlaying])

  if (!audioUrl) {
    return (
      <div className="h-16 border-b border-gray-700/50 flex">
        <div className="w-36 shrink-0 flex items-center px-3 border-r border-gray-700 bg-gray-800/50">
          <span className="text-xs text-gray-500">Audio</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-gray-600">
          No audio loaded
        </div>
      </div>
    )
  }

  return (
    <div className="h-[72px] border-b border-gray-700/50 flex">
      {/* Header with offset controls */}
      <div className="w-36 shrink-0 flex flex-col justify-center px-2 gap-0.5 border-r border-gray-700 bg-gray-800/50">
        <span className="text-xs text-gray-400">Audio offset (beats)</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOffsetChange(audioOffsetMs - msPerBeat * 0.5)}
            className="text-[10px] text-gray-500 hover:text-gray-300 px-0.5 leading-none"
            title="Shift left ½ beat"
          >−</button>
          <input
            type="number"
            step="0.5"
            value={(audioOffsetMs / msPerBeat).toFixed(2)}
            onChange={(e) => onOffsetChange(Number(e.target.value) * msPerBeat)}
            className="w-14 bg-gray-900 text-[10px] text-gray-300 text-center rounded px-1 py-0.5
              border border-gray-700 focus:border-blue-500 focus:outline-none"
            title="How many beats into the audio file bar 1 occurs"
          />
          <button
            onClick={() => onOffsetChange(audioOffsetMs + msPerBeat * 0.5)}
            className="text-[10px] text-gray-500 hover:text-gray-300 px-0.5 leading-none"
            title="Shift right ½ beat"
          >+</button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 1)}
            className="text-[10px] text-gray-500 hover:text-gray-300 leading-none shrink-0"
            title={volume > 0 ? 'Mute' : 'Unmute'}
          >{volume > 0 ? '\u{1F50A}' : '\u{1F507}'}</button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full h-1 accent-blue-500 cursor-pointer"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
        </div>
      </div>

      {/* Waveform */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={containerRef}
          className="absolute inset-y-0"
          style={{ transform: `translateX(${-offsetPx - scrollX}px)` }}
        />
      </div>
    </div>
  )
}
