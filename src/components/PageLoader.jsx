// Fallback mostrato mentre il chunk di una pagina (lazy) viene caricato.
// Spinner minimale in tinta con l'accento, centrato nell'area disponibile.
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="w-8 h-8 rounded-full animate-spin border-2 border-[var(--track)] border-t-[color:var(--accent)]"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}

export default PageLoader
