// Bordo luminoso che avvolge l'AREA CONTENUTO alla pressione di un pulsante.
//
// Va montato dentro un contenitore `relative` che comprenda il solo contenuto della
// pagina: header e navbar restano fuori per scelta, cosi' l'effetto sottolinea cio' che
// e' appena cambiato invece di illuminare la cornice fissa dell'app.
//
// Non intercetta i tocchi (pointer-events-none) e non occupa spazio nel flusso: puo'
// essere aggiunto a qualunque schermata senza toccarne il layout.
//
// L'animazione muove solo `opacity` e `transform`, entrambe accelerate dalla GPU: e' il
// motivo per cui resta fluida anche su telefono, dove animare colori o box-shadow
// costringerebbe il browser a ridipingere a ogni fotogramma.
function EdgeGlow({ glow }) {
  if (!glow) return null

  return (
    <div
      // `run` come chiave: ogni pressione rimonta l'elemento e fa ripartire
      // l'animazione da zero, anche se la precedente non era ancora finita.
      key={glow.run}
      aria-hidden="true"
      className="player-edge-glow pointer-events-none absolute inset-0 z-20 rounded-[28px]"
      style={{ '--glow': glow.color }}
    />
  )
}

export default EdgeGlow
