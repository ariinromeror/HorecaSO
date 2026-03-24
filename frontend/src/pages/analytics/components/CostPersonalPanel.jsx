import { BarChart3, Euro, Users, Wallet } from 'lucide-react'
import Loader from '../../../components/shared/Loader'
import StatCard from '../../../components/shared/StatCard'
import { INPUT, MESES, SELECT, SURFACE, fmtEuro, fmtNum } from '../constants'

export default function CostPersonalPanel({
  mesCp,
  setMesCp,
  anioCp,
  setAnioCp,
  cargarCostePersonal,
  loadingCp,
  errorCp,
  dataCp,
}) {
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full min-w-0 sm:max-w-[200px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Mes
          </label>
          <select
            value={mesCp}
            onChange={(e) => setMesCp(Number(e.target.value))}
            className={SELECT}
          >
            {MESES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full min-w-0 sm:max-w-[140px]">
          <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Año
          </label>
          <input
            type="number"
            min={2000}
            max={2100}
            value={anioCp}
            onChange={(e) => setAnioCp(Number(e.target.value))}
            className={INPUT}
          />
        </div>
        <button
          type="button"
          onClick={cargarCostePersonal}
          className="h-12 min-h-[48px] rounded-lg bg-amber-500 px-6 font-semibold text-black hover:bg-amber-600 disabled:opacity-40"
          disabled={loadingCp}
        >
          Actualizar
        </button>
      </div>

      {errorCp ? (
        <p className="mb-4 text-red-600 dark:text-red-400">{errorCp}</p>
      ) : null}

      {loadingCp && !dataCp ? (
        <Loader />
      ) : dataCp ? (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <StatCard
                label="Ratio personal / ingresos"
                value={`${fmtNum(dataCp.ratio_personal_porcentaje, '%')}`}
                Icon={BarChart3}
                color={dataCp.benchmark_ok ? 'green' : 'red'}
              />
              <p className="mt-2 text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Benchmark hostelería: &lt; 35%
              </p>
            </div>
            <StatCard
              label="Coste total empresa"
              value={fmtEuro(dataCp.coste_total_empresa)}
              Icon={Wallet}
              color="amber"
            />
            <StatCard
              label="Total salarios"
              value={fmtEuro(dataCp.total_salarios)}
              Icon={Euro}
              color="white"
            />
            <StatCard
              label="Nº empleados en nómina"
              value={String(dataCp.num_empleados ?? 0)}
              Icon={Users}
              color="white"
            />
          </div>

          <div className={`${SURFACE} p-4 md:p-6`}>
            <p className="mb-3 text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Coste personal vs ingresos del periodo
            </p>
            <div className="mb-2 h-4 w-full overflow-hidden rounded-full bg-[#e2e5ed] dark:bg-[#2e3347]">
              {(() => {
                const ing = Number(dataCp.ingresos_periodo) || 0
                const coste = Number(dataCp.coste_total_empresa) || 0
                const pctCoste =
                  ing > 0 ? Math.min(100, (coste / ing) * 100) : 0
                const pctIngreso = ing > 0 ? 100 - pctCoste : 0
                return (
                  <div className="flex h-full w-full">
                    <div
                      className="h-full bg-red-500/80 transition-all"
                      style={{ width: `${pctCoste}%` }}
                      title="Coste empresa"
                    />
                    <div
                      className="h-full bg-emerald-500/70"
                      style={{ width: `${pctIngreso}%` }}
                      title="Resto ingresos"
                    />
                  </div>
                )
              })()}
            </div>
            <div className="mb-4 flex flex-wrap gap-4 text-xs text-[#6b7280] dark:text-[#8b90a7]">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500/80" />
                Coste empresa ({fmtEuro(dataCp.coste_total_empresa)})
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500/70" />
                Ingresos cobrados ({fmtEuro(dataCp.ingresos_periodo)})
              </span>
            </div>
            <p className="text-sm leading-relaxed text-[#6b7280] dark:text-[#8b90a7]">
              El ratio compara el coste total empresa (salarios + SS empresa
              u otros conceptos de nómina) frente a los ingresos de tickets
              cobrados en el mismo mes. Un ratio inferior al 35% suele
              indicar un peso del personal acorde al sector hostelero.
            </p>
          </div>
        </>
      ) : null}
    </>
  )
}
