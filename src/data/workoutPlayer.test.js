import { describe, it, expect } from 'vitest'
import {
  buildSteps, exerciseCount, stepLabel, nextIndex, progressAt, elapsedMinutes, formatElapsed,
  hexHue, isReddish, ringColor, restState, currentStepInfo,
  completedExerciseCount, completedReps, nextStep,
} from './workoutPlayer'

// Traduzione finta: restituisce chiave e parametri, così i test verificano la LOGICA
// dell'etichetta senza dipendere dai testi tradotti.
const t = (k, p = {}) => `${k}(${Object.values(p).join(',')})`

const exNoSplit = { id: 'a', titolo: 'Panca piana', serie: '3', reps: '10', kg: '80' }
const exSplit = {
  id: 'b', titolo: 'Squat', serie: '3', split: true, reps: '12', kg: '60',
  sets: [{ reps: '12', kg: '60' }, { reps: '10', kg: '70' }, { reps: '8', kg: '80' }],
}

describe('buildSteps', () => {
  it('espande ogni esercizio in una serie per passo', () => {
    const steps = buildSteps({ esercizi: [exNoSplit] })
    expect(steps).toHaveLength(3)
    expect(steps.map(s => s.setIndex)).toEqual([0, 1, 2])
    expect(steps.every(s => s.setCount === 3)).toBe(true)
  })

  it('senza split tutte le serie condividono carico e ripetizioni', () => {
    const steps = buildSteps({ esercizi: [exNoSplit] })
    expect(steps.map(s => s.kg)).toEqual(['80', '80', '80'])
    expect(steps.map(s => s.reps)).toEqual(['10', '10', '10'])
  })

  it('con split ogni serie porta i propri valori', () => {
    const steps = buildSteps({ esercizi: [exSplit] })
    expect(steps.map(s => s.kg)).toEqual(['60', '70', '80'])
    expect(steps.map(s => s.reps)).toEqual(['12', '10', '8'])
    expect(steps.every(s => s.isSplit)).toBe(true)
  })

  it('concatena piu esercizi nell ordine della scheda', () => {
    const steps = buildSteps({ esercizi: [exNoSplit, exSplit] })
    expect(steps).toHaveLength(6)
    expect(steps[0].nome).toBe('Panca piana')
    expect(steps[3].nome).toBe('Squat')
    expect(steps.map(s => s.exerciseIndex)).toEqual([0, 0, 0, 1, 1, 1])
  })

  it('le chiavi sono uniche: servono a React come identita di riga', () => {
    const steps = buildSteps({ esercizi: [exNoSplit, exSplit] })
    expect(new Set(steps.map(s => s.key)).size).toBe(steps.length)
  })

  it('porta la foto quando c e, altrimenti null per il segnaposto', () => {
    const steps = buildSteps({ esercizi: [{ ...exNoSplit, foto: 'data:image/png;base64,x' }] })
    expect(steps[0].foto).toBe('data:image/png;base64,x')
    expect(buildSteps({ esercizi: [exNoSplit] })[0].foto).toBeNull()
  })

  it('scheda vuota o assente produce una sequenza vuota, non un errore', () => {
    expect(buildSteps(null)).toEqual([])
    expect(buildSteps({})).toEqual([])
    expect(buildSteps({ esercizi: [] })).toEqual([])
  })
})

describe('exerciseCount', () => {
  it('conta gli esercizi distinti, non le serie', () => {
    expect(exerciseCount(buildSteps({ esercizi: [exNoSplit, exSplit] }))).toBe(2)
    expect(exerciseCount([])).toBe(0)
  })
})

describe('stepLabel', () => {
  it('senza split mostra solo la serie', () => {
    const [s] = buildSteps({ esercizi: [exNoSplit] })
    expect(stepLabel(s, t)).toBe('player.setOf(1,3)')
  })

  it('con split indica anche quale split si sta eseguendo', () => {
    const steps = buildSteps({ esercizi: [exSplit] })
    expect(stepLabel(steps[1], t)).toBe('player.split(2) · player.setOf(2,3)')
  })

  it('passo assente non esplode', () => {
    expect(stepLabel(null, t)).toBe('')
  })
})

