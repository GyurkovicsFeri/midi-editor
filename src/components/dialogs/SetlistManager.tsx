import { useState, useRef } from 'react'
import { useProjectStore } from '../../stores/project-store'
import { useUIStore } from '../../stores/ui-store'

export function SetlistManager() {
  const project = useProjectStore((s) => s.project)
  const addSong = useProjectStore((s) => s.addSong)
  const duplicateSong = useProjectStore((s) => s.duplicateSong)
  const deleteSong = useProjectStore((s) => s.deleteSong)
  const renameSong = useProjectStore((s) => s.renameSong)
  const setActiveSong = useProjectStore((s) => s.setActiveSong)
  const reorderSongs = useProjectStore((s) => s.reorderSongs)
  const setSetlistOpen = useUIStore((s) => s.setSetlistOpen)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const dragIdx = useRef<number | null>(null)

  const orderedSongs = project.setlist.songIds
    .map((id) => project.songs.find((s) => s.id === id))
    .filter(Boolean) as typeof project.songs

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col border border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">Setlist</h2>
          <button
            onClick={() => setSetlistOpen(false)}
            className="text-gray-400 hover:text-gray-200"
          >
            <svg viewBox="0 0 16 16" className="w-5 h-5 fill-current">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {orderedSongs.map((song, idx) => (
            <div
              key={song.id}
              draggable
              onDragStart={() => { dragIdx.current = idx }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIdx.current !== null && dragIdx.current !== idx) {
                  reorderSongs(dragIdx.current, idx)
                  dragIdx.current = null
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-md group cursor-pointer
                ${song.id === project.activeSongId
                  ? 'bg-blue-600/20 border border-blue-500/50'
                  : 'hover:bg-gray-700/50 border border-transparent'
                }`}
              onClick={() => {
                setActiveSong(song.id)
                setSetlistOpen(false)
              }}
            >
              {/* Drag handle */}
              <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current text-gray-600 shrink-0 cursor-grab">
                <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
                <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
                <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
              </svg>

              <span className="text-xs text-gray-500 w-5 text-center">{idx + 1}</span>

              {editingId === song.id ? (
                <input
                  autoFocus
                  className="flex-1 bg-gray-900 text-sm text-gray-200 rounded px-2 py-0.5
                    border border-blue-500 focus:outline-none"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => {
                    if (editingName.trim()) renameSong(song.id, editingName.trim())
                    setEditingId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (editingName.trim()) renameSong(song.id, editingName.trim())
                      setEditingId(null)
                    }
                    if (e.key === 'Escape') setEditingId(null)
                    e.stopPropagation()
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="flex-1 text-sm text-gray-200">{song.name}</span>
              )}

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-gray-500">{song.bpm} BPM</span>
                <span className="text-[10px] text-gray-600 mx-1">·</span>
                <span className="text-[10px] text-gray-500">{song.totalBars} bars</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingId(song.id)
                    setEditingName(song.name)
                  }}
                  className="p-1 text-gray-400 hover:text-gray-200 rounded"
                  title="Rename"
                >
                  <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current">
                    <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    duplicateSong(song.id)
                    setSetlistOpen(false)
                  }}
                  className="p-1 text-gray-400 hover:text-gray-200 rounded"
                  title="Duplicate"
                >
                  <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current">
                    <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z" />
                    <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (orderedSongs.length > 1) deleteSong(song.id)
                  }}
                  className={`p-1 rounded ${orderedSongs.length > 1
                    ? 'text-gray-400 hover:text-red-400'
                    : 'text-gray-700 cursor-not-allowed'}`}
                  title={orderedSongs.length > 1 ? 'Delete' : 'Cannot delete last song'}
                >
                  <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current">
                    <path d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675l.66 6.6a.25.25 0 00.249.225h5.19a.25.25 0 00.249-.225l.66-6.6a.75.75 0 011.492.149l-.66 6.6A1.748 1.748 0 0110.595 15h-5.19a1.75 1.75 0 01-1.741-1.575l-.66-6.6a.75.75 0 011.492-.15z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-700">
          <button
            onClick={() => { addSong(); setSetlistOpen(false) }}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-sm text-white rounded font-medium"
          >
            + Add New Song
          </button>
        </div>
      </div>
    </div>
  )
}
