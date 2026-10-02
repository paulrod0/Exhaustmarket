import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Layers, Info, ChevronRight, Search, Box, Clock, Euro, Hash, Camera, Play, ShoppingBag, ShoppingCart, Lightbulb, Ruler } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { canViewTiers, canSeeOem, canSeeWorkshopData, effectivePrice } from '../lib/contentTypes'
import { sortedComponents, emissionsBadgeLabel } from '../lib/schemaDefinitions'
import { attachRelated } from '../lib/joinRelated'
import { cart } from '../lib/cart'
import { toast } from '../lib/toast'
import { useMediaQuery } from '../lib/useMediaQuery'
import { SPEC_SELECT, specSummary, type ProductSpecs } from '../lib/productSpecs'
import SchemaRelatedPanel from '../components/SchemaRelatedPanel'
import TierBadge from '../components/TierBadge'
import UpgradeCallout from '../components/UpgradeCallout'
import VideoEmbed from '../components/VideoEmbed'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Component {
  id: string
  name: string
  material: string
  temp: string
  description: string
  tip?: string
  oem_ref?: string
  diameter_mm?: number
  thickness_mm?: number
  fabrication_hours?: number
  material_cost?: number
  total_cost?: number
  difficulty?: 'baja' | 'media' | 'alta'
  fabricable?: boolean
  image_url?: string
  /** Productos del marketplace vinculados exactamente a esta pieza (plug&play). */
  product_ids?: string[]
}

type Layout = 'v8tt' | 'v10na' | 'flat6na' | 'i6tt' | 'v12na' | 'flat6tt' | 'v8na'

interface DespieceItem {
  element: string
  material: string
  specification: string
  quantity: string
  process: string
  product_ids?: string[]
}

interface CostBreakdown {
  materials?: number
  consumables?: number
  labor?: number
  hours?: number
  currency?: string
}

interface CarSchema {
  id: string
  brand: string
  model: string
  year: string
  engine: string
  power: string
  emissions?: string | null
  layout: Layout
  color: string
  note?: string | null
  components: Record<string, Component>
  cover_url?: string | null
  gallery_urls?: string[] | null
  allowed_tiers?: string[] | null
  despiece?: DespieceItem[] | null
  cost_breakdown?: CostBreakdown | null
  reference_photos?: string[] | null
  related_video_url?: string | null
  total_estimated_hours?: number | null
  total_estimated_cost?: number | null
  total_materials_count?: number | null
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────

const BOX = { rx: 6, ry: 6 }

// ── V8 Biturbo ────────────────────────────────────────────────────────────────
function V8ttDiagram({ selected, onSelect, color }: { selected: string | null; onSelect: (id: string) => void; color: string }) {
  const sel = (id: string) => selected === id ? color : '#E8E8ED'
  const txt = (id: string) => selected === id ? '#FFFFFF' : '#1D1D1F'
  const str = (id: string) => selected === id ? color : '#C7C7CC'

  return (
    <svg viewBox="0 0 860 280" style={{ width: '100%', maxHeight: '260px' }} aria-label="Diagrama escape V8 biturbo">
      <rect x="0" y="0" width="860" height="280" fill="#FAFAFA" rx="12" />
      <text x="16" y="24" fontSize="10" fill="#C7C7CC" fontFamily="ui-monospace, monospace">SISTEMA DE ESCAPE — V8 BITURBO</text>

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_l')}>
        <rect x="20" y="40" width="110" height="50" fill={sel('manifold_l')} stroke={str('manifold_l')} strokeWidth="1.5" {...BOX} />
        <text x="75" y="60" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_l')}>Colector</text>
        <text x="75" y="74" textAnchor="middle" fontSize="9" fill={txt('manifold_l')}>Izq. 4→1</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_r')}>
        <rect x="20" y="190" width="110" height="50" fill={sel('manifold_r')} stroke={str('manifold_r')} strokeWidth="1.5" {...BOX} />
        <text x="75" y="210" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_r')}>Colector</text>
        <text x="75" y="224" textAnchor="middle" fontSize="9" fill={txt('manifold_r')}>Der. 4→1</text>
      </g>
      <rect x="2" y="115" width="14" height="50" fill="#D2D2D7" rx="3" />
      {[125,135,145,155].map(y => <line key={y} x1="2" y1={y} x2="16" y2={y} stroke="#C7C7CC" strokeWidth="1" />)}
      <line x1="130" y1="65" x2="185" y2="65" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="130" y1="215" x2="185" y2="215" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('turbo_l')}>
        <ellipse cx="215" cy="65" rx="28" ry="22" fill={sel('turbo_l')} stroke={str('turbo_l')} strokeWidth="1.5" />
        <text x="215" y="61" textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('turbo_l')}>Turbo</text>
        <text x="215" y="73" textAnchor="middle" fontSize="8" fill={txt('turbo_l')}>Izq.</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('turbo_r')}>
        <ellipse cx="215" cy="215" rx="28" ry="22" fill={sel('turbo_r')} stroke={str('turbo_r')} strokeWidth="1.5" />
        <text x="215" y="211" textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('turbo_r')}>Turbo</text>
        <text x="215" y="223" textAnchor="middle" fontSize="8" fill={txt('turbo_r')}>Der.</text>
      </g>
      <line x1="243" y1="65" x2="290" y2="65" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="243" y1="215" x2="290" y2="215" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_l')}>
        <rect x="290" y="44" width="100" height="42" fill={sel('cat_l')} stroke={str('cat_l')} strokeWidth="1.5" {...BOX} />
        <text x="340" y="62" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_l')}>Cat Izq.</text>
        <text x="340" y="76" textAnchor="middle" fontSize="9" fill={txt('cat_l')}>3-vías</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_r')}>
        <rect x="290" y="194" width="100" height="42" fill={sel('cat_r')} stroke={str('cat_r')} strokeWidth="1.5" {...BOX} />
        <text x="340" y="212" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_r')}>Cat Der.</text>
        <text x="340" y="226" textAnchor="middle" fontSize="9" fill={txt('cat_r')}>3-vías</text>
      </g>
      <line x1="390" y1="65" x2="470" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1="390" y1="215" x2="470" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('xpipe')}>
        <rect x="470" y="116" width="90" height="48" fill={sel('xpipe')} stroke={str('xpipe')} strokeWidth="1.5" {...BOX} />
        <text x="515" y="136" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('xpipe')}>X-Pipe</text>
        <text x="515" y="150" textAnchor="middle" fontSize="9" fill={txt('xpipe')}>Mezcla</text>
      </g>
      <line x1="560" y1="140" x2="610" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('muffler')}>
        <rect x="610" y="108" width="120" height="64" fill={sel('muffler')} stroke={str('muffler')} strokeWidth="1.5" {...BOX} />
        <text x="670" y="134" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('muffler')}>Silenciador</text>
        <text x="670" y="149" textAnchor="middle" fontSize="9" fill={txt('muffler')}>+ Válvulas</text>
      </g>
      <line x1="730" y1="140" x2="780" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('tips')}>
        <rect x="780" y="118" width="70" height="44" fill={sel('tips')} stroke={str('tips')} strokeWidth="1.5" {...BOX} />
        <text x="815" y="137" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('tips')}>Salidas</text>
        <text x="815" y="151" textAnchor="middle" fontSize="9" fill={txt('tips')}>×4</text>
      </g>
    </svg>
  )
}

// ── V8 Atmosférico ─────────────────────────────────────────────────────────────
function V8naDiagram({ selected, onSelect, color }: { selected: string | null; onSelect: (id: string) => void; color: string }) {
  const sel = (id: string) => selected === id ? color : '#E8E8ED'
  const txt = (id: string) => selected === id ? '#FFFFFF' : '#1D1D1F'
  const str = (id: string) => selected === id ? color : '#C7C7CC'

  return (
    <svg viewBox="0 0 860 280" style={{ width: '100%', maxHeight: '260px' }} aria-label="Diagrama escape V8 atmosférico">
      <rect x="0" y="0" width="860" height="280" fill="#FAFAFA" rx="12" />
      <text x="16" y="24" fontSize="10" fill="#C7C7CC" fontFamily="ui-monospace, monospace">SISTEMA DE ESCAPE — V8 ATMOSFÉRICO</text>
      <rect x="2" y="115" width="14" height="50" fill="#D2D2D7" rx="3" />
      {[125,135,145,155].map(y => <line key={y} x1="2" y1={y} x2="16" y2={y} stroke="#C7C7CC" strokeWidth="1" />)}

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_l')}>
        <rect x="30" y="50" width="110" height="50" fill={sel('manifold_l')} stroke={str('manifold_l')} strokeWidth="1.5" {...BOX} />
        <text x="85" y="70" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_l')}>Colector Izq.</text>
        <text x="85" y="84" textAnchor="middle" fontSize="9" fill={txt('manifold_l')}>4→1 EQ-Length</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_r')}>
        <rect x="30" y="180" width="110" height="50" fill={sel('manifold_r')} stroke={str('manifold_r')} strokeWidth="1.5" {...BOX} />
        <text x="85" y="200" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_r')}>Colector Der.</text>
        <text x="85" y="214" textAnchor="middle" fontSize="9" fill={txt('manifold_r')}>4→1 EQ-Length</text>
      </g>
      <line x1="140" y1="75" x2="200" y2="75" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="140" y1="205" x2="200" y2="205" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_l')}>
        <rect x="200" y="54" width="100" height="42" fill={sel('cat_l')} stroke={str('cat_l')} strokeWidth="1.5" {...BOX} />
        <text x="250" y="72" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_l')}>Cat Izq.</text>
        <text x="250" y="86" textAnchor="middle" fontSize="9" fill={txt('cat_l')}>3-vías</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_r')}>
        <rect x="200" y="184" width="100" height="42" fill={sel('cat_r')} stroke={str('cat_r')} strokeWidth="1.5" {...BOX} />
        <text x="250" y="202" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_r')}>Cat Der.</text>
        <text x="250" y="216" textAnchor="middle" fontSize="9" fill={txt('cat_r')}>3-vías</text>
      </g>

      <line x1="300" y1="75" x2="400" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1="300" y1="205" x2="400" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('xpipe')}>
        <rect x="400" y="116" width="100" height="48" fill={sel('xpipe')} stroke={str('xpipe')} strokeWidth="1.5" {...BOX} />
        <text x="450" y="136" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('xpipe')}>X-Pipe</text>
        <text x="450" y="150" textAnchor="middle" fontSize="9" fill={txt('xpipe')}>NA</text>
      </g>
      <line x1="500" y1="140" x2="560" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('muffler')}>
        <rect x="560" y="108" width="130" height="64" fill={sel('muffler')} stroke={str('muffler')} strokeWidth="1.5" {...BOX} />
        <text x="625" y="134" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('muffler')}>Silenciador</text>
        <text x="625" y="149" textAnchor="middle" fontSize="9" fill={txt('muffler')}>NA</text>
      </g>
      <line x1="690" y1="140" x2="750" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('tips')}>
        <rect x="750" y="118" width="90" height="44" fill={sel('tips')} stroke={str('tips')} strokeWidth="1.5" {...BOX} />
        <text x="795" y="137" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('tips')}>Salidas</text>
        <text x="795" y="151" textAnchor="middle" fontSize="9" fill={txt('tips')}>×4</text>
      </g>
    </svg>
  )
}

