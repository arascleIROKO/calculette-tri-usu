import { useMemo, useState } from 'react'
import { NumberField, Segmented } from '../../components/fields'
import { fmtPct, fmtPct1 } from '../../lib/format'
import { CLE_ATYPIQUE_RATIO, MEDIAN_KEYS, type Scpi } from '../../lib/scpi'
import { presetInvestment, referenceTri, usufruitOpportunities, type Investment, type Opportunity } from '../../lib/usufruit'
import { StatutBadge } from '../cles/ClesTool'

const TOP_N = 3
type BaseName = 'Iroko Zen' | 'Iroko Atlas'

const fmtDelta = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} pt`

/**
 * Meilleurs TRI par clé : les hypothèses de référence Iroko Zen ou Atlas (BP) appliquées aux clés des
 * SCPI du marché au profil de rendement comparable. Seule la clé change d'une ligne à l'autre.
 */
export function TopTool({ onUse }: { onUse: (scpi: Scpi, duree: number, base: Investment) => void }) {
  const [baseName, setBaseName] = useState<BaseName>('Iroko Zen')
  const [tolerance, setTolerance] = useState(0.01)
  const [hideClosed, setHideClosed] = useState(true)
  const [hideUncertain, setHideUncertain] = useState(false)
  const [hideAtypical, setHideAtypical] = useState(true)
  const [duree, setDuree] = useState<number | null>(null)

  const base = useMemo(() => presetInvestment(baseName), [baseName])
  const all = useMemo(() => usufruitOpportunities(base, { tdTolerance: tolerance }), [base, tolerance])
  const rows = all.filter(
    (o) =>
      o.tri != null &&
      !(hideClosed && o.scpi.statut) &&
      !(hideUncertain && o.scpi.fiabilite === 'incertain') &&
      !(hideAtypical && o.cleAtypique),
  )
  const nbScpi = new Set(rows.map((o) => o.scpi.id)).size

  const byDuration = useMemo(() => {
    const m = new Map<number, Opportunity[]>()
    for (const o of rows) m.set(o.duree, [...(m.get(o.duree) ?? []), o])
    for (const list of m.values()) list.sort((a, b) => b.tri! - a.tri!)
    return [...m.entries()].sort((a, b) => a[0] - b[0])
  }, [rows])

  const selected = duree != null && byDuration.some(([d]) => d === duree) ? duree : (byDuration.find(([d]) => d === base.dureeAnnees)?.[0] ?? byDuration[0]?.[0] ?? null)
  const ranking = byDuration.find(([d]) => d === selected)?.[1] ?? []
  const refAt = (d: number) => referenceTri(base, d)
  const selRef = selected != null ? refAt(selected) : null

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">Démembrement SCPI</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Meilleurs TRI usufruit par clé</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Les hypothèses de référence {baseName} du BP (TD net {fmtPct(base.tdNet)}, 100 % usufruit) sont appliquées aux clés des
          SCPI du marché : seule la clé change. Pour que la comparaison ait un sens, seules les SCPI dont le TD publié est proche du
          TD de référence sont retenues, car chaque SGP fixe sa clé d’après le rendement de sa propre SCPI. C’est un repérage à
          confirmer auprès de la société de gestion (clé en vigueur, disponibilité des parts).
        </p>
      </header>

      <section className="flex flex-wrap items-end gap-x-6 gap-y-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-xs">
        <div className="w-60">
          <p className="mb-1.5 text-xs font-medium text-slate-600">Base de référence</p>
          <Segmented<BaseName> value={baseName} onChange={setBaseName}
            options={[{ value: 'Iroko Zen', label: 'Iroko Zen' }, { value: 'Iroko Atlas', label: 'Iroko Atlas' }]} />
        </div>
        <div className="w-44">
          <NumberField label="Écart de TD toléré" value={tolerance} onChange={setTolerance}
            suffix="± pt" scale={100} min={0} max={0.05} step={0.25} />
        </div>
        <div className="flex flex-col gap-1">
          <Toggle label="Exclure les SCPI fermées à la souscription" checked={hideClosed} onChange={setHideClosed} />
          <Toggle label={`Exclure les clés atypiques (< ${CLE_ATYPIQUE_RATIO * 100} % de la médiane marché)`} checked={hideAtypical} onChange={setHideAtypical} />
          <Toggle label="Exclure les barèmes « incertain »" checked={hideUncertain} onChange={setHideUncertain} />
        </div>
        <p className="pb-1 text-xs text-slate-500">
          {nbScpi} SCPI retenues, TD publié entre {fmtPct(base.tdNet - tolerance)} et {fmtPct(base.tdNet + tolerance)}
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="px-5 pb-3 pt-4">
          <h2 className="text-sm font-semibold text-slate-900">Top {TOP_N} par durée</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            TRI {baseName} sur sa propre grille en référence. Cliquez une durée pour voir le classement complet.
          </p>
        </div>
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">Durée</th>
                <th className="px-3 py-2.5 text-left font-medium">Réf. {baseName}</th>
                <th className="px-3 py-2.5 text-right font-medium">Clé médiane</th>
                {Array.from({ length: TOP_N }, (_, i) => (
                  <th key={i} className="px-3 py-2.5 text-left font-medium">{i + 1}{i ? 'e' : 'er'}</th>
                ))}
                <th className="px-5 py-2.5 text-right font-medium">SCPI</th>
              </tr>
            </thead>
            <tbody>
              {byDuration.map(([d, list]) => {
                const ref = refAt(d)
                return (
                  <tr key={d} onClick={() => setDuree(d)}
                    className={`cursor-pointer border-b border-slate-50 last:border-0 ${d === selected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}>
                    <td className="whitespace-nowrap px-5 py-2 font-medium text-slate-700">{d} ans</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {ref ? (
                        <span className="flex items-baseline gap-2">
                          <span className="font-semibold text-slate-900">{fmtPct(ref.tri)}</span>
                          <span className="text-[11px] text-slate-400">clé {fmtPct1(ref.cleUsu)}</span>
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-slate-500">{fmtPct1(MEDIAN_KEYS.get(d))}</td>
                    {Array.from({ length: TOP_N }, (_, i) => {
                      const o = list[i]
                      return (
                        <td key={i} className="px-3 py-2">
                          {o ? (
                            <span className="flex items-baseline gap-2">
                              <span className={`font-semibold ${i === 0 ? 'text-indigo-700' : 'text-slate-900'}`}>{fmtPct(o.tri)}</span>
                              <span className="max-w-[160px] truncate text-xs text-slate-600">{o.scpi.nom}</span>
                              <span className="text-[11px] text-slate-400">clé {fmtPct1(o.cleUsu)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-5 py-2 text-right text-xs text-slate-400">{list.length}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!byDuration.length && <p className="px-5 py-8 text-center text-sm text-slate-500">Aucune SCPI ne correspond aux filtres.</p>}
        </div>
      </section>

      {selected != null && ranking.length > 0 && (
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex flex-wrap items-end justify-between gap-3 px-5 pb-3 pt-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Classement — {selected} ans</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {ranking.length} SCPI
                {selRef && <> · référence {baseName} {fmtPct(selRef.tri)} (clé {fmtPct1(selRef.cleUsu)})</>}
                {' '}· « Comparer » ajoute l’investissement au comparateur avec les hypothèses {baseName}.
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {byDuration.map(([d]) => (
                <button key={d} onClick={() => setDuree(d)}
                  className={`rounded-md px-2 py-1 text-[11px] font-medium tabular-nums transition ${
                    d === selected ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}>
                  {d} a
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-sm tabular-nums">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">#</th>
                  <th className="px-3 py-2.5 text-left font-medium">SCPI</th>
                  <th className="px-3 py-2.5 text-right font-medium">TRI ({baseName})</th>
                  <th className="px-3 py-2.5 text-right font-medium">vs réf.</th>
                  <th className="px-3 py-2.5 text-right font-medium">Clé usu</th>
                  <th className="px-3 py-2.5 text-right font-medium">TD publié</th>
                  <th className="px-3 py-2.5 text-left font-medium">Fiabilité</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {ranking.map((o, i) => (
                  <tr key={o.scpi.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-5 py-2 text-xs text-slate-400">{i + 1}</td>
                    <td className="max-w-[260px] px-3 py-2">
                      <span className="block truncate font-medium text-slate-900" title={o.scpi.notes ?? undefined}>{o.scpi.nom}</span>
                      <span className="block truncate text-[11px] text-slate-500">{o.scpi.sgp}{o.scpi.type ? ` · ${o.scpi.type}` : ''}</span>
                      {o.scpi.statut && <StatutBadge statut={o.scpi.statut} />}
                      {o.cleAtypique && <StatutBadge statut="Clé atypique vs marché" />}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{fmtPct(o.tri)}</td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right text-xs ${selRef?.tri != null && o.tri! >= selRef.tri ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {selRef?.tri != null ? fmtDelta(o.tri! - selRef.tri) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">{fmtPct1(o.cleUsu)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-slate-500">
                      {fmtPct(o.scpi.td)}
                      {o.scpi.anneeTd && <span className="ml-1 text-[10px] text-slate-400">{o.scpi.anneeTd}</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <a href={o.scpi.sourceUrl} target="_blank" rel="noreferrer"
                        className={`hover:underline ${o.scpi.fiabilite === 'SGP officielle' ? 'font-medium text-emerald-700' : o.scpi.fiabilite === 'incertain' ? 'text-amber-700' : 'text-indigo-600'}`}>
                        {o.scpi.fiabilite}
                      </a>
                    </td>
                    <td className="px-5 py-2 text-right">
                      <button onClick={() => onUse(o.scpi, o.duree, base)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-700">
                        Comparer →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 accent-indigo-600" />
      {label}
    </label>
  )
}
