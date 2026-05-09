import type { MidiEvent } from './midi'
import type { MidiDevice, DeviceProfile } from './device'

export interface Section {
  id: string
  name: string
  startBar: number
  endBar: number
  color: string
}

export interface Song {
  id: string
  name: string
  bpm: number
  timeSignature: [number, number]
  totalBars: number
  audioFilePath?: string
  audioFileData?: ArrayBuffer  // raw audio binary held in memory (persisted in .midiproj ZIP)
  audioFileName?: string       // original filename for display
  audioOffsetMs: number
  sections: Section[]
  events: MidiEvent[]
}

export interface Setlist {
  id: string
  name: string
  songIds: string[]
  devices: MidiDevice[]
}

export interface Project {
  songs: Song[]
  setlist: Setlist
  customProfiles: DeviceProfile[]
  activeSongId: string
}
