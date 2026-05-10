import { useProjectStore } from '../../stores/project-store'
import { useUIStore } from '../../stores/ui-store'
import { useMidiOutputStore } from '../../stores/midi-output-store'
import { getProfile } from '../../engine/device-protocol'
import type { MidiEvent } from '../../types/midi'

export function DevicePanel() {
  const devices = useProjectStore((s) => s.setlistDevices())
  const addEvent = useProjectStore((s) => s.addEvent)
  const { setSongSettingsOpen } = useUIStore()
  const sendNow = useMidiOutputStore((s) => s.sendNow)
  const getPortForDevice = useMidiOutputStore((s) => s.getPortForDevice)

  const handleAddCommand = (deviceId: string, commandId: string, label: string) => {
    const device = devices.find((d) => d.id === deviceId)
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

  if (devices.length === 0) {
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
      {devices.map((device) => {
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
                <div key={cmd.id} className="flex items-center group">
                  <button
                    onClick={() => handleAddCommand(device.id, cmd.id, cmd.name)}
                    className="flex-1 text-left px-3 py-1.5 text-xs text-gray-300
                      hover:bg-gray-700 rounded-l transition-colors"
                    title={cmd.description}
                  >
                    {cmd.name}
                  </button>
                  {getPortForDevice(device.id) && (
                    <button
                      onClick={() => {
                        const event: MidiEvent = {
                          id: 'send-now',
                          type: 'device-command',
                          deviceId: device.id,
                          commandId: cmd.id,
                          position: { bar: 1, beat: 1, tick: 0 },
                          label: cmd.name,
                          parameters: {}
                        }
                        sendNow(device.id, event)
                      }}
                      className="px-1.5 py-1.5 text-gray-500 hover:text-green-400 hover:bg-gray-700 rounded-r
                        opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Send now"
                    >
                      <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current">
                        <path d="M1.5 1.75a.75.75 0 011.06-.06l11.5 10.5a.75.75 0 01-.06 1.12l-11.5-1.5a.75.75 0 01-.36-1.3l4.5-2.75-4.5-2.75a.75.75 0 01-.08-1.22z" />
                      </svg>
                    </button>
                  )}
                </div>
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