describe('nextIndex', () => {
  it('avanza finche ci sono passi', () => {
    const steps = buildSteps({ esercizi: [exNoSplit] })
    expect(nextIndex(0, steps)).toBe(1)
    expect(nextIndex(1, steps)).toBe(2)
  })

  it('sull ultimo passo restituisce null: e la fine dell allenamento', () => {
    const steps = buildSteps({ esercizi: [exNoSplit] })
    expect(nextIndex(2, steps)).toBeNull()
  })
})

describe('progressAt', () => {
  it('va da 0 a 1', () => {
    const steps = buildSteps({ esercizi: [exNoSplit] })
    expect(progressAt(0, steps)).toBe(0)
    expect(progressAt(3, steps)).toBe(1)
  })

  it('sequenza vuota non divide per zero', () => {
    expect(progressAt(0, [])).toBe(0)
  })
})

describe('elapsedMinutes / formatElapsed', () => {
  it('arrotonda i minuti trascorsi', () => {
    expect(elapsedMinutes(0, 90_000)).toBe(2) // 1,5 min → 2
    expect(elapsedMinutes(0, 60_000)).toBe(1)
  })

  it('orologio indietro o inizio assente danno 0, mai un negativo', () => {
    expect(elapsedMinutes(90_000, 0)).toBe(0)
    expect(elapsedMinutes(null, 0)).toBe(0)
  })

  it('formatta mm:ss', () => {
    expect(formatElapsed(0, 0)).toBe('00:00')
    expect(formatElapsed(0, 95_000)).toBe('01:35')
  })
})

describe('hexHue / isReddish', () => {
  it('riconosce le tinte principali', () => {
    expect(hexHue('#ff0000')).toBe(0)
    expect(hexHue('#00ff00')).toBe(120)
    expect(hexHue('#0000ff')).toBe(240)
  })

  it('un accento rosso e riconosciuto come tale', () => {
    expect(isReddish('#ef4444')).toBe(true)
    expect(isReddish('#ff3b30')).toBe(true)
  })

  it('gli accenti della palette NON sono rossi', () => {
    expect(isReddish('#ccff00')).toBe(false) // lime
    expect(isReddish('#2f6fed')).toBe(false) // cobalto
    expect(isReddish('#0fb5a5')).toBe(false) // teal
    expect(isReddish('#7c74f0')).toBe(false) // indaco
  })

  it('valori non validi non esplodono', () => {
    expect(hexHue('')).toBeNull()
    expect(hexHue(null)).toBeNull()
    expect(isReddish('xyz')).toBe(false)
  })
})

describe('ringColor', () => {
  const lime = '#ccff00'
  const red = '#ef4444'

  it('accento normale: base, poi rosso negli ultimi 5s, poi giallo in cronometro', () => {
    expect(ringColor(lime, { overtime: false, secondsLeft: 30 })).toBe(lime)
    expect(ringColor(lime, { overtime: false, secondsLeft: 5 })).toBe('#ef4444')
    expect(ringColor(lime, { overtime: false, secondsLeft: 1 })).toBe('#ef4444')
    expect(ringColor(lime, { overtime: true, secondsLeft: 0 })).toBe('#f59e0b')
  })

  it('accento ROSSO: gli ultimi 5s diventano gialli e il cronometro verde', () => {
    expect(ringColor(red, { overtime: false, secondsLeft: 30 })).toBe(red)
    expect(ringColor(red, { overtime: false, secondsLeft: 4 })).toBe('#f59e0b')
    expect(ringColor(red, { overtime: true, secondsLeft: 0 })).toBe('#22c55e')
  })

  it('il sesto secondo prima della fine e ancora base', () => {
    expect(ringColor(lime, { overtime: false, secondsLeft: 6 })).toBe(lime)
  })
})

