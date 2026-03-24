export const INPUT_FACTURAS =

  'w-full min-w-0 max-w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'

export const BTN_PRIMARY_FACTURAS =

  'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40'

export const ROLES_ESCRITURA = ['admin', 'director', 'almacen']



export function hoyISO() {

  const d = new Date()

  const z = (n) => String(n).padStart(2, '0')

  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`

}



export function formatEuro(n) {

  if (n == null || n === '') return '—'

  return new Intl.NumberFormat('es-ES', {

    style: 'currency',

    currency: 'EUR',

  }).format(Number(n))

}



export function fechaCortaFactura(iso) {

  if (!iso) return '—'

  try {

    const s = String(iso).slice(0, 10)

    const [y, m, d] = s.split('-')

    return d && m && y ? `${d}/${m}/${y}` : iso

  } catch {

    return '—'

  }

}



/** Días hasta vencimiento (negativo = vencida). */

export function diasHastaVencimiento(fechaVenc) {

  if (!fechaVenc) return null

  const s = String(fechaVenc).slice(0, 10)

  const [y, m, d] = s.split('-').map(Number)

  if (!y || !m || !d) return null

  const v = new Date(y, m - 1, d)

  const t = new Date()

  t.setHours(0, 0, 0, 0)

  v.setHours(0, 0, 0, 0)

  return Math.round((v - t) / 86400000)

}



export function textoVencimiento(f, dias) {

  if (f.pagada) return '—'

  if (dias == null) return fechaCortaFactura(f.fecha_vencimiento) || '—'

  if (dias < 0) {

    return (

      <span className="font-medium text-red-500">

        Vencida hace {Math.abs(dias)} día{Math.abs(dias) === 1 ? '' : 's'}

      </span>

    )

  }

  if (dias <= 7) {

    return (

      <span className="font-medium text-amber-500">

        Vence en {dias} día{dias === 1 ? '' : 's'}

      </span>

    )

  }

  return fechaCortaFactura(f.fecha_vencimiento)

}



export function badgeEstadoPago(f, dias) {

  if (f.pagada) {

    return (

      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">

        Pagada

      </span>

    )

  }

  if (dias != null && dias < 0) {

    return (

      <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500">

        Vencida

      </span>

    )

  }

  return (

    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">

      Pendiente

    </span>

  )

}



export const INPUT_PROVEEDOR =

  'w-full rounded-lg border border-[#e2e5ed] bg-[#f0f2f5] px-3 py-2.5 text-[15px] text-[#111827] focus:border-amber-500 focus:outline-none dark:border-[#2e3347] dark:bg-[#222536] dark:text-[#e8eaf0]'

export const BTN_PRIMARY_PROVEEDOR =

  'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 text-sm font-semibold text-black transition-colors hover:bg-amber-600 disabled:opacity-40'



export function fechaCortaProveedor(iso) {

  if (!iso) return '—'

  try {

    return new Date(iso).toLocaleDateString('es-ES')

  } catch {

    return '—'

  }

}

