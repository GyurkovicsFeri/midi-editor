export interface MusicalPosition {
  bar: number
  beat: number
  tick: number
}

export interface RawMidiMessage {
  type: 'cc' | 'pc'
  controller?: number
  value?: number
  program?: number
  valueParam?: string
  valueOffset?: number
}

export type MidiEventType =
  | 'device-command'
  | 'cc'
  | 'pc'

export interface MidiEvent {
  id: string
  type: MidiEventType
  deviceId: string
  position: MusicalPosition
  label: string
  color?: string

  // For device-command type: references a command from the device profile
  commandId?: string
  parameters?: Record<string, number>

  // For raw cc/pc types
  channel?: number
  cc?: { controller: number; value: number }
  pc?: { program: number }
}

export const TICKS_PER_BEAT = 480
