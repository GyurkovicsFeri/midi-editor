import type { DeviceProfile } from '../../types/device'

export const ve500Profile: DeviceProfile = {
  id: 've-500',
  name: 'Boss VE-500 Vocal Performer',
  builtIn: true,
  supportsScenes: false,
  maxPresets: 99,
  commands: [
    {
      id: 've500-preset',
      name: 'Preset Change',
      description: 'Recall a preset by bank and number (CC#0 bank, CC#32=0, PC preset)',
      messages: [
        { type: 'cc', controller: 0, valueParam: 'bank' },
        { type: 'cc', controller: 32, value: 0 },
        { type: 'pc' }
      ],
      parameters: [
        { name: 'preset', label: 'Preset (0-98 User, 0-49 Factory)', min: 0, max: 98, defaultValue: 0 },
        { name: 'bank', label: 'Bank (0=User, 1=Factory)', min: 0, max: 1, defaultValue: 0 }
      ]
    },
    {
      id: 've500-harmony-on',
      name: 'Harmony On',
      description: 'Enable harmony effect (CC#7 value 127). Match CC# in VE-500 ASSIGN menu.',
      messages: [
        { type: 'cc', controller: 7, value: 127 }
      ]
    },
    {
      id: 've500-harmony-off',
      name: 'Harmony Off',
      description: 'Disable harmony effect (CC#7 value 0). Match CC# in VE-500 ASSIGN menu.',
      messages: [
        { type: 'cc', controller: 7, value: 0 }
      ]
    },
    {
      id: 've500-reverb-on',
      name: 'Reverb On',
      description: 'Enable reverb (CC#19 value 127). Match CC# in VE-500 ASSIGN menu.',
      messages: [
        { type: 'cc', controller: 19, value: 127 }
      ]
    },
    {
      id: 've500-reverb-off',
      name: 'Reverb Off',
      description: 'Disable reverb (CC#19 value 0). Match CC# in VE-500 ASSIGN menu.',
      messages: [
        { type: 'cc', controller: 19, value: 0 }
      ]
    },
    {
      id: 've500-delay-on',
      name: 'Delay On',
      description: 'Enable delay (CC#18 value 127). Match CC# in VE-500 ASSIGN menu.',
      messages: [
        { type: 'cc', controller: 18, value: 127 }
      ]
    },
    {
      id: 've500-delay-off',
      name: 'Delay Off',
      description: 'Disable delay (CC#18 value 0). Match CC# in VE-500 ASSIGN menu.',
      messages: [
        { type: 'cc', controller: 18, value: 0 }
      ]
    },
    {
      id: 've500-dynamics-on',
      name: 'Dynamics On',
      description: 'Enable dynamics/compression (CC#17 value 127). Match CC# in VE-500 ASSIGN menu.',
      messages: [
        { type: 'cc', controller: 17, value: 127 }
      ]
    },
    {
      id: 've500-dynamics-off',
      name: 'Dynamics Off',
      description: 'Disable dynamics/compression (CC#17 value 0). Match CC# in VE-500 ASSIGN menu.',
      messages: [
        { type: 'cc', controller: 17, value: 0 }
      ]
    },
    {
      id: 've500-fx-on',
      name: 'FX/Enhance On',
      description: 'Enable FX/Enhance block (CC#16 value 127). Match CC# in VE-500 ASSIGN menu.',
      messages: [
        { type: 'cc', controller: 16, value: 127 }
      ]
    },
    {
      id: 've500-fx-off',
      name: 'FX/Enhance Off',
      description: 'Disable FX/Enhance block (CC#16 value 0). Match CC# in VE-500 ASSIGN menu.',
      messages: [
        { type: 'cc', controller: 16, value: 0 }
      ]
    },
    {
      id: 've500-exp-pedal',
      name: 'Expression Pedal Sweep',
      description: 'Animated CC#11 sweep from start to end value over a duration',
      messages: [
        { type: 'cc', controller: 11, valueParam: 'startValue' }
      ],
      parameters: [
        { name: 'startValue', label: 'Start Value', min: 0, max: 127, defaultValue: 0 },
        { name: 'endValue', label: 'End Value', min: 0, max: 127, defaultValue: 127 },
        { name: 'durationBeats', label: 'Duration (beats)', min: 0.25, max: 64, defaultValue: 4 },
        { name: 'easingType', label: 'Easing', min: 0, max: 3, defaultValue: 0 }
      ]
    }
  ]
}
