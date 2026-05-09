import { useState } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { useUIStore } from '../../stores/ui-store'
import { getBuiltInProfiles } from '../../engine/device-protocol'

export function SongSettings() {
  const song = useProjectStore((s) => s.activeSong())
  const devices = useProjectStore((s) => s.setlistDevices())
  const setSongProperty = useProjectStore((s) => s.setSongProperty)
  const addDevice = useProjectStore((s) => s.addDevice)
  const updateDevice = useProjectStore((s) => s.updateDevice)
  const removeDevice = useProjectStore((s) => s.removeDevice)
  const setSongSettingsOpen = useUIStore((s) => s.setSongSettingsOpen)

  const [newDeviceName, setNewDeviceName] = useState('')
  const [newDeviceProfile, setNewDeviceProfile] = useState('quad-cortex')
  const [newDeviceChannel, setNewDeviceChannel] = useState(1)
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null)

  const profiles = getBuiltInProfiles()

  const handleAddDevice = () => {
    if (!newDeviceName.trim()) return
    addDevice(newDeviceProfile, newDeviceName.trim(), newDeviceChannel)
    setNewDeviceName('')
    // Next channel = highest currently in use + 1 (the device we just added counts)
    setNewDeviceChannel((ch) => Math.min(16, ch + 1))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[540px] max-h-[80vh] overflow-y-auto border border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">Song Settings</h2>
          <button
            onClick={() => setSongSettingsOpen(false)}
            className="text-gray-400 hover:text-gray-200"
          >
            <svg viewBox="0 0 16 16" className="w-5 h-5 fill-current">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Song name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Song Name</label>
            <input
              type="text"
              value={song.name}
              onChange={(e) => setSongProperty('name', e.target.value)}
              className="w-full bg-gray-900 text-sm text-gray-200 rounded px-3 py-2
                border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Devices — shared across all songs in the setlist */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Devices <span className="text-gray-600 font-normal">(shared across all songs)</span></label>
            {devices.length > 0 && (
              <div className="space-y-2 mb-3">
                {devices.map((device) => {
                  const isEditing = editingDeviceId === device.id
                  return (
                    <div
                      key={device.id}
                      className="bg-gray-900 rounded border border-gray-700/50"
                    >
                      {isEditing ? (
                        /* ── Editing mode ── */
                        <div className="px-3 py-2.5 space-y-2">
                          <div className="flex items-end gap-2">
                            {/* Color picker */}
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">Color</label>
                              <input
                                type="color"
                                value={device.color}
                                onChange={(e) => updateDevice(device.id, { color: e.target.value })}
                                className="w-8 h-[30px] bg-transparent border border-gray-700 rounded cursor-pointer"
                                title="Device color"
                              />
                            </div>
                            {/* Name */}
                            <div className="flex-1">
                              <label className="block text-[10px] text-gray-500 mb-1">Name</label>
                              <input
                                type="text"
                                value={device.name}
                                onChange={(e) => updateDevice(device.id, { name: e.target.value })}
                                className="w-full bg-gray-800 text-sm text-gray-200 rounded px-2 py-1.5
                                  border border-gray-700 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                            {/* Profile */}
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-1">Profile</label>
                              <select
                                value={device.profileId}
                                onChange={(e) => updateDevice(device.id, { profileId: e.target.value })}
                                className="bg-gray-800 text-sm text-gray-200 rounded px-2 py-1.5
                                  border border-gray-700 focus:border-blue-500 focus:outline-none"
                              >
                                {profiles.map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                            </div>
                            {/* Channel */}
                            <div className="w-16">
                              <label className="block text-[10px] text-gray-500 mb-1">Channel</label>
                              <input
                                type="number"
                                min={1}
                                max={16}
                                value={device.midiChannel}
                                onChange={(e) => updateDevice(device.id, { midiChannel: Math.max(1, Math.min(16, Number(e.target.value))) })}
                                className="w-full bg-gray-800 text-sm text-gray-200 rounded px-2 py-1.5 text-center
                                  border border-gray-700 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => removeDevice(device.id)}
                              className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                            >
                              Remove
                            </button>
                            <button
                              onClick={() => setEditingDeviceId(null)}
                              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Display mode ── */
                        <div
                          className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-800/50 transition-colors rounded"
                          onClick={() => setEditingDeviceId(device.id)}
                          title="Click to edit"
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: device.color }}
                          />
                          <span className="text-sm text-gray-200 flex-1">{device.name}</span>
                          <span className="text-xs text-gray-500">
                            {profiles.find((p) => p.id === device.profileId)?.name ?? device.profileId}
                          </span>
                          <span className="text-xs text-gray-500">Ch{device.midiChannel}</span>
                          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current text-gray-600">
                            <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L3.463 11.098a.25.25 0 00-.064.108l-.563 1.97 1.971-.564a.25.25 0 00.108-.064l8.61-8.61a.25.25 0 000-.353L12.427 2.488z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[10px] text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="e.g. Guitar 1 - Feri"
                  className="w-full bg-gray-900 text-sm text-gray-200 rounded px-2 py-1.5
                    border border-gray-700 focus:border-blue-500 focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDevice()}
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Profile</label>
                <select
                  value={newDeviceProfile}
                  onChange={(e) => setNewDeviceProfile(e.target.value)}
                  className="bg-gray-900 text-sm text-gray-200 rounded px-2 py-1.5
                    border border-gray-700 focus:border-blue-500 focus:outline-none"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-16">
                <label className="block text-[10px] text-gray-500 mb-1">Channel</label>
                <input
                  type="number"
                  min={1}
                  max={16}
                  value={newDeviceChannel}
                  onChange={(e) => setNewDeviceChannel(Number(e.target.value))}
                  className="w-full bg-gray-900 text-sm text-gray-200 rounded px-2 py-1.5 text-center
                    border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleAddDevice}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-sm text-white rounded"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-700 flex justify-end">
          <button
            onClick={() => setSongSettingsOpen(false)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
