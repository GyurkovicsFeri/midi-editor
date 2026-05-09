# MIDI Editor — AI Agent Context

## What This Is

A cross-platform desktop MIDI editor for live band performance. The band uses Neural DSP Quad Cortex (QC) guitar processors and a dedicated MIDI player device on stage. This app lets them author MIDI files that automatically send scene/preset changes at exact bar positions during a song.

**Key workflow:** Edit here → export `.mid` → load onto MIDI player device → play live.

**Users:** ~3 guitarists each with a QC, 1 bassist with a Darkglass Alpha Omega Photon. All are musicians, not developers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 41 via `electron-vite` |
| UI | React 19 + TypeScript |
| Bundler | Vite 7 (via electron-vite) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite` plugin) |
| State | Zustand + Immer (patches for undo/redo) |
| Waveform | wavesurfer.js 7 |
| MIDI export | midi-writer-js |
| Packaging | electron-builder |

**Config file name is `electron.vite.config.ts`** (NOT `electron-vite.config.ts` — the hyphen name is NOT auto-discovered).

A standalone `vite.config.ts` exists for browser-only preview (used by the `.claude/launch.json` dev server).

---

## Project Structure

```
midi-editor/
├── electron/
│   ├── main.ts          # Electron main process, IPC handlers (openFile, saveFile dialogs)
│   └── preload.ts       # contextBridge IPC bridge
├── src/
│   ├── App.tsx          # Root: Toolbar + sidebar + view toggle + Timeline/EventListView + dialogs
│   ├── main.tsx         # React root mount, imports globals.css
│   ├── styles/globals.css  # @import "tailwindcss" only
│   ├── types/
│   │   ├── midi.ts      # MusicalPosition, MidiEvent, RawMidiMessage, TICKS_PER_BEAT=480
│   │   ├── device.ts    # DeviceProfile, DeviceCommand, MidiDevice, Preset, Scene
│   │   ├── project.ts   # Song, Section, Setlist, Project
│   │   └── timeline.ts  # SnapMode ('bar'|'beat'|'off'), ViewState
│   ├── stores/
│   │   ├── project-store.ts   # All song/event/device CRUD, undo/redo, multi-song, clipboard
│   │   ├── transport-store.ts # isPlaying, currentTimeSeconds, play/stop/setCurrentTime
│   │   └── ui-store.ts        # zoom, scrollX/Y, snapMode, selectedEventIds, viewMode, dialog flags
│   ├── engine/
│   │   ├── clock.ts           # positionToSeconds, secondsToPosition, snapPosition, positionToTotalTicks
│   │   ├── device-protocol.ts # getBuiltInProfiles, getProfile, resolveEventToRawMidi
│   │   └── profiles/
│   │       ├── quad-cortex.ts                  # Built-in QC profile
│   │       ├── darkglass-alpha-omega-photon.ts # Built-in Darkglass profile
│   │       └── generic.ts                      # Built-in Generic MIDI profile
│   ├── lib/
│   │   ├── midi-file-io.ts    # exportSongToMidi, exportSongToMidiFormat0, batchExportToZip
│   │   └── project-file-io.ts # serializeProject, downloadProjectFile, loadProjectFile (.midiproj)
│   └── components/
│       ├── layout/
│       │   ├── Toolbar.tsx    # Transport controls, BPM/bars/timesig inputs, MenuBar, song name
│       │   ├── MenuBar.tsx    # File menu + Setlist + Help buttons; keyboard shortcuts
│       │   └── StatusBar.tsx  # Device count, event count, bar count
│       ├── sidebar/
│       │   └── DevicePanel.tsx  # Lists setlist devices; click commands to add events
│       ├── timeline/
│       │   ├── Timeline.tsx       # Main container: wheel zoom/scroll, key handlers, orchestrates lanes
│       │   ├── TimelineRuler.tsx  # Bar numbers, section overlays, click/drag to seek (snapped)
│       │   ├── TimelineGrid.tsx   # SVG bar/beat grid lines
│       │   ├── EventLane.tsx      # One row per device: fixed header + scrollable event area
│       │   ├── EventBlock.tsx     # Individual MIDI event block, drag-to-move
│       │   ├── WaveformLane.tsx   # wavesurfer.js waveform + offset controls (beats)
│       │   ├── Playhead.tsx       # Red current-position indicator
│       │   └── EventListView.tsx  # Table view of all events: sortable, filterable, edit/delete
│       ├── dialogs/
│       │   ├── EventEditor.tsx    # Edit event label, position, command, parameters; QC preset/scene dropdowns
│       │   ├── SongSettings.tsx   # Song name, device management; QC preset+scene name management
│       │   ├── SetlistManager.tsx # Reorder/rename/duplicate/delete songs, add new song
│       │   └── HelpDialog.tsx     # Built-in user manual: quick start, shortcuts, device CC tables
│       └── common/
│           └── ContextMenu.tsx    # Generic right-click menu
├── index.html           # body has overflow-hidden, mounts #root
├── electron.vite.config.ts
├── vite.config.ts       # browser-only preview (base path /midi-editor/ in production)
├── package.json         # includes electron-builder "build" config
└── .github/workflows/deploy.yml  # GitHub Actions → GitHub Pages
```

---

## Data Model

### Core types (`src/types/`)

```typescript
// 480 ticks per beat (PPQ). All internal positions use this.
TICKS_PER_BEAT = 480

