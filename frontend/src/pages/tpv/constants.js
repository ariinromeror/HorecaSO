export const MESA_OCUPADA_SIN_TICKET_MSG =
  'Mesa ocupada sin ticket abierto visible'

export function formatEuro(n) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n) || 0)
}

export const INPUT_COBR =
  'h-10 w-full min-w-0 rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'

/** Select reparto por persona (design system; evita colapso en fila flex) */
export const SELECT_METODO_PARTE =
  'block h-auto min-h-[2.25rem] w-full min-w-0 bg-[#f0f2f5] dark:bg-[#222536] border border-[#e2e5ed] dark:border-[#2e3347] rounded-lg px-2 py-1 text-[14px] text-[#111827] dark:text-[#e8eaf0]'

export const METODOS_DIVISION = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta_credito', label: 'Tarjeta crédito' },
  { value: 'tarjeta_debito', label: 'Tarjeta débito' },
  { value: 'bizum', label: 'Bizum' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'invitacion', label: 'Invitación' },
]

export function labelMetodoPago(codigo) {
  const m = METODOS_DIVISION.find((x) => x.value === codigo)
  return m ? m.label : codigo || '—'
}
