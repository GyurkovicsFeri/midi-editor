export interface MidiPortInfo {
  id: string
  name: string
  port: MIDIOutput
}

export async function initMidiAccess(): Promise<MIDIAccess> {
  if (!navigator.requestMIDIAccess) {
    throw new Error('Web MIDI API not supported in this browser')
  }
  return navigator.requestMIDIAccess({ sysex: false })
}

export function getOutputPorts(access: MIDIAccess): MidiPortInfo[] {
  const ports: MidiPortInfo[] = []
  access.outputs.forEach((port) => {
    ports.push({ id: port.id, name: port.name ?? `Port ${port.id}`, port })
  })
  return ports
}

export function sendMessages(
  port: MIDIOutput,
  messages: Array<{ type: 'cc' | 'pc'; channel: number; data: number[] }>
): void {
  if (port.state === 'disconnected') return
  for (const msg of messages) {
    const ch = msg.channel - 1
    if (msg.type === 'cc') {
      port.send([0xb0 | ch, msg.data[0], msg.data[1]])
    } else {
      port.send([0xc0 | ch, msg.data[0]])
    }
  }
}

export function sendAllNotesOff(port: MIDIOutput, channel: number): void {
  if (port.state === 'disconnected') return
  const ch = channel - 1
  port.send([0xb0 | ch, 123, 0])
}

export function sendClockStart(port: MIDIOutput): void {
  if (port.state === 'disconnected') return
  port.send([0xfa])
}

export function sendClockContinue(port: MIDIOutput): void {
  if (port.state === 'disconnected') return
  port.send([0xfb])
}

export function sendClockStop(port: MIDIOutput): void {
  if (port.state === 'disconnected') return
  port.send([0xfc])
}

export function sendClockPulse(port: MIDIOutput, timestamp?: number): void {
  if (port.state === 'disconnected') return
  if (timestamp !== undefined) {
    port.send([0xf8], timestamp)
  } else {
    port.send([0xf8])
  }
}
