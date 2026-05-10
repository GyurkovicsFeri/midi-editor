import { useState, useEffect } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { getProfile } from '../../engine/device-protocol'
import type { MidiEvent } from '../../types/midi'
import { isSweepCommand, EASING_LABELS, applyEasing } from '../../engine/sweep'

interface EventEditorProps {
  eventId: string
  onClose: () => void
}

export function EventEditor({ eventId, onClose }: EventEditorProps) {
  const song = useProjectStore((s) => s.activeSong())
  const devices = useProjectStore((s) => s.setlistDevices())
  const updateEvent = useProjectStore((s) => s.updateEvent)
  const deleteEvent = useProjectStore((s) => s.deleteEvent)

  const event = song.events.find((e) => e.id === eventId)
  const device = devices.find((d) => d.id === event?.deviceId)
  const profile = device ? getProfile(device.profileId) : undefined

  const [bar, setBar] = useState(event?.position.bar ?? 1)
  const [beat, setBeat] = useState(event?.position.beat ?? 1)
  const [commandId, setCommandId] = useState(event?.commandId ?? '')
  const [label, setLabel] = useState(event?.label ?? '')
  const [params, setParams] = useState<Record<string, number>>(
    event?.parameters ?? {}
  )

  useEffect(() => {
    if (event) {
      setBar(event.position.bar)
      setBeat(event.position.beat)
      setCommandId(event.commandId ?? '')
      setLabel(event.label)
      setParams(event.parameters ?? {})
    }
  }, [event])

  if (!event || !device || !profile) return null

  const command = profile.commands.find((c) => c.id === commandId)

  const handleSave = () => {
    let finalLabel = label
    if (commandId && isSweepCommand(commandId)) {
      const pedal = commandId === 'qc-exp-pedal-1' ? '1' : '2'
      finalLabel = `Exp ${pedal}: ${params.startValue ?? 0}→${params.endValue ?? 127}`
    }
    updateEvent(eventId, {
      position: { bar, beat, tick: 0 },
      commandId,
      label: finalLabel,
      parameters: params
    })
    onClose()
  }

  const handleDelete = () => {
    deleteEvent(eventId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[420px] max-h-[85vh] flex flex-col border border-gray-700">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-100">Edit Event</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Device info */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: device.color }}
            />
            <span>{device.name}</span>
            <span className="text-gray-600">Ch{device.midiChannel}</span>
          </div>

          {/* Label */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-gray-900 text-sm text-gray-200 rounded px-3 py-1.5
                border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Position */}
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

          {/* Command */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Command</label>
            <select
              value={commandId}
              onChange={(e) => {
                const newId = e.target.value
                setCommandId(newId)
                const newCmd = profile.commands.find((c) => c.id === newId)
                if (newCmd) {
                  const newParams: Record<string, number> = {}
                  newCmd.parameters?.forEach((p) => {
                    newParams[p.name] = p.defaultValue
                  })
                  setParams(newParams)
                  if (isSweepCommand(newId)) {
                    const pedal = newId === 'qc-exp-pedal-1' ? '1' : '2'
                    setLabel(`Exp ${pedal}: ${newParams.startValue ?? 0}→${newParams.endValue ?? 127}`)
                  } else {
                    setLabel(newCmd.name)
                  }
                }
              }}
              className="w-full bg-gray-900 text-sm text-gray-200 rounded px-3 py-1.5
                border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              {profile.commands.map((cmd) => (
                <option key={cmd.id} value={cmd.id}>
                  {cmd.name}
                </option>
              ))}
            </select>
            {command?.description && (
              <p className="text-[10px] text-gray-500 mt-1">{command.description}</p>
            )}
          </div>

          {/* Command parameters */}
          {command?.parameters && command.parameters.length > 0 && (
            <div className="space-y-2">
              {/* QC preset picker: dropdown when presets are configured */}
              {commandId === 'qc-preset' && device.presets.length > 0 ? (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Preset</label>
                  <select
                    value={params['preset'] ?? 0}
                    onChange={(e) => {
                      const preset = device.presets.find(
                        (p) => p.programNumber === Number(e.target.value) &&
                               p.bank === (params['bank'] ?? 0) &&
                               p.setlistIndex === (params['setlist'] ?? 1)
                      ) ?? device.presets.find((p) => p.programNumber === Number(e.target.value))
                      if (preset) {
                        setParams({ preset: preset.programNumber, bank: preset.bank, setlist: preset.setlistIndex })
                        setLabel(preset.name)
                      }
                    }}
                    className="w-full bg-gray-900 text-sm text-gray-200 rounded px-3 py-1.5
                      border border-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    {device.presets.map((p) => (
                      <option key={p.id} value={p.programNumber}>{p.name}</option>
                    ))}
                  </select>
                </div>
              ) : commandId === 'qc-scene' ? (
                /* QC scene picker: A–H dropdown, with optional user-defined names */
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Scene</label>
                  <select
                    value={params['scene'] ?? 1}
                    onChange={(e) => {
                      const sceneNum = Number(e.target.value)
                      setParams((prev) => ({ ...prev, scene: sceneNum }))
                      // If any preset has a named scene, update label
                      const sceneLetters = ['A','B','C','D','E','F','G','H']
                      const letter = sceneLetters[sceneNum - 1] ?? String(sceneNum)
                      const namedScene = device.presets.flatMap((p) => p.scenes)
                        .find((s) => s.sceneNumber === sceneNum)
                      setLabel(namedScene ? `Scene ${letter}: ${namedScene.name}` : `Scene ${letter}`)
                    }}
                    className="w-full bg-gray-900 text-sm text-gray-200 rounded px-3 py-1.5
                      border border-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    {['A','B','C','D','E','F','G','H'].map((letter, i) => {
                      const sceneNum = i + 1
                      const named = device.presets.flatMap((p) => p.scenes)
                        .find((s) => s.sceneNumber === sceneNum)
                      return (
                        <option key={letter} value={sceneNum}>
                          {letter}{named ? ` — ${named.name}` : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
              ) : commandId && isSweepCommand(commandId) ? (
                <div className="space-y-3">
                  {/* Start / End value sliders */}
                  {(['startValue', 'endValue'] as const).map((paramName) => {
                    const label = paramName === 'startValue' ? 'Start (Heel 0 → Toe 127)' : 'End (Heel 0 → Toe 127)'
                    const val = params[paramName] ?? (paramName === 'startValue' ? 0 : 127)
                    return (
                      <div key={paramName}>
                        <label className="block text-xs text-gray-400 mb-1">{label}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={127}
                            value={val}
                            onChange={(e) => setParams((prev) => ({ ...prev, [paramName]: Number(e.target.value) }))}
                            className="flex-1 accent-blue-500"
                          />
                          <input
                            type="number"
                            min={0}
                            max={127}
                            value={val}
                            onChange={(e) => setParams((prev) => ({ ...prev, [paramName]: Math.max(0, Math.min(127, Number(e.target.value))) }))}
                            className="w-14 bg-gray-900 text-sm text-gray-200 rounded px-2 py-1 text-center
                              border border-gray-700 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )
                  })}

                  {/* Quick-set buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setParams((prev) => ({ ...prev, startValue: 0, endValue: 127 }))}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
                    >
                      Heel → Toe
                    </button>
                    <button
                      onClick={() => setParams((prev) => ({ ...prev, startValue: 127, endValue: 0 }))}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
                    >
                      Toe → Heel
                    </button>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Duration (beats)</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setParams((prev) => ({ ...prev, durationBeats: Math.max(1, (prev.durationBeats ?? 4) - 1) }))}
                        className="w-7 h-7 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm"
                      >−</button>
                      <input
                        type="number"
                        min={1}
                        max={64}
                        value={params.durationBeats ?? 4}
                        onChange={(e) => setParams((prev) => ({ ...prev, durationBeats: Math.max(1, Math.min(64, Number(e.target.value))) }))}
                        className="w-16 bg-gray-900 text-sm text-gray-200 rounded px-2 py-1 text-center
                          border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={() => setParams((prev) => ({ ...prev, durationBeats: Math.min(64, (prev.durationBeats ?? 4) + 1) }))}
                        className="w-7 h-7 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm"
                      >+</button>
                    </div>
                  </div>

                  {/* Easing */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Easing</label>
                    <div className="flex items-center gap-3">
                      <select
                        value={params.easingType ?? 0}
                        onChange={(e) => setParams((prev) => ({ ...prev, easingType: Number(e.target.value) }))}
                        className="flex-1 bg-gray-900 text-sm text-gray-200 rounded px-3 py-1.5
                          border border-gray-700 focus:border-blue-500 focus:outline-none"
                      >
                        {EASING_LABELS.map((label, i) => (
                          <option key={i} value={i}>{label}</option>
                        ))}
                      </select>
                      {/* Easing curve preview */}
                      <svg viewBox="0 0 40 20" className="w-20 h-10 flex-shrink-0">
                        <rect x="0" y="0" width="40" height="20" fill="none" stroke="#4b5563" strokeWidth="0.5" rx="2" />
                        <polyline
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="1.5"
                          points={Array.from({ length: 21 }, (_, i) => {
                            const t = i / 20
                            const v = applyEasing(t, params.easingType ?? 0)
                            return `${2 + t * 36},${18 - v * 16}`
                          }).join(' ')}
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                /* Generic numeric parameter inputs */
                command.parameters.map((param) => (
                  <div key={param.name}>
                    <label className="block text-xs text-gray-400 mb-1">
                      {param.label}
                      <span className="text-gray-600 ml-1">({param.min}–{param.max})</span>
                    </label>
                    <input
                      type="number"
                      min={param.min}
                      max={param.max}
                      value={params[param.name] ?? param.defaultValue}
                      onChange={(e) =>
                        setParams((prev) => ({ ...prev, [param.name]: Number(e.target.value) }))
                      }
                      className="w-24 bg-gray-900 text-sm text-gray-200 rounded px-3 py-1.5 text-center
                        border border-gray-700 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-700 flex justify-between">
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded"
          >
            Delete
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
