import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Power,
  Store,
  Users,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  getSuperadminTenantDetail,
  patchTenantActivo,
  patchSuperadminTenant,
} from '../../services/api'
import { DEFAULT_MODULOS, MODULO_LABELS } from './modulosCatalog'

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function apiErrorMessage(err, fallback = 'Error') {
  const d = err?.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) {
    return d
      .map((x) => (typeof x === 'string' ? x : x?.msg || JSON.stringify(x)))
      .join(', ')
  }
  if (d && typeof d === 'object') {
    try {
      return JSON.stringify(d)
    } catch {
      return fallback
    }
  }
  return err?.message || fallback
}

function tenantToEditForm(t) {
  return {
    nombre: t.nombre || '',
    nif: t.nif || '',
    email_slug: t.email_slug || '',
    razon_social: t.razon_social || '',
    codigo_postal: t.codigo_postal || '',
    ciudad: t.ciudad || '',
    provincia: t.provincia || '',
    serie_facturacion: t.serie_facturacion || 'A',
    direccion: t.direccion || '',
    telefono: t.telefono || '',
    email: t.email || '',
    plan: t.plan || 'basico',
  }
}

function applyTenantToForms(t, setEditForm, setModulosForm) {
  if (!t) return
  setEditForm(tenantToEditForm(t))
  const mods =
    t.modulos && typeof t.modulos === 'object' && !Array.isArray(t.modulos)
      ? t.modulos
      : {}
  setModulosForm({ ...DEFAULT_MODULOS, ...mods })
}

