import { useCallback } from 'react'
import type { Section } from '../../types/project'
import type { SnapMode } from '../../types/timeline'
import { secondsToPosition, positionToSeconds, snapPosition } from '../../engine/clock'

const SECTION_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']

interface TimelineRulerProps {
  totalBars: number
  beatsPerBar: number
  pixelsPerBeat: number
  bpm: number
  snapMode: SnapMode
  scrollX: number
  sections: Section[]
  onSeek?: (seconds: number) => void
  onAddSection?: (bar: number) => void
  onDeleteSection?: (sectionId: string) => void
}

export function TimelineRuler({
  totalBars,
  beatsPerBar,
  pixelsPerBeat,
  bpm,
  snapMode,
  scrollX,
  sections,
  onSeek,
  onAddSection,
  onDeleteSection
}: TimelineRulerProps) {
  const pixelsPerBar = pixelsPerBeat * beatsPerBar
  const totalWidth = totalBars * pixelsPerBar

  const seekFromClientX = useCallback((clientX: number, rect: DOMRect) => {
    if (!onSeek) return
    const x = Math.max(0, clientX - rect.left + scrollX)
    const rawSeconds = (x / pixelsPerBeat) * (60 / bpm)
    const rawPos = secondsToPosition(rawSeconds, bpm, beatsPerBar)
    const snapped = snapPosition(rawPos, snapMode, beatsPerBar)
    onSeek(positionToSeconds(snapped, bpm, beatsPerBar))
  }, [onSeek, scrollX, pixelsPerBeat, bpm, beatsPerBar, snapMode])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    seekFromClientX(e.clientX, rect)

    const onMove = (ev: MouseEvent) => seekFromClientX(ev.clientX, rect)
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [seekFromClientX])

  return (
    <div
      className="relative h-14 bg-gray-800 border-b border-gray-700 overflow-hidden select-none cursor-pointer"
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => {
        e.preventDefault()
        if (!onAddSection) return
        const rect = e.currentTarget.getBoundingClientRect()
        const clickX = e.clientX - rect.left + scrollX
        const bar = Math.floor(clickX / pixelsPerBar) + 1
        onAddSection(bar)
      }}
    >
      {/* Section overlays */}
      <div
        className="absolute top-0 h-6 flex"
        style={{ transform: `translateX(${-scrollX}px)`, width: totalWidth }}
      >
        {sections.map((section) => {
          const x = (section.startBar - 1) * pixelsPerBar
          const width = (section.endBar - section.startBar + 1) * pixelsPerBar
          return (
            <div
              key={section.id}
              className="absolute top-0 h-6 flex items-center px-2 text-xs font-medium rounded-sm group"
              style={{
                left: x,
                width,
                backgroundColor: section.color + '40',
                borderBottom: `2px solid ${section.color}`
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (onDeleteSection) onDeleteSection(section.id)
              }}
            >
              <span className="truncate">{section.name}</span>
            </div>
          )
        })}
      </div>

      {/* Bar numbers */}
      <div
        className="absolute bottom-0 h-8 flex"
        style={{ transform: `translateX(${-scrollX}px)`, width: totalWidth }}
      >
        {Array.from({ length: totalBars }, (_, i) => {
          const bar = i + 1
          const x = i * pixelsPerBar
          return (
            <div
              key={bar}
              className="absolute bottom-0 h-8 flex items-end pb-1"
              style={{ left: x }}
            >
              <span className="text-xs text-gray-400 pl-1">{bar}</span>
              <div className="absolute left-0 bottom-0 h-3 w-px bg-gray-500" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { SECTION_COLORS }
