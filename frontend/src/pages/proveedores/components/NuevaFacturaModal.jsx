import { useMemo, useState } from 'react'
import { Building2, DollarSign, X } from 'lucide-react'
import { createFacturaProveedor } from '../../../services/api'
import {
  BTN_PRIMARY_FACTURAS,
  formatEuro,
  hoyISO,
  INPUT_FACTURAS,
} from '../constants'

export default function NuevaFacturaModal({
  proveedores,
  articulos,
  onClose,
  onGuardado,
  onError,
}) {
  const [proveedorId, setProveedorId] = useState('')
  const [numeroFactura, setNumeroFactura] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [fechaVenc, setFechaVenc] = useState('')
  const [lineas, setLineas] = useState([
    { articulo_id: '', cantidad: '1', coste_unitario: '' },
  ])
  const [saving, setSaving] = useState(false)

  const totalCalc = useMemo(() => {
    let s = 0
    for (const ln of lineas) {
      const c = parseFloat(String(ln.cantidad).replace(',', '.')) || 0
      const cu = parseFloat(String(ln.coste_unitario).replace(',', '.')) || 0
      s += c * cu
    }
    return Math.round(s * 100) / 100
  }, [lineas])

  const addLinea = () => {
    setLineas((l) => [
      ...l,
      { articulo_id: '', cantidad: '1', coste_unitario: '' },
    ])
  }

  const removeLinea = (i) => {
    setLineas((l) => l.filter((_, j) => j !== i))
  }

  const updateLinea = (i, field, val) => {
    setLineas((l) =>
      l.map((row, j) => (j === i ? { ...row, [field]: val } : row))
    )
  }

  const guardar = async () => {
    if (!proveedorId) {
      onError('Selecciona un proveedor')
      return
    }
    const lineasBody = []
    for (const ln of lineas) {
      if (!ln.articulo_id) {
        onError('Cada línea debe tener artículo')
        return
      }
      const cant = parseFloat(String(ln.cantidad).replace(',', '.'))
      const cu = parseFloat(String(ln.coste_unitario).replace(',', '.'))
      if (!(cant > 0) || cu < 0 || Number.isNaN(cant) || Number.isNaN(cu)) {
        onError('Cantidad y coste unitario inválidos')
        return
      }
      lineasBody.push({
        articulo_id: ln.articulo_id,
        cantidad: cant,
        coste_unitario: cu,
      })
    }
    setSaving(true)
    try {
      await createFacturaProveedor({
        proveedor_id: proveedorId,
        numero_factura: numeroFactura.trim() || null,
        fecha,
        fecha_vencimiento: fechaVenc || null,
        total: totalCalc,
        lineas: lineasBody,
      })
      onGuardado()
    } catch (e) {
      onError(e.response?.data?.detail || 'Error al crear factura')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="flex items-center justify-between border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
            <Building2 size={22} strokeWidth={1.5} />
            Nueva factura
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Proveedor *
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className={`${INPUT_FACTURAS} mt-1`}
            >
              <option value="">—</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Nº factura
            <input
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              className={`${INPUT_FACTURAS} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Fecha *
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={`${INPUT_FACTURAS} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Fecha vencimiento
            <input
              type="date"
              value={fechaVenc}
              onChange={(e) => setFechaVenc(e.target.value)}
              className={`${INPUT_FACTURAS} mt-1`}
            />
          </label>

          <div className="border-t border-[#e2e5ed] pt-3 dark:border-[#2e3347]">
            <p className="mb-2 text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
              Líneas
            </p>
            {lineas.map((ln, i) => (
              <div
                key={i}
                className="mb-3 rounded-lg border border-[#e2e5ed] p-3 dark:border-[#2e3347]"
              >
                <select
                  value={ln.articulo_id}
                  onChange={(e) =>
                    updateLinea(i, 'articulo_id', e.target.value)
                  }
                  className={INPUT_FACTURAS}
                >
                  <option value="">Artículo</option>
                  {articulos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    placeholder="Cantidad"
                    value={ln.cantidad}
                    onChange={(e) =>
                      updateLinea(i, 'cantidad', e.target.value)
                    }
                    className={INPUT_FACTURAS}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Coste u."
                    value={ln.coste_unitario}
                    onChange={(e) =>
                      updateLinea(i, 'coste_unitario', e.target.value)
                    }
                    className={INPUT_FACTURAS}
                  />
                </div>
                {lineas.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeLinea(i)}
                    className="mt-2 text-xs text-red-500"
                  >
                    Eliminar línea
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              onClick={addLinea}
              className="text-sm font-medium text-amber-600 dark:text-amber-400"
            >
              + Añadir línea
            </button>
          </div>

          <p className="flex items-center gap-2 text-lg font-bold text-amber-500">
            <DollarSign size={22} strokeWidth={1.5} />
            Total: {formatEuro(totalCalc)}
          </p>

          <button
            type="button"
            disabled={saving}
            onClick={guardar}
            className={`${BTN_PRIMARY_FACTURAS} w-full`}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
