import type { MidiEvent } from './midi'
import type { MidiDevice, DeviceProfile } from './device'

export interface Section {
  id: string
  name: string
  startBar: number
  endBar: number
  color: string
}

export interface AudioTrack {
  id: string
  name: string
  filePath?: string
  fileData?: ArrayBuffer
  fileName?: string
  offsetMs: number
  volume: number
  muted: boolean
  color: string
  embedded: boolean
}

export interface Song {
  id: string
  name: string
  bpm: number
  timeSignature: [number, number]
  totalBars: number
  audioTracks: AudioTrack[]
  liveOffset: { bars: number; beats: number }
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
