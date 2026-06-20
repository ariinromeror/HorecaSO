import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Github, Linkedin, Mail, X } from 'lucide-react'
import { DESARROLLADOR, PROJECT_INFO } from '../content/sobreHorecaSO'

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 380, damping: 28 },
  },
  exit: { opacity: 0, scale: 0.98, y: 8, transition: { duration: 0.15 } },
}

const contentVariants = {
  hidden: { opacity: 0, x: 8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, x: -8, transition: { duration: 0.15 } },
}

function LanguageToggle({ lang, onChange }) {
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => onChange('es')}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          lang === 'es'
            ? 'bg-amber-500 text-black'
            : 'bg-[#f0f2f5] text-[#6b7280] hover:bg-[#e8eaef] dark:bg-[#222536] dark:text-[#8b90a7] dark:hover:bg-[#2a2d3f]'
        }`}
      >
        Español
      </button>
      <button
        type="button"
        onClick={() => onChange('en')}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          lang === 'en'
            ? 'bg-amber-500 text-black'
            : 'bg-[#f0f2f5] text-[#6b7280] hover:bg-[#e8eaef] dark:bg-[#222536] dark:text-[#8b90a7] dark:hover:bg-[#2a2d3f]'
        }`}
      >
        English
      </button>
    </div>
  )
}

function SobreTab({ content, lang }) {
  const { sobre } = content

  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-2 text-sm font-bold text-[#111827] dark:text-[#e8eaf0]">
          {sobre.resumenTitulo}
        </h4>
        <p className="text-[15px] leading-relaxed text-[#6b7280] dark:text-[#8b90a7]">
          {sobre.resumen}
        </p>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold text-[#111827] dark:text-[#e8eaf0]">
          {sobre.puntosTitulo}
        </h4>
        <ul className="space-y-1.5 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          {sobre.puntosClave.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-amber-500">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold text-[#111827] dark:text-[#e8eaf0]">
          {sobre.modulosTitulo}
        </h4>
        <div className="space-y-2 text-[15px]">
          {sobre.modulosPorRol.map((modulo) => (
            <div
              key={modulo.rol}
              className="border-l-2 border-amber-500/40 pl-3"
            >
              <span className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
                {modulo.rol}:
              </span>
              <span className="ml-1 text-[#6b7280] dark:text-[#8b90a7]">
                {modulo.features}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#e2e5ed] pt-4 dark:border-[#2e3347]">
        <h4 className="mb-2 text-sm font-bold text-[#111827] dark:text-[#e8eaf0]">
          {sobre.desarrolladorTitulo}
        </h4>
        <p className="font-semibold text-[#111827] dark:text-[#e8eaf0]">
          {DESARROLLADOR.nombre}
        </p>
        <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
          {lang === 'es' ? DESARROLLADOR.rol : DESARROLLADOR.rolEn}
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <a
            href={`mailto:${DESARROLLADOR.email}`}
            className="flex items-center gap-1.5 text-sm text-amber-500 hover:underline"
          >
            <Mail size={14} strokeWidth={1.5} />
            {DESARROLLADOR.email}
          </a>
          <a
            href={DESARROLLADOR.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-amber-500 hover:underline"
          >
            <Linkedin size={14} strokeWidth={1.5} />
            LinkedIn
          </a>
          <a
            href={DESARROLLADOR.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-amber-500 hover:underline"
          >
            <Github size={14} strokeWidth={1.5} />
            GitHub
          </a>
        </div>
      </div>
    </div>
  )
}

function ReadmeTab({ content }) {
  const { readme } = content

  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-2 text-sm font-bold text-[#111827] dark:text-[#e8eaf0]">
          {readme.arquitecturaTitulo}
        </h4>
        <ul className="space-y-1.5 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          {readme.arquitectura.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-amber-500">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold text-[#111827] dark:text-[#e8eaf0]">
          {readme.estructuraTitulo}
        </h4>
        <ul className="space-y-1.5 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          {readme.estructuraBackend.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="font-mono text-amber-500">-</span>
              <span className="font-mono text-[14px]">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold text-[#111827] dark:text-[#e8eaf0]">
          {readme.tablasTitulo}
        </h4>
        <ul className="space-y-1.5 text-[15px] text-[#6b7280] dark:text-[#8b90a7]">
          {readme.tablasBD.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-amber-500">•</span>
              <span className="font-mono text-[14px]">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function ProjectInfoModal({ isOpen, onClose }) {
  const [tab, setTab] = useState('sobre')
  const [lang, setLang] = useState('es')

  useEffect(() => {
    if (!isOpen) return undefined
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const content = PROJECT_INFO[lang]

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.button
            type="button"
            aria-label="Cerrar modal"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-info-title"
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#e2e5ed] bg-white shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex flex-shrink-0 flex-col gap-3 border-b border-[#e2e5ed] px-4 py-4 dark:border-[#2e3347] sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTab('sobre')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      tab === 'sobre'
                        ? 'bg-amber-500 text-black'
                        : 'bg-[#f0f2f5] text-[#6b7280] hover:bg-[#e8eaef] dark:bg-[#222536] dark:text-[#8b90a7] dark:hover:bg-[#2a2d3f]'
                    }`}
                  >
                    {content.tabs.sobre}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('readme')}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      tab === 'readme'
                        ? 'bg-amber-500 text-black'
                        : 'bg-[#f0f2f5] text-[#6b7280] hover:bg-[#e8eaef] dark:bg-[#222536] dark:text-[#8b90a7] dark:hover:bg-[#2a2d3f]'
                    }`}
                  >
                    {content.tabs.readme}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:text-[#8b90a7] dark:hover:bg-[#222536]"
                  aria-label="Cerrar"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>

              <LanguageToggle lang={lang} onChange={setLang} />
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${tab}-${lang}`}
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {tab === 'sobre' ? (
                    <SobreTab content={content} lang={lang} />
                  ) : (
                    <ReadmeTab content={content} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  )
}
