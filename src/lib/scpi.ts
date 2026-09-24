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
}

export const SCPI_DB = raw as { description: string; collecte: string; scpis: Scpi[] }
export const SCPIS: Scpi[] = [...SCPI_DB.scpis].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
const BY_ID = new Map(SCPIS.map((s) => [s.id, s]))

/** TD publié inhabituellement élevé (> 10 %) : souvent une année partielle ou exceptionnelle */
export const TD_ATYPIQUE = 0.1

export const scpiById = (id: string) => BY_ID.get(id)
export const scpiDurations = (s: Scpi) => Object.keys(s.cles).map(Number).sort((a, b) => a - b)
