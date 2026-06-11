import { useCallback, useEffect, useState } from 'react'
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
} from '../../services/api'

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

export default function TenantDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [payload, setPayload] = useState(null)
  const [modal, setModal] = useState(null)
  const [patching, setPatching] = useState(false)
  const [patchError, setPatchError] = useState(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const res = await getSuperadminTenantDetail(id)
      setPayload(res.data)
    } catch (e) {
      if (e.response?.status === 404) {
        setError('Tenant no encontrado')
      } else {
        const msg =
          e.response?.data?.detail ||
          e.message ||
          'No se pudo cargar el tenant'
        setError(typeof msg === 'string' ? msg : 'Error al cargar')
      }
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const tenant = payload?.tenant

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
      await patchTenantActivo(id, modal.nextActivo)
      setModal(null)
      await load()
    } catch (e) {
      const msg =
        e.response?.data?.detail ||
        e.message ||
        'No se pudo actualizar'
      setPatchError(typeof msg === 'string' ? msg : 'Error al actualizar')
    } finally {
      setPatching(false)
    }
  }

  if (loading && !payload) {
    return (
      <p className="text-center text-[#6b7280] dark:text-[#8b90a7]">
        Cargando…
      </p>
    )
  }

  if (error || !tenant) {
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

      {(tenant.direccion ||
        tenant.telefono ||
        tenant.email ||
        tenant.logo_url) ? (
        <div className="rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27]">
          <h3 className="mb-3 text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Contacto y datos
          </h3>
          <dl className="horeca-body-text grid gap-2 text-sm sm:grid-cols-2">
            {tenant.direccion ? (
              <>
                <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                  Dirección
                </dt>
                <dd className="text-[#111827] dark:text-[#e8eaf0]">
                  {tenant.direccion}
                </dd>
              </>
            ) : null}
            {tenant.telefono ? (
              <>
                <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                  Teléfono
                </dt>
                <dd className="text-[#111827] dark:text-[#e8eaf0]">
                  {tenant.telefono}
                </dd>
              </>
            ) : null}
            {tenant.email ? (
              <>
                <dt className="text-[#6b7280] dark:text-[#8b90a7]">Email</dt>
                <dd className="text-[#111827] dark:text-[#e8eaf0]">
                  {tenant.email}
                </dd>
              </>
            ) : null}
            {tenant.logo_url ? (
              <>
                <dt className="text-[#6b7280] dark:text-[#8b90a7]">Logo</dt>
                <dd className="truncate text-[#111827] dark:text-[#e8eaf0]">
                  {tenant.logo_url}
                </dd>
              </>
            ) : null}
          </dl>
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
