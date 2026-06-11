import { Link } from 'react-router-dom'
import { Edit, FileText, Search, Trash2 } from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import { INPUT_PROVEEDOR } from '../constants'

export default function ProveedoresTable({
  buscarInput,
  setBuscarInput,
  soloActivos,
  setSoloActivos,
  loading,
  error,
  proveedores,
  puedeEscribir,
  abrirDetalle,
  setModalProveedor,
  handleDesactivar,
}) {
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
            size={18}
            strokeWidth={1.5}
          />
          <input
            type="search"
            value={buscarInput}
            onChange={(e) => setBuscarInput(e.target.value)}
            placeholder="Buscar por nombre..."
            className={`${INPUT_PROVEEDOR} pl-10`}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#111827] dark:text-[#e8eaf0]">
          <input
            type="checkbox"
            checked={soloActivos}
            onChange={(e) => setSoloActivos(e.target.checked)}
            className="h-4 w-4 rounded border-[#e2e5ed] dark:border-[#2e3347]"
          />
          Solo activos
        </label>
      </div>

      {error ? (
        <div className="mb-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Loader />
      ) : proveedores.length === 0 ? (
        <EmptyState message="No hay proveedores" />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-[#e2e5ed] bg-white shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27] md:block">
            <table className="horeca-body-text w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Nombre
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    NIF
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Email
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Condiciones pago
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Días entrega
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Estado
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {proveedores.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                  >
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => abrirDetalle(p)}
                        className="text-left font-medium text-amber-600 hover:underline dark:text-amber-400"
                      >
                        {p.nombre}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                      {p.nif || '—'}
                    </td>
                    <td className="px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                      {p.email || '—'}
                    </td>
                    <td className="px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                      {p.telefono || '—'}
                    </td>
                    <td className="max-w-[140px] truncate px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                      {p.condiciones_pago || '—'}
                    </td>
                    <td className="px-4 py-2 text-[#111827] dark:text-[#e8eaf0]">
                      {p.dias_entrega ?? '—'}
                    </td>
                    <td className="px-4 py-2">
                      {p.activo ? (
                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Activo
                        </span>
                      ) : (
                        <span className="rounded-md bg-zinc-500/10 px-2 py-0.5 text-xs font-semibold text-zinc-500">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1">
                        {puedeEscribir ? (
                          <button
                            type="button"
                            onClick={() => setModalProveedor(p)}
                            className="rounded-lg p-1.5 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
                            aria-label="Editar"
                          >
                            <Edit size={16} strokeWidth={1.5} />
                          </button>
                        ) : null}
                        <Link
                          to={`/proveedores/facturas?proveedor_id=${p.id}`}
                          className="inline-flex rounded-lg p-1.5 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
                          aria-label="Ver facturas"
                        >
                          <FileText size={16} strokeWidth={1.5} />
                        </Link>
                        {puedeEscribir && p.activo ? (
                          <button
                            type="button"
                            onClick={() => handleDesactivar(p)}
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-500/10"
                            aria-label="Desactivar"
                          >
                            <Trash2 size={16} strokeWidth={1.5} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {proveedores.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-[#e2e5ed] bg-white p-4 dark:border-[#2e3347] dark:bg-[#1a1d27]"
              >
                <button
                  type="button"
                  onClick={() => abrirDetalle(p)}
                  className="text-left text-lg font-semibold text-amber-600 dark:text-amber-400"
                >
                  {p.nombre}
                </button>
                <p className="mt-1 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  {p.nif || 'Sin NIF'} · {p.telefono || '—'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.activo ? (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                      Activo
                    </span>
                  ) : (
                    <span className="rounded-md bg-zinc-500/10 px-2 py-0.5 text-xs text-zinc-500">
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="mt-3 flex gap-2">
                  {puedeEscribir ? (
                    <button
                      type="button"
                      onClick={() => setModalProveedor(p)}
                      className="rounded-lg border border-[#e2e5ed] px-3 py-1.5 text-sm dark:border-[#2e3347]"
                    >
                      Editar
                    </button>
                  ) : null}
                  <Link
                    to={`/proveedores/facturas?proveedor_id=${p.id}`}
                    className="rounded-lg border border-[#e2e5ed] px-3 py-1.5 text-sm dark:border-[#2e3347]"
                  >
                    Facturas
                  </Link>
                  {puedeEscribir && p.activo ? (
                    <button
                      type="button"
                      onClick={() => handleDesactivar(p)}
                      className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-500"
                    >
                      Desactivar
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
