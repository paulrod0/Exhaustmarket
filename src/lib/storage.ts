import { supabase } from './supabase'

const EXHAUST_BUCKET = 'exhaust-photos'
const CONTENT_BUCKET = 'content-media'
const TUTORIAL_BUCKET = 'tutorial-files'

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

async function uploadToBucket(
  bucket: string,
  file: File,
  prefix: string,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const safeExt = sanitize(ext).slice(0, 5) || 'jpg'
  const path = `${prefix}/${randomId()}-${sanitize(file.name.slice(0, 40))}.${safeExt}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    })

  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

async function deleteFromBucket(bucket: string, publicUrl: string): Promise<void> {
  const marker = `/${bucket}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return
  const path = publicUrl.slice(idx + marker.length)
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}

/**
 * Upload a photo for an exhaust schema. Returns public URL.
 */
export function uploadExhaustPhoto(file: File, schemaId: string): Promise<string> {
  return uploadToBucket(EXHAUST_BUCKET, file, schemaId)
}

export function deleteExhaustPhoto(publicUrl: string): Promise<void> {
  return deleteFromBucket(EXHAUST_BUCKET, publicUrl)
}

/**
 * Upload a content-media asset (article cover, brand logo, etc.).
 */
export function uploadContentMedia(file: File, prefix: string): Promise<string> {
  return uploadToBucket(CONTENT_BUCKET, file, prefix)
}

export function deleteContentMedia(publicUrl: string): Promise<void> {
  return deleteFromBucket(CONTENT_BUCKET, publicUrl)
}

/**
 * Upload a tutorial file (PDF, 3D model GLB/STL/OBJ, etc.).
 */
export function uploadTutorialFile(file: File, prefix: string): Promise<string> {
  return uploadToBucket(TUTORIAL_BUCKET, file, prefix)
}

export function deleteTutorialFile(publicUrl: string): Promise<void> {
  return deleteFromBucket(TUTORIAL_BUCKET, publicUrl)
}

/** Detecta el tipo genérico de un archivo para mostrarlo bien en la UI */
export function detectAttachmentType(
  filename: string | null | undefined,
  mime?: string,
): 'pdf' | '3d-model' | 'image' | 'other' {
  if (!filename) return 'other'
  const ext = filename.toLowerCase().split('.').pop() ?? ''
  if (['pdf'].includes(ext)) return 'pdf'
  if (['glb', 'gltf', 'stl', 'obj'].includes(ext)) return '3d-model'
  if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg'].includes(ext)) return 'image'
  if (mime?.startsWith('image/')) return 'image'
  if (mime === 'application/pdf') return 'pdf'
  if (mime?.startsWith('model/')) return '3d-model'
  return 'other'
}
