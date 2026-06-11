export function semaforoMeta(s) {
  switch (s) {
    case 'verde':
      return {
        bar: 'bg-emerald-500',
        text: 'text-emerald-500',
        border: 'border-emerald-500/50',
        badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        dot: 'bg-emerald-500',
        label: 'Rentable',
      }
    case 'amarillo':
      return {
        bar: 'bg-amber-500',
        text: 'text-amber-500',
        border: 'border-amber-500/50',
        badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        dot: 'bg-amber-500',
        label: 'Revisar',
      }
    case 'rojo':
      return {
        bar: 'bg-red-500',
        text: 'text-red-500',
        border: 'border-red-500/50',
        badge: 'bg-red-500/10 text-red-500 border-red-500/20',
        dot: 'bg-red-500',
        label: 'Crítico',
      }
    case 'sin_venta':
      return {
        bar: 'bg-sky-500',
        text: 'text-sky-600 dark:text-sky-400',
        border: 'border-sky-500/50',
        badge: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-400',
        dot: 'bg-sky-500',
        label: 'Elaboración',
      }
    case 'sin_receta':
      return {
        bar: 'bg-violet-500',
        text: 'text-violet-600 dark:text-violet-400',
        border: 'border-violet-500/50',
        badge:
          'bg-violet-500/10 text-violet-800 border-violet-500/20 dark:text-violet-300',
        dot: 'bg-violet-500',
        label: 'Sin receta',
      }
    default:
      return {
        bar: 'bg-zinc-400 dark:bg-zinc-600',
        text: 'text-[#6b7280] dark:text-[#8b90a7]',
        border: 'border-zinc-400/50',
        badge: 'bg-[#f0f2f5] text-[#6b7280] border-[#e2e5ed] dark:bg-[#222536] dark:text-[#8b90a7] dark:border-[#2e3347]',
        dot: 'bg-zinc-400',
        label: 'Sin receta',
      }
  }
}
