import type { DeviceProfile } from '../../types/device'

export const darkglassAlphaOmegaPhotonProfile: DeviceProfile = {
  id: 'darkglass-alpha-omega-photon',
  name: 'Darkglass Alpha Omega Photon',
  builtIn: true,
  supportsScenes: false,
  maxPresets: 6,
  commands: [
    // Preset recall (PC 0-5 = Presets A-F)
    { id: 'dg-preset-a', name: 'Preset A', description: 'Recall Preset A (PC 0)', messages: [{ type: 'pc', program: 0 }] },
    { id: 'dg-preset-b', name: 'Preset B', description: 'Recall Preset B (PC 1)', messages: [{ type: 'pc', program: 1 }] },
    { id: 'dg-preset-c', name: 'Preset C', description: 'Recall Preset C (PC 2)', messages: [{ type: 'pc', program: 2 }] },
    { id: 'dg-preset-d', name: 'Preset D', description: 'Recall Preset D (PC 3)', messages: [{ type: 'pc', program: 3 }] },
    { id: 'dg-preset-e', name: 'Preset E', description: 'Recall Preset E (PC 4)', messages: [{ type: 'pc', program: 4 }] },
    { id: 'dg-preset-f', name: 'Preset F', description: 'Recall Preset F (PC 5)', messages: [{ type: 'pc', program: 5 }] },

    // Drive
    {
      id: 'dg-drive',
      name: 'Drive',
      description: 'Set drive level (CC#21, 0-127)',
      messages: [{ type: 'cc', controller: 21, valueParam: 'drive' }],
      parameters: [{ name: 'drive', label: 'Drive (0-127)', min: 0, max: 127, defaultValue: 64 }]
    },

    // Alpha-Omega Mix
    {
      id: 'dg-ao-mix',
      name: 'Alpha-Omega Mix',
      description: 'Alpha-Omega mix (CC#22, 0-127)',
      messages: [{ type: 'cc', controller: 22, valueParam: 'mix' }],
      parameters: [{ name: 'mix', label: 'Mix (0-127)', min: 0, max: 127, defaultValue: 64 }]
    },

    // 6-band EQ (Sliders 1-6)
    {
      id: 'dg-eq1',
      name: 'EQ Slider 1',
      description: 'EQ band 1 (CC#23, 0-127)',
      messages: [{ type: 'cc', controller: 23, valueParam: 'eq1' }],
      parameters: [{ name: 'eq1', label: 'Slider 1 (0-127)', min: 0, max: 127, defaultValue: 64 }]
    },
    {
      id: 'dg-eq2',
      name: 'EQ Slider 2',
      description: 'EQ band 2 (CC#24, 0-127)',
      messages: [{ type: 'cc', controller: 24, valueParam: 'eq2' }],
      parameters: [{ name: 'eq2', label: 'Slider 2 (0-127)', min: 0, max: 127, defaultValue: 64 }]
    },
    {
      id: 'dg-eq3',
      name: 'EQ Slider 3',
      description: 'EQ band 3 (CC#25, 0-127)',
      messages: [{ type: 'cc', controller: 25, valueParam: 'eq3' }],
      parameters: [{ name: 'eq3', label: 'Slider 3 (0-127)', min: 0, max: 127, defaultValue: 64 }]
    },
    {
      id: 'dg-eq4',
      name: 'EQ Slider 4',
      description: 'EQ band 4 (CC#26, 0-127)',
      messages: [{ type: 'cc', controller: 26, valueParam: 'eq4' }],
      parameters: [{ name: 'eq4', label: 'Slider 4 (0-127)', min: 0, max: 127, defaultValue: 64 }]
    },
    {
      id: 'dg-eq5',
      name: 'EQ Slider 5',
      description: 'EQ band 5 (CC#27, 0-127)',
      messages: [{ type: 'cc', controller: 27, valueParam: 'eq5' }],
      parameters: [{ name: 'eq5', label: 'Slider 5 (0-127)', min: 0, max: 127, defaultValue: 64 }]
    },
    {
      id: 'dg-eq6',
      name: 'EQ Slider 6',
      description: 'EQ band 6 (CC#28, 0-127)',
      messages: [{ type: 'cc', controller: 28, valueParam: 'eq6' }],
      parameters: [{ name: 'eq6', label: 'Slider 6 (0-127)', min: 0, max: 127, defaultValue: 64 }]
    },

    // Dist. Blend
    {
      id: 'dg-dist-blend',
      name: 'Dist. Blend',
      description: 'Distortion blend (CC#29, 0-127)',
      messages: [{ type: 'cc', controller: 29, valueParam: 'distBlend' }],
      parameters: [{ name: 'distBlend', label: 'Dist. Blend (0-127)', min: 0, max: 127, defaultValue: 64 }]
    },

    // Tuner
    { id: 'dg-tuner', name: 'Tuner', description: 'Toggle tuner (PC 6)', messages: [{ type: 'pc', program: 6 }] }
  ]
}
