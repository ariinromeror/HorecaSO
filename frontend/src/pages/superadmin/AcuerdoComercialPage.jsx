import { useCallback, useEffect, useState } from 'react'
import {
  FileSignature,
  FileText,
  Plus,
  Save,
  Download,
} from 'lucide-react'
import {
  createAcuerdoPiloto,
  downloadAcuerdoPilotoPdf,
  getAcuerdoProveedorDefaults,
  getAcuerdosPiloto,
  patchAcuerdoPiloto,
  putAcuerdoProveedorDefaults,
} from '../../services/api'

const CARD =
  'rounded-xl border border-[#e2e5ed] bg-white p-5 dark:border-[#2e3347] dark:bg-[#1a1d27]'
const INPUT =
  'w-full min-w-0 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0] focus:outline-none focus:border-amber-500'
const LABEL =
  'mb-1 block text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]'
const BTN_PRIMARY =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 font-semibold text-black hover:bg-amber-600 disabled:opacity-40'
const BTN_SECONDARY =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 font-medium text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0] disabled:opacity-40'

const MODULO_OPTS = [
  { id: 'sala', label: 'Sala / caja' },
  { id: 'kds', label: 'KDS' },
  { id: 'carta', label: 'Carta' },
  { id: 'recetas', label: 'Recetas' },
  { id: 'inventario', label: 'Inventario' },
  { id: 'reservas', label: 'Reservas' },
  { id: 'reportes', label: 'Reportes' },
]

function emptyAcuerdo(defaults) {
  return {
    fecha_acuerdo: new Date().toISOString().slice(0, 10),
    periodo_desde: '',
    periodo_hasta: '',
    precio_tipo: 'gratuito',
    precio_importe: '',
    precio_otro_texto: '',
    modulos: ['sala', 'kds', 'carta', 'reportes'],
    modulos_otros: '',
    cliente_nombre_comercial: '',
    cliente_razon_social: '',
    cliente_nif: '',
    cliente_direccion: '',
    cliente_contacto: '',
    cliente_email: '',
    proveedor_razon_social: defaults?.razon_social || '',
    proveedor_nif: defaults?.nif || '',
    proveedor_email: defaults?.email || '',
    proveedor_direccion: defaults?.direccion || '',
    soporte_canal: defaults?.soporte_canal || '',
    soporte_horario: defaults?.soporte_horario || '',
  }
}

function acuerdoToForm(a, defaults) {
  return {
    fecha_acuerdo: a.fecha_acuerdo || '',
    periodo_desde: a.periodo_desde || '',
    periodo_hasta: a.periodo_hasta || '',
    precio_tipo: a.precio_tipo || 'gratuito',
    precio_importe:
      a.precio_importe != null && a.precio_importe !== ''
        ? String(a.precio_importe)
        : '',
    precio_otro_texto: a.precio_otro_texto || '',
    modulos: Array.isArray(a.modulos) ? [...a.modulos] : [],
    modulos_otros: a.modulos_otros || '',
    cliente_nombre_comercial: a.cliente_nombre_comercial || '',
    cliente_razon_social: a.cliente_razon_social || '',
    cliente_nif: a.cliente_nif || '',
    cliente_direccion: a.cliente_direccion || '',
    cliente_contacto: a.cliente_contacto || '',
    cliente_email: a.cliente_email || '',
    proveedor_razon_social:
      a.proveedor_razon_social || defaults?.razon_social || '',
    proveedor_nif: a.proveedor_nif || defaults?.nif || '',
    proveedor_email: a.proveedor_email || defaults?.email || '',
    proveedor_direccion: a.proveedor_direccion || defaults?.direccion || '',
    soporte_canal: a.soporte_canal || defaults?.soporte_canal || '',
    soporte_horario: a.soporte_horario || defaults?.soporte_horario || '',
  }
}

