import { AlertTriangle, Edit, LayoutGrid, Plus, Trash2, Users } from 'lucide-react'
import EmptyState from '../../../../components/shared/EmptyState'
import Loader from '../../../../components/shared/Loader'
import {
  BTN_DANGER,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD_BASE,
  ICON,
  estadoBadgeClass,
  estadoLabel,
  formaLabel,
  zonaBadgeClass,
} from '../constants'

export default function MesasAdminTable({
  loading,
  mesas,
  error,
  feedback,
  resumen,
  openNueva,
  openEditar,
  eliminarMesa,
  rowBusyClass,
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <LayoutGrid
              {...ICON}
              className="h-8 w-8 text-amber-500"
              aria-hidden
            />
            <h1 className="text-2xl font-bold text-[#111827] dark:text-[#f5f5f5]">
              Gestión de Sala
            </h1>
          </div>
          <p className="mt-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
            Configura las mesas de tu local
          </p>
        </div>
        <button type="button" onClick={openNueva} className={BTN_PRIMARY}>
          <Plus {...ICON} className="h-5 w-5" />
          Nueva mesa
        </button>
      </div>

      {feedback.msg ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
          role="status"
        >
          {feedback.msg}
        </div>
      ) : null}

      {error ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          <AlertTriangle {...ICON} className="h-5 w-5 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Total mesas', value: resumen.total },
          { label: 'Sala / Interior', value: resumen.interior },
          { label: 'Terraza', value: resumen.terraza },
          { label: 'Barra', value: resumen.barra },
        ].map((b) => (
          <span
            key={b.label}
            className="inline-flex items-center rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2 text-sm font-medium text-[#111827] dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]"
          >
            {b.label}:{' '}
            <span className="ml-1 tabular-nums text-amber-600 dark:text-amber-400">
              {b.value}
            </span>
          </span>
        ))}
      </div>

      {loading ? (
        <Loader />
      ) : mesas.length === 0 ? (
        <EmptyState message="No hay mesas. Crea la primera con «Nueva mesa»." />
      ) : (
        <>
          <div className={`hidden overflow-x-auto md:block ${CARD_BASE}`}>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#e2e5ed] text-[#6b7280] dark:border-[#2e3347] dark:text-[#9ca3af]">
                  <th className="px-4 py-3 font-medium">Nº</th>
                  <th className="px-4 py-3 font-medium">Capacidad</th>
                  <th className="px-4 py-3 font-medium">Zona</th>
                  <th className="px-4 py-3 font-medium">Forma</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...mesas]
                  .sort((a, b) => Number(a.numero) - Number(b.numero))
                  .map((m) => {
                    const libre = String(m.estado || '').toLowerCase() === 'libre'
                    return (
                      <tr
                        key={m.id}
                        className={`border-b border-[#e2e5ed]/80 dark:border-[#2e3347]/80 ${rowBusyClass(m)}`}
                      >
                        <td className="px-4 py-3 font-bold text-[#111827] dark:text-[#e8eaf0]">
                          {m.numero}
                        </td>
                        <td className="px-4 py-3 text-[#111827] dark:text-[#e8eaf0]">
                          <span className="inline-flex items-center gap-1">
                            <Users size={16} strokeWidth={1.5} />
                            {m.capacidad} pax
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize ${zonaBadgeClass(m.zona)}`}
                          >
                            {m.zona || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 capitalize text-[#111827] dark:text-[#e8eaf0]">
                          {formaLabel(m.forma)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${estadoBadgeClass(m.estado)}`}
                          >
                            {estadoLabel(m.estado)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditar(m)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                            >
                              <Edit {...ICON} className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarMesa(m)}
                              disabled={!libre}
                              title={
                                libre
                                  ? 'Eliminar mesa'
                                  : 'Solo se pueden eliminar mesas libres'
                              }
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10 ${
                                !libre ? 'opacity-40 cursor-not-allowed' : ''
                              }`}
                            >
                              <Trash2 {...ICON} className="h-3.5 w-3.5" />
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {[...mesas]
              .sort((a, b) => Number(a.numero) - Number(b.numero))
              .map((m) => {
                const libre = String(m.estado || '').toLowerCase() === 'libre'
                return (
                  <div
                    key={m.id}
                    className={`p-4 ${CARD_BASE} ${rowBusyClass(m)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
                        Mesa {m.numero}
                      </p>
                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${estadoBadgeClass(m.estado)}`}
                      >
                        {estadoLabel(m.estado)}
                      </span>
                    </div>
                    <dl className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                          Capacidad
                        </dt>
                        <dd className="inline-flex items-center gap-1 font-medium text-[#111827] dark:text-[#e8eaf0]">
                          <Users size={16} strokeWidth={1.5} />
                          {m.capacidad} pax
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                          Zona
                        </dt>
                        <dd>
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium capitalize ${zonaBadgeClass(m.zona)}`}
                          >
                            {m.zona || '—'}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-[#6b7280] dark:text-[#9ca3af]">
                          Forma
                        </dt>
                        <dd className="capitalize text-[#111827] dark:text-[#e8eaf0]">
                          {formaLabel(m.forma)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e2e5ed] pt-3 dark:border-[#2e3347]">
                      <button
                        type="button"
                        onClick={() => openEditar(m)}
                        className={BTN_SECONDARY}
                      >
                        <Edit {...ICON} className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => eliminarMesa(m)}
                        disabled={!libre}
                        title={
                          libre
                            ? 'Eliminar mesa'
                            : 'Solo se pueden eliminar mesas libres'
                        }
                        className={`${BTN_DANGER} ${
                          !libre ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                      >
                        <Trash2 {...ICON} className="h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        </>
      )}
    </div>
  )
}
