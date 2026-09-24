import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtMultiple, fmtPct, fmtPct1 } from '../../lib/format'
import { keyScenarios, type Investment } from '../../lib/usufruit'

const LEG_COLORS: Record<string, string> = {
  usu: '#4f46e5',
  np: '#059669',
  blend: '#0f172a',
}

/** Même investissement recalculé pour chaque clé du barème (une ligne = une durée = une clé). */
export function KeyDetail({ inv, onPick }: { inv: Investment; onPick: (patch: Partial<Investment>) => void }) {
  const manual = inv.grille === 'manuel'
  const rows = keyScenarios(inv)
  if (!rows.length) return null
  const metrics = rows[0].result.metrics
  const isCurrent = (r: (typeof rows)[number]) =>
    manual ? Math.abs(r.cleUsu - inv.cleUsufruitManuelle) < 1e-9 : r.duree === inv.dureeAnnees

  const xKey = manual ? 'cle' : 'duree'
  const chartData = rows.map((r) => ({
    duree: r.duree,
    cle: fmtPct1(r.cleUsu),
    ...Object.fromEntries(r.result.metrics.map((m) => [m.key, m.value])),
  }))
  const current = rows.find(isCurrent)

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="px-5 pb-3 pt-4">
        <h2 className="text-sm font-semibold text-slate-900">Détail par clé — {inv.nom}</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {manual
            ? `Sensibilité à la clé usufruit, durée fixée à ${inv.dureeAnnees} ans. Cliquez une ligne pour l’appliquer.`
            : 'Vos hypothèses recalculées pour chaque durée du barème, donc chaque clé. Cliquez une ligne pour l’appliquer.'}
        </p>
      </div>

      <div className="px-2">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v) => (manual ? v : `${v} a`)} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => fmtPct1(v)} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
              labelFormatter={(l) => (manual ? `Clé ${l}` : `${l} ans`)}
              formatter={(v, key) => [fmtPct(v as number), metrics.find((m) => m.key === key)?.label ?? key]}
            />
            <Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }}
              formatter={(key) => metrics.find((m) => m.key === key)?.label ?? key} />
            {current && <ReferenceLine x={manual ? fmtPct1(current.cleUsu) : current.duree} stroke="#cbd5e1" strokeDasharray="3 3" />}
            {metrics.map((m) => (
              <Line key={m.key} dataKey={m.key} stroke={LEG_COLORS[m.key]} dot={false} isAnimationActive={false}
                strokeWidth={m.headline ? 2.5 : 1.75} strokeDasharray={m.key === 'usu' ? '4 3' : undefined} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="max-h-[420px] overflow-auto border-t border-slate-100">
        <table className="w-full text-sm tabular-nums">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="text-xs text-slate-500">
              <th className="px-5 py-2.5 text-left font-medium">Durée</th>
              <th className="px-3 py-2.5 text-right font-medium">Clé usu</th>
              <th className="px-3 py-2.5 text-right font-medium">Clé {inv.montage === 'usu_pp' ? 'PP' : 'NP'}</th>
              {metrics.map((m) => (
                <th key={m.key} className={`whitespace-nowrap px-3 py-2.5 text-right font-medium ${m.headline ? 'text-slate-900' : ''}`}>
                  {m.label.replace(/^TRI /, '')}
                </th>
              ))}
              <th className="px-5 py-2.5 text-right font-medium">Multiple</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const on = isCurrent(r)
              return (
                <tr
                  key={`${r.duree}-${r.cleUsu}`}
                  onClick={() => onPick(manual ? { cleUsufruitManuelle: r.cleUsu } : { dureeAnnees: r.duree })}
                  className={`cursor-pointer border-b border-slate-50 last:border-0 ${on ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}
                >
                  <td className="whitespace-nowrap px-5 py-2 text-slate-700">
                    {r.duree} ans
                    {on && <span className="ml-2 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-medium text-white">scénario</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700">{fmtPct1(r.cleUsu)}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{fmtPct1(r.result.cleNp)}</td>
                  {r.result.metrics.map((m) => (
                    <td key={m.key} className={`px-3 py-2 text-right ${m.headline ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                      {fmtPct(m.value)}
                    </td>
                  ))}
                  <td className="px-5 py-2 text-right text-slate-500">{fmtMultiple(r.result.multiple)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
