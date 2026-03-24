import {
  CUADRANTE_BTN_PRIMARY,
  CUADRANTE_BTN_SECONDARY,
  CUADRANTE_INPUT,
  CUADRANTE_SELECT,
  PUESTO_OPTIONS,
} from '../constants'

export default function TurnoModal({
  modalAdd,
  modalForm,
  setModalForm,
  modalErr,
  cerrarModal,
  guardarModalLocal,
  nombreEmpleado,
}) {
  if (!modalAdd) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl border border-[#e2e5ed] bg-white p-5 dark:border-[#2e3347] dark:bg-[#1a1d27] sm:rounded-xl"
        role="dialog"
        aria-modal="true"
      >
        <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
          Añadir turno
        </h2>
        <div className="mb-3 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          <p>
            <span className="font-medium text-[#111827] dark:text-[#e8eaf0]">
              Empleado:
            </span>{' '}
            {nombreEmpleado(modalAdd.empleado_id)}
          </p>
          <p className="mt-1">
            <span className="font-medium text-[#111827] dark:text-[#e8eaf0]">
              Fecha:
            </span>{' '}
            {modalAdd.fecha.split('-').reverse().join('/')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <label className="flex flex-col gap-1 text-[15px]">
            <span className="text-[#111827] dark:text-[#e8eaf0]">
              Hora inicio
            </span>
            <input
              type="time"
              value={modalForm.hora_inicio}
              onChange={(e) =>
                setModalForm((f) => ({
                  ...f,
                  hora_inicio: e.target.value,
                }))
              }
              className={CUADRANTE_INPUT}
            />
          </label>
          <label className="flex flex-col gap-1 text-[15px]">
            <span className="text-[#111827] dark:text-[#e8eaf0]">
              Hora fin
            </span>
            <input
              type="time"
              value={modalForm.hora_fin}
              onChange={(e) =>
                setModalForm((f) => ({ ...f, hora_fin: e.target.value }))
              }
              className={CUADRANTE_INPUT}
            />
          </label>
          <label className="flex flex-col gap-1 text-[15px]">
            <span className="text-[#111827] dark:text-[#e8eaf0]">
              Puesto
            </span>
            <select
              value={modalForm.puesto}
              onChange={(e) =>
                setModalForm((f) => ({ ...f, puesto: e.target.value }))
              }
              className={CUADRANTE_SELECT}
            >
              {PUESTO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {modalErr ? (
          <p className="mt-3 text-[14px] text-red-600 dark:text-red-400">
            {modalErr}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={cerrarModal}
            className={CUADRANTE_BTN_SECONDARY}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardarModalLocal}
            className={CUADRANTE_BTN_PRIMARY}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
