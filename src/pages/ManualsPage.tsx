import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { FileText, Download, Search } from 'lucide-react'

interface Manual {
  id: string
  title: string
  description: string
  car_brand: string
  car_model: string
  manual_type: string
  file_url: string
  file_size: number
  thumbnail_url?: string
  required_tier: string
  created_at: string
}

const manualTypeLabels: Record<string, string> = {
  car_manual: 'Manual de Coche',
  exhaust_installation: 'Instalacion de Escape',
  maintenance: 'Mantenimiento',
  other: 'Otros'
}

const filterOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'car_manual', label: 'Manual de Coche' },
  { value: 'exhaust_installation', label: 'Instalacion' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'other', label: 'Otros' },
]

export default function ManualsPage() {
  const [manuals, setManuals] = useState<Manual[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchManuals()
  }, [])

  async function fetchManuals() {
    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('manuals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setManuals(data || [])
    } catch (err) {
      console.error('Error fetching manuals:', err)
      setError('Error al cargar los manuales')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload(manual: Manual) {
    try {
      const { data, error } = await supabase.storage
        .from('manuals')
        .download(manual.file_url)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${manual.title}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading manual:', err)
      alert('Error al descargar el manual')
    }
  }

  const filteredManuals = manuals.filter(manual => {
    const matchesSearch =
      manual.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manual.car_brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manual.car_model.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = selectedType === 'all' || manual.manual_type === selectedType

    return matchesSearch && matchesType
  })

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3" style={{ color: '#86868B' }}>
          <div
            className="w-5 h-5 rounded-full animate-spin"
            style={{ border: '2px solid #D2D2D7', borderTopColor: '#0071E3' }}
          />
          <span>Cargando manuales...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="content-width" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
      {/* Page Header */}
      <div className="text-center" style={{ marginBottom: '48px' }}>
        <h1 className="text-headline" style={{ color: '#1D1D1F', marginBottom: '12px' }}>
          Manuales Tecnicos
        </h1>
        <p className="text-body-large" style={{ color: '#6E6E73', maxWidth: '600px', margin: '0 auto' }}>
          Accede a manuales de coches y guias de instalacion
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ maxWidth: '600px', margin: '0 auto 32px' }}>
        <div className="relative">
          <Search
            size={20}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: '16px', color: '#86868B' }}
          />
          <input
            type="text"
            placeholder="Buscar por titulo, marca o modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-apple"
            style={{ paddingLeft: '48px' }}
          />
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap" style={{ marginBottom: '48px' }}>
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedType(option.value)}
            style={{
              padding: '8px 20px',
              borderRadius: '980px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: selectedType === option.value ? '#1D1D1F' : '#F5F5F7',
              color: selectedType === option.value ? '#FFFFFF' : '#1D1D1F',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            background: 'rgba(255, 59, 48, 0.08)',
            border: '1px solid rgba(255, 59, 48, 0.15)',
            color: '#FF3B30',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            marginBottom: '32px',
            textAlign: 'center',
          }}
        >
          {error}
        </div>
      )}

      {/* Content */}
      {filteredManuals.length === 0 ? (
        <div className="text-center" style={{ padding: '80px 32px' }}>
          <div
            className="flex items-center justify-center"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              backgroundColor: '#F5F5F7',
              margin: '0 auto 20px',
            }}
          >
            <FileText size={28} style={{ color: '#86868B' }} />
          </div>
          <p style={{ color: '#86868B', fontSize: '17px' }}>
            {searchTerm || selectedType !== 'all'
              ? 'No se encontraron manuales con los criterios seleccionados'
              : 'No hay manuales disponibles'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredManuals.map((manual) => (
            <div key={manual.id} className="card-apple" style={{ padding: '24px' }}>
              {/* Card Header */}
              <div className="flex items-start gap-4" style={{ marginBottom: '16px' }}>
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: '#F5F5F7',
                  }}
                >
                  <FileText size={22} style={{ color: '#86868B' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className="truncate"
                    style={{
                      fontSize: '17px',
                      fontWeight: 600,
                      color: '#1D1D1F',
                      marginBottom: '4px',
                    }}
                  >
                    {manual.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6E6E73', marginBottom: '8px' }}>
                    {manual.car_brand} {manual.car_model}
                  </p>
                  <span className="badge badge-green">
                    {manualTypeLabels[manual.manual_type]}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p
                className="line-clamp-2"
                style={{
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#6E6E73',
                  marginBottom: '20px',
                }}
              >
                {manual.description}
              </p>

              {/* Footer */}
              <div
                className="flex items-center justify-between"
                style={{ paddingTop: '16px', borderTop: '1px solid #E5E5EA' }}
              >
                <span style={{ fontSize: '13px', color: '#86868B' }}>
                  {formatFileSize(manual.file_size)}
                </span>
                <button
                  onClick={() => handleDownload(manual)}
                  className="btn-pill btn-primary btn-sm"
                  style={{ gap: '6px', display: 'inline-flex', alignItems: 'center' }}
                >
                  <Download size={14} />
                  Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
