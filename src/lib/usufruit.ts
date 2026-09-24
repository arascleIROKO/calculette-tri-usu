/**
 * Moteur de calcul de TRI pour les investissements en usufruit (démembrement de parts SCPI).
 *
 * Portage fidèle de tri_core.py (onglet "06.3 - USU TRI" du BP Iroko Next) :
 * - coupon usufruit mensuel = montant_usufruit x TD_net / clé_usufruit / 12
 * - valeur terminale nue-propriété = montant_np / clé_np
 * - valeur terminale pleine propriété = parts PP valorisées au prix de part
 *   (éventuellement revalorisé chaque année)
 *
 * Frais d'acquisition sur la NP / PP (hors BP, inclus dans le prix comme une commission de
 * souscription) : sortie à la valeur de retrait = valeur x (1 - frais). La rétrocession, en % du
 * montant NP / PP, est encaissée à la date d'investissement.
 */
import keyData from '../../data/keys_demembrement.json'
import { CLE_ATYPIQUE_RATIO, MEDIAN_KEYS, SCPIS, scpiById, scpiDurations, type Scpi } from './scpi'
import { xirr } from './xirr'

export type Montage = 'usu_np' | 'usu_pp'
export type BpGrilleId = 'zen_atlas' | 'epsicap_2026' | 'ancienne'
/** Barème du BP, clé manuelle, ou barème d'une SCPI du marché (`scpi:<id>`) */
export type GrilleId = BpGrilleId | 'manuel' | `scpi:${string}`

export interface Investment {
  id: string
  nom: string
  ticketTotal: number
  dureeAnnees: number
  /** 0..1 — part du ticket en usufruit ; le reste en NP (ou PP si montage usu_pp) */
  partUsufruit: number
  prixPart: number
  tdNet: number
  delaiJouissanceMois: number
  /** Mois d'investissement, format YYYY-MM */
  moisInvestissement: string
  grille: GrilleId
  cleUsufruitManuelle: number
  montage: Montage
  croissancePrixPart: number
  /** Frais d'acquisition sur la NP / PP, inclus dans le prix (0..1) */
  fraisAcq: number
  /** Rétrocession en % du montant NP / PP (0..1) */
  retroFrais: number
}

interface KeyRow {
  cle_usufruit: number
  cle_np: number
}
type Grid = Record<string, KeyRow>

const GRIDS = keyData.grids as Record<BpGrilleId, Grid>
const PRESETS = keyData.presets

export const GRILLE_LABELS: Record<BpGrilleId | 'manuel', string> = {
  zen_atlas: 'Iroko Zen / Atlas',
  epsicap_2026: 'Epsicap Nano 2026',
  ancienne: 'Ancienne grille',
  manuel: 'Clé manuelle',
}

const scpiOf = (grille: GrilleId) => (grille.startsWith('scpi:') ? scpiById(grille.slice(5)) : undefined)

export function grilleLabel(grille: GrilleId): string {
  if (grille.startsWith('scpi:')) return scpiOf(grille)?.nom ?? 'SCPI inconnue'
  return GRILLE_LABELS[grille as BpGrilleId | 'manuel']
}

export const MONTAGE_LABELS: Record<Montage, string> = {
  usu_np: 'Usufruit / Nue-propriété',
  usu_pp: 'Usufruit / Pleine propriété',
}

export function gridDurations(grille: GrilleId): number[] {
  if (grille === 'manuel') return []
  if (grille.startsWith('scpi:')) {
    const s = scpiOf(grille)
    return s ? scpiDurations(s) : []
  }
  return Object.keys(GRIDS[grille as BpGrilleId]).map(Number).sort((a, b) => a - b)
}

export function gridRows(grille: BpGrilleId) {
  return gridDurations(grille).map((d) => ({ duree: d, ...GRIDS[grille][String(d)] }))
}

export function resolveCle(inv: Investment): { cleUsu: number; cleNp: number } {
  if (inv.grille === 'manuel') {
    return { cleUsu: inv.cleUsufruitManuelle, cleNp: 1 - inv.cleUsufruitManuelle }
  }
  let row: KeyRow | undefined
  if (inv.grille.startsWith('scpi:')) {
    const s = scpiOf(inv.grille)
    if (!s) throw new Error(`Barème SCPI introuvable (${inv.grille.slice(5)}).`)
    const k = s.cles[String(inv.dureeAnnees)]
    row = k == null ? undefined : { cle_usufruit: k, cle_np: 1 - k }
  } else {
    row = GRIDS[inv.grille as BpGrilleId][String(inv.dureeAnnees)]
  }
  if (!row) {
    const d = gridDurations(inv.grille)
    throw new Error(`Durée ${inv.dureeAnnees} ans absente du barème (${d[0]}–${d[d.length - 1]} ans).`)
  }
  return { cleUsu: row.cle_usufruit, cleNp: row.cle_np }
}

