import { contextBridge, ipcRenderer } from 'electron'
import type { FileFilter } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: (options: { filters?: FileFilter[] }) =>
    ipcRenderer.invoke('dialog:openFile', options),
  saveFileDialog: (options: { filters?: FileFilter[], defaultPath?: string }) =>
    ipcRenderer.invoke('dialog:saveFile', options)
})
