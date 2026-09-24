import { describe, expect, it } from 'vitest'
import { blankInvestment, compute, keyScenarios, presetInvestment, type Investment } from './usufruit'

// Valeurs de référence produites par tri_core.py (pyxirr)
const metric = (inv: Investment, key: string) => compute(inv).metrics.find((m) => m.key === key)?.value

describe('parité avec tri_core.py', () => {
  it('Iroko Zen', () => {
    const inv = presetInvestment('Iroko Zen')
    expect(compute(inv).cleUsu).toBe(0.335)
    expect(metric(inv, 'usu')).toBeCloseTo(0.09661683810939982, 8)
    expect(metric(inv, 'blend')).toBeCloseTo(0.09661683810939982, 8)
    expect(compute(inv).headline.key).toBe('blend')
  })

  it('Iroko Atlas', () => {
    const inv = presetInvestment('Iroko Atlas')
    expect(metric(inv, 'usu')).toBeCloseTo(0.15978337100461384, 8)
    expect(metric(inv, 'blend')).toBeCloseTo(0.15978337100461384, 8)
  })

  it('usufruit / nue-propriété démembré avec délai de jouissance', () => {
    const inv: Investment = { ...blankInvestment(1), ticketTotal: 1e6, dureeAnnees: 5, delaiJouissanceMois: 3 }
    expect(metric(inv, 'usu')).toBeCloseTo(0.049806613750786384, 8)
    expect(metric(inv, 'np')).toBeCloseTo(0.053633140826589605, 8)
    expect(metric(inv, 'blend')).toBeCloseTo(0.05233721156359771, 8)
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

  it('jambes séparées 50/50 : usufruit et nue-propriété', () => {
    const inv: Investment = { ...blankInvestment(1), dureeAnnees: 5 }
    expect(metric(inv, 'usu')).toBeCloseTo(0.0751467849495909, 8)
    expect(metric(inv, 'np')).toBeCloseTo(0.053633140826589605, 8)
    expect(metric(inv, 'blend')).toBeCloseTo(0.06072596303552047, 8)
  })

  it('jambes séparées 50/50 : usufruit et pleine propriété', () => {
    const inv: Investment = {
      ...blankInvestment(1),
      dureeAnnees: 7,
      tdNet: 0.05,
      grille: 'manuel',
      cleUsufruitManuelle: 0.3,
      montage: 'usu_pp',
      croissancePrixPart: 0.01,
    }
    expect(metric(inv, 'usu')).toBeCloseTo(0.05445266145687519, 8)
    expect(metric(inv, 'np')).toBeCloseTo(0.06134819278117066, 8)
    expect(metric(inv, 'blend')).toBeCloseTo(0.0588735625721641, 8)
  })
})

describe('détail par clé', () => {
  it('recalcule chaque durée du barème', () => {
    const rows = keyScenarios(presetInvestment('Iroko Zen'))
    expect(rows.map((r) => r.duree)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
    const zen = rows.find((r) => r.duree === 9)!
    expect(zen.cleUsu).toBe(0.335)
    expect(zen.result.headline.value).toBeCloseTo(0.09661683810939982, 8)
  })

  it('clé manuelle : sensibilité autour de la clé saisie', () => {
    const rows = keyScenarios({ ...blankInvestment(1), grille: 'manuel', cleUsufruitManuelle: 0.3 })
    expect(rows.map((r) => r.cleUsu)).toEqual([0.2, 0.22, 0.24, 0.26, 0.28, 0.3, 0.32, 0.34, 0.36, 0.38, 0.4])
    expect(new Set(rows.map((r) => r.duree))).toEqual(new Set([5]))
  })
})

describe("frais d'acquisition et rétrocession", () => {
  const frais = { fraisAcq: 0.1, retroFrais: 0.07 }

  it('NP : sortie à la valeur de retrait, rétro encaissée en t0', () => {
    const inv: Investment = { ...blankInvestment(1), dureeAnnees: 5, ...frais }
    expect(metric(inv, 'np')).toBeCloseTo(0.046749818655408594, 8)
    expect(metric(inv, 'blend')).toBeCloseTo(0.05663585235413265, 8)
    // la jambe usufruit n'est pas concernée
    expect(metric(inv, 'usu')).toBeCloseTo(0.0751467849495909, 8)
  })

  it('PP : dividendes inchangés, sortie nette de frais', () => {
    const inv: Investment = {
      ...blankInvestment(1),
      dureeAnnees: 7,
      tdNet: 0.05,
      grille: 'manuel',
      cleUsufruitManuelle: 0.3,
      montage: 'usu_pp',
      croissancePrixPart: 0.01,
      ...frais,
    }
    expect(metric(inv, 'np')).toBeCloseTo(0.061221605139178806, 8)
    expect(metric(inv, 'blend')).toBeCloseTo(0.058656036788482954, 8)
  })

  it('PP : délai de jouissance appliqué aux dividendes usufruit et PP', () => {
    const inv: Investment = {
      ...blankInvestment(1),
      dureeAnnees: 7,
      tdNet: 0.05,
      grille: 'manuel',
      cleUsufruitManuelle: 0.3,
      montage: 'usu_pp',
      croissancePrixPart: 0.01,
      fraisAcq: 0.1,
      delaiJouissanceMois: 3,
    }
    expect(metric(inv, 'usu')).toBeCloseTo(0.0419146034306918, 8)
    expect(metric(inv, 'np')).toBeCloseTo(0.04600308947648273, 8)
    expect(metric(inv, 'blend')).toBeCloseTo(0.044488211090498615, 8)
  })
})
