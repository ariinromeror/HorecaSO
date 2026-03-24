import { useState } from 'react'
import { stripEmojis } from '../../../../utils/textSanitize'

export function useCartaModalOpeners(categoriasOrdenadas, alergenosCache) {
  const [modal, setModal] = useState('none')
  const [editingCategoria, setEditingCategoria] = useState(null)
  const [editingProducto, setEditingProducto] = useState(null)
  const [alergenosSeleccion, setAlergenosSeleccion] = useState([])
  const [catForm, setCatForm] = useState({
    nombre: '',
    icono: '',
    color: '#f59e0b',
    orden: 0,
  })
  const [prodForm, setProdForm] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    categoria_id: '',
    iva_porcentaje: '10',
    activo: true,
  })
  const [modalMsg, setModalMsg] = useState(null)

  const openCategoriaModal = (cat = null) => {
    setModalMsg(null)
    setEditingCategoria(cat)
    if (cat) {
      setCatForm({
        nombre: stripEmojis(cat.nombre || ''),
        icono: stripEmojis(cat.icono || ''),
        color: cat.color || '#f59e0b',
        orden: cat.orden ?? 0,
      })
    } else {
      setCatForm({
        nombre: '',
        icono: '',
        color: '#f59e0b',
        orden: 0,
      })
    }
    setModal('categoria')
  }

  const openProductoModal = (p = null) => {
    setModalMsg(null)
    setEditingProducto(p)
    if (p) {
      setProdForm({
        nombre: p.nombre || '',
        descripcion: p.descripcion || '',
        precio: String(p.precio ?? ''),
        categoria_id: p.categoria_id || '',
        iva_porcentaje: String(
          p.iva_porcentaje === 21 || p.iva_porcentaje === 21.0 ? '21' : '10'
        ),
        activo: p.activo !== false,
        destino_kds: p.destino_kds || 'cocina',
      })
    } else {
      const firstCat = categoriasOrdenadas[0]
      setProdForm({
        nombre: '',
        descripcion: '',
        precio: '',
        categoria_id: firstCat ? String(firstCat.id) : '',
        iva_porcentaje: '10',
        activo: true,
        destino_kds: 'cocina',
      })
    }
    setModal('producto')
  }

  const openAlergenosModal = (p) => {
    setEditingProducto(p)
    setModalMsg(null)
    const cached = alergenosCache[p.id]
    setAlergenosSeleccion(
      cached ? cached.map((x) => Number(x)) : []
    )
    setModal('alergenos')
  }

  const toggleAlergeno = (id) => {
    const n = Number(id)
    setAlergenosSeleccion((prev) =>
      prev.some((x) => Number(x) === n)
        ? prev.filter((x) => Number(x) !== n)
        : [...prev, n]
    )
  }

  return {
    modal,
    setModal,
    editingCategoria,
    editingProducto,
    alergenosSeleccion,
    catForm,
    setCatForm,
    prodForm,
    setProdForm,
    modalMsg,
    setModalMsg,
    openCategoriaModal,
    openProductoModal,
    openAlergenosModal,
    toggleAlergeno,
  }
}
