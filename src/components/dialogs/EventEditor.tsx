import { useState } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { getProfile } from '../../engine/device-protocol'
import { resolveEventColor } from '../../types/device'
import { isSweepCommand } from '../../engine/sweep'
import { EventCommandFields, type EventRowDraft } from './EventCommandFields'

interface EventEditorProps {
  eventId: string
  onClose: () => void
}

/**
 * Edits every event that shares the anchor event's device + exact position (bar/beat/tick),
 * since overlapping events render stacked on the timeline and are otherwise indistinguishable.
 */
export function EventEditor({ eventId, onClose }: EventEditorProps) {
  const song = useProjectStore((s) => s.activeSong())
  const devices = useProjectStore((s) => s.setlistDevices())
  const addEvent = useProjectStore((s) => s.addEvent)
  const updateEvent = useProjectStore((s) => s.updateEvent)
  const deleteEvent = useProjectStore((s) => s.deleteEvent)
  const deleteEvents = useProjectStore((s) => s.deleteEvents)
  const moveEvents = useProjectStore((s) => s.moveEvents)

  // Captured once at mount so deleting the specific row that opened this dialog
  // (it becomes just another row once siblings exist) doesn't yank the anchor
  // out from under the still-open group editor.
  const [anchor] = useState(() => {
    const e = song.events.find((ev) => ev.id === eventId)
    return e ? { deviceId: e.deviceId, position: { ...e.position } } : null
  })
  const device = devices.find((d) => d.id === anchor?.deviceId)
  const profile = device ? getProfile(device.profileId) : undefined

  const [bar, setBar] = useState(() => anchor?.position.bar ?? 1)
  const [beat, setBeat] = useState(() => anchor?.position.beat ?? 1)
  const [rows, setRows] = useState<EventRowDraft[]>(() => {
    if (!anchor || !device) return []
    return song.events
      .filter(
        (e) =>
          e.deviceId === anchor.deviceId &&
          e.position.bar === anchor.position.bar &&
          e.position.beat === anchor.position.beat &&
          e.position.tick === anchor.position.tick
      )
      .map((e) => ({
        id: e.id,
        commandId: e.commandId ?? '',
        label: e.label,
        color: resolveEventColor(e.commandId ?? '', device, e.parameters?.scene),
        params: e.parameters ?? {}
      }))
  })

  if (!anchor || !device || !profile || rows.length === 0) return null

  const updateRow = (id: string, patch: Partial<EventRowDraft>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const handleAddCommand = () => {
    if (profile.commands.length === 0) return
    const defaultCommand = profile.commands[0]
    const params: Record<string, number> = {}
    defaultCommand.parameters?.forEach((p) => {
      params[p.name] = p.defaultValue
    })
    const color = resolveEventColor(defaultCommand.id, device, params.scene)
    const newId = addEvent({
      type: 'device-command',
      deviceId: device.id,
      commandId: defaultCommand.id,
      position: { ...anchor.position },
      label: defaultCommand.name,
      color,
      parameters: params
    })
    setRows((prev) => [...prev, { id: newId, commandId: defaultCommand.id, label: defaultCommand.name, color, params }])
  }

  const handleDeleteRow = (id: string) => {
    deleteEvent(id)
    const next = rows.filter((r) => r.id !== id)
    setRows(next)
    if (next.length === 0) onClose()
  }

  const handleDeleteAll = () => {
    deleteEvents(rows.map((r) => r.id))
    onClose()
  }

  const handleSave = () => {
    const positionChanged = bar !== anchor.position.bar || beat !== anchor.position.beat
    if (positionChanged) {
      moveEvents(
        rows.map((r) => ({ eventId: r.id, newPosition: { bar, beat, tick: anchor.position.tick } }))
      )
    }
    rows.forEach((row) => {
      let finalLabel = row.label
      if (row.commandId && isSweepCommand(row.commandId)) {
        const pedal = row.commandId === 'qc-exp-pedal-1' ? '1' : '2'
        finalLabel = `Exp ${pedal}: ${row.params.startValue ?? 0}→${row.params.endValue ?? 127}`
      }
      updateEvent(row.id, {
        commandId: row.commandId,
        label: finalLabel,
        color: row.color,
        parameters: row.params
      })
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[420px] max-h-[85vh] flex flex-col border border-gray-700">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-100">Edit Event{rows.length > 1 ? 's' : ''}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Device info */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: device.color }} />
            <span>{device.name}</span>
            <span className="text-gray-600">Ch{device.midiChannel}</span>
            {rows.length > 1 && (
              <span className="ml-auto text-[10px] text-gray-500">{rows.length} commands here</span>
            )}
          </div>

          {/* Shared position */}
          <div className="flex gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Bar</label>
              <input
                type="number"
                min={1}
                max={song.totalBars}
                value={bar}
                onChange={(e) => setBar(Math.max(1, Number(e.target.value)))}
                className="w-20 bg-gray-900 text-sm text-gray-200 rounded px-3 py-1.5 text-center
                  border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Beat</label>
              <input
                type="number"
                min={1}
                max={song.timeSignature[0]}
                value={beat}
                onChange={(e) => setBeat(Math.max(1, Number(e.target.value)))}
                className="w-20 bg-gray-900 text-sm text-gray-200 rounded px-3 py-1.5 text-center
                  border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* One card per command sharing this position */}
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div
                key={row.id}
                className={rows.length > 1 ? 'rounded border border-gray-700 bg-gray-900/40 p-3 space-y-3' : 'space-y-4'}
              >
                {rows.length > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide">Command {i + 1}</span>
                    <button
                      onClick={() => handleDeleteRow(row.id)}
                      className="text-red-500 hover:text-red-400 shrink-0 px-1"
                      title="Remove this command"
                    >
                      <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current">
                        <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                      </svg>
                    </button>
                  </div>
                )}
                <EventCommandFields
                  device={device}
                  profile={profile}
                  song={song}
                  row={row}
                  onChange={(patch) => updateRow(row.id, patch)}
                />
              </div>
            ))}
          </div>

          {/* Add another command at this position */}
          <button
            onClick={handleAddCommand}
            className="w-full text-center px-3 py-1.5 text-xs text-gray-400
              hover:text-gray-200 hover:bg-gray-700 rounded border border-dashed border-gray-700"
          >
            + Add command at this position
          </button>
        </div>

        <div className="px-5 py-3 border-t border-gray-700 flex justify-between">
          <button
            onClick={handleDeleteAll}
            className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded"
          >
            {rows.length > 1 ? 'Delete All' : 'Delete'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-sm text-white rounded"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
