// Genera le icone PNG della PWA dal marchio FitPulse.
// Uso: npm run icons
// Sorgente: una versione PULITA del logo (sfondo accento full-bleed + bolt
// bianco), senza i filtri blur del favicon.svg, cosi' rasterizza in modo nitido
// e il bolt resta nella safe-zone dell'icona maskable (~80% centrale).
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const ACCENT = '#863bff'
// Path del bolt dal favicon (viewBox 48x46), centrato e scalato su 512x512.
const BOLT =
  'M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z'

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${ACCENT}"/>
  <g transform="translate(256 256) scale(6.5) translate(-24 -23)">
    <path fill="#ffffff" d="${BOLT}"/>
  </g>
</svg>`

function renderPng(size) {
  const resvg = new Resvg(ICON_SVG, { fitTo: { mode: 'width', value: size } })
  return resvg.render().asPng()
}

const outputs = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

for (const { file, size } of outputs) {
  writeFileSync(resolve(publicDir, file), renderPng(size))
  console.log(`✓ ${file} (${size}x${size})`)
}
