import JSZip from 'jszip'
import type { MidiDevice } from '../types/device'
import type { Project, Song } from '../types/project'

const PROJECT_VERSION = 2

interface ProjectFile {
  version: number
  project: Project
}

function migrateV1ToV2(file: ProjectFile): ProjectFile {
  console.warn('[midiproj] Migrating project from v1 to v2 (devices moved to setlist)')
  const project = file.project as Project & { songs: (Song & { devices?: MidiDevice[] })[] }

  // Collect all unique devices from all songs (de-dup by id)
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

/**
 * Prepare a song for serialization by stripping runtime-only fields.
 * - audioFilePath: blob URL, runtime only
 * - audioFileData: raw ArrayBuffer held in memory, not serialisable to JSON
 */
function prepareSongForSerialization(song: Song): Record<string, unknown> {
  const { audioFilePath, audioFileData, ...rest } = song
  return rest
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

  // Add audio files for each song that has one
  for (const song of project.songs) {
    if (song.audioFileData && song.audioFileName) {
      zip.file(`audio/${song.audioFileName}`, song.audioFileData)
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

  const migrated = file.version < 2 ? migrateV1ToV2(file) : file
  const project = migrated.project

  // Rehydrate audio: for each song with an audioFileName, look for it in audio/
  for (const song of project.songs) {
    if (song.audioFileName) {
      const audioFile = zip.file(`audio/${song.audioFileName}`)
      if (audioFile) {
        const audioData = await audioFile.async('arraybuffer')
        // Determine MIME type from extension
        const ext = song.audioFileName.split('.').pop()?.toLowerCase() ?? ''
        const mimeMap: Record<string, string> = {
          mp3: 'audio/mpeg',
          wav: 'audio/wav',
          ogg: 'audio/ogg',
          flac: 'audio/flac',
          aac: 'audio/aac',
          m4a: 'audio/mp4',
          webm: 'audio/webm'
        }
        const mime = mimeMap[ext] || 'audio/mpeg'
        const blob = new Blob([audioData], { type: mime })
        song.audioFilePath = URL.createObjectURL(blob)
        song.audioFileData = audioData
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
  const project = file.project

  // Rehydrate any base64-embedded audio from legacy format
  project.songs = project.songs.map((song) => {
    const legacySong = song as Song & { audioFileData?: string }
    if (typeof legacySong.audioFileData === 'string' && legacySong.audioFileData.startsWith('data:')) {
      // Convert legacy base64 data URI to ArrayBuffer + blob URL
      try {
        const [header, base64] = legacySong.audioFileData.split(',')
        const mime = header.match(/:(.*?);/)?.[1] ?? 'audio/mpeg'
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        const blob = new Blob([bytes], { type: mime })
        song.audioFilePath = URL.createObjectURL(blob)
        song.audioFileData = bytes.buffer as ArrayBuffer
      } catch (e) {
        console.error('Failed to decode legacy audio data:', e)
      }
    }
    return song
  })

  return project
}
