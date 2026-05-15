import { create } from 'zustand'

interface TransportState {
  isPlaying: boolean
  currentTimeSeconds: number
  loopEnabled: boolean
  loopStartBar: number
  loopEndBar: number
  metronomeEnabled: boolean
  metronomeVolume: number

  play: () => void
  stop: () => void
  setCurrentTime: (seconds: number) => void
  toggleLoop: () => void
  setLoopRange: (startBar: number, endBar: number) => void
  toggleMetronome: () => void
  setMetronomeVolume: (v: number) => void
}

export const useTransportStore = create<TransportState>((set) => ({
  isPlaying: false,
  currentTimeSeconds: 0,
  loopEnabled: false,
  loopStartBar: 1,
  loopEndBar: 8,
  metronomeEnabled: false,
  metronomeVolume: 0.5,

  play: () => set({ isPlaying: true }),
  stop: () => set({ isPlaying: false }),
  setCurrentTime: (seconds) => set({ currentTimeSeconds: seconds }),
  toggleLoop: () => set((state) => ({ loopEnabled: !state.loopEnabled })),
  setLoopRange: (startBar, endBar) => set({ loopStartBar: startBar, loopEndBar: endBar }),
  toggleMetronome: () => set((state) => ({ metronomeEnabled: !state.metronomeEnabled })),
  setMetronomeVolume: (v) => set({ metronomeVolume: Math.max(0, Math.min(1, v)) })
}))
