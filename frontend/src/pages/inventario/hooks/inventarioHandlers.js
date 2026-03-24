import {
  createArticulo,
  createMovimiento,
  guardarInventarioFisico,
  updateArticulo,
} from '../../../services/api'
import { differsStock, emptyFormArticulo } from '../constants'

export function createInventarioHandlers(ctx) {
  const openNuevoArticulo = () => {
    ctx.setFormArticulo(emptyFormArticulo())
    ctx.setModalArticulo('new')
  }

  const openEditarArticulo = (a) => {
    ctx.setFormArticulo({
      nombre: a.nombre || '',
      sku: a.sku || '',
      unidad_medida: a.unidad_medida || 'kg',
      stock_minimo: String(a.stock_minimo ?? '0'),
      stock_maximo:
        a.stock_maximo != null ? String(a.stock_maximo) : '',
      coste_unitario:
        a.coste_unitario != null ? String(a.coste_unitario) : '',
      categoria_almacen: a.categoria_almacen || 'otros',
      temperatura_almacen: a.temperatura_almacen || 'ambiente',
    })
    ctx.setModalArticulo(a)
  }

  const submitArticulo = async () => {
    if (!ctx.formArticulo.nombre.trim()) {
      ctx.setFeedback({ msg: 'El nombre es obligatorio', type: 'error' })
      return
    }
    const body = {
      nombre: ctx.formArticulo.nombre.trim(),
      sku: ctx.formArticulo.sku.trim() || null,
      unidad_medida: ctx.formArticulo.unidad_medida,
      stock_minimo: Number(ctx.formArticulo.stock_minimo) || 0,
      stock_maximo: ctx.formArticulo.stock_maximo.trim()
        ? Number(ctx.formArticulo.stock_maximo)
        : null,
      coste_unitario: ctx.formArticulo.coste_unitario.trim()
        ? Number(ctx.formArticulo.coste_unitario)
        : null,
      categoria_almacen: ctx.formArticulo.categoria_almacen || null,
      temperatura_almacen: ctx.formArticulo.temperatura_almacen || null,
    }

    ctx.setSavingArticulo(true)
    try {
      if (ctx.modalArticulo && ctx.modalArticulo !== 'new') {
        const payload = {
          nombre: body.nombre,
          sku: body.sku,
          unidad_medida: body.unidad_medida,
          stock_minimo: body.stock_minimo,
          stock_maximo:
            ctx.formArticulo.stock_maximo.trim() === ''
              ? null
              : body.stock_maximo,
          coste_unitario:
            ctx.formArticulo.coste_unitario.trim() === ''
              ? null
              : body.coste_unitario,
          categoria_almacen: body.categoria_almacen,
          temperatura_almacen: body.temperatura_almacen,
        }
        await updateArticulo(ctx.modalArticulo.id, payload)
        ctx.setFeedback({ msg: 'Artículo actualizado', type: 'ok' })
      } else {
        await createArticulo(body)
        ctx.setFeedback({ msg: 'Artículo creado', type: 'ok' })
      }
      ctx.setModalArticulo(null)
      await ctx.loadArticulos()
      await ctx.loadArticulosOpciones()
      await ctx.loadAlertas()
    } catch (e) {
      ctx.setFeedback({
        msg: e.response?.data?.detail || 'Error al guardar',
        type: 'error',
      })
    } finally {
      ctx.setSavingArticulo(false)
    }
  }

  const openMovimiento = (articulo, tipoPref) => {
    ctx.setFormMovimiento({
      articulo_id: articulo.id,
      tipo: tipoPref,
      cantidad: '',
      motivo: '',
      coste_unitario: '',
    })
    ctx.setModalMovimiento({ articulo, tipo: tipoPref })
  }

  const submitMovimiento = async () => {
    const cant = Number(ctx.formMovimiento.cantidad)
    if (!ctx.formMovimiento.articulo_id || Number.isNaN(cant) || cant <= 0) {
      ctx.setFeedback({ msg: 'Indica una cantidad válida', type: 'error' })
      return
    }
    const body = {
      articulo_id: ctx.formMovimiento.articulo_id,
      tipo: ctx.formMovimiento.tipo,
      cantidad: cant,
      motivo: ctx.formMovimiento.motivo.trim() || null,
      coste_unitario:
        ctx.formMovimiento.tipo === 'entrada' &&
        ctx.formMovimiento.coste_unitario.trim()
          ? Number(ctx.formMovimiento.coste_unitario)
          : null,
    }

    ctx.setSavingMovimiento(true)
    try {
      await createMovimiento(body)
      ctx.setFeedback({ msg: 'Movimiento registrado', type: 'ok' })
      ctx.setModalMovimiento(false)
      await ctx.loadArticulos()
      await ctx.loadArticulosOpciones()
      await ctx.loadAlertas()
      if (ctx.tab === 'movimientos') await ctx.loadMovimientos({})
    } catch (e) {
      ctx.setFeedback({
        msg: e.response?.data?.detail || 'Error al registrar movimiento',
        type: 'error',
      })
    } finally {
      ctx.setSavingMovimiento(false)
    }
  }

  const openInventarioFisico = () => {
    const init = {}
    for (const a of ctx.articulosOpciones) {
      init[a.id] = String(
        a.stock_actual != null ? a.stock_actual : '0'
      )
    }
    ctx.setInventarioFisicoData(init)
    ctx.setModalInventarioFisico(true)
  }

  const submitInventarioFisico = async () => {
    const articulosPayload = []
    for (const a of ctx.articulosOpciones) {
      const raw = ctx.inventarioFisicoData[a.id]
      if (raw === undefined) continue
      if (!differsStock(raw, a.stock_actual)) continue
      const cantidad_real = Number(raw)
      if (Number.isNaN(cantidad_real) || cantidad_real < 0) {
        ctx.setFeedback({
          msg: `Cantidad inválida para ${a.nombre}`,
          type: 'error',
        })
        return
      }
      articulosPayload.push({ articulo_id: a.id, cantidad_real })
    }
    if (!articulosPayload.length) {
      ctx.setFeedback({ msg: 'No hay cambios que guardar', type: 'error' })
      return
    }

    ctx.setSavingInventario(true)
    try {
      await guardarInventarioFisico({ articulos: articulosPayload })
      ctx.setFeedback({
        msg: `Inventario guardado (${articulosPayload.length} artículos)`,
        type: 'ok',
      })
      ctx.setModalInventarioFisico(false)
      await ctx.loadArticulos()
      await ctx.loadArticulosOpciones()
      await ctx.loadAlertas()
      if (ctx.tab === 'movimientos') await ctx.loadMovimientos({})
    } catch (e) {
      ctx.setFeedback({
        msg: e.response?.data?.detail || 'Error al guardar inventario',
        type: 'error',
      })
    } finally {
      ctx.setSavingInventario(false)
    }
  }

  const aplicarFiltrosMovimientos = () => {
    ctx.loadMovimientos({
      articulo_id: ctx.filtroMovArticulo || undefined,
      tipo: ctx.filtroMovTipo || undefined,
      desde: ctx.filtroMovDesde || undefined,
      hasta: ctx.filtroMovHasta || undefined,
    })
  }

  const verTodosAlertas = () => {
    ctx.setTab('articulos')
    ctx.setSoloAlertas(true)
    ctx.setAlertBannerOpen(true)
  }

  return {
    openNuevoArticulo,
    openEditarArticulo,
    submitArticulo,
    openMovimiento,
    submitMovimiento,
    openInventarioFisico,
    submitInventarioFisico,
    aplicarFiltrosMovimientos,
    verTodosAlertas,
  }
}