describe('restState', () => {
  it('countdown: secondi rimasti e frazione che cala', () => {
    const st = restState(0, 60, 20_000) // 20s trascorsi su 60
    expect(st.overtime).toBe(false)
    expect(st.secondsLeft).toBe(40)
    expect(st.fraction).toBeCloseTo(40 / 60, 5)
  })

  it('a fine countdown passa in overtime e conta all insu', () => {
    const st = restState(0, 60, 63_000) // 3s oltre
    expect(st.overtime).toBe(true)
    expect(st.secondsLeft).toBe(0)
    expect(st.overSec).toBe(3)
    expect(st.fraction).toBe(1)
  })

  it('recupero nullo: subito overtime, niente divisione per zero', () => {
    const st = restState(0, 0, 1000)
    expect(st.overtime).toBe(true)
    expect(st.fraction).toBe(1)
  })
})

describe('currentStepInfo', () => {
  it('numera gli ESERCIZI distinti, non le serie', () => {
    // esercizio A con 3 serie, poi esercizio B: la 1a serie di B è "esercizio 2"
    const session = { index: 3, phase: 'exercise', steps: buildSteps({ esercizi: [exNoSplit, exSplit] }) }
    const info = currentStepInfo(session)
    expect(info.exerciseNumber).toBe(2)   // NON 4
    expect(info.reps).toBe('12')          // prima serie dello split
  })

  it('nella prima serie del primo esercizio è "1"', () => {
    const session = { index: 0, phase: 'rest', steps: buildSteps({ esercizi: [exNoSplit] }) }
    expect(currentStepInfo(session).exerciseNumber).toBe(1)
  })

  it('sessione o passo assente → null', () => {
    expect(currentStepInfo(null)).toBeNull()
    expect(currentStepInfo({ index: 9, steps: [] })).toBeNull()
  })
})

describe('completedExerciseCount (solo esercizi svolti per intero)', () => {
  const withSets = n => buildSteps({ esercizi: [{ ...exNoSplit, serie: String(n) }] })

  it('serve completare TUTTE le serie', () => {
    expect(completedExerciseCount(withSets(3), [0, 1, 2])).toBe(1)
    expect(completedExerciseCount(withSets(3), [0, 1])).toBe(0) // 2 su 3 non basta piu'
    expect(completedExerciseCount(withSets(3), [0])).toBe(0)
  })

  it('un esercizio saltato del tutto non conta', () => {
    expect(completedExerciseCount(withSets(4), [])).toBe(0)
  })

  it('esempio: 3 esercizi, ne svolgo 1 e salto gli altri 2 -> 1', () => {
    const tre = buildSteps({
      esercizi: [
        { id: 'a', serie: '2', reps: '10', kg: '20' },
        { id: 'b', serie: '2', reps: '10', kg: '20' },
        { id: 'c', serie: '2', reps: '10', kg: '20' },
      ],
    })
    // completate solo le due serie del primo esercizio (indici 0 e 1)
    expect(completedExerciseCount(tre, [0, 1])).toBe(1)
  })

  it('conta ESERCIZI, non serie: tre serie restano un esercizio', () => {
    const steps = buildSteps({ esercizi: [exNoSplit, exSplit] })
    expect(completedExerciseCount(steps, [0, 1, 2])).toBe(1)
    expect(completedExerciseCount(steps, [0, 1, 2])).toBeLessThan(exerciseCount(steps))
  })

  it('piu esercizi completati per intero si sommano', () => {
    const steps = buildSteps({ esercizi: [exNoSplit, exSplit] })
    expect(completedExerciseCount(steps, [0, 1, 2, 3, 4, 5])).toBe(2)
  })

  it('nessuna serie completata: nessun esercizio svolto', () => {
    expect(completedExerciseCount(withSets(3), [])).toBe(0)
    expect(completedExerciseCount([], [])).toBe(0)
  })
})
describe('nextStep', () => {
  const steps = buildSteps({ esercizi: [exNoSplit] })

  it('restituisce il passo successivo', () => {
    expect(nextStep({ index: 0, steps }).setIndex).toBe(1)
  })

  it('sull ultimo passo restituisce null', () => {
    expect(nextStep({ index: steps.length - 1, steps })).toBeNull()
  })
})

