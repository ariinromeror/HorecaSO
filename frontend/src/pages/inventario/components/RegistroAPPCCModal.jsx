import {
  BTN_PRIMARY_APPCC,
  BTN_SECONDARY_APPCC,
  INPUT_APPCC,
  SELECT_APPCC,
  SURFACE_APPCC,
  TEXTAREA_APPCC,
  TIPOS_MODAL,
} from '../appccConstants'

export default function RegistroAPPCCModal({
  modalOpen,
  modalError,
  form,
  setForm,
  cerrarModal,
  guardarRegistro,
  saving,
}) {
  if (!modalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`${SURFACE_APPCC} max-h-[92vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl dark:bg-[#1a1d27]`}
      >
        <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
          Nuevo registro APPCC
        </h2>
        {modalError ? (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">
            {modalError}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Tipo de control *
            </label>
            <select
              value={form.tipo_control}
              onChange={(e) =>
                setForm((f) => ({ ...f, tipo_control: e.target.value }))
              }
              className={SELECT_APPCC}
            >
              {TIPOS_MODAL.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Nombre equipo
            </label>
            <input
              type="text"
              value={form.nombre_equipo}
              onChange={(e) =>
                setForm((f) => ({ ...f, nombre_equipo: e.target.value }))
              }
              className={INPUT_APPCC}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Temperatura (°C)
            </label>
            <input
              type="number"
              step="0.1"
              value={form.temperatura}
              onChange={(e) =>
                setForm((f) => ({ ...f, temperatura: e.target.value }))
              }
              className={INPUT_APPCC}
            />
          </div>
          <div className="flex flex-col justify-end">
            <label className="mb-2 flex cursor-pointer items-center gap-3 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
              <input
                type="checkbox"
                checked={form.conforme}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    conforme: e.target.checked,
                    accion_correctora: e.target.checked
                      ? ''
                      : f.accion_correctora,
                  }))
                }
                className="h-5 w-5 rounded border-[#e2e5ed] text-amber-500 focus:ring-amber-500 dark:border-[#2e3347]"
              />
              Conforme
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Observaciones
            </label>
            <textarea
              value={form.observaciones}
              onChange={(e) =>
                setForm((f) => ({ ...f, observaciones: e.target.value }))
              }
              className={TEXTAREA_APPCC}
              rows={3}
            />
          </div>
          {!form.conforme ? (
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
                Acción correctora *
              </label>
              <textarea
                value={form.accion_correctora}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    accion_correctora: e.target.value,
                  }))
                }
                className={TEXTAREA_APPCC}
                rows={3}
              />
            </div>
          ) : null}
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={cerrarModal}
            disabled={saving}
            className={`${BTN_SECONDARY_APPCC} w-full sm:w-auto`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardarRegistro}
            disabled={saving}
            className={`${BTN_PRIMARY_APPCC} w-full sm:w-auto`}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
