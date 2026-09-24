const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const eurCompact = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const pct = new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct1 = new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export const fmtEur = (v: number) => eur.format(v)
export const fmtEurCompact = (v: number) => eurCompact.format(v)
export const fmtPct = (v: number | null | undefined) => (v == null || !isFinite(v) ? '—' : pct.format(v))
export const fmtPct1 = (v: number | null | undefined) => (v == null || !isFinite(v) ? '—' : pct1.format(v))
export const fmtMonth = (d: Date) => monthYear.format(d)
export const fmtMultiple = (v: number) => `${v.toLocaleString('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}x`

export const SERIES_COLORS = ['#4f46e5', '#059669', '#d97706', '#db2777', '#0891b2', '#7c3aed', '#65a30d', '#dc2626']
