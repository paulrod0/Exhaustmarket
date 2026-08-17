import { neon, Pool } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) throw new Error('Missing DATABASE_URL env var')

/** Tagged template: sql`SELECT * FROM x WHERE id = ${id}`. */
export const sql = neon(url)

/** Para queries con strings dinamicos + array de valores. */
export const pool = new Pool({ connectionString: url })