MusicalPosition { bar: number, beat: number, tick: number }  // 1-indexed bar and beat

MidiEvent {
  id, type: 'device-command'|'cc'|'pc', deviceId, position: MusicalPosition
  label, color?
  commandId?, parameters?: Record<string, number>  // for device-command
  channel?, cc?: { controller, value }, pc?: { program }  // for raw cc/pc
}

DeviceProfile {
  id, name, builtIn: boolean, supportsScenes: boolean
  maxScenes?, maxPresets?, commands: DeviceCommand[]
}

DeviceCommand {
  id, name, description
  messages: RawMidiMessage[]   // sequence of CC/PC to send
  parameters?: CommandParameter[]  // user-fillable values
}

RawMidiMessage {
  type: 'cc' | 'pc'
  controller?: number   // CC number
  value?: number        // hardcoded CC value
  valueParam?: string   // pull CC value from event.parameters[valueParam]…
  valueOffset?: number  // …plus this offset (e.g. -1 to convert 1-indexed to 0-indexed)
  program?: number      // hardcoded PC program number
}

MidiDevice { id, name, profileId, midiChannel: 1-16, color, presets: Preset[] }

Preset {
  id, name
  programNumber: number  // PC value 0–127
  bank: number           // CC#0 value (0 = presets 0–127, 1 = presets 128–255)
  setlistIndex: number   // CC#32 value (0 = Factory, 1 = My Presets, 2–12 = User)
  scenes: Scene[]
}

Scene { id, name, sceneNumber: number }  // sceneNumber 1–8 → scenes A–H

// Devices live on Setlist, NOT on Song (shared across all songs)
Song {
  id, name, bpm, timeSignature: [number, number], totalBars
  audioFilePath?, audioOffsetMs: number
  audioFileData?: ArrayBuffer  // raw audio bytes (persisted in .midiproj ZIP)
  audioFileName?: string
  sections: Section[], events: MidiEvent[]
}

Setlist { id, name, songIds: string[], devices: MidiDevice[] }

