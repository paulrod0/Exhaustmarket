# Supplier Sync API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a universal API that lets any manufacturer/workshop (WooCommerce, Shopify, custom) sync their product catalog to ExhaustMarket automatically, plus a WordPress plugin as the reference client.

**Architecture:** Supabase Edge Functions expose a public REST API authenticated with supplier-scoped API keys (hashed in DB). The panel lets suppliers generate/revoke keys and view sync logs. A WordPress/WooCommerce plugin acts as the reference client that auto-pushes on product changes.

**Tech Stack:** Supabase Edge Functions (Deno/TypeScript), React + Zustand + Tailwind (panel UI), PHP 7.4+ (WordPress plugin)

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260330000001_supplier_sync_api.sql` | Tables: `supplier_api_keys`, `supplier_sync_logs` + columns `external_ref`, `source`, `last_synced_at` on `professional_products` |
| `supabase/functions/supplier-sync/index.ts` | Public API: full_sync / upsert / delete actions |
| `supabase/functions/supplier-keys/index.ts` | Protected API: generate / list / revoke API keys |
| `src/pages/panel/PanelApiKeysPage.tsx` | Supplier panel: key management + sync logs |
| `src/stores/supplierStore.ts` | Zustand store for API keys + sync logs |
| `src/types/supplier.ts` | TypeScript types for supplier API |
| `wordpress-plugin/exhaustmarket-sync/exhaustmarket-sync.php` | WordPress/WooCommerce plugin (single file) |
| `wordpress-plugin/exhaustmarket-sync/readme.txt` | Plugin readme |

### Modified files
| File | Change |
|------|--------|
| `src/types/database.ts` | Add `supplier_api_keys`, `supplier_sync_logs` table types |
| `src/App.tsx` | Add route `/panel/api-keys` |
| `src/pages/panel/PanelDashboardPage.tsx` | Add "API Keys" quick link card |
| `src/components/PanelSidebar.tsx` (or wherever nav is) | Add "Sincronización API" nav item |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260330000001_supplier_sync_api.sql`

### What this creates
- `supplier_api_keys`: stores hashed API keys per user
- `supplier_sync_logs`: records every sync attempt with stats
- Adds `external_ref`, `source`, `last_synced_at` to `professional_products`
- RLS: suppliers only see/manage their own keys and logs

- [ ] **Step 1.1: Write the migration SQL**

```sql
-- supabase/migrations/20260330000001_supplier_sync_api.sql

-- ─────────────────────────────────────────
-- supplier_api_keys
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,                        -- e.g. "WooCommerce Production"
  key_prefix    text NOT NULL,                        -- first 8 chars for display: "em_live_"
  key_hash      text NOT NULL UNIQUE,                 -- SHA-256 of full key
  is_active     boolean NOT NULL DEFAULT true,
  last_used_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT NOW(),
  updated_at    timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE supplier_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own API keys"
  ON supplier_api_keys FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- supplier_sync_logs
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_sync_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key_id        uuid REFERENCES supplier_api_keys(id) ON DELETE SET NULL,
  action            text NOT NULL CHECK (action IN ('full_sync','upsert','delete')),
  status            text NOT NULL CHECK (status IN ('success','error')),
  products_created  integer NOT NULL DEFAULT 0,
  products_updated  integer NOT NULL DEFAULT 0,
  products_deleted  integer NOT NULL DEFAULT 0,
  error_message     text,
  source_platform   text,                             -- e.g. 'woocommerce', 'shopify'
  started_at        timestamptz NOT NULL DEFAULT NOW(),
  completed_at      timestamptz
);

ALTER TABLE supplier_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sync logs"
  ON supplier_sync_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- Extend professional_products
-- ─────────────────────────────────────────
ALTER TABLE professional_products
  ADD COLUMN IF NOT EXISTS external_ref   text,       -- ID in the external system (e.g. WC post ID)
  ADD COLUMN IF NOT EXISTS source         text,       -- 'woocommerce' | 'shopify' | 'api' | null
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Unique constraint: one external_ref per supplier
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_external_ref
  ON professional_products (professional_id, external_ref)
  WHERE external_ref IS NOT NULL;
```

