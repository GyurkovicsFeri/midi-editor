import { create } from 'zustand'
import { initMidiAccess, getOutputPorts, sendMessages, type MidiPortInfo } from '../engine/midi-output'
import { resolveEventToRawMidi, getProfile } from '../engine/device-protocol'
import { useProjectStore } from './project-store'
import type { MidiEvent } from '../types/midi'

interface MidiOutputState {
  midiAccess: MIDIAccess | null
  availablePorts: Array<{ id: string; name: string }>
  devicePortMap: Record<string, string>
  clockPortIds: Set<string>
  connectionStatus: 'disconnected' | 'connected' | 'error'
  errorMessage: string | null

  initialize: () => Promise<void>
  refreshPorts: () => void
  setDevicePort: (deviceId: string, portId: string) => void
  clearDevicePort: (deviceId: string) => void
  getPortForDevice: (deviceId: string) => MIDIOutput | null
  sendNow: (deviceId: string, event: MidiEvent) => void
  toggleClockForPort: (portId: string) => void
  getClockPorts: () => MIDIOutput[]
}

const STORAGE_KEY = 'midi-output-device-port-map'
const CLOCK_STORAGE_KEY = 'midi-output-clock-ports'

function loadDevicePortMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveDevicePortMap(map: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function loadClockPortIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CLOCK_STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveClockPortIds(ids: Set<string>) {
  localStorage.setItem(CLOCK_STORAGE_KEY, JSON.stringify([...ids]))
}

export const useMidiOutputStore = create<MidiOutputState>((set, get) => ({
  midiAccess: null,
  availablePorts: [],
  devicePortMap: loadDevicePortMap(),
  clockPortIds: loadClockPortIds(),
  connectionStatus: 'disconnected',
  errorMessage: null,

  initialize: async () => {
    try {
      const access = await initMidiAccess()
      const ports = getOutputPorts(access)
      set({
        midiAccess: access,
        availablePorts: ports.map((p) => ({ id: p.id, name: p.name })),
        connectionStatus: 'connected',
        errorMessage: null
      })
      access.onstatechange = () => get().refreshPorts()
    } catch (e) {
      set({
        connectionStatus: 'error',
        errorMessage: e instanceof Error ? e.message : 'Failed to initialize MIDI'
      })
    }
  },

  refreshPorts: () => {
    const { midiAccess } = get()
    if (!midiAccess) return
    const ports = getOutputPorts(midiAccess)
    set({ availablePorts: ports.map((p) => ({ id: p.id, name: p.name })) })
  },

  setDevicePort: (deviceId, portId) => {
    const map = { ...get().devicePortMap, [deviceId]: portId }
    set({ devicePortMap: map })
    saveDevicePortMap(map)
  },

  clearDevicePort: (deviceId) => {
    const map = { ...get().devicePortMap }
    delete map[deviceId]
    set({ devicePortMap: map })
    saveDevicePortMap(map)
  },

  getPortForDevice: (deviceId) => {
    const { midiAccess, devicePortMap } = get()
    if (!midiAccess) return null
    const portId = devicePortMap[deviceId]
    if (!portId) return null
    const port = midiAccess.outputs.get(portId)
    return port && port.state !== 'disconnected' ? port : null
  },

  toggleClockForPort: (portId) => {
    const ids = new Set(get().clockPortIds)
    if (ids.has(portId)) {
      ids.delete(portId)
    } else {
      ids.add(portId)
    }
    set({ clockPortIds: ids })
    saveClockPortIds(ids)
  },

  getClockPorts: () => {
    const { midiAccess, clockPortIds } = get()
    if (!midiAccess) return []
    const ports: MIDIOutput[] = []
    for (const portId of clockPortIds) {
      const port = midiAccess.outputs.get(portId)
      if (port && port.state !== 'disconnected') ports.push(port)
    }
    return ports
  },

  sendNow: (deviceId, event) => {
    const port = get().getPortForDevice(deviceId)
    if (!port) return
    const devices = useProjectStore.getState().setlistDevices()
    const device = devices.find((d) => d.id === deviceId)
    if (!device) return
    const profile = getProfile(device.profileId, useProjectStore.getState().project.customProfiles)
    if (!profile) return
    const messages = resolveEventToRawMidi(event, device, profile)
    sendMessages(port, messages)
  }
}))
