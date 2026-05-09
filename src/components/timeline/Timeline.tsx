import { useCallback, useRef, useState } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { useTransportStore } from '../../stores/transport-store'
import { useUIStore } from '../../stores/ui-store'
import { getProfile } from '../../engine/device-protocol'
import { TimelineRuler, SECTION_COLORS } from './TimelineRuler'
import { TimelineGrid } from './TimelineGrid'
import { Playhead } from './Playhead'
import { EventLane } from './EventLane'
import { WaveformLane } from './WaveformLane'
import { EventEditor } from '../dialogs/EventEditor'
import { ContextMenu } from '../common/ContextMenu'
import type { MusicalPosition } from '../../types/midi'

const BASE_PIXELS_PER_BEAT = 40

interface ContextMenuState {
  x: number
  y: number
  items: Array<{ label: string; onClick: () => void; danger?: boolean }>
}

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null)
  const song = useProjectStore((s) => s.activeSong())
  const addEvent = useProjectStore((s) => s.addEvent)
  const moveEvent = useProjectStore((s) => s.moveEvent)
  const deleteEvent = useProjectStore((s) => s.deleteEvent)
  const setSongProperty = useProjectStore((s) => s.setSongProperty)
  const addSection = useProjectStore((s) => s.addSection)
  const deleteSection = useProjectStore((s) => s.deleteSection)
  const isPlaying = useTransportStore((s) => s.isPlaying)
  const currentTime = useTransportStore((s) => s.currentTimeSeconds)
  const setCurrentTime = useTransportStore((s) => s.setCurrentTime)
  const { zoom, scrollX, scrollY, setScrollX, setZoom, selectedEventIds, snapMode } =
    useUIStore()
  const selectEvent = useUIStore((s) => s.selectEvent)
  const selectAll = useUIStore((s) => s.selectAll)
  const deselectAll = useUIStore((s) => s.deselectAll)
  const copyEvents = useProjectStore((s) => s.copyEvents)
  const pasteEvents = useProjectStore((s) => s.pasteEvents)

  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const pixelsPerBeat = BASE_PIXELS_PER_BEAT * zoom
  const beatsPerBar = song.timeSignature[0]
  const pixelsPerBar = pixelsPerBeat * beatsPerBar
  const totalWidth = song.totalBars * pixelsPerBar
  const laneHeight = 48
  const waveformHeight = 72
  const lanesHeight = Math.max(200, song.devices.length * laneHeight + waveformHeight)

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      if (e.metaKey || e.ctrlKey) {
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setZoom(zoom + delta)
      } else {
        const containerWidth = containerRef.current?.clientWidth ?? 800
        const maxScrollX = Math.max(0, totalWidth + 144 - containerWidth)
        setScrollX(Math.min(scrollX + e.deltaX, maxScrollX))
      }
    },
    [zoom, scrollX, totalWidth, setZoom, setScrollX]
  )

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        deselectAll()
        setContextMenu(null)
      }
    },
    [deselectAll]
  )

  const handleEventDoubleClick = useCallback((id: string) => {
    setEditingEventId(id)
  }, [])

  const handleEventContextMenu = useCallback(
    (id: string, x: number, y: number) => {
      selectEvent(id)
      setContextMenu({
        x,
        y,
        items: [
          { label: 'Edit...', onClick: () => setEditingEventId(id) },
          {
            label: 'Delete',
            danger: true,
            onClick: () => {
              deleteEvent(id)
              deselectAll()
            }
          }
        ]
      })
    },
    [selectEvent, deleteEvent, deselectAll]
  )

  const handleEventDragMove = useCallback(
    (id: string, newPosition: MusicalPosition) => {
      moveEvent(id, newPosition)
    },
    [moveEvent]
  )

  const handleLaneDoubleClick = useCallback(
    (deviceId: string, bar: number) => {
      const device = song.devices.find((d) => d.id === deviceId)
      if (!device) return
      const profile = getProfile(device.profileId)
      if (!profile || profile.commands.length === 0) return

      const defaultCommand = profile.commands[0]
      const params: Record<string, number> = {}
      defaultCommand.parameters?.forEach((p) => {
        params[p.name] = p.defaultValue
      })

      const id = addEvent({
        type: 'device-command',
        deviceId,
        commandId: defaultCommand.id,
        position: { bar, beat: 1, tick: 0 },
        label: defaultCommand.name,
        color: device.color,
        parameters: params
      })
      setEditingEventId(id)
    },
    [song.devices, addEvent]
  )

  const handleLaneContextMenu = useCallback(
    (deviceId: string, bar: number, x: number, y: number) => {
      const device = song.devices.find((d) => d.id === deviceId)
      if (!device) return
      const profile = getProfile(device.profileId)
      if (!profile) return

      setContextMenu({
        x,
        y,
        items: profile.commands.map((cmd) => ({
          label: `Add ${cmd.name}`,
          onClick: () => {
            const params: Record<string, number> = {}
            cmd.parameters?.forEach((p) => {
              params[p.name] = p.defaultValue
            })
            addEvent({
              type: 'device-command',
              deviceId,
              commandId: cmd.id,
              position: { bar, beat: 1, tick: 0 },
              label: cmd.name,
              color: device.color,
              parameters: params
            })
          }
        }))
      })
    },
    [song.devices, addEvent]
  )

  const handleAddSection = useCallback(
    (bar: number) => {
      const name = prompt('Section name:', 'New Section')
      if (!name) return
      const endBar = Math.min(bar + 7, song.totalBars)
      const colorIndex = song.sections.length % SECTION_COLORS.length
      addSection({
        name,
        startBar: bar,
        endBar,
        color: SECTION_COLORS[colorIndex]
      })
    },
    [song.totalBars, song.sections.length, addSection]
  )

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      deleteSection(sectionId)
    },
    [deleteSection]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const mod = e.metaKey || e.ctrlKey

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEventIds.size > 0) {
        e.preventDefault()
        selectedEventIds.forEach((id) => deleteEvent(id))
        deselectAll()
        return
      }

      if (mod && e.key === 'a') {
        e.preventDefault()
        selectAll(song.events.map((ev) => ev.id))
        return
      }

      if (mod && e.key === 'c' && selectedEventIds.size > 0) {
        e.preventDefault()
        copyEvents([...selectedEventIds])
        return
      }

      if (mod && e.key === 'v') {
        e.preventDefault()
        const currentBar = Math.max(1, Math.round(
          (currentTime / (60 / song.bpm)) / beatsPerBar + 1
        ))
        pasteEvents(currentBar)
      }
    },
    [selectedEventIds, deleteEvent, deselectAll, selectAll, copyEvents, pasteEvents,
     song.events, song.bpm, currentTime, beatsPerBar]
  )

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden bg-gray-900 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Ruler with lane-header spacer */}
      <div className="flex">
        <div className="w-36 shrink-0 bg-gray-800 border-b border-r border-gray-700" />
        <div className="flex-1 overflow-hidden">
          <TimelineRuler
            totalBars={song.totalBars}
            beatsPerBar={beatsPerBar}
            pixelsPerBeat={pixelsPerBeat}
            bpm={song.bpm}
            snapMode={snapMode}
            scrollX={scrollX}
            sections={song.sections}
            onSeek={setCurrentTime}
            onAddSection={handleAddSection}
            onDeleteSection={handleDeleteSection}
          />
        </div>
      </div>

      {/* Lanes area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onWheel={handleWheel}
        onClick={handleBackgroundClick}
      >
        {/* Grid clipped to content area (right of lane headers) */}
        <div className="absolute inset-y-0 overflow-hidden pointer-events-none" style={{ left: 144, right: 0 }}>
          <TimelineGrid
            totalBars={song.totalBars}
            beatsPerBar={beatsPerBar}
            pixelsPerBeat={pixelsPerBeat}
            height={lanesHeight}
            scrollX={scrollX}
          />
        </div>

        <div style={{ transform: `translateY(${-scrollY}px)` }}>
          {song.devices.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              No devices configured. Add a device to start placing MIDI events.
            </div>
          ) : (
            song.devices.map((device) => {
              const deviceEvents = song.events.filter(
                (e) => e.deviceId === device.id
              )
              return (
                <EventLane
                  key={device.id}
                  device={device}
                  events={deviceEvents}
                  pixelsPerBeat={pixelsPerBeat}
                  beatsPerBar={beatsPerBar}
                  scrollX={scrollX}
                  totalWidth={totalWidth}
                  selectedEventIds={selectedEventIds}
                  snapMode={snapMode}
                  onEventClick={selectEvent}
                  onEventDoubleClick={handleEventDoubleClick}
                  onEventContextMenu={handleEventContextMenu}
                  onEventDragMove={handleEventDragMove}
                  onLaneDoubleClick={handleLaneDoubleClick}
                  onLaneContextMenu={handleLaneContextMenu}
                />
              )
            })
          )}

          {/* Waveform */}
          <WaveformLane
            audioUrl={song.audioFilePath ?? null}
            pixelsPerBeat={pixelsPerBeat}
            beatsPerBar={beatsPerBar}
            bpm={song.bpm}
            scrollX={scrollX}
            audioOffsetMs={song.audioOffsetMs}
            isPlaying={isPlaying}
            currentTimeSeconds={currentTime}
            onOffsetChange={(ms) => setSongProperty('audioOffsetMs', ms)}
          />
        </div>

        {/* Playhead on top of all lanes including WaveformLane */}
        <div className="absolute inset-y-0 overflow-hidden pointer-events-none z-30" style={{ left: 144, right: 0 }}>
          <Playhead
            positionSeconds={currentTime}
            bpm={song.bpm}
            beatsPerBar={beatsPerBar}
            pixelsPerBeat={pixelsPerBeat}
            scrollX={scrollX}
            height={lanesHeight}
          />
        </div>
      </div>

      {/* Dialogs */}
      {editingEventId && (
        <EventEditor
          eventId={editingEventId}
          onClose={() => setEditingEventId(null)}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
