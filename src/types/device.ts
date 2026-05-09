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
}

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
}