function formToBody(form) {
  const importe =
    form.precio_tipo === 'gratuito'
      ? null
      : form.precio_importe === ''
        ? null
        : Number(String(form.precio_importe).replace(',', '.'))
  return {
    fecha_acuerdo: form.fecha_acuerdo || null,
    periodo_desde: form.periodo_desde || null,
    periodo_hasta: form.periodo_hasta || null,
    precio_tipo: form.precio_tipo || 'gratuito',
    precio_importe: Number.isFinite(importe) ? importe : null,
    precio_otro_texto: form.precio_otro_texto || null,
    modulos: form.modulos || [],
    modulos_otros: form.modulos_otros || null,
    cliente_nombre_comercial: form.cliente_nombre_comercial || '',
    cliente_razon_social: form.cliente_razon_social || null,
    cliente_nif: form.cliente_nif || null,
    cliente_direccion: form.cliente_direccion || null,
    cliente_contacto: form.cliente_contacto || null,
    cliente_email: form.cliente_email || null,
    proveedor_razon_social: form.proveedor_razon_social || null,
    proveedor_nif: form.proveedor_nif || null,
    proveedor_email: form.proveedor_email || null,
    proveedor_direccion: form.proveedor_direccion || null,
    soporte_canal: form.soporte_canal || null,
    soporte_horario: form.soporte_horario || null,
  }
}

function precioLabel(tipo) {
  if (tipo === 'aportacion_voluntaria') return 'Aportación voluntaria'
  if (tipo === 'simbolico') return 'Simbólico'
  if (tipo === 'otro') return 'Otro'
  return 'Gratuito'
}