// ── V10 Atmosférico ────────────────────────────────────────────────────────────
function V10naDiagram({ selected, onSelect, color }: { selected: string | null; onSelect: (id: string) => void; color: string }) {
  const sel = (id: string) => selected === id ? color : '#E8E8ED'
  const txt = (id: string) => selected === id ? '#FFFFFF' : '#1D1D1F'
  const str = (id: string) => selected === id ? color : '#C7C7CC'

  return (
    <svg viewBox="0 0 860 280" style={{ width: '100%', maxHeight: '260px' }} aria-label="Diagrama escape V10 atmosférico">
      <rect x="0" y="0" width="860" height="280" fill="#FAFAFA" rx="12" />
      <text x="16" y="24" fontSize="10" fill="#C7C7CC" fontFamily="ui-monospace, monospace">SISTEMA DE ESCAPE — V10 ATMOSFÉRICO</text>

      <rect x="2" y="110" width="14" height="60" fill="#D2D2D7" rx="3" />
      {[120,130,140,150,160].map(y => <line key={y} x1="2" y1={y} x2="16" y2={y} stroke="#C7C7CC" strokeWidth="1" />)}

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_l')}>
        <rect x="28" y="40" width="120" height="50" fill={sel('manifold_l')} stroke={str('manifold_l')} strokeWidth="1.5" {...BOX} />
        <text x="88" y="60" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_l')}>Colector Izq.</text>
        <text x="88" y="74" textAnchor="middle" fontSize="9" fill={txt('manifold_l')}>5→1 Equal-Length</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_r')}>
        <rect x="28" y="190" width="120" height="50" fill={sel('manifold_r')} stroke={str('manifold_r')} strokeWidth="1.5" {...BOX} />
        <text x="88" y="210" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_r')}>Colector Der.</text>
        <text x="88" y="224" textAnchor="middle" fontSize="9" fill={txt('manifold_r')}>5→1 Equal-Length</text>
      </g>
      <line x1="148" y1="65" x2="210" y2="65" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="148" y1="215" x2="210" y2="215" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_l')}>
        <rect x="210" y="44" width="100" height="42" fill={sel('cat_l')} stroke={str('cat_l')} strokeWidth="1.5" {...BOX} />
        <text x="260" y="62" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_l')}>Cat Izq.</text>
        <text x="260" y="76" textAnchor="middle" fontSize="9" fill={txt('cat_l')}>Metálico</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_r')}>
        <rect x="210" y="194" width="100" height="42" fill={sel('cat_r')} stroke={str('cat_r')} strokeWidth="1.5" {...BOX} />
        <text x="260" y="212" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_r')}>Cat Der.</text>
        <text x="260" y="226" textAnchor="middle" fontSize="9" fill={txt('cat_r')}>Metálico</text>
      </g>
      <line x1="310" y1="65" x2="390" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1="310" y1="215" x2="390" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('collector')}>
        <rect x="390" y="114" width="110" height="52" fill={sel('collector')} stroke={str('collector')} strokeWidth="1.5" {...BOX} />
        <text x="445" y="136" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('collector')}>Colector</text>
        <text x="445" y="150" textAnchor="middle" fontSize="9" fill={txt('collector')}>Central</text>
      </g>
      <line x1="500" y1="140" x2="560" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('muffler')}>
        <rect x="560" y="108" width="130" height="64" fill={sel('muffler')} stroke={str('muffler')} strokeWidth="1.5" {...BOX} />
        <text x="625" y="134" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('muffler')}>Silenciador</text>
        <text x="625" y="149" textAnchor="middle" fontSize="9" fill={txt('muffler')}>V10</text>
      </g>
      <line x1="690" y1="140" x2="750" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('tips')}>
        <rect x="750" y="118" width="90" height="44" fill={sel('tips')} stroke={str('tips')} strokeWidth="1.5" {...BOX} />
        <text x="795" y="137" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('tips')}>Salidas</text>
        <text x="795" y="151" textAnchor="middle" fontSize="9" fill={txt('tips')}>×4</text>
      </g>
    </svg>
  )
}

// ── V12 (NA o Biturbo) ─────────────────────────────────────────────────────────
function V12Diagram({ selected, onSelect, color }: { selected: string | null; onSelect: (id: string) => void; color: string }) {
  const sel = (id: string) => selected === id ? color : '#E8E8ED'
  const txt = (id: string) => selected === id ? '#FFFFFF' : '#1D1D1F'
  const str = (id: string) => selected === id ? color : '#C7C7CC'

  return (
    <svg viewBox="0 0 860 280" style={{ width: '100%', maxHeight: '260px' }} aria-label="Diagrama escape V12">
      <rect x="0" y="0" width="860" height="280" fill="#FAFAFA" rx="12" />
      <text x="16" y="24" fontSize="10" fill="#C7C7CC" fontFamily="ui-monospace, monospace">SISTEMA DE ESCAPE — V12</text>

      <rect x="2" y="106" width="16" height="68" fill="#D2D2D7" rx="3" />
      {[116,126,136,146,156,166].map(y => <line key={y} x1="2" y1={y} x2="18" y2={y} stroke="#C7C7CC" strokeWidth="1" />)}
      <text x="10" y="100" textAnchor="middle" fontSize="8" fill="#C7C7CC">V12</text>

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_l')}>
        <rect x="28" y="35" width="120" height="52" fill={sel('manifold_l')} stroke={str('manifold_l')} strokeWidth="1.5" {...BOX} />
        <text x="88" y="56" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_l')}>Colector Izq.</text>
        <text x="88" y="70" textAnchor="middle" fontSize="9" fill={txt('manifold_l')}>6→1</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_r')}>
        <rect x="28" y="193" width="120" height="52" fill={sel('manifold_r')} stroke={str('manifold_r')} strokeWidth="1.5" {...BOX} />
        <text x="88" y="214" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_r')}>Colector Der.</text>
        <text x="88" y="228" textAnchor="middle" fontSize="9" fill={txt('manifold_r')}>6→1</text>
      </g>
      <line x1="148" y1="61" x2="210" y2="61" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="148" y1="219" x2="210" y2="219" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_l')}>
        <rect x="210" y="40" width="110" height="42" fill={sel('cat_l')} stroke={str('cat_l')} strokeWidth="1.5" {...BOX} />
        <text x="265" y="58" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_l')}>Cat Izq.</text>
        <text x="265" y="72" textAnchor="middle" fontSize="9" fill={txt('cat_l')}>High-Flow</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_r')}>
        <rect x="210" y="198" width="110" height="42" fill={sel('cat_r')} stroke={str('cat_r')} strokeWidth="1.5" {...BOX} />
        <text x="265" y="216" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_r')}>Cat Der.</text>
        <text x="265" y="230" textAnchor="middle" fontSize="9" fill={txt('cat_r')}>High-Flow</text>
      </g>
      <line x1="320" y1="61" x2="420" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1="320" y1="219" x2="420" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('collector')}>
        <rect x="420" y="112" width="110" height="56" fill={sel('collector')} stroke={str('collector')} strokeWidth="1.5" {...BOX} />
        <text x="475" y="134" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('collector')}>Y-Pipe</text>
        <text x="475" y="149" textAnchor="middle" fontSize="9" fill={txt('collector')}>Central</text>
      </g>
      <line x1="530" y1="140" x2="590" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('muffler')}>
        <rect x="590" y="108" width="130" height="64" fill={sel('muffler')} stroke={str('muffler')} strokeWidth="1.5" {...BOX} />
        <text x="655" y="134" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('muffler')}>Silenciador</text>
        <text x="655" y="149" textAnchor="middle" fontSize="9" fill={txt('muffler')}>+ Válvulas</text>
      </g>
      <line x1="720" y1="140" x2="770" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('tips')}>
        <rect x="770" y="118" width="80" height="44" fill={sel('tips')} stroke={str('tips')} strokeWidth="1.5" {...BOX} />
        <text x="810" y="137" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('tips')}>Salidas</text>
        <text x="810" y="151" textAnchor="middle" fontSize="9" fill={txt('tips')}>×4</text>
      </g>
    </svg>
  )
}

