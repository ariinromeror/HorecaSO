import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Layers, Package, RefreshCw, Search, Trash2, X } from 'lucide-react'
import {
  UNIDADES_OPTS,
  cantidadBruta,
  costeLineaIng,
  formatEuro,
  unidadesPermitidasParaArticulo,
} from './recetasUtils'

const INPUT =
  'w-full min-w-0 max-w-full bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] rounded-lg px-4 py-3 text-[15px] text-[#111827] dark:text-[#e8eaf0] focus:outline-none focus:border-amber-500'
const BTN_PRIMARY =
  'h-12 px-6 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
const BTN_DANGER =
  'h-9 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm transition-colors'

const TIP_MERMA =
  'Pérdida de peso o volumen al limpiar o manipular el ingrediente. No es el margen de beneficio del plato.'

const TAB_BTN =
  'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors'

const MAX_LISTA = 60

function normaliza(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export default function RecetaDetalleIngredientesSection({
  recetaDetalle,
  formIngrediente,
  setFormIngrediente,
  articulos,
  onSelectArticulo,
  onReloadCoste,
  onAddIngrediente,
  onDeleteIngrediente,
  loadingAddIngrediente,
}) {
  const salidaId = recetaDetalle?.articulo_salida_id
  const articulosFiltrados = useMemo(
    () =>
      salidaId
        ? articulos.filter((a) => String(a.id) !== String(salidaId))
        : articulos,
    [articulos, salidaId]
  )

  const materias = useMemo(
    () => articulosFiltrados.filter((a) => !a.es_elaborado),
    [articulosFiltrados]
  )

  const subrecetas = useMemo(
    () => articulosFiltrados.filter((a) => a.es_elaborado),
    [articulosFiltrados]
  )

  const tieneSubrecetas = subrecetas.length > 0
  const [tab, setTab] = useState('inventario')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    setBusqueda('')
  }, [tab])

  const pool = tab === 'subrecetas' ? subrecetas : materias

  const filtrados = useMemo(() => {
    const q = normaliza(busqueda.trim())
    if (!q) return pool
    return pool.filter((a) => {
      const n = normaliza(a.nombre)
      const s = normaliza(a.sku)
      return n.includes(q) || s.includes(q)
    })
  }, [pool, busqueda])

  const listaMostrar = useMemo(
    () => filtrados.slice(0, MAX_LISTA),
    [filtrados]
  )

  const articuloSeleccionado = articulos.find(
    (a) => String(a.id) === String(formIngrediente.articulo_id)
  )
  const unidadChoices = articuloSeleccionado
    ? unidadesPermitidasParaArticulo(articuloSeleccionado.unidad_medida)
    : UNIDADES_OPTS

  const costeUnitParaLinea = (ing) =>
    ing.coste_unitario_efectivo ?? ing.coste_unitario

  const totalIng = (recetaDetalle.ingredientes || []).reduce((acc, ing) => {
    if (ing.coste_linea != null) return acc + Number(ing.coste_linea)
    const bruta =
      ing.cantidad_bruta ??
      cantidadBruta(ing.cantidad_neta, ing.porcentaje_merma)
    return acc + costeLineaIng(bruta, costeUnitParaLinea(ing))
  }, 0)

  const limpiarArticulo = () => {
    setFormIngrediente((f) => ({
      ...f,
      articulo_id: '',
    }))
  }

  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <BookOpen size={20} strokeWidth={1.5} className="text-amber-500" />
        <h3 className="text-lg font-semibold">Ingredientes y cantidades</h3>
        <button
          type="button"
          onClick={() => onReloadCoste(recetaDetalle.receta_id)}
          className="ml-auto rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
          title="Actualizar costes desde inventario"
        >
          <RefreshCw size={18} strokeWidth={1.5} />
        </button>
      </div>
      <p className="mb-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
        Materias del almacén o <strong>sub-recetas</strong> (salsas, fondos ya
        costeados). El coste de las sub-recetas viene de su propia receta.
      </p>

      <div className="mb-6 overflow-x-auto rounded-xl border border-[#e2e5ed] dark:border-[#2e3347]">
        <table className="horeca-body-text w-full min-w-[640px] text-left text-[15px]">
          <thead>
            <tr className="border-b border-[#e2e5ed] bg-[#f0f2f5] dark:border-[#2e3347] dark:bg-[#222536]">
              <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                Artículo
              </th>
              <th className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                Cantidad
              </th>
              <th
                className="px-3 py-2 font-semibold text-[#6b7280] dark:text-[#8b90a7]"
                title="Coste de esta línea según precio del artículo en inventario."
              >
                Coste línea
              </th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(recetaDetalle.ingredientes || []).map((ing) => {
              const bruta =
                ing.cantidad_bruta ??
                cantidadBruta(ing.cantidad_neta, ing.porcentaje_merma)
              const cLine =
                ing.coste_linea != null
                  ? Number(ing.coste_linea)
                  : costeLineaIng(bruta, costeUnitParaLinea(ing))
              const esSub = ing.es_subreceta === true
              return (
                <tr
                  key={ing.id}
                  className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                >
                  <td className="px-3 py-2">
                    <span className="font-medium">
                      {ing.articulo_nombre || ing.articulo_id}
                    </span>
                    {esSub ? (
                      <span
                        className="ml-2 inline-flex items-center rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-800 dark:text-sky-200"
                        title="Artículo elaborado (sub-receta): coste calculado por su receta"
                      >
                        Sub-receta
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {ing.cantidad_neta} {ing.unidad}
                  </td>
                  <td className="px-3 py-2 font-medium">{formatEuro(cLine)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onDeleteIngrediente(ing.id)}
                      className={`inline-flex items-center gap-1 ${BTN_DANGER}`}
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                      Eliminar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-[#f0f2f5] font-bold dark:bg-[#222536]">
              <td
                colSpan={2}
                className="px-3 py-3 text-[#111827] dark:text-[#e8eaf0]"
              >
                Coste total de la receta (todas las líneas)
              </td>
              <td className="px-3 py-3 text-amber-600 dark:text-amber-500">
                {formatEuro(totalIng)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mb-6 rounded-xl border border-[#e2e5ed] p-4 dark:border-[#2e3347]">
        <h4 className="mb-3 text-[15px] font-semibold">Añadir ingrediente</h4>

        {tieneSubrecetas ? (
          <div className="mb-4 flex gap-2 rounded-xl border border-[#e2e5ed] bg-[#f0f2f5] p-1 dark:border-[#2e3347] dark:bg-[#222536]">
            <button
              type="button"
              onClick={() => setTab('inventario')}
              className={`${TAB_BTN} ${
                tab === 'inventario'
                  ? 'bg-white text-[#111827] shadow-sm dark:bg-[#1a1d27] dark:text-[#e8eaf0]'
                  : 'text-[#6b7280] hover:text-[#111827] dark:text-[#8b90a7] dark:hover:text-[#e8eaf0]'
              }`}
            >
              <Package size={18} strokeWidth={1.5} />
              Ingrediente
            </button>
            <button
              type="button"
              onClick={() => setTab('subrecetas')}
              className={`${TAB_BTN} ${
                tab === 'subrecetas'
                  ? 'bg-white text-[#111827] shadow-sm dark:bg-[#1a1d27] dark:text-[#e8eaf0]'
                  : 'text-[#6b7280] hover:text-[#111827] dark:text-[#8b90a7] dark:hover:text-[#e8eaf0]'
              }`}
            >
              <Layers size={18} strokeWidth={1.5} />
              Sub-recetas ({subrecetas.length})
            </button>
          </div>
        ) : (
          <p className="mb-4 text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Solo <strong>materias del inventario</strong>. Cuando crees
            elaboraciones en{' '}
            <Link
              to="/admin/recetas/elaboraciones"
              className="font-medium text-amber-600 underline dark:text-amber-400"
            >
              Elaboraciones
            </Link>
            , podrás añadirlas aquí como ingrediente (p. ej. una salsa).
          </p>
        )}

        <div className="mb-3">
          <label className="mb-1 flex items-center gap-2 text-sm text-[#6b7280] dark:text-[#8b90a7]">
            <Search size={16} strokeWidth={1.5} />
            Buscar por nombre o SKU
          </label>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={
              tab === 'subrecetas'
                ? 'Ej. alioli, salsa…'
                : 'Ej. harina, aceite…'
            }
            className={INPUT}
            autoComplete="off"
          />
        </div>

        <div className="mb-4 max-h-52 overflow-y-auto rounded-lg border border-[#e2e5ed] dark:border-[#2e3347]">
          {listaMostrar.length === 0 ? (
            <p className="p-4 text-center text-sm text-[#6b7280] dark:text-[#8b90a7]">
              {pool.length === 0
                ? tab === 'subrecetas'
                  ? 'No hay sub-recetas en el almacén.'
                  : 'No hay artículos en inventario.'
                : 'Nada coincide con la búsqueda.'}
            </p>
          ) : (
            <ul className="divide-y divide-[#e2e5ed] dark:divide-[#2e3347]">
              {listaMostrar.map((a) => {
                const sel =
                  String(formIngrediente.articulo_id) === String(a.id)
                const precio = a.coste_unitario_efectivo ?? a.coste_unitario
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onSelectArticulo(a.id)}
                      className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                        sel
                          ? 'bg-amber-500/15 ring-1 ring-inset ring-amber-500/40'
                          : 'hover:bg-[#f0f2f5] dark:hover:bg-[#222536]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-[#111827] dark:text-[#e8eaf0]">
                          {a.nombre || '—'}
                          {a.es_elaborado ? (
                            <span className="ml-2 text-xs font-normal text-sky-600 dark:text-sky-400">
                              (sub-receta)
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 text-xs text-[#6b7280] dark:text-[#8b90a7]">
                          {a.sku ? `${a.sku} · ` : null}
                          {formatEuro(precio)}/{a.unidad_medida || 'ud'}
                        </div>
                      </div>
                      {sel ? (
                        <span className="shrink-0 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          ✓
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {filtrados.length > MAX_LISTA ? (
          <p className="mb-3 text-xs text-[#6b7280] dark:text-[#8b90a7]">
            Mostrando los primeros {MAX_LISTA} resultados. Afiná la búsqueda.
          </p>
        ) : null}

        {articuloSeleccionado ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
            <span className="text-[#111827] dark:text-[#e8eaf0]">
              <strong>Seleccionado:</strong> {articuloSeleccionado.nombre}
            </span>
            <button
              type="button"
              onClick={limpiarArticulo}
              className="inline-flex items-center gap-1 rounded-md border border-[#e2e5ed] px-2 py-1 text-xs font-medium dark:border-[#2e3347]"
            >
              <X size={14} strokeWidth={1.5} />
              Quitar
            </button>
          </div>
        ) : null}

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Cantidad
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formIngrediente.cantidad_neta}
              onChange={(e) =>
                setFormIngrediente((f) => ({
                  ...f,
                  cantidad_neta: e.target.value,
                }))
              }
              className={INPUT}
            />
          </div>
          <div className="min-w-0 sm:col-span-2">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Unidad usada
            </label>
            <div className={`${INPUT} flex items-center justify-between`}>
              <span>
                {formIngrediente.articulo_id
                  ? unitadChoicesLabel(unidadChoices, formIngrediente.unidad)
                  : 'Elegí un artículo arriba'}
              </span>
            </div>
            {articuloSeleccionado ? (
              <p className="mt-1 text-xs text-[#6b7280] dark:text-[#8b90a7]">
                En inventario este artículo va en{' '}
                <strong>{articuloSeleccionado.unidad_medida || 'ud'}</strong>: el
                coste convierte a esa unidad (p. ej. ml → L).
              </p>
            ) : null}
          </div>
          <div className="flex min-w-0 items-end sm:col-span-2">
            <button
              type="button"
              disabled={loadingAddIngrediente || !formIngrediente.articulo_id}
              onClick={onAddIngrediente}
              className={`w-full ${BTN_PRIMARY}`}
            >
              Añadir a la receta
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function unitadChoicesLabel(unidadChoices, unidadActual) {
  const u = String(unidadActual || '').toLowerCase()
  if (unidadChoices.includes(u)) return u
  return unidadChoices[0] || 'kg'
}
