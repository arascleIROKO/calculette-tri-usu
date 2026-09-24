import { useState } from 'react'
import { fmtPct1 } from '../../lib/format'
import { gridRows } from '../../lib/usufruit'

const ITEMS = [
  ['Coupon usufruit', 'Montant usufruit × TD net ÷ clé usufruit, versé mensuellement après le délai de jouissance.'],
  ['Réemploi', 'L’usufruit est amorti linéairement ; l’amortissement est capitalisé au taux de réemploi et restitué à l’échéance.'],
  ['Nue-propriété', 'Valeur à terme = montant NP ÷ clé NP (reconstitution de la pleine propriété).'],
  ['Pleine propriété', 'Parts valorisées au prix de part, éventuellement revalorisé chaque année ; dividendes sur usufruit + PP.'],
  ['TRI', 'XIRR sur flux mensuels datés (base Exact/365), identique au BP Iroko Next, onglet 06.3 – USU TRI.'],
] as const

export function Methodology() {
  const [open, setOpen] = useState(false)
  const grids = [
    ['Zen / Atlas', gridRows('zen_atlas')],
    ['Epsicap 2026', gridRows('epsicap_2026')],
    ['Ancienne', gridRows('ancienne')],
  ] as const

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span>
          <span className="block text-sm font-semibold text-slate-900">Méthodologie & barèmes</span>
          <span className="block text-xs text-slate-500">Hypothèses de calcul et clés de démembrement utilisées</span>
        </span>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`h-5 w-5 text-slate-400 transition ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" />
        </svg>
      </button>
      {open && (
        <div className="grid gap-6 border-t border-slate-100 px-5 py-5 xl:grid-cols-2">
          <dl className="grid gap-3">
            {ITEMS.map(([t, d]) => (
              <div key={t}>
                <dt className="text-xs font-semibold text-slate-900">{t}</dt>
                <dd className="text-xs leading-relaxed text-slate-500">{d}</dd>
              </div>
            ))}
          </dl>
          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-1.5 text-left font-medium">Durée</th>
                  {grids.map(([n]) => (
                    <th key={n} className="py-1.5 text-right font-medium">{n}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grids[0][1].map((row, i) => (
                  <tr key={row.duree} className="border-t border-slate-50">
                    <td className="py-1 text-slate-500">{row.duree} ans</td>
                    {grids.map(([n, g]) => (
                      <td key={n} className="py-1 text-right text-slate-700">{fmtPct1(g[i]?.cle_usufruit)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
