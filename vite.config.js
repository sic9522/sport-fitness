import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { VitePWA } from 'vite-plugin-pwa'

// HTTPS in sviluppo solo su richiesta (`npm run dev:https`). Il certificato
// self-signed serve alla fotocamera (getUserMedia, scanner barcode), che esige un
// secure context anche in LAN, ma Safari su iOS rifiuta i self-signed su indirizzo
// IP senza offrire alcun "procedi comunque": tenendolo sempre attivo l'app risulta
// irraggiungibile da iPhone. Default HTTP, HTTPS quando serve la fotocamera.
const httpsInDev = process.env.VITE_DEV_HTTPS === '1'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    httpsInDev && basicSsl(),
    VitePWA({
      registerType: 'autoUpdate', // il SW si aggiorna da solo al deploy successivo
      injectRegister: 'auto',
      // Usa il public/manifest.webmanifest gia' esistente (icone + tema): qui solo SW/precache.
      manifest: false,
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-512.png',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false }, // niente SW in dev
    }),
  ],
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
