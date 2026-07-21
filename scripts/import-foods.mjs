import { createClient } from '@supabase/supabase-js'
import { createReadStream, existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { createGunzip } from 'node:zlib'
import path from 'node:path'
import { normalizeOff, normalizeFdc, hasNutrition, isPlausibleNutrition } from './food-normalize.mjs'

// Import in blocco del catalogo alimenti unificato (public.food_items) dai dump di
// Open Food Facts e FoodData Central. Local-first: l'app poi legge SOLO dal tuo DB,
// senza dipendere dalle API a runtime.
//
// Formati accettati per ogni file:
//   - JSONL / JSONL.gz (un record per riga): lo streaming regge file da molti GB e il .gz
//     si legge senza scompattarlo. È il formato del dump OFF (openfoodfacts-products.jsonl.gz)
//     e quello consigliato per FDC "Branded" (grande): jq -c '.BrandedFoods[]' ... > x.jsonl
//   - JSON (.json): file letto INTERO in memoria, con auto-rilevamento dell'array
//     (FoundationFoods / SRLegacyFoods / SurveyFoods / products…). Comodo per i dataset FDC
//     PICCOLI (Foundation, SR Legacy, Survey/FNDDS) senza passare da jq. NON usarlo per il
//     Branded (troppo grande per la memoria).
//
// --off e --fdc si possono ripetere per importare più file in un colpo.
// Uso:
//   npm run import:foods -- --fdc data/fdc-foundation.json --fdc data/fdc-survey.json
//   npm run import:foods -- --off data/openfoodfacts-products.jsonl.gz --require-region

const BATCH_SIZE = 500

// Un import di centinaia di migliaia di righe sono migliaia di richieste HTTPS su decine
// di minuti: una caduta di connessione (ECONNRESET, fetch failed) è la norma, non
// l'eccezione, e senza ritentativi butterebbe via tutto il lavoro fatto fino a lì.
const MAX_RETRIES = 6
const RETRY_BASE_MS = 1000

const sleep = ms => new Promise(r => setTimeout(r, ms))

function parseArgs(argv) {
  const args = { off: [], fdc: [], dryRun: false, limit: Infinity, requireRegion: false, onlyRegion: null, onlyCountry: null }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--off') args.off.push(argv[++i])
    else if (arg === '--fdc') args.fdc.push(argv[++i])
    else if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--limit') args.limit = Number(argv[++i])
    else if (arg === '--require-region') args.requireRegion = true
    else if (arg === '--only-region') args.onlyRegion = argv[++i]
    else if (arg === '--only-country') args.onlyCountry = String(argv[++i] || '').toLowerCase()
    else if (arg === '--help') { printHelp(); process.exit(0) }
  }
  return args
}

function printHelp() {
  console.log(`
Import del catalogo alimenti (food_items) da Open Food Facts e FoodData Central.

Uso:
  npm run import:foods -- --fdc <file> [--fdc <file> ...] [--off <file> ...] [opzioni]

Opzioni:
  --off <path>       Sorgente Open Food Facts (.jsonl, .jsonl.gz o .json). Ripetibile.
  --fdc <path>       Sorgente FoodData Central (.jsonl, .jsonl.gz o .json). Ripetibile.
  --dry-run          Normalizza e conta senza scrivere su Supabase (nessuna credenziale).
  --limit N          Ferma OGNI file dopo N righe (utile per provare).
  --require-region   Scarta anche i prodotti senza regione (EU/US/CN): DB ancora più snello.
  --only-region <r>  Tiene SOLO i prodotti di quel mercato, es. --only-region eu
                     (europei + brand americani venduti in Europa). Per contenere lo spazio.
  --only-country <c> Tiene SOLO i prodotti venduti in quel paese (slug OFF), es.
                     --only-country italy. È il filtro più selettivo: sul dump completo
                     l'Italia vale ~150k righe contro ~2.2M del totale, e sta comodamente
                     nel piano gratuito di Supabase. Riguarda solo le sorgenti OFF (FDC
                     non ha countries_tags). Salta il parsing JSON delle righe che non
                     citano il paese, quindi è anche molto più veloce.

Di default scarta i prodotti "solo titolo" senza kcal e macronutrienti.
`)
}

async function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const raw = await readFile(filePath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 0) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

