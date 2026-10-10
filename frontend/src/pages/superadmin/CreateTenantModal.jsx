import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { createSuperadminTenant } from '../../services/api'
import {
  DEFAULT_MODULOS,
  MODULO_LABELS,
  suggestEmailSlug,
} from './modulosCatalog'

const inputClass =
  'mt-1 w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const labelClass = 'text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]'

const emptyForm = () => ({
  nombre: '',
  email_slug: '',
  nif: '',
  razon_social: '',
  direccion: '',
  codigo_postal: '',
  ciudad: '',
  provincia: '',
  telefono: '',
  email: '',
  plan: 'basico',
  serie_facturacion: 'A',
  outlet_nombre: 'Sala Principal',
  admin_nombre: '',
  admin_localpart: 'admin',
  admin_password: '',
  modulos: { ...DEFAULT_MODULOS },
})

function apiErrorMessage(err) {
  const d = err.response?.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => x.msg || x).join(', ')
  return err.message || 'Error'
}

function ReqLabel({ children, required }) {
  return (
    <span className={labelClass}>
      {children}
      {required ? <span className="text-amber-500"> *</span> : null}
    </span>
  )
}

export default function CreateTenantModal({ onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm)
  const [slugTouched, setSlugTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const errorTopRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (slugTouched) return
    setForm((f) => ({
      ...f,
      email_slug: suggestEmailSlug(f.nombre),
    }))
  }, [form.nombre, slugTouched])

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const toggleModulo = (key) => {
    setForm((f) => ({
      ...f,
      modulos: { ...f.modulos, [key]: !f.modulos[key] },
    }))
  }

  const showError = (msg) => {
    setError(msg)
    requestAnimationFrame(() => {
      errorTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const handleCreate = async () => {
    setError(null)
    if (!form.nombre.trim() || !form.nif.trim() || !form.email_slug.trim()) {
      showError('Nombre, NIF y slug son obligatorios')
      return
    }
    if (!form.admin_nombre.trim() || !form.admin_localpart.trim()) {
      showError('Datos del admin incompletos')
      return
    }
    if (form.admin_password.length < 8) {
      showError('La contraseña del admin debe tener al menos 8 caracteres')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        nif: form.nif.trim(),
        email_slug: form.email_slug.trim(),
        razon_social: form.razon_social.trim() || null,
        direccion: form.direccion.trim() || null,
        codigo_postal: form.codigo_postal.trim() || null,
        ciudad: form.ciudad.trim() || null,
        provincia: form.provincia.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        plan: form.plan,
        serie_facturacion: form.serie_facturacion || 'A',
        outlet_nombre: form.outlet_nombre.trim() || 'Sala Principal',
        admin_nombre: form.admin_nombre.trim(),
        admin_localpart: form.admin_localpart.trim(),
        admin_password: form.admin_password,
        modulos: form.modulos,
      }
      const res = await createSuperadminTenant(payload)
      onCreated?.(res.data)
      onClose()
    } catch (e) {
      showError(apiErrorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  const slugPreview = form.email_slug.trim()
    ? `@${suggestEmailSlug(form.email_slug) || form.email_slug}.com`
    : '@….com'

  const errorBox = error ? (
    <p
      ref={errorTopRef}
      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
      role="alert"
    >
      {error}
    </p>
  ) : null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-tenant-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#e2e5ed] bg-white shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="flex items-start justify-between gap-2 border-b border-[#e2e5ed] px-5 py-4 dark:border-[#2e3347]">
          <div>
            <h2
              id="create-tenant-title"
              className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]"
            >
              Crear local
            </h2>
            <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Datos fiscales, slug de email y módulos autorizados. Campos con *
              obligatorios.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
            aria-label="Cerrar"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4"
        >
          {errorBox}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Local
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col sm:col-span-2">
                <ReqLabel required>Nombre comercial</ReqLabel>
                <input
                  value={form.nombre}
                  onChange={(e) => setField('nombre', e.target.value)}
                  className={inputClass}
                  placeholder="Kairos"
                />
              </label>
              <label className="flex flex-col sm:col-span-2">
                <ReqLabel required>
                  Slug email (login → usuario{slugPreview})
                </ReqLabel>
                <input
                  value={form.email_slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setField('email_slug', e.target.value)
                  }}
                  className={inputClass}
                  placeholder="kairos"
                />
              </label>
              <label className="flex flex-col">
                <ReqLabel required>NIF</ReqLabel>
                <input
                  value={form.nif}
                  onChange={(e) => setField('nif', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col">
                <ReqLabel>Razón social</ReqLabel>
                <input
                  value={form.razon_social}
                  onChange={(e) => setField('razon_social', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col sm:col-span-2">
                <ReqLabel>Dirección</ReqLabel>
                <input
                  value={form.direccion}
                  onChange={(e) => setField('direccion', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col">
                <ReqLabel>Código postal</ReqLabel>
                <input
                  value={form.codigo_postal}
                  onChange={(e) => setField('codigo_postal', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col">
                <ReqLabel>Ciudad</ReqLabel>
                <input
                  value={form.ciudad}
                  onChange={(e) => setField('ciudad', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col">
                <ReqLabel>Provincia</ReqLabel>
                <input
                  value={form.provincia}
                  onChange={(e) => setField('provincia', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col">
                <ReqLabel>Teléfono</ReqLabel>
                <input
                  value={form.telefono}
                  onChange={(e) => setField('telefono', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col">
                <ReqLabel>Email contacto</ReqLabel>
                <input
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col">
                <ReqLabel>Plan</ReqLabel>
                <select
                  value={form.plan}
                  onChange={(e) => setField('plan', e.target.value)}
                  className={inputClass}
                >
                  <option value="basico">Básico</option>
                  <option value="profesional">Profesional</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <label className="flex flex-col">
                <ReqLabel>Serie facturación</ReqLabel>
                <input
                  value={form.serie_facturacion}
                  onChange={(e) => setField('serie_facturacion', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col sm:col-span-2">
                <ReqLabel>Nombre outlet / sala</ReqLabel>
                <input
                  value={form.outlet_nombre}
                  onChange={(e) => setField('outlet_nombre', e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Admin del local
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col sm:col-span-2">
                <ReqLabel required>Nombre</ReqLabel>
                <input
                  value={form.admin_nombre}
                  onChange={(e) => setField('admin_nombre', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col sm:col-span-2">
                <ReqLabel required>Usuario login</ReqLabel>
                <div className="mt-1 flex overflow-hidden rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]">
                  <input
                    value={form.admin_localpart}
                    onChange={(e) => setField('admin_localpart', e.target.value)}
                    className="min-w-0 flex-1 bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] focus:outline-none dark:bg-[#222536] dark:text-[#e8eaf0]"
                    placeholder="admin"
                  />
                  <span className="flex items-center bg-[#f9fafb] px-3 text-sm text-[#6b7280] dark:bg-[#14161f] dark:text-[#8b90a7]">
                    {slugPreview}
                  </span>
                </div>
              </label>
              <label className="flex flex-col sm:col-span-2">
                <ReqLabel required>Contraseña (mín. 8)</ReqLabel>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.admin_password}
                  onChange={(e) => setField('admin_password', e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Módulos autorizados
            </h3>
            <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Solo lo marcado aparecerá en el menú del local (según rol).
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {MODULO_LABELS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-[#e2e5ed] px-3 py-2 dark:border-[#2e3347]"
                >
                  <input
                    type="checkbox"
                    checked={!!form.modulos[key]}
                    onChange={() => toggleModulo(key)}
                    className="h-4 w-4 accent-amber-500"
                  />
                  <span className="text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-3 border-t border-[#e2e5ed] px-5 py-4 dark:border-[#2e3347]">
          {error ? (
            <p
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="h-12 rounded-lg border border-[#e2e5ed] px-4 text-sm font-medium text-[#374151] hover:bg-[#f4f6f9] dark:border-[#2e3347] dark:text-[#c4c9d4] dark:hover:bg-[#222536]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleCreate}
              className="h-12 rounded-lg bg-amber-500 px-6 text-sm font-semibold text-black hover:bg-amber-600 disabled:opacity-40"
            >
              {submitting ? 'Creando…' : 'Crear local'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
