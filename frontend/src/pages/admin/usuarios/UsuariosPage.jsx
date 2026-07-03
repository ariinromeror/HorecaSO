import { useCallback, useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  Check,
  Plus,
  UserRound,
  X,
} from 'lucide-react'
import {
  createAdminUsuario,
  getAdminUsuarios,
  getMesas,
  patchAdminUsuario,
} from '../../../services/api'

const ROLES_OPERATIVOS = [
  { value: 'admin', label: 'Admin' },
  { value: 'director', label: 'Director' },
  { value: 'jefe_sala', label: 'Jefe de sala' },
  { value: 'camarero', label: 'Camarero' },
  { value: 'cocina', label: 'Cocina' },
  { value: 'barra', label: 'Barra' },
  { value: 'almacen', label: 'Almacén' },
]

const ROLES_OPERATIVOS_VALUES = ROLES_OPERATIVOS.map((r) => r.value)

/**
 * Segundo caso piloto de la Fase 9 del PRD de hardening (formularios +
 * validación), además corrige una violación preexistente de `.cursorrules`
 * (`<form onSubmit>` nativo) en los dos modales de este archivo. Ver
 * `frontend/README.md` para el patrón completo.
 */
const usuarioCreateSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  email: z
    .string()
    .trim()
    .min(1, 'El email es obligatorio')
    .email('Introduce un email válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  rol: z.enum(ROLES_OPERATIVOS_VALUES),
  outlet_id: z.string(),
})

const usuarioEditSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  rol: z.enum(ROLES_OPERATIVOS_VALUES),
  outlet_id: z.string(),
  activo: z.boolean(),
})

function rolBadgeClass(rol) {
  const map = {
    admin:
      'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    director:
      'bg-violet-500/15 text-violet-800 dark:text-violet-300',
    jefe_sala:
      'bg-blue-500/15 text-blue-800 dark:text-blue-300',
    camarero:
      'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
    cocina:
      'bg-orange-500/15 text-orange-800 dark:text-orange-300',
    barra:
      'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300',
    almacen:
      'bg-[#e5e7eb] text-[#374151] dark:bg-[#2e3347] dark:text-[#c4c9d4]',
  }
  return (
    map[rol] ||
    'bg-[#e5e7eb] text-[#374151] dark:bg-[#2e3347] dark:text-[#c4c9d4]'
  )
}

function rolLabel(rol) {
  return ROLES_OPERATIVOS.find((r) => r.value === rol)?.label || rol
}

function apiErrorMessage(err) {
  const d = err.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) {
    return d.map((x) => x.msg || x).join(', ')
  }
  return err.message || 'Error'
}

const inputClass =
  'mt-1 w-full rounded-lg border border-[#e2e5ed] bg-[#f9fafb] px-3 py-2 text-sm text-[#111827] dark:border-[#2e3347] dark:bg-[#14161f] dark:text-[#e8eaf0]'
const labelClass = 'text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]'

