/** Base des SCPI du marché : barèmes de clés d'usufruit, TD et prix de part (data/scpi_usufruit.json). */
import raw from '../../data/scpi_usufruit.json'

export interface Scpi {
  id: string
  nom: string
  sgp: string
  type: string | null
  /** Clé usufruit par durée (années) */
  cles: Record<string, number>
  td: number | null
  anneeTd: number | null
  prixPart: number | null
  sourceUrl: string
  sourceTdUrl: string | null
  dateSource: string | null
  fiabilite: string
  notes: string | null
  /** Souscription fermée / suspendue : barème probablement inactif */
  statut: string | null
  /** Objectif de TD annoncé par la SGP (non garanti) */
  tdCible: number | null
  anneeTdCible: number | null
  /** Commission de souscription TTC, en % du prix de souscription */
  commission: number | null
  /** Mois sans dividende entre souscription et entrée en jouissance */
  delaiJouissance: number | null
  delaiTexte: string | null
  paramsSourceUrl: string | null
  paramsNotes: string | null
}

export const SCPI_DB = raw as { description: string; collecte: string; scpis: Scpi[] }
export const SCPIS: Scpi[] = [...SCPI_DB.scpis].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
const BY_ID = new Map(SCPIS.map((s) => [s.id, s]))

/** TD publié inhabituellement élevé (> 10 %) : souvent une année partielle ou exceptionnelle */
export const TD_ATYPIQUE = 0.1

/** Clé médiane du marché par durée (toutes SCPI de la base) */
export const MEDIAN_KEYS: Map<number, number> = (() => {
  const by = new Map<number, number[]>()
  for (const s of SCPIS) for (const [d, k] of Object.entries(s.cles)) by.set(Number(d), [...(by.get(Number(d)) ?? []), k])
  return new Map(
    [...by.entries()].map(([d, ks]) => {
      const v = [...ks].sort((a, b) => a - b)
      const m = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2
      return [d, m]
    }),
  )
})()

/** En dessous de ce ratio de la médiane marché, une clé est jugée atypique (erreur de saisie probable) */
export const CLE_ATYPIQUE_RATIO = 0.8

export const scpiById = (id: string) => BY_ID.get(id)
export const scpiDurations = (s: Scpi) => Object.keys(s.cles).map(Number).sort((a, b) => a - b)
