import type { MidiEvent, RawMidiMessage } from '../types/midi'
import type { DeviceProfile, MidiDevice } from '../types/device'
import { quadCortexProfile } from './profiles/quad-cortex'
import { genericProfile } from './profiles/generic'
import { darkglassAlphaOmegaPhotonProfile } from './profiles/darkglass-alpha-omega-photon'

const builtInProfiles: DeviceProfile[] = [quadCortexProfile, darkglassAlphaOmegaPhotonProfile, genericProfile]

export function getBuiltInProfiles(): DeviceProfile[] {
  return builtInProfiles
}

export function getProfile(
  profileId: string,
  customProfiles: DeviceProfile[] = []
): DeviceProfile | undefined {
  return [...builtInProfiles, ...customProfiles].find((p) => p.id === profileId)
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
