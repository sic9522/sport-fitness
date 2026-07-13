import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Separa le dipendenze pesanti in chunk vendor dedicati: nessun singolo
        // chunk > 500kB e caching migliore (i vendor cambiano di rado).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('@dnd-kit')) return 'dnd'
          if (id.includes('react-easy-crop') || id.includes('tslib')) return 'crop'
          if (
            id.includes('react-router') ||
            id.includes('react-dom') ||
            id.includes('/scheduler/') ||
            id.includes('/react/')
          ) {
            return 'react-vendor'
          }
          return 'vendor'
        },
      },
    },
  },
})
