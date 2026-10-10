import path from 'node:path'
import { rm } from 'node:fs/promises'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

function dropMockFromBuild(keepMock) {
  let outDir
  return {
    name: 'drop-mock-from-build',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      if (!keepMock) await rm(path.join(outDir, 'mock'), { recursive: true, force: true })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), dropMockFromBuild(env.VITE_USE_MOCK === 'true')],
    server: {
      proxy: { '/api': { target: 'https://chhaya.duckdns.org', changeOrigin: true } },
    },
  }
})
