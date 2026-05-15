import { useState } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { getProfile } from '../../engine/device-protocol'
import { EventEditor } from '../dialogs/EventEditor'
import type { MidiEvent } from '../../types/midi'

type SortKey = 'position' | 'device' | 'label'
type SortDir = 'asc' | 'desc'

function positionKey(e: MidiEvent) {
  return e.position.bar * 10000 + e.position.beat * 100 + e.position.tick
}

function paramSummary(event: MidiEvent, commandId: string | undefined, deviceId: string): string {
  const p = event.parameters
  if (!p || Object.keys(p).length === 0) return ''
  if (commandId === 'qc-preset' || commandId === 'helix-lt-preset') {
    return `Bank ${p['bank'] ?? 0} / List ${p['setlist'] ?? 0} / PC ${p['preset'] ?? 0}`
  }
  if (commandId === 'qc-scene' || commandId === 'helix-lt-snapshot') {
    const letters = ['A','B','C','D','E','F','G','H']
    return `Scene ${letters[(p['scene'] as number) - 1] ?? p['scene']}`
  }
  return Object.entries(p).map(([k, v]) => `${k}=${v}`).join(' ')
}

export function EventListView() {
  const song = useProjectStore((s) => s.activeSong())
  const devices = useProjectStore((s) => s.setlistDevices())
  const deleteEvent = useProjectStore((s) => s.deleteEvent)

  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('position')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filterDeviceId, setFilterDeviceId] = useState<string>('all')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...song.events]
    .filter((e) => filterDeviceId === 'all' || e.deviceId === filterDeviceId)
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'position') cmp = positionKey(a) - positionKey(b)
      else if (sortKey === 'device') cmp = (a.deviceId ?? '').localeCompare(b.deviceId ?? '')
      else if (sortKey === 'label') cmp = (a.label ?? '').localeCompare(b.label ?? '')
      return sortDir === 'asc' ? cmp : -cmp
    })

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current inline ml-1">
        <path d={sortDir === 'asc'
          ? 'M8 3.5L12 9H4L8 3.5z'
          : 'M8 12.5L4 7h8L8 12.5z'} />
      </svg>
    ) : null

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
      {/* Toolbar row */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-700 bg-gray-800 shrink-0">
        <span className="text-xs text-gray-400">
          {sorted.length} event{sorted.length !== 1 ? 's' : ''}
          {filterDeviceId !== 'all' && ` (filtered)`}
        </span>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500">Device:</label>
          <select
            value={filterDeviceId}
            onChange={(e) => setFilterDeviceId(e.target.value)}
            className="bg-gray-900 text-xs text-gray-200 rounded px-2 py-1
              border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All devices</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
            {song.events.length === 0
              ? 'No events yet. Add events from the timeline view.'
              : 'No events match the current filter.'}
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-800 z-10">
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th
                  className="px-4 py-2 cursor-pointer hover:text-gray-200 select-none w-24"
                  onClick={() => handleSort('position')}
                >
                  Position <SortIcon col="position" />
                </th>
                <th
                  className="px-4 py-2 cursor-pointer hover:text-gray-200 select-none w-40"
                  onClick={() => handleSort('device')}
                >
                  Device <SortIcon col="device" />
                </th>
                <th
                  className="px-4 py-2 cursor-pointer hover:text-gray-200 select-none"
                  onClick={() => handleSort('label')}
                >
                  Label <SortIcon col="label" />
                </th>
                <th className="px-4 py-2 text-gray-400 font-normal">Command</th>
                <th className="px-4 py-2 text-gray-400 font-normal">Parameters</th>
                <th className="px-4 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((event, i) => {
                const device = devices.find((d) => d.id === event.deviceId)
                const profile = device ? getProfile(device.profileId) : undefined
                const command = profile?.commands.find((c) => c.id === event.commandId)

                return (
                  <tr
                    key={event.id}
                    className={`border-b border-gray-700/50 hover:bg-gray-800/60 transition-colors
                      ${i % 2 === 0 ? '' : 'bg-gray-800/20'}`}
                  >
                    {/* Position */}
                    <td className="px-4 py-2 font-mono text-gray-300 whitespace-nowrap">
                      {event.position.bar}.{event.position.beat}
                    </td>

                    {/* Device */}
                    <td className="px-4 py-2">
                      {device ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: device.color }}
                          />
                          <span className="text-gray-300 truncate">{device.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-600 italic">Unknown</span>
                      )}
                    </td>

                    {/* Label */}
                    <td className="px-4 py-2 text-gray-200 max-w-[160px] truncate" title={event.label}>
                      {event.label || <span className="text-gray-600 italic">—</span>}
                    </td>

                    {/* Command */}
                    <td className="px-4 py-2 text-gray-400">
                      {command?.name ?? event.commandId ?? '—'}
                    </td>

                    {/* Parameters */}
                    <td className="px-4 py-2 text-gray-500 max-w-[200px] truncate font-mono"
                        title={paramSummary(event, event.commandId, event.deviceId ?? '')}>
                      {paramSummary(event, event.commandId, event.deviceId ?? '') || '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setEditingEventId(event.id)}
                          className="text-gray-500 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
                            <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L3.463 11.098a.25.25 0 00-.064.108l-.563 1.97 1.971-.564a.25.25 0 00.108-.064l8.61-8.61a.25.25 0 000-.353L12.427 2.488z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
                            <path d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19a1.75 1.75 0 001.741-1.575l.66-6.6a.75.75 0 00-1.492-.15l-.66 6.6a.25.25 0 01-.249.225H5.405a.25.25 0 01-.249-.225l-.66-6.6z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {editingEventId && (
        <EventEditor
          eventId={editingEventId}
          onClose={() => setEditingEventId(null)}
        />
      )}
    </div>
  )
}
