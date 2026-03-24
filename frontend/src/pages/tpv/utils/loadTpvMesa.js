import {
  createTicket,
  getCartaAgrupada,
  getTicket,
  getTicketsAbiertos,
} from '../../../services/api'
import { MESA_OCUPADA_SIN_TICKET_MSG } from '../constants'

/** isCancelled: lee el flag del efecto (let cancelled = false). */
export async function loadTpvMesa({
  mesaId,
  isCancelled,
  setCarta,
  setCategActiva,
  setTicket,
  setError,
}) {
  const cartaRes = await getCartaAgrupada()
  if (isCancelled()) return
  const cartaData = Array.isArray(cartaRes.data) ? cartaRes.data : []
  setCarta(cartaData)
  setCategActiva(0)

  const abiertosRes = await getTicketsAbiertos()
  if (isCancelled()) return
  const abiertos = Array.isArray(abiertosRes.data)
    ? abiertosRes.data
    : []
  const existente = abiertos.find(
    (t) => String(t.mesa_id) === String(mesaId)
  )

  if (existente) {
    const full = await getTicket(existente.id)
    if (!isCancelled()) setTicket(full.data)
  } else {
    try {
      const created = await createTicket(mesaId)
      if (isCancelled()) return
      const full = await getTicket(created.data.id)
      if (!isCancelled()) setTicket(full.data)
    } catch (e) {
      if (
        e.response?.data?.detail === 'Mesa ya ocupada' &&
        !isCancelled()
      ) {
        const again = await getTicketsAbiertos()
        const lista = Array.isArray(again.data) ? again.data : []
        const t = lista.find(
          (x) => String(x.mesa_id) === String(mesaId)
        )
        if (t) {
          const full = await getTicket(t.id)
          if (!isCancelled()) setTicket(full.data)
        } else {
          setError(MESA_OCUPADA_SIN_TICKET_MSG)
        }
      } else if (!isCancelled()) {
        setError(
          e.response?.data?.detail ||
            e.message ||
            'No se pudo crear el ticket'
        )
      }
    }
  }
}
