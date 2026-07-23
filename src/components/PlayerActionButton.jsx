// Pulsante d'azione del player: SOLO icona, nessun fondo colorato.
//
// Scelta estetica: il colore pieno su un riquadro grande dominava la schermata e
// competeva con la foto dell'esercizio. Qui il colore resta nell'icona e in un anello
// sottile, e si espande sul bordo della pagina solo nel momento della pressione —
// l'informazione c'e' tutta, ma appare quando serve invece di gridare di continuo.
//
// Il componente NON sa nulla dell'animazione: riceve un onClick e basta. Chi lo usa
// decide se e come far partire il bordo luminoso (vedi useEdgeGlow), cosi' i pulsanti
// restano riutilizzabili anche dove quell'effetto non serve.
function PlayerActionButton({ icon: Icon, color, label, onClick, primary = false }) {
  const size = primary ? 'h-16 w-16' : 'h-14 w-14'
  const iconSize = primary ? 'text-3xl' : 'text-2xl'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        size,
        'group relative flex items-center justify-center rounded-full',
        // Feedback tattile: affonda al tocco e risale, senza cambi di colore bruschi.
        'transition-[transform,background-color,border-color] duration-200 ease-out',
        'active:scale-90 hover:bg-[color:var(--fill-1)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      ].join(' ')}
      style={{
        // Anello sottile nel colore dell'azione: presenza discreta, non un blocco pieno.
        border: `1.5px solid color-mix(in srgb, ${color} 38%, transparent)`,
        color,
        outlineColor: color,
      }}
    >
      <Icon className={`${iconSize} transition-transform duration-200 group-active:scale-95`} />
    </button>
  )
}

export default PlayerActionButton
