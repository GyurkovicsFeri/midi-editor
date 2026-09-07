import MidiWriter from 'midi-writer-js'
import JSZip from 'jszip'
import type { Song } from '../types/project'
import type { DeviceProfile, MidiDevice } from '../types/device'
import { getProfile, resolveEventToRawMidi } from '../engine/device-protocol'
import { positionToTotalTicks } from '../engine/clock'
import { TICKS_PER_BEAT } from '../types/midi'
import { isSweepCommand, expandSweepToMessages } from '../engine/sweep'

// Latency compensation: shift a device's messages earlier by its latencyCompensationMs,
// converted to midi-writer ticks (128 PPQ) at the song's tempo. Clamped so nothing goes below tick 0.
function latencyOffsetScaledTicks(device: MidiDevice, bpm: number): number {
  const ms = device.latencyCompensationMs ?? 0
  return Math.max(0, Math.round((ms / 1000) * (bpm / 60) * 128))
}

export function exportSongToMidi(
  song: Song,
  devices: MidiDevice[],
  customProfiles: DeviceProfile[] = []
): string {
  const tracks: MidiWriter.Track[] = []
  const beatsPerBar = song.timeSignature[0]

  // midi-writer-js uses 128 ticks per beat internally
  const scaleFactor = 128 / TICKS_PER_BEAT

  for (const device of devices) {
    const profile = getProfile(device.profileId, customProfiles)
    if (!profile) continue

    const track = new MidiWriter.Track()
    track.setTempo(song.bpm)
    track.addTrackName(device.name)
    track.setTimeSignature(song.timeSignature[0], song.timeSignature[1])

    const deviceEvents = song.events
      .filter((e) => e.deviceId === device.id)
      .sort((a, b) => {
        return (
          positionToTotalTicks(a.position, beatsPerBar) -
          positionToTotalTicks(b.position, beatsPerBar)
        )
      })

    interface TickedMsg {
      scaledTick: number
      msg: { type: 'cc' | 'pc'; channel: number; data: number[] }
    }

    const tickedMessages: TickedMsg[] = []

    for (const event of deviceEvents) {
      if (event.commandId && isSweepCommand(event.commandId)) {
        tickedMessages.push(...expandSweepToMessages(event, device, profile, beatsPerBar))
      } else {
        const eventTick = positionToTotalTicks(event.position, beatsPerBar)
        const scaledTick = Math.round(eventTick * scaleFactor)
        const rawMessages = resolveEventToRawMidi(event, device, profile)
        for (const msg of rawMessages) {
          tickedMessages.push({ scaledTick, msg })
        }
      }
    }

    const latencyOffset = latencyOffsetScaledTicks(device, song.bpm)
    if (latencyOffset > 0) {
      for (const msg of tickedMessages) {
        msg.scaledTick = Math.max(0, msg.scaledTick - latencyOffset)
      }
    }

    tickedMessages.sort((a, b) => a.scaledTick - b.scaledTick)

    const liveOffsetTicks = ((song.liveOffset?.bars ?? 0) * beatsPerBar + (song.liveOffset?.beats ?? 0)) * 128
    if (liveOffsetTicks > 0) {
      for (const msg of tickedMessages) {
        msg.scaledTick += liveOffsetTicks
      }
    }

    let lastScaledTick = 0
    for (const { scaledTick, msg } of tickedMessages) {
      const delta = scaledTick - lastScaledTick
      lastScaledTick = scaledTick

      if (msg.type === 'cc') {
        track.addEvent(
          new MidiWriter.ControllerChangeEvent({
            controllerNumber: msg.data[0],
            controllerValue: msg.data[1],
            channel: msg.channel as MidiWriter.Channel,
            delta
          })
        )
      } else if (msg.type === 'pc') {
        track.addEvent(
          new MidiWriter.ProgramChangeEvent({
            instrument: msg.data[0],
            channel: (msg.channel - 1) as MidiWriter.Channel,
            delta
          })
        )
      }
    }

    tracks.push(track)
  }

  const writer = new MidiWriter.Writer(tracks)
  return writer.dataUri()
}

// Tap-tempo baking: taps spaced exactly one beat apart set a device's BPM from
// the file without MIDI clock (the B.Beat's clock generator is unreliable, and
// files with embedded 0xF8 clock bytes crash it outright).
// - QC: CC#44, any value = one tap. BPM comes from the LAST TWO taps only
//   (no averaging), so every interval must be exact.
// - VE-500: no fixed tap CC; the singer must set an ASSIGN with SOURCE=CC#80,
//   TARGET=MASTER:TAP. Boss momentary sources tap on press, so each tap is a
//   127 (press) + 0 (release, a quarter-beat later) pair — consecutive 127s
//   without a release may register as a single press.
// Taps are NOT latency-compensated: shifting the first tap (clamped at tick 0)
// would distort the tap interval and set a wrong tempo.
const QC_TAP_CC = 44
const VE500_TAP_CC = 80 // free on the VE-500 profile (assigns use CC#1–8, exp CC#11)
const TAP_COUNT = 4
// Taps sit half a beat past the beat (plus 2 ticks to stay mid-cell of any
// coarse internal grid): the B.Beat flushes MIDI output in bursts, so taps
// sharing an instant with the beat-aligned song-start messages arrive bunched
// and the QC (which derives BPM from the last two taps only) reads a random,
// too-high tempo (observed: 165 BPM read as 172–204). A bare tap-only file
// timed accurately (±1 BPM), so keeping taps ~half a beat clear of other
// events' bursts is what makes them reliable.
const TAP_OFFSET_TICKS = 66
const TAP_RELEASE_TICKS = 32 // quarter beat between VE-500 press and release

