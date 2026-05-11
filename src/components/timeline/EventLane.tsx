import type { MidiEvent, MusicalPosition } from '../../types/midi'
import type { MidiDevice } from '../../types/device'
import type { SnapMode } from '../../types/timeline'
import { EventBlock } from './EventBlock'

interface EventLaneProps {
  device: MidiDevice
  events: MidiEvent[]
  pixelsPerBeat: number
  beatsPerBar: number
  scrollX: number
  totalWidth: number
  selectedEventIds: Set<string>
  snapMode: SnapMode
  onEventClick: (id: string, multi: boolean) => void
  onEventDoubleClick: (id: string) => void
  onEventContextMenu: (id: string, x: number, y: number) => void
  onEventDragMove: (id: string, newPosition: MusicalPosition) => void
  onEventDragStart?: (id: string) => void
  onEventDragEnd?: (id: string) => void
  onLaneDoubleClick: (deviceId: string, bar: number) => void
  onLaneContextMenu: (deviceId: string, bar: number, x: number, y: number) => void
}

export function EventLane({
  device,
  events,
  pixelsPerBeat,
  beatsPerBar,
  scrollX,
  totalWidth,
  selectedEventIds,
  snapMode,
  onEventClick,
  onEventDoubleClick,
  onEventContextMenu,
  onEventDragMove,
  onEventDragStart,
  onEventDragEnd,
  onLaneDoubleClick,
  onLaneContextMenu
}: EventLaneProps) {
  const pixelsPerBar = pixelsPerBeat * beatsPerBar

  const handleLaneDoubleClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const clickX = e.clientX - rect.left + scrollX
    const bar = Math.floor(clickX / pixelsPerBar) + 1
    onLaneDoubleClick(device.id, bar)
  }

  const handleLaneContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const clickX = e.clientX - rect.left + scrollX
    const bar = Math.floor(clickX / pixelsPerBar) + 1
    onLaneContextMenu(device.id, bar, e.clientX, e.clientY)
  }

  return (
    <div className="relative h-12 border-b border-gray-700/50 flex">
      <div
        className="w-36 shrink-0 flex items-center px-3 border-r border-gray-700 bg-gray-800/50"
        title={`Ch ${device.midiChannel}`}
      >
        <div
          className="w-2.5 h-2.5 rounded-full mr-2 shrink-0"
          style={{ backgroundColor: device.color }}
        />
        <span className="text-xs font-medium truncate">{device.name}</span>
        <span className="text-[10px] text-gray-500 ml-auto">Ch{device.midiChannel}</span>
      </div>
      <div
        className="relative flex-1 overflow-hidden"
        onDoubleClick={handleLaneDoubleClick}
        onContextMenu={handleLaneContextMenu}
      >
        <div
          className="absolute inset-y-0"
          style={{ width: totalWidth, transform: `translateX(${-scrollX}px)` }}
        >
          {events.map((event) => (
            <EventBlock
              key={event.id}
              event={event}
              pixelsPerBeat={pixelsPerBeat}
              beatsPerBar={beatsPerBar}
              isSelected={selectedEventIds.has(event.id)}
              snapMode={snapMode}
              onClick={onEventClick}
              onDoubleClick={onEventDoubleClick}
              onContextMenu={onEventContextMenu}
              onDragMove={onEventDragMove}
              onDragStart={onEventDragStart}
              onDragEnd={onEventDragEnd}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
