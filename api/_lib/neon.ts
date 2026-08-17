// Neon Postgres serverless client for Vercel Functions
import { neon } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  // Functions throw at runtime; this just helps locally
  console.warn('[neon] DATABASE_URL not set')
}

export const sql = neon(process.env.DATABASE_URL!)
