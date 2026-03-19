export default function Loader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f6f9] dark:bg-[#0f1117]">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"
        aria-hidden
      />
      <p className="mt-4 text-[#6b7280] dark:text-[#8b90a7]">Cargando...</p>
    </div>
  )
}