// Itera i record di una sorgente.
// - .json: file INTERO in memoria; usa l'array se è già un array, altrimenti la prima
//   proprietà array trovata (FoundationFoods / SRLegacyFoods / SurveyFoods / products…).
// - altrimenti JSONL riga per riga (memory-safe per file da molti GB); .gz decompresso
//   in streaming (sul disco basta il .gz, niente JSONL scompattato).
// `lineFilter` (opzionale) riceve la riga GREZZA e, se restituisce false, la scarta senza
// fare JSON.parse. Su un dump da decine di GB il parsing è il collo di bottiglia, e un
// semplice test di sottostringa evita di costruire l'oggetto per le righe che non servono.
// Può solo produrre falsi positivi (poi eliminati dal controllo vero dopo il parse).
async function* readRecords(filePath, lineFilter) {
  if (filePath.endsWith('.json')) {
    const parsed = JSON.parse(await readFile(filePath, 'utf8'))
    const arr = Array.isArray(parsed) ? parsed : Object.values(parsed).find(Array.isArray)
    for (const r of arr || []) yield r
    return
  }
  const input = filePath.endsWith('.gz')
    ? createReadStream(filePath).pipe(createGunzip())
    : createReadStream(filePath, 'utf8')
  const rl = createInterface({ input, crlfDelay: Infinity })
  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (lineFilter && !lineFilter(trimmed)) continue
    try {
      yield JSON.parse(trimmed)
    } catch {
      // riga malformata nel dump → salta
    }
  }
}

// Tag OFF del paese: 'italy' o 'en:italy' → 'en:italy'.
function countryTag(country) {
  const c = String(country || '').toLowerCase()
  return c.includes(':') ? c : `en:${c}`
}

// Scorre una sorgente, normalizza, accumula in batch e li scrive (o li conta in dry-run).
async function importSource({ label, filePath, normalize, client, args, counters }) {
  if (!existsSync(filePath)) throw new Error(`File non trovato (${label}): ${filePath}`)
  console.log(`\n[${label}] import da ${filePath}${args.dryRun ? ' (dry-run)' : ''}`)

  let seen = 0
  let batch = []
  const sample = []

  // Scrive un batch ritentando con backoff esponenziale. L'upsert è idempotente
  // (chiave source,source_id), quindi riprovare non duplica nulla.
  async function writeBatch(rows) {
    let delay = RETRY_BASE_MS
    for (let attempt = 1; ; attempt += 1) {
      const { error } = await client.from('food_items').upsert(rows, { onConflict: 'source,source_id' })
      if (!error) return
      if (attempt >= MAX_RETRIES) throw error
      console.log(`  ! scrittura fallita (${attempt}/${MAX_RETRIES}): ${error.message} — riprovo tra ${delay} ms`)
      counters.retries += 1
      await sleep(delay)
      delay *= 2
    }
  }

  async function flush() {
    if (!batch.length) return
    if (!args.dryRun) await writeBatch(batch)
    counters.written += batch.length
    batch = []
  }

  // Filtro per paese: prima il test rapido sulla riga grezza (salta il parse), poi il
  // controllo vero sui countries_tags del prodotto.
  const tag = args.onlyCountry ? countryTag(args.onlyCountry) : null
  const lineFilter = tag ? line => line.includes(`"${tag}"`) : null

  for await (const raw of readRecords(filePath, lineFilter)) {
    if (seen >= args.limit) break
    seen += 1
    counters.seen += 1
    if (tag && !(raw.countries_tags || []).includes(tag)) { counters.skippedNoCountry += 1; continue }
    const row = normalize(raw)
    if (!row) { counters.skipped += 1; continue }
    if (!hasNutrition(row)) { counters.skippedNoNutrition += 1; continue } // solo titolo, senza dati
    if (!isPlausibleNutrition(row)) { counters.skippedImplausible += 1; continue } // valori impossibili nella fonte
    if (args.onlyRegion && !row.regions.includes(args.onlyRegion)) { counters.skippedNoRegion += 1; continue }
    else if (args.requireRegion && row.regions.length === 0) { counters.skippedNoRegion += 1; continue }
    if (sample.length < 2) sample.push(row)
    batch.push(row)
    if (batch.length >= BATCH_SIZE) await flush()
    if (counters.seen % 50000 === 0) console.log(`  … ${counters.seen} righe lette, ${counters.written} scritte`)
  }
  await flush()

  if (args.dryRun && sample.length) {
    console.log(`[${label}] esempio righe normalizzate:`)
    for (const r of sample) console.log('  ' + JSON.stringify(r))
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.off.length && !args.fdc.length) {
    printHelp()
    throw new Error('Serve almeno --off o --fdc')
  }

  let client = null
  if (!args.dryRun) {
    await loadEnvFile(path.resolve('.env.local'))
    client = createClient(requireEnv('VITE_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false },
    })
  }

  const counters = {
    seen: 0, written: 0, skipped: 0,
    skippedNoNutrition: 0, skippedImplausible: 0, skippedNoRegion: 0, skippedNoCountry: 0,
    retries: 0,
  }

  for (const p of args.fdc) {
    await importSource({ label: 'FDC', filePath: path.resolve(p), normalize: normalizeFdc, client, args, counters })
  }
  for (const p of args.off) {
    await importSource({ label: 'OFF', filePath: path.resolve(p), normalize: normalizeOff, client, args, counters })
  }

  console.log('\nImport finito:', counters)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
