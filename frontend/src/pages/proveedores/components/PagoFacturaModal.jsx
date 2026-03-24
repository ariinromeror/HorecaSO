export default function PagoFacturaModal({
  puedeEscribir,
  pagada,
  onMarcarPagada,
}) {
  if (!puedeEscribir || pagada) return null
  return (
    <button
      type="button"
      onClick={onMarcarPagada}
      className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white dark:bg-emerald-700"
    >
      Marcar como pagada
    </button>
  )
}
