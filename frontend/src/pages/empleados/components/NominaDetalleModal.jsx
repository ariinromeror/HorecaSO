import Loader from '../../../components/shared/Loader'
import DesglosePanel from './DesglosePanel'
import { MESES } from '../constants'

export default function NominaDetalleModal({
  modalNomina,
  loadingDetalle,
  detalleModal,
  cerrarModal,
  nombreEmpleado,
}) {
  if (!modalNomina) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-xl border border-[#e2e5ed] bg-white p-5 dark:border-[#2e3347] dark:bg-[#1a1d27] sm:rounded-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
            Detalle nómina
          </h2>
          <button
            type="button"
            onClick={cerrarModal}
            className="rounded-lg px-3 py-2 text-[14px] text-[#6b7280] dark:text-[#8b90a7]"
          >
            Cerrar
          </button>
        </div>
        {loadingDetalle ? (
          <Loader />
        ) : detalleModal ? (
          <DesglosePanel
            titulo={`Nómina ${MESES[(detalleModal.mes || modalNomina.mes) - 1]} ${detalleModal.anio || modalNomina.anio} — ${detalleModal.empleado?.nombre_empleado || nombreEmpleado(detalleModal.empleado_id || modalNomina.empleado_id)}`}
            desglose={null}
            nominaBase={detalleModal}
          />
        ) : null}
      </div>
    </div>
  )
}
