import { create } from 'zustand'
import { produce, enablePatches, type Patch } from 'immer'
import { v4 as uuid } from 'uuid'
import type { Song, Section, Project } from '../types/project'
import type { MidiEvent, MusicalPosition } from '../types/midi'
import type { MidiDevice, DeviceProfile } from '../types/device'

enablePatches()

const DEVICE_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899']

function createDefaultSong(): Song {
  return {
    id: uuid(),
    name: 'Untitled Song',
    bpm: 120,
    timeSignature: [4, 4],
    totalBars: 32,
    audioOffsetMs: 0,
    sections: [],
    events: []
  }
}

interface UndoEntry {
  patches: Patch[]
  inversePatches: Patch[]
}

interface ProjectState {
  project: Project
  isDirty: boolean
  undoStack: UndoEntry[]
  redoStack: UndoEntry[]
  clipboard: MidiEvent[]

  activeSong: () => Song
  setlistDevices: () => MidiDevice[]
  setSongProperty: <K extends keyof Song>(key: K, value: Song[K]) => void

  addDevice: (profileId: string, name: string, midiChannel: number) => void
  updateDevice: (deviceId: string, changes: Partial<MidiDevice>) => void
  removeDevice: (deviceId: string) => void

  addEvent: (event: Omit<MidiEvent, 'id'>) => string
  updateEvent: (eventId: string, changes: Partial<MidiEvent>) => void
  moveEvent: (eventId: string, newPosition: MusicalPosition) => void
  moveEvents: (moves: Array<{ eventId: string; newPosition: MusicalPosition }>) => void
  deleteEvent: (eventId: string) => void
  deleteEvents: (eventIds: string[]) => void

  copyEvents: (eventIds: string[]) => void
  pasteEvents: (atBar: number) => void

  addSection: (section: Omit<Section, 'id'>) => void
  updateSection: (sectionId: string, changes: Partial<Section>) => void
  deleteSection: (sectionId: string) => void

  addSong: () => string
  duplicateSong: (songId: string) => string
  deleteSong: (songId: string) => void
  renameSong: (songId: string, name: string) => void
  setActiveSong: (songId: string) => void
  reorderSongs: (fromIdx: number, toIdx: number) => void

