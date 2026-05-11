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
import { ContextMenu, type MenuItem } from '../common/ContextMenu'
import type { MusicalPosition } from '../../types/midi'
import { TICKS_PER_BEAT } from '../../types/midi'
import { resolveEventColor } from '../../types/device'

const BASE_PIXELS_PER_BEAT = 40

interface ContextMenuState {
  x: number
  y: number
  items: MenuItem[]
}

export function Timeline() {
  const containerRef = useRef<HTMLDivElement>(null)
  const song = useProjectStore((s) => s.activeSong())
  const devices = useProjectStore((s) => s.setlistDevices())
  const addEvent = useProjectStore((s) => s.addEvent)
  const moveEvent = useProjectStore((s) => s.moveEvent)
  const moveEvents = useProjectStore((s) => s.moveEvents)
  const deleteEvent = useProjectStore((s) => s.deleteEvent)
  const updateEvent = useProjectStore((s) => s.updateEvent)
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
  const dragOriginsRef = useRef<Map<string, MusicalPosition> | null>(null)

  const pixelsPerBeat = BASE_PIXELS_PER_BEAT * zoom
  const beatsPerBar = song.timeSignature[0]
  const pixelsPerBar = pixelsPerBeat * beatsPerBar
  const totalWidth = song.totalBars * pixelsPerBar
  const laneHeight = 48
  const waveformHeight = 72
  const lanesHeight = Math.max(200, devices.length * laneHeight + waveformHeight)

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      if (e.altKey) {
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setZoom(zoom + delta)
      } else {
        const containerWidth = containerRef.current?.clientWidth ?? 800
        const maxScrollX = Math.max(0, totalWidth + 144 - containerWidth)
        const dx = e.deltaX !== 0 ? e.deltaX : e.deltaY
        setScrollX(Math.min(scrollX + dx, maxScrollX))
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
      const event = song.events.find((e) => e.id === id)
      if (!event) return

      const device = devices.find((d) => d.id === event.deviceId)
      const profile = device ? getProfile(device.profileId) : undefined
      const items: MenuItem[] = []

      if (event.commandId === 'qc-scene' && device && profile?.supportsScenes) {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        items.push({
          label: 'Set Scene',
          children: letters.map((letter, i) => {
            const sceneNum = i + 1
            const namedScene = device.presets
              .flatMap((p) => p.scenes)
              .find((s) => s.sceneNumber === sceneNum)
            return {
              label: namedScene ? `${letter} — ${namedScene.name}` : `Scene ${letter}`,
              disabled: event.parameters?.scene === sceneNum,
              onClick: () => {
                updateEvent(id, {
                  parameters: { ...event.parameters, scene: sceneNum },
                  label: namedScene
                    ? `Scene ${letter}: ${namedScene.name}`
                    : `Scene ${letter}`
                })
              }
            }
          })
        })
      }

      if (event.commandId === 'qc-preset' && device && device.presets.length > 0) {
        items.push({
          label: 'Set Preset',
          children: device.presets.map((preset) => ({
            label: preset.name,
            disabled:
              event.parameters?.preset === preset.programNumber &&
              event.parameters?.bank === preset.bank &&
              event.parameters?.setlist === preset.setlistIndex,
            onClick: () => {
              updateEvent(id, {
                parameters: {
                  preset: preset.programNumber,
                  bank: preset.bank,
                  setlist: preset.setlistIndex
                },
                label: preset.name
              })
            }
          }))
        })
      }

      if (items.length > 0) {
        items.push({ label: '', divider: true })
      }

      items.push({ label: 'Edit...', onClick: () => setEditingEventId(id) })
      items.push({
        label: 'Delete',
        danger: true,
        onClick: () => {
          deleteEvent(id)
          deselectAll()
        }
      })

      setContextMenu({ x, y, items })
    },
    [selectEvent, deleteEvent, deselectAll, updateEvent, song.events, devices]
  )

  const handleEventDragStart = useCallback(
    (draggedId: string) => {
      if (!selectedEventIds.has(draggedId) || selectedEventIds.size <= 1) {
        dragOriginsRef.current = null
        return
      }
      const origins = new Map<string, MusicalPosition>()
      for (const id of selectedEventIds) {
        const ev = song.events.find((e) => e.id === id)
        if (ev) origins.set(id, { ...ev.position })
      }
      dragOriginsRef.current = origins
    },
    [selectedEventIds, song.events]
  )

  const handleEventDragMove = useCallback(
    (draggedId: string, newPosition: MusicalPosition) => {
      const origins = dragOriginsRef.current
      if (!origins || !origins.has(draggedId)) {
        moveEvent(draggedId, newPosition)
        return
      }

      const toTicks = (p: MusicalPosition) =>
        (p.bar - 1) * beatsPerBar * TICKS_PER_BEAT +
        (p.beat - 1) * TICKS_PER_BEAT +
        p.tick

      const deltaTicks = toTicks(newPosition) - toTicks(origins.get(draggedId)!)

      let minOrigTicks = Infinity
      for (const [, origPos] of origins) {
        minOrigTicks = Math.min(minOrigTicks, toTicks(origPos))
      }
      const clampedDelta = Math.max(-minOrigTicks, deltaTicks)

      const ticksPerBar = beatsPerBar * TICKS_PER_BEAT
      const moves: Array<{ eventId: string; newPosition: MusicalPosition }> = []

      for (const [id, origPos] of origins) {
        const newTicks = toTicks(origPos) + clampedDelta
        const bar = Math.floor(newTicks / ticksPerBar) + 1
        const remaining = newTicks % ticksPerBar
        const beat = Math.floor(remaining / TICKS_PER_BEAT) + 1
        const tick = remaining % TICKS_PER_BEAT
        moves.push({ eventId: id, newPosition: { bar, beat, tick } })
      }

      moveEvents(moves)
    },
    [moveEvent, moveEvents, beatsPerBar]
  )

  const handleEventDragEnd = useCallback(() => {
    dragOriginsRef.current = null
  }, [])

  const handleLaneDoubleClick = useCallback(
    (deviceId: string, bar: number) => {
      const device = devices.find((d) => d.id === deviceId)
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
        color: resolveEventColor(defaultCommand.id, device, params.scene),
        parameters: params
      })
      setEditingEventId(id)
    },
    [devices, addEvent]
  )

  const handleLaneContextMenu = useCallback(
    (deviceId: string, bar: number, x: number, y: number) => {
      const device = devices.find((d) => d.id === deviceId)
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
              color: resolveEventColor(cmd.id, device, params.scene),
              parameters: params
            })
          }
        }))
      })
    },
    [devices, addEvent]
  )

  const handleLaneDrop = useCallback(
    (
      deviceId: string,
      bar: number,
      data: { commandId: string; label: string; color: string }
    ) => {
      const device = devices.find((d) => d.id === deviceId)
      if (!device) return
      const profile = getProfile(device.profileId)
      const command = profile?.commands.find((c) => c.id === data.commandId)
      const params: Record<string, number> = {}
      command?.parameters?.forEach((p) => {
        params[p.name] = p.defaultValue
      })

      const clampedBar = Math.min(bar, song.totalBars)
      const id = addEvent({
        type: 'device-command',
        deviceId,
        commandId: data.commandId,
        position: { bar: clampedBar, beat: 1, tick: 0 },
        label: data.label,
        color: data.color,
        parameters: params
      })
      if (command?.parameters && command.parameters.length > 0) {
        setEditingEventId(id)
      }
    },
    [devices, addEvent, song.totalBars]
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
          {devices.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              No devices configured. Add a device to start placing MIDI events.
            </div>
          ) : (
            devices.map((device) => {
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
                  onEventDragStart={handleEventDragStart}
                  onEventDragEnd={handleEventDragEnd}
                  onLaneDoubleClick={handleLaneDoubleClick}
                  onLaneContextMenu={handleLaneContextMenu}
                  onLaneDrop={handleLaneDrop}
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
