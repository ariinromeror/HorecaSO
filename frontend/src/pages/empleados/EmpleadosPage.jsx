import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { DollarSign, Pencil, Users } from 'lucide-react'
import EmptyState from '../../components/shared/EmptyState'
import Loader from '../../components/shared/Loader'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const ROLES_PERMITIDOS = ['admin', 'director']

const INPUT =
  'w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const SELECT =
  `${INPUT} appearance-none bg-[#f0f2f5] dark:bg-[#222536]`
const BTN_PRIMARY =
  'inline-flex h-12 min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40 sm:w-auto'
const BTN_SECONDARY =
  'inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg border border-[#e2e5ed] bg-white px-4 text-[15px] font-semibold text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] sm:w-auto'
const SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'

const CONTRATO_OPCIONES = [
  { value: '', label: 'Seleccionar…' },
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'formacion', label: 'Formación' },
  { value: 'practicas', label: 'Prácticas' },
  { value: 'obra_servicio', label: 'Obra y servicio' },
]

function formatEuro(n) {
  if (n == null || n === '') return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n))
}

function emptyForm() {
  return {
    nombre_completo: '',
    dni: '',
    nss: '',
    cargo: '',
    contrato: '',
    jornada_horas: 40,
    salario_bruto_mensual: '',
    irpf_porcentaje: '',
    fecha_inicio: '',
    iban: '',
    activo: true,
  }
}