  undo: () => void
  redo: () => void
  markClean: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => {
  function mutate(fn: (project: Project) => void): void {
    const state = get()
    let patches: Patch[] = []
    let inversePatches: Patch[] = []

    const nextProject = produce(
      state.project,
      (draft) => fn(draft),
      (p, ip) => {
        patches = p
        inversePatches = ip
      }
    )

    set({
      project: nextProject,
      isDirty: true,
      undoStack: [...state.undoStack, { patches, inversePatches }],
      redoStack: []
    })
  }

  const defaultSong = createDefaultSong()

  return {
    project: {
      songs: [defaultSong],
      setlist: { id: uuid(), name: 'Setlist', songIds: [defaultSong.id], devices: [] },
      customProfiles: [],
      activeSongId: defaultSong.id
    },
    isDirty: false,
    undoStack: [],
    redoStack: [],
    clipboard: [],

    activeSong: () => {
      const { project } = get()
      return project.songs.find((s) => s.id === project.activeSongId) ?? project.songs[0]
    },

    setlistDevices: () => get().project.setlist.devices,

    setSongProperty: (key, value) => {
      mutate((project) => {
        const song = project.songs.find((s) => s.id === project.activeSongId)
        if (song) (song[key] as typeof value) = value
      })
    },

    addDevice: (profileId, name, midiChannel) => {
      mutate((project) => {
        const colorIndex = project.setlist.devices.length % DEVICE_COLORS.length
        project.setlist.devices.push({
          id: uuid(),
          name,
          profileId,
          midiChannel,
          color: DEVICE_COLORS[colorIndex],
          presets: []
        })
      })
    },

    updateDevice: (deviceId, changes) => {
      mutate((project) => {
        const device = project.setlist.devices.find((d) => d.id === deviceId)
        if (device) Object.assign(device, changes)
      })
    },

    removeDevice: (deviceId) => {
      mutate((project) => {
        project.setlist.devices = project.setlist.devices.filter((d) => d.id !== deviceId)
        // Cascade: remove events referencing this device across all songs
        for (const song of project.songs) {
          song.events = song.events.filter((e) => e.deviceId !== deviceId)
        }
      })
    },

    addEvent: (eventData) => {
      const id = uuid()
      mutate((project) => {
        const song = project.songs.find((s) => s.id === project.activeSongId)
        if (song) song.events.push({ ...eventData, id })
      })
      return id
    },

    updateEvent: (eventId, changes) => {
      mutate((project) => {
        const song = project.songs.find((s) => s.id === project.activeSongId)
        if (!song) return
        const event = song.events.find((e) => e.id === eventId)
        if (event) Object.assign(event, changes)
      })
    },

    moveEvent: (eventId, newPosition) => {
      mutate((project) => {
        const song = project.songs.find((s) => s.id === project.activeSongId)
        if (!song) return
        const event = song.events.find((e) => e.id === eventId)
        if (event) event.position = newPosition
      })
    },

    moveEvents: (moves) => {
      mutate((project) => {
        const song = project.songs.find((s) => s.id === project.activeSongId)
        if (!song) return
        for (const { eventId, newPosition } of moves) {
          const event = song.events.find((e) => e.id === eventId)
          if (event) event.position = newPosition
        }
      })
    },

    deleteEvent: (eventId) => {
      mutate((project) => {
        const song = project.songs.find((s) => s.id === project.activeSongId)
        if (song) song.events = song.events.filter((e) => e.id !== eventId)
      })
    },

    deleteEvents: (eventIds) => {
      const ids = new Set(eventIds)
      mutate((project) => {
        const song = project.songs.find((s) => s.id === project.activeSongId)
        if (song) song.events = song.events.filter((e) => !ids.has(e.id))
      })
    },

    copyEvents: (eventIds) => {
      const song = get().activeSong()
      const copied = song.events.filter((e) => eventIds.includes(e.id))
      set({ clipboard: copied })
    },

    pasteEvents: (atBar) => {
      const { clipboard } = get()
      if (clipboard.length === 0) return
      const minBar = Math.min(...clipboard.map((e) => e.position.bar))
      const barOffset = atBar - minBar
      mutate((project) => {
        const song = project.songs.find((s) => s.id === project.activeSongId)
        if (!song) return
        for (const ev of clipboard) {
          song.events.push({
            ...ev,
            id: uuid(),
            position: {
              ...ev.position,
              bar: Math.max(1, ev.position.bar + barOffset)
            }
          })
        }
      })
    },

    addSection: (sectionData) => {
      mutate((project) => {
        const song = project.songs.find((s) => s.id === project.activeSongId)
        if (song) song.sections.push({ ...sectionData, id: uuid() })
      })
    },

    updateSection: (sectionId, changes) => {
      mutate((project) => {
        const song = project.songs.find((s) => s.id === project.activeSongId)
        if (!song) return
        const section = song.sections.find((s) => s.id === sectionId)
        if (section) Object.assign(section, changes)
      })
    },

    deleteSection: (sectionId) => {
      mutate((project) => {
        const song = project.songs.find((s) => s.id === project.activeSongId)
        if (song) song.sections = song.sections.filter((s) => s.id !== sectionId)
      })
    },

    undo: () => {
      const { undoStack, project } = get()
      if (undoStack.length === 0) return
      const entry = undoStack[undoStack.length - 1]
      const nextProject = produce(project, (draft) => {
        for (const patch of entry.inversePatches) {
          applyPatch(draft, patch)
        }
      })
      set({
        project: nextProject,
        undoStack: undoStack.slice(0, -1),
        redoStack: [...get().redoStack, entry],
        isDirty: true
      })
    },

    redo: () => {
      const { redoStack, project } = get()
      if (redoStack.length === 0) return
      const entry = redoStack[redoStack.length - 1]
      const nextProject = produce(project, (draft) => {
        for (const patch of entry.patches) {
          applyPatch(draft, patch)
        }
      })
      set({
        project: nextProject,
        redoStack: redoStack.slice(0, -1),
        undoStack: [...get().undoStack, entry],
        isDirty: true
      })
    },

    addSong: () => {
      const id = uuid()
      mutate((project) => {
        const newSong = { ...createDefaultSong(), id }
        project.songs.push(newSong)
        project.setlist.songIds.push(id)
        project.activeSongId = id
      })
      return id
    },

    duplicateSong: (songId) => {
      const id = uuid()
      mutate((project) => {
        const src = project.songs.find((s) => s.id === songId)
        if (!src) return
        const dup: Song = { ...JSON.parse(JSON.stringify(src)), id, name: src.name + ' (copy)' }
        project.songs.push(dup)
        const idx = project.setlist.songIds.indexOf(songId)
        project.setlist.songIds.splice(idx + 1, 0, id)
        project.activeSongId = id
      })
      return id
    },

    deleteSong: (songId) => {
      mutate((project) => {
        if (project.songs.length <= 1) return
        project.songs = project.songs.filter((s) => s.id !== songId)
        project.setlist.songIds = project.setlist.songIds.filter((id) => id !== songId)
        if (project.activeSongId === songId) {
          project.activeSongId = project.songs[0].id
        }
      })
    },

    renameSong: (songId, name) => {
      mutate((project) => {
        const song = project.songs.find((s) => s.id === songId)
        if (song) song.name = name
      })
    },

    setActiveSong: (songId) => {
      mutate((project) => { project.activeSongId = songId })
    },

    reorderSongs: (fromIdx, toIdx) => {
      mutate((project) => {
        const ids = project.setlist.songIds
        const [moved] = ids.splice(fromIdx, 1)
        ids.splice(toIdx, 0, moved)
      })
    },

    markClean: () => set({ isDirty: false })
  }
})

function applyPatch(target: any, patch: Patch): void {
  let current = target
  const path = [...patch.path]
  const last = path.pop()
  if (last === undefined) return

  for (const key of path) {
    current = current[key]
  }

  switch (patch.op) {
    case 'replace':
    case 'add':
      current[last] = patch.value
      break
    case 'remove':
      if (Array.isArray(current)) {
        current.splice(Number(last), 1)
      } else {
        delete current[last]
      }
      break
  }
}
