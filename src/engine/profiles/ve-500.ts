import type { DeviceProfile } from '../../types/device'

function makeAssignCommand(n: number): {
  id: string
  name: string
  description: string
  messages: Array<{ type: 'cc'; controller: number; valueParam: string }>
  parameters: Array<{ name: string; label: string; min: number; max: number; defaultValue: number }>
} {
  return {
    id: `ve500-assign-${n}`,
    name: `Assign ${n}`,
    description: `Send CC#${n} with a value (0–127). Set a nickname in Song Settings. Match CC#${n} in VE-500 ASSIGN menu.`,
    messages: [
      { type: 'cc', controller: n, valueParam: 'value' }
    ],
    parameters: [
      { name: 'value', label: 'Value (0=off, 127=on)', min: 0, max: 127, defaultValue: 127 }
    ]
  }
}

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
    makeAssignCommand(1),
    makeAssignCommand(2),
    makeAssignCommand(3),
    makeAssignCommand(4),
    makeAssignCommand(5),
    makeAssignCommand(6),
    makeAssignCommand(7),
    makeAssignCommand(8),
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
