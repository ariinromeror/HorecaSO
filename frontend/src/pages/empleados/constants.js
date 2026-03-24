/** --- Nóminas --- */
export const ROLES_NOMINAS = ['admin', 'director']

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export const NOMINAS_INPUT =
  'w-full min-w-0 max-w-full min-h-[48px] rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
export const NOMINAS_SELECT = `${NOMINAS_INPUT} appearance-none bg-[#f0f2f5] dark:bg-[#222536]`
export const NOMINAS_BTN_PRIMARY =
  'inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black hover:bg-amber-600 disabled:opacity-40'
export const NOMINAS_BTN_GHOST =
  'inline-flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#e2e5ed] px-3 text-[15px] font-medium text-[#111827] dark:border-[#2e3347] dark:text-[#e8eaf0]'
export const NOMINAS_SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'
export const NOMINAS_CARD_SM =
  'rounded-lg border border-[#e2e5ed] bg-[#f4f6f9] px-3 py-2 dark:border-[#2e3347] dark:bg-[#0f1117]'

export function eur(n) {
  if (n == null || Number.isNaN(Number(n))) return '0.00 €'
  return `${Number(n).toFixed(2)} €`
}

export function inferDesgloseFromNomina(n) {
  const td = Number(n.total_devengos) || 0
  const irpf = Number(n.irpf) || 0
  const irpfPct = td > 0 ? (irpf / td) * 100 : 0
  return {
    salario_bruto_mensual_base: n.salario_bruto,
    horas_extra_importe: n.horas_extra_importe,
    plus_festivos: n.plus_festivos,
    otros_devengos: n.otros_devengos,
    total_devengos: n.total_devengos,
    ss_empleado_pct: 6.35,
    ss_empleado: n.ss_empleado,
    irpf_porcentaje_aplicado: irpfPct,
    irpf: n.irpf,
    otras_deducciones: n.otras_deducciones,
    total_deducciones: n.total_deducciones,
    liquido: n.liquido,
    ss_empresa_pct: 29.9,
    ss_empresa: n.ss_empresa,
    coste_total_empresa: n.coste_total_empresa,
  }
}

/** --- Fichajes --- */
export const ROLES_FICHAJES = [
  'admin',
  'director',
  'jefe_sala',
  'camarero',
  'cocina',
  'barra',
  'almacen',
]

/** --- Cuadrante --- */
export const ROLES_CUADRANTE = ['admin', 'director', 'jefe_sala']

export const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export const PUESTO_OPTIONS = [
  { value: 'sala', label: 'Sala' },
  { value: 'cocina', label: 'Cocina' },
  { value: 'barra', label: 'Barra' },
  { value: 'almacen', label: 'Almacén' },
]

export const CUADRANTE_SELECT =
  'w-full min-w-0 max-w-full min-h-[48px] rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
export const CUADRANTE_INPUT =
  'w-full min-w-0 max-w-full min-h-[48px] rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
export const CUADRANTE_BTN_PRIMARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black hover:bg-amber-600 disabled:opacity-40'
export const CUADRANTE_BTN_SECONDARY =
  'inline-flex h-12 min-h-[48px] items-center justify-center rounded-lg border border-[#e2e5ed] bg-white px-4 text-[15px] font-semibold text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0]'
export const CUADRANTE_SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'

export const FICHAJES_SELECT = CUADRANTE_SELECT
export const FICHAJES_INPUT = CUADRANTE_INPUT
export const FICHAJES_SURFACE = CUADRANTE_SURFACE

/** --- Empleados --- */
export const ROLES_EMPLEADOS = ['admin', 'director']

export const EMPLEADOS_INPUT =
  'w-full min-w-0 max-w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'
export const EMPLEADOS_SELECT = `${EMPLEADOS_INPUT} appearance-none bg-[#f0f2f5] dark:bg-[#222536]`
export const EMPLEADOS_BTN_PRIMARY =
  'inline-flex h-12 min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-[15px] font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40 sm:w-auto'
export const EMPLEADOS_BTN_SECONDARY =
  'inline-flex h-12 min-h-[48px] w-full items-center justify-center rounded-lg border border-[#e2e5ed] bg-white px-4 text-[15px] font-semibold text-[#111827] dark:border-[#2e3347] dark:bg-[#1a1d27] dark:text-[#e8eaf0] sm:w-auto'
export const EMPLEADOS_SURFACE =
  'rounded-xl border border-[#e2e5ed] bg-white dark:border-[#2e3347] dark:bg-[#1a1d27]'

export const CONTRATO_OPCIONES = [
  { value: '', label: 'Seleccionar…' },
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'temporal', label: 'Temporal' },
  { value: 'formacion', label: 'Formación' },
  { value: 'practicas', label: 'Prácticas' },
  { value: 'obra_servicio', label: 'Obra y servicio' },
]

export function formatEuroEmpleado(n) {
  if (n == null || n === '') return '—'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(n))
}

export function emptyFormEmpleado() {
  return {
    nombre_completo: '',
    dni: '',
    nss: '',
    cargo: '',
    contrato: '',
    jornada_horas: 40,
    salario_bruto_mensual: '',
    irpf_porcentaje: '',
    fecha_inicio: '',
    iban: '',
    activo: true,
  }
}
