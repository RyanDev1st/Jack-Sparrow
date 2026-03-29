import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { devApiMiddleware } from '../main/devApiMiddleware'

export default defineConfig(({ mode }) => {
  const mainEnv = loadEnv(mode, path.resolve(__dirname, '../main'), '')
  Object.entries(mainEnv).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value
    }
  })

  return {
    envDir: '../main',
    plugins: [tailwindcss(), react(), devApiMiddleware()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 5173,
      fs: {
        allow: [path.resolve(__dirname, '..')],
      },
    },
  }
})
