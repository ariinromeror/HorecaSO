import { useCallback, useMemo, useState } from 'react'
import { Calculator, Loader2, X } from 'lucide-react'
import { putArticuloCalibracionMerma } from '../../../services/api'

const INPUT =
  'w-full min-w-0 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2 text-[15px] text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const BTN_PRIMARY =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 font-semibold text-black hover:bg-amber-600 disabled:opacity-40'

function formatEur(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n) || 0)
}

export default function CalibracionMermaPanel({
  articulos,
  loadingArticulos,
  canEdit,
  loadArticulos,
  loadArticulosOpciones,
  onFeedback,
}) {
  const [buscar, setBuscar] = useState('')
  const [modal, setModal] = useState(null)
  const [comprado, setComprado] = useState('')
  const [util, setUtil] = useState('')
  const [saving, setSaving] = useState(false)

  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    if (!q) return articulos
    return articulos.filter(
      (a) =>
        (a.nombre && a.nombre.toLowerCase().includes(q)) ||
        (a.sku && String(a.sku).toLowerCase().includes(q))
    )
  }, [articulos, buscar])

  const abrir = (a) => {
    setModal(a)
    setComprado(
      a.calibracion_comprado != null ? String(a.calibracion_comprado) : ''
    )
    setUtil(a.calibracion_util != null ? String(a.calibracion_util) : '')
  }

  const cerrar = () => {
    setModal(null)
    setComprado('')
    setUtil('')
  }

  const preview = useMemo(() => {
    const c = Number(String(comprado).replace(',', '.'))
    const u = Number(String(util).replace(',', '.'))
    const precio = Number(modal?.coste_unitario) || 0
    if (!modal || Number.isNaN(c) || Number.isNaN(u) || c <= 0 || u <= 0) {
      return null
    }
    if (u > c) return { error: 'Lo útil no puede superar lo comprado.' }
    const mermaPct = ((c - u) / c) * 100
    const efectivo = precio * (c / u)
    return { mermaPct, efectivo, totalLote: precio * c }
  }, [modal, comprado, util])

  const guardar = useCallback(async () => {
    if (!modal || !canEdit) return
    const c = Number(String(comprado).replace(',', '.'))
    const u = Number(String(util).replace(',', '.'))
    if (Number.isNaN(c) || Number.isNaN(u) || c <= 0 || u <= 0) {
      onFeedback('Indica cantidad comprada y cantidad útil (mayores que cero).', 'err')
      return
    }
    if (u > c) {
      onFeedback('La cantidad útil no puede superar la comprada.', 'err')
      return
    }
    setSaving(true)
    try {
      await putArticuloCalibracionMerma(modal.id, { comprado: c, util: u })
      onFeedback('Calibración guardada. Las recetas usarán el coste efectivo.', 'ok')
      cerrar()
      await loadArticulos()
      if (loadArticulosOpciones) await loadArticulosOpciones()
    } catch (e) {
      onFeedback(
        e.response?.data?.detail || 'No se pudo guardar',
        'err'
      )
    } finally {
      setSaving(false)
    }
  }, [modal, canEdit, comprado, util, loadArticulos, loadArticulosOpciones, onFeedback])

  const quitar = useCallback(async () => {
    if (!modal || !canEdit) return
    setSaving(true)
    try {
      await putArticuloCalibracionMerma(modal.id, { comprado: null, util: null })
      onFeedback('Calibración eliminada.', 'ok')
      cerrar()
      await loadArticulos()
      if (loadArticulosOpciones) await loadArticulosOpciones()
    } catch (e) {
      onFeedback(
        e.response?.data?.detail || 'No se pudo eliminar',
        'err'
      )
    } finally {
      setSaving(false)
    }
  }, [modal, canEdit, loadArticulos, loadArticulosOpciones, onFeedback])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="mb-3 flex flex-wrap items-start gap-3">
          <Calculator
            className="mt-0.5 h-8 w-8 shrink-0 text-amber-500"
            strokeWidth={1.5}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Calibración útil (regla de tres)
            </h2>
            <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Indica cuánto compraste y cuánto te queda usable tras limpiar o
              manipular (misma unidad: kg con kg, g con g). El sistema calcula el
              porcentaje de merma y el <strong>coste por unidad útil</strong> que
              usarán las <strong>recetas</strong> (no hace falta saber de
              porcentajes).
            </p>
          </div>
        </div>
        <label className="mb-2 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
          Buscar artículo
        </label>
        <input
          className={INPUT}
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Ej. cebolla, queso…"
          autoComplete="off"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#e2e5ed] dark:border-[#2e3347]">
        <table className="horeca-body-text w-full min-w-[720px] text-left text-[15px]">
          <thead>
            <tr className="border-b border-[#e2e5ed] bg-[#f0f2f5] dark:border-[#2e3347] dark:bg-[#222536]">
              <th className="px-3 py-2 font-semibold">Artículo</th>
              <th className="px-3 py-2 font-semibold">Unidad</th>
              <th className="px-3 py-2 font-semibold">€ factura / ud</th>
              <th className="px-3 py-2 font-semibold">Comprado</th>
              <th className="px-3 py-2 font-semibold">Útil</th>
              <th className="px-3 py-2 font-semibold">% merma</th>
              <th className="px-3 py-2 font-semibold">€ / ud efectivo</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loadingArticulos ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-[#6b7280]">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-500" />
                </td>
              </tr>
            ) : filtrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-[#6b7280]">
                  No hay artículos que coincidan.
                </td>
              </tr>
            ) : (
              filtrados.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                >
                  <td className="px-3 py-2 font-medium">{a.nombre}</td>
                  <td className="px-3 py-2">{a.unidad_medida || '—'}</td>
                  <td className="px-3 py-2">{formatEur(a.coste_unitario)}</td>
                  <td className="px-3 py-2">
                    {a.calibracion_comprado != null ? a.calibracion_comprado : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {a.calibracion_util != null ? a.calibracion_util : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {a.merma_calibracion_porcentaje != null
                      ? `${a.merma_calibracion_porcentaje.toFixed(2)} %`
                      : '—'}
                  </td>
                  <td className="px-3 py-2 font-medium text-amber-600 dark:text-amber-400">
                    {formatEur(a.coste_unitario_efectivo)}
                  </td>
                  <td className="px-3 py-2">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => abrir(a)}
                        className="rounded-lg border border-[#e2e5ed] px-3 py-1.5 text-sm font-medium dark:border-[#2e3347]"
                      >
                        Editar
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calib-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e2e5ed] bg-white p-5 shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3
                id="calib-modal-title"
                className="text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]"
              >
                {modal.nombre}
              </h3>
              <button
                type="button"
                onClick={cerrar}
                className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Precio en factura (inventario):{' '}
              <strong>{formatEur(modal.coste_unitario)}</strong> por{' '}
              {modal.unidad_medida || 'ud'}. Las cantidades deben estar en la
              misma unidad (ej. todo en kg o todo en g).
            </p>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-[#6b7280]">
                  ¿Cuánto compraste?
                </label>
                <input
                  className={INPUT}
                  value={comprado}
                  onChange={(e) => setComprado(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ej. 2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6b7280]">
                  ¿Cuánto te quedó útil?
                </label>
                <input
                  className={INPUT}
                  value={util}
                  onChange={(e) => setUtil(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ej. 1.75"
                />
              </div>
            </div>
            {preview?.error ? (
              <p className="mb-3 text-sm text-red-600">{preview.error}</p>
            ) : preview ? (
              <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-[#111827] dark:text-[#e8eaf0]">
                <p>
                  <strong>Porcentaje de merma:</strong>{' '}
                  {preview.mermaPct.toFixed(2)} % (sobre lo comprado)
                </p>
                <p className="mt-2">
                  <strong>Coste efectivo por {modal.unidad_medida || 'ud'} útil:</strong>{' '}
                  {formatEur(preview.efectivo)}
                </p>
                <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8b90a7]">
                  Regla de tres: (precio factura × comprado) ÷ útil = coste por
                  unidad que realmente usas en cocina.
                </p>
              </div>
            ) : (
              <p className="mb-4 text-sm text-[#6b7280]">
                Rellena ambas cantidades para ver el cálculo.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving || !canEdit}
                onClick={guardar}
                className={BTN_PRIMARY}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar
              </button>
              {modal.calibracion_comprado != null && modal.calibracion_util != null ? (
                <button
                  type="button"
                  disabled={saving || !canEdit}
                  onClick={quitar}
                  className="inline-flex h-10 items-center rounded-lg border border-red-500/30 px-4 text-sm font-medium text-red-600 dark:text-red-400"
                >
                  Quitar calibración
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
