import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('horecaso_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('horecaso_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export function login(email, password) {
  return api.post('/auth/login', { email, password })
}

export function getPerfil() {
  return api.get('/auth/perfil')
}

export function getMesas() {
  return api.get('/mesas')
}

export function getDashboardDirector() {
  return api.get('/dashboard/director')
}

export function getCierreDia(fecha) {
  const params = fecha ? { fecha } : {}
  return api.get('/dashboard/cierre-dia', { params })
}

/** GET /tpv/carta — productos agrupados por categoría */
export function getCartaAgrupada() {
  return api.get('/tpv/carta')
}

/**
 * POST /tpv/tickets — body { mesa_id, outlet_id }.
 * Resuelve outlet_id desde la mesa vía GET /mesas.
 */
export async function createTicket(mesa_id) {
  const mesasRes = await getMesas()
  const mesas = Array.isArray(mesasRes.data) ? mesasRes.data : []
  const mesa = mesas.find((m) => String(m.id) === String(mesa_id))
  if (!mesa?.outlet_id) {
    throw new Error('No se encontró outlet para esta mesa')
  }
  return api.post('/tpv/tickets', {
    mesa_id,
    outlet_id: mesa.outlet_id,
  })
}

export function getTicketsAbiertos() {
  return api.get('/tpv/tickets/abiertos')
}

export function getTicket(ticket_id) {
  return api.get(`/tpv/tickets/${ticket_id}`)
}

export function addLinea(ticket_id, producto_id, cantidad) {
  return api.post(`/tpv/tickets/${ticket_id}/lineas`, {
    producto_id,
    cantidad,
  })
}

export function deleteLinea(ticket_id, linea_id) {
  return api.delete(`/tpv/tickets/${ticket_id}/lineas/${linea_id}`)
}

export function cobrarTicket(ticket_id, metodo_pago) {
  return api.post(`/tpv/tickets/${ticket_id}/cobrar`, { metodo_pago })
}

export default api
