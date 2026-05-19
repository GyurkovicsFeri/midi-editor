import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#111827',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  let forceClose = false

  mainWindow.on('close', async (e) => {
    if (forceClose) return
    e.preventDefault()
    try {
      const isDirty = await mainWindow!.webContents.executeJavaScript(
        'window.__getIsDirty ? window.__getIsDirty() : false'
      )
      if (!isDirty) {
        forceClose = true
        mainWindow!.close()
        return
      }
      const { response } = await dialog.showMessageBox(mainWindow!, {
        type: 'warning',
        buttons: ['Save', "Don't Save", 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        message: 'You have unsaved changes.',
        detail: 'Do you want to save before closing?'
      })
      if (response === 0) {
        await mainWindow!.webContents.executeJavaScript('window.__saveProject ? window.__saveProject() : Promise.resolve()')
        forceClose = true
        mainWindow!.close()
      } else if (response === 1) {
        forceClose = true
        mainWindow!.close()
      }
    } catch {
      forceClose = true
      mainWindow!.close()
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('dialog:openFile', async (_event, options: { filters?: Electron.FileFilter[] }) => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options.filters
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('dialog:saveFile', async (_event, options: { filters?: Electron.FileFilter[], defaultPath?: string }) => {
  if (!mainWindow) return null
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: options.filters,
    defaultPath: options.defaultPath
  })
  if (result.canceled) return null
  return result.filePath
})
