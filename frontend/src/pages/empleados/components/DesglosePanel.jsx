import {
  NOMINAS_SURFACE,
  eur,
  inferDesgloseFromNomina,
} from '../constants'

export default function DesglosePanel({ titulo, desglose, nominaBase }) {
  const d = desglose || inferDesgloseFromNomina(nominaBase || {})
  const nb = nominaBase || {}

  return (
    <div className={`${NOMINAS_SURFACE} p-4 md:p-6`}>
      <h2 className="mb-6 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
        {titulo}
      </h2>

      <section className="mb-6">
        <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
          Devengos
        </h3>
        <ul className="space-y-2 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
          <li className="flex justify-between gap-2">
            <span>Salario base</span>
            <span>{eur(d.salario_bruto_mensual_base ?? nb.salario_bruto)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Horas extra</span>
            <span>{eur(d.horas_extra_importe ?? nb.horas_extra_importe)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Plus festivos</span>
            <span>{eur(d.plus_festivos ?? nb.plus_festivos)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Otros devengos</span>
            <span>{eur(d.otros_devengos ?? nb.otros_devengos)}</span>
          </li>
        </ul>
        <div className="my-3 border-t border-[#e2e5ed] dark:border-[#2e3347]" />
        <div className="flex justify-between gap-2 text-[17px] font-bold text-[#111827] dark:text-[#e8eaf0]">
          <span>TOTAL DEVENGOS</span>
          <span>{eur(d.total_devengos ?? nb.total_devengos)}</span>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[#6b7280] dark:text-[#8b90a7]">
          Deducciones
        </h3>
        <ul className="space-y-2 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
          <li className="flex justify-between gap-2">
            <span>
              SS empleado (
              {(d.ss_empleado_pct ?? 6.35).toFixed(2).replace(/\.00$/, '')}%)
            </span>
            <span>{eur(d.ss_empleado ?? nb.ss_empleado)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>
              IRPF (
              {(d.irpf_porcentaje_aplicado ?? 0).toFixed(2).replace(/\.00$/, '')}
              %)
            </span>
            <span>{eur(d.irpf ?? nb.irpf)}</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>Otras deducciones</span>
            <span>{eur(d.otras_deducciones ?? nb.otras_deducciones)}</span>
          </li>
        </ul>
        <div className="my-3 border-t border-[#e2e5ed] dark:border-[#2e3347]" />
        <div className="flex justify-between gap-2 text-[17px] font-bold text-[#111827] dark:text-[#e8eaf0]">
          <span>TOTAL DEDUCCIONES</span>
          <span>{eur(d.total_deducciones ?? nb.total_deducciones)}</span>
        </div>
      </section>

      <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/5 px-4 py-4">
        <p className="text-[13px] font-medium uppercase text-[#6b7280] dark:text-[#8b90a7]">
          Líquido a percibir
        </p>
        <p className="mt-1 text-3xl font-bold text-amber-500 md:text-4xl">
          {eur(d.liquido ?? nb.liquido)}
        </p>
      </div>

      <section className="rounded-lg bg-[#f4f6f9] px-3 py-3 text-[13px] text-[#6b7280] dark:bg-[#0f1117] dark:text-[#8b90a7]">
        <h3 className="mb-2 font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Coste empresa
        </h3>
        <ul className="space-y-1">
          <li className="flex justify-between gap-2">
            <span>
              SS empresa (
              {(d.ss_empresa_pct ?? 29.9).toFixed(1).replace(/\.0$/, '')}%)
            </span>
            <span className="text-[#111827] dark:text-[#e8eaf0]">
              {eur(d.ss_empresa ?? nb.ss_empresa)}
            </span>
          </li>
          <li className="flex justify-between gap-2 font-medium text-[#111827] dark:text-[#e8eaf0]">
            <span>Coste total empresa</span>
            <span>{eur(d.coste_total_empresa ?? nb.coste_total_empresa)}</span>
          </li>
        </ul>
      </section>
    </div>
  )
}
