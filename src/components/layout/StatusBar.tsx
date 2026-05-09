import { useProjectStore } from '../../stores/project-store'

export function StatusBar() {
  const song = useProjectStore((s) => s.activeSong())
  const devices = useProjectStore((s) => s.setlistDevices())
  const isDirty = useProjectStore((s) => s.isDirty)

  return (
    <div className="h-7 bg-gray-800 border-t border-gray-700 flex items-center px-4 text-xs text-gray-400 gap-4 shrink-0">
      <span>
        {devices.length} device{devices.length !== 1 ? 's' : ''}
      </span>
      <span>
        {song.events.length} event{song.events.length !== 1 ? 's' : ''}
      </span>
      <span>
        {song.totalBars} bars
      </span>
      <div className="flex-1" />
      {isDirty && <span className="text-yellow-400">Unsaved changes</span>}
    </div>
  )
}
