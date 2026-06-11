import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  badgeDiasRestantesClass,
  formatFecha,
  INPUT_FIFO,
  SURFACE_FIFO,
  TABLE_CELL_FIFO,
  TABLE_HEAD_FIFO,
} from '../fifoConstants'

export function AlertasCaducidadPanel({
  diasAlerta,
  setDiasAlerta,
  buscarAlertas,
  errorAlertas,
  alertasBuscado,
  loadingAlertas,
  alertas,
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:max-w-[140px]">
          <label
            htmlFor="fifo-dias-alerta"
            className="mb-1 block text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]"
          >
            Días
          </label>
          <input
            id="fifo-dias-alerta"
            type="number"
            min={1}
            max={365}
            value={diasAlerta}
            onChange={(e) => setDiasAlerta(e.target.value)}
            className={INPUT_FIFO}
          />
        </div>
        <button
          type="button"
          onClick={() => buscarAlertas()}
          className="inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg bg-amber-500 px-6 text-[15px] font-semibold text-black transition-colors hover:bg-amber-600 sm:w-auto"
        >
          Buscar
        </button>
      </div>

      {errorAlertas ? (
        <p className="text-sm text-red-600 dark:text-red-400">{errorAlertas}</p>
      ) : null}

      {!alertasBuscado ? (
        <EmptyState message="Indica los días y pulsa Buscar." />
      ) : loadingAlertas ? (
        <Loader />
      ) : !alertas.length ? (
        <EmptyState message="No hay alertas en ese rango." />
      ) : (
        <>
          <div className={`${SURFACE_FIFO} hidden overflow-x-auto md:block`}>
            <table className="horeca-body-text w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>Artículo</th>
                  <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>Lote</th>
                  <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>Cantidad</th>
                  <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>Caducidad</th>
                  <th className={`${TABLE_HEAD_FIFO} px-4 py-3`}>
                    Días restantes
                  </th>
                </tr>
              </thead>
              <tbody>
                {alertas.map((row) => (
                  <tr
                    key={row.id}
                    className="text-[#111827] dark:text-[#e8eaf0]"
                  >
                    <td className={`${TABLE_CELL_FIFO} font-medium`}>
                      {row.nombre_articulo}
                    </td>
                    <td className={TABLE_CELL_FIFO}>
                      {row.numero_lote?.trim() || '—'}
                    </td>
                    <td className={TABLE_CELL_FIFO}>
                      {row.cantidad} {row.unidad_medida || ''}
                    </td>
                    <td className={TABLE_CELL_FIFO}>
                      {formatFecha(row.fecha_caducidad)}
                    </td>
                    <td className={TABLE_CELL_FIFO}>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeDiasRestantesClass(row.dias_restantes ?? 0)}`}
                      >
                        {row.dias_restantes ?? 0} d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {alertas.map((row) => (
              <div key={row.id} className={`${SURFACE_FIFO} p-4`}>
                <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                  {row.nombre_articulo}
                </p>
                <dl className="horeca-body-text mt-3 space-y-2 text-sm">
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
                      Caducidad
                    </dt>
                    <dd>{formatFecha(row.fecha_caducidad)}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[#6b7280] dark:text-[#8b90a7]">
                      Días restantes
                    </dt>
                    <dd>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeDiasRestantesClass(row.dias_restantes ?? 0)}`}
                      >
                        {row.dias_restantes ?? 0} d
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
