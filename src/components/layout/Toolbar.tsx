import { useCallback, useEffect, useRef, useState } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { useTransportStore } from '../../stores/transport-store'
import { useUIStore } from '../../stores/ui-store'
import { secondsToPosition, formatPosition, positionToSeconds } from '../../engine/clock'
import { MenuBar } from './MenuBar'
import type { SnapMode } from '../../types/timeline'

export function Toolbar() {
  const song = useProjectStore((s) => s.activeSong())
  const setSongProperty = useProjectStore((s) => s.setSongProperty)
  const { isPlaying, currentTimeSeconds, play, stop, setCurrentTime } =
    useTransportStore()
  const { snapMode, setSnapMode, setSongSettingsOpen } = useUIStore()
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)

  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const startOffsetRef = useRef<number>(0)

  const [bpmDraft, setBpmDraft] = useState(String(song.bpm))
  const bpmFocused = useRef(false)
  useEffect(() => { if (!bpmFocused.current) setBpmDraft(String(song.bpm)) }, [song.bpm])

  const [barsDraft, setBarsDraft] = useState(String(song.totalBars))
  const barsFocused = useRef(false)
  useEffect(() => { if (!barsFocused.current) setBarsDraft(String(song.totalBars)) }, [song.totalBars])

  const commitBpm = useCallback(() => {
    const v = Math.round(Number(bpmDraft))
    const clamped = Math.max(20, Math.min(300, v))
    if (!isNaN(v) && v > 0) setSongProperty('bpm', clamped)
    setBpmDraft(String(clamped))
  }, [bpmDraft, setSongProperty])

  const commitBars = useCallback(() => {
    const v = Math.round(Number(barsDraft))
    const clamped = Math.max(1, Math.min(999, v))
    if (!isNaN(v) && v > 0) setSongProperty('totalBars', clamped)
    setBarsDraft(String(clamped))
  }, [barsDraft, setSongProperty])

  const beatsPerBar = song.timeSignature[0]
  const currentPos = secondsToPosition(currentTimeSeconds, song.bpm, beatsPerBar)
  const totalSeconds = positionToSeconds(
    { bar: song.totalBars + 1, beat: 1, tick: 0 },
    song.bpm,
    beatsPerBar
  )

  const tick = useCallback(
    (timestamp: number) => {
      const elapsed = (timestamp - startTimeRef.current) / 1000
      const newTime = startOffsetRef.current + elapsed
      if (newTime >= totalSeconds) {
        setCurrentTime(0)
        stop()
        return
      }
      setCurrentTime(newTime)
      animationRef.current = requestAnimationFrame(tick)
    },
    [totalSeconds, setCurrentTime, stop]
  )

  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = performance.now()
      startOffsetRef.current = currentTimeSeconds
      animationRef.current = requestAnimationFrame(tick)
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isPlaying, tick])

  const handlePlayStop = useCallback(() => {
    if (isPlaying) stop()
    else play()
  }, [isPlaying, play, stop])

  const handleRewind = useCallback(() => {
    setCurrentTime(0)
    if (isPlaying) {
      startTimeRef.current = performance.now()
      startOffsetRef.current = 0
    }
  }, [setCurrentTime, isPlaying])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        handlePlayStop()
      }
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handlePlayStop, undo, redo])

  return (
    <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4 shrink-0">
      <MenuBar />

      <div className="h-6 w-px bg-gray-700" />

      {/* Transport */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleRewind}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 text-gray-300"
          title="Rewind"
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
            <path d="M1 2h2v12H1V2zm3 6l8 6V2L4 8z" />
          </svg>
        </button>
        <button
          onClick={handlePlayStop}
          className={`w-8 h-8 flex items-center justify-center rounded text-white ${
            isPlaying
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
          title={isPlaying ? 'Stop' : 'Play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
              <rect x="3" y="2" width="4" height="12" />
              <rect x="9" y="2" width="4" height="12" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
              <path d="M3 2l11 6-11 6V2z" />
            </svg>
          )}
        </button>
      </div>

      {/* Position display */}
      <div className="text-sm font-mono text-gray-300 w-20 text-center bg-gray-900 rounded px-2 py-1">
        {formatPosition(currentPos)}
      </div>

      <div className="h-6 w-px bg-gray-700" />

      {/* BPM */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">BPM</label>
        <input
          type="number"
          value={bpmDraft}
          onChange={(e) => setBpmDraft(e.target.value)}
          onFocus={() => { bpmFocused.current = true }}
          onBlur={() => { bpmFocused.current = false; commitBpm() }}
          onKeyDown={(e) => { if (e.key === 'Enter') { commitBpm(); e.currentTarget.blur() } }}
          className="w-16 bg-gray-900 text-sm text-gray-200 rounded px-2 py-1 text-center
            border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Time Signature */}
      <div className="flex items-center gap-1">
        <label className="text-xs text-gray-400">Time</label>
        <select
          value={`${song.timeSignature[0]}/${song.timeSignature[1]}`}
          onChange={(e) => {
            const [n, d] = e.target.value.split('/').map(Number)
            setSongProperty('timeSignature', [n, d] as [number, number])
          }}
          className="bg-gray-900 text-sm text-gray-200 rounded px-2 py-1
            border border-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option>3/4</option>
          <option>4/4</option>
          <option>5/4</option>
          <option>6/8</option>
          <option>7/8</option>
        </select>
      </div>

      {/* Bars */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">Bars</label>
        <input
          type="number"
          value={barsDraft}
          onChange={(e) => setBarsDraft(e.target.value)}
          onFocus={() => { barsFocused.current = true }}
          onBlur={() => { barsFocused.current = false; commitBars() }}
          onKeyDown={(e) => { if (e.key === 'Enter') { commitBars(); e.currentTarget.blur() } }}
          className="w-16 bg-gray-900 text-sm text-gray-200 rounded px-2 py-1 text-center
            border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="h-6 w-px bg-gray-700" />

      {/* Snap */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">Snap</label>
        <select
          value={snapMode}
          onChange={(e) => setSnapMode(e.target.value as SnapMode)}
          className="bg-gray-900 text-sm text-gray-200 rounded px-2 py-1
            border border-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="bar">Bar</option>
          <option value="beat">Beat</option>
          <option value="off">Off</option>
        </select>
      </div>

      <div className="flex-1" />

      {/* Song name + settings */}
      <span className="text-sm text-gray-300 font-medium">{song.name}</span>
      <button
        onClick={() => setSongSettingsOpen(true)}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400"
        title="Song Settings"
      >
        <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
          <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z" />
          <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319z" />
        </svg>
      </button>
    </div>
  )
}
