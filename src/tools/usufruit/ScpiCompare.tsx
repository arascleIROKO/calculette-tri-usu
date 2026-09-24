import { useMemo, useState } from 'react'
import { Segmented } from '../../components/fields'
import { fmtEur, fmtMultiple, fmtPct, fmtPct1 } from '../../lib/format'
import { SCPIS, TD_ATYPIQUE } from '../../lib/scpi'
import { scpiScenarios, type Investment } from '../../lib/usufruit'
import { StatutBadge } from '../cles/ClesTool'

type Mode = 'scpi' | 'mine'

/** Classement de toutes les SCPI du marché ayant une clé à la durée de l'investissement sélectionné. */
export function ScpiCompare({ inv, onPick }: { inv: Investment; onPick: (patch: Partial<Investment>) => void }) {
  const [mode, setMode] = useState<Mode>('scpi')
  const [showAll, setShowAll] = useState(false)
  const useScpi = mode === 'scpi'

  const rows = useMemo(
    () =>
      scpiScenarios(inv, { useScpiHypotheses: useScpi }).sort(
        (a, b) => (b.result.headline.value ?? -Infinity) - (a.result.headline.value ?? -Infinity),
      ),
    [inv, useScpi],
  )
  if (!SCPIS.length) return null

  const metrics = rows[0]?.result.metrics ?? []
  const visible = showAll ? rows : rows.slice(0, 15)
  const current = inv.grille.startsWith('scpi:') ? inv.grille.slice(5) : null

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-3 pt-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Toutes les SCPI du marché — {inv.dureeAnnees} ans
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {rows.length} SCPI avec une clé publiée à {inv.dureeAnnees} ans sur {SCPIS.length} en base.{' '}
            {useScpi ? 'TD et prix de part publiés de chaque SCPI.' : 'Vos hypothèses (TD, prix) appliquées à chaque clé.'}{' '}
            Cliquez une ligne pour l’appliquer.
          </p>
        </div>
        <div className="w-64">
          <Segmented<Mode> value={mode} onChange={setMode}
            options={[{ value: 'scpi', label: 'Hypothèses SCPI' }, { value: 'mine', label: 'Mes hypothèses' }]} />
        </div>
      </div>

      {!useScpi && rows.length > 0 && (
        <p className="mx-5 mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200">
          Chaque clé est fixée par la SGP d’après le rendement de sa SCPI : appliquer votre TD à une clé basse (SCPI à faible TD)
          surestime le TRI. Ce mode isole l’effet de la clé, il ne classe pas les SCPI entre elles.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-slate-500">Aucune SCPI n’a de clé publiée pour cette durée.</p>
      ) : (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-sm tabular-nums">
            <thead className="bg-slate-50">
              <tr className="text-xs text-slate-500">
                <th className="px-5 py-2.5 text-left font-medium">#</th>
                <th className="px-3 py-2.5 text-left font-medium">SCPI</th>
                <th className="px-3 py-2.5 text-right font-medium">Clé usu</th>
                <th className="px-3 py-2.5 text-right font-medium">TD</th>
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
                    onClick={() =>
                      onPick({
                        grille: `scpi:${r.scpi.id}`,
                        ...(useScpi ? { tdNet: r.inv.tdNet, prixPart: r.inv.prixPart } : {}),
                      })
                    }
                    className={`cursor-pointer border-b border-slate-50 last:border-0 ${on ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-5 py-2 text-xs text-slate-400">{i + 1}</td>
                    <td className="max-w-[220px] px-3 py-2">
                      <span className="block truncate font-medium text-slate-900">{r.scpi.nom}</span>
                      <span className="block truncate text-[11px] text-slate-500">{r.scpi.sgp}</span>
                      {r.scpi.statut && <StatutBadge statut={r.scpi.statut} />}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">{fmtPct1(r.result.cleUsu)}</td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {fmtPct(r.inv.tdNet)}
                      {useScpi && r.scpi.td == null && <span title="TD non publié : TD saisi utilisé"> *</span>}
                      {useScpi && r.scpi.td != null && r.scpi.td > TD_ATYPIQUE && (
                        <span className="text-amber-600" title="TD atypique (année partielle ou exceptionnelle ?) : à vérifier"> ⚠</span>
                      )}
                    </td>
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
          {useScpi && rows.some((r) => r.scpi.td == null) && (
            <p className="border-t border-slate-100 px-5 py-2 text-[11px] text-slate-400">* TD non publié : le TD saisi est utilisé.</p>
          )}
        </div>
      )}
    </section>
  )
}
