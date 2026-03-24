import { BTN_SECONDARY, INPUT, SURFACE } from '../constants'

export default function PuntosPanel({
  modalPuntos,
  puntosError,
  puntosInput,
  setPuntosInput,
  motivoPuntos,
  setMotivoPuntos,
  puntosSaving,
  enviarPuntos,
  cerrarPuntos,
}) {
  if (!modalPuntos) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={`${SURFACE} w-full max-w-md p-6 shadow-xl dark:bg-[#1a1d27]`}
      >
        <h2 className="mb-4 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
          Puntos — {modalPuntos.nombre} — {modalPuntos.puntos_actuales} pts
        </h2>
        {puntosError ? (
          <p className="mb-3 text-sm text-red-600 dark:text-red-400">
            {puntosError}
          </p>
        ) : null}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Puntos (cantidad)
            </label>
            <input
              type="number"
              value={puntosInput}
              onChange={(e) => setPuntosInput(e.target.value)}
              placeholder="Ej. 50"
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-[#6b7280] dark:text-[#8b90a7]">
              Motivo *
            </label>
            <input
              type="text"
              value={motivoPuntos}
              onChange={(e) => setMotivoPuntos(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={puntosSaving}
            onClick={() => enviarPuntos(1)}
            className="h-12 w-full rounded-lg bg-emerald-600 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-40"
          >
            Sumar puntos
          </button>
          <button
            type="button"
            disabled={puntosSaving}
            onClick={() => enviarPuntos(-1)}
            className="h-12 w-full rounded-lg bg-red-600 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
          >
            Restar puntos
          </button>
          <button
            type="button"
            disabled={puntosSaving}
            onClick={cerrarPuntos}
            className={`${BTN_SECONDARY} w-full`}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