function monthlyDates(mois: string, nMonths: number): Date[] {
  const [y, m] = mois.split('-').map(Number)
  return Array.from({ length: nMonths + 1 }, (_, i) => new Date(Date.UTC(y, m - 1 + i, 1)))
}

export interface CashflowRow {
  date: Date
  /** Flux investisseur (usufruit seul) */
  usu: number
  /** Flux nue-propriété ou pleine propriété */
  np: number
  /** Flux total blendé */
  blend: number
}

export interface Metric {
  key: string
  label: string
  value: number | null
  /** Métrique principale utilisée pour le classement */
  headline?: boolean
}

export interface Result {
  cleUsu: number
  cleNp: number
  metrics: Metric[]
  headline: Metric
  cashflows: CashflowRow[]
  totalInvesti: number
  totalRecu: number
  multiple: number
}

function buildUsuNp(inv: Investment, cleUsu: number, cleNp: number): CashflowRow[] {
  const dureeMois = inv.dureeAnnees * 12
  const montantUsu = inv.ticketTotal * inv.partUsufruit
  const montantNp = inv.ticketTotal * (1 - inv.partUsufruit)
  const delai = inv.delaiJouissanceMois

  const couponAnnuel = cleUsu ? (montantUsu * inv.tdNet) / cleUsu : 0
  const valeurNpTerme = cleNp ? (montantNp * (1 - inv.fraisAcq)) / cleNp : 0

  const dates = monthlyDates(inv.moisInvestissement, dureeMois)
  const rows: CashflowRow[] = []
  for (let m = 0; m <= dureeMois; m++) {
    let usu: number, np: number
    if (m === 0) {
      usu = -montantUsu
      np = -montantNp * (1 - inv.retroFrais)
    } else {
      usu = delai < m && m <= delai + dureeMois ? couponAnnuel / 12 : 0
      np = m === dureeMois ? valeurNpTerme : 0
    }
    rows.push({ date: dates[m], usu, np, blend: usu + np })
  }
  return rows
}

function buildUsuPp(inv: Investment, cleUsu: number): CashflowRow[] {
  const dureeMois = inv.dureeAnnees * 12
  const montantUsu = inv.ticketTotal * inv.partUsufruit
  const montantPp = inv.ticketTotal * (1 - inv.partUsufruit)
  const nbPartsUsu = cleUsu ? montantUsu / (inv.prixPart * cleUsu) : 0
  const nbPartsPp = montantPp / inv.prixPart

  const dates = monthlyDates(inv.moisInvestissement, dureeMois)
  const rows: CashflowRow[] = []
  for (let m = 0; m <= dureeMois; m++) {
    let usu: number, np: number
    if (m === 0) {
      usu = -montantUsu
      np = -montantPp * (1 - inv.retroFrais)
    } else {
      const annee = Math.floor((m - 1) / 12)
      const prix = inv.prixPart * Math.pow(1 + inv.croissancePrixPart, annee)
      // Pas de dividende pendant le délai de jouissance (usufruit comme pleine propriété)
      const enJouissance = m > inv.delaiJouissanceMois
      usu = enJouissance ? (nbPartsUsu * prix * inv.tdNet) / 12 : 0
      np = enJouissance ? (nbPartsPp * prix * inv.tdNet) / 12 : 0
      if (m === dureeMois) {
        np += nbPartsPp * inv.prixPart * Math.pow(1 + inv.croissancePrixPart, inv.dureeAnnees) * (1 - inv.fraisAcq)
      }
    }
    rows.push({ date: dates[m], usu, np, blend: usu + np })
  }
  return rows
}

const irr = (rows: CashflowRow[], col: keyof Omit<CashflowRow, 'date'>) =>
  xirr(
    rows.map((r) => r.date),
    rows.map((r) => r[col]),
  )

