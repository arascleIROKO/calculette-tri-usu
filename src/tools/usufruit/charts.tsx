import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fmtEur, fmtEurCompact, fmtPct } from '../../lib/format'
import type { Investment, Result } from '../../lib/usufruit'

const axisProps = { stroke: '#94a3b8', fontSize: 11, tickLine: false, axisLine: false } as const

export function TriBarChart({ data }: { data: { nom: string; tri: number | null; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 44 + 20)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 56, top: 4, bottom: 4 }} barCategoryGap={10}>
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis type="category" dataKey="nom" width={140} {...axisProps} tick={{ fill: '#475569', fontSize: 12 }} />
        <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => [fmtPct(v as number), 'TRI']} contentStyle={tooltipStyle} />
        <Bar dataKey="tri" radius={[0, 6, 6, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.nom} fill={d.color} />
          ))}
          <LabelList dataKey="tri" position="right" formatter={(v) => fmtPct(v as number)}
            style={{ fill: '#0f172a', fontSize: 12, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  boxShadow: '0 4px 16px rgb(15 23 42 / 0.08)',
  fontSize: 12,
}

/** Flux annuels (hors investissement initial) + cumul, pour l'investissement sélectionné. */
export function CashflowChart({ inv, result, color }: { inv: Investment; result: Result; color: string }) {
  const col = inv.montage === 'usu_np' ? 'blendReemploi' : 'blend'
  const years = new Map<number, number>()
  result.cashflows.forEach((r, m) => {
    if (m === 0) return
    const y = Math.ceil(m / 12)
    years.set(y, (years.get(y) ?? 0) + r[col])
  })
  let cumul = -result.totalInvesti
  const data = [
    { label: 'Invest.', flux: -result.totalInvesti, cumul },
    ...[...years.entries()].map(([y, flux]) => {
      cumul += flux
      return { label: `A${y}`, flux, cumul }
    }),
  ]

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={64} tickFormatter={(v) => fmtEurCompact(v)} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }}
          formatter={(v, name) => [fmtEur(v as number), name === 'flux' ? 'Flux de l’année' : 'Cumul']} />
        <Bar dataKey="flux" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={36}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.flux < 0 ? '#cbd5e1' : color} />
          ))}
        </Bar>
        <Line dataKey="cumul" stroke="#0f172a" strokeWidth={2} dot={false} strokeDasharray="4 3" isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