- [ ] **Step 1.2: Apply migration to Supabase**

```bash
cd /Users/hium/Documents/ExhaustMarket
npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.afsmlmpijjapkzdlrhhd.supabase.co:5432/postgres"
```

Or apply via Supabase Dashboard → SQL Editor → paste and run.

- [ ] **Step 1.3: Verify tables exist**

Run in Supabase SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('supplier_api_keys','supplier_sync_logs');
-- Expected: 2 rows

SELECT column_name FROM information_schema.columns
WHERE table_name = 'professional_products'
  AND column_name IN ('external_ref','source','last_synced_at');
-- Expected: 3 rows
```

- [ ] **Step 1.4: Commit**

```bash
git add supabase/migrations/20260330000001_supplier_sync_api.sql
git commit -m "feat: add supplier_api_keys, supplier_sync_logs tables + extend professional_products"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/supplier.ts`
- Modify: `src/types/database.ts`

- [ ] **Step 2.1: Add supplier types to database.ts**

Append to `src/types/database.ts` inside the `Tables` interface:

```typescript
// Inside Database['public']['Tables']:

supplier_api_keys: {
  Row: {
    id: string
    user_id: string
    name: string
    key_prefix: string
    key_hash: string
    is_active: boolean
    last_used_at: string | null
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: string
    user_id: string
    name: string
    key_prefix: string
    key_hash: string
    is_active?: boolean
    last_used_at?: string | null
    created_at?: string
    updated_at?: string
  }
  Update: Partial<Database['public']['Tables']['supplier_api_keys']['Insert']>
}

supplier_sync_logs: {
  Row: {
    id: string
    user_id: string
    api_key_id: string | null
    action: 'full_sync' | 'upsert' | 'delete'
    status: 'success' | 'error'
    products_created: number
    products_updated: number
    products_deleted: number
    error_message: string | null
    source_platform: string | null
    started_at: string
    completed_at: string | null
  }
  Insert: Omit<Database['public']['Tables']['supplier_sync_logs']['Row'], 'id'>
  Update: Partial<Database['public']['Tables']['supplier_sync_logs']['Insert']>
}
```

Also add `external_ref`, `source`, `last_synced_at` to `professional_products.Row`.

- [ ] **Step 2.2: Create src/types/supplier.ts**

```typescript
// src/types/supplier.ts
// Types for the Supplier Sync API request/response payloads

export interface SupplierProduct {
  ref: string           // Unique ID in the external system
  name: string
  description?: string
  price: number
  stock?: number
  category?: string
  images?: string[]
  active?: boolean
  source_platform?: string  // 'woocommerce' | 'shopify' | 'custom'
}

export type SyncAction = 'full_sync' | 'upsert' | 'delete'

export interface SyncRequest {
  action: SyncAction
  products?: SupplierProduct[]  // for full_sync and upsert
  ref?: string                  // for delete (single product)
  source_platform?: string
}

export interface SyncResponse {
  success: boolean
  action: SyncAction
  products_created?: number
  products_updated?: number
  products_deleted?: number
  error?: string
}

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export interface GeneratedApiKey extends ApiKey {
  full_key: string  // Only returned once at creation time
}
```

- [ ] **Step 2.3: Commit**

```bash
git add src/types/supplier.ts src/types/database.ts
git commit -m "feat: add TypeScript types for supplier sync API"
```

---

## Task 3: Edge Function — supplier-sync (Public API)

**Files:**
- Create: `supabase/functions/supplier-sync/index.ts`

This function has `verify_jwt: false` — it uses its own API key auth.

### API contract

```
POST /functions/v1/supplier-sync
Authorization: Bearer em_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json

