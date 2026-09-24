import { describe, expect, it } from 'vitest'
import { blankInvestment, compute, presetInvestment, type Investment } from './usufruit'

// Valeurs de référence produites par tri_core.py (pyxirr)
const metric = (inv: Investment, key: string) => compute(inv).metrics.find((m) => m.key === key)?.value

describe('parité avec tri_core.py', () => {
  it('Iroko Zen', () => {
    const inv = presetInvestment('Iroko Zen')
    expect(compute(inv).cleUsu).toBe(0.335)
    expect(metric(inv, 'usu')).toBeCloseTo(0.09661683810939982, 8)
    expect(metric(inv, 'blend')).toBeCloseTo(0.09661683810939982, 8)
    expect(metric(inv, 'blendReemploi')).toBeCloseTo(0.07112732253332492, 8)
  })

  it('Iroko Atlas', () => {
    const inv = presetInvestment('Iroko Atlas')
    expect(metric(inv, 'usu')).toBeCloseTo(0.15978337100461384, 8)
    expect(metric(inv, 'blendReemploi')).toBeCloseTo(0.1128623667420596, 8)
  })

  it('usufruit / nue-propriété démembré avec délai de jouissance', () => {
    const inv: Investment = { ...blankInvestment(1), ticketTotal: 1e6, dureeAnnees: 5, delaiJouissanceMois: 3 }
    expect(metric(inv, 'usu')).toBeCloseTo(0.049806613750786384, 8)
    expect(metric(inv, 'np')).toBeCloseTo(0.053633140826589605, 8)
    expect(metric(inv, 'blend')).toBeCloseTo(0.05233721156359771, 8)
    expect(metric(inv, 'blendReemploi')).toBeCloseTo(0.04951865341030647, 8)
  })

  it('usufruit / pleine propriété, clé manuelle, revalorisation', () => {
    const inv: Investment = {
      ...blankInvestment(1),
      dureeAnnees: 7,
      partUsufruit: 0.4,
      tdNet: 0.05,
      grille: 'manuel',
      cleUsufruitManuelle: 0.3,
      montage: 'usu_pp',
      croissancePrixPart: 0.01,
    }
    expect(metric(inv, 'blend')).toBeCloseTo(0.059473473667252655, 8)
  })

  it('durée hors barème lève une erreur explicite', () => {
    expect(() => compute({ ...blankInvestment(1), dureeAnnees: 2 })).toThrow(/absente du barème/)
  })
})
