import { useState, useRef, useEffect, useCallback } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { useUIStore } from '../../stores/ui-store'
import { exportSongToMidi, downloadMidiFile } from '../../lib/midi-file-io'
import { downloadProjectFile, loadProjectFile } from '../../lib/project-file-io'

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const openMenuRef = useRef(openMenu)
  openMenuRef.current = openMenu

  const project = useProjectStore((s) => s.project)
  const song = useProjectStore((s) => s.activeSong())
  const setSongProperty = useProjectStore((s) => s.setSongProperty)
  const markClean = useProjectStore((s) => s.markClean)
  const setSetlistOpen = useUIStore((s) => s.setSetlistOpen)

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
      const dataUri = exportSongToMidi(song, project.customProfiles)
      const safeName = song.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'song'
      downloadMidiFile(dataUri, `${safeName}.mid`)
    } catch (e) {
      console.error('Export failed:', e)
    }
  }, [song, project.customProfiles])

  const handleSaveProject = useCallback(async () => {
    setOpenMenu(null)
    const safeName = song.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'project'
    await downloadProjectFile(project, safeName)
    markClean()
  }, [song.name, project, markClean])

  const handleLoadProject = useCallback(async () => {
    setOpenMenu(null)
    const loaded = await loadProjectFile()
    if (loaded) {
      useProjectStore.setState({
        project: loaded,
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
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      setSongProperty('audioFilePath', url)
      setSongProperty('audioFileName', file.name)

      // Read file as ArrayBuffer for persistence in .midiproj ZIP
      file.arrayBuffer().then((buffer) => {
        setSongProperty('audioFileData', buffer)
      })

      const audio = new Audio()
      audio.onloadedmetadata = () => {
        const beatsPerBar = song.timeSignature[0]
        const totalBeats = audio.duration * (song.bpm / 60)
        const bars = Math.ceil(totalBeats / beatsPerBar)
        setSongProperty('totalBars', bars)
        audio.src = ''
      }
      audio.src = url
    }
    input.click()
  }, [setSongProperty, song.bpm, song.timeSignature])

  const menuItems = [
    { label: 'Load Project...', action: handleLoadProject, shortcut: 'Ctrl+O' },
    { label: 'Save Project', action: handleSaveProject, shortcut: 'Ctrl+S' },
    { label: 'Load Reference Audio...', action: handleLoadAudio },
    { label: 'Export MIDI File...', action: handleExportMidi, shortcut: 'Ctrl+E' }
  ]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
          handleExportMidi()
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSaveProject, handleLoadProject, handleExportMidi])

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
