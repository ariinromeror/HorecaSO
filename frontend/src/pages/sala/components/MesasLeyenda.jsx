import { tokens } from '../../../constants/uiTokens'

const CLAVES = ['libre', 'ocupada', 'reservada', 'bloqueada']

export default function MesasLeyenda() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#6b7280] dark:text-[#8b90a7]">
      {CLAVES.map((k) => {
        const t = tokens.shared.mesa[k]
        return (
          <span key={k} className="inline-flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full border-2"
              style={{ borderColor: t.border, background: t.bg }}
              aria-hidden
            />
            <span style={{ color: t.text }}>{t.label}</span>
          </span>
        )
      })}
    </div>
  )
}
