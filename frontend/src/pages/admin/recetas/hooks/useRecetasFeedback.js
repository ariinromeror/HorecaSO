import { useEffect, useState } from 'react'

/** Errores se mantienen más tiempo para que se vean con listas vacías. */
export function useRecetasFeedback() {
  const [feedback, setFeedback] = useState(null)
  useEffect(() => {
    if (!feedback) return undefined
    const ms = feedback.type === 'error' ? 10000 : 3000
    const t = setTimeout(() => setFeedback(null), ms)
    return () => clearTimeout(t)
  }, [feedback])
  return [feedback, setFeedback]
}
