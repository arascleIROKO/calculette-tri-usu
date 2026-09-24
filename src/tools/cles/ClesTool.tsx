import { useMemo, useState } from 'react'
import { fmtEur, fmtPct, fmtPct1 } from '../../lib/format'
import { SCPI_DB, SCPIS, TD_ATYPIQUE, type Scpi } from '../../lib/scpi'

const DURATIONS = Array.from({ length: 18 }, (_, i) => i + 3)

/** Couleur de cellule : plus la clé usufruit est élevée, plus l'indigo est soutenu. */
function heat(k: number) {
  const t = Math.min(1, Math.max(0, (k - 0.1) / 0.45))
  return { background: `rgb(79 70 229 / ${0.06 + t * 0.5})`, color: t > 0.6 ? '#fff' : '#1e293b' }
}

export function ClesTool({ onUse }: { onUse: (scpi: Scpi) => void }) {
  const [q, setQ] = useState('')
  const [sgp, setSgp] = useState('')
  const sgps = useMemo(() => [...new Set(SCPIS.map((s) => s.sgp))].sort((a, b) => a.localeCompare(b, 'fr')), [])
  const needle = q.trim().toLowerCase()
  const rows = SCPIS.filter(
    (s) => (!sgp || s.sgp === sgp) && (!needle || `${s.nom} ${s.sgp} ${s.type ?? ''}`.toLowerCase().includes(needle)),
  )

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">Démembrement SCPI</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Clés d’usufruit du marché</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          {SCPIS.length} SCPI, barèmes de clés d’usufruit temporaire par durée, avec dernier TD et prix de part publiés.
          Collecte {SCPI_DB.collecte}. Ce sont des données publiques à revérifier auprès de la société de gestion avant tout engagement.
        </p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span><b className="font-medium text-emerald-700">SGP officielle</b> : barème publié par la société de gestion</span>
          <span><b className="font-medium text-indigo-600">courtier</b> : tableau d’un courtier, recoupé quand possible</span>
          <span><b className="font-medium text-amber-700">incertain</b> : sources en désaccord ou source unique douteuse</span>
          <span>Survolez un nom pour voir les notes de collecte.</span>
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une SCPI, une SGP, un type…"
          className="w-full max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15" />
        <select value={sgp} onChange={(e) => setSgp(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-xs outline-none focus:border-indigo-500">
          <option value="">Toutes les sociétés de gestion</option>
          {sgps.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span className="self-center text-xs text-slate-500">{rows.length} résultat{rows.length > 1 ? 's' : ''}</span>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-left font-medium">SCPI</th>
                <th className="px-2 py-2.5 text-right font-medium">TD</th>
                <th className="px-2 py-2.5 text-right font-medium">Prix</th>
                {DURATIONS.map((d) => (
                  <th key={d} className="px-1.5 py-2.5 text-center font-medium">{d} a</th>
                ))}
                <th className="px-4 py-2.5 text-left font-medium">Source</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="sticky left-0 z-10 max-w-[220px] bg-white px-4 py-2">
                    <span className="block truncate text-sm font-medium text-slate-900" title={s.notes ?? undefined}>{s.nom}</span>
                    <span className="block truncate text-[11px] text-slate-500">{s.sgp}{s.type ? ` · ${s.type}` : ''}</span>
                    {s.statut && <StatutBadge statut={s.statut} />}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-slate-700">
                    {fmtPct(s.td)}
                    {s.td != null && s.td > TD_ATYPIQUE && <span className="text-amber-600" title="TD atypique : à vérifier"> ⚠</span>}
                    {s.anneeTd && <span className="block text-[10px] text-slate-400">{s.anneeTd}</span>}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-slate-700">{s.prixPart ? fmtEur(s.prixPart) : '—'}</td>
                  {DURATIONS.map((d) => {
                    const k = s.cles[String(d)]
                    return (
                      <td key={d} className="px-0.5 py-1 text-center">
                        {k != null ? (
                          <span className="block rounded px-1 py-1 text-[11px] font-medium" style={heat(k)}>{fmtPct1(k)}</span>
                        ) : (
                          <span className="text-slate-200">·</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="whitespace-nowrap px-4 py-2">
                    <a href={s.sourceUrl} target="_blank" rel="noreferrer" title={s.notes ?? undefined}
                      className={`hover:underline ${s.fiabilite === 'SGP officielle' ? 'font-medium text-emerald-700' : s.fiabilite === 'incertain' ? 'text-amber-700' : 'text-indigo-600'}`}>
                      {s.fiabilite}
                    </a>
                    {s.dateSource && <span className="block text-[10px] text-slate-400">{s.dateSource}</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <button onClick={() => onUse(s)} className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-700">
                      Comparer →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="px-5 py-8 text-center text-sm text-slate-500">Aucune SCPI ne correspond.</p>}
        </div>
      </section>
    </div>
  )
}

export function StatutBadge({ statut }: { statut: string }) {
  return (
    <span className="mt-0.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
      {statut}
    </span>
  )
}
