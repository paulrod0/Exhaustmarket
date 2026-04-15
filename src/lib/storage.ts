import { supabase } from './supabase'

const BUCKET = 'exhaust-photos'

function sanitize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

/**
 * Upload a file to the public exhaust-photos bucket.
 * Returns the public URL.
 */
export async function uploadExhaustPhoto(
  file: File,
  schemaId: string,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const safeExt = sanitize(ext).slice(0, 5) || 'jpg'
  const path = `${schemaId}/${randomId()}-${sanitize(file.name.slice(0, 40))}.${safeExt}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Delete a photo from the bucket by its public URL.
 */
export async function deleteExhaustPhoto(publicUrl: string): Promise<void> {
  const marker = `/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return
  const path = publicUrl.slice(idx + marker.length)
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}