Project { songs: Song[], setlist: Setlist, customProfiles: DeviceProfile[], activeSongId }
```

### audioOffsetMs convention
Positive = bar 1 occurs that many ms into the audio file. The waveform is shifted LEFT by `(audioOffsetMs/1000) * pixelsPerSecond` so bar 1 of the audio aligns with bar 1 of the timeline. WaveformLane shows this in **beats** (converts to/from ms using `msPerBeat = 60000/bpm`). The +/− buttons step by 0.5 beats.

---

## State Management

### project-store (`src/stores/project-store.ts`)

Uses Zustand + Immer `produceWithPatches`. Every mutation goes through the `mutate()` helper which records forward/inverse patches on the undoStack.

**Key actions:**
- `activeSong()` — returns the current active Song object
- `setlistDevices()` — returns `project.setlist.devices` (devices shared across all songs)
- `setSongProperty(key, value)` — mutates a property of the active song
- `addEvent / updateEvent / moveEvent / deleteEvent / deleteEvents`
- `copyEvents(ids)` / `pasteEvents(atBar)` — clipboard in store state
- `addDevice / updateDevice / removeDevice` — target `project.setlist.devices`; removeDevice cascades across all songs
- `addSection / updateSection / deleteSection`
- `addSong / duplicateSong / deleteSong / renameSong / setActiveSong / reorderSongs`
- `undo() / redo()` — apply inverse/forward Immer patches via custom `applyPatch()`
- `markClean()` — resets `isDirty` flag

**Important:** The `applyPatch` function at the bottom of project-store.ts is a custom implementation. Immer's `applyPatches` is NOT used directly.

### ui-store (`src/stores/ui-store.ts`)

- `viewMode: 'timeline' | 'list'` — switches between Timeline and EventListView
- `zoom` (0.25–4), `scrollX`, `scrollY` — timeline view state
- `snapMode: SnapMode` — 'bar' | 'beat' | 'off'
- `selectedEventIds: Set<string>` — multi-select
- `sidebarOpen`, `songSettingsOpen`, `setlistOpen`, `helpOpen` — panel/dialog visibility
- `selectEvent(id, multi?)`, `selectAll(ids)`, `deselectAll()`
- `setScrollX` clamps to `>= 0` only — **max bound is enforced in Timeline.tsx's handleWheel**

### transport-store (`src/stores/transport-store.ts`)

- `isPlaying`, `currentTimeSeconds`
- Transport clock runs in Toolbar.tsx via `requestAnimationFrame` using `performance.now()` timestamps (not setInterval). Uses `startTimeRef` + `startOffsetRef` pattern to avoid drift.

---

## Timeline Layout

```
[Toolbar 48px]
[View toggle bar ~32px] ← Timeline | Event List buttons
[Ruler 56px] ← click/drag to seek (snapped to snapMode)
[Lanes area flex-1 overflow-hidden]
  ├── Grid wrapper:     absolute, left=144px, overflow-hidden, no z-index
  │     └── TimelineGrid SVG (absolute inset-0, translateX(-scrollX))
  ├── Normal flow:
  │     ├── EventLane × N  (flex row: fixed w-36 header + flex-1 overflow-hidden content)
  │     └── WaveformLane   (flex row: fixed w-36 header + flex-1 overflow-hidden content)
  └── Playhead wrapper: absolute, left=144px, overflow-hidden, z-30 (rendered last, always on top)
        └── Playhead (absolute, left = beats*pixelsPerBeat - scrollX)
[StatusBar 32px]
```

**Critical layout rule:** Grid and Playhead are in **separate** absolute wrappers, both with `left: 144px` (= `w-36`) to prevent bleeding into the device-name header column. The Playhead wrapper has `z-30` and is rendered after the lanes div so it paints above WaveformLane (which creates its own stacking context via `transform`). Both receive `scrollX` directly (not `scrollX - 144`).

**Scroll cap:** `handleWheel` computes `maxScrollX = totalWidth + 144 - containerWidth` so the user can never scroll past the last bar.

### Coordinate math

```
pixelsPerBeat = 40 * zoom           // BASE_PIXELS_PER_BEAT = 40
pixelsPerBar  = pixelsPerBeat * beatsPerBar
pixelsPerSecond = pixelsPerBeat / (60 / bpm)

// Event X in EventLane content div (after the 144px header):
x = (bar-1) * pixelsPerBar + (beat-1) * pixelsPerBeat + tick/TICKS_PER_BEAT * pixelsPerBeat
// Then translated: translateX(-scrollX)

// Grid/Playhead X in the 144px-offset wrapper:
// same formula, also translateX(-scrollX)
```

---

## QC MIDI Protocol

QC hierarchy: **Library → Preset → Scene** (8 scenes per preset, labeled A–H).

**Scene recall** — single message on the device's channel:
- `CC#43 value 0–7` → Scene A–H (scene parameter 1–8 maps to value 0–7)

For `qc-scene` with `parameters.scene = 3`: emits `CC#43 value 2`.

**Preset recall** — three messages on the device's channel:
1. `CC#0 value 0–1` → Bank MSB (0 = presets 0–127, 1 = presets 128–255)
2. `CC#32 value 0–12` → Setlist (0 = Factory, 1 = My Presets, 2–12 = User folders)
3. `PC 0–127` → Preset number within the selected bank

