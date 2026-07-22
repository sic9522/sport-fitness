import { describe, it, expect } from 'vitest'
import {
  buildSteps, exerciseCount, stepLabel, nextIndex, progressAt, elapsedMinutes, formatElapsed,
  hexHue, isReddish, ringColor, restState, currentStepInfo,
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
