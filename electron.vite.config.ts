import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: resolve('electron/main.ts')
      },
      outDir: 'dist/main'
    }
  },
  preload: {
    build: {
      lib: {
        entry: resolve('electron/preload.ts')
      },
      outDir: 'dist/preload'
    }
  },
  renderer: {
    root: '.',
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: resolve('index.html')
      }
    },
    plugins: [tailwindcss(), react()]
  }
})
