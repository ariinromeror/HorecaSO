import { useEffect, useState } from 'react'

export function useRecetasFeedback() {
  const [feedback, setFeedback] = useState(null)
  useEffect(() => {
    if (!feedback) return undefined
    const t = setTimeout(() => setFeedback(null), 3000)
    return () => clearTimeout(t)
  }, [feedback])
  return [feedback, setFeedback]
}
