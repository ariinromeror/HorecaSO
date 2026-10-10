import { useState } from 'react'
import { MessageSquare, Minus, ShoppingCart, X } from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import { formatEuro } from '../constants'

function badgeDestino(g) {
  if (g.destino_kds === 'cocina' || g.enviado_cocina) {
    return {
      label: `Cocina · ${g.estado_cocina || 'pendiente'}`,
      className:
        'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    }
  }
  if (g.destino_kds === 'barra' || g.enviado_barra) {
    return {
      label: `Barra · ${g.estado_barra || 'pendiente'}`,
      className:
        'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
    }
  }
  return null
}

export default function LineasTicket({
  lineas,
  lineasAgrupadas,
  productoNombrePorId,
  actionLoading,
  handleRestarUnidadGrupo,
  handlePatchNotaLinea,
}) {
  const [notaModal, setNotaModal] = useState(null)
  const [notaDraft, setNotaDraft] = useState('')
  const [savingNota, setSavingNota] = useState(false)

  const openNota = (g) => {
    const lineaId = g.linea_ids?.[0]
    if (!lineaId || !handlePatchNotaLinea) return
    setNotaDraft(g.nota || '')
    setNotaModal({
      lineaId,
      producto_id: g.producto_id,
      nombre:
        productoNombrePorId.get(String(g.producto_id)) || g.producto_id,
    })
  }

  const saveNota = async () => {
    if (!notaModal) return
    setSavingNota(true)
    try {
      await handlePatchNotaLinea(notaModal.lineaId, notaDraft)
      setNotaModal(null)
    } finally {
      setSavingNota(false)
    }
  }

  return (
    <div className="shrink-0">
      {lineas.length === 0 ? (
        <EmptyState Icon={ShoppingCart} message="Sin productos aún" />
      ) : (
        lineasAgrupadas.map((g) => {
          const nombre =
            productoNombrePorId.get(String(g.producto_id)) || g.producto_id
          const busy = !!actionLoading[`grp-${String(g.producto_id)}`]
          const badge = badgeDestino(g)
          const groupKey = `${g.producto_id}-${g.nota || ''}-${g.linea_ids?.[0] || ''}`
          return (
            <div
              key={groupKey}
              className="flex items-center gap-2 border-b border-[#e2e5ed] px-4 py-3 dark:border-[#2e3347]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-tight text-[#111827] dark:text-[#e8eaf0]">
                  {nombre} x{g.cantidad} — {formatEuro(g.subtotal)}
                </p>
                {g.nota ? (
                  <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                    Nota: {g.nota}
                  </p>
                ) : null}
                {badge ? (
                  <span
                    className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                ) : null}
              </div>
              {handlePatchNotaLinea ? (
                <button
                  type="button"
                  onClick={() => openNota(g)}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#f0f2f5] text-[#6b7280] hover:text-amber-500 dark:bg-[#222536] dark:text-[#8b90a7]"
                  aria-label="Añadir nota para cocina"
                  title="Nota (imprimir en comanda)"
                >
                  <MessageSquare size={18} strokeWidth={1.5} />
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => handleRestarUnidadGrupo(g.producto_id)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500 active:bg-red-500/20 hover:bg-red-500/20 disabled:opacity-40"
                aria-label="Quitar una unidad"
              >
                <Minus size={18} strokeWidth={1.5} />
              </button>
            </div>
          )
        })
      )}

      {notaModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-[#e2e5ed] bg-white p-5 shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
                  Nota para cocina/barra
                </h3>
                <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  {notaModal.nombre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotaModal(null)}
                className="rounded-lg p-1 text-[#6b7280]"
                aria-label="Cerrar"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>
            <textarea
              value={notaDraft}
              onChange={(e) => setNotaDraft(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ej. sin azúcar, con sacarina"
              className="w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-3 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]"
            />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={savingNota}
                onClick={() => setNotaModal(null)}
                className="h-12 rounded-lg border border-[#e2e5ed] px-4 dark:border-[#2e3347]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingNota}
                onClick={saveNota}
                className="h-12 rounded-lg bg-amber-500 px-6 font-semibold text-black disabled:opacity-40"
              >
                {savingNota ? 'Guardando…' : 'Guardar nota'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
