import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

// Certificato mkcert per la LAN (`npm run certs` lo genera in ./certs, ignorata da git
// perché contiene la chiave privata). A differenza di basicSsl, questo è firmato dalla
// CA locale di mkcert: installandola sull'iPhone, Safari accetta l'indirizzo IP senza
// avvisi — l'unico modo per usare la fotocamera da telefono restando in LAN.
// Se i file non ci sono si ricade su basicSsl, che basta per il desktop.
const certDir = fileURLToPath(new URL('./certs', import.meta.url))
const certFile = path.join(certDir, 'dev-cert.pem')
const keyFile = path.join(certDir, 'dev-key.pem')
const hasLocalCert = existsSync(certFile) && existsSync(keyFile)

// Tunnel pubblico in sviluppo (`npm run dev:tunnel`, poi cloudflared/ngrok verso la
// 5173). È l'unico modo pratico per usare la FOTOCAMERA da iPhone: il tunnel espone
// l'app su un dominio con certificato VALIDO, mentre un self-signed su indirizzo IP
// Safari lo rifiuta e basicSsl non può farci nulla. Qui Vite resta in HTTP: il TLS lo
// mette il tunnel, quindi non serve alcun certificato locale.
const tunnel = process.env.VITE_DEV_TUNNEL === '1'

const tunnelServer = {
  // Vite rifiuta gli host che non conosce: senza questo il tunnel risponde
  // "Blocked request. This host is not allowed."
  allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.io', '.loca.lt'],
  // Il client HMR va verso la porta pubblica del tunnel (443 in TLS), non la 5173.
  hmr: { clientPort: 443, protocol: 'wss' },
}

const server = {
  port: 5173,
  // Senza strictPort, se la 5173 e' occupata Vite passa SILENZIOSAMENTE alla 5174.
  // L'app cambia origine, quindi il redirect OAuth (costruito su window.location.origin)
  // torna su una porta che spesso non e' piu' in ascolto, e che comunque Supabase non ha
  // fra i Redirect URLs: il login sembra fallire pur essendo andato a buon fine.
  // Meglio fallire subito, cosi' si nota il server rimasto aperto e lo si chiude.
  strictPort: true,
  ...(tunnel ? tunnelServer : {}),
  ...(httpsInDev && hasLocalCert
    ? { https: { cert: readFileSync(certFile), key: readFileSync(keyFile) } }
    : {}),
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // basicSsl serve solo come ripiego: se c'è il certificato mkcert lo si preferisce
    // (vedi httpsServer sotto), perché quello di basicSsl iOS non lo accetta.
    httpsInDev && !hasLocalCert && basicSsl(),
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
  server,
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
