/** Base API (misma que axios en api.js). */
export function apiBaseUrl() {
  return (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
}

/**
 * Descarga PDF: fetch blob + abrir pestaña. Token = horecaso_token (AuthContext).
 * Patrón reportes: feedback de error inline 3s.
 */
export async function descargarPdf(endpoint, setLoading, setError) {
  setLoading(true)
  setError(null)
  try {
    const token = localStorage.getItem('horecaso_token')
    const res = await fetch(`${apiBaseUrl()}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Error al generar PDF')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Error al generar PDF')
    setTimeout(() => setError(null), 3000)
  } finally {
    setLoading(false)
  }
}
