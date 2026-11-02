import type { MidiEvent, RawMidiMessage } from '../types/midi'
import type { DeviceProfile, MidiDevice } from '../types/device'
import { quadCortexProfile } from './profiles/quad-cortex'
import { helixLtProfile } from './profiles/helix-lt'
import { ve500Profile } from './profiles/ve-500'
import { genericProfile } from './profiles/generic'
import { darkglassAlphaOmegaPhotonProfile } from './profiles/darkglass-alpha-omega-photon'

const builtInProfiles: DeviceProfile[] = [quadCortexProfile, helixLtProfile, ve500Profile, darkglassAlphaOmegaPhotonProfile, genericProfile]

export function getBuiltInProfiles(): DeviceProfile[] {
  return builtInProfiles
}

export function getProfile(
  profileId: string,
  customProfiles: DeviceProfile[] = []
): DeviceProfile | undefined {
  return [...builtInProfiles, ...customProfiles].find((p) => p.id === profileId)
}

// Built-in tuner commands, silenced when a device has `disableTuner` set.
export const TUNER_COMMAND_IDS = new Set(['qc-tuner-on', 'qc-tuner-off', 'helix-lt-tuner', 'dg-tuner'])

export function isTunerCommand(commandId: string | undefined): boolean {
  return commandId !== undefined && TUNER_COMMAND_IDS.has(commandId)
}

export function profileHasTuner(profile: DeviceProfile | undefined): boolean {
  return !!profile?.commands.some((c) => TUNER_COMMAND_IDS.has(c.id))
}

// Built-in tap tempo commands, silenced when a device has `disableTapTempo` set.
export const TAP_TEMPO_COMMAND_IDS = new Set(['qc-tap-tempo', 'helix-lt-tap-tempo'])
// Profiles that get embedded tap-tempo taps in Format 0 / ZIP exports (see midi-file-io.ts).
export const EMBEDDED_TAP_PROFILE_IDS = new Set(['quad-cortex', 've-500'])

export function isTapTempoCommand(commandId: string | undefined): boolean {
  return commandId !== undefined && TAP_TEMPO_COMMAND_IDS.has(commandId)
}

export function profileHasTapTempo(profile: DeviceProfile | undefined): boolean {
  if (!profile) return false
  return EMBEDDED_TAP_PROFILE_IDS.has(profile.id) || profile.commands.some((c) => TAP_TEMPO_COMMAND_IDS.has(c.id))
}

/** Why an event won't be sent on this device, or null if it will be sent. */
export function eventDisabledReason(event: MidiEvent, device: MidiDevice): string | null {
  if (device.disableTuner && isTunerCommand(event.commandId)) return 'tuner commands disabled for this device'
  if (device.disableTapTempo && isTapTempoCommand(event.commandId)) return 'tap tempo disabled for this device'
  return null
}

/** False when the event must not be sent (export or live), e.g. a tuner command on a tuner-disabled device. */
export function isEventEnabled(event: MidiEvent, device: MidiDevice): boolean {
  return eventDisabledReason(event, device) === null
}

export function resolveEventToRawMidi(
  event: MidiEvent,
  device: MidiDevice,
  profile: DeviceProfile
): Array<{ type: 'cc' | 'pc'; channel: number; data: number[] }> {
  if (event.type === 'cc' && event.cc) {
    return [
      {
        type: 'cc',
        channel: event.channel ?? device.midiChannel,
        data: [event.cc.controller, event.cc.value]
      }
    ]
  }

  if (event.type === 'pc' && event.pc) {
    return [
      {
        type: 'pc',
        channel: event.channel ?? device.midiChannel,
        data: [event.pc.program]
      }
    ]
  }

  if (event.type === 'device-command' && event.commandId) {
    const command = profile.commands.find((c) => c.id === event.commandId)
    if (!command) return []

    return command.messages.map((msg: RawMidiMessage) => {
      if (msg.type === 'cc') {
        const controller = msg.controller ?? event.parameters?.['controller'] ?? 0
        let value: number
        if (msg.value !== undefined) {
          value = msg.value
        } else if (msg.valueParam !== undefined && event.parameters?.[msg.valueParam] !== undefined) {
          value = (event.parameters[msg.valueParam] as number) + (msg.valueOffset ?? 0)
        } else {
          value = event.parameters?.['value'] ?? 0
        }
        return {
          type: 'cc' as const,
          channel: device.midiChannel,
          data: [controller, value]
        }
      } else {
        const program =
          event.parameters?.['scene'] != null
            ? event.parameters['scene'] - 1
            : event.parameters?.['preset'] ??
              event.parameters?.['program'] ??
              msg.program ??
              0
        return {
          type: 'pc' as const,
          channel: device.midiChannel,
          data: [program]
        }
      }
    })
  }

  return []
}
