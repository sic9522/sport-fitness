// titleKey = nome tradotto per gli obiettivi di default.
// Quando l'utente modifica un titolo, titleKey viene rimosso e resta il testo scritto.
// Le unità sono fisse (vedi UNITS in ImpostazioniObiettivi): Kcal, g, l, min, h.
export const DEFAULT_GOALS = {
  daily: [
    { id: 'g1', emoji: '🔥', title: 'Calorie consumate', titleKey: 'goal.calorieEaten', current: 1450, target: 2000, unit: 'Kcal' },
    { id: 'g2', emoji: '💧', title: 'Acqua bevuta',       titleKey: 'goal.waterDrunk',   current: 1.2,  target: 2.5,  unit: 'l'    },
    { id: 'g3', emoji: '💪', title: 'Minuti allenamento', titleKey: 'goal.workoutMin',   current: 35,   target: 60,   unit: 'min'  },
  ],
  weekly: [
    { id: 'g4', emoji: '🏋️', title: 'Ore in palestra',     titleKey: 'goal.gymHours',       current: 2,     target: 4,     unit: 'h'    },
    { id: 'g5', emoji: '📉', title: 'Calorie settimanali', titleKey: 'goal.weeklyCalories', current: 10200, target: 14000, unit: 'Kcal' },
  ],
  monthly: [],
}
