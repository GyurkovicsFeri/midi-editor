import { useCallback, useRef } from 'react'
import type { MidiEvent, MusicalPosition } from '../../types/midi'
import { TICKS_PER_BEAT } from '../../types/midi'
import { isSweepCommand, getSweepDurationBeats, applyEasing } from '../../engine/sweep'

interface EventBlockProps {
  event: MidiEvent
  pixelsPerBeat: number
  beatsPerBar: number
  isSelected: boolean
  onClick: (id: string, multi: boolean) => void
  onDoubleClick: (id: string) => void
  onContextMenu: (id: string, x: number, y: number) => void
  onDragMove: (id: string, newPosition: MusicalPosition) => void
  onDragStart?: (id: string) => void
  onDragEnd?: (id: string) => void
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
  onDragStart,
  onDragEnd,
  snapMode
}: EventBlockProps) {
  const x =
    ((event.position.bar - 1) * beatsPerBar + (event.position.beat - 1)) *
      pixelsPerBeat +
    (event.position.tick / TICKS_PER_BEAT) * pixelsPerBeat

  const isSweep = !!(event.commandId && isSweepCommand(event.commandId))
  const sweepDuration = isSweep ? getSweepDurationBeats(event) : 0
  const width = isSweep
    ? Math.max(sweepDuration * pixelsPerBeat, 40)
    : Math.max(pixelsPerBeat * 0.8, 40)
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
        if (!moved) {
          moved = true
          onDragStart?.(event.id)
        }

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
        } else {
          onDragEnd?.(event.id)
        }
        dragStartRef.current = null
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [x, pixelsPerBeat, beatsPerBar, snapMode, event.id, onClick, onDragMove, onDragStart, onDragEnd]
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
      {isSweep && (
        <svg className="absolute inset-0 w-full h-full rounded pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {(() => {
            const startVal = (event.parameters?.startValue ?? 0) / 127
            const endVal = (event.parameters?.endValue ?? 127) / 127
            const easing = event.parameters?.easingType ?? 0
            const steps = 24
            const points = Array.from({ length: steps + 1 }, (_, i) => {
              const t = i / steps
              const eased = applyEasing(t, easing)
              const v = startVal + (endVal - startVal) * eased
              return `${t * 100},${(1 - v) * 100}`
            }).join(' ')
            const fillPoints = `0,100 ${points} 100,100`
            return (
              <>
                <polygon points={fillPoints} fill="white" opacity="0.12" />
                <polyline fill="none" stroke="white" strokeWidth="1.5" opacity="0.5" vectorEffect="non-scaling-stroke" points={points} />
              </>
            )
          })()}
        </svg>
      )}
      <span className="truncate text-white drop-shadow-sm relative z-10">{event.label}</span>
      {isSweep && width > 60 && (
        <span className="absolute right-1.5 text-[10px] text-white/70 drop-shadow-sm z-10">
          {event.parameters?.endValue ?? 127}
        </span>
      )}
    </div>
  )
}
