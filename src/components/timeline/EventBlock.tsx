import { useCallback, useRef } from 'react'
import type { MidiEvent, MusicalPosition } from '../../types/midi'
import { TICKS_PER_BEAT } from '../../types/midi'

interface EventBlockProps {
  event: MidiEvent
  pixelsPerBeat: number
  beatsPerBar: number
  isSelected: boolean
  onClick: (id: string, multi: boolean) => void
  onDoubleClick: (id: string) => void
  onContextMenu: (id: string, x: number, y: number) => void
  onDragMove: (id: string, newPosition: MusicalPosition) => void
  snapMode: 'bar' | 'beat' | 'off'
}

export function EventBlock({
  event,
  pixelsPerBeat,
  beatsPerBar,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragMove,
  snapMode
}: EventBlockProps) {
  const x =
    ((event.position.bar - 1) * beatsPerBar + (event.position.beat - 1)) *
      pixelsPerBeat +
    (event.position.tick / TICKS_PER_BEAT) * pixelsPerBeat

  const width = Math.max(pixelsPerBeat * 0.8, 40)
  const dragStartRef = useRef<{ startX: number; origX: number } | null>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      e.stopPropagation()
      const startX = e.clientX
      const origX = x

      dragStartRef.current = { startX, origX }
      let moved = false

      const handleMouseMove = (me: MouseEvent) => {
        const dx = me.clientX - startX
        if (Math.abs(dx) < 3 && !moved) return
        moved = true

        const newX = origX + dx
        const totalBeats = newX / pixelsPerBeat
        const totalTicks = Math.round(totalBeats * TICKS_PER_BEAT)

        let snappedTicks: number
        if (snapMode === 'bar') {
          const ticksPerBar = beatsPerBar * TICKS_PER_BEAT
          snappedTicks = Math.round(totalTicks / ticksPerBar) * ticksPerBar
        } else if (snapMode === 'beat') {
          snappedTicks = Math.round(totalTicks / TICKS_PER_BEAT) * TICKS_PER_BEAT
        } else {
          snappedTicks = totalTicks
        }

        snappedTicks = Math.max(0, snappedTicks)
        const ticksPerBar = beatsPerBar * TICKS_PER_BEAT
        const bar = Math.floor(snappedTicks / ticksPerBar) + 1
        const remaining = snappedTicks % ticksPerBar
        const beat = Math.floor(remaining / TICKS_PER_BEAT) + 1
        const tick = remaining % TICKS_PER_BEAT

        onDragMove(event.id, { bar, beat, tick })
      }

      const handleMouseUp = (me: MouseEvent) => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        if (!moved) {
          onClick(event.id, me.shiftKey || me.metaKey)
        }
        dragStartRef.current = null
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [x, pixelsPerBeat, beatsPerBar, snapMode, event.id, onClick, onDragMove]
  )

  return (
    <div
      className={`absolute top-1 bottom-1 rounded cursor-grab active:cursor-grabbing
        flex items-center px-1.5 text-xs font-medium transition-shadow
        ${isSelected ? 'ring-2 ring-white shadow-lg' : 'hover:brightness-110'}`}
      style={{
        left: x,
        width,
        backgroundColor: event.color ?? '#3b82f6'
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDoubleClick(event.id)
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu(event.id, e.clientX, e.clientY)
      }}
      title={`${event.label} — Bar ${event.position.bar}, Beat ${event.position.beat}`}
    >
      <span className="truncate text-white drop-shadow-sm">{event.label}</span>
    </div>
  )
}
