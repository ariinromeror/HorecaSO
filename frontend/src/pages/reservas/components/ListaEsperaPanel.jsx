import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  BTN_PRIMARY,
  INPUT,
  SURFACE,
  badgeListaClass,
  minutosTranscurridos,
} from '../constants'

export default function ListaEsperaPanel({
  listaTick,
  formLista,
  setFormLista,
  anadirLista,
  addingLista,
  errorLista,
  loadingLista,
  lista,
  patchingListaId,
  patchListaEstado,
}) {
  return (
    <>
      <span className="sr-only" aria-live="polite">
        {listaTick}
      </span>
      <div
        className={`${SURFACE} mb-6 p-4 dark:bg-[#1a1d27]`}
      >
        <p className="mb-3 text-sm font-semibold text-[#6b7280] dark:text-[#8b90a7]">
          Añadir a lista de espera
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="min-w-0 flex-1 lg:max-w-[200px]">
            <input
              type="text"
              placeholder="Nombre"
              value={formLista.nombre_cliente}
              onChange={(e) =>
                setFormLista((f) => ({
                  ...f,
                  nombre_cliente: e.target.value,
                }))
              }
              className={INPUT}
            />
          </div>
          <div className="min-w-0 flex-1 lg:max-w-[160px]">
            <input
              type="tel"
              placeholder="Teléfono"
              value={formLista.telefono}
              onChange={(e) =>
                setFormLista((f) => ({ ...f, telefono: e.target.value }))
              }
              className={INPUT}
            />
          </div>
          <div className="w-full sm:w-28">
            <input
              type="number"
              min={1}
              placeholder="Pers."
              value={formLista.num_personas}
              onChange={(e) =>
                setFormLista((f) => ({
                  ...f,
                  num_personas: e.target.value,
                }))
              }
              className={INPUT}
            />
          </div>
          <div className="w-full sm:w-36">
            <input
              type="number"
              min={0}
              placeholder="Min. estimados"
              value={formLista.tiempo_estimado}
              onChange={(e) =>
                setFormLista((f) => ({
                  ...f,
                  tiempo_estimado: e.target.value,
                }))
              }
              className={INPUT}
            />
          </div>
          <button
            type="button"
            onClick={anadirLista}
            disabled={addingLista}
            className={`${BTN_PRIMARY} w-full lg:w-auto`}
          >
            Añadir a lista
          </button>
        </div>
      </div>

      {errorLista ? (
        <p className="mb-4 text-red-600 dark:text-red-400">{errorLista}</p>
      ) : null}

      {loadingLista ? (
        <Loader />
      ) : lista.length === 0 ? (
        <EmptyState message="Lista de espera vacía" />
      ) : (
        <>
          <div className={`hidden md:block ${SURFACE} overflow-x-auto`}>
            <table className="horeca-body-text w-full min-w-[900px] text-left text-[15px]">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347]">
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Cliente
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Tel
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Personas
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Llegada
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Transcurrido
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#6b7280] dark:text-[#8b90a7]">
                    Espera estimada
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
                {lista.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#e2e5ed] dark:border-[#2e3347]"
                  >
                    <td className="px-4 py-3 font-medium">
                      {row.nombre_cliente}
                    </td>
                    <td className="px-4 py-3">{row.telefono}</td>
                    <td className="px-4 py-3">{row.num_personas}</td>
                    <td className="px-4 py-3 text-sm">
                      {row.hora_llegada
                        ? new Date(row.hora_llegada).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {minutosTranscurridos(row.hora_llegada)}
                    </td>
                    <td className="px-4 py-3">
                      {row.tiempo_estimado != null
                        ? `${row.tiempo_estimado} min`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeListaClass(row.estado)}`}
                      >
                        {row.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={patchingListaId === row.id}
                          onClick={() => patchListaEstado(row.id, 'avisado')}
                          className="h-12 min-h-[48px] rounded-lg bg-amber-500 px-3 text-sm font-semibold text-black hover:bg-amber-600 disabled:opacity-40"
                        >
                          Avisar
                        </button>
                        <button
                          type="button"
                          disabled={patchingListaId === row.id}
                          onClick={() => patchListaEstado(row.id, 'sentado')}
                          className="h-12 min-h-[48px] rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                        >
                          Sentar
                        </button>
                        <button
                          type="button"
                          disabled={patchingListaId === row.id}
                          onClick={() =>
                            patchListaEstado(row.id, 'cancelado')
                          }
                          className="h-12 min-h-[48px] rounded-lg bg-red-600 px-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {lista.map((row) => (
              <div key={row.id} className={`${SURFACE} p-4`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="text-lg font-bold">{row.nombre_cliente}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeListaClass(row.estado)}`}
                  >
                    {row.estado}
                  </span>
                </div>
                <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                  {row.telefono} · {row.num_personas} pers.
                </p>
                <p className="mt-1 text-sm">
                  Llegada:{' '}
                  {row.hora_llegada
                    ? new Date(row.hora_llegada).toLocaleString('es-ES')
                    : '—'}
                </p>
                <p className="text-sm text-amber-500">
                  Esperando: {minutosTranscurridos(row.hora_llegada)}
                </p>
                {row.tiempo_estimado != null ? (
                  <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
                    Estimado: {row.tiempo_estimado} min
                  </p>
                ) : null}
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={patchingListaId === row.id}
                    onClick={() => patchListaEstado(row.id, 'avisado')}
                    className={`${BTN_PRIMARY} w-full`}
                  >
                    Avisar
                  </button>
                  <button
                    type="button"
                    disabled={patchingListaId === row.id}
                    onClick={() => patchListaEstado(row.id, 'sentado')}
                    className="h-12 w-full rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                  >
                    Sentar
                  </button>
                  <button
                    type="button"
                    disabled={patchingListaId === row.id}
                    onClick={() => patchListaEstado(row.id, 'cancelado')}
                    className="h-12 w-full rounded-lg bg-red-600 font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
