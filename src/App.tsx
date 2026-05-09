import { Toolbar } from './components/layout/Toolbar'
import { StatusBar } from './components/layout/StatusBar'
import { Timeline } from './components/timeline/Timeline'
import { DevicePanel } from './components/sidebar/DevicePanel'
import { SongSettings } from './components/dialogs/SongSettings'
import { SetlistManager } from './components/dialogs/SetlistManager'
import { useUIStore } from './stores/ui-store'

export function App() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const songSettingsOpen = useUIStore((s) => s.songSettingsOpen)
  const setlistOpen = useUIStore((s) => s.setlistOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)

  return (
    <div className="h-screen flex flex-col">
      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-52 bg-gray-800/50 border-r border-gray-700 flex flex-col shrink-0">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Commands
              </span>
              <button
                onClick={toggleSidebar}
                className="text-gray-500 hover:text-gray-300"
                title="Hide sidebar"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
                  <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DevicePanel />
            </div>
          </div>
        )}

        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="w-6 bg-gray-800/30 hover:bg-gray-700/50 border-r border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-300 shrink-0"
            title="Show sidebar"
          >
            <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current">
              <path d="M6 3l5 5-5 5V3z" />
            </svg>
          </button>
        )}

        {/* Timeline */}
        <Timeline />
      </div>

      <StatusBar />

      {/* Dialogs */}
      {songSettingsOpen && <SongSettings />}
      {setlistOpen && <SetlistManager />}
    </div>
  )
}