export function compute(inv: Investment): Result {
  const { cleUsu, cleNp } = resolveCle(inv)
  let cashflows: CashflowRow[]
  let metrics: Metric[]

  // Chaque jambe n'a de TRI que si elle reçoit une part du ticket
  const hasUsu = inv.partUsufruit > 0
  const hasOther = inv.partUsufruit < 1
  const leg = (on: boolean, m: Metric): Metric[] => (on ? [m] : [])

  if (inv.montage === 'usu_np') {
    cashflows = buildUsuNp(inv, cleUsu, cleNp)
    metrics = [
      ...leg(hasUsu, { key: 'usu', label: 'TRI usufruit (cash)', value: irr(cashflows, 'usu') }),
      ...leg(hasOther, { key: 'np', label: 'TRI nue-propriété', value: irr(cashflows, 'np') }),
      { key: 'blend', label: 'TRI blendé', value: irr(cashflows, 'blend'), headline: true },
    ]
  } else {
    cashflows = buildUsuPp(inv, cleUsu)
    metrics = [
      ...leg(hasUsu, { key: 'usu', label: 'TRI usufruit', value: irr(cashflows, 'usu') }),
      ...leg(hasOther, { key: 'np', label: 'TRI pleine propriété', value: irr(cashflows, 'np') }),
      { key: 'blend', label: 'TRI blendé (usu + PP)', value: irr(cashflows, 'blend'), headline: true },
    ]
  }

  const totalInvesti = -cashflows[0].blend
  const totalRecu = cashflows.slice(1).reduce((s, r) => s + r.blend, 0)

  return {
    cleUsu,
    cleNp,
    metrics,
    headline: metrics.find((m) => m.headline)!,
    cashflows,
    totalInvesti,
    totalRecu,
    multiple: totalInvesti ? totalRecu / totalInvesti : 0,
  }
}

let counter = 0
export const newId = () => `inv-${Date.now().toString(36)}-${(counter++).toString(36)}`

export function presetInvestment(nom: keyof typeof PRESETS): Investment {
  const p = PRESETS[nom]
  return {
    id: newId(),
    nom,
    ticketTotal: p.montant_usu,
    dureeAnnees: p.duree_annees,
    partUsufruit: p.part_usufruit,
    prixPart: p.prix_part,
    tdNet: p.td_net,
    delaiJouissanceMois: p.delai_jouissance_mois,
    moisInvestissement: '2027-01',
    grille: p.grille as GrilleId,
    cleUsufruitManuelle: 0.2,
    montage: 'usu_np',
    croissancePrixPart: 0,
    fraisAcq: 0,
    retroFrais: 0,
  }
}

export const PRESET_NAMES = Object.keys(PRESETS) as (keyof typeof PRESETS)[]

export function blankInvestment(index: number): Investment {
  return {
    id: newId(),
    nom: `Investissement ${index}`,
    ticketTotal: 1_000_000,
    dureeAnnees: 5,
    partUsufruit: 0.5,
    prixPart: 250,
    tdNet: 0.055,
    delaiJouissanceMois: 0,
    moisInvestissement: '2027-01',
    grille: 'epsicap_2026',
    cleUsufruitManuelle: 0.2,
    montage: 'usu_np',
    croissancePrixPart: 0,
    fraisAcq: 0,
    retroFrais: 0,
  }
}

export interface KeyScenario {
  duree: number
  cleUsu: number
  inv: Investment
  result: Result
}

/**
 * Détail par clé : le même investissement recalculé pour chaque durée du barème
 * (donc chaque clé). En clé manuelle, sensibilité à la clé autour de la valeur saisie,
 * à durée constante.
 */
export function keyScenarios(inv: Investment): KeyScenario[] {
  const variants: Investment[] =
    inv.grille === 'manuel'
      ? Array.from({ length: 11 }, (_, i) => Math.round((inv.cleUsufruitManuelle + (i - 5) * 0.02) * 1000) / 1000)
          .filter((k) => k > 0 && k < 1)
          .map((k) => ({ ...inv, cleUsufruitManuelle: k }))
      : gridDurations(inv.grille).map((d) => ({ ...inv, dureeAnnees: d }))
  return variants.map((v) => {
    const result = compute(v)
    return { duree: v.dureeAnnees, cleUsu: result.cleUsu, inv: v, result }
  })
}

export interface ScpiScenario {
  scpi: Scpi
  inv: Investment
  result: Result
  cleAtypique: boolean
}

