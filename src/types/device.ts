import type { RawMidiMessage } from './midi'

export interface CommandParameter {
  name: string
  label: string
  min: number
  max: number
  defaultValue: number
}

export interface DeviceCommand {
  id: string
  name: string
  description: string
  messages: RawMidiMessage[]
  parameters?: CommandParameter[]
}

export interface DeviceProfile {
  id: string
  name: string
  builtIn: boolean
  commands: DeviceCommand[]
  supportsScenes: boolean
  maxScenes?: number
  maxPresets?: number
}

export interface Scene {
  id: string
  name: string
  sceneNumber: number
  color?: string
}

export const DEFAULT_SCENE_COLORS = [
  '#3b82f6', // A — blue
  '#22c55e', // B — green
  '#f59e0b', // C — amber
  '#ef4444', // D — red
  '#a855f7', // E — purple
  '#06b6d4', // F — cyan
  '#f97316', // G — orange
  '#ec4899', // H — pink
]

export interface Preset {
  id: string
  name: string
  programNumber: number
  bank: number        // CC#0 value (0 = presets 0-127, 1 = presets 128-255)
  setlistIndex: number // CC#32 value (0 = Factory, 1 = My Presets, 2-12 = User)
  scenes: Scene[]
}

export interface MidiDevice {
  id: string
  name: string
  profileId: string
  midiChannel: number
  color: string
  presets: Preset[]
  assignNames?: string[]  // VE-500: nicknames for Assign 1–8 (CC#1–8)
}

export function resolveEventColor(
  commandId: string,
  device: MidiDevice,
  sceneNumber?: number
): string {
  if (commandId === 'qc-scene' || commandId === 'helix-lt-snapshot') {
    const sceneNum = sceneNumber ?? 1
    const scene = device.presets.flatMap((p) => p.scenes).find((s) => s.sceneNumber === sceneNum)
    return scene?.color ?? DEFAULT_SCENE_COLORS[sceneNum - 1]
  }
  return device.color
}
