import { BookOpen, Tag } from 'lucide-react'
import AlergenosModal from './components/AlergenosModal'
import CategoriaModal from './components/CategoriaModal'
import CategoriasPanel from './components/CategoriasPanel'
import ProductoModal from './components/ProductoModal'
import ProductosPanel from './components/ProductosPanel'
import { useCarta } from './hooks/useCarta'

export default function CartaPage() {
  const c = useCarta()

  return (
    <div className="min-h-full min-w-0 max-w-full overflow-x-hidden text-[#111827] dark:text-[#e8eaf0]">
      <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#111827] dark:text-[#e8eaf0]">
          Carta del restaurante
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => c.setTab('categorias')}
            className={`flex h-12 items-center gap-2 rounded-lg px-4 text-[15px] font-medium transition-colors ${
              c.tab === 'categorias'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-500'
                : 'bg-[#f0f2f5] text-[#6b7280] dark:bg-[#222536] dark:text-[#8b90a7]'
            }`}
          >
            <Tag size={20} strokeWidth={1.5} />
            Categorías
          </button>
          <button
            type="button"
            onClick={() => c.setTab('productos')}
            className={`flex h-12 items-center gap-2 rounded-lg px-4 text-[15px] font-medium transition-colors ${
              c.tab === 'productos'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-500'
                : 'bg-[#f0f2f5] text-[#6b7280] dark:bg-[#222536] dark:text-[#8b90a7]'
            }`}
          >
            <BookOpen size={20} strokeWidth={1.5} />
            Productos
          </button>
        </div>
      </div>

      {c.feedback ? (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-[15px] ${
            c.feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
          }`}
          role="status"
        >
          {c.feedback.msg}
        </div>
      ) : null}

      {c.tab === 'categorias' ? (
        <CategoriasPanel
          errorCat={c.errorCat}
          loadingCat={c.loadingCat}
          categoriasOrdenadas={c.categoriasOrdenadas}
          openCategoriaModal={c.openCategoriaModal}
          handleDeleteCategoria={c.handleDeleteCategoria}
        />
      ) : (
        <ProductosPanel
          errorProd={c.errorProd}
          loadingProd={c.loadingProd}
          filtroCategoriaId={c.filtroCategoriaId}
          setFiltroCategoriaId={c.setFiltroCategoriaId}
          searchText={c.searchText}
          setSearchText={c.setSearchText}
          categoriasOrdenadas={c.categoriasOrdenadas}
          productosFiltrados={c.productosFiltrados}
          openProductoModal={c.openProductoModal}
          openAlergenosModal={c.openAlergenosModal}
          handleDeleteProducto={c.handleDeleteProducto}
          toggleProductoActivo={c.toggleProductoActivo}
        />
      )}

      <CategoriaModal
        open={c.modal === 'categoria'}
        editingCategoria={c.editingCategoria}
        onClose={() => c.setModal('none')}
        modalMsg={c.modalMsg}
        catForm={c.catForm}
        setCatForm={c.setCatForm}
        submitCategoria={c.submitCategoria}
      />

      <ProductoModal
        open={c.modal === 'producto'}
        editingProducto={c.editingProducto}
        onClose={() => c.setModal('none')}
        modalMsg={c.modalMsg}
        prodForm={c.prodForm}
        setProdForm={c.setProdForm}
        categoriasOrdenadas={c.categoriasOrdenadas}
        submitProducto={c.submitProducto}
      />

      <AlergenosModal
        open={c.modal === 'alergenos'}
        editingProducto={c.editingProducto}
        onClose={() => c.setModal('none')}
        modalMsg={c.modalMsg}
        alergenosList={c.alergenosList}
        alergenosSeleccion={c.alergenosSeleccion}
        toggleAlergeno={c.toggleAlergeno}
        submitAlergenos={c.submitAlergenos}
      />
    </div>
  )
}
