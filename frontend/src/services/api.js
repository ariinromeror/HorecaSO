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

export function createMesa(body) {
  return api.post('/mesas', body)
}

export function updateMesa(id, body) {
  return api.put(`/mesas/${id}`, body)
}

export function deleteMesa(id) {
  return api.delete(`/mesas/${id}`)
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

/** Venta Live: tickets del día (admin | director | jefe_sala). */
export function getTicketsHoy() {
  return api.get('/tpv/tickets/hoy')
}

/** Detalle ticket con líneas y pagos (roles según backend). */
export function getTicketDetalle(ticketId) {
  return api.get(`/tpv/tickets/${ticketId}/detalle`)
}

/** Venta Live: misma ruta que abiertos (contrato .cursorrules / spec). */
export function getTicketsCobradosHoy() {
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

export function addTicketPago(ticketId, data) {
  return api.post(`/tpv/tickets/${ticketId}/pagos`, data)
}

export function getTicketPagos(ticketId) {
  return api.get(`/tpv/tickets/${ticketId}/pagos`)
}

export function deleteTicketPago(ticketId, pagoId) {
  return api.delete(`/tpv/tickets/${ticketId}/pagos/${pagoId}`)
}

// --- Admin carta (admin | director) ---

export function getAdminCategorias() {
  return api.get('/admin/categorias')
}

export function createAdminCategoria(body) {
  return api.post('/admin/categorias', body)
}

export function updateAdminCategoria(id, body) {
  return api.put(`/admin/categorias/${id}`, body)
}

export function deleteAdminCategoria(id) {
  return api.delete(`/admin/categorias/${id}`)
}

export function getAdminProductos() {
  return api.get('/admin/productos')
}

export function createAdminProducto(body) {
  return api.post('/admin/productos', body)
}

export function updateAdminProducto(id, body) {
  return api.put(`/admin/productos/${id}`, body)
}

export function deleteAdminProducto(id) {
  return api.delete(`/admin/productos/${id}`)
}

export function setProductoAlergenos(productoId, alergeno_ids) {
  return api.post(`/admin/productos/${productoId}/alergenos`, {
    alergeno_ids,
  })
}

export function getAlergenos() {
  return api.get('/alergenos')
}

// --- Admin recetas (admin | director | cocina) ---

export function getRecetasSemaforo() {
  return api.get('/admin/recetas/semaforo')
}

export function getRecetas() {
  return api.get('/admin/recetas')
}

export function createReceta(body) {
  return api.post('/admin/recetas', body)
}

export function updateReceta(id, body) {
  return api.put(`/admin/recetas/${id}`, body)
}

export function getRecetaCoste(id) {
  return api.get(`/admin/recetas/${id}/coste`)
}

export function addIngredienteReceta(recetaId, body) {
  return api.post(`/admin/recetas/${recetaId}/ingredientes`, body)
}

export function deleteIngredienteReceta(recetaId, ingredienteId) {
  return api.delete(
    `/admin/recetas/${recetaId}/ingredientes/${ingredienteId}`
  )
}

/** GET /inventario/articulos — params: buscar, categoria, alerta */
export function getArticulos(params = {}) {
  return api.get('/inventario/articulos', { params })
}

export function createArticulo(body) {
  return api.post('/inventario/articulos', body)
}

export function updateArticulo(id, body) {
  return api.put(`/inventario/articulos/${id}`, body)
}

export function getStockAlertas() {
  return api.get('/inventario/stock-alertas')
}

export function createMovimiento(body) {
  return api.post('/inventario/movimientos', body)
}

/** params: articulo_id, tipo, desde, hasta, limit */
export function getMovimientos(params = {}) {
  return api.get('/inventario/movimientos', { params })
}

export function guardarInventarioFisico(body) {
  return api.post('/inventario/inventario-fisico', body)
}

/** Alias usado en Recetas (sin filtros). */
export function getArticulosInventario() {
  return getArticulos()
}

// --- Proveedores y facturas de compra ---

export function getProveedores(params = {}) {
  return api.get('/proveedores', { params })
}

export function createProveedor(body) {
  return api.post('/proveedores', body)
}

export function updateProveedor(id, body) {
  return api.put(`/proveedores/${id}`, body)
}

export function deleteProveedor(id) {
  return api.delete(`/proveedores/${id}`)
}

export function getProveedorDetalle(id) {
  return api.get(`/proveedores/${id}`)
}

export function getFacturasProveedor(params = {}) {
  return api.get('/facturas-proveedor', { params })
}

export function getFacturaProveedor(id) {
  return api.get(`/facturas-proveedor/${id}`)
}

export function createFacturaProveedor(body) {
  return api.post('/facturas-proveedor', body)
}

export function pagarFactura(id) {
  return api.patch(`/facturas-proveedor/${id}/pagar`, {})
}

export function getFacturasPendientes() {
  return api.get('/facturas-proveedor/pendientes-pago')
}

export function escanearFacturaIA(data) {
  return api.post('/facturas-proveedor/escanear-ia', data)
}

// --- KDS (cocina) ---

export function getKDSComandas() {
  return api.get('/kds/comandas')
}

export function getKDSEstadisticas(params = {}) {
  return api.get('/kds/estadisticas', { params })
}

export function patchKDSLineaEstado(id, estado) {
  return api.patch(`/kds/lineas/${id}/estado`, { estado })
}

export default api
