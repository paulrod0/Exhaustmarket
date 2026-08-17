import { readFileSync } from 'node:fs'
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3'

let env = ''
for (const f of ['../.env.new', '../.env']) { try { env += '\n' + readFileSync(new URL(f, import.meta.url), 'utf8') } catch { /* skip */ } }
const get = (k) => (env.match(new RegExp('^\\s*' + k + '\\s*=\\s*(.+)$', 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '')

const ACCOUNT_ID = get('R2_ACCOUNT_ID')
const ACCESS_KEY_ID = get('R2_ACCESS_KEY_ID')
const SECRET_ACCESS_KEY = get('R2_SECRET_ACCESS_KEY')
const BUCKET = get('R2_BUCKET') || 'exhaustmarket-media'

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) throw new Error('Faltan credenciales R2 en .env.new')

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
})

await s3.send(new PutBucketCorsCommand({
  Bucket: BUCKET,
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedOrigins: [
          'https://exhaustmarket.vercel.app',
          'https://*.vercel.app',
          'http://localhost:5173',
          'http://localhost:5174',
        ],
        AllowedMethods: ['PUT', 'GET', 'HEAD'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      },
    ],
  },
}))

const check = await s3.send(new GetBucketCorsCommand({ Bucket: BUCKET }))
console.log('CORS aplicado a', BUCKET + ':')
console.log(JSON.stringify(check.CORSRules, null, 2))
