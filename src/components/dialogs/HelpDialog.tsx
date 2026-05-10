import { useUIStore } from '../../stores/ui-store'

const SHORTCUTS = [
  { key: 'Space', action: 'Play / Stop' },
  { key: 'Cmd+Z', action: 'Undo' },
  { key: 'Cmd+Shift+Z', action: 'Redo' },
  { key: 'Cmd+S', action: 'Save project' },
  { key: 'Cmd+O', action: 'Load project' },
  { key: 'Cmd+E', action: 'Export MIDI (Format 1)' },
  { key: 'Cmd+Shift+E', action: 'Export MIDI (Format 0)' },
  { key: 'Delete / Backspace', action: 'Delete selected events' },
  { key: 'Cmd+A', action: 'Select all events' },
  { key: 'Cmd+C', action: 'Copy selected events' },
  { key: 'Cmd+V', action: 'Paste at current bar' },
  { key: 'Cmd+Scroll', action: 'Zoom in / out' },
  { key: '?', action: 'Open this help dialog' },
]

export function HelpDialog() {
  const setHelpOpen = useUIStore((s) => s.setHelpOpen)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setHelpOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-gray-800 rounded-lg shadow-xl w-[620px] max-h-[85vh] overflow-y-auto border border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <h2 className="text-base font-semibold text-gray-100">Help &amp; User Manual</h2>
          <button onClick={() => setHelpOpen(false)} className="text-gray-400 hover:text-gray-200">
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-7 text-sm text-gray-300">

          {/* Quick Start */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quick Start</h3>
            <ol className="space-y-2 list-decimal list-inside text-gray-300">
              <li>Open <strong className="text-gray-100">Song Settings</strong> (⚙ button in the toolbar) and add your devices.</li>
              <li>For Neural DSP Quad Cortex devices, define your presets and scene names in the device edit panel.</li>
              <li>Double-click a lane in the timeline to place an event, or drag a command from the sidebar.</li>
              <li>Double-click an event block to open the editor and choose a command, position, and parameters.</li>
              <li>Export via <strong className="text-gray-100">File → Export MIDI</strong> and load the <code className="text-xs bg-gray-900 px-1 py-0.5 rounded">.mid</code> file onto your stage MIDI player.</li>
            </ol>
          </section>

          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Keyboard Shortcuts</h3>
            <table className="w-full text-xs">
              <tbody>
                {SHORTCUTS.map(({ key, action }) => (
                  <tr key={key} className="border-b border-gray-700/50">
                    <td className="py-1.5 pr-4 font-mono text-gray-200 whitespace-nowrap">{key}</td>
                    <td className="py-1.5 text-gray-400">{action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Device Setup */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Device Setup</h3>
            <p className="text-gray-400 mb-3">
              Devices are shared across all songs in the setlist. Add them once in Song Settings.
            </p>

            <h4 className="text-xs font-semibold text-gray-300 mb-2">Neural DSP Quad Cortex</h4>
            <table className="w-full text-xs mb-4">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-1 pr-4 text-left text-gray-500 font-normal">Command</th>
                  <th className="py-1 pr-4 text-left text-gray-500 font-normal">MIDI Messages</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1.5 pr-4 text-gray-200">Scene Change</td>
                  <td className="py-1.5 text-gray-400 font-mono">CC#43 = 0–7 (A–H)</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1.5 pr-4 text-gray-200">Preset Change</td>
                  <td className="py-1.5 text-gray-400 font-mono">CC#0 (bank) + CC#32 (setlist) + PC</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1.5 pr-4 text-gray-200">Tap Tempo</td>
                  <td className="py-1.5 text-gray-400 font-mono">CC#44 = 127</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1.5 pr-4 text-gray-200">Tuner On</td>
                  <td className="py-1.5 text-gray-400 font-mono">CC#45 = 127</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1.5 pr-4 text-gray-200">Tuner Off</td>
                  <td className="py-1.5 text-gray-400 font-mono">CC#45 = 0</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-1.5 pr-4 text-gray-200">Gig View On/Off</td>
                  <td className="py-1.5 text-gray-400 font-mono">CC#46 = 127 / 0</td>
                </tr>
              </tbody>
            </table>

            <h4 className="text-xs font-semibold text-gray-300 mb-2">Darkglass Alpha Omega Photon</h4>
            <table className="w-full text-xs mb-2">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-1 pr-4 text-left text-gray-500 font-normal">Command</th>
                  <th className="py-1 pr-4 text-left text-gray-500 font-normal">MIDI Messages</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Preset Change', 'PC 0–5 (A–F)'],
                  ['Tuner', 'PC 6'],
                  ['Drive', 'CC#21 = 0–127'],
                  ['Alpha-Omega Mix', 'CC#22 = 0–127'],
                  ['EQ Slider 1–6', 'CC#23–28 = 0–127'],
                  ['Dist. Blend', 'CC#29 = 0–127'],
                ].map(([cmd, msg]) => (
                  <tr key={cmd} className="border-b border-gray-700/50">
                    <td className="py-1.5 pr-4 text-gray-200">{cmd}</td>
                    <td className="py-1.5 text-gray-400 font-mono">{msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Named Presets & Scenes */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Named Presets &amp; Scenes (QC)</h3>
            <p className="text-gray-400 mb-3">
              For Quad Cortex devices you can define friendly preset and scene names so the event editor shows dropdowns instead of raw numbers.
            </p>
            <ol className="space-y-2 list-decimal list-inside text-gray-400 mb-3">
              <li>Open <strong className="text-gray-200">Song Settings</strong> and click the device row to enter edit mode.</li>
              <li>In the <strong className="text-gray-200">PRESETS</strong> section, click <strong className="text-gray-200">+ Add Preset</strong> for each preset you use.</li>
              <li>Set the preset name, program number (0–127), bank (0 or 1), and setlist index (0 = Factory, 1 = My Presets, 2–12 = User).</li>
              <li>Click the arrow on a preset row to expand it and enter optional scene names for scenes A–H.</li>
            </ol>
            <p className="text-gray-400">
              Once presets are defined, the event editor shows a <strong className="text-gray-200">Preset</strong> dropdown for Preset Change events and a <strong className="text-gray-200">Scene</strong> dropdown (A–H) for Scene Change events. Selecting a preset automatically fills in the bank, setlist, and program number and sets the event label to the preset name.
            </p>
          </section>

          {/* Timeline Controls */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Timeline Controls</h3>
            <ul className="space-y-1.5 text-gray-400">
              <li><span className="text-gray-200">Zoom:</span> Cmd+Scroll over the timeline, or use the Zoom control in the toolbar.</li>
              <li><span className="text-gray-200">Scroll:</span> Scroll horizontally over the timeline to navigate bars.</li>
              <li><span className="text-gray-200">Snap mode:</span> Choose Bar, Beat, or Off from the Snap control. Affects where events snap when placed or dragged.</li>
              <li><span className="text-gray-200">Seek:</span> Click or drag on the ruler to move the playhead.</li>
              <li><span className="text-gray-200">Sections:</span> Right-click the ruler to add a named section. Sections are color-coded overlays for navigation.</li>
              <li><span className="text-gray-200">Place event:</span> Double-click an empty lane area, or right-click for a command picker.</li>
              <li><span className="text-gray-200">Edit event:</span> Double-click an event block to open the editor.</li>
              <li><span className="text-gray-200">Move event:</span> Drag an event block left or right.</li>
            </ul>
          </section>

          {/* Event List View */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Event List View</h3>
            <p className="text-gray-400 mb-3">
              Switch between the timeline and a table view using the <strong className="text-gray-200">Timeline / Event List</strong> toggle above the main area.
            </p>
            <ul className="space-y-1.5 text-gray-400">
              <li><span className="text-gray-200">Columns:</span> Position (bar.beat), Device, Label, Command, and a Parameters summary.</li>
              <li><span className="text-gray-200">Sort:</span> Click the Position, Device, or Label column header to sort. Click again to reverse.</li>
              <li><span className="text-gray-200">Filter:</span> Use the Device dropdown in the toolbar row to show only events for one device.</li>
              <li><span className="text-gray-200">Edit:</span> Click the pencil icon on any row to open the event editor.</li>
              <li><span className="text-gray-200">Delete:</span> Click the trash icon to remove an event immediately.</li>
            </ul>
          </section>

          {/* Audio Reference */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Audio Reference</h3>
            <p className="text-gray-400 mb-2">
              Load a reference audio file via <strong className="text-gray-200">File → Load Reference Audio</strong>. The waveform appears at the bottom of the timeline and plays in sync with the transport.
            </p>
            <p className="text-gray-400">
              Use the <strong className="text-gray-200">+/−</strong> offset buttons (in beats) in the Audio lane header to align bar 1 with the first downbeat of the recording. The audio is embedded in the <code className="text-xs bg-gray-900 px-1 py-0.5 rounded">.midiproj</code> file.
            </p>
          </section>

          {/* Project File */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Project File Format</h3>
            <p className="text-gray-400 mb-2">
              Projects are saved as <code className="text-xs bg-gray-900 px-1 py-0.5 rounded">.midiproj</code> files (a ZIP archive containing <code className="text-xs bg-gray-900 px-1 py-0.5 rounded">project.json</code> and any embedded audio).
            </p>
            <p className="text-gray-400">
              Old v1 files (flat JSON) are automatically migrated to v2 format on load — no manual action required.
            </p>
          </section>

          {/* Export */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">MIDI Export</h3>
            <ul className="space-y-1.5 text-gray-400">
              <li><span className="text-gray-200">Export MIDI (Format 1):</span> One track per device. Best for DAWs.</li>
              <li><span className="text-gray-200">Export MIDI (Format 0):</span> All events merged into one track. Required by most stage MIDI players.</li>
              <li><span className="text-gray-200">Export All Songs as ZIP:</span> Exports every song in the setlist as a Format 0 <code className="text-xs bg-gray-900 px-1 py-0.5 rounded">.mid</code> file inside a single ZIP download.</li>
            </ul>
          </section>

        </div>

        <div className="px-6 py-3 border-t border-gray-700 flex justify-end sticky bottom-0 bg-gray-800">
          <button
            onClick={() => setHelpOpen(false)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
