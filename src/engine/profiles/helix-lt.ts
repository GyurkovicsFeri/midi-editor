import type { DeviceProfile } from '../../types/device'

export const helixLtProfile: DeviceProfile = {
  id: 'helix-lt',
  name: 'Line 6 Helix LT',
  builtIn: true,
  supportsScenes: true,
  maxScenes: 3,
  maxPresets: 128,
  commands: [
    {
      id: 'helix-lt-snapshot',
      name: 'Snapshot Change',
      description: 'Recall a snapshot within the current preset (CC#69, value 0-2)',
      messages: [
        { type: 'cc', controller: 69, valueParam: 'scene', valueOffset: -1 }
      ],
      parameters: [
        { name: 'scene', label: 'Snapshot (1-3)', min: 1, max: 3, defaultValue: 1 }
      ]
    },
    {
      id: 'helix-lt-preset',
      name: 'Preset Change',
      description: 'Recall a preset by bank, setlist, and number (CC#0 bank, CC#32 setlist, PC preset)',
      messages: [
        { type: 'cc', controller: 0, valueParam: 'bank' },
        { type: 'cc', controller: 32, valueParam: 'setlist' },
        { type: 'pc' }
      ],
      parameters: [
        { name: 'preset', label: 'Preset (0-127)', min: 0, max: 127, defaultValue: 0 },
        { name: 'bank', label: 'Bank MSB (0-7)', min: 0, max: 7, defaultValue: 0 },
        { name: 'setlist', label: 'Setlist (0-7)', min: 0, max: 7, defaultValue: 0 }
      ]
    },
    {
      id: 'helix-lt-tap-tempo',
      name: 'Tap Tempo',
      description: 'Send a tap tempo pulse (CC#64)',
      messages: [
        { type: 'cc', controller: 64, value: 127 }
      ]
    },
    {
      id: 'helix-lt-tuner',
      name: 'Tuner Toggle',
      description: 'Toggle tuner on/off (CC#68)',
      messages: [
        { type: 'cc', controller: 68, value: 127 }
      ]
    },
    {
      id: 'helix-lt-all-bypass',
      name: 'All Bypass Toggle',
      description: 'Toggle all blocks bypass (CC#70)',
      messages: [
        { type: 'cc', controller: 70, valueParam: 'bypass' }
      ],
      parameters: [
        { name: 'bypass', label: 'Bypass (0=off, 127=on)', min: 0, max: 127, defaultValue: 127 }
      ]
    },
    {
      id: 'helix-lt-next-snapshot',
      name: 'Next Snapshot',
      description: 'Advance to the next snapshot (CC#69, value 9)',
      messages: [
        { type: 'cc', controller: 69, value: 9 }
      ]
    },
    {
      id: 'helix-lt-prev-snapshot',
      name: 'Previous Snapshot',
      description: 'Return to the previous snapshot (CC#69, value 8)',
      messages: [
        { type: 'cc', controller: 69, value: 8 }
      ]
    },
    {
      id: 'helix-lt-exp-1',
      name: 'Expression Pedal 1 Sweep',
      description: 'Animated CC#1 sweep from start to end value over a duration',
      messages: [
        { type: 'cc', controller: 1, valueParam: 'startValue' }
      ],
      parameters: [
        { name: 'startValue', label: 'Start Value', min: 0, max: 127, defaultValue: 0 },
        { name: 'endValue', label: 'End Value', min: 0, max: 127, defaultValue: 127 },
        { name: 'durationBeats', label: 'Duration (beats)', min: 0.25, max: 64, defaultValue: 4 },
        { name: 'easingType', label: 'Easing', min: 0, max: 3, defaultValue: 0 }
      ]
    },
    {
      id: 'helix-lt-exp-2',
      name: 'Expression Pedal 2 Sweep',
      description: 'Animated CC#2 sweep from start to end value over a duration',
      messages: [
        { type: 'cc', controller: 2, valueParam: 'startValue' }
      ],
      parameters: [
        { name: 'startValue', label: 'Start Value', min: 0, max: 127, defaultValue: 0 },
        { name: 'endValue', label: 'End Value', min: 0, max: 127, defaultValue: 127 },
        { name: 'durationBeats', label: 'Duration (beats)', min: 0.25, max: 64, defaultValue: 4 },
        { name: 'easingType', label: 'Easing', min: 0, max: 3, defaultValue: 0 }
      ]
    },
    {
      id: 'helix-lt-fs1',
      name: 'Footswitch 1',
      description: 'Toggle FS1 (CC#49)',
      messages: [{ type: 'cc', controller: 49, value: 127 }]
    },
    {
      id: 'helix-lt-fs2',
      name: 'Footswitch 2',
      description: 'Toggle FS2 (CC#50)',
      messages: [{ type: 'cc', controller: 50, value: 127 }]
    },
    {
      id: 'helix-lt-fs3',
      name: 'Footswitch 3',
      description: 'Toggle FS3 (CC#51)',
      messages: [{ type: 'cc', controller: 51, value: 127 }]
    },
    {
      id: 'helix-lt-fs4',
      name: 'Footswitch 4',
      description: 'Toggle FS4 (CC#52)',
      messages: [{ type: 'cc', controller: 52, value: 127 }]
    },
    {
      id: 'helix-lt-fs5',
      name: 'Footswitch 5',
      description: 'Toggle FS5 (CC#53)',
      messages: [{ type: 'cc', controller: 53, value: 127 }]
    },
    {
      id: 'helix-lt-fs6',
      name: 'Footswitch 6',
      description: 'Toggle FS6 (CC#54)',
      messages: [{ type: 'cc', controller: 54, value: 127 }]
    },
    {
      id: 'helix-lt-fs7',
      name: 'Footswitch 7',
      description: 'Toggle FS7 (CC#55)',
      messages: [{ type: 'cc', controller: 55, value: 127 }]
    },
    {
      id: 'helix-lt-fs8',
      name: 'Footswitch 8',
      description: 'Toggle FS8 (CC#56)',
      messages: [{ type: 'cc', controller: 56, value: 127 }]
    }
  ]
}
