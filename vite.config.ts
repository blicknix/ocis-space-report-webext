import { defineConfig } from '@ownclouders/extension-sdk'

// Fixed entry file name so public/manifest.json can point at it without a hash.
export default defineConfig({
  name: 'space-report',
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'js/space-report.js'
      }
    }
  }
})
