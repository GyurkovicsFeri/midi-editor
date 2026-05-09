import { Toolbar } from './components/layout/Toolbar'
import { StatusBar } from './components/layout/StatusBar'
import { Timeline } from './components/timeline/Timeline'
import { EventListView } from './components/timeline/EventListView'
import { DevicePanel } from './components/sidebar/DevicePanel'
import { SongSettings } from './components/dialogs/SongSettings'
import { SetlistManager } from './components/dialogs/SetlistManager'
import { HelpDialog } from './components/dialogs/HelpDialog'
import { useUIStore } from './stores/ui-store'

export function App() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const songSettingsOpen = useUIStore((s) => s.songSettingsOpen)
  const setlistOpen = useUIStore((s) => s.setlistOpen)
  const helpOpen = useUIStore((s) => s.helpOpen)
  const viewMode = useUIStore((s) => s.viewMode)
  const setViewMode = useUIStore((s) => s.setViewMode)
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

        {/* Main view */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* View toggle */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 border-b border-gray-700 shrink-0">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
                <path d="M1 3.75A.75.75 0 011.75 3h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 3.75zm0 4A.75.75 0 011.75 7h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 7.75zm0 4A.75.75 0 011.75 11h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 11.75z" />
              </svg>
              Timeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
                <path d="M2 2h2v2H2V2zm0 5h2v2H2V7zm0 5h2v2H2v-2zm4-10h8v2H6V2zm0 5h8v2H6V7zm0 5h8v2H6v-2z" />
              </svg>
              Event List
            </button>
          </div>

          {viewMode === 'timeline' ? <Timeline /> : <EventListView />}
        </div>
      </div>

      <StatusBar />

      {/* Dialogs */}
      {songSettingsOpen && <SongSettings />}
      {setlistOpen && <SetlistManager />}
      {helpOpen && <HelpDialog />}
    </div>
  )
}
