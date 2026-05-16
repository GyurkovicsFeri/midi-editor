import { useRef, useEffect, useState, useCallback } from 'react'
import WaveSurfer from 'wavesurfer.js'
import type { AudioTrack } from '../../types/project'

interface WaveformLaneProps {
  tracks: AudioTrack[]
  pixelsPerBeat: number
  beatsPerBar: number
  bpm: number
  scrollX: number
  isPlaying: boolean
  currentTimeSeconds: number
  onTrackOffsetChange: (trackId: string, ms: number) => void
  onTrackVolumeChange: (trackId: string, volume: number) => void
  onTrackMuteToggle: (trackId: string) => void
  onTrackRemove: (trackId: string) => void
  onTrackEmbeddedToggle: (trackId: string) => void
  onAddTrack: () => void
}

export function WaveformLane({
  tracks,
  pixelsPerBeat,
  beatsPerBar,
  bpm,
  scrollX,
  isPlaying,
  currentTimeSeconds,
  onTrackOffsetChange,
  onTrackVolumeChange,
  onTrackMuteToggle,
  onTrackRemove,
  onTrackEmbeddedToggle,
  onAddTrack
}: WaveformLaneProps) {
  if (tracks.length === 0) {
    return (
      <div className="h-10 border-b border-gray-700/50 flex">
        <div className="w-36 shrink-0 flex items-center px-3 border-r border-gray-700 bg-gray-800/50">
          <span className="text-xs text-gray-500">Audio</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={onAddTrack}
            className="text-xs text-gray-500 hover:text-gray-300"
          >+ Add audio track</button>
        </div>
      </div>
    )
  }

  return (
    <div className="border-b border-gray-700/50">
      {tracks.map((track) => (
        <WaveformTrack
          key={track.id}
          track={track}
          pixelsPerBeat={pixelsPerBeat}
          bpm={bpm}
          scrollX={scrollX}
          isPlaying={isPlaying}
          currentTimeSeconds={currentTimeSeconds}
          onOffsetChange={(ms) => onTrackOffsetChange(track.id, ms)}
          onVolumeChange={(v) => onTrackVolumeChange(track.id, v)}
          onMuteToggle={() => onTrackMuteToggle(track.id)}
          onRemove={() => onTrackRemove(track.id)}
          onEmbeddedToggle={() => onTrackEmbeddedToggle(track.id)}
        />
      ))}
      <div className="h-6 flex">
        <div className="w-36 shrink-0 border-r border-gray-700 bg-gray-800/50" />
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={onAddTrack}
            className="text-xs text-gray-500 hover:text-gray-300"
          >+ Add audio track</button>
        </div>
      </div>
    </div>
  )
}

interface WaveformTrackProps {
  track: AudioTrack
  pixelsPerBeat: number
  bpm: number
  scrollX: number
  isPlaying: boolean
  currentTimeSeconds: number
  onOffsetChange: (ms: number) => void
  onVolumeChange: (volume: number) => void
  onMuteToggle: () => void
  onRemove: () => void
  onEmbeddedToggle: () => void
}

