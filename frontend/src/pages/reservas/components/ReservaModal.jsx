import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  INPUT,
  ORIGENES,
  SELECT,
  SURFACE,
  TEXTAREA,
} from '../constants'

export default function ReservaModal({
  modalReserva,
  modalReservaError,
  formReserva,
  setFormReserva,
  savingReserva,
  cerrarModalReserva,
  guardarReserva,
}) {
  if (!modalReserva) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
    >
      <div
        className={`${SURFACE} max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl dark:bg-[#1a1d27]`}
      >
        <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
          {modalReserva.modo === 'nuevo' ? 'Nueva reserva' : 'Editar reserva'}
        </h2>
        {modalReservaError ? (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">
            {modalReservaError}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Nombre cliente *
            </label>
            <input
              type="text"
              value={formReserva.nombre_cliente}
              onChange={(e) =>
                setFormReserva((f) => ({
                  ...f,
                  nombre_cliente: e.target.value,
                }))
              }
              className={INPUT}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Teléfono *
            </label>
            <input
              type="tel"
              value={formReserva.telefono}
              onChange={(e) =>
                setFormReserva((f) => ({ ...f, telefono: e.target.value }))
              }
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Fecha *
            </label>
            <input
              type="date"
              value={formReserva.fecha}
              onChange={(e) =>
                setFormReserva((f) => ({ ...f, fecha: e.target.value }))
              }
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Hora *
            </label>
            <input
              type="time"
              value={formReserva.hora}
              onChange={(e) =>
                setFormReserva((f) => ({ ...f, hora: e.target.value }))
              }
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Personas
            </label>
            <input
              type="number"
              min={1}
              value={formReserva.num_personas}
              onChange={(e) =>
                setFormReserva((f) => ({
                  ...f,
                  num_personas: e.target.value,
                }))
              }
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Origen
            </label>
            <select
              value={formReserva.origen}
              onChange={(e) =>
                setFormReserva((f) => ({ ...f, origen: e.target.value }))
              }
              className={SELECT}
            >
              {ORIGENES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Notas
            </label>
            <textarea
              value={formReserva.notas}
              onChange={(e) =>
                setFormReserva((f) => ({ ...f, notas: e.target.value }))
              }
              className={TEXTAREA}
              rows={3}
            />
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={cerrarModalReserva}
            disabled={savingReserva}
            className={`${BTN_SECONDARY} w-full sm:w-auto`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardarReserva}
            disabled={savingReserva}
            className={`${BTN_PRIMARY} w-full sm:w-auto`}
          >
            {savingReserva ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
