# Expression Pedal "Set Value" Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users program a single expression-pedal CC value ("set pedal to 80") without configuring a full sweep, via a Set Value | Sweep mode toggle in the event editor.

**Architecture:** A new `sweepMode` parameter on pedal events (0 = Set Value, 1 = Sweep; absent = Sweep for backward compatibility). Set-value events flow through the **existing non-sweep code path** everywhere (playback, export, timeline width) via a new `isActiveSweep(event)` helper that call sites use instead of the bare `isSweepCommand(commandId)` check. The device profiles' `valueParam: 'startValue'` already makes `resolveEventToRawMidi` emit the correct single CC, so no new message-building code is needed.

**Tech Stack:** React 19 + TypeScript, Zustand, no test framework (verification = `npm run typecheck` + manual browser preview).

**Spec:** `docs/superpowers/specs/2026-08-12-exp-pedal-set-value-design.md`

## Global Constraints

- Events with `parameters.sweepMode` **absent** MUST behave as sweeps (all existing saved projects contain only sweeps). Only `sweepMode === 0` means Set Value.
- New pedal events default to Set Value with value 64 (stored in `startValue`).
- Switching modes in the editor never deletes parameter values; the inactive mode's fields are simply ignored.
- Verification command after every code change: `npm run typecheck` — expected: exit 0, no output.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Sweep engine helpers

**Files:**
- Modify: `src/engine/sweep.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (used by Tasks 3–5):
  - `isSetValueMode(event: MidiEvent): boolean` — true iff `event.parameters?.sweepMode === 0`
  - `isActiveSweep(event: MidiEvent): boolean` — true iff `event.commandId` is a sweep command AND the event is NOT in set-value mode
  - `sweepEventLabel(commandId: string, params: Record<string, number> | undefined): string` — e.g. `Exp 1: 80` (set value) or `Exp 1: 0→127` (sweep)
  - `getSweepDurationBeats(event)` now returns `0` for set-value events

- [ ] **Step 1: Add helpers to `src/engine/sweep.ts`**

Add after the existing `isSweepCommand` function:

```typescript
export function isSetValueMode(event: MidiEvent): boolean {
  return event.parameters?.sweepMode === 0
}

/** Sweep command that actually sweeps (not in single-value mode). */
export function isActiveSweep(event: MidiEvent): boolean {
  return !!(event.commandId && isSweepCommand(event.commandId) && !isSetValueMode(event))
}

const PEDAL_SHORT_NAMES: Record<string, string> = {
  'qc-exp-pedal-1': 'Exp 1',
  'qc-exp-pedal-2': 'Exp 2',
  'helix-lt-exp-1': 'Exp 1',
  'helix-lt-exp-2': 'Exp 2',
  've500-exp-pedal': 'Exp'
}

export function sweepEventLabel(
  commandId: string,
  params: Record<string, number> | undefined
): string {
  const name = PEDAL_SHORT_NAMES[commandId] ?? 'Exp'
  const start = params?.startValue ?? 0
  if (params?.sweepMode === 0) return `${name}: ${start}`
  return `${name}: ${start}→${params?.endValue ?? 127}`
}
```

Then change `getSweepDurationBeats` to:

```typescript
export function getSweepDurationBeats(event: MidiEvent): number {
  if (isSetValueMode(event)) return 0
  return event.parameters?.durationBeats ?? 0
}
```

Leave `expandSweepToMessages` unchanged — after Task 3, no call site reaches it for set-value events.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/engine/sweep.ts
git commit -m "feat: add set-value mode helpers to sweep engine"
```

---

### Task 2: Profile defaults and DevicePanel parameter fix

**Files:**
- Modify: `src/engine/profiles/quad-cortex.ts` (commands `qc-exp-pedal-1`, `qc-exp-pedal-2`)
- Modify: `src/engine/profiles/helix-lt.ts` (commands `helix-lt-exp-1`, `helix-lt-exp-2`)
- Modify: `src/engine/profiles/ve-500.ts` (command `ve500-exp-pedal`)
- Modify: `src/components/sidebar/DevicePanel.tsx:15-27`

**Interfaces:**
- Produces: every expression-pedal command's `parameters` array gains `{ name: 'sweepMode', label: 'Mode', min: 0, max: 1, defaultValue: 0 }` and its `startValue` default becomes `64`. All four event-creation sites now populate `sweepMode: 0` for new pedal events (three in Timeline.tsx already copy `defaultValue`s; DevicePanel is fixed here).

