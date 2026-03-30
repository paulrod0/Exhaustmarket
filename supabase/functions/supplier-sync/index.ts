// supabase/functions/supplier-sync/index.ts
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

  try {
    // ── 1. Extract Bearer token ──────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) {
      return json({ error: 'Missing Authorization header' }, 401)
    }

    // ── 2. Hash the token and look up the API key ────────────────────
    const keyHash = await sha256(token)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: apiKey, error: keyError } = await supabase
      .from('supplier_api_keys')
      .select('id, user_id, is_active')
      .eq('key_hash', keyHash)
      .single()

    if (keyError || !apiKey) {
      return json({ error: 'Invalid API key' }, 401)
    }

    if (!apiKey.is_active) {
      return json({ error: 'API key is revoked' }, 403)
    }

    // Update last_used_at (fire and forget)
    supabase
      .from('supplier_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id)

    // ── 3. Parse body ────────────────────────────────────────────────
    const body = await req.json()
    const { action, products, ref, source_platform } = body

    if (!action) {
      return json({ error: 'Missing action field' }, 400)
    }

    const startedAt = new Date().toISOString()
    let created = 0, updated = 0, deleted = 0

    // ── 4. Execute action ────────────────────────────────────────────
    if (action === 'full_sync') {
      if (!Array.isArray(products)) {
        return json({ error: 'products array required for full_sync' }, 400)
      }

      // Upsert all provided products
      for (const p of products) {
        const row = productToRow(p, apiKey.user_id, source_platform)
        const { data: existing } = await supabase
          .from('professional_products')
          .select('id')
          .eq('professional_id', apiKey.user_id)
          .eq('external_ref', p.ref)
          .maybeSingle()

        if (existing) {
          await supabase
            .from('professional_products')
            .update({ ...row, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
          updated++
        } else {
          await supabase.from('professional_products').insert(row)
          created++
        }
      }

      // Delete products NOT in the new list
      const refs = products.map((p: any) => p.ref)
      const { data: toDelete } = await supabase
        .from('professional_products')
        .select('id')
        .eq('professional_id', apiKey.user_id)
        .not('external_ref', 'is', null)
        .not('external_ref', 'in', `(${refs.map((r: string) => `"${r}"`).join(',')})`)

      if (toDelete?.length) {
        await supabase
          .from('professional_products')
          .delete()
          .in('id', toDelete.map((r: any) => r.id))
        deleted = toDelete.length
      }

    } else if (action === 'upsert') {
      const list = Array.isArray(products) ? products : [products]
      for (const p of list) {
        const row = productToRow(p, apiKey.user_id, source_platform)
        const { data: existing } = await supabase
          .from('professional_products')
          .select('id')
          .eq('professional_id', apiKey.user_id)
          .eq('external_ref', p.ref)
          .maybeSingle()

        if (existing) {
          await supabase
            .from('professional_products')
            .update({ ...row, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
          updated++
        } else {
          await supabase.from('professional_products').insert(row)
          created++
        }
      }

    } else if (action === 'delete') {
      if (!ref) return json({ error: 'ref required for delete action' }, 400)
      const { error: delErr } = await supabase
        .from('professional_products')
        .delete()
        .eq('professional_id', apiKey.user_id)
        .eq('external_ref', ref)

      if (!delErr) deleted = 1

    } else {
      return json({ error: `Unknown action: ${action}` }, 400)
    }

    // ── 5. Write sync log ────────────────────────────────────────────
    await supabase.from('supplier_sync_logs').insert({
      user_id: apiKey.user_id,
      api_key_id: apiKey.id,
      action,
      status: 'success',
      products_created: created,
      products_updated: updated,
      products_deleted: deleted,
      source_platform: source_platform ?? null,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
    })

    return json({
      success: true,
      action,
      products_created: created,
      products_updated: updated,
      products_deleted: deleted,
    })

  } catch (err: any) {
    console.error(err)
    return json({ error: err.message ?? 'Internal error' }, 500)
  }
})

// ── Helpers ─────────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function productToRow(p: any, userId: string, platform?: string) {
  return {
    id: crypto.randomUUID(),
    professional_id: userId,
    product_name: p.name,
    description: p.description ?? '',
    price: Number(p.price),
    stock: p.stock ?? 0,
    category: p.category ?? 'General',
    images: p.images ?? [],
    is_active: p.active ?? true,
    external_ref: p.ref,
    source: p.source_platform ?? platform ?? 'api',
    last_synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
