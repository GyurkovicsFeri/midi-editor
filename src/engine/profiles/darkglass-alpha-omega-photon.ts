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

    // Bypass / Engage
    { id: 'dg-engage',  name: 'Engage',  description: 'Engage the unit (CC#20=127)', messages: [{ type: 'cc', controller: 20, value: 127 }] },
    { id: 'dg-bypass',  name: 'Bypass',  description: 'Bypass the unit (CC#20=0)',   messages: [{ type: 'cc', controller: 20, value: 0   }] },

    // Continuous controls
    {
      id: 'dg-drive',
      name: 'Drive',
      description: 'Set drive level (CC#21, 0-127)',
      messages: [{ type: 'cc', controller: 21, valueParam: 'drive' }],
      parameters: [{ name: 'drive', label: 'Drive (0-127)', min: 0, max: 127, defaultValue: 64 }]
    },
    {
      id: 'dg-blend',
      name: 'Blend',
      description: 'Set clean/dirt blend (CC#22, 0-127)',
      messages: [{ type: 'cc', controller: 22, valueParam: 'blend' }],
      parameters: [{ name: 'blend', label: 'Blend (0-127)', min: 0, max: 127, defaultValue: 64 }]
    },
    {
      id: 'dg-bass',
      name: 'Bass EQ',
      description: 'Bass EQ cut/boost (CC#23, 64=flat)',
      messages: [{ type: 'cc', controller: 23, valueParam: 'bass' }],
      parameters: [{ name: 'bass', label: 'Bass (0-127, 64=flat)', min: 0, max: 127, defaultValue: 64 }]
    },
    {
      id: 'dg-mid',
      name: 'Mid EQ',
      description: 'Mid EQ cut/boost (CC#24, 64=flat)',
      messages: [{ type: 'cc', controller: 24, valueParam: 'mid' }],
      parameters: [{ name: 'mid', label: 'Mid (0-127, 64=flat)', min: 0, max: 127, defaultValue: 64 }]
    },
    {
      id: 'dg-treble',
      name: 'Treble EQ',
      description: 'Treble EQ cut/boost (CC#25, 64=flat)',
      messages: [{ type: 'cc', controller: 25, valueParam: 'treble' }],
      parameters: [{ name: 'treble', label: 'Treble (0-127, 64=flat)', min: 0, max: 127, defaultValue: 64 }]
    },
    {
      id: 'dg-level',
      name: 'Master Level',
      description: 'Master output level (CC#26, 0-127)',
      messages: [{ type: 'cc', controller: 26, valueParam: 'level' }],
      parameters: [{ name: 'level', label: 'Level (0-127)', min: 0, max: 127, defaultValue: 100 }]
    },
    {
      id: 'dg-compression',
      name: 'Compression',
      description: 'Compression amount (CC#27, 0-127)',
      messages: [{ type: 'cc', controller: 27, valueParam: 'compression' }],
      parameters: [{ name: 'compression', label: 'Compression (0-127)', min: 0, max: 127, defaultValue: 0 }]
    },

    // Distortion character
    { id: 'dg-mode-alpha', name: 'Dist: Alpha', description: 'Distortion character: Alpha (CC#28=0)',   messages: [{ type: 'cc', controller: 28, value: 0   }] },
    { id: 'dg-mode-omega', name: 'Dist: Omega', description: 'Distortion character: Omega (CC#28=127)', messages: [{ type: 'cc', controller: 28, value: 127 }] },

    // Cab sim
    { id: 'dg-cab-on',  name: 'Cab Sim On',  description: 'Enable cab simulation (CC#29=127)', messages: [{ type: 'cc', controller: 29, value: 127 }] },
    { id: 'dg-cab-off', name: 'Cab Sim Off', description: 'Disable cab simulation (CC#29=0)',  messages: [{ type: 'cc', controller: 29, value: 0   }] }
  ]
}
