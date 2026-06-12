import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BrainCircuit,
  CalendarRange,
  Euro,
  History,
  Loader2,
  PackageX,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import { getPrediccionMermas } from '../../../services/api'

function fmtEuro(n) {
  return `${new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0)}€`
}

function fmtFechaCorta(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
  })
}

function MiniBarChart({ items, valueKey, maxValue, emptyLabel }) {
  const max = maxValue > 0 ? maxValue : 0.01
  const hasData = items.some((p) => Number(p[valueKey]) > 0)

  return (
    <div>
      {!hasData && emptyLabel ? (
        <p className="mb-3 text-center text-sm text-[#6b7280] dark:text-[#8b90a7]">
          {emptyLabel}
        </p>
      ) : null}
      <div
        className="grid items-end gap-1"
        style={{
          gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {items.map((p) => {
          const val = Number(p[valueKey]) || 0
          const pct = Math.max((val / max) * 100, hasData && val > 0 ? 8 : 4)
          return (
            <div
              key={p.fecha}
              className="flex min-w-0 flex-col items-center gap-1.5"
            >
              <span className="horeca-nums hidden text-[10px] font-medium text-[#6b7280] dark:text-[#8b90a7] sm:block">
                {fmtEuro(val)}
              </span>
              <div className="flex h-24 w-full items-end sm:h-28">
                <div
                  className="w-full rounded-t-md bg-amber-500/80 transition-all dark:bg-amber-500/70"
                  style={{ height: `${pct}%` }}
                  title={`${p.fecha}: ${fmtEuro(val)}`}
                />
              </div>
              <span className="truncate text-[10px] font-medium capitalize text-[#9ca3af] dark:text-[#5a5f7a] sm:text-[11px]">
                {fmtFechaCorta(p.fecha)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PrediccionesIAPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getPrediccionMermas({ dias_horizonte: 7 })
      .then((r) => setData(r.data))
      .catch((e) =>
        setError(e.response?.data?.detail || 'No se pudo cargar la predicción')
      )
      .finally(() => setLoading(false))
  }, [])

  const maxHist = useMemo(() => {
    const hist = data?.historico_reciente ?? []
    return Math.max(...hist.map((p) => Number(p.coste) || 0), 0.01)
  }, [data])

  const maxPred = useMemo(() => {
    const preds = data?.predicciones ?? []
    return Math.max(...preds.map((p) => Number(p.coste_previsto) || 0), 0.01)
  }, [data])

  const maxTop = useMemo(() => {
    const top = data?.top_articulos_merma ?? []
    return Math.max(...top.map((a) => Number(a.coste_total) || 0), 0.01)
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#6b7280] dark:text-[#8b90a7]">
        <Loader2 size={24} strokeWidth={1.5} className="animate-spin" />
        <span className="ml-3 text-[15px]">Calculando predicciones…</span>
      </div>
    )
  }

  if (error || !data) {
    return <EmptyState message={error || 'Sin datos de predicción'} />
  }

  const tendenciaSube = Number(data.tendencia_diaria) > 0
  const TendenciaIcon = tendenciaSube ? TrendingUp : TrendingDown
  const top = data.top_articulos_merma ?? []
  const preds = data.predicciones ?? []
  const hist = data.historico_reciente ?? []
  const sinDatos = data.sin_datos_historicos || data.dias_historial_usados === 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          <BrainCircuit size={14} strokeWidth={1.5} />
          Modelo Predictivo: Tendencia lineal + Estacionalidad semanal activa
        </span>
        <span className="horeca-nums rounded-full border border-[#e2e5ed] bg-white px-3 py-1.5 text-xs font-medium text-[#6b7280] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#8b90a7]">
          {data.dias_historial_usados} días de histórico analizados
        </span>
      </div>

      {sinDatos ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <AlertCircle
            size={20}
            strokeWidth={1.5}
            className="mt-0.5 shrink-0 text-amber-500"
          />
          <div>
            <p className="text-[15px] font-medium text-[#111827] dark:text-[#e8eaf0]">
              Sin mermas registradas todavía
            </p>
            <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Registra movimientos de tipo merma en Inventario, o ejecuta en
              Supabase el script{' '}
              <code className="rounded bg-black/10 px-1 py-0.5 text-xs dark:bg-white/10">
                backend/sql/seed_predicciones_mermas_demo.sql
              </code>{' '}
              para cargar datos de demostración.
            </p>
          </div>
        </div>
      ) : null}

      {/* Histórico real — últimos 14 días */}
      <div className="rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="mb-4 flex items-center gap-2">
          <History size={18} strokeWidth={1.5} className="text-amber-500" />
          <h3 className="text-base font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Mermas reales — últimos 14 días
          </h3>
        </div>
        <MiniBarChart
          items={hist}
          valueKey="coste"
          maxValue={maxHist}
          emptyLabel={
            sinDatos
              ? 'Aún no hay mermas en este periodo.'
              : null
          }
        />
      </div>

      {/* Predicción — próximos 7 días */}
      <div className="rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
              <Euro size={16} strokeWidth={1.5} className="text-amber-500" />
              Coste Total Estimado de Mermas
            </div>
            <p className="horeca-nums text-3xl font-extrabold tracking-tight text-[#111827] sm:text-4xl dark:text-[#e8eaf0]">
              {fmtEuro(data.coste_total_previsto)}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-[#6b7280] dark:text-[#8b90a7]">
              <CalendarRange size={14} strokeWidth={1.5} />
              Próximos 7 días
            </p>
          </div>
          <div
            className={[
              'flex items-center gap-2 self-start rounded-lg border px-3 py-2 text-sm font-semibold sm:self-center',
              tendenciaSube
                ? 'border-red-500/20 bg-red-500/10 text-red-500'
                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
            ].join(' ')}
          >
            <TendenciaIcon size={18} strokeWidth={1.5} />
            <span className="horeca-nums">
              {tendenciaSube ? '+' : ''}
              {fmtEuro(data.tendencia_diaria)}/día
            </span>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-[#6b7280] dark:text-[#8b90a7]">
            Previsión día a día
          </p>
          <MiniBarChart
            items={preds}
            valueKey="coste_previsto"
            maxValue={maxPred}
            emptyLabel={
              sinDatos
                ? 'La previsión aparecerá en cuanto haya histórico de mermas.'
                : null
            }
          />
        </div>
      </div>

      {/* Top 5 artículos */}
      <div className="rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="mb-4 flex items-center gap-2">
          <PackageX size={18} strokeWidth={1.5} className="text-amber-500" />
          <h3 className="text-base font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Top 5 artículos con mayor riesgo de pérdida
          </h3>
        </div>

        {top.length === 0 ? (
          <p className="py-6 text-center text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
            Sin artículos con mermas en el periodo analizado.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {top.map((a, i) => {
              const pct = Math.max(
                (Number(a.coste_total) / maxTop) * 100,
                3
              )
              return (
                <li key={a.articulo_id} className="flex items-center gap-3">
                  <span className="horeca-nums w-5 shrink-0 text-sm font-bold text-[#9ca3af] dark:text-[#5a5f7a]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-medium text-[#111827] dark:text-[#e8eaf0]">
                        {a.nombre}
                      </span>
                      <span className="horeca-nums shrink-0 text-sm font-bold text-amber-500">
                        {fmtEuro(a.coste_total)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#f0f2f5] dark:bg-[#222536]">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <p className="horeca-nums mt-4 text-xs text-[#9ca3af] dark:text-[#5a5f7a]">
          Media diaria histórica: {fmtEuro(data.media_diaria_historica)} ·{' '}
          {data.modelo}
        </p>
      </div>
    </div>
  )
}
