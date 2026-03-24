import { Check } from 'lucide-react'
import {
  BTN_PRIMARY_FACTURAS,
  formatEuro,
  INPUT_FACTURAS,
} from '../constants'

export default function EscaneoIAEdicionLineas({
  proveedores,
  articulos,
  proveedorIA,
  setProveedorIA,
  numeroFactura,
  setNumeroFactura,
  fecha,
  setFecha,
  fechaVenc,
  setFechaVenc,
  lineasEdit,
  updateLineaIA,
  totalIA,
  saving,
  confirmarGuardar,
}) {
  return (
    <>
      <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
        Proveedor (asignar) *
        <select
          value={proveedorIA}
          onChange={(e) => setProveedorIA(e.target.value)}
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
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
          Fecha
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={`${INPUT_FACTURAS} mt-1`}
          />
        </label>
        <label className="text-xs font-medium text-[#6b7280] dark:text-[#8b90a7]">
          Vencimiento
          <input
            type="date"
            value={fechaVenc}
            onChange={(e) => setFechaVenc(e.target.value)}
            className={`${INPUT_FACTURAS} mt-1`}
          />
        </label>
      </div>
      <p className="text-sm font-semibold text-[#111827] dark:text-[#e8eaf0]">
        Líneas detectadas (corrige y asigna artículo)
      </p>
      {lineasEdit.map((ln, i) => (
        <div
          key={i}
          className="space-y-2 rounded-lg border border-[#e2e5ed] p-3 dark:border-[#2e3347]"
        >
          <input
            value={ln.descripcion}
            onChange={(e) =>
              updateLineaIA(i, 'descripcion', e.target.value)
            }
            placeholder="Descripción"
            className={INPUT_FACTURAS}
          />
          <select
            value={ln.articulo_id}
            onChange={(e) =>
              updateLineaIA(i, 'articulo_id', e.target.value)
            }
            className={INPUT_FACTURAS}
          >
            <option value="">Artículo *</option>
            {articulos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-1">
            <input
              value={ln.cantidad}
              onChange={(e) =>
                updateLineaIA(i, 'cantidad', e.target.value)
              }
              placeholder="Cant."
              className={INPUT_FACTURAS}
            />
            <input
              value={ln.precio_unitario}
              onChange={(e) =>
                updateLineaIA(i, 'precio_unitario', e.target.value)
              }
              placeholder="P. unit"
              className={INPUT_FACTURAS}
            />
            <input
              value={ln.subtotal}
              onChange={(e) =>
                updateLineaIA(i, 'subtotal', e.target.value)
              }
              placeholder="Subtotal"
              className={INPUT_FACTURAS}
            />
          </div>
        </div>
      ))}
      <p className="text-lg font-bold text-amber-500">
        Total: {formatEuro(totalIA)}
      </p>
      <button
        type="button"
        disabled={saving}
        onClick={confirmarGuardar}
        className={`${BTN_PRIMARY_FACTURAS} w-full`}
      >
        <Check size={18} strokeWidth={1.5} />
        Confirmar y guardar
      </button>
    </>
  )
}
