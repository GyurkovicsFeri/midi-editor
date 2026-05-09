import MidiWriter from 'midi-writer-js'
import type { Song } from '../types/project'
import type { DeviceProfile } from '../types/device'
import { getProfile, resolveEventToRawMidi } from '../engine/device-protocol'
import { positionToTotalTicks } from '../engine/clock'
import { TICKS_PER_BEAT } from '../types/midi'

export function exportSongToMidi(song: Song, customProfiles: DeviceProfile[] = []): string {
  const tracks: MidiWriter.Track[] = []
  const beatsPerBar = song.timeSignature[0]

  // midi-writer-js uses 128 ticks per beat internally
  const scaleFactor = 128 / TICKS_PER_BEAT

  for (const device of song.devices) {
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

    let lastScaledTick = 0

    for (const event of deviceEvents) {
      const eventTick = positionToTotalTicks(event.position, beatsPerBar)
      const rawMessages = resolveEventToRawMidi(event, device, profile)

      const scaledTick = Math.round(eventTick * scaleFactor)
      const delta = scaledTick - lastScaledTick

      let isFirst = true
      for (const msg of rawMessages) {
        // Only the first message in a group gets the delta; subsequent messages
        // in the same group (e.g. CC+PC for scene change) fire at the same tick.
        const msgDelta = isFirst ? delta : 0

        if (msg.type === 'cc') {
          // ControllerChangeEvent expects 1-based channel (subtracts 1 internally)
          const ccEvent = new MidiWriter.ControllerChangeEvent({
            controllerNumber: msg.data[0],
            controllerValue: msg.data[1],
            channel: msg.channel as MidiWriter.Channel,
            delta: msgDelta
          })
          track.addEvent(ccEvent)
        } else if (msg.type === 'pc') {
          // ProgramChangeEvent expects 0-based channel (uses value as-is)
          const pcEvent = new MidiWriter.ProgramChangeEvent({
            instrument: msg.data[0],
            channel: (msg.channel - 1) as MidiWriter.Channel,
            delta: msgDelta
          })
          track.addEvent(pcEvent)
        }
        isFirst = false
      }

      lastScaledTick = scaledTick
    }

    tracks.push(track)
  }

  const writer = new MidiWriter.Writer(tracks)
  return writer.dataUri()
}

export function downloadMidiFile(dataUri: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUri
  a.download = filename
  a.click()
}
