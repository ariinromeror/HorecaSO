import Loader from '../../../components/shared/Loader'
import {
  CONTRATO_OPCIONES,
  EMPLEADOS_BTN_PRIMARY,
  EMPLEADOS_BTN_SECONDARY,
  EMPLEADOS_INPUT,
  EMPLEADOS_SELECT,
} from '../constants'

export default function EmpleadoModal({
  modal,
  form,
  setForm,
  modalLoading,
  modalError,
  saving,
  cerrarModal,
  guardar,
}) {
  if (!modal) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-xl border border-[#e2e5ed] bg-white p-5 dark:border-[#2e3347] dark:bg-[#1a1d27] sm:rounded-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="empleado-modal-title"
      >
        <h2
          id="empleado-modal-title"
          className="mb-4 text-xl font-bold text-[#111827] dark:text-[#e8eaf0]"
        >
          {modal.modo === 'nuevo' ? 'Nuevo empleado' : 'Editar empleado'}
        </h2>

        {modalLoading ? (
          <Loader />
        ) : (
          <>
            {modalError ? (
              <p className="mb-4 text-[15px] text-red-600 dark:text-red-400">
                {modalError}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                <span>
                  Nombre completo <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={form.nombre_completo}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      nombre_completo: e.target.value,
                    }))
                  }
                  className={`${EMPLEADOS_INPUT} min-h-[48px]`}
                />
              </label>
              <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                DNI
                <input
                  type="text"
                  value={form.dni}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dni: e.target.value }))
                  }
                  className={`${EMPLEADOS_INPUT} min-h-[48px]`}
                />
              </label>
              <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                NSS
                <input
                  type="text"
                  value={form.nss}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nss: e.target.value }))
                  }
                  className={`${EMPLEADOS_INPUT} min-h-[48px]`}
                />
              </label>
              <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                Cargo
                <input
                  type="text"
                  value={form.cargo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cargo: e.target.value }))
                  }
                  className={`${EMPLEADOS_INPUT} min-h-[48px]`}
                />
              </label>
              <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                Contrato
                <select
                  value={form.contrato}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contrato: e.target.value }))
                  }
                  className={`${EMPLEADOS_SELECT} min-h-[48px]`}
                >
                  {CONTRATO_OPCIONES.map((o) => (
                    <option key={o.value || 'empty'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                Jornada (h/semana)
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={form.jornada_horas}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      jornada_horas: e.target.value,
                    }))
                  }
                  className={`${EMPLEADOS_INPUT} min-h-[48px]`}
                />
              </label>
              <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                Salario bruto mensual
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.salario_bruto_mensual}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      salario_bruto_mensual: e.target.value,
                    }))
                  }
                  className={`${EMPLEADOS_INPUT} min-h-[48px]`}
                />
              </label>
              <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                IRPF % (0–45)
                <input
                  type="number"
                  min={0}
                  max={45}
                  step={0.01}
                  value={form.irpf_porcentaje}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      irpf_porcentaje: e.target.value,
                    }))
                  }
                  className={`${EMPLEADOS_INPUT} min-h-[48px]`}
                />
              </label>
              <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0]">
                Fecha inicio
                <input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      fecha_inicio: e.target.value,
                    }))
                  }
                  className={`${EMPLEADOS_INPUT} min-h-[48px]`}
                />
              </label>
              <label className="flex flex-col gap-1 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:col-span-2">
                IBAN
                <input
                  type="text"
                  value={form.iban}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, iban: e.target.value }))
                  }
                  className={`${EMPLEADOS_INPUT} min-h-[48px]`}
                />
              </label>
              <label className="flex min-h-[48px] cursor-pointer items-center gap-3 text-[15px] text-[#111827] dark:text-[#e8eaf0] md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, activo: e.target.checked }))
                  }
                  className="h-5 w-5 rounded border-[#e2e5ed] text-amber-500 focus:ring-amber-500 dark:border-[#2e3347]"
                />
                Activo
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={saving}
                className={EMPLEADOS_BTN_SECONDARY}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={saving}
                className={EMPLEADOS_BTN_PRIMARY}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