// ── Flat-6 Atmosférico ─────────────────────────────────────────────────────────
function Flat6naDiagram({ selected, onSelect, color }: { selected: string | null; onSelect: (id: string) => void; color: string }) {
  const sel = (id: string) => selected === id ? color : '#E8E8ED'
  const txt = (id: string) => selected === id ? '#FFFFFF' : '#1D1D1F'
  const str = (id: string) => selected === id ? color : '#C7C7CC'

  return (
    <svg viewBox="0 0 860 280" style={{ width: '100%', maxHeight: '260px' }} aria-label="Diagrama escape Flat-6 NA">
      <rect x="0" y="0" width="860" height="280" fill="#FAFAFA" rx="12" />
      <text x="16" y="24" fontSize="10" fill="#C7C7CC" fontFamily="ui-monospace, monospace">SISTEMA DE ESCAPE — FLAT-6 ATMOSFÉRICO</text>

      <rect x="380" y="120" width="80" height="40" fill="#D2D2D7" rx="4" />
      <text x="420" y="144" textAnchor="middle" fontSize="8" fill="#86868B">BOXER</text>
      {[130,140,150].map(x => <line key={x} x1={x} y1="130" x2={x} y2="160" stroke="#C7C7CC" strokeWidth="0.6" />)}

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_l')}>
        <rect x="70" y="90" width="110" height="46" fill={sel('manifold_l')} stroke={str('manifold_l')} strokeWidth="1.5" {...BOX} />
        <text x="125" y="110" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_l')}>Colector Izq.</text>
        <text x="125" y="124" textAnchor="middle" fontSize="9" fill={txt('manifold_l')}>3→1</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_r')}>
        <rect x="70" y="150" width="110" height="46" fill={sel('manifold_r')} stroke={str('manifold_r')} strokeWidth="1.5" {...BOX} />
        <text x="125" y="170" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_r')}>Colector Der.</text>
        <text x="125" y="184" textAnchor="middle" fontSize="9" fill={txt('manifold_r')}>3→1</text>
      </g>
      <line x1="180" y1="113" x2="230" y2="113" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="180" y1="173" x2="230" y2="173" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_l')}>
        <rect x="230" y="92" width="90" height="42" fill={sel('cat_l')} stroke={str('cat_l')} strokeWidth="1.5" {...BOX} />
        <text x="275" y="110" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_l')}>Cat Izq.</text>
        <text x="275" y="124" textAnchor="middle" fontSize="9" fill={txt('cat_l')}>3-vías</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_r')}>
        <rect x="230" y="152" width="90" height="42" fill={sel('cat_r')} stroke={str('cat_r')} strokeWidth="1.5" {...BOX} />
        <text x="275" y="170" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_r')}>Cat Der.</text>
        <text x="275" y="184" textAnchor="middle" fontSize="9" fill={txt('cat_r')}>3-vías</text>
      </g>
      <line x1="320" y1="113" x2="490" y2="136" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1="320" y1="173" x2="490" y2="144" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('hpipe')}>
        <rect x="490" y="114" width="80" height="52" fill={sel('hpipe')} stroke={str('hpipe')} strokeWidth="1.5" {...BOX} />
        <text x="530" y="136" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('hpipe')}>H-Pipe</text>
        <text x="530" y="150" textAnchor="middle" fontSize="9" fill={txt('hpipe')}>Flat</text>
      </g>
      <line x1="570" y1="140" x2="610" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('resonator')}>
        <rect x="610" y="118" width="80" height="44" fill={sel('resonator')} stroke={str('resonator')} strokeWidth="1.5" {...BOX} />
        <text x="650" y="136" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('resonator')}>Resonador</text>
        <text x="650" y="150" textAnchor="middle" fontSize="9" fill={txt('resonator')}>Helmholtz</text>
      </g>
      <line x1="690" y1="140" x2="730" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('muffler')}>
        <rect x="730" y="118" width="80" height="44" fill={sel('muffler')} stroke={str('muffler')} strokeWidth="1.5" {...BOX} />
        <text x="770" y="136" textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('muffler')}>Silenciador</text>
        <text x="770" y="150" textAnchor="middle" fontSize="9" fill={txt('muffler')}>Sport</text>
      </g>
      <line x1="810" y1="140" x2="840" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('tips')}>
        <rect x="840" y="126" width="14" height="28" fill={sel('tips')} stroke={str('tips')} strokeWidth="1.5" rx="4" />
      </g>
    </svg>
  )
}

// ── Flat-6 Biturbo ─────────────────────────────────────────────────────────────
function Flat6ttDiagram({ selected, onSelect, color }: { selected: string | null; onSelect: (id: string) => void; color: string }) {
  const sel = (id: string) => selected === id ? color : '#E8E8ED'
  const txt = (id: string) => selected === id ? '#FFFFFF' : '#1D1D1F'
  const str = (id: string) => selected === id ? color : '#C7C7CC'

  return (
    <svg viewBox="0 0 860 280" style={{ width: '100%', maxHeight: '260px' }} aria-label="Diagrama escape Flat-6 Biturbo">
      <rect x="0" y="0" width="860" height="280" fill="#FAFAFA" rx="12" />
      <text x="16" y="24" fontSize="10" fill="#C7C7CC" fontFamily="ui-monospace, monospace">SISTEMA DE ESCAPE — FLAT-6 BITURBO</text>

      <rect x="340" y="120" width="80" height="40" fill="#D2D2D7" rx="4" />
      <text x="380" y="144" textAnchor="middle" fontSize="8" fill="#86868B">BOXER TT</text>

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_l')}>
        <rect x="30" y="75" width="105" height="46" fill={sel('manifold_l')} stroke={str('manifold_l')} strokeWidth="1.5" {...BOX} />
        <text x="82" y="95" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_l')}>Colector Izq.</text>
        <text x="82" y="109" textAnchor="middle" fontSize="9" fill={txt('manifold_l')}>3→1</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold_r')}>
        <rect x="30" y="162" width="105" height="46" fill={sel('manifold_r')} stroke={str('manifold_r')} strokeWidth="1.5" {...BOX} />
        <text x="82" y="182" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold_r')}>Colector Der.</text>
        <text x="82" y="196" textAnchor="middle" fontSize="9" fill={txt('manifold_r')}>3→1</text>
      </g>
      <line x1="135" y1="98" x2="175" y2="98" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="135" y1="185" x2="175" y2="185" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('turbo_l')}>
        <ellipse cx="200" cy="98" rx="24" ry="20" fill={sel('turbo_l')} stroke={str('turbo_l')} strokeWidth="1.5" />
        <text x="200" y="95" textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('turbo_l')}>Turbo</text>
        <text x="200" y="107" textAnchor="middle" fontSize="8" fill={txt('turbo_l')}>VTG</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('turbo_r')}>
        <ellipse cx="200" cy="185" rx="24" ry="20" fill={sel('turbo_r')} stroke={str('turbo_r')} strokeWidth="1.5" />
        <text x="200" y="182" textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('turbo_r')}>Turbo</text>
        <text x="200" y="194" textAnchor="middle" fontSize="8" fill={txt('turbo_r')}>VTG</text>
      </g>
      <line x1="224" y1="98" x2="265" y2="98" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="224" y1="185" x2="265" y2="185" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_l')}>
        <rect x="265" y="78" width="90" height="40" fill={sel('cat_l')} stroke={str('cat_l')} strokeWidth="1.5" {...BOX} />
        <text x="310" y="96" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_l')}>Cat Izq.</text>
        <text x="310" y="109" textAnchor="middle" fontSize="9" fill={txt('cat_l')}>3-vías</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('cat_r')}>
        <rect x="265" y="165" width="90" height="40" fill={sel('cat_r')} stroke={str('cat_r')} strokeWidth="1.5" {...BOX} />
        <text x="310" y="183" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('cat_r')}>Cat Der.</text>
        <text x="310" y="196" textAnchor="middle" fontSize="9" fill={txt('cat_r')}>3-vías</text>
      </g>
      <line x1="355" y1="98" x2="490" y2="136" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1="355" y1="185" x2="490" y2="144" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('hpipe')}>
        <rect x="490" y="114" width="80" height="52" fill={sel('hpipe')} stroke={str('hpipe')} strokeWidth="1.5" {...BOX} />
        <text x="530" y="136" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('hpipe')}>H-Pipe</text>
        <text x="530" y="150" textAnchor="middle" fontSize="9" fill={txt('hpipe')}>TT</text>
      </g>
      <line x1="570" y1="140" x2="620" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('muffler')}>
        <rect x="620" y="110" width="130" height="60" fill={sel('muffler')} stroke={str('muffler')} strokeWidth="1.5" {...BOX} />
        <text x="685" y="134" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('muffler')}>Silenciador</text>
        <text x="685" y="149" textAnchor="middle" fontSize="9" fill={txt('muffler')}>Sport / Activo</text>
      </g>
      <line x1="750" y1="140" x2="800" y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('tips')}>
        <rect x="800" y="118" width="54" height="44" fill={sel('tips')} stroke={str('tips')} strokeWidth="1.5" {...BOX} />
        <text x="827" y="137" textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('tips')}>Sal.</text>
        <text x="827" y="151" textAnchor="middle" fontSize="9" fill={txt('tips')}>×2</text>
      </g>
    </svg>
  )
}

