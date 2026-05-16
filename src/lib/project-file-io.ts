import JSZip from 'jszip'
import { v4 as uuid } from 'uuid'
import type { MidiDevice } from '../types/device'
import type { Project, Song, AudioTrack } from '../types/project'

const PROJECT_VERSION = 3

interface ProjectFile {
  version: number
  project: Project
}

function migrateV1ToV2(file: ProjectFile): ProjectFile {
  console.warn('[midiproj] Migrating project from v1 to v2 (devices moved to setlist)')
  const project = file.project as Project & { songs: (Song & { devices?: MidiDevice[] })[] }

  const seen = new Set<string>()
  const devices: MidiDevice[] = []
  for (const song of project.songs) {
    for (const d of song.devices ?? []) {
      if (!seen.has(d.id)) { seen.add(d.id); devices.push(d) }
    }
    delete (song as Song & { devices?: MidiDevice[] }).devices
  }

  project.setlist.devices = devices
  return { version: 2, project }
}

interface LegacyAudioSong {
  audioFilePath?: string
  audioFileData?: ArrayBuffer | string
  audioFileName?: string
  audioOffsetMs?: number
}

function migrateV2ToV3(file: ProjectFile): ProjectFile {
  console.warn('[midiproj] Migrating project from v2 to v3 (multi-track audio + liveOffset)')
  for (const song of file.project.songs) {
    const legacy = song as unknown as LegacyAudioSong & Song
    if (!song.audioTracks) {
      song.audioTracks = []
      if (legacy.audioFileName || legacy.audioFileData) {
        song.audioTracks.push({
          id: uuid(),
          name: legacy.audioFileName ?? 'Audio',
          fileName: legacy.audioFileName,
          fileData: legacy.audioFileData as ArrayBuffer | undefined,
          filePath: legacy.audioFilePath,
          offsetMs: legacy.audioOffsetMs ?? 0,
          volume: 1,
          muted: false,
          color: '#3b82f6',
          embedded: true
        })
      }
    }
    delete (legacy as any).audioFilePath
    delete (legacy as any).audioFileData
    delete (legacy as any).audioFileName
    delete (legacy as any).audioOffsetMs
    if (!song.liveOffset) {
      song.liveOffset = { bars: 0, beats: 0 }
    }
  }
  return { version: 3, project: file.project }
}

function prepareSongForSerialization(song: Song): Record<string, unknown> {
  return {
    ...song,
    audioTracks: song.audioTracks.map(({ filePath, fileData, ...rest }) => rest)
  }
}

/**
 * Save a project as a ZIP-based .midiproj file.
 *
 * Structure inside the ZIP:
 *   project.json          — the project metadata (no audio blobs)
 *   audio/<filename>      — raw audio files referenced by songs
 */
export async function downloadProjectFile(project: Project, filename: string): Promise<void> {
  const zip = new JSZip()

  // Serialize project JSON (without audio blobs)
  const serializable: Project = {
    ...project,
    songs: project.songs.map(prepareSongForSerialization) as Song[]
  }
  const projectFile: ProjectFile = {
    version: PROJECT_VERSION,
    project: serializable
  }
  zip.file('project.json', JSON.stringify(projectFile, null, 2))

  // Add embedded audio tracks
  for (const song of project.songs) {
    for (const track of song.audioTracks) {
      if (track.embedded && track.fileData && track.fileName) {
        zip.file(`audio/${song.id}/${track.id}-${track.fileName}`, track.fileData)
      }
    }
  }

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.midiproj') ? filename : `${filename}.midiproj`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Load a .midiproj file.
 * Supports both the new ZIP format and the legacy plain-JSON format.
 */
export async function loadProjectFile(): Promise<Project | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.midiproj,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(null)
        return
      }
      try {
        const arrayBuffer = await file.arrayBuffer()
        let project: Project

        // Try ZIP format first
        if (isZip(arrayBuffer)) {
          project = await loadFromZip(arrayBuffer)
        } else {
          // Fall back to legacy plain-JSON format
          const text = new TextDecoder().decode(arrayBuffer)
          project = deserializeLegacyProject(text)
        }

        resolve(project)
      } catch (e) {
        console.error('Failed to load project:', e)
        resolve(null)
      }
    }
    input.click()
  })
}

/**
 * Check if an ArrayBuffer starts with the ZIP magic bytes (PK\x03\x04).
 */
function isZip(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer, 0, 4)
  return view[0] === 0x50 && view[1] === 0x4b && view[2] === 0x03 && view[3] === 0x04
}

/**
 * Load a project from the new ZIP-based format.
 */
async function loadFromZip(buffer: ArrayBuffer): Promise<Project> {
  const zip = await JSZip.loadAsync(buffer)

  // Read project.json
  const projectJsonFile = zip.file('project.json')
  if (!projectJsonFile) {
    throw new Error('Invalid .midiproj file: missing project.json')
  }
  const jsonText = await projectJsonFile.async('text')
  const file = JSON.parse(jsonText) as ProjectFile
  if (!file.version || !file.project) {
    throw new Error('Invalid project file')
  }

  let migrated = file
  if (migrated.version < 2) migrated = migrateV1ToV2(migrated)
  if (migrated.version < 3) migrated = migrateV2ToV3(migrated)
  const project = migrated.project

  // Rehydrate audio tracks from ZIP
  for (const song of project.songs) {
    for (const track of song.audioTracks) {
      if (!track.fileName) continue
      // Try new path format first, then legacy
      const newPath = `audio/${song.id}/${track.id}-${track.fileName}`
      const legacyPath = `audio/${track.fileName}`
      const audioFile = zip.file(newPath) ?? zip.file(legacyPath)
      if (audioFile) {
        const audioData = await audioFile.async('arraybuffer')
        const ext = track.fileName.split('.').pop()?.toLowerCase() ?? ''
        const mimeMap: Record<string, string> = {
          mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
          flac: 'audio/flac', aac: 'audio/aac', m4a: 'audio/mp4', webm: 'audio/webm'
        }
        const mime = mimeMap[ext] || 'audio/mpeg'
        const blob = new Blob([audioData], { type: mime })
        track.filePath = URL.createObjectURL(blob)
        track.fileData = audioData
      }
    }
  }

  return project
}

/**
 * Legacy loader for the old plain-JSON format (with optional base64-embedded audio).
 * Kept for backwards compatibility.
 */
function deserializeLegacyProject(json: string): Project {
  let file = JSON.parse(json) as ProjectFile
  if (!file.version || !file.project) {
    throw new Error('Invalid project file')
  }
  if (file.version < 2) file = migrateV1ToV2(file)

  // Rehydrate any base64-embedded audio from legacy format before v3 migration
  for (const song of file.project.songs) {
    const legacySong = song as any
    if (typeof legacySong.audioFileData === 'string' && legacySong.audioFileData.startsWith('data:')) {
      try {
        const [header, base64] = legacySong.audioFileData.split(',')
        const mime = header.match(/:(.*?);/)?.[1] ?? 'audio/mpeg'
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: mime })
        legacySong.audioFilePath = URL.createObjectURL(blob)
        legacySong.audioFileData = bytes.buffer as ArrayBuffer
      } catch (e) {
        console.error('Failed to decode legacy audio data:', e)
      }
    }
  }

  if (file.version < 3) file = migrateV2ToV3(file)
  return file.project
}
