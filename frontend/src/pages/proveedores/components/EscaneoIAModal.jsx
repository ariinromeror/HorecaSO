import { useMemo, useState } from 'react'
import { Loader2, ScanLine, Upload, X } from 'lucide-react'
import {
  createFacturaProveedor,
  escanearFacturaIA,
} from '../../../services/api'
import { BTN_PRIMARY_FACTURAS, hoyISO } from '../constants'
import EscaneoIAEdicionLineas from './EscaneoIAEdicionLineas'

export default function EscaneoIAModal({
  proveedores,
  articulos,
  escaneando,
  setEscaneando,
  resultadoIA,
  setResultadoIA,
  onClose,
  onGuardado,
  onError,
}) {
  const [file, setFile] = useState(null)
  const [proveedorIA, setProveedorIA] = useState('')
  const [numeroFactura, setNumeroFactura] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [fechaVenc, setFechaVenc] = useState('')
  const [lineasEdit, setLineasEdit] = useState([])
  const [saving, setSaving] = useState(false)

  const syncLineasFromResult = (data) => {
    const raw = Array.isArray(data?.lineas) ? data.lineas : []
    setLineasEdit(
      raw.map((ln) => ({
        descripcion: String(ln.descripcion ?? ''),
        cantidad: String(ln.cantidad ?? ''),
        precio_unitario: String(ln.precio_unitario ?? ''),
        subtotal: String(ln.subtotal ?? ''),
        articulo_id: '',
      }))
    )
    setNumeroFactura(data?.numero_factura || '')
    if (data?.fecha && /^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) {
      setFecha(data.fecha)
    }
  }

  const totalIA = useMemo(() => {
    let s = 0
    for (const ln of lineasEdit) {
      const sub = parseFloat(String(ln.subtotal).replace(',', '.'))
      if (!Number.isNaN(sub)) s += sub
      else {
        const c = parseFloat(String(ln.cantidad).replace(',', '.')) || 0
        const p = parseFloat(String(ln.precio_unitario).replace(',', '.')) || 0
        s += c * p
      }
    }
    return Math.round(s * 100) / 100
  }, [lineasEdit])

  const escanear = async () => {
    if (!file) {
      onError('Selecciona una imagen')
      return
    }
    setEscaneando(true)
    setResultadoIA(null)
    try {
      const b64 = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result)
        r.onerror = reject
        r.readAsDataURL(file)
      })
      const body = {
        imagen_base64: b64,
        proveedor_id: proveedorIA || undefined,
      }
      const res = await escanearFacturaIA(body)
      const data = res.data
      setResultadoIA(data)
      if (data?.error) {
        onError(data.error)
      }
      syncLineasFromResult(data)
    } catch (e) {
      onError(e.response?.data?.detail || 'Error al escanear')
      setResultadoIA({ error: String(e), lineas: [] })
    } finally {
      setEscaneando(false)
    }
  }

  const updateLineaIA = (i, field, val) => {
    setLineasEdit((l) =>
      l.map((row, j) => (j === i ? { ...row, [field]: val } : row))
    )
  }

  const confirmarGuardar = async () => {
    if (!proveedorIA) {
      onError('Selecciona proveedor')
      return
    }
    const lineasBody = []
    for (const ln of lineasEdit) {
      if (!ln.articulo_id) {
        onError('Asigna un artículo a cada línea')
        return
      }
      const cant = parseFloat(String(ln.cantidad).replace(',', '.'))
      const cu = parseFloat(String(ln.precio_unitario).replace(',', '.'))
      if (!(cant > 0) || cu < 0 || Number.isNaN(cant) || Number.isNaN(cu)) {
        onError('Cantidad y coste inválidos en líneas')
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
        proveedor_id: proveedorIA,
        numero_factura: numeroFactura.trim() || null,
        fecha,
        fecha_vencimiento: fechaVenc || null,
        total: totalIA,
        lineas: lineasBody,
      })
      onGuardado()
    } catch (e) {
      onError(e.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="flex items-center justify-between border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
            <ScanLine size={22} strokeWidth={1.5} />
            Escanear con IA
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <p className="text-sm text-[#6b7280] dark:text-[#8b90a7]">
            Sube una foto de la factura
          </p>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#e2e5ed] py-8 dark:border-[#2e3347]">
            <Upload size={32} strokeWidth={1.5} className="text-amber-500" />
            <span className="text-sm text-[#111827] dark:text-[#e8eaf0]">
              {file ? file.name : 'Elegir imagen'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button
            type="button"
            disabled={escaneando || !file}
            onClick={escanear}
            className={`${BTN_PRIMARY_FACTURAS} w-full`}
          >
            {escaneando ? (
              <>
                <Loader2 className="animate-spin" size={18} strokeWidth={1.5} />
                Analizando factura...
              </>
            ) : (
              <>
                <ScanLine size={18} strokeWidth={1.5} />
                Escanear con IA
              </>
            )}
          </button>

          {resultadoIA?.error && lineasEdit.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {resultadoIA.error}. Puedes crear la factura manualmente con
              &quot;Nueva factura&quot;.
            </p>
          ) : null}

          {lineasEdit.length > 0 || resultadoIA?.lineas?.length ? (
            <EscaneoIAEdicionLineas
              proveedores={proveedores}
              articulos={articulos}
              proveedorIA={proveedorIA}
              setProveedorIA={setProveedorIA}
              numeroFactura={numeroFactura}
              setNumeroFactura={setNumeroFactura}
              fecha={fecha}
              setFecha={setFecha}
              fechaVenc={fechaVenc}
              setFechaVenc={setFechaVenc}
              lineasEdit={lineasEdit}
              updateLineaIA={updateLineaIA}
              totalIA={totalIA}
              saving={saving}
              confirmarGuardar={confirmarGuardar}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
