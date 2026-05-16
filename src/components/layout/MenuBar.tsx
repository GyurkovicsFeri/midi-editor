import { useState, useRef, useEffect, useCallback } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { useUIStore } from '../../stores/ui-store'
import { exportSongToMidi, exportSongToMidiFormat0, batchExportToZip, downloadMidiFile } from '../../lib/midi-file-io'
import { downloadProjectFile, loadProjectFile } from '../../lib/project-file-io'

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const openMenuRef = useRef(openMenu)
  openMenuRef.current = openMenu

  const project = useProjectStore((s) => s.project)
  const song = useProjectStore((s) => s.activeSong())
  const devices = useProjectStore((s) => s.setlistDevices())
  const setSongProperty = useProjectStore((s) => s.setSongProperty)
  const addAudioTrack = useProjectStore((s) => s.addAudioTrack)
  const markClean = useProjectStore((s) => s.markClean)
  const projectFileName = useProjectStore((s) => s.projectFileName)
  const setProjectFileName = useProjectStore((s) => s.setProjectFileName)
  const setSetlistOpen = useUIStore((s) => s.setSetlistOpen)
  const setHelpOpen = useUIStore((s) => s.setHelpOpen)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (openMenuRef.current && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleExportMidi = useCallback(() => {
    setOpenMenu(null)
    try {
      const dataUri = exportSongToMidi(song, devices, project.customProfiles)
      const safeName = song.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'song'
      downloadMidiFile(dataUri, `${safeName}.mid`)
    } catch (e) {
      console.error('Export failed:', e)
    }
  }, [song, devices, project.customProfiles])

  const handleExportMidiFormat0 = useCallback(() => {
    setOpenMenu(null)
    try {
      const dataUri = exportSongToMidiFormat0(song, devices, project.customProfiles)
      const safeName = song.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'song'
      downloadMidiFile(dataUri, `${safeName}_f0.mid`)
    } catch (e) {
      console.error('Export failed:', e)
    }
  }, [song, devices, project.customProfiles])

  const handleBatchExport = useCallback(async () => {
    setOpenMenu(null)
    try {
      const orderedSongs = project.setlist.songIds
        .map((id) => project.songs.find((s) => s.id === id))
        .filter(Boolean) as typeof project.songs
      await batchExportToZip(orderedSongs, devices, project.customProfiles, project.setlist.name)
    } catch (e) {
      console.error('Batch export failed:', e)
    }
  }, [project, devices])

  const handleSaveProject = useCallback(async () => {
    setOpenMenu(null)
    const filename = projectFileName || 'untitled'
    await downloadProjectFile(project, filename)
    if (!projectFileName) setProjectFileName(filename)
    markClean()
  }, [project, projectFileName, markClean, setProjectFileName])

  const handleLoadProject = useCallback(async () => {
    setOpenMenu(null)
    const result = await loadProjectFile()
    if (result) {
      useProjectStore.setState({
        project: result.project,
        projectFileName: result.fileName,
        isDirty: false,
        undoStack: [],
        redoStack: []
      })
    }
  }, [])

  const handleLoadAudio = useCallback(() => {
    setOpenMenu(null)
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'audio/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const filePath = URL.createObjectURL(file)
      const fileData = await file.arrayBuffer()
      const trackColors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899']
      addAudioTrack({
        name: file.name.replace(/\.[^/.]+$/, ''),
        filePath,
        fileData,
        fileName: file.name,
        offsetMs: 0,
        volume: 1,
        muted: false,
        color: trackColors[song.audioTracks.length % trackColors.length],
        embedded: true
      })

      const audio = new Audio()
      audio.onloadedmetadata = () => {
        const beatsPerBar = song.timeSignature[0]
        const totalBeats = audio.duration * (song.bpm / 60)
        const bars = Math.ceil(totalBeats / beatsPerBar)
        if (bars > song.totalBars) {
          setSongProperty('totalBars', bars)
        }
        audio.src = ''
      }
      audio.src = filePath
    }
    input.click()
  }, [addAudioTrack, setSongProperty, song.bpm, song.timeSignature, song.audioTracks.length, song.totalBars])

  const menuItems = [
    { label: 'Load Project...', action: handleLoadProject, shortcut: 'Ctrl+O' },
    { label: 'Save Project', action: handleSaveProject, shortcut: 'Ctrl+S' },
    { label: 'Load Reference Audio...', action: handleLoadAudio },
    { label: 'Export MIDI (Format 1, multi-track)...', action: handleExportMidi, shortcut: 'Ctrl+E' },
    { label: 'Export MIDI (Format 0, single-track)...', action: handleExportMidiFormat0, shortcut: 'Ctrl+Shift+E' },
    { label: 'Export All Songs as ZIP...', action: handleBatchExport }
  ]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === '?') {
        setHelpOpen(true)
        return
      }
      if (!(e.metaKey || e.ctrlKey)) return
      switch (e.code) {
        case 'KeyS':
          e.preventDefault()
          handleSaveProject()
          break
        case 'KeyO':
          e.preventDefault()
          handleLoadProject()
          break
        case 'KeyE':
          e.preventDefault()
          if (e.shiftKey) handleExportMidiFormat0()
          else handleExportMidi()
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSaveProject, handleLoadProject, handleExportMidi, setHelpOpen])

  return (
    <div ref={menuRef} className="relative flex items-center gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpenMenu(openMenu === 'File' ? null : 'File')
        }}
        className={`px-3 py-1 text-xs font-medium rounded ${
          openMenu === 'File'
            ? 'bg-gray-700 text-white'
            : 'text-gray-300 hover:bg-gray-700/50'
        }`}
      >
        File
      </button>
      <button
        onClick={() => setSetlistOpen(true)}
        className="px-3 py-1 text-xs font-medium rounded text-gray-300 hover:bg-gray-700/50"
      >
        Setlist
      </button>
      <button
        onClick={() => setHelpOpen(true)}
        className="px-3 py-1 text-xs font-medium rounded text-gray-300 hover:bg-gray-700/50"
        title="Help / User Manual (?)"
      >
        Help
      </button>
      {openMenu === 'File' && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-xl py-1 min-w-[220px] z-50">
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation()
                item.action()
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 flex items-center"
            >
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <span className="text-gray-500 ml-4 text-[10px]">{item.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
