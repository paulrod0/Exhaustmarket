// supabase/functions/supplier-keys/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth via Supabase JWT
  const authHeader = req.headers.get('Authorization') ?? ''
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const serviceSupabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // GET — list keys
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('supplier_api_keys')
      .select('id, name, key_prefix, is_active, last_used_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return json({ error: error.message }, 500)
    return json({ keys: data })
  }

  const body = await req.json()

  // POST — generate new key
  if (req.method === 'POST' && body.action === 'generate') {
    if (!body.name?.trim()) {
      return json({ error: 'Key name is required' }, 400)
    }

    // Count existing active keys (limit 10)
    const { count } = await supabase
      .from('supplier_api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if ((count ?? 0) >= 10) {
      return json({ error: 'Maximum 10 active API keys allowed' }, 400)
    }

    // Generate cryptographically random key: em_live_ + 64 hex chars
    const randomBytes = new Uint8Array(32)
    crypto.getRandomValues(randomBytes)
    const randomHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')
    const fullKey = `em_live_${randomHex}`
    const keyPrefix = fullKey.substring(0, 16) + '...' // Display prefix

    // Hash the full key for storage
    const keyHash = await sha256(fullKey)

    const { data, error } = await serviceSupabase
      .from('supplier_api_keys')
      .insert({
        user_id: user.id,
        name: body.name.trim(),
        key_prefix: keyPrefix,
        key_hash: keyHash,
        is_active: true,
      })
      .select('id, name, key_prefix, is_active, created_at')
      .single()

    if (error) return json({ error: error.message }, 500)

    // Return full key only once
    return json({ ...data, full_key: fullKey }, 201)
  }

  // DELETE — revoke key
  if (req.method === 'DELETE' && body.id) {
    const { error } = await supabase
      .from('supplier_api_keys')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('user_id', user.id)

    if (error) return json({ error: error.message }, 500)
    return json({ success: true })
  }

  return json({ error: 'Method not allowed' }, 405)
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
