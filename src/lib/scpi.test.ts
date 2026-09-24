import { describe, expect, it } from 'vitest'
import { SCPIS } from './scpi'
import { blankInvestment, compute, scpiScenarios } from './usufruit'

describe('base SCPI du marché', () => {
  it('clés dans ]0, 1[, durées entières, source renseignée', () => {
    for (const s of SCPIS) {
      expect(s.sourceUrl, s.nom).toMatch(/^https?:\/\//)
      for (const [d, k] of Object.entries(s.cles)) {
        expect(Number.isInteger(Number(d)), `${s.nom} ${d}`).toBe(true)
        expect(k, `${s.nom} ${d} ans`).toBeGreaterThan(0)
        expect(k, `${s.nom} ${d} ans`).toBeLessThan(1)
      }
    }
  })

  it('identifiants uniques', () => {
    expect(new Set(SCPIS.map((s) => s.id)).size).toBe(SCPIS.length)
  })

  it('comparatif marché : une ligne par SCPI ayant une clé à la durée', () => {
    const inv = { ...blankInvestment(1), dureeAnnees: 5 }
    const rows = scpiScenarios(inv, { useScpiHypotheses: false })
    expect(rows.length).toBe(SCPIS.filter((s) => s.cles['5'] != null).length)
    for (const r of rows) {
      expect(r.inv.tdNet).toBe(inv.tdNet)
      expect(r.result.cleUsu).toBe(r.scpi.cles['5'])
    }
    const withScpi = scpiScenarios(inv, { useScpiHypotheses: true })
    for (const r of withScpi) expect(r.inv.tdNet).toBe(r.scpi.td ?? inv.tdNet)
  })

  it('un barème SCPI se calcule comme une clé manuelle équivalente', () => {
    const s = SCPIS.find((x) => x.cles['5'] != null)
    if (!s) return
    const inv = { ...blankInvestment(1), dureeAnnees: 5 }
    const a = compute({ ...inv, grille: `scpi:${s.id}` })
    const b = compute({ ...inv, grille: 'manuel', cleUsufruitManuelle: s.cles['5'] })
    expect(a.headline.value).toBeCloseTo(b.headline.value!, 12)
  })
})

describe('opportunités usufruit', () => {
  it('une ligne par SCPI avec TD et par durée de son barème, TRI = compute 100 % usufruit', async () => {
    const { usufruitOpportunities } = await import('./usufruit')
    const rows = usufruitOpportunities()
    const expected = SCPIS.filter((s) => s.td != null).reduce((n, s) => n + Object.keys(s.cles).length, 0)
    expect(rows.length).toBe(expected)
    const r = rows[0]
    const ref = compute({ ...blankInvestment(0), partUsufruit: 1, dureeAnnees: r.duree, grille: `scpi:${r.scpi.id}`, tdNet: r.td })
    expect(r.tri).toBeCloseTo(ref.headline.value!, 12)
  })
})
