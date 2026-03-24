import { Euro, Package } from 'lucide-react'
import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import StatCard from '../../../components/shared/StatCard'
import { SURFACE_FIFO, TABLE_CELL_FIFO, TABLE_HEAD_FIFO } from '../fifoConstants'

export default function ValoracionPanel({
  errorValoracion,
  loadingValoracion,
  valoracion,
  totalValoracionTabla,
}) {
  return (
    <section className="space-y-4">
      {errorValoracion ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          {errorValoracion}
        </p>
      ) : null}

      {loadingValoracion && !valoracion ? (
        <Loader />
      ) : valoracion ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2 [&>div]:p-8 [&>div>p]:!text-4xl md:[&>div>p]:!text-5xl">
              <StatCard
                label="Valor total almacén"
                value={`${Number(valoracion.valor_total_almacen).toFixed(2)} €`}
                Icon={Euro}
                color="amber"
              />
            </div>
            <StatCard
              label="Nº artículos con stock"
              value={String(valoracion.num_articulos ?? 0)}
              Icon={Package}
              color="white"
            />
          </div>

          {!valoracion.articulos?.length ? (
            <EmptyState message="Sin líneas de valoración." />
          ) : (
            <>
              <div className={`${SURFACE_FIFO} hidden overflow-x-auto md:block`}>
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr>
                      <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>
                        Artículo
                      </th>
                      <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>SKU</th>
                      <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>
                        Stock total
                      </th>
                      <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>
                        Coste medio
                      </th>
                      <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>
                        Valor total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {valoracion.articulos.map((row) => (
                      <tr
                        key={row.articulo_id}
                        className="text-[#111827] dark:text-[#e8eaf0]"
                      >
                        <td className={`${TABLE_CELL_FIFO} font-medium`}>
                          {row.nombre}
                        </td>
                        <td className={TABLE_CELL_FIFO}>{row.sku || '—'}</td>
                        <td className={TABLE_CELL_FIFO}>
                          {row.stock_total}{' '}
                          <span className="text-[#6b7280] dark:text-[#8b90a7]">
                            {row.unidad_medida || ''}
                          </span>
                        </td>
                        <td className={TABLE_CELL_FIFO}>
                          {Number(row.coste_medio).toFixed(2)} €
                        </td>
                        <td className={TABLE_CELL_FIFO}>
                          {Number(row.valor_total).toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#f0f2f5] font-bold text-[#111827] dark:bg-[#222536] dark:text-[#e8eaf0]">
                      <td className={TABLE_CELL_FIFO} colSpan={4}>
                        Total
                      </td>
                      <td className={TABLE_CELL_FIFO}>
                        {totalValoracionTabla.toFixed(2)} €
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {valoracion.articulos.map((row) => (
                  <div
                    key={row.articulo_id}
                    className={`${SURFACE_FIFO} p-4`}
                  >
                    <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                      {row.nombre}
                    </p>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                          SKU
                        </dt>
                        <dd>{row.sku || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                          Stock total
                        </dt>
                        <dd>
                          {row.stock_total} {row.unidad_medida || ''}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                          Coste medio
                        </dt>
                        <dd>{Number(row.coste_medio).toFixed(2)} €</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                          Valor total
                        </dt>
                        <dd className="font-semibold">
                          {Number(row.valor_total).toFixed(2)} €
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
                <div
                  className={`${SURFACE_FIFO} flex items-center justify-between p-4 font-bold text-[#111827] dark:text-[#e8eaf0]`}
                >
                  <span>Total</span>
                  <span>{totalValoracionTabla.toFixed(2)} €</span>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <EmptyState message="Sin datos de valoración." />
      )}
    </section>
  )
}
