import {
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardList,
  Edit,
  Filter,
  Plus,
  Search,
  Thermometer,
} from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  BTN_DANGER,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD_BASE,
  CATEGORIAS_ALMACEN,
  formatEuro,
  formatStock,
  ICON_PROPS,
  INPUT,
  tempBadgeClass,
} from '../constants'

export default function ArticulosTable({
  buscar,
  setBuscar,
  categoriaFiltro,
  setCategoriaFiltro,
  soloAlertas,
  setSoloAlertas,
  canEditArticulo,
  canMovimiento,
  loadingArticulos,
  articulos,
  openNuevoArticulo,
  openInventarioFisico,
  openEditarArticulo,
  openMovimiento,
}) {
  return (
    <section className="space-y-4">
      <div
        className={`flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-center ${CARD_BASE}`}
      >
        <div className="relative min-w-[200px] flex-1">
          <Search
            {...ICON_PROPS}
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#9ca3af]"
          />
          <input
            type="search"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar artículo..."
            className={`${INPUT} pl-11`}
          />
        </div>
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className={`${INPUT} w-full shrink-0 md:max-w-[200px]`}
        >
          {CATEGORIAS_ALMACEN.map((c) => (
            <option key={c.value || 'all'} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSoloAlertas((s) => !s)}
          className={`${BTN_SECONDARY} ${soloAlertas ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400' : ''}`}
        >
          <Filter {...ICON_PROPS} className="h-4 w-4" />
          Solo alertas
        </button>
        {canEditArticulo ? (
          <>
            <button
              type="button"
              onClick={openNuevoArticulo}
              className={BTN_PRIMARY}
            >
              <Plus {...ICON_PROPS} className="h-5 w-5" />
              Nuevo artículo
            </button>
            <button
              type="button"
              onClick={openInventarioFisico}
              className={BTN_SECONDARY}
            >
              <ClipboardList {...ICON_PROPS} className="h-4 w-4" />
              Inventario físico
            </button>
          </>
        ) : null}
      </div>

      {loadingArticulos ? (
        <Loader />
      ) : articulos.length === 0 ? (
        <EmptyState message="No hay artículos con estos filtros." />
      ) : (
        <>
          <div className={`hidden overflow-x-auto md:block ${CARD_BASE}`}>
            <table className="horeca-body-text w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347] text-[#6b7280] dark:text-[#9ca3af]">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Unidad</th>
                  <th className="px-4 py-3 font-medium">Stock actual</th>
                  <th className="px-4 py-3 font-medium">Mín</th>
                  <th className="px-4 py-3 font-medium">Coste/u</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Thermometer
                        {...ICON_PROPS}
                        className="h-4 w-4"
                      />
                      Temp
                    </span>
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {articulos.map((a) => (
                  <tr
                    key={a.id}
                    className={`border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80 ${
                      a.alerta_stock
                        ? 'bg-red-500/5'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-[#111827] dark:text-[#e8eaf0]">
                      {a.nombre}
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] dark:text-[#9ca3af]">
                      {a.sku || '—'}
                    </td>
                    <td className="px-4 py-3">{a.unidad_medida}</td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        a.alerta_stock
                          ? 'text-red-500'
                          : 'text-[#111827] dark:text-[#e8eaf0]'
                      }`}
                    >
                      {formatStock(a.stock_actual, a.unidad_medida)}
                    </td>
                    <td className="px-4 py-3">
                      {formatStock(a.stock_minimo, a.unidad_medida)}
                    </td>
                    <td className="px-4 py-3">{formatEuro(a.coste_unitario)}</td>
                    <td className="px-4 py-3 capitalize">
                      {a.categoria_almacen || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize ${tempBadgeClass(
                          a.temperatura_almacen || 'ambiente'
                        )}`}
                      >
                        {a.temperatura_almacen || 'ambiente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {canEditArticulo ? (
                          <button
                            type="button"
                            onClick={() => openEditarArticulo(a)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                          >
                            <Edit {...ICON_PROPS} className="h-3.5 w-3.5" />
                            Editar
                          </button>
                        ) : null}
                        {canMovimiento ? (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                openMovimiento(a, 'entrada')
                              }
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                            >
                              <ArrowDownCircle
                                {...ICON_PROPS}
                                className="h-3.5 w-3.5"
                              />
                              Entrada
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                openMovimiento(a, 'salida')
                              }
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10"
                            >
                              <ArrowUpCircle
                                {...ICON_PROPS}
                                className="h-3.5 w-3.5"
                              />
                              Salida
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {articulos.map((a) => (
              <div
                key={a.id}
                className={`p-4 ${CARD_BASE} ${
                  a.alerta_stock ? 'ring-1 ring-red-500/30' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                      {a.nombre}
                    </p>
                    <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                      SKU: {a.sku || '—'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${tempBadgeClass(
                      a.temperatura_almacen || 'ambiente'
                    )}`}
                  >
                    {a.temperatura_almacen || 'ambiente'}
                  </span>
                </div>
                <dl className="horeca-body-text mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                      Stock
                    </dt>
                    <dd
                      className={
                        a.alerta_stock
                          ? 'font-semibold text-red-500'
                          : 'font-medium text-[#111827] dark:text-[#e8eaf0]'
                      }
                    >
                      {formatStock(a.stock_actual, a.unidad_medida)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                      Mínimo
                    </dt>
                    <dd className="font-medium">
                      {formatStock(a.stock_minimo, a.unidad_medida)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                      Coste/u
                    </dt>
                    <dd>{formatEuro(a.coste_unitario)}</dd>
                  </div>
                  <div>
                    <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                      Categoría
                    </dt>
                    <dd className="capitalize">
                      {a.categoria_almacen || '—'}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e2e5ed] dark:border-[#2e3347] pt-3">
                  {canEditArticulo ? (
                    <button
                      type="button"
                      onClick={() => openEditarArticulo(a)}
                      className={BTN_SECONDARY}
                    >
                      <Edit {...ICON_PROPS} className="h-4 w-4" />
                      Editar
                    </button>
                  ) : null}
                  {canMovimiento ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openMovimiento(a, 'entrada')}
                        className={`${BTN_SECONDARY} text-emerald-600 dark:text-emerald-400`}
                      >
                        <ArrowDownCircle
                          {...ICON_PROPS}
                          className="h-4 w-4"
                        />
                        Entrada
                      </button>
                      <button
                        type="button"
                        onClick={() => openMovimiento(a, 'salida')}
                        className={BTN_DANGER}
                      >
                        <ArrowUpCircle
                          {...ICON_PROPS}
                          className="h-4 w-4"
                        />
                        Salida
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
