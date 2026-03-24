import { BTN_SECONDARY, SURFACE } from '../constants'

export default function ReservaAcciones({
  modalEstado,
  patchingEstado,
  aplicarEstadoReserva,
  cerrarModalEstado,
}) {
  if (!modalEstado) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`${SURFACE} w-full max-w-md p-6 shadow-xl dark:bg-[#1a1d27]`}
      >
        <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
          Cambiar estado — {modalEstado.nombre_cliente}
        </h2>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={patchingEstado}
            onClick={() => aplicarEstadoReserva('confirmada')}
            className="h-12 w-full rounded-lg bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
          >
            Confirmar
          </button>
          <button
            type="button"
            disabled={patchingEstado}
            onClick={() => aplicarEstadoReserva('sentada')}
            className="h-12 w-full rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            Sentar
          </button>
          <button
            type="button"
            disabled={patchingEstado}
            onClick={() => aplicarEstadoReserva('cancelada')}
            className="h-12 w-full rounded-lg bg-red-600 font-semibold text-white hover:bg-red-700 disabled:opacity-40"
          >
            Cancelar reserva
          </button>
          <button
            type="button"
            disabled={patchingEstado}
            onClick={() => aplicarEstadoReserva('no_show')}
            className="h-12 w-full rounded-lg bg-gray-600 font-semibold text-white hover:bg-gray-700 disabled:opacity-40"
          >
            No show
          </button>
          <button
            type="button"
            disabled={patchingEstado}
            onClick={cerrarModalEstado}
            className={`${BTN_SECONDARY} mt-2 w-full`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
