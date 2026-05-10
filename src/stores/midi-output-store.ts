import { create } from 'zustand'
import { initMidiAccess, getOutputPorts, sendMessages, type MidiPortInfo } from '../engine/midi-output'
import { resolveEventToRawMidi, getProfile } from '../engine/device-protocol'
import { useProjectStore } from './project-store'
import type { MidiEvent } from '../types/midi'

interface MidiOutputState {
  midiAccess: MIDIAccess | null
  availablePorts: Array<{ id: string; name: string }>
  devicePortMap: Record<string, string>
  connectionStatus: 'disconnected' | 'connected' | 'error'
  errorMessage: string | null

  initialize: () => Promise<void>
  refreshPorts: () => void
  setDevicePort: (deviceId: string, portId: string) => void
  clearDevicePort: (deviceId: string) => void
  getPortForDevice: (deviceId: string) => MIDIOutput | null
  sendNow: (deviceId: string, event: MidiEvent) => void
}

const STORAGE_KEY = 'midi-output-device-port-map'

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

export const useMidiOutputStore = create<MidiOutputState>((set, get) => ({
  midiAccess: null,
  availablePorts: [],
  devicePortMap: loadDevicePortMap(),
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