export default function UsuariosPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [outletOptions, setOutletOptions] = useState([])
  const [modalCreate, setModalCreate] = useState(false)
  const [modalEdit, setModalEdit] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const outletLabelMap = useMemo(() => {
    const m = new Map()
    outletOptions.forEach((o) => m.set(o.id, o.label))
    return m
  }, [outletOptions])

  const outletOptionsForEdit = useMemo(() => {
    if (!modalEdit?.outlet_id) return outletOptions
    const ids = new Set(outletOptions.map((o) => o.id))
    if (ids.has(modalEdit.outlet_id)) return outletOptions
    return [
      {
        id: modalEdit.outlet_id,
        label: `Outlet (${String(modalEdit.outlet_id).slice(0, 8)}…)`,
      },
      ...outletOptions,
    ]
  }, [outletOptions, modalEdit])

  const loadOutletsFromMesas = useCallback(async () => {
    try {
      const res = await getMesas()
      const mesas = Array.isArray(res.data) ? res.data : []
      const ids = [...new Set(mesas.map((x) => x.outlet_id).filter(Boolean))]
      ids.sort()
      setOutletOptions(
        ids.map((id, i) => ({
          id,
          label: `Local ${i + 1} (${String(id).slice(0, 8)}…)`,
        }))
      )
    } catch {
      setOutletOptions([])
    }
  }, [])

  const loadUsuarios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAdminUsuarios()
      const list = res.data?.items
      setItems(Array.isArray(list) ? list : [])
    } catch (e) {
      setError(apiErrorMessage(e))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsuarios()
    loadOutletsFromMesas()
  }, [loadUsuarios, loadOutletsFromMesas])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UserRound
            className="text-amber-500"
            size={28}
            strokeWidth={1.5}
          />
          <div>
            <h1 className="text-xl font-bold text-[#111827] dark:text-[#e8eaf0] sm:text-2xl">
              Usuarios del local
            </h1>
            <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Alta y edición de usuarios del mismo tenant
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFeedback(null)
            setModalCreate(true)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-[#111827] hover:bg-amber-400"
        >
          <Plus size={18} strokeWidth={1.5} />
          Nuevo usuario
        </button>
      </div>

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
        <div
          className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          <AlertTriangle size={18} strokeWidth={1.5} />
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="overflow-x-auto">
          <table className="horeca-body-text w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e2e5ed] bg-[#f9fafb] dark:border-[#2e3347] dark:bg-[#14161f]">
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Nombre
                </th>
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Email
                </th>
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Rol
                </th>
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Outlet
                </th>
                <th className="px-4 py-3 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Activo
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-[#6b7280] dark:text-[#8b90a7]"
                  >
                    Cargando…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-[#6b7280] dark:text-[#8b90a7]"
                  >
                    No hay usuarios
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setFeedback(null)
                      setModalEdit(row)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setFeedback(null)
                        setModalEdit(row)
                      }
                    }}
                    className="cursor-pointer border-b border-[#e2e5ed] transition-colors last:border-0 hover:bg-[#f4f6f9] dark:border-[#2e3347] dark:hover:bg-[#222536]"
                  >
                    <td className="px-4 py-3 font-medium text-[#111827] dark:text-[#e8eaf0]">
                      {row.nombre}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] dark:text-[#8b90a7]">
                      {row.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${rolBadgeClass(row.rol)}`}
                      >
                        {rolLabel(row.rol)}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-[#6b7280] dark:text-[#8b90a7]">
                      {row.outlet_id
                        ? outletLabelMap.get(row.outlet_id) ||
                          `${String(row.outlet_id).slice(0, 8)}…`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.activo
                            ? 'inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400'
                            : 'inline-flex rounded-full bg-[#e5e7eb] px-2.5 py-0.5 text-xs font-medium text-[#6b7280] dark:bg-[#2e3347] dark:text-[#8b90a7]'
                        }
                      >
                        {row.activo ? 'Sí' : 'No'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalCreate ? (
        <UsuarioCreateModal
          outletOptions={outletOptions}
          submitting={submitting}
          onClose={() => setModalCreate(false)}
          onSubmit={async (body) => {
            setSubmitting(true)
            try {
              await createAdminUsuario(body)
              setModalCreate(false)
              setFeedback({ type: 'ok', msg: 'Usuario creado' })
              await loadUsuarios()
            } catch (e) {
              setFeedback({ type: 'err', msg: apiErrorMessage(e) })
            } finally {
              setSubmitting(false)
            }
          }}
        />
      ) : null}

      {modalEdit ? (
        <UsuarioEditModal
          userRow={modalEdit}
          outletOptions={outletOptionsForEdit}
          submitting={submitting}
          onClose={() => setModalEdit(null)}
          onSubmit={async (body) => {
            setSubmitting(true)
            try {
              await patchAdminUsuario(modalEdit.id, body)
              setModalEdit(null)
              setFeedback({ type: 'ok', msg: 'Usuario actualizado' })
              await loadUsuarios()
            } catch (e) {
              setFeedback({ type: 'err', msg: apiErrorMessage(e) })
            } finally {
              setSubmitting(false)
            }
          }}
        />
      ) : null}
    </div>
  )
}

const fieldErrorClass = 'mt-1 text-xs text-red-500'

function UsuarioCreateModal({ outletOptions, submitting, onClose, onSubmit }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(usuarioCreateSchema),
    defaultValues: {
      nombre: '',
      email: '',
      password: '',
      rol: 'camarero',
      outlet_id: '',
    },
  })

  const submit = (values) => {
    onSubmit({
      nombre: values.nombre.trim(),
      email: values.email.trim(),
      password: values.password,
      rol: values.rol,
      outlet_id: values.outlet_id || null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-create-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2
            id="modal-create-title"
            className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]"
          >
            Nuevo usuario
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
            aria-label="Cerrar"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="cu-nombre" className={labelClass}>
              Nombre
            </label>
            <input
              id="cu-nombre"
              {...register('nombre')}
              className={inputClass}
            />
            {errors.nombre ? (
              <p className={fieldErrorClass}>{errors.nombre.message}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="cu-email" className={labelClass}>
              Email
            </label>
            <input
              id="cu-email"
              type="email"
              {...register('email')}
              className={inputClass}
            />
            {errors.email ? (
              <p className={fieldErrorClass}>{errors.email.message}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="cu-pass" className={labelClass}>
              Contraseña (mín. 8 caracteres)
            </label>
            <input
              id="cu-pass"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              className={inputClass}
            />
            {errors.password ? (
              <p className={fieldErrorClass}>{errors.password.message}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="cu-rol" className={labelClass}>
              Rol
            </label>
            <select id="cu-rol" {...register('rol')} className={inputClass}>
              {ROLES_OPERATIVOS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cu-outlet" className={labelClass}>
              Outlet (opcional)
            </label>
            <select
              id="cu-outlet"
              {...register('outlet_id')}
              className={inputClass}
            >
              <option value="">— Ninguno —</option>
              {outletOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-lg border border-[#e2e5ed] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f4f6f9] dark:border-[#2e3347] dark:text-[#c4c9d4] dark:hover:bg-[#222536]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit(submit)}
              disabled={submitting}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-[#111827] hover:bg-amber-400 disabled:opacity-50"
            >
              {submitting ? 'Guardando…' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function UsuarioEditModal({ userRow, outletOptions, submitting, onClose, onSubmit }) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(usuarioEditSchema),
    defaultValues: {
      nombre: userRow.nombre || '',
      rol: userRow.rol || 'camarero',
      outlet_id: userRow.outlet_id || '',
      activo: !!userRow.activo,
    },
  })

  const submit = (values) => {
    onSubmit({
      nombre: values.nombre.trim(),
      rol: values.rol,
      outlet_id: values.outlet_id || null,
      activo: values.activo,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-edit-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="mb-4 flex items-start justify-between gap-2">
          <h2
            id="modal-edit-title"
            className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]"
          >
            Editar usuario
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
            aria-label="Cerrar"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <span className={labelClass}>Email</span>
            <p className="mt-1 text-sm text-[#111827] dark:text-[#e8eaf0]">
              {userRow.email}
            </p>
            <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8b90a7]">
              El email no se puede cambiar desde aquí
            </p>
          </div>
          <div>
            <label htmlFor="eu-nombre" className={labelClass}>
              Nombre
            </label>
            <input
              id="eu-nombre"
              {...register('nombre')}
              className={inputClass}
            />
            {errors.nombre ? (
              <p className={fieldErrorClass}>{errors.nombre.message}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="eu-rol" className={labelClass}>
              Rol
            </label>
            <select id="eu-rol" {...register('rol')} className={inputClass}>
              {ROLES_OPERATIVOS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="eu-outlet" className={labelClass}>
              Outlet (opcional)
            </label>
            <select
              id="eu-outlet"
              {...register('outlet_id')}
              className={inputClass}
            >
              <option value="">— Ninguno —</option>
              {outletOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <Controller
            name="activo"
            control={control}
            render={({ field }) => (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e2e5ed] px-3 py-3 dark:border-[#2e3347]">
                <span className="text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
                  Usuario activo
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  aria-label="Usuario activo"
                  onClick={() => field.onChange(!field.value)}
                  className={[
                    'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                    field.value
                      ? 'bg-amber-500'
                      : 'bg-[#d1d5db] dark:bg-[#3b4154]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform',
                      field.value ? 'left-5' : 'left-0.5',
                    ].join(' ')}
                  />
                </button>
              </div>
            )}
          />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-lg border border-[#e2e5ed] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f4f6f9] dark:border-[#2e3347] dark:text-[#c4c9d4] dark:hover:bg-[#222536]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit(submit)}
              disabled={submitting}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-[#111827] hover:bg-amber-400 disabled:opacity-50"
            >
              {submitting ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