Body: SyncRequest (see types above)
```

**Actions:**
- `full_sync`: Upsert all products provided, delete any products from this supplier NOT in the list
- `upsert`: Create or update one or more products
- `delete`: Delete a single product by `ref`

- [ ] **Step 3.1: Create the function**

```typescript
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
```

- [ ] **Step 3.2: Deploy the function**

```bash
cd /Users/hium/Documents/ExhaustMarket
npx supabase functions deploy supplier-sync --project-ref afsmlmpijjapkzdlrhhd --no-verify-jwt
```

- [ ] **Step 3.3: Test with curl**

```bash
# Should return 401
curl -X POST https://afsmlmpijjapkzdlrhhd.supabase.co/functions/v1/supplier-sync \
  -H "Content-Type: application/json" \
  -d '{"action":"full_sync","products":[]}'
# Expected: {"error":"Missing Authorization header"}

# With invalid key
curl -X POST https://afsmlmpijjapkzdlrhhd.supabase.co/functions/v1/supplier-sync \
  -H "Authorization: Bearer invalid_key" \
  -H "Content-Type: application/json" \
  -d '{"action":"full_sync","products":[]}'
# Expected: {"error":"Invalid API key"}
```

- [ ] **Step 3.4: Commit**

```bash
git add supabase/functions/supplier-sync/
git commit -m "feat: add supplier-sync edge function (public API with key auth)"
```

---

## Task 4: Edge Function — supplier-keys (Protected, JWT required)

**Files:**
- Create: `supabase/functions/supplier-keys/index.ts`

This function requires a valid Supabase JWT (user must be logged in).

### API contract
```
POST   /functions/v1/supplier-keys          { action: 'generate', name: 'My Key' }
GET    /functions/v1/supplier-keys          → list user's keys
DELETE /functions/v1/supplier-keys          { id: 'uuid' }
```

- [ ] **Step 4.1: Create the function**

```typescript
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
```

- [ ] **Step 4.2: Deploy**

```bash
npx supabase functions deploy supplier-keys --project-ref afsmlmpijjapkzdlrhhd
```

- [ ] **Step 4.3: Commit**

```bash
git add supabase/functions/supplier-keys/
git commit -m "feat: add supplier-keys edge function (generate/list/revoke API keys)"
```

---

## Task 5: Zustand Store — supplierStore.ts

**Files:**
- Create: `src/stores/supplierStore.ts`

- [ ] **Step 5.1: Create the store**

```typescript
// src/stores/supplierStore.ts
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { ApiKey, GeneratedApiKey } from '../types/supplier'
import type { Database } from '../types/database'

type SyncLog = Database['public']['Tables']['supplier_sync_logs']['Row']

interface SupplierState {
  apiKeys: ApiKey[]
  syncLogs: SyncLog[]
  loading: boolean
  error: string | null
  newlyGeneratedKey: string | null  // shown once after generation

  fetchApiKeys: () => Promise<void>
  generateApiKey: (name: string) => Promise<GeneratedApiKey | null>
  revokeApiKey: (id: string) => Promise<void>
  fetchSyncLogs: () => Promise<void>
  clearNewKey: () => void
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  apiKeys: [],
  syncLogs: [],
  loading: false,
  error: null,
  newlyGeneratedKey: null,

