const valueColorClass = {
  amber: 'text-amber-500',
  green: 'text-emerald-500',
  red: 'text-red-500',
  white: 'text-[#111827] dark:text-[#e8eaf0]',
}

export default function StatCard({ label, value, Icon, color = 'white', trend }) {
  const valueClass = valueColorClass[color] || valueColorClass.white

  let trendContent = null
  if (trend != null && String(trend).length > 0) {
    const s = String(trend)
    if (s.startsWith('+')) {
      trendContent = (
        <p className="mt-1 text-sm font-medium text-emerald-500 dark:text-emerald-400">
          ↑ {trend}
        </p>
      )
    } else if (s.startsWith('-')) {
      trendContent = (
        <p className="mt-1 text-sm font-medium text-red-400 dark:text-red-400">
          ↓ {trend}
        </p>
      )
    }
  }

  return (
    <div className="rounded-xl border border-[#e2e5ed] bg-white p-6 shadow-sm dark:border-[#2e3347] dark:bg-[#1a1d27]">
      <div className="flex items-start justify-between">
        <span className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
          {label}
        </span>
        {Icon ? (
          <Icon
            size={22}
            strokeWidth={1.5}
            className="opacity-40 text-[#6b7280] dark:text-[#8b90a7]"
            aria-hidden
          />
        ) : null}
      </div>
      <p className={`mt-2 text-4xl font-bold ${valueClass}`}>{value}</p>
      {trendContent}
    </div>
  )
}
