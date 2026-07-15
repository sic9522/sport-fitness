// Icona "organizza/riordina": numeri a sinistra, linee a destra, allineati.
// Il numero 1 è leggermente più in alto degli altri due → dà la sensazione di un
// elemento sollevato, in fase di spostamento.
//   1 ─────────
//   2 ─────────
//   3 ─────────
// Dimensionata in `em` come le icone react-icons: la misura si controlla con le
// classi di testo (es. `text-lg`) e il colore con `currentColor`.
function ReorderIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      className={className}
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* Righe della lista */}
      <line x1="9" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="9" y1="13" x2="21" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="9" y1="19" x2="21" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

      {/* Numeri: l'1 è alzato di ~2px rispetto alla sua riga */}
      <text x="3.5" y="5" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill="currentColor">1</text>
      <text x="3.5" y="13" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill="currentColor">2</text>
      <text x="3.5" y="19" textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill="currentColor">3</text>
    </svg>
  )
}

export default ReorderIcon
