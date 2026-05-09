import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/midi-editor/' : '/',
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
