import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  caducidadLotesClass,
  diasHastaCaducidad,
  emptyConsumir,
  emptyNuevoLote,
  formatEuroFromStrings,
  formatFecha,
  INPUT_FIFO,
  SURFACE_FIFO,
  TABLE_CELL_FIFO,
  TABLE_HEAD_FIFO,
} from '../fifoConstants'

export function LotesTabPanel({
  filtroArticuloId,
  setFiltroArticuloId,
  soloActivos,
  setSoloActivos,
  loadingArticulos,
  articulos,
  setFormNuevo,
  setModalNuevoErr,
  setModalNuevo,
  setFormConsumir,
  setModalConsumirErr,
  setModalConsumir,
  errorLotes,
  loadingLotes,
  lotes,
  articuloLabel,
}) {
  return (
    <section className="space-y-4">
      <div className="flex min-w-0 max-w-full flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="grid w-full min-w-0 max-w-full gap-3 sm:grid-cols-2 lg:max-w-2xl lg:flex-1">
          <div>
            <label
              htmlFor="fifo-articulo"
              className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
            >
              Artículo
            </label>
            <select
              id="fifo-articulo"
              value={filtroArticuloId}
              onChange={(e) => setFiltroArticuloId(e.target.value)}
              className={SELECT_FIFO}
              disabled={loadingArticulos}
            >
              <option value="">Todos</option>
              {articulos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <span className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
              Solo activos
            </span>
            <button
              type="button"
              onClick={() => setSoloActivos((v) => !v)}
              aria-pressed={soloActivos}
              className={`inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg border px-4 text-[15px] font-semibold transition-colors ${
                soloActivos
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-[#e2e5ed] bg-white text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0]'
              }`}
            >
              {soloActivos ? 'Sí' : 'No'}
            </button>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end lg:w-auto">
          <button
            type="button"
            onClick={() => {
              setFormNuevo(emptyNuevoLote())
              setModalNuevoErr(null)
              setModalNuevo(true)
            }}
            className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black transition-colors hover:bg-amber-600 sm:w-auto"
          >
            Nuevo lote
          </button>
          <button
            type="button"
            onClick={() => {
              setFormConsumir(emptyConsumir())
              setModalConsumirErr(null)
              setModalConsumir(true)
            }}
            className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg bg-red-600 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-red-700 sm:w-auto"
          >
            Consumir
          </button>
        </div>
      </div>

      {errorLotes ? (
        <p className="text-sm text-red-600 dark:text-red-400">{errorLotes}</p>
      ) : null}

      {loadingLotes && !lotes.length ? (
        <Loader />
      ) : !lotes.length ? (
        <EmptyState message="No hay lotes con los filtros actuales." />
      ) : (
        <>
          <div className={`${SURFACE_FIFO} hidden overflow-x-auto md:block`}>
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr>
                  <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>Artículo</th>
                  <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>Lote</th>
                  <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>Cantidad</th>
                  <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>Coste unit.</th>
                  <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>Valor</th>
                  <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>Caducidad</th>
                  <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>Fecha entrada</th>
                </tr>
              </thead>
              <tbody>
                {lotes.map((row) => {
                  const dCad = diasHastaCaducidad(row.fecha_caducidad)
                  return (
                    <tr
                      key={row.id}
                      className="text-[#111827] dark:text-[#e8eaf0]"
                    >
                      <td className={`${TABLE_CELL_FIFO} font-medium`}>
                        {row.nombre_articulo || articuloLabel(row.articulo_id)}
                      </td>
                      <td className={TABLE_CELL_FIFO}>
                        {row.numero_lote?.trim() || '—'}
                      </td>
                      <td className={TABLE_CELL_FIFO}>
                        {row.cantidad}{' '}
                        <span className="text-[#6b7280] dark:text-[#8b90a7]">
                          {row.unidad_medida || ''}
                        </span>
                      </td>
                      <td className={TABLE_CELL_FIFO}>
                        {Number(row.coste_unitario).toFixed(2)} €
                      </td>
                      <td className={TABLE_CELL_FIFO}>
                        {formatEuroFromStrings(row.cantidad, row.coste_unitario)}
                      </td>
                      <td className={TABLE_CELL_FIFO}>
                        <span className={caducidadLotesClass(dCad)}>
                          {row.fecha_caducidad
                            ? formatFecha(row.fecha_caducidad)
                            : '—'}
                        </span>
                      </td>
                      <td className={`${TABLE_CELL_FIFO} text-[#6b7280] dark:text-[#8b90a7]`}>
                        {formatFecha(row.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {lotes.map((row) => {
              const dCad = diasHastaCaducidad(row.fecha_caducidad)
              return (
                <div key={row.id} className={`${SURFACE_FIFO} p-4`}>
                  <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                    {row.nombre_articulo || articuloLabel(row.articulo_id)}
                  </p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                        Lote
                      </dt>
                      <dd>{row.numero_lote?.trim() || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                        Cantidad
                      </dt>
                      <dd>
                        {row.cantidad} {row.unidad_medida || ''}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                        Coste unit.
                      </dt>
                      <dd>{Number(row.coste_unitario).toFixed(2)} €</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                        Valor
                      </dt>
                      <dd>
                        {formatEuroFromStrings(row.cantidad, row.coste_unitario)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                        Caducidad
                      </dt>
                      <dd className={caducidadLotesClass(dCad)}>
                        {row.fecha_caducidad
                          ? formatFecha(row.fecha_caducidad)
                          : '—'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                        Fecha entrada
                      </dt>
                      <dd className="text-[#6b7280] dark:text-[#8b90a7]">
                        {formatFecha(row.created_at)}
                      </dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
