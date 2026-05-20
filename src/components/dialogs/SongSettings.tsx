import { useState } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { useUIStore } from '../../stores/ui-store'
import { useMidiOutputStore } from '../../stores/midi-output-store'
import { getBuiltInProfiles } from '../../engine/device-protocol'
import type { Preset, Scene } from '../../types/device'
import { DEFAULT_SCENE_COLORS } from '../../types/device'

const SCENE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

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
  const [expandedPresetIds, setExpandedPresetIds] = useState<Set<string>>(new Set())

  const togglePresetExpanded = (id: string) => {
    setExpandedPresetIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAddPreset = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId)
    if (!device) return
    const preset: Preset = {
      id: crypto.randomUUID(),
      name: 'New Preset',
      programNumber: 0,
      bank: 0,
      setlistIndex: 1,
      scenes: []
    }
    updateDevice(deviceId, { presets: [...device.presets, preset] })
  }

  const handleUpdatePreset = (deviceId: string, presetId: string, changes: Partial<Preset>) => {
    const device = devices.find((d) => d.id === deviceId)
    if (!device) return
    updateDevice(deviceId, {
      presets: device.presets.map((p) => (p.id === presetId ? { ...p, ...changes } : p))
    })
  }

  const handleRemovePreset = (deviceId: string, presetId: string) => {
    const device = devices.find((d) => d.id === deviceId)
    if (!device) return
    updateDevice(deviceId, { presets: device.presets.filter((p) => p.id !== presetId) })
    setExpandedPresetIds((prev) => { const next = new Set(prev); next.delete(presetId); return next })
  }

  const handleUpdateScene = (deviceId: string, presetId: string, sceneNumber: number, changes: { name?: string; color?: string }) => {
    const device = devices.find((d) => d.id === deviceId)
    if (!device) return
    const preset = device.presets.find((p) => p.id === presetId)
    if (!preset) return
    let scenes: Scene[]
    const existing = preset.scenes.find((s) => s.sceneNumber === sceneNumber)
    if (changes.name !== undefined && changes.name.trim() === '' && !changes.color) {
      scenes = preset.scenes.filter((s) => s.sceneNumber !== sceneNumber)
    } else if (existing) {
      const update: Partial<Scene> = {}
      if (changes.name !== undefined) update.name = changes.name.trim()
      if (changes.color !== undefined) update.color = changes.color
      scenes = preset.scenes.map((s) => s.sceneNumber === sceneNumber ? { ...s, ...update } : s)
    } else {
      scenes = [...preset.scenes, {
        id: crypto.randomUUID(),
        name: changes.name?.trim() ?? '',
        sceneNumber,
        color: changes.color ?? DEFAULT_SCENE_COLORS[sceneNumber - 1]
      }]
    }
    handleUpdatePreset(deviceId, presetId, { scenes })
  }

  const availablePorts = useMidiOutputStore((s) => s.availablePorts)
  const devicePortMap = useMidiOutputStore((s) => s.devicePortMap)
  const clockPortIds = useMidiOutputStore((s) => s.clockPortIds)
  const connectionStatus = useMidiOutputStore((s) => s.connectionStatus)
  const errorMessage = useMidiOutputStore((s) => s.errorMessage)
  const setDevicePort = useMidiOutputStore((s) => s.setDevicePort)
  const clearDevicePort = useMidiOutputStore((s) => s.clearDevicePort)
  const refreshPorts = useMidiOutputStore((s) => s.refreshPorts)
  const toggleClockForPort = useMidiOutputStore((s) => s.toggleClockForPort)

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

          {/* Live Export Offset */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Live Export Offset <span className="text-gray-600 font-normal">(adds empty bars before events in exported MIDI)</span></label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  value={song.liveOffset.bars}
                  onChange={(e) => setSongProperty('liveOffset', { ...song.liveOffset, bars: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-16 bg-gray-900 text-sm text-gray-200 rounded px-2 py-1.5
                    border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs text-gray-400">bars</span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={song.timeSignature[0] - 1}
                  value={song.liveOffset.beats}
                  onChange={(e) => setSongProperty('liveOffset', { ...song.liveOffset, beats: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-16 bg-gray-900 text-sm text-gray-200 rounded px-2 py-1.5
                    border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
                <span className="text-xs text-gray-400">beats</span>
              </div>
            </div>
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
                          {/* VE-500 Assigns section */}
                          {device.profileId === 've-500' && (
                            <div className="border-t border-gray-700 pt-2 mt-1">
                              <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                Assign Nicknames <span className="font-normal normal-case text-gray-600">(match CC#1–8 in VE-500 ASSIGN menu)</span>
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                {Array.from({ length: 8 }, (_, i) => {
                                  const assignNames = device.assignNames ?? []
                                  return (
                                    <div key={i} className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-gray-500 w-8 shrink-0 text-right">CC#{i + 1}</span>
                                      <input
                                        type="text"
                                        value={assignNames[i] ?? ''}
                                        onChange={(e) => {
                                          const next = [...(device.assignNames ?? Array(8).fill(''))]
                                          while (next.length < 8) next.push('')
                                          next[i] = e.target.value
                                          updateDevice(device.id, { assignNames: next })
                                        }}
                                        placeholder={`Assign ${i + 1}`}
                                        className="flex-1 bg-gray-900 text-[10px] text-gray-300 rounded px-2 py-1
                                          border border-gray-700 focus:border-blue-500 focus:outline-none min-w-0"
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* QC Presets section */}
                          {device.profileId === 'quad-cortex' && (
                            <div className="border-t border-gray-700 pt-2 mt-1">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                                  Presets
                                </span>
                                <button
                                  onClick={() => handleAddPreset(device.id)}
                                  className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded hover:bg-blue-900/30"
                                >
                                  + Add Preset
                                </button>
                              </div>

                              {device.presets.length === 0 && (
                                <p className="text-[10px] text-gray-600 mb-1">
                                  No presets defined. Add one to use named dropdowns in the event editor.
                                </p>
                              )}

                              <div className="space-y-1.5">
                                {device.presets.map((preset) => {
                                  const isExpanded = expandedPresetIds.has(preset.id)
                                  return (
                                    <div key={preset.id} className="bg-gray-800 rounded border border-gray-700/50">
                                      {/* Preset header row */}
                                      <div className="flex items-center gap-1.5 px-2 py-1.5">
                                        <button
                                          onClick={() => togglePresetExpanded(preset.id)}
                                          className="text-gray-600 hover:text-gray-400 shrink-0"
                                          title={isExpanded ? 'Hide scenes' : 'Show scenes'}
                                        >
                                          <svg viewBox="0 0 16 16" className={`w-3 h-3 fill-current transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                            <path d="M6 3.75a.75.75 0 01.75-.75h3a.75.75 0 010 1.5H7.5v8.25a.75.75 0 01-1.5 0V3.75z" transform="rotate(-90 8 8) translate(-2 0)"/>
                                            <path d="M5.22 8.72a.75.75 0 001.06 1.06l3-3a.75.75 0 000-1.06l-3-3a.75.75 0 00-1.06 1.06L7.94 6.5H2.75a.75.75 0 000 1.5H7.94L5.22 8.72z"/>
                                          </svg>
                                        </button>
                                        {/* Name */}
                                        <input
                                          type="text"
                                          value={preset.name}
                                          onChange={(e) => handleUpdatePreset(device.id, preset.id, { name: e.target.value })}
                                          className="flex-1 bg-gray-900 text-xs text-gray-200 rounded px-2 py-1
                                            border border-gray-700 focus:border-blue-500 focus:outline-none min-w-0"
                                          placeholder="Preset name"
                                        />
                                        {/* Program # */}
                                        <div className="shrink-0">
                                          <input
                                            type="number"
                                            min={0}
                                            max={127}
                                            value={preset.programNumber}
                                            onChange={(e) => handleUpdatePreset(device.id, preset.id, { programNumber: Math.max(0, Math.min(127, Number(e.target.value))) })}
                                            className="w-14 bg-gray-900 text-xs text-gray-200 rounded px-1.5 py-1 text-center
                                              border border-gray-700 focus:border-blue-500 focus:outline-none"
                                            title="Program number (0–127)"
                                          />
                                        </div>
                                        {/* Bank */}
                                        <select
                                          value={preset.bank}
                                          onChange={(e) => handleUpdatePreset(device.id, preset.id, { bank: Number(e.target.value) })}
                                          className="bg-gray-900 text-xs text-gray-200 rounded px-1.5 py-1
                                            border border-gray-700 focus:border-blue-500 focus:outline-none shrink-0"
                                          title="Bank (CC#0)"
                                        >
                                          <option value={0}>Bank 0</option>
                                          <option value={1}>Bank 1</option>
                                        </select>
                                        {/* Setlist */}
                                        <div className="shrink-0">
                                          <input
                                            type="number"
                                            min={0}
                                            max={12}
                                            value={preset.setlistIndex}
                                            onChange={(e) => handleUpdatePreset(device.id, preset.id, { setlistIndex: Math.max(0, Math.min(12, Number(e.target.value))) })}
                                            className="w-14 bg-gray-900 text-xs text-gray-200 rounded px-1.5 py-1 text-center
                                              border border-gray-700 focus:border-blue-500 focus:outline-none"
                                            title="Setlist index (CC#32): 0=Factory, 1=My Presets, 2–12=User"
                                          />
                                        </div>
                                        <button
                                          onClick={() => handleRemovePreset(device.id, preset.id)}
                                          className="text-red-500 hover:text-red-400 shrink-0 px-1"
                                          title="Remove preset"
                                        >
                                          <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current">
                                            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"/>
                                          </svg>
                                        </button>
                                      </div>

                                      {/* Scene names — expandable */}
                                      {isExpanded && (
                                        <div className="px-2 pb-2 border-t border-gray-700 mt-0.5 pt-1.5 grid grid-cols-4 gap-1">
                                          {SCENE_LETTERS.map((letter, i) => {
                                            const sceneNum = i + 1
                                            const scene = preset.scenes.find((s) => s.sceneNumber === sceneNum)
                                            const sceneColor = scene?.color ?? DEFAULT_SCENE_COLORS[i]
                                            return (
                                              <div key={letter} className="flex items-center gap-1">
                                                <span className="text-[10px] text-gray-500 w-4 shrink-0">{letter}</span>
                                                <input
                                                  type="color"
                                                  value={sceneColor}
                                                  onChange={(e) => handleUpdateScene(device.id, preset.id, sceneNum, { color: e.target.value })}
                                                  className="w-4 h-4 bg-transparent border-0 rounded cursor-pointer shrink-0 p-0"
                                                />
                                                <input
                                                  type="text"
                                                  value={scene?.name ?? ''}
                                                  onChange={(e) => handleUpdateScene(device.id, preset.id, sceneNum, { name: e.target.value })}
                                                  placeholder="—"
                                                  className="flex-1 bg-gray-900 text-[10px] text-gray-300 rounded px-1.5 py-0.5
                                                    border border-gray-700 focus:border-blue-500 focus:outline-none min-w-0"
                                                />
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

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

          {/* MIDI Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs text-gray-400">
                MIDI Output
                {connectionStatus === 'connected' && (
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 ml-2 align-middle" title="MIDI connected" />
                )}
                {connectionStatus === 'error' && (
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-2 align-middle" title={errorMessage ?? 'MIDI error'} />
                )}
                {connectionStatus === 'disconnected' && (
                  <span className="inline-block w-2 h-2 rounded-full bg-gray-500 ml-2 align-middle" title="MIDI not initialized" />
                )}
              </label>
              <button
                onClick={refreshPorts}
                className="text-[10px] text-blue-400 hover:text-blue-300 px-1.5 py-0.5 rounded hover:bg-blue-900/30"
              >
                Refresh Ports
              </button>
            </div>

            {connectionStatus === 'error' && (
              <p className="text-[10px] text-red-400 mb-2">{errorMessage}</p>
            )}

            {connectionStatus === 'connected' && devices.length > 0 && (
              <div className="space-y-1.5">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center gap-2 bg-gray-900 rounded px-3 py-2 border border-gray-700/50">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: device.color }}
                    />
                    <span className="text-xs text-gray-300 flex-1 truncate">{device.name}</span>
                    <select
                      value={devicePortMap[device.id] ?? ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          setDevicePort(device.id, e.target.value)
                        } else {
                          clearDevicePort(device.id)
                        }
                      }}
                      className="bg-gray-800 text-xs text-gray-200 rounded px-2 py-1
                        border border-gray-700 focus:border-blue-500 focus:outline-none max-w-[200px]"
                    >
                      <option value="">None</option>
                      {availablePorts.map((port) => (
                        <option key={port.id} value={port.id}>{port.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {connectionStatus === 'connected' && devices.length === 0 && (
              <p className="text-[10px] text-gray-600">Add devices above to map them to MIDI output ports.</p>
            )}

            {connectionStatus === 'connected' && availablePorts.length > 0 && (
              <div className="mt-3 border-t border-gray-700 pt-2">
                <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  MIDI Clock
                </span>
                <div className="space-y-1">
                  {availablePorts.map((port) => (
                    <label key={port.id} className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-900/50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clockPortIds.has(port.id)}
                        onChange={() => toggleClockForPort(port.id)}
                        className="accent-blue-500"
                      />
                      <span className="text-xs text-gray-300">{port.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600 mt-1">
                  Sends 24 PPQ clock + Start/Stop to sync tempo-based effects.
                </p>
              </div>
            )}
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