export default function EmpleadosPage() {
  const { user, isLoading: authLoading } = useAuth()

  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [buscarInput, setBuscarInput] = useState('')
  const [buscarDebounced, setBuscarDebounced] = useState('')
  const [filtroActivo, setFiltroActivo] = useState('todos')
  const [filtroCargo, setFiltroCargo] = useState('')
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState(null)
  const [saving, setSaving] = useState(false)

  const puedeAcceder = user && ROLES_PERMITIDOS.includes(user.rol)

  useEffect(() => {
    const t = setTimeout(() => setBuscarDebounced(buscarInput.trim()), 350)
    return () => clearTimeout(t)
  }, [buscarInput])

  const cargosUnicos = useMemo(() => {
    const s = new Set()
    empleados.forEach((e) => {
      if (e.cargo && String(e.cargo).trim()) s.add(String(e.cargo).trim())
    })
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'es'))
  }, [empleados])

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (buscarDebounced) params.buscar = buscarDebounced
      if (filtroActivo === 'activo') params.activo = true
      if (filtroActivo === 'inactivo') params.activo = false
      if (filtroCargo.trim()) params.cargo = filtroCargo.trim()
      const r = await api.get('/empleados', { params })
      setEmpleados(Array.isArray(r.data) ? r.data : [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al cargar empleados')
      setEmpleados([])
    } finally {
      setLoading(false)
    }
  }, [buscarDebounced, filtroActivo, filtroCargo])

  useEffect(() => {
    if (!puedeAcceder) return
    cargar()
  }, [puedeAcceder, cargar])

  const abrirNuevo = () => {
    setForm(emptyForm())
    setModalError(null)
    setModal({ modo: 'nuevo' })
  }

  const abrirEditar = async (emp) => {
    setModalError(null)
    setModal({ modo: 'editar', id: emp.id })
    setModalLoading(true)
    setForm(emptyForm())
    try {
      const r = await api.get(`/empleados/${emp.id}`)
      const d = r.data
      setForm({
        nombre_completo:
          d.nombre_completo ?? d.nombre_empleado ?? '',
        dni: d.dni ?? '',
        nss: d.nss ?? '',
        cargo: d.cargo ?? '',
        contrato: d.contrato ?? '',
        jornada_horas:
          d.jornada_horas != null ? Number(d.jornada_horas) : 40,
        salario_bruto_mensual:
          d.salario_bruto_mensual != null
            ? String(d.salario_bruto_mensual)
            : '',
        irpf_porcentaje:
          d.irpf_porcentaje != null ? String(d.irpf_porcentaje) : '',
        fecha_inicio: d.fecha_inicio
          ? String(d.fecha_inicio).slice(0, 10)
          : '',
        iban: d.iban ?? '',
        activo: d.activo !== false,
      })
    } catch (e) {
      setModalError(e.response?.data?.detail || 'Error al cargar empleado')
      setModal(null)
    } finally {
      setModalLoading(false)
    }
  }

  const cerrarModal = () => {
    if (saving) return
    setModal(null)
    setModalError(null)
  }

  const guardar = async () => {
    const nombre = (form.nombre_completo || '').trim()
    if (!nombre) {
      setModalError('El nombre completo es obligatorio')
      return
    }
    const irpf = form.irpf_porcentaje === '' ? null : Number(form.irpf_porcentaje)
    if (irpf != null && (Number.isNaN(irpf) || irpf < 0 || irpf > 45)) {
      setModalError('IRPF debe estar entre 0 y 45')
      return
    }

    setSaving(true)
    setModalError(null)

    const body = {
      nombre_completo: nombre,
      dni: form.dni.trim() || null,
      nss: form.nss.trim() || null,
      cargo: form.cargo.trim() || null,
      contrato: form.contrato.trim() || null,
      jornada_horas:
        form.jornada_horas === '' || form.jornada_horas == null
          ? null
          : Number(form.jornada_horas),
      salario_bruto_mensual:
        form.salario_bruto_mensual === '' || form.salario_bruto_mensual == null
          ? null
          : Number(form.salario_bruto_mensual),
      irpf_porcentaje: irpf,
      fecha_inicio: form.fecha_inicio || null,
      iban: form.iban.trim() || null,
    }

    try {
      if (modal.modo === 'nuevo') {
        await api.post('/empleados', body)
      } else {
        await api.put(`/empleados/${modal.id}`, {
          ...body,
          activo: form.activo,
        })
      }
      setModal(null)
      cargar()
    } catch (e) {
      const det = e.response?.data?.detail
      setModalError(
        typeof det === 'string'
          ? det
          : Array.isArray(det)
            ? det.map((x) => x.msg || x).join(', ')
            : 'No se pudo guardar'
      )
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return <Loader />
  }

  if (user && !ROLES_PERMITIDOS.includes(user.rol)) {
    return <Navigate to="/mesas" replace />
  }

  return (
    <div className="min-h-full text-[15px] text-[#111827] dark:text-[#e8eaf0]">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-amber-500" size={28} strokeWidth={1.5} />
          <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            Empleados
          </h1>
        </div>
        <button
          type="button"
          onClick={abrirNuevo}
          className={BTN_PRIMARY}
        >
          Nuevo empleado
        </button>
      </header>

      {error ? (
        <p className="mb-4 text-[15px] text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div
        className={`mb-6 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center ${SURFACE} p-4`}
      >
        <input
          type="search"
          value={buscarInput}
          onChange={(e) => setBuscarInput(e.target.value)}
          placeholder="Buscar…"
          className={`${INPUT} min-h-[48px] flex-1 md:min-w-[200px]`}
          aria-label="Buscar empleados"
        />
        <select
          value={filtroActivo}
          onChange={(e) => setFiltroActivo(e.target.value)}
          className={`${SELECT} min-h-[48px] md:w-44`}
          aria-label="Filtrar por estado"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <select
          value={filtroCargo}
          onChange={(e) => setFiltroCargo(e.target.value)}
          className={`${SELECT} min-h-[48px] md:w-56`}
          aria-label="Filtrar por cargo"
        >
          <option value="">Todos los cargos</option>
          {cargosUnicos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : empleados.length === 0 ? (
        <EmptyState message="No hay empleados con los filtros actuales" />
      ) : (
        <>
          <div className={`hidden overflow-x-auto md:block ${SURFACE}`}>
            <table className="w-full min-w-[720px] border-collapse text-left text-[15px]">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Empleado
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    DNI
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Contrato
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Jornada
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Salario bruto
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Estado
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {empleados.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#111827] dark:text-[#e8eaf0]">
                        {e.nombre_empleado || '—'}
                      </div>
                      <div className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                        {e.cargo || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#111827] dark:text-[#e8eaf0]">
                      {e.dni || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#111827] dark:text-[#e8eaf0]">
                      {e.contrato || '—'}
                    </td>
                    <td className="px-4 py-3 text-[#111827] dark:text-[#e8eaf0]">
                      {e.jornada_horas != null ? `${e.jornada_horas} h` : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#111827] dark:text-[#e8eaf0]">
                      {formatEuro(e.salario_bruto_mensual)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          e.activo
                            ? 'inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-sm font-medium text-emerald-700 dark:text-emerald-400'
                            : 'inline-flex rounded-full bg-red-500/15 px-2.5 py-0.5 text-sm font-medium text-red-700 dark:text-red-400'
                        }
                      >
                        {e.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => abrirEditar(e)}
                        className="inline-flex h-12 min-h-[48px] w-12 items-center justify-center rounded-lg border border-[#e2e5ed] text-amber-500 dark:border-[#2e3347]"
                        aria-label={`Editar ${e.nombre_empleado || 'empleado'}`}
                      >
                        <Pencil size={18} strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {empleados.map((e) => (
              <div
                key={e.id}
                className={`${SURFACE} flex flex-col gap-3 p-4`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    {e.nombre_empleado || '—'}
                  </div>
                  <span
                    className={
                      e.activo
                        ? 'shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400'
                        : 'shrink-0 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400'
                    }
                  >
                    {e.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  {[e.cargo, e.contrato].filter(Boolean).join(' · ') || '—'}
                </p>
                <div className="flex items-center gap-2 text-[#111827] dark:text-[#e8eaf0]">
                  <DollarSign
                    size={20}
                    strokeWidth={1.5}
                    className="text-amber-500"
                  />
                  <span className="font-medium">
                    {formatEuro(e.salario_bruto_mensual)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => abrirEditar(e)}
                  className={BTN_PRIMARY}
                >
                  <Pencil size={18} strokeWidth={1.5} />
                  Editar
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="presentation"
        >
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-xl border border-[#e2e5ed] bg-white p-5 dark:border-[#2e3347] dark:bg-[#1a1d27] sm:rounded-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="empleado-modal-title"
          >
            <h2
              id="empleado-modal-title"
              className="mb-4 text-xl font-bold text-[#111827] dark:text-[#e8eaf0]"
            >
              {modal.modo === 'nuevo' ? 'Nuevo empleado' : 'Editar empleado'}
            </h2>

            {modalLoading ? (
              <Loader />
            ) : (
              <>
                {modalError ? (
                  <p className="mb-4 text-[15px] text-red-600 dark:text-red-400">
                    {modalError}
                  </p>
                ) : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                    <span>
                      Nombre completo <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={form.nombre_completo}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          nombre_completo: e.target.value,
                        }))
                      }
                      className={`${INPUT} min-h-[48px]`}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                    DNI
                    <input
                      type="text"
                      value={form.dni}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, dni: e.target.value }))
                      }
                      className={`${INPUT} min-h-[48px]`}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                    NSS
                    <input
                      type="text"
                      value={form.nss}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nss: e.target.value }))
                      }
                      className={`${INPUT} min-h-[48px]`}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                    Cargo
                    <input
                      type="text"
                      value={form.cargo}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, cargo: e.target.value }))
                      }
                      className={`${INPUT} min-h-[48px]`}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                    Contrato
                    <select
                      value={form.contrato}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, contrato: e.target.value }))
                      }
                      className={`${SELECT} min-h-[48px]`}
                    >
                      {CONTRATO_OPCIONES.map((o) => (
                        <option key={o.value || 'empty'} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                    Jornada (h/semana)
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={form.jornada_horas}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          jornada_horas: e.target.value,
                        }))
                      }
                      className={`${INPUT} min-h-[48px]`}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                    Salario bruto mensual
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.salario_bruto_mensual}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          salario_bruto_mensual: e.target.value,
                        }))
                      }
                      className={`${INPUT} min-h-[48px]`}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                    IRPF % (0–45)
                    <input
                      type="number"
                      min={0}
                      max={45}
                      step={0.01}
                      value={form.irpf_porcentaje}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          irpf_porcentaje: e.target.value,
                        }))
                      }
                      className={`${INPUT} min-h-[48px]`}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                    Fecha inicio
                    <input
                      type="date"
                      value={form.fecha_inicio}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          fecha_inicio: e.target.value,
                        }))
                      }
                      className={`${INPUT} min-h-[48px]`}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:col-span-2">
                    IBAN
                    <input
                      type="text"
                      value={form.iban}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, iban: e.target.value }))
                      }
                      className={`${INPUT} min-h-[48px]`}
                    />
                  </label>
                  <label className="flex min-h-[48px] cursor-pointer items-center gap-3 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, activo: e.target.checked }))
                      }
                      className="h-5 w-5 rounded border-[#e2e5ed] text-amber-500 focus:ring-amber-500 dark:border-[#2e3347]"
                    />
                    Activo
                  </label>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={cerrarModal}
                    disabled={saving}
                    className={BTN_SECONDARY}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={guardar}
                    disabled={saving}
                    className={BTN_PRIMARY}
                  >
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
