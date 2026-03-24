import { useState } from 'react'
import { X } from 'lucide-react'
import { createProveedor, updateProveedor } from '../../../services/api'
import { BTN_PRIMARY_PROVEEDOR, INPUT_PROVEEDOR } from '../constants'

export default function ProveedorModal({
  initial,
  onClose,
  onGuardado,
  onError,
}) {
  const [nombre, setNombre] = useState(initial?.nombre || '')
  const [nif, setNif] = useState(initial?.nif || '')
  const [email, setEmail] = useState(initial?.email || '')
  const [telefono, setTelefono] = useState(initial?.telefono || '')
  const [direccion, setDireccion] = useState(initial?.direccion || '')
  const [condicionesPago, setCondicionesPago] = useState(
    initial?.condiciones_pago || ''
  )
  const [diasEntrega, setDiasEntrega] = useState(
    String(initial?.dias_entrega ?? 1)
  )
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      onError('El nombre es obligatorio')
      return
    }
    const de = parseInt(diasEntrega, 10)
    const body = {
      nombre: nombre.trim(),
      nif: nif.trim() || null,
      email: email.trim() || null,
      telefono: telefono.trim() || null,
      direccion: direccion.trim() || null,
      condiciones_pago: condicionesPago.trim() || null,
      dias_entrega: Number.isNaN(de) ? 1 : de,
    }
    setSaving(true)
    try {
      if (initial?.id) {
        await updateProveedor(initial.id, body)
      } else {
        await createProveedor(body)
      }
      onGuardado()
    } catch (e) {
      onError(e.response?.data?.detail || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[#e2e5ed] bg-white shadow-xl dark:border-[#2e3347] dark:bg-[#1a1d27]">
        <div className="flex items-center justify-between border-b border-[#e2e5ed] p-4 dark:border-[#2e3347]">
          <h2 className="text-lg font-bold text-[#111827] dark:text-[#e8eaf0]">
            {initial?.id ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#6b7280] hover:bg-[#f0f2f5] dark:hover:bg-[#222536]"
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Nombre *
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={`${INPUT_PROVEEDOR} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            NIF
            <input value={nif} onChange={(e) => setNif(e.target.value)} className={`${INPUT_PROVEEDOR} mt-1`} />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${INPUT_PROVEEDOR} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Teléfono
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={`${INPUT_PROVEEDOR} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Dirección
            <textarea
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              rows={3}
              className={`${INPUT_PROVEEDOR} mt-1 resize-y`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Condiciones de pago
            <input
              value={condicionesPago}
              onChange={(e) => setCondicionesPago(e.target.value)}
              placeholder="30 días, contado..."
              className={`${INPUT_PROVEEDOR} mt-1`}
            />
          </label>
          <label className="block text-sm font-medium text-[#111827] dark:text-[#e8eaf0]">
            Días entrega
            <input
              type="number"
              min={1}
              value={diasEntrega}
              onChange={(e) => setDiasEntrega(e.target.value)}
              className={`${INPUT_PROVEEDOR} mt-1`}
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className={`${BTN_PRIMARY_PROVEEDOR} mt-2 w-full`}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
