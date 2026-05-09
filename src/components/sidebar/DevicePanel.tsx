import { useProjectStore } from '../../stores/project-store'
import { useUIStore } from '../../stores/ui-store'
import { getProfile } from '../../engine/device-protocol'

export function DevicePanel() {
  const song = useProjectStore((s) => s.activeSong())
  const addEvent = useProjectStore((s) => s.addEvent)
  const { setSongSettingsOpen } = useUIStore()

  const handleAddCommand = (deviceId: string, commandId: string, label: string) => {
    const device = song.devices.find((d) => d.id === deviceId)
    if (!device) return
    addEvent({
      type: 'device-command',
      deviceId,
      commandId,
      position: { bar: 1, beat: 1, tick: 0 },
      label,
      color: device.color,
      parameters: {}
    })
  }

  if (song.devices.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-gray-400 mb-3">No devices yet</p>
        <button
          onClick={() => setSongSettingsOpen(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-sm text-white rounded"
        >
          Add Device
        </button>
      </div>
    )
  }

  return (
    <div className="p-2 space-y-3">
      {song.devices.map((device) => {
        const profile = getProfile(device.profileId)
        if (!profile) return null
        return (
          <div key={device.id}>
            <div className="flex items-center gap-2 px-2 py-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: device.color }}
              />
              <span className="text-xs font-semibold text-gray-300 truncate">
                {device.name}
              </span>
            </div>
            <div className="space-y-0.5">
              {profile.commands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => handleAddCommand(device.id, cmd.id, cmd.name)}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-300
                    hover:bg-gray-700 rounded transition-colors"
                  title={cmd.description}
                >
                  {cmd.name}
                </button>
              ))}
            </div>
          </div>
        )
      })}
      <button
        onClick={() => setSongSettingsOpen(true)}
        className="w-full text-center px-3 py-1.5 text-xs text-gray-400
          hover:text-gray-200 hover:bg-gray-700 rounded border border-dashed border-gray-700"
      >
        + Add Device
      </button>
    </div>
  )
}
