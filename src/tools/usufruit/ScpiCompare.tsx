import { useMemo, useState } from 'react'
import { fmtEur, fmtMultiple, fmtPct, fmtPct1 } from '../../lib/format'
import { CLE_ATYPIQUE_RATIO, SCPIS } from '../../lib/scpi'
import { scpiScenarios, type Investment } from '../../lib/usufruit'

const TD_TOLERANCE = 0.01

/**
 * Les hypothèses de l'investissement sélectionné appliquées aux clés des SCPI du marché au TD comparable
 * (± 1 pt) : seule la clé change. Les clés atypiques et les SCPI fermées sont exclues.
 */
export function ScpiCompare({ inv, onPick }: { inv: Investment; onPick: (patch: Partial<Investment>) => void }) {
  const [showAll, setShowAll] = useState(false)

  const rows = useMemo(
    () =>
      scpiScenarios(inv, { tdTolerance: TD_TOLERANCE })
        .filter((r) => !r.cleAtypique && !r.scpi.statut)
        .sort((a, b) => (b.result.headline.value ?? -Infinity) - (a.result.headline.value ?? -Infinity)),
    [inv],
  )
  if (!SCPIS.length) return null

  const metrics = rows[0]?.result.metrics ?? []
  const visible = showAll ? rows : rows.slice(0, 15)
  const current = inv.grille.startsWith('scpi:') ? inv.grille.slice(5) : null

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="px-5 pb-3 pt-4">
        <h2 className="text-sm font-semibold text-slate-900">Clés des SCPI comparables — {inv.dureeAnnees} ans</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Vos hypothèses appliquées à la clé de chaque SCPI dont le TD publié est entre {fmtPct(inv.tdNet - TD_TOLERANCE)} et{' '}
          {fmtPct(inv.tdNet + TD_TOLERANCE)} : {rows.length} SCPI. SCPI fermées et clés atypiques
          (&lt; {CLE_ATYPIQUE_RATIO * 100} % de la médiane marché) exclues. Cliquez une ligne pour appliquer la clé.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-slate-500">Aucune SCPI comparable n’a de clé publiée pour cette durée.</p>
      ) : (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-slate-50">
              <tr className="text-xs text-slate-500">
                <th className="px-5 py-2.5 text-left font-medium">#</th>
                <th className="px-3 py-2.5 text-left font-medium">SCPI</th>
                <th className="px-3 py-2.5 text-right font-medium">Clé usu</th>
                <th className="px-3 py-2.5 text-right font-medium">TD publié</th>
                {metrics.map((m) => (
                  <th key={m.key} className={`whitespace-nowrap px-3 py-2.5 text-right font-medium ${m.headline ? 'text-slate-900' : ''}`}>
                    {m.label.replace(/^TRI /, '')}
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right font-medium">Perçu</th>
                <th className="px-5 py-2.5 text-right font-medium">Multiple</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => {
                const on = r.scpi.id === current
                return (
                  <tr
                    key={r.scpi.id}
                    onClick={() => onPick({ grille: `scpi:${r.scpi.id}` })}
                    className={`cursor-pointer border-b border-slate-50 last:border-0 ${on ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-5 py-2 text-xs text-slate-400">{i + 1}</td>
                    <td className="max-w-[220px] px-3 py-2">
                      <span className="block truncate font-medium text-slate-900">{r.scpi.nom}</span>
                      <span className="block truncate text-[11px] text-slate-500">{r.scpi.sgp}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">{fmtPct1(r.result.cleUsu)}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{fmtPct(r.scpi.td)}</td>
                    {r.result.metrics.map((m) => (
                      <td key={m.key} className={`px-3 py-2 text-right ${m.headline ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                        {fmtPct(m.value)}
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-3 py-2 text-right text-slate-500">{fmtEur(r.result.totalRecu)}</td>
                    <td className="px-5 py-2 text-right text-slate-500">{fmtMultiple(r.result.multiple)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length > 15 && (
            <button onClick={() => setShowAll((s) => !s)}
              className="w-full border-t border-slate-100 py-2.5 text-xs font-medium text-indigo-600 hover:bg-slate-50">
              {showAll ? 'Réduire' : `Afficher les ${rows.length} SCPI`}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
