import type { DeviceProfile } from '../../types/device'

export const genericProfile: DeviceProfile = {
  id: 'generic',
  name: 'Generic MIDI Device',
  builtIn: true,
  supportsScenes: false,
  maxPresets: 128,
  commands: [
    {
      id: 'generic-pc',
      name: 'Program Change',
      description: 'Send a Program Change message',
      messages: [{ type: 'pc' }],
      parameters: [
        { name: 'program', label: 'Program Number', min: 0, max: 127, defaultValue: 0 }
      ]
    },
    {
      id: 'generic-cc',
      name: 'Control Change',
      description: 'Send a CC message',
      messages: [{ type: 'cc' }],
      parameters: [
        { name: 'controller', label: 'CC Number', min: 0, max: 127, defaultValue: 0 },
        { name: 'value', label: 'Value', min: 0, max: 127, defaultValue: 127 }
      ]
    }
  ]
}
