# Expression Pedal "Set Value" Mode — Design

**Date:** 2026-08-12
**Status:** Approved

## Problem

Every expression pedal event is currently a sweep: the user must configure
Start value, End value, Duration, and Easing — even when all they want is
"set the pedal to value X at this bar." Setting a single value is the most
common case and today requires the clunky Start = End workaround.

## Solution

Add a **Set Value | Sweep** mode toggle to expression pedal events. Set Value
mode shows a single slider and emits one CC message. Sweep mode is the
unchanged existing UI and behavior.

## Data Model

- New optional parameter on `event.parameters`: `sweepMode`
  - `0` = Set Value (single CC message)
  - `1` = Sweep (interpolated, existing behavior)
- **Backward compatibility:** events with `sweepMode` absent are treated as
  sweeps (all existing saved pedal events are sweeps). No migration needed.
- New expression pedal events default to Set Value mode with `startValue: 64`.
  The single value is stored in `startValue` (reused; `endValue`,
  `durationBeats`, `easingType` are simply ignored in Set Value mode).

## UI — EventCommandFields.tsx

When a sweep-capable command (`isSweepCommand`) is selected:

- A two-button segmented toggle at the top of the parameter area:
  **Set Value | Sweep**.
- **Set Value mode:**
  - One slider 0–127, labeled "Value (Heel 0 → Toe 127)", default 64.
  - Quick buttons: `0` and `127`.
  - No duration, easing, or curve preview controls.
- **Sweep mode:** exactly the existing UI (start/end sliders, duration
  presets, easing dropdown, curve preview).
- Auto-label follows mode: `Exp 1: 80` (set value) vs `Exp 1: 0→127` (sweep).
- Switching modes preserves parameter values (nothing is deleted; the other
  mode's fields are just ignored).

## Playback & Export

`expandSweepToMessages` in `src/engine/sweep.ts` (used by both live playback
in `useMidiPlayback.ts` and MIDI export in `midi-file-io.ts`):

- If the event is in Set Value mode (`sweepMode === 0`), return a single CC
  message at the event's tick with value `startValue`, clamped 0–127.
- `getSweepDurationBeats` returns `0` for Set Value events so the timeline
  block renders at normal (non-stretched) width.
- A helper `isSetValueMode(event)` in `sweep.ts` centralizes the check:
  `event.parameters?.sweepMode === 0`.

## Timeline

Set Value events render as a normal-width event block, like any other CC
event (follows automatically from `getSweepDurationBeats` returning 0).

## Testing

The project has no test framework; verification is manual via the browser
preview:

- Toggle appears for expression pedal commands and defaults correctly
  (Set Value for new events, Sweep for existing saved events).
- Single slider works; auto-label updates (`Exp 1: 80` style).
- Timeline block renders at normal width in Set Value mode.
- Exported MIDI (Format 0) contains exactly one CC for a Set Value event
  and a full interpolated series for a Sweep event.

## Out of Scope

- Darkglass CC commands (already single-value, not sweep commands).
- New sweep shapes or multi-point automation curves.
- Changing the sweep UI itself.