function WaveformTrack({
  track,
  pixelsPerBeat,
  bpm,
  scrollX,
  isPlaying,
  currentTimeSeconds,
  onOffsetChange,
  onVolumeChange,
  onMuteToggle,
  onRemove,
  onEmbeddedToggle
}: WaveformTrackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)

  const secondsPerBeat = 60 / bpm
  const msPerBeat = secondsPerBeat * 1000

  const [offsetDraft, setOffsetDraft] = useState((track.offsetMs / msPerBeat).toFixed(2))
  const offsetFocused = useRef(false)
  useEffect(() => {
    if (!offsetFocused.current) setOffsetDraft((track.offsetMs / msPerBeat).toFixed(2))
  }, [track.offsetMs, msPerBeat])

  const commitOffset = useCallback(() => {
    offsetFocused.current = false
    const val = parseFloat(offsetDraft)
    if (!isNaN(val)) onOffsetChange(val * msPerBeat)
    else setOffsetDraft((track.offsetMs / msPerBeat).toFixed(2))
  }, [offsetDraft, msPerBeat, onOffsetChange, track.offsetMs])
  const pixelsPerSecond = pixelsPerBeat / secondsPerBeat
  const offsetPx = (track.offsetMs / 1000) * pixelsPerSecond

  useEffect(() => {
    if (!containerRef.current || !track.filePath) return

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: track.color + '99',
      progressColor: track.color,
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

    ws.load(track.filePath).catch((err) => {
      if (err?.name !== 'AbortError') throw err
    })
    wavesurferRef.current = ws

    return () => {
      ws.destroy()
      wavesurferRef.current = null
    }
  }, [track.filePath])

  useEffect(() => {
    const ws = wavesurferRef.current
    if (!ws || ws.getDuration() <= 0) return
    ws.zoom(pixelsPerSecond)
  }, [pixelsPerSecond])

  useEffect(() => {
    const ws = wavesurferRef.current
    if (!ws) return

    const handleReady = () => {
      const duration = ws.getDuration()
      if (duration <= 0) return
      const audioTime = currentTimeSeconds + track.offsetMs / 1000
      const clampedTime = Math.max(0, Math.min(audioTime, duration))
      ws.setTime(clampedTime)
      if (isPlaying && !track.muted && audioTime >= 0 && audioTime < duration) {
        ws.play()
      }
    }

    if (ws.getDuration() > 0) {
      const duration = ws.getDuration()
      const audioTime = currentTimeSeconds + track.offsetMs / 1000
      const clampedTime = Math.max(0, Math.min(audioTime, duration))

      if (isPlaying) {
        ws.setTime(clampedTime)
        if (!track.muted && audioTime >= 0 && audioTime < duration) {
          ws.play()
        } else {
          ws.pause()
        }
      } else {
        ws.pause()
        ws.setTime(clampedTime)
      }
    } else {
      ws.on('ready', handleReady)
      return () => { ws.un('ready', handleReady) }
    }
  }, [isPlaying, track.muted])

  useEffect(() => {
    const ws = wavesurferRef.current
    if (ws) ws.setVolume(track.muted ? 0 : track.volume)
  }, [track.volume, track.muted])

  useEffect(() => {
    const ws = wavesurferRef.current
    if (!ws || isPlaying) return
    const duration = ws.getDuration()
    if (duration <= 0) return
    const audioTime = currentTimeSeconds + track.offsetMs / 1000
    const clampedTime = Math.max(0, Math.min(audioTime, duration))
    ws.setTime(clampedTime)
  }, [currentTimeSeconds, track.offsetMs, isPlaying])

  return (
    <div className="h-[72px] border-b border-gray-700/30 flex">
      <div className="w-36 shrink-0 flex flex-col justify-center px-2 gap-0.5 border-r border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: track.color }} />
          <span className="text-[10px] text-gray-300 truncate flex-1" title={track.name}>{track.name}</span>
          <button
            onClick={onEmbeddedToggle}
            className={`text-[10px] px-0.5 leading-none ${track.embedded ? 'text-blue-400' : 'text-gray-600'}`}
            title={track.embedded ? 'Saved in project (click to unlink)' : 'Not saved in project (click to embed)'}
          >{track.embedded ? '💾' : '🔗'}</button>
          <button
            onClick={onRemove}
            className="text-[10px] text-gray-600 hover:text-red-400 leading-none"
            title="Remove track"
          >×</button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onOffsetChange(track.offsetMs - msPerBeat * 0.5)}
            className="text-[10px] text-gray-500 hover:text-gray-300 px-0.5 leading-none"
            title="Shift left ½ beat"
          >−</button>
          <input
            type="number"
            step="0.5"
            value={offsetDraft}
            onFocus={() => { offsetFocused.current = true }}
            onChange={(e) => setOffsetDraft(e.target.value)}
            onBlur={commitOffset}
            onKeyDown={(e) => { if (e.key === 'Enter') commitOffset() }}
            className="w-14 bg-gray-900 text-[10px] text-gray-300 text-center rounded px-1 py-0.5
              border border-gray-700 focus:border-blue-500 focus:outline-none"
            title="Offset in beats"
          />
          <button
            onClick={() => onOffsetChange(track.offsetMs + msPerBeat * 0.5)}
            className="text-[10px] text-gray-500 hover:text-gray-300 px-0.5 leading-none"
            title="Shift right ½ beat"
          >+</button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMuteToggle}
            className="text-[10px] text-gray-500 hover:text-gray-300 leading-none shrink-0"
            title={track.muted ? 'Unmute' : 'Mute'}
          >{track.muted ? '🔇' : '🔊'}</button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={track.volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-full h-1 accent-blue-500 cursor-pointer"
            title={`Volume: ${Math.round(track.volume * 100)}%`}
          />
        </div>
      </div>

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
