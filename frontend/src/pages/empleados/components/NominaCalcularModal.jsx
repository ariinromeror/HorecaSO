import { ChevronDown, ChevronUp } from 'lucide-react'
import Loader from '../../../components/shared/Loader'
import {
  NOMINAS_BTN_PRIMARY,
  NOMINAS_CARD_SM,
  NOMINAS_INPUT,
  NOMINAS_SELECT,
  NOMINAS_SURFACE,
  MESES,
  eur,
} from '../constants'

export default function NominaCalcularModal({
  loadingEmp,
  empleados,
  empleadoId,
  setEmpleadoId,
  empleadoSel,
  mes,
  setMes,
  anio,
  setAnio,
  extrasOpen,
  setExtrasOpen,
  horasExtraCant,
  setHorasExtraCant,
  plusFest,
  setPlusFest,
  otrosDev,
  setOtrosDev,
  otrasDed,
  setOtrasDed,
  calcError,
  calculando,
  calcularNomina,
}) {
  return (
    <div className={`min-w-0 ${NOMINAS_SURFACE} p-4 md:p-6`}>
      <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
        Calculadora
      </h2>

      {loadingEmp ? (
        <Loader />
      ) : (
        <>
          <label className="mb-4 block min-w-0">
            <span className="mb-1 block text-[15px] text-[#111827] dark:text-[#e8eaf0]">
              Empleado
            </span>
            <select
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
              className={NOMINAS_SELECT}
            >
              <option value="">Seleccionar…</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre_empleado || e.nombre_completo || e.id}
                </option>
              ))}
            </select>
          </label>

          {empleadoSel ? (
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className={NOMINAS_CARD_SM}>
                <p className="text-[12px] text-[#6b7280] dark:text-[#8b90a7]">
                  Salario bruto
                </p>
                <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                  {eur(empleadoSel.salario_bruto_mensual)}
                </p>
              </div>
              <div className={NOMINAS_CARD_SM}>
                <p className="text-[12px] text-[#6b7280] dark:text-[#8b90a7]">
                  Jornada (h/sem)
                </p>
                <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                  {empleadoSel.jornada_horas != null
                    ? `${empleadoSel.jornada_horas} h`
                    : '—'}
                </p>
              </div>
              <div className={NOMINAS_CARD_SM}>
                <p className="text-[12px] text-[#6b7280] dark:text-[#8b90a7]">
                  IRPF %
                </p>
                <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                  {empleadoSel.irpf_porcentaje != null
                    ? `${Number(empleadoSel.irpf_porcentaje).toFixed(2)} %`
                    : '—'}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[15px]">Mes</span>
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className={NOMINAS_SELECT}
              >
                {MESES.map((m, i) => (
                  <option key={m} value={String(i + 1)}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[15px]">Año</span>
              <input
                type="number"
                min={2000}
                max={2100}
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                className={NOMINAS_INPUT}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => setExtrasOpen((o) => !o)}
            className="mb-3 flex w-full min-h-[48px] items-center justify-between rounded-lg border border-[#e2e5ed] px-3 py-2 text-left text-[15px] dark:border-[#2e3347]"
          >
            <span className="font-medium text-[#111827] dark:text-[#e8eaf0]">
              Conceptos extra
            </span>
            {extrasOpen ? (
              <ChevronUp size={20} strokeWidth={1.5} />
            ) : (
              <ChevronDown size={20} strokeWidth={1.5} />
            )}
          </button>

          {extrasOpen ? (
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                  Horas extra (cantidad)
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={horasExtraCant}
                  onChange={(e) => setHorasExtraCant(e.target.value)}
                  className={NOMINAS_INPUT}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                  Plus festivos (€)
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={plusFest}
                  onChange={(e) => setPlusFest(e.target.value)}
                  className={NOMINAS_INPUT}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                  Otros devengos (€)
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={otrosDev}
                  onChange={(e) => setOtrosDev(e.target.value)}
                  className={NOMINAS_INPUT}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
                  Otras deducciones (€)
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={otrasDed}
                  onChange={(e) => setOtrasDed(e.target.value)}
                  className={NOMINAS_INPUT}
                />
              </label>
            </div>
          ) : null}

          {calcError ? (
            <p className="mb-3 text-[15px] text-red-600 dark:text-red-400">
              {calcError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={calcularNomina}
            disabled={calculando || !empleadoId}
            className={NOMINAS_BTN_PRIMARY}
          >
            {calculando ? 'Calculando…' : 'Calcular nómina'}
          </button>
        </>
      )}
    </div>
  )
}