  fetchApiKeys: async () => {
    set({ loading: true, error: null })
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/supplier-keys`,
      { headers: { Authorization: `Bearer ${session?.access_token}` } }
    )
    const json = await res.json()
    if (!res.ok) {
      set({ loading: false, error: json.error })
      return
    }
    set({ apiKeys: json.keys, loading: false })
  },

  generateApiKey: async (name: string) => {
    set({ loading: true, error: null })
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/supplier-keys`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'generate', name }),
      }
    )
    const json = await res.json()
    if (!res.ok) {
      set({ loading: false, error: json.error })
      return null
    }
    const { full_key, ...keyData } = json
    set(state => ({
      apiKeys: [keyData, ...state.apiKeys],
      newlyGeneratedKey: full_key,
      loading: false,
    }))
    return json as GeneratedApiKey
  },

  revokeApiKey: async (id: string) => {
    set({ loading: true, error: null })
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/supplier-keys`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      }
    )
    set(state => ({
      apiKeys: state.apiKeys.filter(k => k.id !== id),
      loading: false,
    }))
  },

  fetchSyncLogs: async () => {
    const { data, error } = await supabase
      .from('supplier_sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50)

    if (!error) set({ syncLogs: data ?? [] })
  },

  clearNewKey: () => set({ newlyGeneratedKey: null }),
}))
```

- [ ] **Step 5.2: Commit**

```bash
git add src/stores/supplierStore.ts src/types/supplier.ts
git commit -m "feat: add supplierStore for API key management and sync logs"
```

---

## Task 6: Panel UI — PanelApiKeysPage.tsx

**Files:**
- Create: `src/pages/panel/PanelApiKeysPage.tsx`

This page has two sections:
1. **API Keys** — list, generate, revoke with copy-to-clipboard
2. **Sync Logs** — last 50 sync attempts with status and stats

- [ ] **Step 6.1: Create the page component**

```tsx
// src/pages/panel/PanelApiKeysPage.tsx
import { useEffect, useState } from 'react'
import { Key, Plus, Trash2, Copy, Check, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { useSupplierStore } from '../../stores/supplierStore'

export default function PanelApiKeysPage() {
  const {
    apiKeys, syncLogs, loading, error, newlyGeneratedKey,
    fetchApiKeys, fetchSyncLogs, generateApiKey, revokeApiKey, clearNewKey,
  } = useSupplierStore()

  const [showForm, setShowForm] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [copied, setCopied] = useState(false)
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKeys()
    fetchSyncLogs()
  }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyName.trim()) return
    await generateApiKey(keyName.trim())
    setKeyName('')
    setShowForm(false)
  }

  const handleCopy = async (key: string) => {
    await navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sincronización API</h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestiona tus API Keys para sincronizar productos desde cualquier plataforma
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva API Key
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* New Key Generated Banner — shown once */}
      {newlyGeneratedKey && (
        <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
          <p className="text-green-400 text-sm font-medium mb-2">
            ✅ API Key generada. Cópiala ahora — no se mostrará de nuevo.
          </p>
          <div className="flex items-center gap-2 bg-gray-900 rounded px-3 py-2 font-mono text-xs text-gray-200 break-all">
            <span className="flex-1">{newlyGeneratedKey}</span>
            <button onClick={() => handleCopy(newlyGeneratedKey)} className="shrink-0 text-gray-400 hover:text-white">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button onClick={clearNewKey} className="text-xs text-gray-500 hover:text-gray-300 mt-2">
            Ya la he copiado, cerrar
          </button>
        </div>
      )}

      {/* Generate Form */}
      {showForm && (
        <form onSubmit={handleGenerate} className="p-4 bg-gray-800 border border-gray-700 rounded-lg space-y-3">
          <p className="text-sm text-white font-medium">Nueva API Key</p>
          <input
            type="text"
            placeholder="Nombre (ej: WooCommerce Producción)"
            value={keyName}
            onChange={e => setKeyName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400"
            required
          />
          <div className="flex gap-2">
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium disabled:opacity-50">
              {loading ? 'Generando...' : 'Generar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* API Keys List */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Tus API Keys ({apiKeys.length})</span>
        </div>
        {apiKeys.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">
            No tienes API Keys aún. Crea una para empezar a sincronizar productos.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Prefijo</th>
                <th className="px-4 py-2 text-left">Último uso</th>
                <th className="px-4 py-2 text-left">Creada</th>
                <th className="px-4 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map(key => (
                <tr key={key.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-white font-medium">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">{key.key_prefix}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString('es-ES') : 'Nunca'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(key.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {revokeConfirmId === key.id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-red-400">¿Revocar?</span>
                        <button onClick={() => { revokeApiKey(key.id); setRevokeConfirmId(null) }}
                          className="text-xs text-red-400 hover:text-red-300 font-medium">Sí</button>
                        <button onClick={() => setRevokeConfirmId(null)}
                          className="text-xs text-gray-400 hover:text-gray-300">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setRevokeConfirmId(key.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Sync Logs */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Historial de sincronización</span>
          </div>
          <button onClick={fetchSyncLogs} className="text-xs text-gray-400 hover:text-gray-200">Actualizar</button>
        </div>
        {syncLogs.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500">Sin sincronizaciones todavía.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Acción</th>
                <th className="px-4 py-2 text-left">Plataforma</th>
                <th className="px-4 py-2 text-left">Resultados</th>
                <th className="px-4 py-2 text-left">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {syncLogs.map(log => (
                <tr key={log.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    {log.status === 'success'
                      ? <CheckCircle className="w-4 h-4 text-green-400" />
                      : <AlertCircle className="w-4 h-4 text-red-400" />}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{log.action}</td>
                  <td className="px-4 py-3 text-gray-400">{log.source_platform ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    +{log.products_created} ~{log.products_updated} -{log.products_deleted}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(log.started_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Integration Guide */}
      <div className="p-4 bg-gray-800 border border-gray-700 rounded-xl space-y-3">
        <p className="text-sm font-medium text-white">Cómo integrar tu tienda</p>
        <div className="space-y-2 text-xs text-gray-400">
          <p><span className="text-gray-200 font-medium">Endpoint:</span> <code className="bg-gray-700 px-1 rounded">POST https://afsmlmpijjapkzdlrhhd.supabase.co/functions/v1/supplier-sync</code></p>
          <p><span className="text-gray-200 font-medium">Header:</span> <code className="bg-gray-700 px-1 rounded">Authorization: Bearer em_live_xxxx</code></p>
          <p><span className="text-gray-200 font-medium">WordPress/WooCommerce:</span> Instala el plugin ExhaustMarket Sync y pega tu API Key en los ajustes.</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6.2: Add route in App.tsx**

Find the panel routes block in `src/App.tsx` and add:
```tsx
import PanelApiKeysPage from './pages/panel/PanelApiKeysPage'

// Inside panel routes:
<Route path="api-keys" element={<PanelApiKeysPage />} />
```

- [ ] **Step 6.3: Add nav item**

Find the panel sidebar/navigation (likely in `src/pages/PanelPage.tsx` or a sidebar component) and add:
```tsx
import { Key } from 'lucide-react'

// In nav links array:
{ to: 'api-keys', icon: Key, label: 'Sincronización API' }
```

- [ ] **Step 6.4: Test in browser**
- Navigate to `/panel/api-keys`
- Generate a new API Key — verify it shows the full key once
- Revoke a key — verify it disappears from the list
- Confirm sync logs table renders correctly

- [ ] **Step 6.5: Commit**

```bash
git add src/pages/panel/PanelApiKeysPage.tsx src/stores/supplierStore.ts src/App.tsx
git commit -m "feat: add API keys management panel page"
```

---

## Task 7: WordPress Plugin

**Files:**
- Create: `wordpress-plugin/exhaustmarket-sync/exhaustmarket-sync.php`
- Create: `wordpress-plugin/exhaustmarket-sync/readme.txt`

This plugin installs on the manufacturer's WordPress site. It:
1. Adds a settings page (API Key + base URL + sync interval)
2. Auto-syncs a product when saved/updated in WooCommerce
3. Deletes product from ExhaustMarket when deleted in WooCommerce
4. Has a "Sync All Products" button
5. Shows last sync status per product

- [ ] **Step 7.1: Create the plugin file**

```php
<?php
/**
 * Plugin Name: ExhaustMarket Sync
 * Plugin URI:  https://exhaustmarket.com
 * Description: Sincroniza automáticamente tu catálogo de WooCommerce con ExhaustMarket.
 * Version:     1.0.0
 * Author:      ExhaustMarket
 * License:     GPL2
 * WC requires at least: 6.0
 * WC tested up to: 9.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'EM_SYNC_VERSION', '1.0.0' );
define( 'EM_SYNC_API_ENDPOINT', 'https://afsmlmpijjapkzdlrhhd.supabase.co/functions/v1/supplier-sync' );

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────

add_action( 'admin_menu', 'em_sync_admin_menu' );
function em_sync_admin_menu() {
    add_submenu_page(
        'woocommerce',
        'ExhaustMarket Sync',
        'ExhaustMarket Sync',
        'manage_woocommerce',
        'em-sync-settings',
        'em_sync_settings_page'
    );
}

add_action( 'admin_init', 'em_sync_register_settings' );
function em_sync_register_settings() {
    register_setting( 'em_sync_settings', 'em_sync_api_key', [ 'sanitize_callback' => 'sanitize_text_field' ] );
    register_setting( 'em_sync_settings', 'em_sync_enabled', [ 'sanitize_callback' => 'absint' ] );
}

function em_sync_settings_page() {
    $api_key  = get_option( 'em_sync_api_key', '' );
    $enabled  = get_option( 'em_sync_enabled', 1 );
    $last_sync = get_option( 'em_sync_last_full', '' );

    // Handle full sync trigger
    if ( isset( $_POST['em_full_sync'] ) && check_admin_referer( 'em_sync_full' ) ) {
        $result = em_sync_full_catalog();
        $message = $result['success']
            ? "✅ Sincronización completa: +{$result['products_created']} creados, ~{$result['products_updated']} actualizados, -{$result['products_deleted']} eliminados."
            : "❌ Error: " . ( $result['error'] ?? 'Unknown error' );
        echo '<div class="notice notice-' . ( $result['success'] ? 'success' : 'error' ) . ' is-dismissible"><p>' . esc_html( $message ) . '</p></div>';
    }

    ?>
    <div class="wrap">
        <h1>ExhaustMarket Sync</h1>
        <p>Sincroniza tu catálogo de WooCommerce con ExhaustMarket automáticamente.</p>

        <form method="post" action="options.php">
            <?php settings_fields( 'em_sync_settings' ); ?>
            <table class="form-table">
                <tr>
                    <th>API Key</th>
                    <td>
                        <input type="password" name="em_sync_api_key" value="<?php echo esc_attr( $api_key ); ?>"
                               class="regular-text" placeholder="em_live_..." />
                        <p class="description">Obtén tu API Key en ExhaustMarket → Panel → Sincronización API</p>
                    </td>
                </tr>
                <tr>
                    <th>Auto-sincronización</th>
                    <td>
                        <label>
                            <input type="checkbox" name="em_sync_enabled" value="1" <?php checked( $enabled ); ?> />
                            Sincronizar automáticamente cuando se guarda un producto
                        </label>
                    </td>
                </tr>
            </table>
            <?php submit_button( 'Guardar configuración' ); ?>
        </form>

        <hr>
        <h2>Sincronización manual</h2>
        <?php if ( $last_sync ) : ?>
            <p>Última sincronización completa: <strong><?php echo esc_html( $last_sync ); ?></strong></p>
        <?php endif; ?>

        <?php if ( $api_key ) : ?>
            <form method="post">
                <?php wp_nonce_field( 'em_sync_full' ); ?>
                <input type="hidden" name="em_full_sync" value="1" />
                <?php submit_button( '🔄 Sincronizar todo el catálogo ahora', 'secondary' ); ?>
            </form>
        <?php else : ?>
            <p class="description">Añade tu API Key para activar la sincronización.</p>
        <?php endif; ?>
    </div>
    <?php
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-SYNC ON PRODUCT SAVE
// ─────────────────────────────────────────────────────────────────────────────

add_action( 'woocommerce_update_product', 'em_sync_on_product_save', 10, 1 );
add_action( 'woocommerce_new_product',    'em_sync_on_product_save', 10, 1 );
function em_sync_on_product_save( $product_id ) {
    if ( ! get_option( 'em_sync_enabled', 1 ) ) return;
    if ( ! get_option( 'em_sync_api_key', '' ) ) return;

    $product = wc_get_product( $product_id );
    if ( ! $product ) return;

    em_sync_send( 'upsert', [ em_product_to_payload( $product ) ] );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-DELETE ON PRODUCT DELETE
// ─────────────────────────────────────────────────────────────────────────────

add_action( 'woocommerce_delete_product', 'em_sync_on_product_delete', 10, 1 );
function em_sync_on_product_delete( $product_id ) {
    if ( ! get_option( 'em_sync_api_key', '' ) ) return;

    em_sync_send_raw([
        'action'         => 'delete',
        'ref'            => 'WC-' . $product_id,
        'source_platform'=> 'woocommerce',
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL CATALOG SYNC
// ─────────────────────────────────────────────────────────────────────────────

function em_sync_full_catalog() {
    $products_raw = wc_get_products([
        'status' => 'publish',
        'limit'  => -1,
    ]);

    $products = array_map( 'em_product_to_payload', $products_raw );

    $result = em_sync_send( 'full_sync', $products );

    if ( isset( $result['success'] ) && $result['success'] ) {
        update_option( 'em_sync_last_full', current_time( 'mysql' ) );
    }

    return $result;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function em_product_to_payload( WC_Product $product ): array {
    $images = [];
    $image_id = $product->get_image_id();
    if ( $image_id ) {
        $images[] = wp_get_attachment_url( $image_id );
    }
    foreach ( $product->get_gallery_image_ids() as $gid ) {
        $images[] = wp_get_attachment_url( $gid );
    }

    return [
        'ref'             => 'WC-' . $product->get_id(),
        'name'            => $product->get_name(),
        'description'     => wp_strip_all_tags( $product->get_short_description() ?: $product->get_description() ),
        'price'           => (float) $product->get_price(),
        'stock'           => $product->get_stock_quantity() ?? 0,
        'category'        => implode( ' > ', wp_get_post_terms( $product->get_id(), 'product_cat', [ 'fields' => 'names' ] ) ),
        'images'          => array_filter( $images ),
        'active'          => $product->is_visible(),
        'source_platform' => 'woocommerce',
    ];
}

function em_sync_send( string $action, array $products ): array {
    return em_sync_send_raw([
        'action'          => $action,
        'products'        => $products,
        'source_platform' => 'woocommerce',
    ]);
}

function em_sync_send_raw( array $body ): array {
    $api_key = get_option( 'em_sync_api_key', '' );
    if ( ! $api_key ) return [ 'success' => false, 'error' => 'No API key configured' ];

    $response = wp_remote_post( EM_SYNC_API_ENDPOINT, [
        'timeout' => 30,
        'headers' => [
            'Authorization' => 'Bearer ' . $api_key,
            'Content-Type'  => 'application/json',
        ],
        'body' => wp_json_encode( $body ),
    ]);

    if ( is_wp_error( $response ) ) {
        return [ 'success' => false, 'error' => $response->get_error_message() ];
    }

    $decoded = json_decode( wp_remote_retrieve_body( $response ), true );
    return $decoded ?: [ 'success' => false, 'error' => 'Empty response' ];
}
```

- [ ] **Step 7.2: Create readme.txt**

```
=== ExhaustMarket Sync ===
Contributors: exhaustmarket
Tags: exhaust, marketplace, woocommerce, sync
Requires at least: 5.8
Tested up to: 6.5
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2

Sincroniza tu catálogo WooCommerce con ExhaustMarket automáticamente.

== Instalación ==
1. Sube la carpeta `exhaustmarket-sync` a /wp-content/plugins/
2. Activa el plugin en WooCommerce
3. Ve a WooCommerce → ExhaustMarket Sync
4. Pega tu API Key (obtenla en ExhaustMarket → Panel → Sincronización API)
5. Haz clic en "Sincronizar todo el catálogo ahora" para la primera carga

== Uso ==
Una vez configurado, el plugin sincroniza automáticamente cada vez que:
- Guardas o actualizas un producto
- Eliminas un producto

También puedes hacer una sincronización completa manual desde los ajustes.
```

- [ ] **Step 7.3: Crear zip del plugin**

```bash
cd /Users/hium/Documents/ExhaustMarket/wordpress-plugin
zip -r exhaustmarket-sync-v1.0.0.zip exhaustmarket-sync/
```

- [ ] **Step 7.4: Commit**

```bash
git add wordpress-plugin/
git commit -m "feat: add WordPress/WooCommerce plugin for ExhaustMarket product sync"
```

---

## Task 8: End-to-End Test

- [ ] **Step 8.1: Generate an API key from the panel**
  - Login as `info@spartanexhaust.com` / `default1234!`
  - Navigate to `/panel/api-keys`
  - Click "Nueva API Key" → name it "Test Key"
  - Copy the full key

- [ ] **Step 8.2: Test full_sync via curl**

```bash
APIKEY="em_live_xxxxx_your_actual_key"

curl -s -X POST https://afsmlmpijjapkzdlrhhd.supabase.co/functions/v1/supplier-sync \
  -H "Authorization: Bearer $APIKEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "full_sync",
    "source_platform": "test",
    "products": [
      {
        "ref": "TEST-001",
        "name": "Producto de prueba sync",
        "description": "Test de sincronización",
        "price": 99.99,
        "stock": 5,
        "category": "Exhaust Systems",
        "active": true
      }
    ]
  }'

# Expected:
# { "success": true, "action": "full_sync", "products_created": 1, "products_updated": 0, "products_deleted": 0 }
```

- [ ] **Step 8.3: Verify product appears in DB**

```sql
SELECT product_name, price, external_ref, source, last_synced_at
FROM professional_products
WHERE external_ref = 'TEST-001';
-- Should return 1 row
```

- [ ] **Step 8.4: Test upsert (update)**

```bash
curl -s -X POST https://afsmlmpijjapkzdlrhhd.supabase.co/functions/v1/supplier-sync \
  -H "Authorization: Bearer $APIKEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"upsert","products":[{"ref":"TEST-001","name":"Producto actualizado","price":129.99,"stock":3}]}'
# Expected: products_updated: 1
```

- [ ] **Step 8.5: Test delete**

```bash
curl -s -X POST https://afsmlmpijjapkzdlrhhd.supabase.co/functions/v1/supplier-sync \
  -H "Authorization: Bearer $APIKEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"delete","ref":"TEST-001"}'
# Expected: products_deleted: 1
```

- [ ] **Step 8.6: Verify sync logs in panel**
  - Navigate to `/panel/api-keys` → section "Historial de sincronización"
  - Should show 3 entries (full_sync, upsert, delete)

- [ ] **Step 8.7: Final commit**

```bash
git add .
git commit -m "feat: complete supplier sync API — edge functions, panel UI, WP plugin"
git push origin main
```

---

## Summary

| Componente | Descripción |
|---|---|
| `supplier_api_keys` (DB) | Claves API hasheadas por proveedor |
| `supplier_sync_logs` (DB) | Historial de sincronizaciones |
| `supplier-sync` (Edge Fn) | API pública: full_sync / upsert / delete |
| `supplier-keys` (Edge Fn) | Gestión de claves vía JWT |
| `PanelApiKeysPage` (UI) | Panel del proveedor: generar, revocar, ver logs |
| `supplierStore` (Zustand) | Estado para UI del panel |
| Plugin WordPress (PHP) | Cliente WooCommerce: auto-sync en save/delete |

**Cualquier plataforma** (Shopify, Magento, custom) puede usar el mismo endpoint con su propia API Key — solo necesitan hacer un `POST` con JSON.