For `qc-preset` with `bank=0, setlist=1, preset=5`: emits `CC#0=0`, `CC#32=1`, `PC 5`.

Other QC CCs: `CC#44` Tap Tempo, `CC#45` Tuner, `CC#46` Gig View.

**Named presets & scenes:** Users define friendly preset names (with bank/setlist/programNumber) and scene names (A–H) per device in Song Settings. The EventEditor shows dropdowns instead of raw number inputs when presets are configured.

---

## Darkglass Alpha Omega Photon MIDI Protocol

CC assignments are **user-configurable** in Darkglass Suite. The built-in profile uses the CC#20–29 range (undefined in General MIDI). The bassist must enter these in Darkglass Suite to match.

| CC# | Control | Values |
|-----|---------|--------|
| 20 | Bypass/Engage | 0 = bypass, 127 = active |
| 21 | Drive | 0–127 |
| 22 | Blend | 0–127 |
| 23 | Bass EQ | 0–127 (64 = flat) |
| 24 | Mid EQ | 0–127 (64 = flat) |
| 25 | Treble EQ | 0–127 (64 = flat) |
| 26 | Master Level | 0–127 |
| 27 | Compression | 0–127 |
| 28 | Distortion Mode | 0 = Alpha, 127 = Omega |
| 29 | Cab Sim | 0 = off, 127 = on |

**Preset recall** — single PC message:
- `PC 0–5` → Presets A–F (separate commands per preset in the profile, each with hardcoded `msg.program`)

---

## MIDI Export

Three export functions in `src/lib/midi-file-io.ts`:

- `exportSongToMidi(song, devices, customProfiles)` — Format 1, one Track per device. Best for DAWs.
- `exportSongToMidiFormat0(song, devices, customProfiles)` — Format 0, single merged track sorted by tick. Required by most stage MIDI players.
- `batchExportToZip(songs, devices, customProfiles, setlistName)` — exports every song as Format 0 `.mid` inside a single ZIP download (uses JSZip).

All functions:
- midi-writer-js uses 128 PPQ internally; scale from 480 PPQ with `scaleFactor = 128/480`
- Delta timing is passed via the `delta` constructor field (NOT via `.tick` after construction)
- Only the first message in a grouped event gets the delta; subsequent messages use delta 0
- Return a `dataUri` string; `downloadMidiFile(dataUri, filename)` triggers browser download

---

## Project File Format

File extension: `.midiproj`. Format version 2 is a **ZIP archive** containing:
- `project.json` — the serialized Project object
- `audio/<filename>` — embedded audio file (if any)

```json
{ "version": 2, "project": { ...Project object... } }
```

**Migration:** v1 files (flat JSON with `devices` on each Song) are automatically migrated to v2 on load:
- All devices collected from songs, deduplicated by ID, moved to `setlist.devices`
- `devices` property deleted from each song
- Audio data rehydrated: `audioFileData` (ArrayBuffer from ZIP entry) → Blob → `URL.createObjectURL` → `audioFilePath`

`loadProjectFile()` handles both ZIP (v2) and legacy flat JSON (v1) formats.

---

## Keyboard Shortcuts

| Shortcut | Action | Implemented in |
|---|---|---|
| Space | Play/Stop | Toolbar.tsx |
| Cmd+Z | Undo | Toolbar.tsx |
| Cmd+Shift+Z | Redo | Toolbar.tsx |
| Cmd+S | Save project | MenuBar.tsx |
| Cmd+O | Load project | MenuBar.tsx |
| Cmd+E | Export MIDI (Format 1) | MenuBar.tsx |
| Cmd+Shift+E | Export MIDI (Format 0) | MenuBar.tsx |
| ? | Open Help dialog | MenuBar.tsx |
| Delete/Backspace | Delete selected events | Timeline.tsx |
| Cmd+A | Select all events | Timeline.tsx |
| Cmd+C | Copy selected events | Timeline.tsx |
| Cmd+V | Paste at current bar | Timeline.tsx |
| Cmd+Scroll | Zoom in/out | Timeline.tsx |

---

## BPM / Bars Input Pattern