// ── Inline-6 Biturbo ───────────────────────────────────────────────────────────
function I6ttDiagram({ selected, onSelect, color }: { selected: string | null; onSelect: (id: string) => void; color: string }) {
  const sel = (id: string) => selected === id ? color : '#E8E8ED'
  const txt = (id: string) => selected === id ? '#FFFFFF' : '#1D1D1F'
  const str = (id: string) => selected === id ? color : '#C7C7CC'
  const labels = [['Colector', '6→2'], ['Turbo L', 'cil. 4-5-6'], ['Turbo R', 'cil. 1-2-3'], ['Downpipe', '+ Cat'], ['Mid-Pipe', '70 mm'], ['Silenciador', 'Activo M'], ['Salidas', '×4']]
  const xPositions = [40, 150, 150, 280, 400, 530, 680]
  const yPositions = [120, 60, 190, 120, 120, 120, 120]

  return (
    <svg viewBox="0 0 860 280" style={{ width: '100%', maxHeight: '260px' }} aria-label="Diagrama escape I6 biturbo">
      <rect x="0" y="0" width="860" height="280" fill="#FAFAFA" rx="12" />
      <text x="16" y="24" fontSize="10" fill="#C7C7CC" fontFamily="ui-monospace, monospace">SISTEMA DE ESCAPE — INLINE 6 BITURBO</text>

      <rect x="2" y="100" width="34" height="80" fill="#D2D2D7" rx="4" />
      <text x="19" y="138" textAnchor="middle" fontSize="8" fill="#86868B" transform="rotate(-90 19 138)">I6</text>
      {[110,120,130,140,150,160,170].map(y => (
        <line key={y} x1="2" y1={y} x2="36" y2={y} stroke="#C7C7CC" strokeWidth="0.6" />
      ))}

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('manifold')}>
        <rect x={xPositions[0]} y={yPositions[0] - 22} width="100" height="44" fill={sel('manifold')} stroke={str('manifold')} strokeWidth="1.5" {...BOX} />
        <text x={xPositions[0] + 50} y={yPositions[0] - 4} textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('manifold')}>{labels[0][0]}</text>
        <text x={xPositions[0] + 50} y={yPositions[0] + 10} textAnchor="middle" fontSize="9" fill={txt('manifold')}>{labels[0][1]}</text>
      </g>

      <line x1="36" y1="140" x2={xPositions[0]} y2="120" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1={xPositions[0] + 100} y1="105" x2={xPositions[1]} y2="82" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1={xPositions[0] + 100} y1="135" x2={xPositions[2]} y2="208" stroke="#C7C7CC" strokeWidth="1.5" strokeDasharray="4,3" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('turbo_l')}>
        <ellipse cx={xPositions[1] + 30} cy={yPositions[1]} rx="30" ry="22" fill={sel('turbo_l')} stroke={str('turbo_l')} strokeWidth="1.5" />
        <text x={xPositions[1] + 30} y={yPositions[1] - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('turbo_l')}>Turbo L</text>
        <text x={xPositions[1] + 30} y={yPositions[1] + 8} textAnchor="middle" fontSize="8" fill={txt('turbo_l')}>VGT</text>
      </g>
      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('turbo_r')}>
        <ellipse cx={xPositions[2] + 30} cy={yPositions[2]} rx="30" ry="22" fill={sel('turbo_r')} stroke={str('turbo_r')} strokeWidth="1.5" />
        <text x={xPositions[2] + 30} y={yPositions[2] - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill={txt('turbo_r')}>Turbo R</text>
        <text x={xPositions[2] + 30} y={yPositions[2] + 8} textAnchor="middle" fontSize="8" fill={txt('turbo_r')}>VGT</text>
      </g>

      <line x1={xPositions[1] + 60} y1={yPositions[1]} x2={xPositions[3]} y2="120" stroke="#C7C7CC" strokeWidth="1.5" />
      <line x1={xPositions[2] + 60} y1={yPositions[2]} x2={xPositions[3]} y2="140" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('downpipe')}>
        <rect x={xPositions[3]} y={yPositions[3] - 32} width="100" height="64" fill={sel('downpipe')} stroke={str('downpipe')} strokeWidth="1.5" {...BOX} />
        <text x={xPositions[3] + 50} y={yPositions[3] - 12} textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('downpipe')}>{labels[3][0]}</text>
        <text x={xPositions[3] + 50} y={yPositions[3] + 4} textAnchor="middle" fontSize="9" fill={txt('downpipe')}>{labels[3][1]}</text>
      </g>

      <line x1={xPositions[3] + 100} y1="120" x2={xPositions[4]} y2="120" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('midpipe')}>
        <rect x={xPositions[4]} y={yPositions[4] - 28} width="100" height="56" fill={sel('midpipe')} stroke={str('midpipe')} strokeWidth="1.5" {...BOX} />
        <text x={xPositions[4] + 50} y={yPositions[4] - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('midpipe')}>{labels[4][0]}</text>
        <text x={xPositions[4] + 50} y={yPositions[4] + 8} textAnchor="middle" fontSize="9" fill={txt('midpipe')}>{labels[4][1]}</text>
      </g>

      <line x1={xPositions[4] + 100} y1="120" x2={xPositions[5]} y2="120" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('muffler')}>
        <rect x={xPositions[5]} y={yPositions[5] - 30} width="120" height="60" fill={sel('muffler')} stroke={str('muffler')} strokeWidth="1.5" {...BOX} />
        <text x={xPositions[5] + 60} y={yPositions[5] - 10} textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('muffler')}>{labels[5][0]}</text>
        <text x={xPositions[5] + 60} y={yPositions[5] + 6} textAnchor="middle" fontSize="9" fill={txt('muffler')}>{labels[5][1]}</text>
      </g>

      <line x1={xPositions[5] + 120} y1="120" x2={xPositions[6]} y2="120" stroke="#C7C7CC" strokeWidth="1.5" />

      <g style={{ cursor: 'pointer' }} onClick={() => onSelect('tips')}>
        <rect x={xPositions[6]} y={yPositions[6] - 28} width="90" height="56" fill={sel('tips')} stroke={str('tips')} strokeWidth="1.5" {...BOX} />
        <text x={xPositions[6] + 45} y={yPositions[6] - 8} textAnchor="middle" fontSize="10" fontWeight="600" fill={txt('tips')}>{labels[6][0]}</text>
        <text x={xPositions[6] + 45} y={yPositions[6] + 8} textAnchor="middle" fontSize="9" fill={txt('tips')}>{labels[6][1]}</text>
      </g>
    </svg>
  )
}

/**
 * Diagrama clicable GENÉRICO generado desde los componentes del esquema.
 * Sirve para cualquier arquitectura (incluidas las nuevas) y refleja en vivo
 * los cambios del panel: añadir, quitar o renombrar componentes.
 */
