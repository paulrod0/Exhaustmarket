import { useState, useEffect, useMemo } from 'react'
import { Thermometer, Layers, Info, ChevronRight, X, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { canViewTiers } from '../lib/contentTypes'
import SchemaRelatedPanel from '../components/SchemaRelatedPanel'
import TierBadge from '../components/TierBadge'
import UpgradeCallout from '../components/UpgradeCallout'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Component {
  id: string
  name: string
  material: string
  temp: string
  description: string
  tip?: string
}

type Layout = 'v8tt' | 'v10na' | 'flat6na' | 'i6tt' | 'v12na' | 'flat6tt' | 'v8na'

interface CarSchema {
  id: string
  brand: string
  model: string
  year: string
  engine: string
  power: string
  layout: Layout
  color: string
  note?: string | null
  components: Record<string, Component>
  cover_url?: string | null
  gallery_urls?: string[] | null
  allowed_tiers?: string[] | null
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExhaustSchemasPage() {
  const { user, profile } = useAuthStore()
  const [schemas, setSchemas] = useState<CarSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string>('Todos')
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)

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

  const brands = useMemo(() => ['Todos', ...Array.from(new Set(schemas.map(s => s.brand)))], [schemas])

  const filteredSchemas = useMemo(() => {
    let list = schemas
    if (selectedBrand !== 'Todos') list = list.filter(s => s.brand === selectedBrand)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.brand.toLowerCase().includes(q) ||
        s.model.toLowerCase().includes(q) ||
        s.engine.toLowerCase().includes(q)
      )
    }
    return list
  }, [schemas, selectedBrand, search])

  const car = schemas.find(s => s.id === selectedCarId) ?? filteredSchemas[0] ?? null
  const component = car && selectedComponent ? car.components[selectedComponent] ?? null : null

  function handleBrandSelect(brand: string) {
    setSelectedBrand(brand)
    setSelectedComponent(null)
    const first = schemas.find(s => brand === 'Todos' || s.brand === brand)
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
          onChange={e => { setSearch(e.target.value); setSelectedBrand('Todos') }}
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

      {/* Brand selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {brands.map(brand => (
          <button
            key={brand}
            onClick={() => handleBrandSelect(brand)}
            style={{
              padding: '7px 18px',
              borderRadius: '980px',
              fontSize: '13px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              backgroundColor: selectedBrand === brand ? '#1D1D1F' : '#F5F5F7',
              color: selectedBrand === brand ? '#FFFFFF' : '#1D1D1F',
            }}
          >
            {brand}
          </button>
        ))}
      </div>

      {/* Model selector */}
      {filteredSchemas.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {filteredSchemas.map(c => (
            <button
              key={c.id}
              onClick={() => handleCarSelect(c.id)}
              style={{
                padding: '5px 14px',
                borderRadius: '980px',
                fontSize: '12px',
                fontWeight: 400,
                border: `1px solid ${selectedCarId === c.id ? c.color : '#D2D2D7'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: selectedCarId === c.id ? c.color : '#FFFFFF',
                color: selectedCarId === c.id ? '#FFFFFF' : '#1D1D1F',
              }}
            >
              {selectedBrand === 'Todos' ? `${c.brand} ${c.model}` : c.model}
            </button>
          ))}
        </div>
      )}

      {filteredSchemas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#86868B' }}>
          No se encontraron modelos para esa búsqueda.
        </div>
      )}

      {car && (
        <>
          {/* Car info strip */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #F2F2F7',
              borderRadius: '14px',
              padding: '16px 20px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <p style={{ fontSize: '19px', fontWeight: 600, color: '#1D1D1F', margin: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: car.color }}>●</span> {car.brand} {car.model}
                <TierBadge
                  allowedTiers={car.allowed_tiers ?? []}
                  locked={!canViewTiers(car.allowed_tiers, profile?.user_type, profile?.is_admin)}
                  size="sm"
                />
              </p>
              <p style={{ fontSize: '13px', color: '#86868B', margin: '2px 0 0' }}>{car.year}</p>
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: '#86868B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Motor</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#1D1D1F', margin: '2px 0 0' }}>{car.engine}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: '#86868B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Potencia</p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#1D1D1F', margin: '2px 0 0' }}>{car.power}</p>
              </div>
            </div>
            {car.note && (
              <div
                style={{
                  backgroundColor: `${car.color}12`,
                  border: `1px solid ${car.color}30`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#1D1D1F',
                  maxWidth: '320px',
                  lineHeight: 1.4,
                }}
              >
                <Info size={12} style={{ display: 'inline', marginRight: '4px', color: car.color }} />
                {car.note}
              </div>
            )}
          </div>

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

          {!canViewTiers(car.allowed_tiers, profile?.user_type, profile?.is_admin) && (
            <UpgradeCallout
              allowedTiers={car.allowed_tiers ?? []}
              isAuthenticated={!!user}
              title="Esquema técnico exclusivo"
              description="El diagrama interactivo con materiales, temperaturas y consejos técnicos está disponible solo para suscripciones seleccionadas."
            />
          )}

          {/* Diagram + detail panel */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: component ? '1fr 340px' : '1fr',
              gap: '16px',
              alignItems: 'start',
              position: 'relative',
              ...(canViewTiers(car.allowed_tiers, profile?.user_type, profile?.is_admin)
                ? {}
                : { filter: 'blur(6px) saturate(0.5)', pointerEvents: 'none', userSelect: 'none', opacity: 0.55 }),
            }}
          >

            {/* SVG Diagram */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #F2F2F7',
                borderRadius: '18px',
                padding: '20px',
                overflow: 'hidden',
              }}
            >
              {car.layout === 'v8tt' && <V8ttDiagram selected={selectedComponent} onSelect={setSelectedComponent} color={car.color} />}
              {car.layout === 'v8na' && <V8naDiagram selected={selectedComponent} onSelect={setSelectedComponent} color={car.color} />}
              {car.layout === 'v10na' && <V10naDiagram selected={selectedComponent} onSelect={setSelectedComponent} color={car.color} />}
              {(car.layout === 'v12na') && <V12Diagram selected={selectedComponent} onSelect={setSelectedComponent} color={car.color} />}
              {car.layout === 'flat6na' && <Flat6naDiagram selected={selectedComponent} onSelect={setSelectedComponent} color={car.color} />}
              {car.layout === 'flat6tt' && <Flat6ttDiagram selected={selectedComponent} onSelect={setSelectedComponent} color={car.color} />}
              {car.layout === 'i6tt' && <I6ttDiagram selected={selectedComponent} onSelect={setSelectedComponent} color={car.color} />}

              {/* Component pills */}
              <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.values(car.components).map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedComponent(c.id)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '980px',
                      fontSize: '12px',
                      border: `1px solid ${selectedComponent === c.id ? car.color : '#E5E5EA'}`,
                      cursor: 'pointer',
                      backgroundColor: selectedComponent === c.id ? car.color : '#FFFFFF',
                      color: selectedComponent === c.id ? '#FFFFFF' : '#6E6E73',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail Panel */}
            {component && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: `1px solid ${car.color}30`,
                  borderRadius: '18px',
                  overflow: 'hidden',
                  position: 'sticky',
                  top: '80px',
                }}
              >
                <div
                  style={{
                    backgroundColor: car.color,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>{component.name}</p>
                  <button
                    onClick={() => setSelectedComponent(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', display: 'flex' }}
                    aria-label="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ backgroundColor: '#F5F5F7', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                        <Thermometer size={12} style={{ color: '#FF3B30' }} />
                        <span style={{ fontSize: '10px', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Temperatura</span>
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F', margin: 0 }}>{component.temp}</p>
                    </div>
                    <div style={{ backgroundColor: '#F5F5F7', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                        <Layers size={12} style={{ color: '#0071E3' }} />
                        <span style={{ fontSize: '10px', color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Material</span>
                      </div>
                      <p style={{ fontSize: '12px', fontWeight: 500, color: '#1D1D1F', margin: 0, lineHeight: 1.3 }}>{component.material}</p>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', lineHeight: 1.6, color: '#3A3A3C', margin: 0 }}>{component.description}</p>

                  {component.tip && (
                    <div
                      style={{
                        backgroundColor: `${car.color}0D`,
                        border: `1px solid ${car.color}25`,
                        borderRadius: '10px',
                        padding: '12px',
                      }}
                    >
                      <p style={{ fontSize: '11px', fontWeight: 600, color: car.color, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Dato técnico
                      </p>
                      <p style={{ fontSize: '12px', color: '#1D1D1F', margin: 0, lineHeight: 1.5 }}>{component.tip}</p>
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid #F2F2F7', paddingTop: '12px' }}>
                    <p style={{ fontSize: '11px', color: '#86868B', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Otros componentes</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {Object.values(car.components).filter(c => c.id !== component.id).map(c => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedComponent(c.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: 'transparent',
                            textAlign: 'left',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F5F5F7' }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                          <span style={{ fontSize: '13px', color: '#1D1D1F' }}>{c.name}</span>
                          <ChevronRight size={14} style={{ color: '#C7C7CC', flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!component && (
            <div style={{ textAlign: 'center', marginTop: '20px', padding: '24px', color: '#86868B', fontSize: '14px' }}>
              Toca un componente en el esquema o en las pills para ver sus detalles técnicos
            </div>
          )}

          {/* Panel relacionados: marcas sugeridas + guías por tags */}
          <SchemaRelatedPanel
            schemaId={car.id}
            schemaBrand={car.brand}
            schemaLayout={car.layout}
          />
        </>
      )}
    </div>
  )
}
