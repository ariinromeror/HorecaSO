import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers, Plus, Trash2, ChefHat, Receipt, Wallet } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import {
  getGastosOperativos,
  createGastoOperativo,
  deleteGastoOperativo,
} from '../../../services/api'

const CARD =
  'rounded-xl border border-[#e2e5ed] bg-white p-5 dark:border-[#2e3347] dark:bg-[#1a1d27]'
const INPUT =
  'w-full min-w-0 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-4 py-3 text-[15px] text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
const BTN =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 font-semibold text-black hover:bg-amber-600 disabled:opacity-40'

const CAT_OPTS = [
  { value: 'local', label: 'Local / alquiler' },
  { value: 'servicios', label: 'Luz, agua, gas, internet' },
  { value: 'personal', label: 'Personal (referencia)' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'impuestos', label: 'Impuestos / tasas' },
  { value: 'otros', label: 'Otros' },
]

function formatEur(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n) || 0)
}

export default function CostesPage() {
  const { user } = useAuth()
  const puedeEditarGastos =
    user?.rol === 'admin' || user?.rol === 'director'

  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [gastosErr, setGastosErr] = useState(null)
  const [form, setForm] = useState({
    concepto: '',
    categoria: 'otros',
    importe_mensual: '',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    setGastosErr(null)
    try {
      const rG = await getGastosOperativos().catch((e) => {
        setGastosErr(
          e.response?.data?.detail ||
            'No se pudieron cargar los gastos fijos (¿tabla instalada?).'
        )
        return { data: [] }
      })
      setGastos(Array.isArray(rG.data) ? rG.data : [])
    } catch (e) {
      setErr(e.response?.data?.detail || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const totalGastosFijos = useMemo(() => {
    return gastos.reduce((a, g) => a + (Number(g.importe_mensual) || 0), 0)
  }, [gastos])

  const handleAddGasto = async () => {
    if (!puedeEditarGastos) return
    const imp = Number(String(form.importe_mensual).replace(',', '.'))
    if (!form.concepto.trim() || Number.isNaN(imp) || imp < 0) return
    setSaving(true)
    try {
      await createGastoOperativo({
        concepto: form.concepto.trim(),
        categoria: form.categoria,
        importe_mensual: imp,
      })
      setForm({ concepto: '', categoria: 'otros', importe_mensual: '' })
      await load()
    } catch (e) {
      setGastosErr(e.response?.data?.detail || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!puedeEditarGastos) return
    if (!window.confirm('¿Eliminar este gasto?')) return
    try {
      await deleteGastoOperativo(id)
      await load()
    } catch (e) {
      setGastosErr(e.response?.data?.detail || 'Error al eliminar')
    }
  }

  return (
    <div className="min-h-full min-w-0 max-w-full overflow-x-hidden text-[#111827] dark:text-[#e8eaf0]">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Wallet
            size={32}
            strokeWidth={1.5}
            className="text-amber-500"
            aria-hidden
          />
          <div>
            <h1 className="text-2xl font-bold">Gastos operativos</h1>
            <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Gastos fijos y operativos del negocio (alquiler, suministros,
              etc.). El coste de ingredientes y recetas de carta se gestiona en{' '}
              <strong>Recetas</strong>.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <Link
            to="/admin/recetas"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] px-4 font-medium dark:border-[#2e3347]"
          >
            <ChefHat size={20} strokeWidth={1.5} />
            Recetas e ingredientes
          </Link>
          <Link
            to="/admin/recetas/elaboraciones"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] px-4 font-medium dark:border-[#2e3347]"
          >
            <Layers size={20} strokeWidth={1.5} />
            Elaboraciones
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-[#6b7280] dark:text-[#8b90a7]">Cargando…</p>
      ) : null}
      {err ? (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-600 dark:text-red-400">
          {err}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={CARD}>
          <div className="mb-3 flex items-center gap-2">
            <Receipt className="text-amber-500" size={22} strokeWidth={1.5} />
            <h2 className="text-lg font-semibold">Nóminas y personal</h2>
          </div>
          <p className="mb-3 text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Salarios y nóminas siguen en RRHH; puedes anotar una partida de
            referencia en los gastos con categoría «Personal» si lo necesitas.
          </p>
          <Link
            to="/nominas"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-[#f0f2f5] px-4 font-medium dark:bg-[#222536]"
          >
            Abrir nóminas
          </Link>
        </div>

        <div className={CARD}>
          <div className="mb-3 flex items-center gap-2">
            <ChefHat className="text-amber-500" size={22} strokeWidth={1.5} />
            <h2 className="text-lg font-semibold">Coste de carta</h2>
          </div>
          <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Materias primas, márgenes por plato y elaboraciones están en el
            módulo de recetas, no aquí.
          </p>
        </div>
      </div>

      <div className={`mt-6 ${CARD}`}>
        <h2 className="mb-2 text-lg font-semibold">Gastos fijos mensuales</h2>
        <p className="mb-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
          Alquiler, internet, seguros, marketing, etc. Son importes que declaras
          en esta lista; la suma aparece abajo. Si acabas de desplegar, ejecuta
          en Supabase el SQL{' '}
          <code className="rounded bg-[#f0f2f5] px-1 dark:bg-[#222536]">
            migration_gastos_operativos.sql
          </code>
          .
        </p>
        {gastosErr ? (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            {gastosErr}
          </div>
        ) : null}

        {puedeEditarGastos ? (
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
                Concepto
              </label>
              <input
                className={INPUT}
                value={form.concepto}
                onChange={(e) =>
                  setForm((f) => ({ ...f, concepto: e.target.value }))
                }
                placeholder="Ej. Alquiler local"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
                Categoría
              </label>
              <select
                className={INPUT}
                value={form.categoria}
                onChange={(e) =>
                  setForm((f) => ({ ...f, categoria: e.target.value }))
                }
              >
                {CAT_OPTS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[#6b7280] dark:text-[#8b90a7]">
                € / mes
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={INPUT}
                value={form.importe_mensual}
                onChange={(e) =>
                  setForm((f) => ({ ...f, importe_mensual: e.target.value }))
                }
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                disabled={saving}
                onClick={handleAddGasto}
                className={`${BTN} w-full`}
              >
                <Plus size={20} strokeWidth={1.5} />
                Añadir
              </button>
            </div>
          </div>
        ) : (
          <p className="mb-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Solo administradores pueden añadir o borrar gastos fijos.
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]">
          <table className="horeca-body-text w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#e2e5ed] bg-[#f0f2f5] dark:border-[#2e3347] dark:bg-[#222536]">
                <th className="px-3 py-2">Concepto</th>
                <th className="px-3 py-2">Categoría</th>
                <th className="px-3 py-2 text-right">€ / mes</th>
                {puedeEditarGastos ? (
                  <th className="px-3 py-2 text-right">Acciones</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {gastos.length === 0 ? (
                <tr>
                  <td
                    colSpan={puedeEditarGastos ? 4 : 3}
                    className="px-3 py-6 text-center text-[#6b7280] dark:text-[#8b90a7]"
                  >
                    No hay gastos registrados.
                  </td>
                </tr>
              ) : (
                gastos.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80"
                  >
                    <td className="px-3 py-2">{g.concepto}</td>
                    <td className="px-3 py-2 capitalize">{g.categoria}</td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatEur(g.importe_mensual)}
                    </td>
                    {puedeEditarGastos ? (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(g.id)}
                          className="inline-flex items-center gap-1 rounded-lg p-2 text-red-500 hover:bg-red-500/10"
                          title="Eliminar"
                        >
                          <Trash2 size={18} strokeWidth={1.5} />
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#e2e5ed] pt-4 dark:border-[#2e3347]">
          <span className="font-medium">Total gastos operativos declarados</span>
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {formatEur(totalGastosFijos)}
          </span>
        </div>
        <div className="mt-4 rounded-lg bg-[#f0f2f5] p-4 dark:bg-[#222536]">
          <p className="text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
            Referencia interna
          </p>
          <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8b90a7]">
            Esta pantalla no sustituye contabilidad ni incluye compras de
            inventario ni coste de recetas; úsala para tener visibilidad de
            cargas fijas mensuales.
          </p>
        </div>
      </div>
    </div>
  )
}
