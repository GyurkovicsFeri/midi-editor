import { useState, useEffect } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { getProfile } from '../../engine/device-protocol'
import type { MidiEvent } from '../../types/midi'
import { resolveEventColor } from '../../types/device'
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
  const [eventColor, setEventColor] = useState(
    device ? resolveEventColor(event?.commandId ?? '', device, event?.parameters?.scene) : (event?.color ?? '#3b82f6')
  )
  const [params, setParams] = useState<Record<string, number>>(
    event?.parameters ?? {}
  )

  useEffect(() => {
    if (event && device) {
      setBar(event.position.bar)
      setBeat(event.position.beat)
      setCommandId(event.commandId ?? '')
      setLabel(event.label)
      setEventColor(resolveEventColor(event.commandId ?? '', device, event.parameters?.scene))
      setParams(event.parameters ?? {})
    }
  }, [event, device])

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
      color: eventColor,
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
              style={{ backgroundColor: eventColor }}
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
                  setEventColor(resolveEventColor(newId, device, newParams.scene))
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
              {(commandId === 'qc-preset' || commandId === 'helix-lt-preset') && device.presets.length > 0 ? (
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
              ) : (commandId === 'qc-scene' || commandId === 'helix-lt-snapshot') ? (
                /* Scene/snapshot picker dropdown, with optional user-defined names */
                <div>
                  <label className="block text-xs text-gray-400 mb-1">{commandId === 'helix-lt-snapshot' ? 'Snapshot' : 'Scene'}</label>
                  <select
                    value={params['scene'] ?? 1}
                    onChange={(e) => {
                      const sceneNum = Number(e.target.value)
                      setParams((prev) => ({ ...prev, scene: sceneNum }))
                      const sceneLetters = ['A','B','C','D','E','F','G','H']
                      const letter = sceneLetters[sceneNum - 1] ?? String(sceneNum)
                      const namedScene = device.presets.flatMap((p) => p.scenes)
                        .find((s) => s.sceneNumber === sceneNum)
                      setLabel(namedScene ? `Scene ${letter}: ${namedScene.name}` : `Scene ${letter}`)
                      setEventColor(resolveEventColor(commandId, device, sceneNum))
                    }}
                    className="w-full bg-gray-900 text-sm text-gray-200 rounded px-3 py-1.5
                      border border-gray-700 focus:border-blue-500 focus:outline-none"
                  >
                    {['A','B','C','D','E','F','G','H'].slice(0, profile?.maxScenes ?? 8).map((letter, i) => {
                      const sceneNum = i + 1
                      const sceneColor = resolveEventColor(commandId, device, sceneNum)
                      const named = device.presets.flatMap((p) => p.scenes)
                        .find((s) => s.sceneNumber === sceneNum)
                      return (
                        <option key={letter} value={sceneNum} style={{ color: sceneColor }}>
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
                    const sliderLabel = paramName === 'startValue' ? 'Start (Heel 0 → Toe 127)' : 'End (Heel 0 → Toe 127)'
                    const val = params[paramName] ?? (paramName === 'startValue' ? 0 : 127)
                    return (
                      <div key={paramName}>
                        <label className="block text-xs text-gray-400 mb-1">{sliderLabel}</label>
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

                  {/* Interactive curve preview */}
                  {(() => {
                    const svgW = 370
                    const svgH = 120
                    const pad = { top: 12, right: 12, bottom: 20, left: 32 }
                    const plotW = svgW - pad.left - pad.right
                    const plotH = svgH - pad.top - pad.bottom
                    const startVal = params.startValue ?? 0
                    const endVal = params.endValue ?? 127
                    const easing = params.easingType ?? 0
                    const startY = pad.top + plotH - (startVal / 127) * plotH
                    const endY = pad.top + plotH - (endVal / 127) * plotH
                    const points = Array.from({ length: 41 }, (_, i) => {
                      const t = i / 40
                      const eased = applyEasing(t, easing)
                      const val = startVal + (endVal - startVal) * eased
                      const x = pad.left + t * plotW
                      const y = pad.top + plotH - (val / 127) * plotH
                      return `${x},${y}`
                    }).join(' ')
                    const fillPoints = `${pad.left},${pad.top + plotH} ${points} ${pad.left + plotW},${pad.top + plotH}`
                    const dur = params.durationBeats ?? 4
                    return (
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Sweep curve</label>
                        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full rounded border border-gray-700 bg-gray-900/50">
                          {/* Grid lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                            <line key={`h${f}`} x1={pad.left} y1={pad.top + f * plotH} x2={pad.left + plotW} y2={pad.top + f * plotH} stroke="#374151" strokeWidth="0.5" />
                          ))}
                          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                            <line key={`v${f}`} x1={pad.left + f * plotW} y1={pad.top} x2={pad.left + f * plotW} y2={pad.top + plotH} stroke="#374151" strokeWidth="0.5" />
                          ))}
                          {/* Start/end value dashed lines */}
                          <line x1={pad.left} y1={startY} x2={pad.left + plotW} y2={startY} stroke="#60a5fa" strokeWidth="0.5" strokeDasharray="4 3" opacity="0.5" />
                          <line x1={pad.left} y1={endY} x2={pad.left + plotW} y2={endY} stroke="#60a5fa" strokeWidth="0.5" strokeDasharray="4 3" opacity="0.5" />
                          {/* Filled area under curve */}
                          <polygon points={fillPoints} fill="#3b82f6" opacity="0.12" />
                          {/* Curve */}
                          <polyline fill="none" stroke="#3b82f6" strokeWidth="2" points={points} />
                          {/* Y-axis labels */}
                          <text x={pad.left - 4} y={pad.top + 4} textAnchor="end" fill="#9ca3af" fontSize="9">127</text>
                          <text x={pad.left - 4} y={pad.top + plotH + 1} textAnchor="end" fill="#9ca3af" fontSize="9">0</text>
                          {/* X-axis labels */}
                          <text x={pad.left} y={svgH - 4} textAnchor="start" fill="#9ca3af" fontSize="9">0</text>
                          <text x={pad.left + plotW} y={svgH - 4} textAnchor="end" fill="#9ca3af" fontSize="9">{dur} beats</text>
                          {/* Start/end value dots */}
                          <circle cx={pad.left} cy={startY} r="3" fill="#3b82f6" />
                          <circle cx={pad.left + plotW} cy={endY} r="3" fill="#3b82f6" />
                        </svg>
                      </div>
                    )
                  })()}

                  {/* Duration */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Duration</label>
                    {/* Musical duration presets */}
                    {(() => {
                      const beatsPerBar = song.timeSignature[0]
                      const maxBeats = 4 * beatsPerBar
                      const presets: Array<{ label: string; beats: number }> = [
                        { label: '1/16', beats: 0.25 },
                        { label: '1/8', beats: 0.5 },
                        { label: '1/4', beats: 1 },
                        { label: '1/2', beats: 2 },
                        { label: '1', beats: 4 },
                        { label: '1 bar', beats: beatsPerBar },
                        { label: '2 bars', beats: 2 * beatsPerBar },
                        { label: '4 bars', beats: 4 * beatsPerBar },
                      ]
                      const unique = presets.filter((p, i, arr) =>
                        p.beats <= maxBeats && arr.findIndex((q) => q.beats === p.beats) === i
                      )
                      const currentDur = params.durationBeats ?? 4
                      return (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {unique.map((p) => (
                            <button
                              key={p.label}
                              onClick={() => setParams((prev) => ({ ...prev, durationBeats: p.beats }))}
                              className={`px-2 py-0.5 text-xs rounded ${
                                currentDur === p.beats
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0.25}
                        max={4 * song.timeSignature[0]}
                        step={0.25}
                        value={params.durationBeats ?? 4}
                        onChange={(e) => setParams((prev) => ({ ...prev, durationBeats: Math.max(0.25, Math.min(4 * song.timeSignature[0], Number(e.target.value))) }))}
                        className="w-20 bg-gray-900 text-sm text-gray-200 rounded px-2 py-1 text-center
                          border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                      <span className="text-xs text-gray-500">beats</span>
                    </div>
                  </div>

                  {/* Easing */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Easing</label>
                    <select
                      value={params.easingType ?? 0}
                      onChange={(e) => setParams((prev) => ({ ...prev, easingType: Number(e.target.value) }))}
                      className="w-full bg-gray-900 text-sm text-gray-200 rounded px-3 py-1.5
                        border border-gray-700 focus:border-blue-500 focus:outline-none"
                    >
                      {EASING_LABELS.map((easingLabel, i) => (
                        <option key={i} value={i}>{easingLabel}</option>
                      ))}
                    </select>
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
