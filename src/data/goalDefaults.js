export const DEFAULT_GOALS = {
  daily: [
    { id: 'g1', emoji: '🔥', title: 'Calorie consumate',  current: 1450,  target: 2000,  unit: 'kcal'     },
    { id: 'g2', emoji: '💧', title: 'Acqua bevuta',        current: 1.2,   target: 2.5,   unit: 'L'        },
    { id: 'g3', emoji: '💪', title: 'Minuti allenamento',  current: 35,    target: 60,    unit: 'min'      },
  ],
  weekly: [
    { id: 'g4', emoji: '🏋️', title: 'Sessioni palestra',  current: 2,     target: 4,     unit: 'sessioni' },
    { id: 'g5', emoji: '📉', title: 'Calorie settimanali', current: 10200, target: 14000, unit: 'kcal'     },
  ],
  monthly: [
    { id: 'g6', emoji: '🎯', title: 'Perdere peso',   current: 3.1, target: 5, unit: 'kg' },
    { id: 'g7', emoji: '💪', title: 'Massa muscolare', current: 0.8, target: 3, unit: 'kg' },
  ],
}
