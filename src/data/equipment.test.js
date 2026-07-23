import { describe, it, expect } from 'vitest'
import { equipmentLabelKey, EQUIPMENT_SLUGS } from './equipment'
import { translations } from '../i18n/translations'

describe('equipmentLabelKey', () => {
  it('mappa gli slug noti sulla chiave i18n', () => {
    expect(equipmentLabelKey('dumbbell')).toBe('equipment.dumbbell')
    expect(equipmentLabelKey('ez-bar')).toBe('equipment.ez-bar')
  })

  it('slug sconosciuto o assente → null, così la UI non mostra la chiave grezza', () => {
    expect(equipmentLabelKey('trattore')).toBeNull()
    expect(equipmentLabelKey(null)).toBeNull()
    expect(equipmentLabelKey(undefined)).toBeNull()
  })

  it('ogni attrezzo ha l’etichetta in tutte le lingue', () => {
    for (const lang of Object.keys(translations)) {
      for (const slug of EQUIPMENT_SLUGS) {
        expect(translations[lang][`equipment.${slug}`], `${lang}/${slug}`).toBeTruthy()
      }
    }
  })
})