BPM and Bars inputs in Toolbar use **local draft state** to allow free typing. Pattern:
```tsx
const [bpmDraft, setBpmDraft] = useState(String(song.bpm))
const bpmFocused = useRef(false)
useEffect(() => { if (!bpmFocused.current) setBpmDraft(String(song.bpm)) }, [song.bpm])
// onChange → update draft only
// onBlur / Enter → parse, clamp, commit to store
```
This allows selecting all + retyping without intermediate invalid values being committed. Same pattern used for totalBars. **Do not revert to binding value={song.bpm} directly — it breaks mid-edit typing.**

---

## Audio Reference Feature

- Load via File → Load Reference Audio (creates `URL.createObjectURL`)
- After loading, duration is read via `new Audio().onloadedmetadata` and `totalBars` is auto-calculated: `Math.ceil(duration * bpm/60 / beatsPerBar)`
- `audioOffsetMs` stored as ms internally, displayed as beats in WaveformLane header
- Waveform rendered by wavesurfer.js with `interact: false` (visual only, not clickable)
- Zoom sync: when zoom changes, `ws.zoom(pixelsPerSecond)` is called

### Audio Playback

WaveformLane syncs wavesurfer.js play/pause/seek with the transport clock:
- When `isPlaying` changes, wavesurfer plays or pauses at the correct position
- Audio position = `currentTimeSeconds + audioOffsetMs / 1000` (accounts for the offset)
- When seeking while paused (ruler click, rewind), wavesurfer seeks to the matching position
- If wavesurfer isn't ready yet when play starts, a `ready` event listener handles deferred playback
- Timeline.tsx passes `isPlaying={isPlaying}` (not hardcoded `false`) to WaveformLane
- `ws.load(audioUrl)` errors are caught; AbortError (from destroy() during in-flight load) is silently ignored
- `ws.zoom()` is guarded with `getDuration() > 0` to avoid "No audio loaded" errors

### Audio Persistence in .midiproj

