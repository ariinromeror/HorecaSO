import EmptyState from '../../../components/shared/EmptyState'
import Loader from '../../../components/shared/Loader'
import {
  BTN_PRIMARY,
  CARD_BASE,
  cantidadMovDisplay,
  formatEuro,
  INPUT,
  tipoMovBadgeClass,
  TIPOS_MOV_FILTRO,
} from '../constants'

export default function MovimientosTable({
  filtroMovArticulo,
  setFiltroMovArticulo,
  filtroMovTipo,
  setFiltroMovTipo,
  filtroMovDesde,
  setFiltroMovDesde,
  filtroMovHasta,
  setFiltroMovHasta,
  aplicarFiltrosMovimientos,
  articulosOpciones,
  loadingMovimientos,
  movimientosEnriquecidos,
}) {
  return (
    <section className="space-y-4">
      <div
        className={`grid min-w-0 max-w-full gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 ${CARD_BASE}`}
      >
        <select
          value={filtroMovArticulo}
          onChange={(e) => setFiltroMovArticulo(e.target.value)}
          className={INPUT}
        >
          <option value="">Todos los artículos</option>
          {articulosOpciones.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroMovTipo}
          onChange={(e) => setFiltroMovTipo(e.target.value)}
          className={INPUT}
        >
          {TIPOS_MOV_FILTRO.map((t) => (
            <option key={t.value || 'all'} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filtroMovDesde}
          onChange={(e) => setFiltroMovDesde(e.target.value)}
          className={INPUT}
        />
        <input
          type="date"
          value={filtroMovHasta}
          onChange={(e) => setFiltroMovHasta(e.target.value)}
          className={INPUT}
        />
        <button
          type="button"
          onClick={aplicarFiltrosMovimientos}
          className={`${BTN_PRIMARY} w-full sm:col-span-2 lg:col-span-1`}
        >
          Filtrar
        </button>
      </div>

      {loadingMovimientos ? (
        <Loader />
      ) : movimientosEnriquecidos.length === 0 ? (
        <EmptyState message="No hay movimientos." />
      ) : (
        <>
          <div className={`hidden overflow-x-auto md:block ${CARD_BASE}`}>
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e2e5ed] dark:border-[#2e3347] text-[#6b7280] dark:text-[#9ca3af]">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Artículo</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Cantidad</th>
                  <th className="px-4 py-3 font-medium">Coste/u</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {movimientosEnriquecidos.map((m) => {
                  const q = cantidadMovDisplay(m)
                  const fecha = m.created_at
                    ? new Date(m.created_at).toLocaleString('es-ES', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : '—'
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80"
                    >
                      <td className="px-4 py-3 text-[#6b7280] dark:text-[#9ca3af]">
                        {fecha}
                      </td>
                      <td className="px-4 py-3 font-medium text-[#111827] dark:text-[#e8eaf0]">
                        {m.articulo_nombre}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize ${tipoMovBadgeClass(
                            m.tipo
                          )}`}
                        >
                          {m.tipo}
                        </span>
                      </td>
                      <td className={`px-4 py-3 ${q.className}`}>
                        {q.text}
                      </td>
                      <td className="px-4 py-3">
                        {formatEuro(m.coste_unitario)}
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-[#6b7280] dark:text-[#9ca3af]">
                        {m.motivo || '—'}
                      </td>
                      <td className="px-4 py-3 text-[#6b7280] dark:text-[#9ca3af]">
                        {m.usuario_nombre || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {movimientosEnriquecidos.map((m) => {
              const q = cantidadMovDisplay(m)
              const fecha = m.created_at
                ? new Date(m.created_at).toLocaleString('es-ES', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : '—'
              return (
                <div key={m.id} className={`p-4 ${CARD_BASE}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                        {m.articulo_nombre}
                      </p>
                      <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                        {fecha}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${tipoMovBadgeClass(
                        m.tipo
                      )}`}
                    >
                      {m.tipo}
                    </span>
                  </div>
                  <p className={`mt-2 text-sm ${q.className}`}>{q.text}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                        Coste/u
                      </dt>
                      <dd>{formatEuro(m.coste_unitario)}</dd>
                    </div>
                    <div>
                      <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                        Usuario
                      </dt>
                      <dd>{m.usuario_nombre || '—'}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                        Motivo
                      </dt>
                      <dd>{m.motivo || '—'}</dd>
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
