import {
  ALERGENOS,
  BTN_PRIMARY,
  BTN_SECONDARY,
  INPUT,
  SURFACE,
  TEXTAREA,
} from '../constants'

export default function ClienteModal({
  modalCliente,
  modalClienteError,
  formCliente,
  setFormCliente,
  savingCliente,
  cerrarModalCliente,
  guardarCliente,
  toggleAlergeno,
}) {
  if (!modalCliente) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`${SURFACE} max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6 shadow-xl dark:bg-[#1a1d27]`}
      >
        <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
          {modalCliente.modo === 'nuevo' ? 'Nuevo cliente' : 'Editar cliente'}
        </h2>
        {modalClienteError ? (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">
            {modalClienteError}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Nombre *
            </label>
            <input
              type="text"
              value={formCliente.nombre}
              onChange={(e) =>
                setFormCliente((f) => ({ ...f, nombre: e.target.value }))
              }
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Email
            </label>
            <input
              type="email"
              value={formCliente.email}
              onChange={(e) =>
                setFormCliente((f) => ({ ...f, email: e.target.value }))
              }
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Teléfono
            </label>
            <input
              type="tel"
              value={formCliente.telefono}
              onChange={(e) =>
                setFormCliente((f) => ({ ...f, telefono: e.target.value }))
              }
              className={INPUT}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={formCliente.fecha_nacimiento}
              onChange={(e) =>
                setFormCliente((f) => ({
                  ...f,
                  fecha_nacimiento: e.target.value,
                }))
              }
              className={INPUT}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Preferencias
            </label>
            <textarea
              value={formCliente.preferencias}
              onChange={(e) =>
                setFormCliente((f) => ({
                  ...f,
                  preferencias: e.target.value,
                }))
              }
              className={TEXTAREA}
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Notas
            </label>
            <textarea
              value={formCliente.notas}
              onChange={(e) =>
                setFormCliente((f) => ({ ...f, notas: e.target.value }))
              }
              className={TEXTAREA}
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <p className="mb-2 text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Alérgenos
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ALERGENOS.map((a) => (
                <label
                  key={a.slug}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2 dark:border-[#2e3347] dark:bg-[#0f1117]"
                >
                  <input
                    type="checkbox"
                    checked={formCliente.alergenos.has(a.slug)}
                    onChange={() => toggleAlergeno(a.slug)}
                    className="h-4 w-4 rounded border-[#e2e5ed] text-amber-500 focus:ring-amber-500 dark:border-[#2e3347]"
                  />
                  <span className="text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                    {a.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={cerrarModalCliente}
            disabled={savingCliente}
            className={`${BTN_SECONDARY} w-full sm:w-auto`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardarCliente}
            disabled={savingCliente}
            className={`${BTN_PRIMARY} w-full sm:w-auto`}
          >
            {savingCliente ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
