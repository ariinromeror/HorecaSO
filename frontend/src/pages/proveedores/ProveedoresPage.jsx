import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  Edit,
  Eye,
  FileText,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import {
  createProveedor,
  deleteProveedor,
  getProveedorDetalle,
  getProveedores,
  updateProveedor,
} from '../../services/api'

const INPUT =
  'w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const BTN_PRIMARY =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40'
const ROLES_ESCRITURA = ['admin', 'director', 'almacen']

function formatEuro(n) {
  if (n == null || n === '') return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n))
}

function fechaCorta(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-ES')
  } catch {
    return '—'
  }
}

export default function ProveedoresPage() {
  const { user } = useAuth()
  const puedeEscribir = ROLES_ESCRITURA.includes(user?.rol)

  const [proveedores, setProveedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [buscarInput, setBuscarInput] = useState('')
  const [buscarDebounced, setBuscarDebounced] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [modalProveedor, setModalProveedor] = useState(null)
  const [modalDetalle, setModalDetalle] = useState(null)
  const [detalleLoading, setDetalleLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setBuscarDebounced(buscarInput.trim()), 350)
    return () => clearTimeout(t)
  }, [buscarInput])

  useEffect(() => {
    if (!feedback?.msg) return
    const id = setTimeout(() => setFeedback(null), 3000)
    return () => clearTimeout(id)
  }, [feedback])

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (buscarDebounced) params.buscar = buscarDebounced
      if (soloActivos) params.activo = true
      const r = await getProveedores(params)
      setProveedores(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cargar proveedores')
      setProveedores([])
    } finally {
      setLoading(false)
    }
  }, [buscarDebounced, soloActivos])

  useEffect(() => {
    cargar()
  }, [cargar])

  const abrirDetalle = async (p) => {
    setModalDetalle({ ...p, facturas_recientes: [] })
    setDetalleLoading(true)
    try {
      const r = await getProveedorDetalle(p.id)
      setModalDetalle(r.data)
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'Error al cargar detalle',
        type: 'err',
      })
      setModalDetalle(null)
    } finally {
      setDetalleLoading(false)
    }
  }

  const handleDesactivar = async (p) => {
    if (!window.confirm(`¿Desactivar proveedor "${p.nombre}"?`)) return
    try {
      await deleteProveedor(p.id)
      setFeedback({ msg: 'Proveedor desactivado', type: 'ok' })
      cargar()
    } catch (e) {
      setFeedback({
        msg: e.response?.data?.detail || 'No se pudo desactivar',
        type: 'err',
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] px-4 py-6 dark:bg-[#0f1117] md:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Truck className="text-amber-500" size={28} strokeWidth={1.5} />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Proveedores
          </h1>
        </div>
        {puedeEscribir ? (
          <button
            type="button"
            onClick={() => setModalProveedor('nuevo')}
            className={BTN_PRIMARY}
          >
            <Plus size={18} strokeWidth={1.5} />
            Nuevo proveedor
          </button>
        ) : null}
      </header>

      {feedback?.msg ? (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
          }`}
          role="status"
        >
          {feedback.type === 'ok' ? (
            <Check size={18} strokeWidth={1.5} />
          ) : (
            <AlertTriangle size={18} strokeWidth={1.5} />
          )}
          {feedback.msg}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
            size={18}
            strokeWidth={1.5}
          />
          <input
            type="search"
            value={buscarInput}
            onChange={(e) => setBuscarInput(e.target.value)}
            placeholder="Buscar por nombre..."
            className={`${INPUT} pl-10`}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#111827] dark:text-[#e8eaf0]">
          <input
            type="checkbox"
            checked={soloActivos}
            onChange={(e) => setSoloActivos(e.target.checked)}
            className="h-4 w-4 rounded border-[#e2e5ed] dark:border-[#2e3347]"
          />
          Solo activos
        </label>
      </div>

      {loading ? (
        <Loader />
      ) : proveedores.length === 0 ? (
        <EmptyState message="No hay proveedores" />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-[#e2e5ed] bg-white shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Nombre
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    NIF
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Email
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Condiciones pago
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Días entrega
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Estado
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                  >
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => abrirDetalle(p)}
                        className="text-left font-medium text-amber-600 hover:underline dark:text-amber-400"
                      >
                        {p.nombre}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                      {p.nif || '—'}
                    </td>
                    <td className="px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                      {p.email || '—'}
                    </td>
                    <td className="px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                      {p.telefono || '—'}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                      {p.condiciones_pago || '—'}
                    </td>
                    <td className="px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                      {p.dias_entrega ?? '—'}
                    </td>
                    <td className="px-4 py-2">
                      {p.activo ? (
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Activo
                        </span>
                      ) : (
                        <span className="rounded-md bg-zinc-500/10 px-2 py-0.5 text-xs font-semibold text-zinc-500">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {puedeEscribir ? (
                          <button
                            type="button"
                            onClick={() => setModalProveedor(p)}
                            className="rounded-lg p-1.5 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
                            aria-label="Editar"
                          >
                            <Edit size={16} strokeWidth={1.5} />
                          </button>
                        ) : null}
                        <Link
                          to={`/proveedores/facturas?proveedor_id=${p.id}`}
                          className="inline-flex rounded-lg p-1.5 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
                          aria-label="Ver facturas"
                        >
                          <FileText size={16} strokeWidth={1.5} />
                        </Link>
                        {puedeEscribir && p.activo ? (
                          <button
                            type="button"
                            onClick={() => handleDesactivar(p)}
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10"
                            aria-label="Desactivar"
                          >
                            <Trash2 size={16} strokeWidth={1.5} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {proveedores.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27]"
              >
                <button
                  type="button"
                  onClick={() => abrirDetalle(p)}
                  className="text-left text-lg font-semibold text-amber-600 dark:text-amber-400"
                >
                  {p.nombre}
                </button>
                <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  {p.nif || 'Sin NIF'} · {p.telefono || '—'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.activo ? (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                      Activo
                    </span>
                  ) : (
                    <span className="rounded-md bg-zinc-500/10 px-2 py-0.5 text-xs text-zinc-500">
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  {puedeEscribir ? (
                    <button
                      type="button"
                      onClick={() => setModalProveedor(p)}
                      className="rounded-lg border border-[#e2e5ed] px-3 py-1.5 text-sm dark:border-[#2e3347]"
                    >
                      Editar
                    </button>
                  ) : null}
                  <Link
                    to={`/proveedores/facturas?proveedor_id=${p.id}`}
                    className="rounded-lg border border-[#e2e5ed] px-3 py-1.5 text-sm dark:border-[#2e3347]"
                  >
                    Facturas
                  </Link>
                  {puedeEscribir && p.activo ? (
                    <button
                      type="button"
                      onClick={() => handleDesactivar(p)}
                      className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-500"
                    >
                      Desactivar
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modalProveedor ? (
        <ModalProveedorForm
          initial={modalProveedor === 'nuevo' ? null : modalProveedor}
          onClose={() => setModalProveedor(null)}
          onGuardado={() => {
            setModalProveedor(null)
            setFeedback({ msg: 'Guardado correctamente', type: 'ok' })
            cargar()
          }}
          onError={(msg) => setFeedback({ msg, type: 'err' })}
        />
      ) : null}

      {modalDetalle ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
            <div className="flex items-center justify-between border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
              <h2 className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
                {modalDetalle.nombre}
              </h2>
              <button
                type="button"
                onClick={() => setModalDetalle(null)}
                className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
                aria-label="Cerrar"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <div className="space-y-2 p-4 text-sm text-[#111827] dark:text-[#e8eaf0]">
              {detalleLoading ? (
                <Loader />
              ) : (
                <>
                  <p>
                    <span className="text-[#6b7280] dark:text-[#8b90a7]">
                      NIF:{' '}
                    </span>
                    {modalDetalle.nif || '—'}
                  </p>
                  <p>
                    <span className="text-[#6b7280] dark:text-[#8b90a7]">
                      Email:{' '}
                    </span>
                    {modalDetalle.email || '—'}
                  </p>
                  <p>
                    <span className="text-[#6b7280] dark:text-[#8b90a7]">
                      Teléfono:{' '}
                    </span>
                    {modalDetalle.telefono || '—'}
                  </p>
                  <p>
                    <span className="text-[#6b7280] dark:text-[#8b90a7]">
                      Condiciones:{' '}
                    </span>
                    {modalDetalle.condiciones_pago || '—'}
                  </p>
                  <p>
                    <span className="text-[#6b7280] dark:text-[#8b90a7]">
                      Entrega:{' '}
                    </span>
                    {modalDetalle.dias_entrega ?? '—'} días
                  </p>
                  <h3 className="mt-4 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Últimas facturas
                  </h3>
                  <ul className="space-y-2">
                    {(modalDetalle.facturas_recientes || []).length === 0 ? (
                      <li className="text-[#6b7280] dark:text-[#8b90a7]">
                        Sin facturas recientes
                      </li>
                    ) : (
                      (modalDetalle.facturas_recientes || []).map((f) => (
                        <li
                          key={f.id}
                          className="flex justify-between gap-2 rounded-lg border border-[#e2e5ed] px-3 py-2 dark:border-[#2e3347]"
                        >
                          <span>
                            {fechaCorta(f.fecha)} ·{' '}
                            {f.numero_factura || 'S/N'}
                          </span>
                          <span className="shrink-0">
                            {f.pagada ? (
                              <span className="text-emerald-600">Pagada</span>
                            ) : (
                              <span className="text-amber-600">Pendiente</span>
                            )}
                          </span>
                        </li>
                      ))
                    )}
                  </ul>
                  <Link
                    to={`/proveedores/facturas?proveedor_id=${modalDetalle.id}`}
                    onClick={() => setModalDetalle(null)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-black"
                  >
                    <Eye size={18} strokeWidth={1.5} />
                    Ver todas las facturas
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ModalProveedorForm({ initial, onClose, onGuardado, onError }) {
  const [nombre, setNombre] = useState(initial?.nombre || '')
  const [nif, setNif] = useState(initial?.nif || '')
  const [email, setEmail] = useState(initial?.email || '')
  const [telefono, setTelefono] = useState(initial?.telefono || '')
  const [direccion, setDireccion] = useState(initial?.direccion || '')
  const [condicionesPago, setCondicionesPago] = useState(
    initial?.condiciones_pago || ''
  )
  const [diasEntrega, setDiasEntrega] = useState(
    String(initial?.dias_entrega ?? 1)
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      onError('El nombre es obligatorio')
      return
    }
    const de = parseInt(diasEntrega, 10)
    const body = {
      nombre: nombre.trim(),
      nif: nif.trim() || null,
      email: email.trim() || null,
      telefono: telefono.trim() || null,
      direccion: direccion.trim() || null,
      condiciones_pago: condicionesPago.trim() || null,
      dias_entrega: Number.isNaN(de) ? 1 : de,
    }
    setSaving(true)
    try {
      if (initial?.id) {
        await updateProveedor(initial.id, body)
      } else {
        await createProveedor(body)
      }
      onGuardado()
    } catch (e) {
      onError(e.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="flex items-center justify-between border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
          <h2 className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
            {initial?.id ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Nombre *
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            NIF
            <input value={nif} onChange={(e) => setNif(e.target.value)} className={`${INPUT} mt-1`} />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Teléfono
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Dirección
            <textarea
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              rows={3}
              className={`${INPUT} mt-1 resize-y`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Condiciones de pago
            <input
              value={condicionesPago}
              onChange={(e) => setCondicionesPago(e.target.value)}
              placeholder="30 días, contado..."
              className={`${INPUT} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Días entrega
            <input
              type="number"
              min={1}
              value={diasEntrega}
              onChange={(e) => setDiasEntrega(e.target.value)}
              className={`${INPUT} mt-1`}
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className={`${BTN_PRIMARY} mt-2 w-full`}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
