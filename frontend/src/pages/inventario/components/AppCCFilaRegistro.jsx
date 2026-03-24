import { formatFechaHora, labelTipo } from '../appccConstants'

export default function AppCCFilaRegistro({
  row,
  extraCorrectora = false,
  forceNoBadge = false,
}) {
  return (
    <>
      <td className="px-4 py-3 text-sm">{formatFechaHora(row.created_at)}</td>
      <td className="px-4 py-3 font-medium capitalize">
        {labelTipo(row.tipo_control)}
      </td>
      <td className="px-4 py-3">{row.nombre_equipo || '—'}</td>
      <td className="px-4 py-3">
        {row.temperatura != null && row.temperatura !== ''
          ? `${Number(row.temperatura).toFixed(1)} °C`
          : '—'}
      </td>
      <td className="px-4 py-3">
        {forceNoBadge ? (
          <span className="inline-flex rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
            No conforme
          </span>
        ) : row.conforme ? (
          <span className="inline-flex rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Conforme
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
            No conforme
          </span>
        )}
      </td>
      <td className="max-w-[200px] truncate px-4 py-3 text-sm text-[#6b7280] dark:text-[#8b90a7]">
        {row.observaciones || '—'}
      </td>
      <td className="px-4 py-3 text-sm">{row.nombre_usuario || '—'}</td>
      {extraCorrectora ? (
        <td className="max-w-[220px] px-4 py-3 text-sm text-[#6b7280] dark:text-[#8b90a7]">
          {row.accion_correctora || '—'}
        </td>
      ) : null}
    </>
  )
}