- [ ] **Step 1: Update the five pedal command definitions**

In each of the five commands listed above, apply the same three edits (shown here for `qc-exp-pedal-1`; repeat identically for the other four, keeping each command's own CC controller number and name numbering):

1. Command `name`: `'Expression Pedal 1 Sweep'` → `'Expression Pedal 1'`
2. Command `description`: `'Animated CC#1 sweep from start to end value over a duration'` → `'Set CC#1 to a value, or sweep it from start to end over a duration'`
3. `parameters` array becomes:

```typescript
      parameters: [
        { name: 'sweepMode', label: 'Mode', min: 0, max: 1, defaultValue: 0 },
        { name: 'startValue', label: 'Start Value', min: 0, max: 127, defaultValue: 64 },
        { name: 'endValue', label: 'End Value', min: 0, max: 127, defaultValue: 127 },
        { name: 'durationBeats', label: 'Duration (beats)', min: 0.25, max: 64, defaultValue: 4 },
        { name: 'easingType', label: 'Easing', min: 0, max: 3, defaultValue: 0 }
      ]
```

The five commands: `quad-cortex.ts` `qc-exp-pedal-1` (CC#1) and `qc-exp-pedal-2` (CC#2); `helix-lt.ts` `helix-lt-exp-1` (CC#1) and `helix-lt-exp-2` (CC#2); `ve-500.ts` `ve500-exp-pedal` (CC#11, name becomes `'Expression Pedal'`).

- [ ] **Step 2: Fix DevicePanel to populate default parameters**

`DevicePanel.tsx` `handleAddCommand` currently passes `parameters: {}`, so sidebar-added pedal events would lack `sweepMode` and wrongly behave as sweeps. Replace the function body:

```typescript
  const handleAddCommand = (deviceId: string, commandId: string, label: string) => {
    const device = devices.find((d) => d.id === deviceId)
    if (!device) return
    const profile = getProfile(device.profileId)
    const command = profile?.commands.find((c) => c.id === commandId)
    const params: Record<string, number> = {}
    command?.parameters?.forEach((p) => {
      params[p.name] = p.defaultValue
    })
    addEvent({
      type: 'device-command',
      deviceId,
      commandId,
      position: { bar: 1, beat: 1, tick: 0 },
      label,
      color: resolveEventColor(commandId, device),
      parameters: params
    })
  }
```

(`getProfile` is already imported in this file.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/engine/profiles/quad-cortex.ts src/engine/profiles/helix-lt.ts src/engine/profiles/ve-500.ts src/components/sidebar/DevicePanel.tsx
git commit -m "feat: default expression pedal commands to set-value mode"
```

---

### Task 3: Playback and export honor set-value mode

**Files:**
- Modify: `src/hooks/useMidiPlayback.ts:100`
- Modify: `src/lib/midi-file-io.ts:47,127`

**Interfaces:**
- Consumes: `isActiveSweep(event)` from Task 1.
- Produces: set-value pedal events reach the existing `resolveEventToRawMidi` path, which emits a single CC (the profile message is `{ type: 'cc', controller: N, valueParam: 'startValue' }`, so the CC value comes from `parameters.startValue`). Sweep events are unchanged.

- [ ] **Step 1: Update `useMidiPlayback.ts`**

Line 100, change:

```typescript
          if (event.commandId && isSweepCommand(event.commandId)) {
```

to:

```typescript
          if (isActiveSweep(event)) {
```

Update the import on line 9 from `isSweepCommand` to `isActiveSweep` (keep `applyEasing`). If `isSweepCommand` is no longer referenced in this file, remove it from the import.

- [ ] **Step 2: Update `midi-file-io.ts`**

At both line 47 (`exportSongToMidi`) and line 127 (`exportSongToMidiFormat0`), change:

```typescript
      if (event.commandId && isSweepCommand(event.commandId)) {
```

to:

```typescript
      if (isActiveSweep(event)) {
```

Update the import on line 8: `import { isActiveSweep, expandSweepToMessages } from '../engine/sweep'` (drop `isSweepCommand` if unused).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMidiPlayback.ts src/lib/midi-file-io.ts
git commit -m "feat: emit single CC for set-value pedal events in playback and export"
```

---

### Task 4: Timeline block width and event list summary

**Files:**
- Modify: `src/components/timeline/EventBlock.tsx:40-41`
- Modify: `src/components/timeline/EventListView.tsx:16-27` (`paramSummary`)

**Interfaces:**
- Consumes: `isActiveSweep(event)` from Task 1; `isSweepCommand` (existing).
- Produces: set-value events render at normal block width; Event List shows `Value 64` / `0→127 over 4 beats` instead of raw `key=value` dumps for pedal events.

- [ ] **Step 1: Update `EventBlock.tsx`**

Lines 40–41, change:

```typescript
  const isSweep = !!(event.commandId && isSweepCommand(event.commandId))
  const sweepDuration = isSweep ? getSweepDurationBeats(event) : 0
```

to:

```typescript
  const isSweep = isActiveSweep(event)
  const sweepDuration = isSweep ? getSweepDurationBeats(event) : 0
```

Update the import on line 4: replace `isSweepCommand` with `isActiveSweep` (keep `getSweepDurationBeats` and `applyEasing`).

- [ ] **Step 2: Update `paramSummary` in `EventListView.tsx`**

Add a branch before the generic `Object.entries` fallback (after the scene/snapshot branch):

```typescript
  if (commandId && isSweepCommand(commandId)) {
    if (p['sweepMode'] === 0) return `Value ${p['startValue'] ?? 64}`
    return `${p['startValue'] ?? 0}→${p['endValue'] ?? 127} over ${p['durationBeats'] ?? 4} beats`
  }
```

Add the import at the top of the file: `import { isSweepCommand } from '../../engine/sweep'`

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/timeline/EventBlock.tsx src/components/timeline/EventListView.tsx
git commit -m "feat: render set-value pedal events as normal-width blocks with value summary"
```

---

### Task 5: Event editor mode toggle UI

**Files:**
- Modify: `src/components/dialogs/EventCommandFields.tsx`
- Modify: `src/components/dialogs/EventEditor.tsx:104-107`

**Interfaces:**
- Consumes: `sweepEventLabel(commandId, params)` from Task 1.
- Produces: Set Value | Sweep segmented toggle in the pedal event editor; single slider in Set Value mode; labels generated via `sweepEventLabel` everywhere (fixes the existing bug where Helix/VE-500 pedal 1 events were mislabeled `Exp 2` by the hardcoded `qc-exp-pedal-1` ternary).

- [ ] **Step 1: Use `sweepEventLabel` in the command-change handler**

`EventCommandFields.tsx` lines 53–55, replace:

```typescript
            const newLabel = isSweepCommand(newId)
              ? `Exp ${newId === 'qc-exp-pedal-1' ? '1' : '2'}: ${newParams.startValue ?? 0}→${newParams.endValue ?? 127}`
              : resolveCommandDisplayName(newCmd, device)
```

with:

```typescript
            const newLabel = isSweepCommand(newId)
              ? sweepEventLabel(newId, newParams)
              : resolveCommandDisplayName(newCmd, device)
```

Update the import on line 4 to include `sweepEventLabel`.

- [ ] **Step 2: Add the mode toggle and Set Value branch**

In `EventCommandFields.tsx`, the sweep branch currently starts at line 141:

```typescript
          ) : commandId && isSweepCommand(commandId) ? (
            <div className="space-y-3">
```

Immediately inside that `<div className="space-y-3">`, insert the mode toggle, then wrap the two existing sub-sections so the sweep controls only render in Sweep mode. The full branch becomes:

```tsx
          ) : commandId && isSweepCommand(commandId) ? (
            <div className="space-y-3">
              {/* Set Value | Sweep mode toggle */}
              {(() => {
                const mode = params.sweepMode ?? 1
                const setMode = (m: number) =>
                  onChange({ params: { ...params, sweepMode: m } })
                return (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Mode</label>
                    <div className="flex rounded overflow-hidden border border-gray-700">
                      {[
                        { m: 0, label: 'Set Value' },
                        { m: 1, label: 'Sweep' }
                      ].map(({ m, label: modeLabel }) => (
                        <button
                          key={m}
                          onClick={() => setMode(m)}
                          className={`flex-1 px-3 py-1.5 text-xs ${
                            mode === m
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-900 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          {modeLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {(params.sweepMode ?? 1) === 0 ? (
                /* Set Value mode: single slider */
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Value (Heel 0 → Toe 127)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={127}
                        value={params.startValue ?? 64}
                        onChange={(e) => onChange({ params: { ...params, startValue: Number(e.target.value) } })}
                        className="flex-1 accent-blue-500"
                      />
                      <input
                        type="number"
                        min={0}
                        max={127}
                        value={params.startValue ?? 64}
                        onChange={(e) => onChange({ params: { ...params, startValue: Math.max(0, Math.min(127, Number(e.target.value))) } })}
                        className="w-14 bg-gray-900 text-sm text-gray-200 rounded px-2 py-1 text-center
                          border border-gray-700 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onChange({ params: { ...params, startValue: 0 } })}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
                    >
                      Heel (0)
                    </button>
                    <button
                      onClick={() => onChange({ params: { ...params, startValue: 127 } })}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded"
                    >
                      Toe (127)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* ...ALL the existing sweep controls, unchanged:
                      start/end sliders, quick-set buttons, curve preview,
                      duration presets + input, easing dropdown... */}
                </div>
              )}
            </div>
```

The `{/* ...ALL the existing sweep controls... */}` placeholder above means: move the existing JSX from the current lines 143–310 (start/end slider map, quick-set buttons, curve preview IIFE, duration block, easing block) into that else-branch **verbatim, without any modification**. Do not retype it — cut and paste the existing block.

- [ ] **Step 3: Use `sweepEventLabel` on save in `EventEditor.tsx`**

Lines 104–107, replace:

```typescript
      if (row.commandId && isSweepCommand(row.commandId)) {
        const pedal = row.commandId === 'qc-exp-pedal-1' ? '1' : '2'
        finalLabel = `Exp ${pedal}: ${row.params.startValue ?? 0}→${row.params.endValue ?? 127}`
      }
```

with:

```typescript
      if (row.commandId && isSweepCommand(row.commandId)) {
        finalLabel = sweepEventLabel(row.commandId, row.params)
      }
```

Update the import on line 5 to `import { isSweepCommand, sweepEventLabel } from '../../engine/sweep'`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/components/dialogs/EventCommandFields.tsx src/components/dialogs/EventEditor.tsx
git commit -m "feat: add Set Value / Sweep mode toggle to pedal event editor"
```

---

### Task 6: Docs and manual browser verification

**Files:**
- Modify: `src/components/dialogs/HelpDialog.tsx:129-130,154`
- Modify: `CLAUDE.md` (sweep pitfall #17 area)

**Interfaces:**
- Consumes: the complete feature from Tasks 1–5.

- [ ] **Step 1: Update HelpDialog CC descriptions**

In `HelpDialog.tsx`, change the three pedal rows from `(sweep)` to `(set or sweep)`:
- Line 129: `['Expression Pedal 1', 'CC#1 = 0–127 (set or sweep)'],`
- Line 130: `['Expression Pedal 2', 'CC#2 = 0–127 (set or sweep)'],`
- Line 154: `['Expression Pedal', 'CC#11 = 0–127 (set or sweep)'],`

- [ ] **Step 2: Update CLAUDE.md**

In the "Common Pitfalls" section, extend pitfall 17 with the mode rule. Append to the existing pitfall 17 text:

```markdown
Expression pedal events also carry `parameters.sweepMode`: `0` = Set Value (single CC, value in `startValue`), `1` or **absent** = Sweep (absent must stay a sweep for backward compatibility with old project files). Call sites use `isActiveSweep(event)` from `sweep.ts`, not bare `isSweepCommand(commandId)`, to decide whether to interpolate.
```

- [ ] **Step 3: Manual verification in browser preview**

Start the dev server (browser preview via `.claude/launch.json`), then verify:

1. Add a device with the Quad Cortex profile (Song Settings) if none exists.
2. Right-click an event lane → "Add Expression Pedal 1" → editor opens in **Set Value** mode with slider at 64.
3. Drag slider to 80, save → block label reads `Exp 1: 80`, block is normal width (not stretched).
4. Reopen event, switch to **Sweep** → start/end sliders, curve, duration, easing appear; switch back → single slider, value preserved.
5. Event List view shows `Value 80` in the Parameters column.
6. Export MIDI Format 0 (Cmd+Shift+E) with one Set Value event and one Sweep event → open the exported bytes or re-import into a DAW/tool: Set Value event = exactly one CC#1 message; Sweep event = many interpolated CC#1 messages.
7. Load a project saved before this change (if available) → old pedal events still open in Sweep mode.

Record what was checked and the results.

- [ ] **Step 4: Commit**

```bash
git add src/components/dialogs/HelpDialog.tsx CLAUDE.md
git commit -m "docs: document expression pedal set-value mode"
```
