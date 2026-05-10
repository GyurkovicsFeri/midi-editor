import type { DeviceProfile } from '../../types/device'

export const quadCortexProfile: DeviceProfile = {
  id: 'quad-cortex',
  name: 'Neural DSP Quad Cortex',
  builtIn: true,
  supportsScenes: true,
  maxScenes: 8,
  maxPresets: 128,
  commands: [
    {
      id: 'qc-scene',
      name: 'Scene Change',
      description: 'Recall a scene within the current preset (CC#43, value 0-7)',
      messages: [
        { type: 'cc', controller: 43, valueParam: 'scene', valueOffset: -1 }
      ],
      parameters: [
        { name: 'scene', label: 'Scene (1-8)', min: 1, max: 8, defaultValue: 1 }
      ]
    },
    {
      id: 'qc-preset',
      name: 'Preset Change',
      description: 'Recall a preset by setlist and number (CC#0 bank, CC#32 setlist, PC preset)',
      messages: [
        { type: 'cc', controller: 0, valueParam: 'bank' },
        { type: 'cc', controller: 32, valueParam: 'setlist' },
        { type: 'pc' }
      ],
      parameters: [
        { name: 'preset', label: 'Preset (0-127)', min: 0, max: 127, defaultValue: 0 },
        { name: 'bank', label: 'Bank (0=presets 0-127, 1=128-255)', min: 0, max: 1, defaultValue: 0 },
        { name: 'setlist', label: 'Setlist (0=Factory, 1=My Presets, 2-12=User)', min: 0, max: 12, defaultValue: 1 }
      ]
    },
    {
      id: 'qc-tap-tempo',
      name: 'Tap Tempo',
      description: 'Send a tap tempo pulse (CC#44)',
      messages: [
        { type: 'cc', controller: 44, value: 127 }
      ]
    },
    {
      id: 'qc-tuner-on',
      name: 'Tuner On',
      description: 'Open the tuner (CC#45 value 127)',
      messages: [
        { type: 'cc', controller: 45, value: 127 }
      ]
    },
    {
      id: 'qc-tuner-off',
      name: 'Tuner Off',
      description: 'Close the tuner (CC#45 value 0)',
      messages: [
        { type: 'cc', controller: 45, value: 0 }
      ]
    },
    {
      id: 'qc-gig-view-on',
      name: 'Gig View On',
      description: 'Open Gig View (CC#46 value 127)',
      messages: [
        { type: 'cc', controller: 46, value: 127 }
      ]
    },
    {
      id: 'qc-gig-view-off',
      name: 'Gig View Off',
      description: 'Close Gig View (CC#46 value 0)',
      messages: [
        { type: 'cc', controller: 46, value: 0 }
      ]
    },
    {
      id: 'qc-exp-pedal-1',
      name: 'Expression Pedal 1 Sweep',
      description: 'Animated CC#1 sweep from start to end value over a duration',
      messages: [
        { type: 'cc', controller: 1, valueParam: 'startValue' }
      ],
      parameters: [
        { name: 'startValue', label: 'Start Value', min: 0, max: 127, defaultValue: 0 },
        { name: 'endValue', label: 'End Value', min: 0, max: 127, defaultValue: 127 },
        { name: 'durationBeats', label: 'Duration (beats)', min: 1, max: 64, defaultValue: 4 },
        { name: 'easingType', label: 'Easing', min: 0, max: 3, defaultValue: 0 }
      ]
    },
    {
      id: 'qc-exp-pedal-2',
      name: 'Expression Pedal 2 Sweep',
      description: 'Animated CC#2 sweep from start to end value over a duration',
      messages: [
        { type: 'cc', controller: 2, valueParam: 'startValue' }
      ],
      parameters: [
        { name: 'startValue', label: 'Start Value', min: 0, max: 127, defaultValue: 0 },
        { name: 'endValue', label: 'End Value', min: 0, max: 127, defaultValue: 127 },
        { name: 'durationBeats', label: 'Duration (beats)', min: 1, max: 64, defaultValue: 4 },
        { name: 'easingType', label: 'Easing', min: 0, max: 3, defaultValue: 0 }
      ]
    }
  ]
}
