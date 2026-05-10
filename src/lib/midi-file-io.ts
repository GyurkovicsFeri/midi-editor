import MidiWriter from 'midi-writer-js'
import JSZip from 'jszip'
import type { Song } from '../types/project'
import type { DeviceProfile, MidiDevice } from '../types/device'
import { getProfile, resolveEventToRawMidi } from '../engine/device-protocol'
import { positionToTotalTicks } from '../engine/clock'
import { TICKS_PER_BEAT } from '../types/midi'
import { isSweepCommand, expandSweepToMessages } from '../engine/sweep'

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

    tickedMessages.sort((a, b) => a.scaledTick - b.scaledTick)

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

export function exportSongToMidiFormat0(
  song: Song,
  devices: MidiDevice[],
  customProfiles: DeviceProfile[] = []
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

    for (const event of deviceEvents) {
      if (event.commandId && isSweepCommand(event.commandId)) {
        allMessages.push(...expandSweepToMessages(event, device, profile, beatsPerBar))
      } else {
        const scaledTick = Math.round(
          positionToTotalTicks(event.position, beatsPerBar) * scaleFactor
        )
        const rawMessages = resolveEventToRawMidi(event, device, profile)
        for (const msg of rawMessages) {
          allMessages.push({ scaledTick, msg })
        }
      }
    }
  }

  // Stable sort by tick — groups from the same event stay adjacent
  allMessages.sort((a, b) => a.scaledTick - b.scaledTick)

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
  setlistName: string
): Promise<void> {
  const zip = new JSZip()

  for (const song of songs) {
    const dataUri = exportSongToMidiFormat0(song, devices, customProfiles)
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
