import { Navigate } from 'react-router-dom'
import Loader from '../../components/shared/Loader'
import CostPersonalPanel from './components/CostPersonalPanel'
import IngenieriaMenuPanel from './components/IngenieriaMenuPanel'
import RentabilidadMesasPanel from './components/RentabilidadMesasPanel'
import { PAGE_BG, ROLES_ACCESO, TAB_BTN } from './constants'
import { useAnalytics } from './hooks/useAnalytics'

export default function AnalyticsPage() {
  const a = useAnalytics()

  if (a.authLoading) {
    return <Loader />
  }

  if (a.user && !ROLES_ACCESO.includes(a.user.rol)) {
    return <Navigate to="/menu" replace />
  }

  return (
    <div
      className={`${PAGE_BG} min-w-0 overflow-x-hidden text-[15px] text-[#111827] dark:text-[#e8eaf0]`}
    >
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-[#e2e5ed] dark:border-[#2e3347] pb-px">
        <button
          type="button"
          onClick={() => a.setMainTab('rentabilidad')}
          className={`${TAB_BTN} shrink-0 ${
            a.mainTab === 'rentabilidad'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Rentabilidad Mesas
        </button>
        <button
          type="button"
          onClick={() => a.setMainTab('menu')}
          className={`${TAB_BTN} shrink-0 ${
            a.mainTab === 'menu'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Ingeniería Menú
        </button>
        <button
          type="button"
          onClick={() => a.setMainTab('personal')}
          className={`${TAB_BTN} shrink-0 ${
            a.mainTab === 'personal'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-[#6b7280] dark:text-[#8b90a7]'
          }`}
        >
          Coste Personal
        </button>
      </div>

      {a.mainTab === 'rentabilidad' ? (
        <RentabilidadMesasPanel
          desdeRm={a.desdeRm}
          setDesdeRm={a.setDesdeRm}
          hastaRm={a.hastaRm}
          setHastaRm={a.setHastaRm}
          zonaRm={a.zonaRm}
          setZonaRm={a.setZonaRm}
          cargarRentabilidad={a.cargarRentabilidad}
          loadingRm={a.loadingRm}
          errorRm={a.errorRm}
          dataRm={a.dataRm}
          mesasRm={a.mesasRm}
          resRm={a.resRm}
        />
      ) : null}

      {a.mainTab === 'menu' ? (
        <IngenieriaMenuPanel
          desdeIm={a.desdeIm}
          setDesdeIm={a.setDesdeIm}
          hastaIm={a.hastaIm}
          setHastaIm={a.setHastaIm}
          cargarIngenieria={a.cargarIngenieria}
          loadingIm={a.loadingIm}
          errorIm={a.errorIm}
          dataIm={a.dataIm}
          productosIm={a.productosIm}
          resumenCls={a.resumenCls}
          productosPorClasificacion={a.productosPorClasificacion}
        />
      ) : null}

      {a.mainTab === 'personal' ? (
        <CostPersonalPanel
          mesCp={a.mesCp}
          setMesCp={a.setMesCp}
          anioCp={a.anioCp}
          setAnioCp={a.setAnioCp}
          cargarCostePersonal={a.cargarCostePersonal}
          loadingCp={a.loadingCp}
          errorCp={a.errorCp}
          dataCp={a.dataCp}
        />
      ) : null}
    </div>
  )
}