const isAtypical = (cle: number, duree: number) => {
  const median = MEDIAN_KEYS.get(duree)
  return median != null && cle < CLE_ATYPIQUE_RATIO * median
}

/** TD de référence d'une SCPI : objectif publié, à défaut TD réalisé */
export const scpiTd = (s: Scpi) => s.tdCible ?? s.td

/** SCPI au profil de rendement comparable : TD (cible, sinon réalisé) à ± tolérance du TD de l'investissement */
const comparableTd = (s: Scpi, td: number, tol: number) => {
  const t = scpiTd(s)
  return t != null && Math.abs(t - td) <= tol + 1e-9
}

/**
 * Comparatif marché : l'investissement (ses hypothèses, seule la clé change) recalculé avec le barème
 * de chaque SCPI au TD comparable disposant d'une clé à sa durée.
 */
export function scpiScenarios(inv: Investment, { tdTolerance = 0.01 } = {}): ScpiScenario[] {
  return SCPIS.filter((s) => s.cles[String(inv.dureeAnnees)] != null && comparableTd(s, inv.tdNet, tdTolerance)).map((scpi) => {
    const v: Investment = { ...inv, grille: `scpi:${scpi.id}` }
    const result = compute(v)
    return { scpi, inv: v, result, cleAtypique: isAtypical(result.cleUsu, inv.dureeAnnees) }
  })
}

/**
 * Investissement pré-rempli avec les paramètres publiés d'une SCPI : barème, prix de part, TD cible
 * (TD réalisé à défaut), commission de souscription (frais d'acquisition NP / PP) et délai de jouissance.
 * `overrides` fixe les champs propres au contexte (durée, part usufruit, ticket…).
 */
export function scpiInvestment(scpi: Scpi, overrides: Partial<Investment> = {}): Investment {
  const base = blankInvestment(0)
  const durations = scpiDurations(scpi)
  return {
    ...base,
    nom: scpi.nom,
    grille: `scpi:${scpi.id}`,
    dureeAnnees: durations.includes(base.dureeAnnees) ? base.dureeAnnees : durations[0],
    tdNet: scpiTd(scpi) ?? base.tdNet,
    prixPart: scpi.prixPart ?? base.prixPart,
    fraisAcq: scpi.commission ?? 0,
    delaiJouissanceMois: scpi.delaiJouissance ?? 0,
    ...overrides,
  }
}

/** D'où vient le TD utilisé par `scpiInvestment` */
export const tdSource = (scpi: Scpi): 'cible' | 'réalisé' | 'défaut' =>
  scpi.tdCible != null ? 'cible' : scpi.td != null ? 'réalisé' : 'défaut'

export interface Opportunity {
  scpi: Scpi
  duree: number
  cleUsu: number
  tri: number | null
  /** Clé très en dessous de la médiane du marché à la même durée : erreur de saisie probable */
  cleAtypique: boolean
}

/**
 * Comparaison des clés du marché : l'investissement de référence (Iroko Zen ou Atlas, hypothèses
 * du BP) recalculé à chaque durée du barème de chaque SCPI, en ne changeant que la clé.
 *
 * Une SGP fixe sa clé d'après le rendement de sa propre SCPI : appliquer le TD de référence à la clé
 * d'une SCPI au rendement très différent donnerait un TRI fictif. Seules les SCPI dont le TD publié
 * est à ± `tdTolerance` du TD de référence sont donc retenues (profil de rendement comparable).
 */
export function usufruitOpportunities(base: Investment, { tdTolerance = 0.01 } = {}): Opportunity[] {
  const comparable = SCPIS.filter((s) => comparableTd(s, base.tdNet, tdTolerance))
  return comparable.flatMap((scpi) =>
    scpiDurations(scpi).map((duree) => {
      const r = compute({ ...base, dureeAnnees: duree, grille: `scpi:${scpi.id}` })
      return { scpi, duree, cleUsu: r.cleUsu, tri: r.headline.value, cleAtypique: isAtypical(r.cleUsu, duree) }
    }),
  )
}

/** TRI de la référence sur son propre barème à une durée donnée (null si la durée est hors barème). */
export function referenceTri(base: Investment, duree: number): { cleUsu: number; tri: number | null } | null {
  if (!gridDurations(base.grille).includes(duree)) return null
  const r = compute({ ...base, dureeAnnees: duree })
  return { cleUsu: r.cleUsu, tri: r.headline.value }
}
