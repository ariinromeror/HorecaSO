import { LogIn, LogOut } from 'lucide-react'
import Loader from '../../../components/shared/Loader'
import { FICHAJES_SELECT, FICHAJES_SURFACE } from '../constants'

export default function FichajeAcciones({
  ficharAlLogin,
  setFicharAlLoginState,
  writeFicharAlLogin,
  empleados,
  loadingEmp,
  errorEmp,
  empleadoPanel,
  setEmpleadoPanel,
  turnosForbidden,
  panelError,
  loadingPanel,
  turnoActivoEfectivo,
  tiempoTranscurrido,
  ficharEntrada,
  ficharSalida,
  fichando,
  resumenFichaje,
  formatHora,
  formatHoras,
}) {
  return (
    <>
      <div className={`mb-6 ${FICHAJES_SURFACE} p-4 md:p-5`}>
        <label className="flex cursor-pointer items-start gap-3 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
          <input
            type="checkbox"
            checked={ficharAlLogin}
            onChange={(e) => {
              const v = e.target.checked
              setFicharAlLoginState(v)
              writeFicharAlLogin(v)
            }}
            className="mt-1 h-5 w-5 rounded border-[#e2e5ed] text-amber-500 focus:ring-amber-500 dark:border-[#2e3347]"
          />
          <span>
            <span className="font-medium">Fichar al iniciar sesión</span>
            <span className="mt-1 block text-[14px] text-[#6b7280] dark:text-[#8b90a7]">
              Si tu usuario tiene empleado vinculado, se registra la entrada al
              entrar (si no había turno abierto hoy). Puedes desactivarlo aquí.
            </span>
          </span>
        </label>
      </div>

      <section className={`mb-8 ${FICHAJES_SURFACE} p-4 md:p-6`}>
        <h2 className="mb-4 text-lg font-semibold text-[#111827] dark:text-[#e8eaf0]">
          Fichaje
        </h2>

        {errorEmp ? (
          <p className="mb-3 text-[15px] text-red-600 dark:text-red-400">
            {errorEmp}
          </p>
        ) : null}

        {loadingEmp ? (
          <Loader />
        ) : (
          <label className="mb-4 block min-w-0 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
            Empleado
            <select
              value={empleadoPanel}
              onChange={(e) => setEmpleadoPanel(e.target.value)}
              className={`${FICHAJES_SELECT} mt-1`}
            >
              <option value="">Seleccionar empleado…</option>
              {empleados.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre_empleado || e.nombre_completo || e.id}
                </option>
              ))}
            </select>
          </label>
        )}

        {turnosForbidden && empleadoPanel ? (
          <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[14px] text-amber-800 dark:text-amber-300">
            No tienes permiso para listar turnos; el fichaje sigue disponible.
            Si ya fichaste, usa el botón de salida.
          </p>
        ) : null}

        {panelError ? (
          <p className="mb-3 text-[15px] text-red-600 dark:text-red-400">
            {panelError}
          </p>
        ) : null}

        {empleadoPanel && loadingPanel ? (
          <p className="text-[#6b7280] dark:text-[#8b90a7]">Comprobando turno…</p>
        ) : null}

        {empleadoPanel && !loadingPanel ? (
          <div className="flex flex-col gap-4">
            {turnoActivoEfectivo ? (
              <>
                <div className="rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-4 py-3 dark:border-[#2e3347] dark:bg-[#0f1117]">
                  <p className="text-[15px] font-medium text-[#111827] dark:text-[#e8eaf0]">
                    Entrada:{' '}
                    <span className="text-amber-500">
                      {formatHora(turnoActivoEfectivo.hora_entrada)}
                    </span>
                  </p>
                  {tiempoTranscurrido ? (
                    <p className="mt-1 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
                      Tiempo en turno:{' '}
                      <span className="font-mono text-[#111827] dark:text-[#e8eaf0]">
                        {tiempoTranscurrido}
                      </span>
                    </p>
                  ) : null}
                  {!turnoActivoEfectivo.desdeApi ? (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      Estado recuperado localmente (sin listado de turnos).
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={ficharSalida}
                  disabled={fichando}
                  className="inline-flex h-16 min-h-[64px] w-full items-center justify-center gap-3 rounded-xl bg-red-600 px-4 text-[16px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <LogOut size={24} strokeWidth={1.5} />
                  Fichar Salida
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={ficharEntrada}
                disabled={fichando || !empleadoPanel}
                className="inline-flex h-16 min-h-[64px] w-full items-center justify-center gap-3 rounded-xl bg-green-600 px-4 text-[16px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <LogIn size={24} strokeWidth={1.5} />
                Fichar Entrada
              </button>
            )}
          </div>
        ) : null}

        {resumenFichaje ? (
          <div
            className={`mt-4 rounded-lg border px-4 py-3 text-[15px] ${
              resumenFichaje.tipo === 'salida' && resumenFichaje.extraAlto
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
            }`}
            role="status"
          >
            <p className="font-medium">{resumenFichaje.msg}</p>
            {resumenFichaje.tipo === 'salida' &&
            resumenFichaje.horas_trabajadas != null ? (
              <p className="mt-1 text-[14px] opacity-90">
                Horas trabajadas:{' '}
                <span className="font-semibold">
                  {formatHoras(resumenFichaje.horas_trabajadas)}
                </span>
                {resumenFichaje.horas_extra != null ? (
                  <>
                    {' '}
                    · Horas extra:{' '}
                    <span
                      className={
                        Number(resumenFichaje.horas_extra) > 0
                          ? 'font-semibold text-amber-600 dark:text-amber-400'
                          : 'font-semibold'
                      }
                    >
                      {formatHoras(resumenFichaje.horas_extra)}
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </>
  )
}