export default function TenantDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [softError, setSoftError] = useState(null)
  const [payload, setPayload] = useState(null)
  const [modal, setModal] = useState(null)
  const [patching, setPatching] = useState(false)
  const [patchError, setPatchError] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editMsg, setEditMsg] = useState('')
  const [editMsgIsError, setEditMsgIsError] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [modulosForm, setModulosForm] = useState(null)
  const [modulosMsg, setModulosMsg] = useState('')
  const [modulosMsgIsError, setModulosMsgIsError] = useState(false)
  const [modulosSaving, setModulosSaving] = useState(false)
  const hasPayloadRef = useRef(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setSoftError(null)
    try {
      const res = await getSuperadminTenantDetail(id)
      setPayload(res.data)
      hasPayloadRef.current = true
      setError(null)
      applyTenantToForms(res.data?.tenant, setEditForm, setModulosForm)
    } catch (e) {
      const msg = apiErrorMessage(e, 'No se pudo cargar el tenant')
      if (e.response?.status === 404) {
        setError('Tenant no encontrado')
        setPayload(null)
        hasPayloadRef.current = false
      } else if (hasPayloadRef.current) {
        setSoftError(msg)
      } else {
        setError(msg)
        setPayload(null)
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    hasPayloadRef.current = false
    load()
  }, [load])

  const tenant = payload?.tenant

  const mergeTenant = (updated) => {
    if (!updated) return
    setPayload((prev) => {
      const merged = { ...(prev?.tenant || {}), ...updated }
      applyTenantToForms(merged, setEditForm, setModulosForm)
      if (!prev) {
        return {
          tenant: merged,
          outlets: [],
          usuarios_activos_count: 0,
        }
      }
      return { ...prev, tenant: merged }
    })
  }

  const confirmToggle = () => {
    if (!tenant) return
    setPatchError(null)
    setModal({
      nextActivo: !tenant.activo,
      label: tenant.activo ? 'desactivar' : 'activar',
    })
  }

  const handleConfirmPatch = async () => {
    if (!id || !modal) return
    setPatching(true)
    setPatchError(null)
    try {
      const res = await patchTenantActivo(id, modal.nextActivo)
      setModal(null)
      if (res.data?.tenant) {
        mergeTenant(res.data.tenant)
      } else {
        await load()
      }
    } catch (e) {
      setPatchError(apiErrorMessage(e, 'No se pudo actualizar'))
    } finally {
      setPatching(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!id || !editForm) return
    if (!editForm.nombre.trim() || !editForm.nif.trim()) {
      setEditMsgIsError(true)
      setEditMsg('Nombre y NIF son obligatorios')
      return
    }
    setEditSaving(true)
    setEditMsg('')
    setEditMsgIsError(false)
    try {
      const body = {
        nombre: editForm.nombre.trim(),
        nif: editForm.nif.trim(),
        email_slug: editForm.email_slug.trim() || null,
        razon_social: editForm.razon_social.trim() || null,
        codigo_postal: editForm.codigo_postal.trim() || null,
        ciudad: editForm.ciudad.trim() || null,
        provincia: editForm.provincia.trim() || null,
        serie_facturacion: editForm.serie_facturacion.trim() || 'A',
        direccion: editForm.direccion.trim() || null,
        telefono: editForm.telefono.trim() || null,
        email: editForm.email.trim() || null,
        plan: editForm.plan || 'basico',
      }
      const res = await patchSuperadminTenant(id, body)
      setEditMsgIsError(false)
      setEditMsg('Guardado')
      if (res.data?.tenant) {
        mergeTenant(res.data.tenant)
      } else {
        await load()
      }
      setTimeout(() => setEditMsg(''), 3000)
    } catch (e) {
      setEditMsgIsError(true)
      setEditMsg(apiErrorMessage(e, 'Error al guardar'))
    } finally {
      setEditSaving(false)
    }
  }

  const handleSaveModulos = async () => {
    if (!id || !modulosForm) return
    setModulosSaving(true)
    setModulosMsg('')
    setModulosMsgIsError(false)
    try {
      const res = await patchSuperadminTenant(id, { modulos: modulosForm })
      setModulosMsgIsError(false)
      setModulosMsg('Módulos guardados')
      if (res.data?.tenant) {
        mergeTenant(res.data.tenant)
      } else {
        await load()
      }
      setTimeout(() => setModulosMsg(''), 3000)
    } catch (e) {
      setModulosMsgIsError(true)
      setModulosMsg(apiErrorMessage(e, 'Error al guardar módulos'))
    } finally {
      setModulosSaving(false)
    }
  }

  if (loading && !payload) {
    return (
      <p className="text-center text-[#6b7280] dark:text-[#8b90a7]">
        Cargando…
      </p>
    )
  }

  if ((error && !tenant) || !tenant) {
    return (
      <div className="space-y-4">
        <Link
          to="/superadmin/tenants"
          className="inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
          Volver al listado
        </Link>
        <div
          className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400"
          role="alert"
        >
          <AlertTriangle size={18} strokeWidth={1.5} />
          {error || 'Sin datos'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {softError ? (
        <div
          className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
          role="status"
        >
          <AlertTriangle size={18} strokeWidth={1.5} />
          {softError} (se mantienen los datos en pantalla)
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/superadmin/tenants"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-amber-600 hover:text-amber-500 dark:text-amber-400"
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
            Tenants
          </Link>
          <div className="flex items-center gap-3">
            <Building2
              className="text-amber-500"
              size={32}
              strokeWidth={1.5}
            />
            <div>
              <h2 className="text-xl font-bold text-[#111827] dark:text-[#e8eaf0]">
                {tenant.nombre}
              </h2>
              <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                {tenant.nif || 'Sin NIF'} · {tenant.plan || '—'}
                {tenant.email_slug
                  ? ` · @${tenant.email_slug}.com`
                  : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={
              tenant.activo
                ? 'inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400'
                : 'inline-flex rounded-full bg-[#e5e7eb] px-3 py-1 text-sm font-medium text-[#6b7280] dark:bg-[#2e3347] dark:text-[#8b90a7]'
            }
          >
            {tenant.activo ? 'Activo' : 'Inactivo'}
          </span>
          <button
            type="button"
            onClick={confirmToggle}
            className="inline-flex items-center gap-2 rounded-lg border border-[#e2e5ed] bg-white px-4 py-2 text-sm font-medium text-[#111827] transition-colors hover:bg-[#f4f6f9] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] dark:hover:bg-[#222536]"
          >
            <Power size={18} strokeWidth={1.5} />
            {tenant.activo ? 'Desactivar tenant' : 'Activar tenant'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27]">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
            Usuarios activos
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            <Users size={24} strokeWidth={1.5} className="text-amber-500" />
            {payload.usuarios_activos_count ?? '—'}
          </p>
        </div>
        <div className="rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27]">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
            Outlets
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
            <Store size={24} strokeWidth={1.5} className="text-amber-500" />
            {payload.outlets?.length ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27] sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
            Creado
          </p>
          <p className="mt-2 text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            {formatDate(tenant.created_at)}
          </p>
        </div>
      </div>

      {editForm ? (
        <div className="rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27]">
          <h3 className="mb-1 text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Datos del local
          </h3>
          <p className="mb-3 text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Corrige NIF, dirección u otros datos del alta sin borrar el local.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['nombre', 'Nombre comercial *'],
              ['nif', 'NIF *'],
              ['email_slug', 'Slug email (login)'],
              ['razon_social', 'Razón social'],
              ['direccion', 'Dirección'],
              ['codigo_postal', 'Código postal'],
              ['ciudad', 'Ciudad'],
              ['provincia', 'Provincia'],
              ['telefono', 'Teléfono'],
              ['email', 'Email contacto'],
              ['serie_facturacion', 'Serie facturación'],
              ['plan', 'Plan'],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex flex-col gap-1 text-sm text-[#6b7280] dark:text-[#8b90a7]"
              >
                {label}
                {key === 'plan' ? (
                  <select
                    value={editForm.plan || 'basico'}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, plan: e.target.value }))
                    }
                    className="h-12 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]"
                  >
                    <option value="basico">Básico</option>
                    <option value="profesional">Profesional</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                ) : (
                  <input
                    value={editForm[key] || ''}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    className="h-12 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]"
                  />
                )}
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={editSaving}
            onClick={handleSaveEdit}
            className="mt-4 h-12 rounded-lg bg-amber-500 px-6 font-semibold text-black disabled:opacity-40"
          >
            {editSaving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          {editMsg ? (
            <p
              className={
                editMsgIsError
                  ? 'mt-2 text-sm text-red-600 dark:text-red-400'
                  : 'mt-2 text-sm text-emerald-600 dark:text-emerald-400'
              }
              role={editMsgIsError ? 'alert' : undefined}
            >
              {editMsg}
            </p>
          ) : null}
        </div>
      ) : null}

      {modulosForm ? (
        <div className="rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27]">
          <h3 className="mb-2 text-[15px] font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Módulos autorizados
          </h3>
          <p className="mb-3 text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Controla qué ve el menú del local. Los usuarios deben volver a
            entrar (o refrescar perfil) para ver cambios.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODULO_LABELS.map(({ key, label }) => (
              <label
                key={key}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-[#e2e5ed] px-3 py-2 dark:border-[#2e3347]"
              >
                <input
                  type="checkbox"
                  checked={!!modulosForm[key]}
                  onChange={() =>
                    setModulosForm((m) => {
                      const base =
                        m && typeof m === 'object' ? m : DEFAULT_MODULOS
                      return {
                        ...DEFAULT_MODULOS,
                        ...base,
                        [key]: !base[key],
                      }
                    })
                  }
                  className="h-4 w-4 accent-amber-500"
                />
                <span className="text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                  {label}
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={modulosSaving}
            onClick={handleSaveModulos}
            className="mt-4 h-12 rounded-lg bg-amber-500 px-6 font-semibold text-black disabled:opacity-40"
          >
            {modulosSaving ? 'Guardando…' : 'Guardar módulos'}
          </button>
          {modulosMsg ? (
            <p
              className={
                modulosMsgIsError
                  ? 'mt-2 text-sm text-red-600 dark:text-red-400'
                  : 'mt-2 text-sm text-emerald-600 dark:text-emerald-400'
              }
              role={modulosMsgIsError ? 'alert' : undefined}
            >
              {modulosMsg}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="border-b border-[#e2e5ed] px-4 py-3 dark:border-[#2e3347]">
          <h3 className="text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Outlets
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="horeca-body-text w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e2e5ed] bg-[#f9fafb] dark:border-[#2e3347] dark:bg-[#14161f]">
                <th className="px-4 py-2 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Nombre
                </th>
                <th className="px-4 py-2 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Mesas
                </th>
                <th className="px-4 py-2 font-semibold text-[#374151] dark:text-[#c4c9d4]">
                  Alta
                </th>
              </tr>
            </thead>
            <tbody>
              {!payload.outlets?.length ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-[#6b7280] dark:text-[#8b90a7]"
                  >
                    Sin outlets
                  </td>
                </tr>
              ) : (
                payload.outlets.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-[#e2e5ed] last:border-0 dark:border-[#2e3347]"
                  >
                    <td className="px-4 py-2 font-medium text-[#111827] dark:text-[#e8eaf0]">
                      {o.nombre}
                    </td>
                    <td className="px-4 py-2 text-[#6b7280] dark:text-[#8b90a7]">
                      {o.num_mesas ?? '—'}
                    </td>
                    <td className="px-4 py-2 text-[#6b7280] dark:text-[#8b90a7]">
                      {formatDate(o.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-tenant-title"
        >
          <div className="w-full max-w-md rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
            <h3
              id="modal-tenant-title"
              className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]"
            >
              Confirmar
            </h3>
            <p className="mt-2 text-sm text-[#6b7280] dark:text-[#8b90a7]">
              ¿Seguro que quieres {modal.label} el tenant «{tenant.nombre}»?
            </p>
            {modal.nextActivo === false ? (
              <p className="mt-2 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Desactivar bloquea el acceso del local (login operativo). No
                borra histórico, tickets ni datos fiscales; puedes activarlo de
                nuevo más tarde.
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Activar vuelve a permitir el acceso de los usuarios de este
                local.
              </p>
            )}
            {patchError ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {patchError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={patching}
                onClick={() => {
                  setModal(null)
                  setPatchError(null)
                }}
                className="rounded-lg border border-[#e2e5ed] px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f4f6f9] dark:border-[#2e3347] dark:text-[#c4c9d4] dark:hover:bg-[#222536]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={patching}
                onClick={handleConfirmPatch}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-[#111827] hover:bg-amber-400 disabled:opacity-50"
              >
                {patching ? 'Guardando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
