import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_JSON_PATH = 'data/exercises.json'
const DEFAULT_IMAGES_DIR = 'data/exercises'
const MEDIA_BUCKET = 'exercise-media'

function parseArgs(argv) {
  const args = {
    json: DEFAULT_JSON_PATH,
    imagesDir: DEFAULT_IMAGES_DIR,
    dryRun: false,
    skipImages: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--json') args.json = argv[++i]
    else if (arg === '--images-dir') args.imagesDir = argv[++i]
    else if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--skip-images') args.skipImages = true
    else if (arg === '--help') {
      printHelp()
      process.exit(0)
    }
  }

  return args
}

function printHelp() {
  console.log(`
Usage:
  npm run import:exercises -- --json data/exercises.json --images-dir data/exercises

Options:
  --json <path>         Source exercises.json path.
  --images-dir <path>   Source image directory.
  --dry-run             Validate and transform without writing to Supabase.
  --skip-images         Import database rows without uploading images.
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

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (value == null || value === '') return []
  return [value]
}

function titleFromSlug(value) {
  return String(value || '')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getSourceExternalId(raw, index) {
  return String(raw.id ?? raw.exerciseId ?? raw.exercise_id ?? raw.name ?? index)
}

function getName(raw) {
  return raw.name ?? raw.title ?? raw.exerciseName
}

function getInstructions(raw) {
  return asArray(raw.instructions ?? raw.steps ?? raw.instruction)
    .map(String)
    .map(s => s.trim())
    .filter(Boolean)
}

function getImages(raw) {
  return asArray(raw.images ?? raw.image ?? raw.imageUrl ?? raw.gifUrl)
    .map(String)
    .filter(Boolean)
}

function mapExercise(raw, index, sourceId) {
  const sourceExternalId = getSourceExternalId(raw, index)
  const name = getName(raw)
  if (!name) throw new Error(`Exercise at index ${index} has no name`)

  const slug = slugify(`${sourceExternalId}-${name}`)
  const primaryMuscles = asArray(raw.primaryMuscles ?? raw.primary_muscles ?? raw.target)
  const secondaryMuscles = asArray(raw.secondaryMuscles ?? raw.secondary_muscles)
  const equipment = asArray(raw.equipment)
  const categories = asArray(raw.category ?? raw.bodyPart ?? raw.body_part)

  return {
    exercise: {
      source_id: sourceId,
      source_external_id: sourceExternalId,
      slug,
      name_en: String(name).trim(),
      description_en: raw.description ? String(raw.description).trim() : null,
      instructions_en: getInstructions(raw),
      difficulty: raw.level ?? raw.difficulty ?? null,
      is_active: true,
      raw_payload: raw,
    },
    aliases: [
      String(name).trim(),
      slug.replaceAll('-', ' '),
      ...asArray(raw.aliases),
    ],
    muscles: [
      ...primaryMuscles.map(nameEn => ({ nameEn, role: 'primary' })),
      ...secondaryMuscles.map(nameEn => ({ nameEn, role: 'secondary' })),
    ],
    equipment: equipment.map(nameEn => ({ nameEn })),
    categories: categories.map(nameEn => ({ nameEn })),
    images: getImages(raw),
  }
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.mp4') return 'video/mp4'
  if (ext === '.webm') return 'video/webm'
  return 'application/octet-stream'
}

async function findImagePath(imagesDir, imageRef) {
  if (/^https?:\/\//i.test(imageRef)) return null

  const direct = path.resolve(imagesDir, imageRef)
  if (existsSync(direct)) return direct

  const basename = path.basename(imageRef)
  const files = await readdir(imagesDir, { recursive: true }).catch(() => [])
  const match = files.find(file => path.basename(file) === basename)
  return match ? path.resolve(imagesDir, match) : null
}

async function upsertByUnique(client, table, payload, onConflict) {
  const { data, error } = await client
    .schema('catalog')
    .from(table)
    .upsert(payload, { onConflict })
    .select()
    .single()

  if (error) throw error
  return data
}

async function upsertLookup(client, table, nameEn) {
  const slug = slugify(nameEn)
  return upsertByUnique(client, table, { slug, name_en: titleFromSlug(nameEn) }, 'slug')
}

async function uploadExerciseMedia(client, exercise, images, imagesDir) {
  const uploaded = []

  for (const [index, imageRef] of images.entries()) {
    const localPath = await findImagePath(imagesDir, imageRef)
    if (!localPath) {
      uploaded.push({ error: `Image not found: ${imageRef}` })
      continue
    }

    const bytes = await readFile(localPath)
    const checksum = createHash('sha256').update(bytes).digest('hex')
    const ext = path.extname(localPath).toLowerCase() || '.jpg'
    const mediaType = index === 0 ? 'thumbnail' : 'image'
    const storagePath = `exercises/${exercise.slug}/${mediaType}-${index}-${checksum.slice(0, 12)}${ext}`
    const contentType = contentTypeFor(localPath)

    const { error: uploadError } = await client.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, bytes, { contentType, upsert: true })

    if (uploadError) throw uploadError

    const { data: publicUrl } = client.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath)

    const media = await upsertByUnique(client, 'exercise_media', {
      exercise_id: exercise.id,
      type: mediaType,
      provider: 'supabase',
      bucket: MEDIA_BUCKET,
      path: storagePath,
      url: publicUrl.publicUrl,
      source_url: imageRef,
      mime_type: contentType,
      checksum,
      sort_order: index,
    }, 'provider,bucket,path')

    uploaded.push(media)
  }

  return uploaded
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  await loadEnvFile(path.resolve('.env.local'))

  const supabaseUrl = requireEnv('VITE_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const sourceKey = process.env.EXERCISE_IMPORT_SOURCE_KEY || 'free_exercise_db'
  const sourceName = process.env.EXERCISE_IMPORT_SOURCE_NAME || 'Free Exercise DB'

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const rawJson = JSON.parse(await readFile(path.resolve(args.json), 'utf8'))
  const sourceRows = Array.isArray(rawJson) ? rawJson : rawJson.exercises
  if (!Array.isArray(sourceRows)) throw new Error('Expected exercises.json to contain an array or { exercises: [] }')

  console.log(`Import source rows: ${sourceRows.length}`)
  if (args.dryRun) console.log('Dry run enabled: no writes will be performed.')

  const sourcePayload = {
    key: sourceKey,
    name: sourceName,
    metadata: { importer: 'scripts/import-exercises.mjs' },
  }

  const source = args.dryRun
    ? { id: '00000000-0000-0000-0000-000000000000' }
    : await upsertByUnique(client, 'exercise_sources', sourcePayload, 'key')

  const run = args.dryRun
    ? null
    : await client.schema('private').from('import_runs').insert({
      source_key: sourceKey,
      import_type: 'exercise_catalog',
      metadata: { json: args.json, imagesDir: args.imagesDir, skipImages: args.skipImages },
    }).select().single().then(({ data, error }) => {
      if (error) throw error
      return data
    })

  const counters = { seen: 0, inserted: 0, updated: 0, skipped: 0, errors: 0 }

  try {
    for (const [index, raw] of sourceRows.entries()) {
      counters.seen += 1
      try {
        const mapped = mapExercise(raw, index, source.id)
        if (args.dryRun) continue

        const exercise = await upsertByUnique(client, 'exercises', mapped.exercise, 'source_id,source_external_id')

        for (const item of mapped.muscles) {
          const muscle = await upsertLookup(client, 'muscles', item.nameEn)
          await client.schema('catalog').from('exercise_muscles').upsert({
            exercise_id: exercise.id,
            muscle_id: muscle.id,
            role: item.role,
          }, { onConflict: 'exercise_id,muscle_id,role' })
        }

        for (const item of mapped.equipment) {
          const equipment = await upsertLookup(client, 'equipment', item.nameEn)
          await client.schema('catalog').from('exercise_equipment').upsert({
            exercise_id: exercise.id,
            equipment_id: equipment.id,
          }, { onConflict: 'exercise_id,equipment_id' })
        }

        for (const item of mapped.categories) {
          const category = await upsertLookup(client, 'categories', item.nameEn)
          await client.schema('catalog').from('exercise_categories').upsert({
            exercise_id: exercise.id,
            category_id: category.id,
          }, { onConflict: 'exercise_id,category_id' })
        }

        for (const alias of new Set(mapped.aliases.map(normalizeText).filter(Boolean))) {
          await client.schema('catalog').from('exercise_aliases').upsert({
            exercise_id: exercise.id,
            locale: 'en',
            alias,
            normalized_alias: alias,
            source: 'import',
            weight: alias === normalizeText(exercise.name_en) ? 100 : 70,
          }, { onConflict: 'exercise_id,locale,normalized_alias' })
        }

        const searchText = [
          exercise.name_en,
          mapped.aliases.join(' '),
          mapped.muscles.map(m => m.nameEn).join(' '),
          mapped.equipment.map(e => e.nameEn).join(' '),
          mapped.categories.map(c => c.nameEn).join(' '),
        ].filter(Boolean).join(' ')

        await client.schema('catalog').from('exercise_search_documents').upsert({
          exercise_id: exercise.id,
          locale: 'en',
          search_text: searchText,
        }, { onConflict: 'exercise_id' })

        if (!args.skipImages) {
          await uploadExerciseMedia(client, exercise, mapped.images, args.imagesDir)
        }

        counters.updated += 1
      } catch (error) {
        counters.errors += 1
        console.error(`Failed row ${index}: ${error.message}`)
        if (run) {
          await client.schema('private').from('import_errors').insert({
            import_run_id: run.id,
            source_key: sourceKey,
            source_external_id: String(raw?.id ?? index),
            step: 'exercise_import',
            message: error.message,
            payload: raw ?? {},
          })
        }
      }
    }

    if (run) {
      await client.schema('private').from('import_runs').update({
        status: counters.errors ? 'failed' : 'completed',
        finished_at: new Date().toISOString(),
        records_seen: counters.seen,
        records_inserted: counters.inserted,
        records_updated: counters.updated,
        records_skipped: counters.skipped,
        error_message: counters.errors ? `${counters.errors} row(s) failed` : null,
      }).eq('id', run.id)
    }
  } catch (error) {
    if (run) {
      await client.schema('private').from('import_runs').update({
        status: 'failed',
        finished_at: new Date().toISOString(),
        error_message: error.message,
      }).eq('id', run.id)
    }
    throw error
  }

  console.log('Import finished:', counters)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
