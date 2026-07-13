// Feature flag di UI. Sezioni pronte ma non ancora esposte all'utente.
// Per RENDERE VISIBILE una feature basta mettere il suo flag a `true`.
export const FEATURES = {
  // Misure corporee (girovita, massa magra/grassa, circonferenze...).
  // Nascosta finché non integrata con peso, palestra e alimentazione:
  // la rotta /misure esiste già, ma nessun link la mostra finché è false.
  bodyMeasures: false,
}
