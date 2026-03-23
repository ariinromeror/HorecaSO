/**
 * Bloque de error cuando la mesa está ocupada sin ticket visible + acciones.
 */
export default function TpvMesaOcupadaAlert({
  message,
  liberarMesaLoading,
  onLiberarMesa,
  onVolverSala,
}) {
  return (
    <div
      className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-600 dark:text-red-400"
      role="alert"
    >
      <p>{message}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          disabled={liberarMesaLoading}
          onClick={onLiberarMesa}
          className="rounded-lg bg-amber-500 px-4 py-2 text-[14px] font-medium text-[#111827] disabled:opacity-50"
        >
          {liberarMesaLoading ? 'Liberando…' : 'Liberar mesa'}
        </button>
        <button
          type="button"
          onClick={onVolverSala}
          className="rounded-lg border border-[#e2e5ed] bg-white px-4 py-2 text-[14px] font-medium text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0]"
        >
          Volver a sala
        </button>
      </div>
    </div>
  )
}
