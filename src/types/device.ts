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
