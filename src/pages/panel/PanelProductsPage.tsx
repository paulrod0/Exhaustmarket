import { useEffect, useState } from 'react'
import { usePanelStore } from '../../stores/panelStore'
import { useAuthStore } from '../../stores/authStore'
import { Plus, Pencil, Trash2, X, Package } from 'lucide-react'

interface ProductForm {
  product_name: string
  description: string
  price: number
  stock: number
  category: string
}

interface ServiceForm {
  service_name: string
  description: string
  base_price: number
  category: string
}

export default function PanelProductsPage() {
  const { profile } = useAuthStore()
  const {
    myProducts,
    myServices,
    loading,
    fetchMyProducts,
    fetchMyServices,
    createProduct,
    updateProduct,
    deleteProduct,
    createService,
    updateService,
    deleteService,
  } = usePanelStore()

  const isWorkshop = profile?.user_type === 'workshop'

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const emptyProductForm: ProductForm = {
    product_name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
  }

  const emptyServiceForm: ServiceForm = {
    service_name: '',
    description: '',
    base_price: 0,
    category: '',
  }

  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm)
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm)

  useEffect(() => {
    if (isWorkshop) {
      fetchMyServices()
    } else {
      fetchMyProducts()
    }
  }, [isWorkshop, fetchMyProducts, fetchMyServices])

  const items = isWorkshop ? myServices : myProducts

  const openAdd = () => {
    setEditId(null)
    setProductForm(emptyProductForm)
    setServiceForm(emptyServiceForm)
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = (item: any) => {
    setEditId(item.id)
    setFormError(null)
    if (isWorkshop) {
      setServiceForm({
        service_name: item.service_name,
        description: item.description,
        base_price: item.base_price,
        category: item.category ?? '',
      })
    } else {
      setProductForm({
        product_name: item.product_name,
        description: item.description,
        price: item.price,
        stock: item.stock ?? 0,
        category: item.category ?? '',
      })
    }
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditId(null)
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      if (isWorkshop) {
        if (editId) {
          await updateService(editId, serviceForm)
        } else {
          await createService(serviceForm)
        }
      } else {
        if (editId) {
          await updateProduct(editId, productForm)
        } else {
          await createProduct(productForm)
        }
      }
      closeForm()
    } catch (err: any) {
      setFormError(err.message ?? 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      if (isWorkshop) {
        await deleteService(id)
      } else {
        await deleteProduct(id)
      }
      setDeleteConfirmId(null)
    } catch (err: any) {
      setFormError(err.message ?? 'Error al eliminar')
    }
  }

  const handleToggleActive = async (item: any) => {
    try {
      if (isWorkshop) {
        await updateService(item.id, { is_active: !item.is_active })
      } else {
        await updateProduct(item.id, { is_active: !item.is_active })
      }
    } catch (err: any) {
      setFormError(err.message ?? 'Error al cambiar estado')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1D1D1F', letterSpacing: '-0.01em', lineHeight: 1.14 }}>
            {isWorkshop ? 'Servicios' : 'Productos'}
          </h1>
          <p style={{ marginTop: '6px', fontSize: '14px', color: '#86868B' }}>
            Gestiona tus {isWorkshop ? 'servicios' : 'productos'} del catalogo
          </p>
        </div>
        <button
          onClick={openAdd}
          className="btn-pill btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          Anadir {isWorkshop ? 'Servicio' : 'Producto'}
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              padding: '32px',
              width: '100%',
              maxWidth: '480px',
              maxHeight: '90vh',
              overflowY: 'auto',
              margin: '0 16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '21px', fontWeight: 600, color: '#1D1D1F' }}>
                {editId ? 'Editar' : 'Nuevo'}{' '}
                {isWorkshop ? 'Servicio' : 'Producto'}
              </h2>
              <button
                onClick={closeForm}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#86868B',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  marginBottom: '16px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 59, 48, 0.08)',
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: '#FF3B30',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>
                  Nombre
                </label>
                <input
                  type="text"
                  required
                  className="input-apple"
                  value={isWorkshop ? serviceForm.service_name : productForm.product_name}
                  onChange={(e) =>
                    isWorkshop
                      ? setServiceForm({ ...serviceForm, service_name: e.target.value })
                      : setProductForm({ ...productForm, product_name: e.target.value })
                  }
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>
                  Descripcion
                </label>
                <textarea
                  required
                  rows={3}
                  className="input-apple"
                  style={{ resize: 'none' }}
                  value={isWorkshop ? serviceForm.description : productForm.description}
                  onChange={(e) =>
                    isWorkshop
                      ? setServiceForm({ ...serviceForm, description: e.target.value })
                      : setProductForm({ ...productForm, description: e.target.value })
                  }
                />
              </div>

              {/* Price */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>
                  Precio ({'\u20ac'})
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="input-apple"
                  value={isWorkshop ? serviceForm.base_price : productForm.price}
                  onChange={(e) =>
                    isWorkshop
                      ? setServiceForm({ ...serviceForm, base_price: parseFloat(e.target.value) || 0 })
                      : setProductForm({ ...productForm, price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              {/* Stock (products only) */}
              {!isWorkshop && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>
                    Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="input-apple"
                    value={productForm.stock}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        stock: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              )}

              {/* Category */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>
                  Categoria
                </label>
                <input
                  type="text"
                  className="input-apple"
                  value={isWorkshop ? serviceForm.category : productForm.category}
                  onChange={(e) =>
                    isWorkshop
                      ? setServiceForm({ ...serviceForm, category: e.target.value })
                      : setProductForm({ ...productForm, category: e.target.value })
                  }
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3" style={{ paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={closeForm}
                  className="btn-pill btn-secondary btn-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-pill btn-primary btn-sm"
                  style={{ opacity: submitting ? 0.5 : 1 }}
                >
                  {submitting ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              padding: '32px',
              width: '100%',
              maxWidth: '380px',
              margin: '0 16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            }}
          >
            <h3 style={{ fontSize: '21px', fontWeight: 600, color: '#1D1D1F' }}>
              Confirmar eliminacion
            </h3>
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#6E6E73', lineHeight: 1.5 }}>
              Estas seguro de que deseas eliminar este{' '}
              {isWorkshop ? 'servicio' : 'producto'}? Esta accion no se puede
              deshacer.
            </p>
            <div className="flex justify-end gap-3" style={{ marginTop: '24px' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-pill btn-secondary btn-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="btn-pill btn-sm"
                style={{ backgroundColor: '#FF3B30', color: '#FFFFFF' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #F2F2F7',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#86868B', fontSize: '14px' }}>
            Cargando...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center" style={{ padding: '64px 20px', textAlign: 'center' }}>
            <Package size={40} style={{ color: '#D2D2D7', marginBottom: '16px' }} />
            <p style={{ fontSize: '17px', color: '#1D1D1F', fontWeight: 500 }}>
              No tienes {isWorkshop ? 'servicios' : 'productos'} todavia
            </p>
            <p style={{ marginTop: '4px', fontSize: '14px', color: '#86868B' }}>
              Anade tu primer {isWorkshop ? 'servicio' : 'producto'} para
              empezar
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F5F5F7' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Nombre
                  </th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Precio
                  </th>
                  {!isWorkshop && (
                    <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Stock
                    </th>
                  )}
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Activo
                  </th>
                  <th style={{ padding: '12px 20px', fontWeight: 500, color: '#6E6E73', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: '1px solid #F2F2F7', backgroundColor: '#FFFFFF' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#FAFAFA' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF' }}
                  >
                    <td style={{ padding: '14px 20px', color: '#1D1D1F', fontWeight: 500 }}>
                      {isWorkshop ? item.service_name : item.product_name}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#6E6E73' }}>
                      {(isWorkshop
                        ? item.base_price
                        : item.price
                      )?.toLocaleString('es-ES', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      {'\u20ac'}
                    </td>
                    {!isWorkshop && (
                      <td style={{ padding: '14px 20px', color: '#6E6E73' }}>{item.stock ?? 0}</td>
                    )}
                    <td style={{ padding: '14px 20px' }}>
                      <button
                        onClick={() => handleToggleActive(item)}
                        style={{
                          position: 'relative',
                          display: 'inline-flex',
                          height: '24px',
                          width: '44px',
                          alignItems: 'center',
                          borderRadius: '12px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: item.is_active ? '#34C759' : '#D2D2D7',
                          transition: 'background-color 0.2s ease',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            height: '18px',
                            width: '18px',
                            borderRadius: '50%',
                            backgroundColor: '#FFFFFF',
                            transition: 'transform 0.2s ease',
                            transform: item.is_active ? 'translateX(22px)' : 'translateX(3px)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                          }}
                        />
                      </button>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          title="Editar"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '8px',
                            color: '#86868B',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F5F5F7'
                            e.currentTarget.style.color = '#0066CC'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.color = '#86868B'
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          title="Eliminar"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '8px',
                            color: '#86868B',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 59, 48, 0.08)'
                            e.currentTarget.style.color = '#FF3B30'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                            e.currentTarget.style.color = '#86868B'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