function GenericDiagram({
  components, selected, onSelect, color,
}: {
  components: Record<string, { id: string; name: string; material?: string }>
  selected: string | null
  onSelect: (id: string) => void
  color: string
}) {
  const list = sortedComponents(components)
  if (list.length === 0) {
    return <div style={{ color: '#86868B', fontSize: 13, padding: '20px 8px' }}>Este modelo no tiene componentes cargados todavía.</div>
  }
  return (
    <div style={{ padding: '4px 2px', display: 'flex', justifyContent: 'center' }}>
      {/* Columna de 230px que se estrecha (minWidth 0) en contenedores más angostos */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%', maxWidth: 230, minWidth: 0 }}>
        {/* motor (arriba) */}
        <div style={{
          flexShrink: 0, width: 130, height: 30, borderRadius: 8, backgroundColor: '#E5E5EA',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 10, color: '#86868B', letterSpacing: '0.08em' }}>MOTOR</span>
        </div>
        {list.map((c, i) => {
          const isSel = c.id === selected
          return (
            <div key={c.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '100%' }}>
              {/* conector vertical (flujo de gases descendente) */}
              <div style={{ width: 2, height: 18, backgroundColor: '#D2D2D7' }} />
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                title={c.name}
                aria-label={`${i + 1}. ${c.name}`}
                aria-pressed={isSel}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                  border: `2px solid ${isSel ? color : '#E5E5EA'}`,
                  backgroundColor: isSel ? `${color}12` : '#FFFFFF',
                  color: '#1D1D1F', textAlign: 'left', transition: 'all .15s ease',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                {/* Número clicable (mismo índice que las pills) */}
                <span
                  style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    backgroundColor: isSel ? color : '#F2F2F7',
                    color: isSel ? '#FFFFFF' : '#1D1D1F',
                    transition: 'all .15s ease',
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{c.name}</span>
                  {c.material && <span style={{ display: 'block', fontSize: 10, color: '#86868B', marginTop: 2 }}>{c.material}</span>}
                </span>
              </button>
            </div>
          )
        })}
        {/* salida (abajo) */}
        <div style={{ width: 2, height: 18, backgroundColor: '#D2D2D7' }} />
        <div style={{
          flexShrink: 0, width: 130, height: 30, borderRadius: 8, border: '1px dashed #D2D2D7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 10, color: '#86868B', letterSpacing: '0.08em' }}>SALIDA</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// OJO: professional_products NO tiene columna `in_stock` (solo `stock` integer, default 0); pedirla
// en el select hace fallar la query entera del facade y deja la página sin productos.
interface MarketProduct extends ProductSpecs {
  id: string
  product_name: string
  price: number | null
  pro_price?: number | null
  images: string[] | null
  category: string | null
  stock?: number | null
  professional_id?: string | null
  /** Adjuntado en cliente (attachRelated), igual que el store del marketplace. Solo para el carrito. */
  seller?: { full_name?: string | null; company_name?: string | null } | null
}

/** Stock legible (misma regla que la ficha de producto: stock <= 0 → "Sin stock"). */
function stockInfo(p: MarketProduct): { label: string; ok: boolean } {
  if (p.stock == null) return { label: 'En stock', ok: true }
  return p.stock > 0 ? { label: `${p.stock} ud`, ok: true } : { label: 'Sin stock', ok: false }
}

const fmtEur = (n: number) => `${n.toFixed(2)} €`

const _norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
// Reglas de emparejamiento componente → productos (opción C: automático por categoría/nombre).
const COMP_TO_PROD: { k: string[]; t: string[] }[] = [
  { k: ['silenc', 'muffler', 'catback', 'cat-back', 'trasero', 'resonador'], t: ['silenc', 'muffler', 'catback'] },
  { k: ['salida', 'tip', 'cola'], t: ['tip', 'salida', 'cola'] },
  { k: ['downpipe', 'bajada', 'front pipe', 'frontpipe'], t: ['downpipe'] },
  { k: ['catalizador', 'opf', 'gpf', 'catalytic'], t: ['catal', 'catalytic'] },
  { k: ['colector', 'manifold', 'header'], t: ['manifold', 'flange', 'colector', 'header'] },
  { k: ['valv', 'valve'], t: ['valve', 'valv'] },
  { k: ['flange', 'brida'], t: ['flange', 'brida'] },
  { k: ['x-pipe', 'y-pipe', 'xpipe', 'ypipe', 'pipe', 'tubo', 'tramo'], t: ['pipe', 'flexible', 'reducer', 'tubo'] },
]
/** Empareja un componente del esquema con productos del marketplace. Si no hay match
 *  específico, cae a sistemas completos (para no dejar el particular sin nada que comprar). */
function productsForComponent(
  comp: { id?: string; name?: string; product_ids?: string[] } | null,
  all: MarketProduct[],
): { list: MarketProduct[]; generic: boolean; exact: boolean } {
  if (!comp) return { list: [], generic: false, exact: false }
  const priced = all.filter((p) => p.price != null)
  // Enlace EXACTO (plug&play): productos que el admin ató a esta pieza concreta.
  const pids = comp.product_ids
  if (Array.isArray(pids) && pids.length) {
    const byId = new Map(priced.map((p) => [p.id, p]))
    const exact = pids.map((id) => byId.get(id)).filter((p): p is MarketProduct => !!p)
    if (exact.length) return { list: exact, generic: false, exact: true }
  }
  // Fallback: emparejamiento automático por categoría/nombre.
  const hay = _norm(`${comp.id ?? ''} ${comp.name ?? ''}`)
  const rule = COMP_TO_PROD.find((r) => r.k.some((k) => hay.includes(k)))
  const toks = rule?.t ?? []
  const specific = toks.length
    ? priced.filter((p) => {
        const h = _norm(`${p.category ?? ''} ${p.product_name ?? ''}`)
        return toks.some((t) => h.includes(t))
      })
    : []
  if (specific.length) return { list: specific, generic: false, exact: false }
  const systems = priced.filter((p) => _norm(p.category ?? '').includes('system'))
  return { list: systems, generic: true, exact: false }
}

export default function ExhaustSchemasPage() {
  const { user, profile } = useAuthStore()
  const [schemas, setSchemas] = useState<CarSchema[]>([])
  const [products, setProducts] = useState<MarketProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [productsLoaded, setProductsLoaded] = useState(false)
  const [justAddedId, setJustAddedId] = useState<string | null>(null)
  const justAddedTimer = useRef<number | undefined>(undefined)
  const [cartCount, setCartCount] = useState(() => cart.count())

  // Responsive: >1068px = 3 columnas · 735–1068px = esquema+detalle y productos debajo · ≤735px = 1 columna.
  const isTabletDown = useMediaQuery('(max-width: 1068px)')
  const isMobile = useMediaQuery('(max-width: 735px)')
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const layoutMode: 'desktop' | 'tablet' | 'mobile' = isMobile ? 'mobile' : isTabletDown ? 'tablet' : 'desktop'
  const detailRef = useRef<HTMLElement | null>(null)
  const pillBarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    supabase
      .from('exhaust_schemas')
      .select('*')
      .eq('is_active', true)
      .order('brand')
      .order('model')
      .then(({ data, error }) => {
        if (error) console.error(error)
        const rows = (data ?? []) as CarSchema[]
        setSchemas(rows)
        if (rows.length > 0) {
          setSelectedBrand(rows[0].brand)
          setSelectedCarId(rows[0].id)
        }
        setLoading(false)
      })
  }, [])

  // Productos del marketplace para vincular a los componentes (sección "comprar").
  // pro_price + professional_id hacen falta para el carrito (precio efectivo + vendedor).
  useEffect(() => {
    let alive = true
    supabase
      .from('professional_products')
      .select(`id, product_name, price, pro_price, images, category, stock, professional_id, ${SPEC_SELECT}`)
      .eq('is_active', true)
      .then(async ({ data, error }) => {
        if (error) console.error(error)
        if (!alive) return
        const rows = (data ?? []) as MarketProduct[]
        setProducts(rows)
        setProductsLoaded(true)
        // Nombre del vendedor para el carrito (mismo join en cliente que useMarketplaceStore).
        // Best-effort: el facade solo devuelve perfiles propios a no-admins → suele quedar null.
        try {
          const withSeller = (await attachRelated(
            rows.map((r) => ({ ...r })) as unknown as Record<string, unknown>[],
            [{ table: 'user_profiles', fk: 'professional_id', as: 'seller', columns: 'id, full_name, company_name' }],
          )) as unknown as MarketProduct[]
          if (alive) setProducts(withSeller)
        } catch { /* opcional */ }
      })
    return () => { alive = false }
  }, [])

  // Contador del carrito (para el enlace "Ver carrito" del despiece).
  useEffect(() => {
    const refresh = () => setCartCount(cart.count())
    window.addEventListener('em_cart_changed', refresh)
    return () => {
      window.removeEventListener('em_cart_changed', refresh)
      window.clearTimeout(justAddedTimer.current)
    }
  }, [])

  const q = search.trim().toLowerCase()
  const matches = (s: CarSchema) =>
    !q ||
    s.brand.toLowerCase().includes(q) ||
    s.model.toLowerCase().includes(q) ||
    (s.engine ?? '').toLowerCase().includes(q)

  // Marcas únicas, orden alfabético
  const brands = useMemo(
    () => Array.from(new Set(schemas.map(s => s.brand))).sort((a, b) => a.localeCompare(b)),
    [schemas],
  )
  // Marcas visibles en el rail (si hay búsqueda, solo las que tienen coincidencias)
  const visibleBrands = useMemo(
    () => brands.filter(b => schemas.some(s => s.brand === b && matches(s))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brands, schemas, q],
  )
  // Modelo → motorizaciones para la marca activa
  const modelGroups = useMemo(() => {
    const rows = schemas.filter(s => s.brand === selectedBrand && matches(s))
    const map = new Map<string, CarSchema[]>()
    for (const s of rows) { const arr = map.get(s.model) ?? []; arr.push(s); map.set(s.model, arr) }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([model, rs]) => ({ model, rows: rs.sort((x, y) => (x.engine ?? '').localeCompare(y.engine ?? '')) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemas, selectedBrand, q])

  const filteredSchemas = useMemo(
    () => schemas.filter(s => s.brand === selectedBrand && matches(s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [schemas, selectedBrand, q],
  )

  // Si se busca algo de otra marca, saltar a la 1ª marca con resultados
  useEffect(() => {
    if (q && visibleBrands.length > 0 && !visibleBrands.includes(selectedBrand)) {
      setSelectedBrand(visibleBrands[0])
      setSelectedComponent(null)
    }
  }, [q, visibleBrands, selectedBrand])

  const car = schemas.find(s => s.id === selectedCarId) ?? filteredSchemas[0] ?? null
  const orderedComponents = useMemo(() => (car ? sortedComponents(car.components) : []), [car])
  // Siempre hay un componente activo: el elegido por el usuario o, por defecto, el 1º del esquema
  // (al cargar o cambiar de esquema). Así las 3 columnas nunca quedan vacías.
  const activeIndex = Math.max(0, orderedComponents.findIndex((c) => c.id === selectedComponent))
  const component: Component | null = orderedComponents[activeIndex] ?? null
  const activeId = component?.id ?? null
  const componentProducts = useMemo(() => productsForComponent(component, products), [component, products])
  // Producto equivalente por fila del despiece (exacto si el admin lo vinculó, si no por nombre).
  // Sin el comodín de «sistemas completos»: una fila como «Aislante cerámico» no debe ofrecer
  // un sistema entero de 2.450 € con botón de compra.
  const despieceProducts = useMemo(
    () =>
      (car?.despiece ?? []).map((d) => {
        const m = productsForComponent({ name: d.element, product_ids: d.product_ids }, products)
        return m.generic ? null : m.list[0] ?? null
      }),
    [car, products],
  )
  const carUnlocked = !!car && canViewTiers(car.allowed_tiers, profile?.user_type, profile?.is_admin)
  // Gating por sección (el servidor ya recorta los datos; esto oculta secciones + evita huecos).
  const canOem = canSeeOem(profile?.user_type, profile?.is_admin)
  const canWs = canSeeWorkshopData(profile?.user_type, profile?.is_admin)

  // Móvil: mantener visible la pill activa dentro de la barra con scroll horizontal
  // (solo desplaza la barra, nunca la página).
  useEffect(() => {
    if (!isMobile || !activeId) return
    const bar = pillBarRef.current
    if (!bar) return
    const pill = Array.from(bar.children).find(
      (el) => (el as HTMLElement).dataset.pillId === activeId,
    ) as HTMLElement | undefined
    if (!pill) return
    const left = pill.offsetLeft - (bar.clientWidth - pill.offsetWidth) / 2
    bar.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [activeId, isMobile, reduceMotion])

  /** Selecciona un componente (pills, números del esquema, refs OEM). En móvil baja al detalle.
   *  La sección de detalle siempre está montada y su posición no depende del componente elegido,
   *  así que se puede desplazar ya (scrollMarginTop deja libre la nav + la barra de pills). */
  function selectComponent(id: string) {
    setSelectedComponent(id)
    if (isMobile && carUnlocked) {
      detailRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    }
  }

  /** Añadir al carrito: mismo cart.add y misma forma de CartItem que MarketplaceProductPage
   *  (el servidor recalcula el precio real al crear el pedido; unit_price es solo para mostrar). */
  function handleAddToCart(p: MarketProduct) {
    const eff = effectivePrice({ price: p.price, pro_price: p.pro_price }, profile?.user_type, profile?.is_admin)
    const result = cart.add({
      product_type: 'professional_product',
      product_id: p.id,
      product_name: p.product_name ?? 'Producto',
      unit_price: eff.price,
      quantity: 1,
      seller_id: p.professional_id ?? null,
      seller_name: p.seller?.full_name ?? p.seller?.company_name ?? null,
      image_url: p.images?.[0] ?? null,
    })
    if (!result.ok) {
      toast.error(result.error ?? 'No se pudo añadir al carrito')
      return
    }
    toast.success(`Añadido al carrito: ${p.product_name}`)
    setJustAddedId(p.id)
    window.clearTimeout(justAddedTimer.current)
    justAddedTimer.current = window.setTimeout(() => setJustAddedId(null), 1800)
  }

  function handleBrandSelect(brand: string) {
    setSelectedBrand(brand)
    setSelectedComponent(null)
    const first = schemas.find(s => s.brand === brand)
    if (first) setSelectedCarId(first.id)
  }

  function handleCarSelect(id: string) {
    setSelectedCarId(id)
    setSelectedComponent(null)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: '#86868B' }}>
        Cargando esquemas...
      </div>
    )
  }

  return (
    <div className="content-width" style={{ paddingTop: '32px', paddingBottom: '60px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Esquemas Interactivos de Escape
        </h1>
        <p style={{ fontSize: '16px', color: '#86868B', margin: 0, lineHeight: 1.5, maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
          {schemas.length} modelos de alta gama. Toca cualquier componente para ver los detalles técnicos.
        </p>
      </div>

      {/* Search */}
      <div style={{ maxWidth: '380px', margin: '0 auto 24px', position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#86868B' }} />
        <input
          type="text"
          placeholder="Buscar por marca, modelo o motor…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px 10px 34px',
            borderRadius: '10px',
            border: '1px solid #E5E5EA',
            fontSize: '14px',
            color: '#1D1D1F',
            outline: 'none',
            backgroundColor: '#FAFAFA',
          }}
        />
      </div>

      {/* Selector marca → modelo → motorización (listas verticales, escala a cientos) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 220px) 1fr', gap: 12, maxWidth: 900, margin: '0 auto 24px', alignItems: 'start' }}>
        {/* Col 1 — Marcas */}
        <div style={railBox}>
          <p style={railHeading}>Marcas</p>
          {visibleBrands.map(brand => {
            const active = brand === selectedBrand
            const count = schemas.filter(s => s.brand === brand).length
            return (
              <button key={brand} onClick={() => handleBrandSelect(brand)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '9px 12px', borderRadius: 9, border: 'none',
                  cursor: 'pointer', textAlign: 'left', marginBottom: 2,
                  backgroundColor: active ? '#1D1D1F' : 'transparent',
                  color: active ? '#FFFFFF' : '#1D1D1F', transition: 'background .15s ease',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#F5F5F7' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}>
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brand}</span>
                <span style={{ fontSize: 11, color: active ? 'rgba(255,255,255,.6)' : '#C7C7CC', flexShrink: 0 }}>{count}</span>
              </button>
            )
          })}
          {visibleBrands.length === 0 && (
            <p style={{ fontSize: 12, color: '#86868B', padding: '10px 12px' }}>Sin resultados</p>
          )}
        </div>

        {/* Col 2 — Modelos → motorizaciones (vertical, agrupado, seguido) */}
        <div style={railBox}>
          <p style={railHeading}>{selectedBrand || '—'} · modelos</p>
          {modelGroups.map(group => (
            <div key={group.model} style={{ marginBottom: 6 }}>
              <div style={{ position: 'sticky', top: 0, backgroundColor: '#FFFFFF', padding: '6px 12px 4px', zIndex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.01em' }}>{group.model}</span>
                <span style={{ fontSize: 11, color: '#C7C7CC', marginLeft: 6 }}>{group.rows.length} motoriz.</span>
              </div>
              {group.rows.map(row => {
                const active = row.id === selectedCarId
                return (
                  <button key={row.id} onClick={() => handleCarSelect(row.id)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      width: '100%', padding: '8px 12px', borderRadius: 9, marginBottom: 2, cursor: 'pointer',
                      textAlign: 'left', border: `1px solid ${active ? row.color : 'transparent'}`,
                      backgroundColor: active ? `${row.color}12` : 'transparent', transition: 'all .15s ease',
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#F5F5F7' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: row.color, flexShrink: 0 }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#1D1D1F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row.engine || 'Motorización'}
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: '#86868B' }}>
                          {row.power}{row.year ? ` · ${row.year}` : ''}
                        </span>
                      </span>
                    </span>
                    <ChevronRight size={14} style={{ color: active ? row.color : '#C7C7CC', flexShrink: 0 }} />
                  </button>
                )
              })}
            </div>
          ))}
          {modelGroups.length === 0 && (
            <p style={{ fontSize: 12, color: '#86868B', padding: '10px 12px' }}>No hay modelos para esta marca.</p>
          )}
        </div>
      </div>

      {car && (
        <>
          {(() => {
            return (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #F2F2F7',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  marginBottom: '16px',
                }}
              >
                {/* Top: brand + name */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #F2F2F7',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: `${car.color}14`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: car.color, fontSize: 20, fontWeight: 700 }}>
                      {car.brand[0]}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: '#1D1D1F',
                        margin: 0,
                        letterSpacing: '-0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      {car.brand} {car.model}
                      <TierBadge
                        allowedTiers={car.allowed_tiers ?? []}
                        locked={!carUnlocked}
                        size="sm"
                      />
                    </h2>
                    <p style={{ fontSize: 12, color: '#86868B', margin: '2px 0 0' }}>
                      {car.year}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                    <div>
                      <p style={dossierMetaLabel}>Motor</p>
                      <p style={dossierMetaValue}>{car.engine}</p>
                    </div>
                    <div>
                      <p style={dossierMetaLabel}>Potencia</p>
                      <p style={dossierMetaValue}>{car.power}</p>
                    </div>
                    {emissionsBadgeLabel(car.emissions) && (
                      <div>
                        <p style={dossierMetaLabel}>Normativa</p>
                        <span style={{
                          display: 'inline-block', marginTop: 2, padding: '2px 9px', borderRadius: 6,
                          backgroundColor: `${car.color}14`, color: car.color, fontSize: 13, fontWeight: 600,
                          border: `1px solid ${car.color}30`, lineHeight: 1.4,
                        }}>
                          {emissionsBadgeLabel(car.emissions)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {car.note && (
                  <div
                    style={{
                      marginTop: 12,
                      backgroundColor: `${car.color}10`,
                      border: `1px solid ${car.color}30`,
                      borderRadius: 10,
                      padding: '10px 14px',
                      fontSize: 13,
                      color: '#1D1D1F',
                      lineHeight: 1.5,
                    }}
                  >
                    <Info size={13} style={{ display: 'inline', marginRight: 6, color: car.color, verticalAlign: 'middle' }} />
                    {car.note}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Photo gallery */}
          {(car.cover_url || (car.gallery_urls && car.gallery_urls.length > 0)) && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              {[
                ...(car.cover_url ? [car.cover_url] : []),
                ...(car.gallery_urls ?? []),
              ].map((url) => (
                <div
                  key={url}
                  style={{
                    aspectRatio: '4 / 3',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: '#F5F5F7',
                    border: '1px solid #F2F2F7',
                  }}
                >
                  <img
                    src={url}
                    alt={`${car.brand} ${car.model}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}

          {!carUnlocked && (
            <UpgradeCallout
              allowedTiers={car.allowed_tiers ?? []}
              isAuthenticated={!!user}
              title="Esquema técnico exclusivo"
              description="El diagrama interactivo con materiales, temperaturas y consejos técnicos está disponible solo para suscripciones seleccionadas."
            />
          )}

          {/* Ficha del esquema (Cambio 5): pills arriba + 3 columnas en PC (esquema · detalles ·
              productos), esquema+detalle con productos debajo en tablet vertical, y columna única
              en móvil (pills sticky con scroll horizontal). Siempre hay un componente activo. */}
          {orderedComponents.length === 0 ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #F2F2F7',
                borderRadius: 18,
                padding: '40px 24px',
                textAlign: 'center',
              }}
            >
              <Layers size={22} style={{ color: '#C7C7CC', display: 'block', margin: '0 auto' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', margin: '10px 0 4px' }}>
                Este esquema aún no tiene componentes
              </p>
              <p style={{ fontSize: 13, color: '#86868B', margin: 0, lineHeight: 1.5 }}>
                Estamos documentando sus piezas. Vuelve pronto para explorar el sistema de escape pieza a pieza.
              </p>
            </div>
          ) : (
            <div
              style={{
                position: 'relative',
                ...(carUnlocked
                  ? {}
                  : { filter: 'blur(6px) saturate(0.5)', pointerEvents: 'none', userSelect: 'none', opacity: 0.55 }),
              }}
            >
              {/* Pills de componentes: fila completa encima de las columnas.
                  En móvil: barra sticky (bajo la nav fija de 44px) con scroll horizontal, sin saltos de línea. */}
              <div
                ref={pillBarRef}
                role="toolbar"
                aria-label="Componentes del sistema"
                className={isMobile ? 'schema-pills-scroll' : undefined}
                style={
                  isMobile
                    ? {
                        // sticky solo si el usuario puede usarla (bloqueado = borrosa y sin clics)
                        position: carUnlocked ? 'sticky' : 'relative',
                        top: carUnlocked ? 44 : undefined,
                        zIndex: 20,
                        display: 'flex',
                        flexWrap: 'nowrap',
                        gap: 6,
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        // a sangre: compensa el padding lateral (22px) de .content-width
                        margin: '0 -22px 12px',
                        padding: '10px 22px',
                        backgroundColor: 'rgba(255,255,255,0.94)',
                        backdropFilter: 'saturate(180%) blur(20px)',
                        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
                        borderBottom: '1px solid #F2F2F7',
                      }
                    : { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }
                }
              >
                {orderedComponents.map((c, i) => {
                  const isSel = c.id === activeId
                  return (
                    <button
                      key={c.id}
                      type="button"
                      data-pill-id={c.id}
                      onClick={() => selectComponent(c.id)}
                      aria-pressed={isSel}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        padding: isMobile ? '7px 14px 7px 7px' : '4px 12px 4px 5px',
                        borderRadius: '980px',
                        fontSize: isMobile ? 13 : 12,
                        border: `1px solid ${isSel ? car.color : '#E5E5EA'}`,
                        cursor: 'pointer',
                        backgroundColor: isSel ? car.color : '#FFFFFF',
                        color: isSel ? '#FFFFFF' : '#6E6E73',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span
                        style={{
                          minWidth: 18,
                          height: 18,
                          padding: '0 4px',
                          boxSizing: 'border-box',
                          borderRadius: 9,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          fontWeight: 700,
                          backgroundColor: isSel ? 'rgba(255,255,255,0.25)' : '#F2F2F7',
                          color: isSel ? '#FFFFFF' : '#86868B',
                        }}
                      >
                        {i + 1}
                      </span>
                      {c.name}
                    </button>
                  )
                })}
              </div>

              {/* PC: 3 columnas · tablet vertical: esquema + detalle, productos a todo el ancho · móvil: 1 columna */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    layoutMode === 'desktop'
                      ? 'minmax(0, 0.9fr) minmax(0, 1.15fr) minmax(0, 0.95fr)'
                      : layoutMode === 'tablet'
                        ? 'minmax(0, 1fr) minmax(0, 1.2fr)'
                        : 'minmax(0, 1fr)',
                  gap: 16,
                }}
              >
                {/* COL 1 — Esquema del sistema */}
                <section style={colCard}>
                  <p style={colLabel}>Esquema del sistema</p>
                  {/* Diagrama clicable generado desde los componentes (vale para todas las
                      arquitecturas y refleja los cambios de add/quitar/renombrar del panel). */}
                  <GenericDiagram components={car.components} selected={activeId} onSelect={selectComponent} color={car.color} />
                  <p style={{ fontSize: 11, color: '#86868B', margin: '12px 0 0', textAlign: 'center', lineHeight: 1.45 }}>
                    Vista motor → salida. Los números son clicables, igual que las pills de arriba.
                  </p>
                </section>

                {/* COL 2 — Detalles del componente activo */}
                {component && (
                  <section
                    ref={detailRef}
                    style={{
                      ...colCard,
                      border: `1px solid ${car.color}30`,
                      // al hacer scroll automático en móvil, que no quede bajo la nav + la barra de pills
                      scrollMarginTop: isMobile ? 112 : 80,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                      <p style={{ ...colLabel, margin: 0 }}>Detalles</p>
                      <span style={{ fontSize: 11, color: '#C7C7CC', fontWeight: 500 }}>
                        {activeIndex + 1} / {orderedComponents.length}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          backgroundColor: car.color,
                          color: '#FFFFFF',
                        }}
                      >
                        {activeIndex + 1}
                      </span>
                      <h3 style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.25, minWidth: 0 }}>
                        {component.name}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Foto real de la pieza (o hueco neutro mientras no haya) */}
                      {component.image_url ? (
                        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #F2F2F7', aspectRatio: '4 / 3', backgroundColor: '#F5F5F7' }}>
                          <img key={component.id} src={component.image_url} alt={component.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                        </div>
                      ) : (
                        <div
                          style={{
                            borderRadius: 12,
                            border: '1px dashed #D2D2D7',
                            aspectRatio: '4 / 3',
                            backgroundColor: '#F5F5F7',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            color: '#86868B',
                          }}
                        >
                          <Camera size={20} style={{ color: '#C7C7CC' }} />
                          <span style={{ fontSize: 12 }}>Foto real de la pieza</span>
                        </div>
                      )}

                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#86868B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Ficha técnica
                      </span>

                      {/* Filas tipo "ficha de producto" (el servidor ya recorta los campos por tier) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {component.oem_ref && (
                          <FichaRow
                            icon={<Hash size={13} style={{ color: '#86868B' }} />}
                            label="Referencia OEM"
                            value={component.oem_ref}
                            mono
                          />
                        )}
                        <FichaRow
                          icon={<Layers size={13} style={{ color: '#0071E3' }} />}
                          label="Material principal"
                          value={component.material || '—'}
                        />
                        {component.diameter_mm != null && (
                          <FichaRow
                            icon={<Box size={13} style={{ color: '#86868B' }} />}
                            label="Diámetro tubo"
                            value={`${component.diameter_mm} mm`}
                          />
                        )}
                        {component.thickness_mm != null && (
                          <FichaRow
                            icon={<Layers size={13} style={{ color: '#86868B' }} />}
                            label="Espesor"
                            value={`${component.thickness_mm} mm`}
                          />
                        )}
                        {component.fabrication_hours != null && (
                          <FichaRow
                            icon={<Clock size={13} style={{ color: '#FF9500' }} />}
                            label="Tiempo fabricación"
                            value={`${component.fabrication_hours} h`}
                          />
                        )}
                        {component.material_cost != null && (
                          <FichaRow
                            icon={<Euro size={13} style={{ color: '#86868B' }} />}
                            label="Coste material"
                            value={`${component.material_cost} €`}
                          />
                        )}
                        {component.total_cost != null && (
                          <div
                            style={{
                              padding: '12px 0',
                              borderTop: '1px solid #F2F2F7',
                              marginTop: 4,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span style={{ fontSize: 12, color: '#86868B' }}>Coste total estimado</span>
                            <span style={{ fontSize: 22, fontWeight: 700, color: car.color, letterSpacing: '-0.01em' }}>
                              {component.total_cost} €
                            </span>
                          </div>
                        )}
                      </div>

                      {component.description && (
                        <p style={{ fontSize: 13, lineHeight: 1.6, color: '#3A3A3C', margin: 0 }}>
                          {component.description}
                        </p>
                      )}

                      {/* Consejo: caja destacada al final del detalle */}
                      {component.tip && (
                        <div
                          style={{
                            backgroundColor: `${car.color}0D`,
                            border: `1px solid ${car.color}25`,
                            borderRadius: 12,
                            padding: '12px 14px',
                          }}
                        >
                          <p style={{ fontSize: '11px', fontWeight: 600, color: car.color, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Lightbulb size={12} />
                            Consejo
                          </p>
                          <p style={{ fontSize: '12px', color: '#1D1D1F', margin: 0, lineHeight: 1.5 }}>{component.tip}</p>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* COL 3 — Productos compatibles (en tablet vertical ocupa todo el ancho, debajo) */}
                {component && (
                  <section style={{ ...colCard, ...(layoutMode === 'tablet' ? { gridColumn: '1 / -1' } : {}) }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <p style={{ ...colLabel, margin: 0 }}>Productos compatibles</p>
                      {componentProducts.exact && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#1f7a4d', background: '#1f7a4d18', padding: '1px 6px', borderRadius: 4, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                          PLUG &amp; PLAY
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: '#86868B', margin: '0 0 12px', lineHeight: 1.4 }}>
                      Vinculados a «{component.name}» en el marketplace
                    </p>

                    {!productsLoaded ? (
                      <p style={{ fontSize: 12, color: '#C7C7CC', margin: 0 }}>Cargando productos…</p>
                    ) : componentProducts.list.length === 0 ? (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 8,
                          textAlign: 'center',
                          padding: '22px 12px',
                          borderRadius: 14,
                          border: '1px dashed #E5E5EA',
                          backgroundColor: '#FAFAFA',
                        }}
                      >
                        <ShoppingBag size={18} style={{ color: '#C7C7CC' }} />
                        <p style={{ fontSize: 12, color: '#86868B', margin: 0, lineHeight: 1.45 }}>
                          Aún no hay productos vinculados a esta pieza.
                        </p>
                        <Link to="/marketplace" style={{ fontSize: 12, fontWeight: 600, color: '#0071E3', textDecoration: 'none' }}>
                          Explorar el marketplace ›
                        </Link>
                      </div>
                    ) : (
                      <>
                        {componentProducts.generic && (
                          <p style={{ fontSize: 12, color: '#6E6E73', backgroundColor: '#F5F5F7', borderRadius: 10, padding: '8px 10px', margin: '0 0 10px', lineHeight: 1.45 }}>
                            Sin recambio específico para esta pieza: te mostramos productos genéricos y sistemas completos compatibles.
                          </p>
                        )}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns:
                              layoutMode === 'desktop' ? 'minmax(0, 1fr)' : 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
                            gap: 8,
                          }}
                        >
                          {componentProducts.list.slice(0, 5).map((p) => {
                            const eff = effectivePrice({ price: p.price, pro_price: p.pro_price }, profile?.user_type, profile?.is_admin)
                            const st = stockInfo(p)
                            return (
                              <Link
                                key={p.id}
                                to={`/marketplace/product/${p.id}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: 12,
                                  padding: 10,
                                  minWidth: 0,
                                  borderRadius: 14,
                                  border: '1px solid #F2F2F7',
                                  textDecoration: 'none',
                                  backgroundColor: '#FFFFFF',
                                  transition: 'border-color .15s ease',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = car.color }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#F2F2F7' }}
                              >
                                <div
                                  style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 10,
                                    backgroundColor: '#F5F5F7',
                                    flexShrink: 0,
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {Array.isArray(p.images) && p.images[0] ? (
                                    <img src={p.images[0]} alt={p.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
                                  ) : (
                                    <ShoppingBag size={18} style={{ color: '#C7C7CC' }} />
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                  <span
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: '#1D1D1F',
                                      lineHeight: 1.3,
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {p.product_name}
                                  </span>
                                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                                    {eff.price > 0 ? (
                                      <span style={{ fontSize: 15, fontWeight: 700, color: '#D70015', letterSpacing: '-0.01em' }}>{fmtEur(eff.price)}</span>
                                    ) : (
                                      <span style={{ fontSize: 13, fontWeight: 600, color: '#86868B' }}>Consultar precio</span>
                                    )}
                                    {eff.isPro && (
                                      <>
                                        <span style={{ fontSize: 11, color: '#86868B', textDecoration: 'line-through' }}>{fmtEur(eff.base)}</span>
                                        <span style={{ fontSize: 9, fontWeight: 700, color: '#0071E3', backgroundColor: '#0071E320', padding: '1px 5px', borderRadius: 4 }}>PRO</span>
                                      </>
                                    )}
                                  </span>
                                  {specSummary(p) && (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#3A3A3C' }} title="Medidas">
                                      <Ruler size={11} style={{ color: '#86868B', flexShrink: 0 }} /> {specSummary(p)}
                                    </span>
                                  )}
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6E6E73' }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, backgroundColor: st.ok ? '#34C759' : '#FF3B30' }} />
                                    {st.label}
                                  </span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0071E3', marginTop: 2 }}>
                                    Ver en marketplace ›
                                  </span>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                        <Link to="/marketplace" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 12, fontWeight: 600, color: '#0071E3', textDecoration: 'none' }}>
                          Ver todo el marketplace <ChevronRight size={13} />
                        </Link>
                      </>
                    )}
                  </section>
                )}
              </div>
            </div>
          )}

          {/* Dossier técnico: secciones gateadas por rol (A/B/D/E = Taller+, C = Profesional+) */}
          {(
            <div
              style={{
                display: 'grid',
                // min(380px, 100%): en móvil (<380px útiles) la columna no desborda la pantalla
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))',
                gap: 16,
                marginTop: 24,
              }}
            >
              {/* A. Despiece — a todo el ancho: 6 columnas + "Añadir al carrito" no caben en media fila */}
              {canWs && car.despiece && car.despiece.length > 0 && (
                <DossierSection title="A. Despiece / Material necesario" style={{ gridColumn: '1 / -1' }}>
                  {/* La tabla hace scroll horizontal dentro de su contenedor en pantallas estrechas */}
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr>
                          {['Elemento', 'Material', 'Especif.', 'Cantidad', 'Proceso', 'Marketplace'].map((h) => (
                            <th
                              key={h}
                              style={{
                                textAlign: 'left',
                                padding: '8px 6px',
                                borderBottom: '1.5px solid #D2D2D7',
                                fontSize: 10,
                                fontWeight: 600,
                                color: '#86868B',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {car.despiece.map((d, i) => {
                          // Producto equivalente del marketplace (exacto si el admin lo vinculó,
                          // si no por nombre del elemento). Requisito PDF: precio + stock por fila.
                          const p = despieceProducts[i] ?? null
                          const st = p ? stockInfo(p) : null
                          const eff = p ? effectivePrice({ price: p.price, pro_price: p.pro_price }, profile?.user_type, profile?.is_admin) : null
                          const added = !!p && justAddedId === p.id
                          return (
                            <tr key={i}>
                              <td style={tdStyle}>{d.element}</td>
                              <td style={tdStyle}>{d.material}</td>
                              <td style={tdStyle}>{d.specification}</td>
                              <td style={tdStyle}>{d.quantity}</td>
                              <td style={tdStyle}>{d.process}</td>
                              <td style={tdStyle}>
                                {p && st && eff ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                                    <Link to={`/marketplace/product/${p.id}`} style={{ color: '#0071E3', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                      Ver{p.price != null ? ` · ${eff.price > 0 ? fmtEur(eff.price) : 'consultar'}` : ''}
                                      <span style={{ color: '#86868B', fontWeight: 400 }}> · {st.label.toLowerCase()}</span>
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => handleAddToCart(p)}
                                      disabled={!st.ok}
                                      title={st.ok ? `Añadir «${p.product_name}» al carrito` : 'Sin stock'}
                                      style={addCartBtnStyle(st.ok, added)}
                                    >
                                      <ShoppingCart size={12} />
                                      {added ? 'Añadido' : 'Añadir al carrito'}
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ color: '#C7C7CC' }}>—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {cartCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <Link
                        to="/marketplace/carrito"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#0071E3', textDecoration: 'none' }}
                      >
                        <ShoppingCart size={13} />
                        Ver carrito ({cartCount})
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  )}
                </DossierSection>
              )}

              {/* B. Estimación de costes y horas */}
              {canWs && car.cost_breakdown && Object.values(car.cost_breakdown).some((v) => v != null && v !== '') && (
                <DossierSection title="B. Estimación de costes y horas">
                  <CostBreakdownPanel breakdown={car.cost_breakdown} accent={car.color} />
                </DossierSection>
              )}

              {/* C. Referencias OEM por componente */}
              {canOem && Object.values(car.components ?? {}).some((c) => c.oem_ref) && (
                <DossierSection title="C. Referencias OEM por componente">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {Object.values(car.components ?? {})
                      .filter((c) => c.oem_ref)
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selectComponent(c.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: activeId === c.id ? `${car.color}10` : 'transparent',
                            textAlign: 'left',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (activeId !== c.id) e.currentTarget.style.backgroundColor = '#F5F5F7'
                          }}
                          onMouseLeave={(e) => {
                            if (activeId !== c.id) e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          <span style={{ fontSize: 12, color: '#1D1D1F' }}>{c.name}</span>
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: 'ui-monospace, monospace',
                              color: activeId === c.id ? car.color : '#86868B',
                              fontWeight: 600,
                            }}
                          >
                            {c.oem_ref}
                          </span>
                        </button>
                      ))}
                  </div>
                </DossierSection>
              )}

              {/* D. Fotos técnicas de referencia */}
              {canWs && car.reference_photos && car.reference_photos.length > 0 && (
                <DossierSection title="D. Fotos de referencia" icon={<Camera size={14} />}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                      gap: 6,
                    }}
                  >
                    {car.reference_photos.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          aspectRatio: '4/3',
                          borderRadius: 10,
                          overflow: 'hidden',
                          backgroundColor: '#F5F5F7',
                        }}
                      >
                        <img
                          src={url}
                          alt={`Referencia ${i + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          loading="lazy"
                        />
                      </a>
                    ))}
                  </div>
                </DossierSection>
              )}

              {/* E. Vídeo relacionado (Taller+) */}
              {canWs && car.related_video_url && (
                <DossierSection title="E. Vídeo de instalación / referencia" icon={<Play size={14} />}>
                  <VideoEmbed url={car.related_video_url} />
                </DossierSection>
              )}
            </div>
          )}

          {/* Panel relacionados: marcas sugeridas + guías por tags */}
          <SchemaRelatedPanel
            schemaId={car.id}
            schemaBrand={car.brand}
            schemaModel={car.model}
            schemaLayout={car.layout}
          />
        </>
      )}
    </div>
  )
}

// ─── Dossier UI helpers ──────────────────────────────────────────────────────

const dossierMetaLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: '#86868B',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: 0,
}

const railBox: React.CSSProperties = {
  border: '1px solid #F2F2F7', borderRadius: 14, backgroundColor: '#FFFFFF',
  maxHeight: 440, overflowY: 'auto', padding: 6,
}
const railHeading: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: '#86868B', textTransform: 'uppercase',
  letterSpacing: '0.06em', padding: '6px 12px 8px', margin: 0,
}

const dossierMetaValue: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: '#1D1D1F',
  margin: '2px 0 0',
}

const tdStyle: React.CSSProperties = {
  padding: '7px 6px',
  borderBottom: '1px solid #F2F2F7',
  color: '#1D1D1F',
  verticalAlign: 'top',
}

/** Tarjeta de cada columna de la ficha (esquema · detalles · productos). */
const colCard: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #F2F2F7',
  borderRadius: 18,
  padding: 18,
  minWidth: 0,
}
const colLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: '#86868B',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  margin: '0 0 12px',
}

/** Botón compacto "Añadir al carrito" del despiece (deshabilitado sin stock; verde un instante al añadir). */
function addCartBtnStyle(enabled: boolean, added: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 10px',
    borderRadius: 8,
    border: 'none',
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    cursor: enabled ? 'pointer' : 'not-allowed',
    backgroundColor: !enabled ? '#F2F2F7' : added ? '#34C75920' : '#0071E314',
    color: !enabled ? '#C7C7CC' : added ? '#1f7a4d' : '#0071E3',
    transition: 'background-color .15s ease, color .15s ease',
  }
}

function DossierSection({
  title,
  icon,
  style,
  children,
}: {
  title: string
  icon?: React.ReactNode
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #F2F2F7',
        borderRadius: 16,
        padding: 18,
        minWidth: 0,
        ...style,
      }}
    >
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#1D1D1F',
          margin: '0 0 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {icon}
        {title}
      </h3>
      {children}
    </section>
  )
}

function FichaRow({
  icon,
  label,
  value,
  valueEl,
  mono = false,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  valueEl?: React.ReactNode
  mono?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid #F2F2F7',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {icon}
        <span style={{ fontSize: 12, color: '#86868B' }}>{label}</span>
      </div>
      {valueEl ?? (
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#1D1D1F',
            textAlign: 'right',
            fontFamily: mono ? 'ui-monospace, SFMono-Regular, monospace' : 'inherit',
          }}
        >
          {value}
        </span>
      )}
    </div>
  )
}

function CostBreakdownPanel({
  breakdown,
  accent,
}: {
  breakdown: { materials?: number; consumables?: number; labor?: number; hours?: number; currency?: string }
  accent: string
}) {
  const currency = breakdown.currency ?? 'EUR'
  const symbol = currency === 'EUR' ? '€' : currency
  const items: Array<{ label: string; value?: number; suffix: string; color: string }> = [
    { label: 'Materiales', value: breakdown.materials, suffix: ` ${symbol}`, color: accent },
    { label: 'Consumibles', value: breakdown.consumables, suffix: ` ${symbol}`, color: '#86868B' },
    { label: 'Mano de obra', value: breakdown.labor, suffix: ` ${symbol}`, color: '#FF9500' },
    { label: 'Horas estimadas', value: breakdown.hours, suffix: ' h', color: '#0071E3' },
  ]
  const numericItems = items.filter((i) => i.value != null)
  const max = Math.max(...numericItems.map((i) => Number(i.value)))
  const total =
    (breakdown.materials ?? 0) + (breakdown.consumables ?? 0) + (breakdown.labor ?? 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {numericItems.map((it) => {
        const pct = max > 0 ? (Number(it.value) / max) * 100 : 0
        return (
          <div key={it.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#1D1D1F' }}>{it.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1D1D1F' }}>
                {it.value}{it.suffix}
              </span>
            </div>
            <div style={{ height: 6, backgroundColor: '#F2F2F7', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  backgroundColor: it.color,
                  borderRadius: 4,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )
      })}
      {total > 0 && (
        <div
          style={{
            marginTop: 6,
            paddingTop: 12,
            borderTop: '1px solid #F2F2F7',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F' }}>Total estimado</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: accent, letterSpacing: '-0.02em' }}>
            {total} {symbol}
          </span>
        </div>
      )}
    </div>
  )
}