function tapTempoMessages(
  devices: MidiDevice[]
): Array<{ scaledTick: number; msg: { type: 'cc'; channel: number; data: number[] } }> {
  const taps: Array<{ scaledTick: number; msg: { type: 'cc'; channel: number; data: number[] } }> = []
  for (const device of devices) {
    for (let i = 0; i < TAP_COUNT; i++) {
      const tapTick = i * 128 + TAP_OFFSET_TICKS // one beat apart at midi-writer's 128 PPQ
      if (device.profileId === 'quad-cortex') {
        taps.push({
          scaledTick: tapTick,
          msg: { type: 'cc', channel: device.midiChannel, data: [QC_TAP_CC, 127] }
        })
      } else if (device.profileId === 've-500') {
        taps.push({
          scaledTick: tapTick,
          msg: { type: 'cc', channel: device.midiChannel, data: [VE500_TAP_CC, 127] }
        })
        taps.push({
          scaledTick: tapTick + TAP_RELEASE_TICKS,
          msg: { type: 'cc', channel: device.midiChannel, data: [VE500_TAP_CC, 0] }
        })
      }
    }
  }
  return taps
}

export interface ExportOptions {
  embedTapTempo?: boolean
}

export function exportSongToMidiFormat0(
  song: Song,
  devices: MidiDevice[],
  customProfiles: DeviceProfile[] = [],
  options: ExportOptions = {}
): string {
  const beatsPerBar = song.timeSignature[0]
  const scaleFactor = 128 / TICKS_PER_BEAT

  interface TickedMsg {
    scaledTick: number
    msg: { type: 'cc' | 'pc'; channel: number; data: number[] }
  }

  const allMessages: TickedMsg[] = []

  for (const device of devices) {
    const profile = getProfile(device.profileId, customProfiles)
    if (!profile) continue

    const deviceEvents = song.events
      .filter((e) => e.deviceId === device.id)
      .sort((a, b) =>
        positionToTotalTicks(a.position, beatsPerBar) -
        positionToTotalTicks(b.position, beatsPerBar)
      )

    const deviceMessages: TickedMsg[] = []

    for (const event of deviceEvents) {
      if (event.commandId && isSweepCommand(event.commandId)) {
        deviceMessages.push(...expandSweepToMessages(event, device, profile, beatsPerBar))
      } else {
        const scaledTick = Math.round(
          positionToTotalTicks(event.position, beatsPerBar) * scaleFactor
        )
        const rawMessages = resolveEventToRawMidi(event, device, profile)
        for (const msg of rawMessages) {
          deviceMessages.push({ scaledTick, msg })
        }
      }
    }

    const latencyOffset = latencyOffsetScaledTicks(device, song.bpm)
    if (latencyOffset > 0) {
      for (const msg of deviceMessages) {
        msg.scaledTick = Math.max(0, msg.scaledTick - latencyOffset)
      }
    }

    allMessages.push(...deviceMessages)
  }

  if (options.embedTapTempo) {
    allMessages.push(...tapTempoMessages(devices))
  }

  // Stable sort by tick — groups from the same event stay adjacent
  allMessages.sort((a, b) => a.scaledTick - b.scaledTick)

  const liveOffsetTicks = ((song.liveOffset?.bars ?? 0) * beatsPerBar + (song.liveOffset?.beats ?? 0)) * 128
  if (liveOffsetTicks > 0) {
    for (const msg of allMessages) {
      msg.scaledTick += liveOffsetTicks
    }
  }

  const track = new MidiWriter.Track()
  track.setTempo(song.bpm)
  track.setTimeSignature(song.timeSignature[0], song.timeSignature[1])

  let lastScaledTick = 0
  for (const { scaledTick, msg } of allMessages) {
    const delta = scaledTick - lastScaledTick
    lastScaledTick = scaledTick

    if (msg.type === 'cc') {
      track.addEvent(
        new MidiWriter.ControllerChangeEvent({
          controllerNumber: msg.data[0],
          controllerValue: msg.data[1],
          channel: msg.channel as MidiWriter.Channel,
          delta
        })
      )
    } else if (msg.type === 'pc') {
      track.addEvent(
        new MidiWriter.ProgramChangeEvent({
          instrument: msg.data[0],
          channel: (msg.channel - 1) as MidiWriter.Channel,
          delta
        })
      )
    }
  }

  return new MidiWriter.Writer([track]).dataUri()
}

export async function batchExportToZip(
  songs: Song[],
  devices: MidiDevice[],
  customProfiles: DeviceProfile[],
  setlistName: string,
  options: ExportOptions = {}
): Promise<void> {
  const zip = new JSZip()

  for (const song of songs) {
    const dataUri = exportSongToMidiFormat0(song, devices, customProfiles, options)
    const base64 = dataUri.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const safeName = song.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'song'
    zip.file(`${safeName}.mid`, bytes)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeSetlist = setlistName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'setlist'
  a.download = `${safeSetlist}.zip`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadMidiFile(dataUri: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUri
  a.download = filename
  a.click()
}
