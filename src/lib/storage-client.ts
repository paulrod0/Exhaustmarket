/**
 * Cliente storage que reemplaza supabase.storage. Sube a Cloudflare R2 via
 * presigned URL generada por /api/upload, y borra via /api/storage-delete.
 */

let getAuthHeader: () => Promise<string | null> = async () => null

export function configureStorageAuth(fn: () => Promise<string | null>): void {
  getAuthHeader = fn
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  const token = await getAuthHeader()
  if (token) headers.authorization = `Bearer ${token}`
  return headers
}

/**
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  bucket: string,
  prefix: string,
  file: File,
): Promise<string> {
  const initRes = await fetch('/api/upload', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      bucket,
      prefix,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
    }),
  })
  if (!initRes.ok) throw new Error(`upload init failed: ${initRes.status}`)
  const { uploadUrl, publicUrl } = (await initRes.json()) as {
    uploadUrl: string
    publicUrl: string
  }

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type || 'application/octet-stream' },
    body: file,
  })
  if (!putRes.ok) throw new Error(`R2 upload failed: ${putRes.status}`)

  return publicUrl
}

export async function deleteFile(publicUrl: string): Promise<void> {
  const res = await fetch('/api/storage-delete', {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ publicUrl }),
  })
  if (!res.ok) throw new Error(`delete failed: ${res.status}`)
}

/**
 * Compatibility shim that mimics supabase.storage.from(bucket).
 */
class BucketClient {
  constructor(private bucket: string) {}

  async upload(
    path: string,
    file: File,
  ): Promise<{ data: { path: string } | null; error: Error | null }> {
    try {
      const prefix = path.split('/').slice(0, -1).join('/') || 'misc'
      const url = await uploadFile(this.bucket, prefix, file)
      return { data: { path: url }, error: null }
    } catch (e) {
      return { data: null, error: e as Error }
    }
  }

  getPublicUrl(path: string): { data: { publicUrl: string } } {
    // path is already a full URL when produced by upload()
    return { data: { publicUrl: path } }
  }

  async remove(paths: string[]): Promise<{ error: Error | null }> {
    try {
      for (const p of paths) await deleteFile(p)
      return { error: null }
    } catch (e) {
      return { error: e as Error }
    }
  }
}

export const storage = {
  from(bucket: string): BucketClient {
    return new BucketClient(bucket)
  },
}