describe('completedReps (somma diretta delle serie confermate)', () => {
  const withSets = n => buildSteps({ esercizi: [{ ...exNoSplit, serie: String(n) }] })

  it('conta le ripetizioni delle SOLE serie confermate', () => {
    // 3 serie da 10: confermandone 1 si segnano 10 ripetizioni, non 0 e non 30
    expect(completedReps(withSets(3), [0])).toBe(10)
    expect(completedReps(withSets(3), [0, 1])).toBe(20)
    expect(completedReps(withSets(3), [0, 1, 2])).toBe(30)
  })

  it('una sola serie su tre conta comunque: niente soglia qui', () => {
    // caso dell'esempio: 8 ripetizioni per serie, 1 su 3 -> 8 (non 0)
    const steps = buildSteps({ esercizi: [{ ...exNoSplit, serie: '3', reps: '8' }] })
    expect(completedReps(steps, [0])).toBe(8)
  })

  it('con split somma le ripetizioni REALI della serie svolta', () => {
    // esercizio B = 12/10/8 agli indici 3-5
    const steps = buildSteps({ esercizi: [exNoSplit, exSplit] })
    expect(completedReps(steps, [3])).toBe(12)
    expect(completedReps(steps, [3, 5])).toBe(20) // 12 + 8
  })

  it('somma attraverso esercizi diversi', () => {
    const steps = buildSteps({ esercizi: [exNoSplit, exSplit] })
    expect(completedReps(steps, [0, 3])).toBe(22) // 10 + 12
  })

  it('nessuna serie confermata: zero', () => {
    expect(completedReps(withSets(3), [])).toBe(0)
    expect(completedReps([], [])).toBe(0)
  })
})

describe('badge vs percentuale: due misure indipendenti', () => {
  // Scheda dell'esempio: 8 esercizi da 24 ripetizioni ciascuno (192 totali).
  // 4 esercizi completati per intero, 4 fermi a meta' delle serie.
  const scheda = {
    esercizi: [
      { id: 'e1', serie: '3', reps: '8', kg: '20' },  // 24 rip
      { id: 'e2', serie: '4', reps: '6', kg: '20' },  // 24 rip
      { id: 'e3', serie: '3', reps: '8', kg: '20' },  // 24 rip
      { id: 'e4', serie: '4', reps: '6', kg: '20' },  // 24 rip
      { id: 'e5', serie: '4', reps: '6', kg: '20' },
      { id: 'e6', serie: '4', reps: '6', kg: '20' },
      { id: 'e7', serie: '4', reps: '6', kg: '20' },
      { id: 'e8', serie: '4', reps: '6', kg: '20' },
    ],
  }
  const steps = buildSteps(scheda)

  // indici: e1 0-2, e2 3-6, e3 7-9, e4 10-13, e5 14-17, e6 18-21, e7 22-25, e8 26-29
  const completed = [
    0, 1, 2,              // e1 intero
    3, 4, 5, 6,           // e2 intero
    7, 8, 9,              // e3 intero
    10, 11, 12, 13,       // e4 intero
    14, 15,               // e5 meta'
    18, 19,               // e6 meta'
    22, 23,               // e7 meta'
    26, 27,               // e8 meta'
  ]

  it('il BADGE conta solo gli esercizi completati per intero: 4 su 8', () => {
    expect(completedExerciseCount(steps, completed)).toBe(4)
  })

  it('la PERCENTUALE pesa le ripetizioni: 144 su 192 = 75%', () => {
    const totale = steps.reduce((s, x) => s + Number(x.reps), 0)
    expect(totale).toBe(192)
    expect(completedReps(steps, completed)).toBe(144)
    expect(Math.round((144 / totale) * 100)).toBe(75)
  })

  it('le due misure DEVONO poter divergere: 4/8 esercizi ma 75% di lavoro', () => {
    const perEsercizi = completedExerciseCount(steps, completed) / 8      // 0,50
    const perRipetizioni = completedReps(steps, completed) / 192          // 0,75
    expect(perEsercizi).not.toBe(perRipetizioni)
  })
})