export default function AcuerdoComercialPage() {
  const [defaults, setDefaults] = useState(null)
  const [provForm, setProvForm] = useState({
    razon_social: '',
    nif: '',
    email: '',
    direccion: '',
    soporte_canal: '',
    soporte_horario: '',
  })
  const [lista, setLista] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(() => emptyAcuerdo(null))
  const [loading, setLoading] = useState(true)
  const [savingProv, setSavingProv] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)

  const showFb = (msg) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rDef, rList] = await Promise.all([
        getAcuerdoProveedorDefaults(),
        getAcuerdosPiloto(),
      ])
      const d = rDef.data || {}
      setDefaults(d)
      setProvForm({
        razon_social: d.razon_social || '',
        nif: d.nif || '',
        email: d.email || '',
        direccion: d.direccion || '',
        soporte_canal: d.soporte_canal || '',
        soporte_horario: d.soporte_horario || '',
      })
      const items = Array.isArray(rList.data) ? rList.data : []
      setLista(items)
    } catch (e) {
      setError(
        e.response?.data?.detail || 'No se pudieron cargar los acuerdos'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load().then(() => {
      /* plantilla lista; formulario vacío en primer render */
    })
  }, [load])

  useEffect(() => {
    if (defaults && !selectedId) {
      setForm((f) =>
        f.cliente_nombre_comercial || f.proveedor_razon_social
          ? f
          : emptyAcuerdo(defaults)
      )
    }
  }, [defaults, selectedId])

  const refreshLista = async () => {
    try {
      const rList = await getAcuerdosPiloto()
      setLista(Array.isArray(rList.data) ? rList.data : [])
    } catch {
      /* ignore */
    }
  }

  const handleSaveProveedor = async () => {
    setSavingProv(true)
    setError(null)
    try {
      const r = await putAcuerdoProveedorDefaults({
        razon_social: provForm.razon_social,
        nif: provForm.nif || null,
        email: provForm.email,
        direccion: provForm.direccion || null,
        soporte_canal: provForm.soporte_canal || null,
        soporte_horario: provForm.soporte_horario || null,
      })
      setDefaults(r.data)
      setForm((f) => ({
        ...f,
        proveedor_razon_social:
          f.proveedor_razon_social || r.data.razon_social || '',
        proveedor_nif: f.proveedor_nif || r.data.nif || '',
        proveedor_email: f.proveedor_email || r.data.email || '',
        proveedor_direccion: f.proveedor_direccion || r.data.direccion || '',
        soporte_canal: f.soporte_canal || r.data.soporte_canal || '',
        soporte_horario: f.soporte_horario || r.data.soporte_horario || '',
      }))
      showFb('Plantilla de proveedor guardada')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al guardar plantilla')
    } finally {
      setSavingProv(false)
    }
  }

  const handleNuevo = () => {
    setSelectedId(null)
    setForm(emptyAcuerdo(defaults || provForm))
  }

  const handleSelect = (item) => {
    setSelectedId(item.id)
    setForm(acuerdoToForm(item, defaults || provForm))
  }

  const handleSaveAcuerdo = async () => {
    if (!form.cliente_nombre_comercial.trim()) {
      setError('Indica el nombre comercial del cliente')
      return
    }
    setSaving(true)
    setError(null)
    const wasNew = !selectedId
    try {
      const body = formToBody(form)
      let r
      if (selectedId) {
        r = await patchAcuerdoPiloto(selectedId, body)
      } else {
        r = await createAcuerdoPiloto(body)
      }
      setSelectedId(r.data.id)
      setForm(acuerdoToForm(r.data, defaults || provForm))
      await refreshLista()
      showFb(wasNew ? 'Acuerdo creado' : 'Acuerdo actualizado')
    } catch (e) {
      setError(e.response?.data?.detail || 'Error al guardar acuerdo')
    } finally {
      setSaving(false)
    }
  }

  const handlePdf = async () => {
    let id = selectedId
    if (!id) {
      setError('Guarda el acuerdo antes de generar el PDF')
      return
    }
    setPdfLoading(true)
    setError(null)
    try {
      // Guardar primero para que el PDF lleve lo último del formulario
      const body = formToBody(form)
      const r = await patchAcuerdoPiloto(id, body)
      id = r.data.id
      setForm(acuerdoToForm(r.data, defaults || provForm))
      const res = await downloadAcuerdoPilotoPdf(id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      showFb('PDF generado')
    } catch (e) {
      let detail = 'Error al generar PDF'
      if (e.response?.data instanceof Blob) {
        try {
          const t = await e.response.data.text()
          const j = JSON.parse(t)
          detail = j.detail || detail
        } catch {
          /* ignore */
        }
      } else if (typeof e.response?.data?.detail === 'string') {
        detail = e.response.data.detail
      }
      setError(detail)
    } finally {
      setPdfLoading(false)
    }
  }

  const toggleModulo = (id) => {
    setForm((f) => {
      const has = f.modulos.includes(id)
      return {
        ...f,
        modulos: has
          ? f.modulos.filter((x) => x !== id)
          : [...f.modulos, id],
      }
    })
  }

  if (loading) {
    return (
      <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
        Cargando…
      </p>
    )
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-col gap-6 text-[#111827] dark:text-[#e8eaf0]">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-amber-500">
          <FileSignature size={24} strokeWidth={1.5} aria-hidden />
          Acuerdo comercial
        </h1>
        <p className="mt-1 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          Rellena tus datos de proveedor (NIF opcional si aún no eres
          autónomo), crea el acuerdo del restaurante y genera el PDF para que
          el cliente firme.
        </p>
      </div>

      {feedback ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-600 dark:text-emerald-400">
          {feedback}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-600 dark:text-red-400">
          {typeof error === 'string' ? error : 'Error'}
        </div>
      ) : null}

      <section className={CARD}>
        <h2 className="mb-2 text-lg font-semibold">Mis datos (Proveedor)</h2>
        <p className="mb-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
          Puedes guardar la plantilla sin NIF hasta darte de alta; actualízalo
          después. Mínimo: marca/nombre + email.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={LABEL}>Nombre / marca</label>
            <input
              className={INPUT}
              value={provForm.razon_social}
              onChange={(e) =>
                setProvForm((p) => ({ ...p, razon_social: e.target.value }))
              }
              placeholder="HorecaSO — Arin Romero"
            />
          </div>
          <div>
            <label className={LABEL}>NIF (opcional)</label>
            <input
              className={INPUT}
              value={provForm.nif}
              onChange={(e) =>
                setProvForm((p) => ({ ...p, nif: e.target.value }))
              }
              placeholder="Pendiente de alta"
            />
          </div>
          <div>
            <label className={LABEL}>Email</label>
            <input
              type="email"
              className={INPUT}
              value={provForm.email}
              onChange={(e) =>
                setProvForm((p) => ({ ...p, email: e.target.value }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL}>Dirección (opcional)</label>
            <input
              className={INPUT}
              value={provForm.direccion}
              onChange={(e) =>
                setProvForm((p) => ({ ...p, direccion: e.target.value }))
              }
            />
          </div>
          <div>
            <label className={LABEL}>Canal de soporte</label>
            <input
              className={INPUT}
              value={provForm.soporte_canal}
              onChange={(e) =>
                setProvForm((p) => ({ ...p, soporte_canal: e.target.value }))
              }
              placeholder="Email / WhatsApp"
            />
          </div>
          <div>
            <label className={LABEL}>Horario soporte</label>
            <input
              className={INPUT}
              value={provForm.soporte_horario}
              onChange={(e) =>
                setProvForm((p) => ({ ...p, soporte_horario: e.target.value }))
              }
              placeholder="L–V 10:00–18:00"
            />
          </div>
        </div>
        <button
          type="button"
          className={`${BTN_PRIMARY} mt-4`}
          disabled={savingProv}
          onClick={handleSaveProveedor}
        >
          <Save size={20} strokeWidth={1.5} aria-hidden />
          {savingProv ? 'Guardando…' : 'Guardar plantilla'}
        </button>
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className={CARD}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Acuerdos</h2>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-1 rounded-lg bg-amber-500 px-3 text-sm font-semibold text-black"
              onClick={handleNuevo}
            >
              <Plus size={18} strokeWidth={1.5} aria-hidden />
              Nuevo
            </button>
          </div>
          <ul className="flex max-h-[28rem] flex-col gap-1 overflow-y-auto">
            {lista.length === 0 ? (
              <li className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Ningún borrador aún.
              </li>
            ) : (
              lista.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={[
                      'w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      selectedId === item.id
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'hover:bg-[#f0f2f5] dark:hover:bg-[#222536]',
                    ].join(' ')}
                  >
                    <span className="line-clamp-2 font-medium">
                      {item.cliente_nombre_comercial || 'Sin nombre'}
                    </span>
                    <span className="block text-xs text-[#6b7280] dark:text-[#8b90a7]">
                      {item.fecha_acuerdo || '—'} · {precioLabel(item.precio_tipo)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <section className={CARD}>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <FileText size={20} strokeWidth={1.5} className="text-amber-500" />
            {selectedId ? 'Editar acuerdo' : 'Nuevo acuerdo'}
          </h2>

          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
            Cliente (restaurante)
          </h3>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={LABEL}>Nombre comercial *</label>
              <input
                className={INPUT}
                value={form.cliente_nombre_comercial}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cliente_nombre_comercial: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className={LABEL}>Razón social</label>
              <input
                className={INPUT}
                value={form.cliente_razon_social}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cliente_razon_social: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className={LABEL}>NIF cliente</label>
              <input
                className={INPUT}
                value={form.cliente_nif}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cliente_nif: e.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Dirección</label>
              <input
                className={INPUT}
                value={form.cliente_direccion}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cliente_direccion: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className={LABEL}>Persona de contacto</label>
              <input
                className={INPUT}
                value={form.cliente_contacto}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    cliente_contacto: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className={LABEL}>Email cliente</label>
              <input
                type="email"
                className={INPUT}
                value={form.cliente_email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, cliente_email: e.target.value }))
                }
              />
            </div>
          </div>

          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
            Periodo y precio
          </h3>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label className={LABEL}>Fecha acuerdo</label>
              <input
                type="date"
                className={INPUT}
                value={form.fecha_acuerdo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fecha_acuerdo: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={LABEL}>Desde</label>
              <input
                type="date"
                className={INPUT}
                value={form.periodo_desde}
                onChange={(e) =>
                  setForm((f) => ({ ...f, periodo_desde: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={LABEL}>Hasta</label>
              <input
                type="date"
                className={INPUT}
                value={form.periodo_hasta}
                onChange={(e) =>
                  setForm((f) => ({ ...f, periodo_hasta: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={LABEL}>Precio</label>
              <select
                className={INPUT}
                value={form.precio_tipo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, precio_tipo: e.target.value }))
                }
              >
                <option value="gratuito">Gratuito</option>
                <option value="aportacion_voluntaria">
                  Aportación voluntaria (opcional)
                </option>
                <option value="simbolico">Simbólico</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            {form.precio_tipo !== 'gratuito' ? (
              <div>
                <label className={LABEL}>
                  {form.precio_tipo === 'aportacion_voluntaria'
                    ? 'Importe orientativo sugerido (€)'
                    : 'Importe (€)'}
                </label>
                <input
                  className={INPUT}
                  value={form.precio_importe}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      precio_importe: e.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
            {form.precio_tipo === 'otro' ? (
              <div>
                <label className={LABEL}>Texto precio</label>
                <input
                  className={INPUT}
                  value={form.precio_otro_texto}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      precio_otro_texto: e.target.value,
                    }))
                  }
                />
              </div>
            ) : null}
          </div>

          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
            Módulos incluidos
          </h3>
          <div className="mb-3 flex flex-wrap gap-2">
            {MODULO_OPTS.map(({ id, label }) => {
              const on = form.modulos.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleModulo(id)}
                  className={[
                    'h-10 rounded-lg border px-3 text-sm font-medium',
                    on
                      ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'border-[#e2e5ed] dark:border-[#2e3347]',
                  ].join(' ')}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <div className="mb-4">
            <label className={LABEL}>Otros módulos</label>
            <input
              className={INPUT}
              value={form.modulos_otros}
              onChange={(e) =>
                setForm((f) => ({ ...f, modulos_otros: e.target.value }))
              }
            />
          </div>

          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
            Proveedor en este PDF (editable)
          </h3>
          <div className="mb-6 grid gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Nombre / marca</label>
              <input
                className={INPUT}
                value={form.proveedor_razon_social}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    proveedor_razon_social: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className={LABEL}>NIF</label>
              <input
                className={INPUT}
                value={form.proveedor_nif}
                onChange={(e) =>
                  setForm((f) => ({ ...f, proveedor_nif: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={LABEL}>Email</label>
              <input
                className={INPUT}
                value={form.proveedor_email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, proveedor_email: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={LABEL}>Soporte</label>
              <input
                className={INPUT}
                value={form.soporte_canal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, soporte_canal: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={BTN_PRIMARY}
              disabled={saving}
              onClick={handleSaveAcuerdo}
            >
              <Save size={20} strokeWidth={1.5} aria-hidden />
              {saving ? 'Guardando…' : 'Guardar acuerdo'}
            </button>
            <button
              type="button"
              className={BTN_SECONDARY}
              disabled={pdfLoading || !selectedId}
              onClick={handlePdf}
            >
              <Download size={20} strokeWidth={1.5} aria-hidden />
              {pdfLoading ? 'Generando…' : 'Generar PDF'}
            </button>
          </div>
          {!selectedId ? (
            <p className="mt-2 text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Guarda el acuerdo la primera vez; después podrás generar el PDF.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  )
}
