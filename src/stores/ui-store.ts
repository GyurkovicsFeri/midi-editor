import { create } from 'zustand'
import type { SnapMode } from '../types/timeline'

interface UIState {
  zoom: number
  scrollX: number
  scrollY: number
  snapMode: SnapMode
  selectedEventIds: Set<string>
  viewMode: 'timeline' | 'list'
  sidebarOpen: boolean
  songSettingsOpen: boolean
  setlistOpen: boolean
  helpOpen: boolean

  setZoom: (zoom: number) => void
  setScrollX: (x: number) => void
  setScrollY: (y: number) => void
  setSnapMode: (mode: SnapMode) => void
  selectEvent: (id: string, multi?: boolean) => void
  selectAll: (ids: string[]) => void
  deselectAll: () => void
  setViewMode: (mode: 'timeline' | 'list') => void
  toggleSidebar: () => void
  setSongSettingsOpen: (open: boolean) => void
  setSetlistOpen: (open: boolean) => void
  setHelpOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: 'timeline',
  zoom: 1,
  scrollX: 0,
  scrollY: 0,
  snapMode: 'bar',
  selectedEventIds: new Set(),
  sidebarOpen: true,
  songSettingsOpen: false,
  setlistOpen: false,
  helpOpen: false,

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(4, zoom)) }),
  setScrollX: (x) => set({ scrollX: Math.max(0, x) }),
  setScrollY: (y) => set({ scrollY: Math.max(0, y) }),
  setSnapMode: (mode) => set({ snapMode: mode }),

  selectEvent: (id, multi) =>
    set((state) => {
      const next = new Set(multi ? state.selectedEventIds : [])
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { selectedEventIds: next }
    }),

  selectAll: (ids) => set({ selectedEventIds: new Set(ids) }),
  deselectAll: () => set({ selectedEventIds: new Set() }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSongSettingsOpen: (open) => set({ songSettingsOpen: open }),
  setSetlistOpen: (open) => set({ setlistOpen: open }),
  setHelpOpen: (open) => set({ helpOpen: open })
}))
