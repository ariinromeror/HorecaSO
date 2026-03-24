import {
  AlertTriangle,
  ChevronDown,
  Edit,
  Filter,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import {
  BTN_DANGER,
  BTN_PRIMARY,
  CARD,
  INPUT,
  labelDestinoKds,
} from '../constants'

export default function ProductosPanel({
  errorProd,
  loadingProd,
  filtroCategoriaId,
  setFiltroCategoriaId,
  searchText,
  setSearchText,
  categoriasOrdenadas,
  productosFiltrados,
  openProductoModal,
  openAlergenosModal,
  handleDeleteProducto,
  toggleProductoActivo,
}) {
  return (
    <div>
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Filter
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
              size={18}
              strokeWidth={1.5}
            />
            <select
              value={filtroCategoriaId}
              onChange={(e) => setFiltroCategoriaId(e.target.value)}
              className={`${INPUT} appearance-none pl-10 pr-10`}
            >
              <option value="">Todas las categorías</option>
              {categoriasOrdenadas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
              size={18}
              strokeWidth={1.5}
            />
          </div>
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
              size={18}
              strokeWidth={1.5}
            />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar por nombre…"
              className={`${INPUT} pl-10`}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => openProductoModal(null)}
          className={`flex h-12 shrink-0 items-center gap-2 px-6 ${BTN_PRIMARY}`}
        >
          <Plus size={20} strokeWidth={1.5} />
          Nuevo producto
        </button>
      </div>

      {errorProd ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-[15px] text-red-600 dark:text-red-400">
          <AlertTriangle size={20} strokeWidth={1.5} />
          {errorProd}
        </div>
      ) : null}

      {loadingProd ? (
        <p className="text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          Cargando productos…
        </p>
      ) : (
        <>
          {/* Móvil: cards */}
          <div className="space-y-3 md:hidden">
            {productosFiltrados.map((p) => (
              <div key={p.id} className={`${CARD} p-4 shadow-sm`}>
                <p className="text-[15px] font-semibold">{p.nombre}</p>
                <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  {p.categoria_nombre || '—'}
                </p>
                <p className="mt-2 text-[15px]">
                  {Number(p.precio).toFixed(2)} € · IVA {p.iva_porcentaje}%
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                    Activo
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.activo !== false}
                    onClick={() => toggleProductoActivo(p)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      p.activo !== false
                        ? 'bg-amber-500'
                        : 'bg-[#d1d5db] dark:bg-[#4b5563]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                        p.activo !== false ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openProductoModal(p)}
                    className="flex h-10 items-center gap-1 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] dark:border-[#2e3347] dark:bg-[#222536]"
                  >
                    <Edit size={18} strokeWidth={1.5} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => openAlergenosModal(p)}
                    className="flex h-10 items-center gap-1 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] dark:border-[#2e3347] dark:bg-[#222536]"
                  >
                    Alérgenos
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteProducto(p)}
                    className={`flex h-10 items-center gap-1 ${BTN_DANGER}`}
                  >
                    <Trash2 size={18} strokeWidth={1.5} />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Escritorio: tabla */}
          <div className={`hidden overflow-x-auto md:block ${CARD} shadow-sm`}>
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Nombre
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Categoría
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Precio
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    IVA
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    KDS
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Activo
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                  >
                    <td className="px-4 py-3 font-medium">{p.nombre}</td>
                    <td className="px-4 py-3 text-[#6b7280] dark:text-[#8b90a7]">
                      {p.categoria_nombre || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {Number(p.precio).toFixed(2)} €
                    </td>
                    <td className="px-4 py-3">{p.iva_porcentaje}%</td>
                    <td className="px-4 py-3 text-[#6b7280] dark:text-[#8b90a7]">
                      {labelDestinoKds(p.destino_kds)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={p.activo !== false}
                        onClick={() => toggleProductoActivo(p)}
                        className={`relative h-7 w-12 rounded-full transition-colors ${
                          p.activo !== false
                            ? 'bg-amber-500'
                            : 'bg-[#d1d5db] dark:bg-[#4b5563]'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                            p.activo !== false ? 'left-5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openProductoModal(p)}
                          className="flex h-10 items-center gap-1 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] dark:border-[#2e3347] dark:bg-[#222536]"
                        >
                          <Edit size={18} strokeWidth={1.5} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => openAlergenosModal(p)}
                          className="flex h-10 items-center gap-1 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] dark:border-[#2e3347] dark:bg-[#222536]"
                        >
                          Alérgenos
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProducto(p)}
                          className={`flex h-10 items-center gap-1 ${BTN_DANGER}`}
                        >
                          <Trash2 size={18} strokeWidth={1.5} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
