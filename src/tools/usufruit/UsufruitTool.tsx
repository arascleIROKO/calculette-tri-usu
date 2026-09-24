import { useMemo, useState } from 'react'
import { fmtEur, fmtMultiple, fmtPct, SERIES_COLORS } from '../../lib/format'
import { compute, GRILLE_LABELS, PRESET_NAMES, type Investment, type Result } from '../../lib/usufruit'
import { CashflowChart, TriBarChart } from './charts'
import { InvestmentEditor } from './InvestmentEditor'
import { KeyDetail } from './KeyDetail'
import { Methodology } from './Methodology'
import { useInvestments } from './useInvestments'

type Computed = { inv: Investment; color: string; result: Result | null; error: string | null }

export function UsufruitTool() {
  const store = useInvestments()
  const { investments, selected } = store

  const computed: Computed[] = useMemo(
    () =>
      investments.map((inv, i) => {
        const color = SERIES_COLORS[i % SERIES_COLORS.length]
        try {
          return { inv, color, result: compute(inv), error: null }
        } catch (e) {
          return { inv, color, result: null, error: (e as Error).message }
        }
      }),
    [investments],
  )
  const current = computed.find((c) => c.inv.id === selected?.id)
  const ranked = computed
    .filter((c) => c.result?.headline.value != null)
    .sort((a, b) => b.result!.headline.value! - a.result!.headline.value!)

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">Démembrement SCPI</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Comparateur TRI usufruit</h1>
          <p className="mt-1 text-sm text-slate-500">
            Comparez des investissements en usufruit, nue-propriété ou pleine propriété. Les calculs se mettent à jour en direct.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={store.reset} className="btn-ghost">
            Réinitialiser
          </button>
          <AddMenu onBlank={store.addBlank} onPreset={store.addPreset} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        {/* Colonne gauche : liste + édition */}
        <div className="flex flex-col gap-4">
          <Card className="p-2">
            <ul className="flex flex-col">
              {computed.map(({ inv, color, result, error }) => {
                const active = inv.id === selected?.id
                return (
                  <li key={inv.id}>
                    <button
                      onClick={() => store.select(inv.id)}
                      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                        active ? 'bg-slate-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{inv.nom || 'Sans nom'}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {fmtEur(inv.ticketTotal)} · {inv.dureeAnnees} ans · {Math.round(inv.partUsufruit * 100)} % usu
                        </span>
                      </span>
                      <span className={`text-sm font-semibold tabular-nums ${error ? 'text-rose-600' : 'text-slate-900'}`}>
                        {error ? 'Erreur' : fmtPct(result?.headline.value)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          {current && (
            <Card>
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: current.color }} />
                  <h2 className="text-sm font-semibold text-slate-900">Paramètres</h2>
                </div>
                <div className="flex gap-1">
                  <button className="btn-icon" title="Dupliquer" onClick={() => store.duplicate(current.inv.id)}>
                    <IconCopy />
                  </button>
                  <button className="btn-icon hover:!text-rose-600" title="Supprimer" onClick={() => store.remove(current.inv.id)}>
                    <IconTrash />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <InvestmentEditor inv={current.inv} onChange={(patch) => store.update(current.inv.id, patch)} />
              </div>
            </Card>
          )}
        </div>

        {/* Colonne droite : résultats */}
        <div className="flex min-w-0 flex-col gap-6">
          {current?.error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <b>{current.inv.nom}</b> : {current.error}
            </div>
          )}

          {current?.result && <LegsPanel c={current} />}

          {current?.result && (
            <Card title={`Flux annuels — ${current.inv.nom}`} subtitle="Flux nets par année et cumul (ligne pointillée)">
              <div className="px-2 pb-4">
                <CashflowChart inv={current.inv} result={current.result} color={current.color} />
              </div>
            </Card>
          )}

          {current?.result && <KeyDetail inv={current.inv} onPick={(patch) => store.update(current.inv.id, patch)} />}

          <Card title="Classement" subtitle="TRI principal : blendé + réemploi (Usu/NP) ou blendé (Usu/PP)">
            <div className="px-3 pb-3">
              {ranked.length ? (
                <TriBarChart data={ranked.map((c) => ({ nom: c.inv.nom, tri: c.result!.headline.value, color: c.color }))} />
              ) : (
                <p className="px-2 py-6 text-sm text-slate-500">Aucun résultat à afficher.</p>
              )}
            </div>
          </Card>

          <Card title="Comparaison détaillée">
            <ComparisonTable computed={computed} onSelect={store.select} selectedId={selected?.id} />
          </Card>

          <Methodology />
        </div>
      </div>
    </div>
  )
}

const METRIC_ROWS: { key: string; label: string }[] = [
  { key: 'usu', label: 'TRI usufruit (cash)' },
  { key: 'usuReemploi', label: 'TRI usufruit + réemploi' },
  { key: 'np', label: 'TRI nue-prop. / pleine prop.' },
  { key: 'blend', label: 'TRI blendé' },
  { key: 'blendReemploi', label: 'TRI blendé + réemploi' },
]

function ComparisonTable({ computed, onSelect, selectedId }: { computed: Computed[]; onSelect: (id: string) => void; selectedId?: string }) {
  const rows: { label: string; render: (c: Computed) => React.ReactNode; strong?: boolean }[] = [
    { label: 'Montage', render: (c) => (c.inv.montage === 'usu_np' ? 'Usu / NP' : 'Usu / PP') },
    { label: 'Barème', render: (c) => GRILLE_LABELS[c.inv.grille] },
    { label: 'Ticket', render: (c) => fmtEur(c.inv.ticketTotal) },
    { label: 'Durée', render: (c) => `${c.inv.dureeAnnees} ans` },
    { label: 'Part usufruit', render: (c) => `${Math.round(c.inv.partUsufruit * 100)} %` },
    { label: 'TD net', render: (c) => fmtPct(c.inv.tdNet) },
    { label: 'Clé usufruit', render: (c) => fmtPct(c.result?.cleUsu) },
    ...METRIC_ROWS.map((m) => ({
      label: m.label,
      strong: m.key === 'blendReemploi',
      render: (c: Computed) => {
        const metric = c.result?.metrics.find((x) => x.key === m.key)
        return metric ? fmtPct(metric.value) : <span className="text-slate-300">—</span>
      },
    })),
    { label: 'Multiple', render: (c) => (c.result ? fmtMultiple(c.result.multiple) : '—') },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50">
            <th className="sticky left-0 bg-slate-50 px-5 py-2.5 text-left text-xs font-medium text-slate-500" />
            {computed.map((c) => (
              <th key={c.inv.id} className="px-4 py-2.5 text-right">
                <button onClick={() => onSelect(c.inv.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold ${c.inv.id === selectedId ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                  {c.inv.nom}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-slate-50 last:border-0">
              <td className={`sticky left-0 whitespace-nowrap bg-white px-5 py-2.5 text-xs ${r.strong ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                {r.label}
              </td>
              {computed.map((c) => (
                <td key={c.inv.id} className={`whitespace-nowrap px-4 py-2.5 text-right ${r.strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                  {c.error && r.label.startsWith('TRI') ? <span className="text-rose-500">Erreur</span> : r.render(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AddMenu({ onBlank, onPreset }: { onBlank: () => void; onPreset: (n: (typeof PRESET_NAMES)[number]) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button className="btn-primary" onClick={() => setOpen((o) => !o)}>
        <span className="text-base leading-none">+</span> Ajouter
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/5">
            <MenuItem onClick={() => { onBlank(); setOpen(false) }} title="Nouvel investissement" desc="Partir d’un modèle vierge" />
            <div className="my-1 h-px bg-slate-100" />
            {PRESET_NAMES.map((n) => (
              <MenuItem key={n} onClick={() => { onPreset(n); setOpen(false) }} title={n} desc="Référence Iroko" />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MenuItem({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50">
      <span className="block text-sm font-medium text-slate-900">{title}</span>
      <span className="block text-xs text-slate-500">{desc}</span>
    </button>
  )
}

export function Card({ title, subtitle, className = '', children }: { title?: string; subtitle?: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-xs ${className}`}>
      {title && (
        <div className="px-5 pb-3 pt-4">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

/** TRI de chaque jambe (usufruit, NP / PP) et du blendé pour l'investissement sélectionné. */
function LegsPanel({ c }: { c: Computed }) {
  const r = c.result!
  const pctUsu = Math.round(c.inv.partUsufruit * 100)
  const other = c.inv.montage === 'usu_pp' ? 'PP' : 'NP'
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-1 pt-4">
        <h2 className="text-sm font-semibold text-slate-900">TRI par jambe — {c.inv.nom}</h2>
        <p className="text-xs text-slate-500">
          {pctUsu} % usufruit / {100 - pctUsu} % {other} · {c.inv.dureeAnnees} ans · clé usu {fmtPct(r.cleUsu)}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden px-5 py-4 sm:grid-cols-3 xl:grid-cols-5">
        {r.metrics.map((m) => (
          <div key={m.key} className="py-1 pr-3">
            <p className="text-xs text-slate-500">{m.label}</p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight"
              style={{ color: m.headline ? c.color : '#0f172a' }}>
              {fmtPct(m.value)}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        <span>Investi <b className="font-semibold tabular-nums text-slate-800">{fmtEur(r.totalInvesti)}</b></span>
        <span>Total perçu <b className="font-semibold tabular-nums text-slate-800">{fmtEur(r.totalRecu)}</b></span>
        <span>Multiple <b className="font-semibold tabular-nums text-slate-800">{fmtMultiple(r.multiple)}</b></span>
      </div>
    </section>
  )
}

const IconCopy = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
    <rect x="6.5" y="6.5" width="10" height="10" rx="2" />
    <path d="M13.5 6.5V5a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 5v7A1.5 1.5 0 0 0 5 13.5h1.5" />
  </svg>
)
const IconTrash = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
    <path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5 5.5l.8 10.1a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4L15 5.5" />
  </svg>
)
