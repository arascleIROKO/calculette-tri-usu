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

  it('comparatif marché : SCPI au TD comparable ayant une clé à la durée, hypothèses conservées', () => {
    const inv = { ...blankInvestment(1), dureeAnnees: 5 }
    const rows = scpiScenarios(inv)
    const expected = SCPIS.filter((s) => s.cles['5'] != null && s.td != null && Math.abs(s.td - inv.tdNet) <= 0.01 + 1e-9)
    expect(rows.length).toBe(expected.length)
    for (const r of rows) {
      expect(r.inv.tdNet).toBe(inv.tdNet)
      expect(r.result.cleUsu).toBe(r.scpi.cles['5'])
    }
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

describe('opportunités usufruit (base Zen / Atlas)', () => {
  it('une ligne par SCPI et par durée de son barème, avec les hypothèses de la référence', async () => {
    const { usufruitOpportunities, presetInvestment } = await import('./usufruit')
    const zen = presetInvestment('Iroko Zen')
    const rows = usufruitOpportunities(zen)
    const comparable = SCPIS.filter((s) => s.td != null && Math.abs(s.td - zen.tdNet) <= 0.01 + 1e-9)
    expect(comparable.length).toBeGreaterThan(0)
    expect(rows.length).toBe(comparable.reduce((n, s) => n + Object.keys(s.cles).length, 0))
    expect(rows.every((r) => Math.abs(r.scpi.td! - zen.tdNet) <= 0.01 + 1e-9)).toBe(true)
    const r = rows[0]
    const ref = compute({ ...zen, dureeAnnees: r.duree, grille: 'manuel', cleUsufruitManuelle: r.cleUsu })
    expect(r.tri).toBeCloseTo(ref.headline.value!, 12)
  })

  it('référence Zen à 9 ans = TRI du BP', async () => {
    const { referenceTri, presetInvestment } = await import('./usufruit')
    expect(referenceTri(presetInvestment('Iroko Zen'), 9)?.tri).toBeCloseTo(0.09661683810939982, 8)
    expect(referenceTri(presetInvestment('Iroko Atlas'), 12)?.tri).toBeCloseTo(0.15978337100461384, 8)
    expect(referenceTri(presetInvestment('Iroko Zen'), 2)).toBeNull()
  })
})

describe('clés atypiques', () => {
  it('médiane marché calculée pour chaque durée présente, clés atypiques signalées', async () => {
    const { MEDIAN_KEYS, CLE_ATYPIQUE_RATIO } = await import('./scpi')
    const { usufruitOpportunities, presetInvestment } = await import('./usufruit')
    expect(MEDIAN_KEYS.get(5)).toBeGreaterThan(0.15)
    for (const r of usufruitOpportunities(presetInvestment('Iroko Zen')))
      expect(r.cleAtypique).toBe(r.cleUsu < CLE_ATYPIQUE_RATIO * MEDIAN_KEYS.get(r.duree)!)
  })
})
