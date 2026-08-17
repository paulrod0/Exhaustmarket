import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

let env = ''
for (const f of ['../.env.new', '../.env']) { try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ } }
const get = (k) => (env.match(new RegExp('^\\s*' + k + '\\s*=\\s*(.+)$', 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '')
const DB = get('DATABASE_URL')
const BASE = (get('R2_PUBLIC_BASE_URL') || '').replace(/\/$/, '')
const BUCKET = get('R2_BUCKET') || 'exhaustmarket-media'
const sql = neon(DB)
const s3 = new S3Client({ region: 'auto', endpoint: `https://${get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`, credentials: { accessKeyId: get('R2_ACCESS_KEY_ID'), secretAccessKey: get('R2_SECRET_ACCESS_KEY') } })

// nombre = parte tras el primer '-' del basename (quita el random)
const nameOf = (keyOrUrl) => { const b = keyOrUrl.split('/').pop(); const i = b.indexOf('-'); return i === -1 ? b : b.slice(i + 1) }

const objs = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 500 }))
const byName = new Map()
for (const o of objs.Contents ?? []) byName.set(nameOf(o.Key), `${BASE}/${o.Key}`)
console.log('objetos R2 indexados:', byName.size)

function fixUrl(u) {
  if (!u) return null
  if (u.startsWith('http')) return u // ya correcta
  return byName.get(nameOf(u)) ?? null
}

// design_3d
const designs = await sql`SELECT id, title, file_url, files FROM design_3d`
let d3 = 0
for (const r of designs) {
  const nu = fixUrl(r.file_url)
  const files = Array.isArray(r.files) ? r.files.map((f) => ({ ...f, url: fixUrl(f.url) ?? f.url })) : []
  if (nu && nu !== r.file_url) {
    await sql`UPDATE design_3d SET file_url = ${nu}, files = ${JSON.stringify(files)}::jsonb WHERE id = ${r.id}`
    d3++
    console.log('  3D fijado:', r.title)
  } else if (!nu) {
    console.log('  3D SIN objeto en R2:', r.title, '·', r.file_url)
  }
}

// manuals
const manuals = await sql`SELECT id, title, file_url FROM manuals`
let mn = 0
for (const r of manuals) {
  const nu = fixUrl(r.file_url)
  if (nu && nu !== r.file_url) {
    await sql`UPDATE manuals SET file_url = ${nu} WHERE id = ${r.id}`
    mn++
    console.log('  manual fijado:', r.title)
  } else if (!nu) {
    console.log('  manual SIN objeto en R2:', r.title, '·', r.file_url)
  }
}

console.log(`\nOK. design_3d arreglados: ${d3}, manuales arreglados: ${mn}`)
