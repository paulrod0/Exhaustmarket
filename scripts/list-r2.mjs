import { readFileSync } from 'node:fs'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

let env = ''
for (const f of ['../.env.new', '../.env']) { try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ } }
const get = (k) => (env.match(new RegExp('^\\s*' + k + '\\s*=\\s*(.+)$', 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '')

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: get('R2_ACCESS_KEY_ID'), secretAccessKey: get('R2_SECRET_ACCESS_KEY') },
})
const BUCKET = get('R2_BUCKET') || 'exhaustmarket-media'

const out = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 100 }))
console.log('objetos en', BUCKET, ':', out.KeyCount)
for (const o of out.Contents ?? []) console.log('  ', o.Key, '·', (o.Size / 1024).toFixed(0) + 'KB')