Reference audio is embedded in the project ZIP as a raw binary file entry (`audio/<filename>`):
- `audioFileData` — ArrayBuffer of the audio bytes, persisted in the ZIP
- `audioFileName` — original filename, stored for display and as the ZIP entry name
- On **save**: `audioFilePath` (runtime blob URL) is excluded; only `audioFileData` + `audioFileName` are written
- On **load**: ZIP entry is read as ArrayBuffer → Blob → `URL.createObjectURL` → `audioFilePath`
- **Caveat**: large audio files increase `.midiproj` size directly (no base64 overhead since it's stored as binary in the ZIP)

---

## Device Editing

Devices are shared across all songs (on `project.setlist.devices`). Managed in Song Settings (⚙ button):
- Click any device row to expand it into edit mode
- Editable fields: **name**, **profile** (dropdown), **MIDI channel** (1–16), **color** (color picker)
- Changes applied immediately via `updateDevice(deviceId, changes)` in project-store
- Click "Done" to collapse back to display mode
- "Remove" deletes the device and cascades to remove all its events across all songs

### QC Preset Management (in Song Settings edit mode)

For devices with `profileId === 'quad-cortex'`, a **PRESETS** section appears:
- Add / remove named presets with: name, program number (0–127), bank (0–1), setlist index (0–12)
- Each preset row has a toggle to expand scene names A–H (stored as `Scene[]` on the preset)
- Saved immediately via `updateDevice(deviceId, { presets: [...] })`
- When presets are defined, EventEditor shows a named dropdown instead of raw number inputs

---

## Event List View

Accessible via the **Timeline | Event List** toggle above the main view area.

- Table with columns: Position (bar.beat), Device (color dot + name), Label, Command, Parameters summary
- Sortable by Position, Device, or Label (click header; click again to reverse)
- Filter dropdown to show only events for a specific device
- Edit button opens EventEditor dialog; Delete button removes event immediately
- Empty state message differentiates between "no events" and "no events matching filter"

---

## GitHub Pages Deployment

The app is hosted at `https://gyurkovicsferi.github.io/midi-editor/` via GitHub Actions:
- Trigger: push to `main` branch
- Build: `npm run build:web` (runs `vite build` using `vite.config.ts`)
- Deploy: `actions/upload-pages-artifact` + `actions/deploy-pages`
- `vite.config.ts` sets `base: '/midi-editor/'` in production

---

## Packaging

Scripts in `package.json`:
- `npm run dev` — electron-vite dev server
- `npm run build` — electron-vite build (outputs to `dist/`)
- `npm run build:web` — Vite browser-only build (outputs to `dist-web/`)
- `npm run package:mac` — build + electron-builder → `release/` (DMG, arm64+x64 universal)
- `npm run package:win` — build + electron-builder → `release/` (NSIS installer, x64)

electron-builder config is inline in `package.json` under the `"build"` key. App ID: `com.midi-editor.app`.

---

## Known Issues / Not Yet Implemented

- **Live MIDI output** — no node-midi integration yet. The `ipcMain` file dialog handlers exist but live MIDI output is Phase 7 (future).
- **Custom device profile editor** — users can't yet create profiles in-app; built-ins are QC, Darkglass Alpha Omega Photon, and Generic.
- **Canvas timeline** — still DOM-based (EventLane/EventBlock as divs). Performance is adequate for typical song lengths but a canvas renderer was planned for large setlists.
- **Preset drag-and-drop** — DevicePanel sidebar lists commands but drag-to-timeline isn't implemented; events are added by double-clicking the lane.
- **Loop playback** — `loopEnabled/loopStartBar/loopEndBar` exist in transport-store but the play clock in Toolbar doesn't enforce the loop range yet.
- **Undo history across song switches** — the undo stack is shared across all songs (not per-song). Switching songs doesn't clear the stack.
- **Localization** — EN/HU localization (react-i18next) planned but not yet implemented.

---

## Common Pitfalls

1. **`electron.vite.config.ts` naming** — must use `.` not `-` in filename or electron-vite won't discover it.
2. **Scroll X has no upper bound in ui-store** — the cap is enforced only in `Timeline.tsx handleWheel`. If you add other scroll sources, clamp there too.
3. **Immer patches** — `applyPatch` at the bottom of project-store.ts is custom. Don't import `applyPatches` from immer — it wasn't wired up.
4. **midi-writer-js PPQ** — uses 128 ticks/beat internally, not 480. Scale with `128/TICKS_PER_BEAT`.
5. **Grid/Playhead offset** — TimelineGrid and Playhead receive plain `scrollX` (not `scrollX - 144`) because they each live inside their own `left: 144px` clipped wrapper div. The Playhead wrapper has `z-30` and is rendered after the lanes; the Grid wrapper has no z-index and renders behind lanes.
6. **audioOffsetMs sign** — positive = audio starts before bar 1 (common case: recording has silence before the first downbeat). Waveform shifts LEFT by `offsetPx`.
7. **setSongProperty staleness** — in async callbacks (e.g. `audio.onloadedmetadata`), capture `song.bpm` and `song.timeSignature` in the `useCallback` deps, not inside the async handler, to avoid stale closure values.
8. **audioFileData is ArrayBuffer, not base64** — stored as binary in the ZIP. Do not attempt to JSON-serialize it directly; the ZIP serializer handles it.
9. **audioFilePath is runtime-only** — `audioFilePath` holds a `blob:` URL created at runtime. It is NOT persisted in `.midiproj` files. Rehydrated from the ZIP audio entry on load.
10. **midi-writer-js channel asymmetry** — `ControllerChangeEvent` expects 1-based channels (subtracts 1 internally). `ProgramChangeEvent` expects 0-based channels (uses value as-is). Always pass `device.midiChannel` for CC and `device.midiChannel - 1` for PC.
11. **midi-writer-js delta must be in constructor** — Event timing must be passed as `delta` in the constructor fields. The `.data` array is built immediately in the constructor. Setting `.tick` after construction does NOT affect the data array. Never use the `(event as any).tick = delta` pattern.
12. **Devices are on Setlist, not Song** — `song.devices` no longer exists. Always use `setlistDevices()` selector or `project.setlist.devices`. Components that previously read `song.devices` have all been updated.
13. **QC scene labels are A–H, not 1–8** — internally stored as `sceneNumber` 1–8, but always display as letters. CC#43 value = sceneNumber − 1.
14. **WaveformLane AbortError** — `ws.destroy()` during an in-flight `ws.load()` throws AbortError. Catch it and ignore only AbortError; re-throw others.
15. **WaveformLane zoom guard** — call `ws.zoom()` only when `ws.getDuration() > 0`; otherwise wavesurfer throws "No audio loaded".
