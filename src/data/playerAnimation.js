// Parametri delle animazioni del Workout Player, in un punto solo.
//
// Perche' qui e non sparsi fra CSS e componenti: la slide dell'esercizio e il bordo
// luminoso devono iniziare e finire NELLO STESSO ISTANTE, altrimenti si percepiscono
// come due animazioni separate invece che come un unico gesto. Tenere la durata in due
// posti diverse la farebbe divergere alla prima modifica.
//
// Il valore viene passato al CSS come variabile `--player-anim` sul contenitore del
// player (vedi WorkoutPlayer), quindi questa e' l'UNICA sorgente di verita': cambiando
// il numero qui si muovono insieme bordo e slide.
export const PLAYER_ANIM_MS = 500

// Colore associato a ciascuna azione. Governa sia la tinta dell'icona sia il bordo
// luminoso che compare alla pressione: premendo "salta" l'utente vede rosso ovunque,
// premendo "conferma" vede verde, quindi il feedback e' immediatamente riconoscibile.
//
// Per aggiungere una nuova azione animata bastano una voce qui e un PlayerActionButton:
// non serve toccare ne' l'hook ne' il componente del bordo.
export const ACTION_COLORS = {
  skip: '#ef4444',    // salta la serie
  confirm: '#22c55e', // serie completata
}
