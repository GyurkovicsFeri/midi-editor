import type { MidiEvent } from '../types/midi'
import { TICKS_PER_BEAT } from '../types/midi'
import type { DeviceProfile, MidiDevice } from '../types/device'
import { positionToTotalTicks } from './clock'

const STEPS_PER_BEAT = 24
const SCALE_FACTOR = 128 / TICKS_PER_BEAT

const SWEEP_COMMAND_IDS = new Set([
  'qc-exp-pedal-1', 'qc-exp-pedal-2',
  'helix-lt-exp-1', 'helix-lt-exp-2'
])

export const EASING_LABELS = ['Linear', 'Ease In', 'Ease Out', 'Ease In-Out']

export function isSweepCommand(commandId: string): boolean {
  return SWEEP_COMMAND_IDS.has(commandId)
}

export function getSweepDurationBeats(event: MidiEvent): number {
  return event.parameters?.durationBeats ?? 0
}

export function applyEasing(t: number, easingType: number): number {
  const clamped = Math.max(0, Math.min(1, t))
  switch (easingType) {
    case 1: return clamped * clamped
    case 2: return clamped * (2 - clamped)
    case 3: return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped
    default: return clamped
  }
}

export function expandSweepToMessages(
  event: MidiEvent,
  device: MidiDevice,
  profile: DeviceProfile,
  beatsPerBar: number
): Array<{ scaledTick: number; msg: { type: 'cc'; channel: number; data: number[] } }> {
  const params = event.parameters
  if (!params || !event.commandId) return []

  const command = profile.commands.find((c) => c.id === event.commandId)
  if (!command || command.messages.length === 0) return []

  const controller = command.messages[0].controller
  if (controller === undefined) return []

  const startValue = params.startValue ?? 0
  const endValue = params.endValue ?? 127
  const durationBeats = params.durationBeats ?? 4
  const easingType = params.easingType ?? 0

  const startTick = positionToTotalTicks(event.position, beatsPerBar)
  const totalDurationTicks = durationBeats * TICKS_PER_BEAT
  const totalSteps = durationBeats * STEPS_PER_BEAT
  const ticksPerStep = TICKS_PER_BEAT / STEPS_PER_BEAT

  const result: Array<{ scaledTick: number; msg: { type: 'cc'; channel: number; data: number[] } }> = []
  let lastValue = -1

  for (let step = 0; step <= totalSteps; step++) {
    const t = totalSteps === 0 ? 1 : step / totalSteps
    const eased = applyEasing(t, easingType)
    const value = Math.round(startValue + (endValue - startValue) * eased)

    if (value === lastValue) continue
    lastValue = value

    const tick = startTick + step * ticksPerStep
    result.push({
      scaledTick: Math.round(tick * SCALE_FACTOR),
      msg: {
        type: 'cc',
        channel: device.midiChannel,
        data: [controller, Math.max(0, Math.min(127, value))]
      }
    })
  }

  return result
}
