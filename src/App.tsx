import { useEffect, useState } from 'react'
import { scpiDurations, type Scpi } from './lib/scpi'
import { blankInvestment } from './lib/usufruit'
import { ClesTool } from './tools/cles/ClesTool'
import { useInvestments } from './tools/usufruit/useInvestments'
import { UsufruitTool } from './tools/usufruit/UsufruitTool'

type ToolId = 'usufruit' | 'cles'

const TOOLS: { id: ToolId | string; label: string; ready: boolean }[] = [
  { id: 'usufruit', label: 'TRI Usufruit', ready: true },
  { id: 'cles', label: 'Clés d’usufruit', ready: true },
  { id: 'np', label: 'TRI Nue-propriété', ready: false },
  { id: 'scpi', label: 'Rendement SCPI', ready: false },
]

const readHash = (): ToolId => (window.location.hash === '#cles' ? 'cles' : 'usufruit')

export default function App() {
  const [tool, setTool] = useState<ToolId>(readHash)
  const store = useInvestments()

  useEffect(() => {
    const onHash = () => setTool(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (t: ToolId) => {
    window.location.hash = t === 'cles' ? 'cles' : ''
    setTool(t)
    window.scrollTo({ top: 0 })
  }

  const compareScpi = (s: Scpi) => {
    const durations = scpiDurations(s)
    const base = blankInvestment(store.investments.length + 1)
    store.add({
      ...base,
      nom: s.nom,
      grille: `scpi:${s.id}`,
      dureeAnnees: durations.includes(base.dureeAnnees) ? base.dureeAnnees : durations[0],
      tdNet: s.td ?? base.tdNet,
      prixPart: s.prixPart ?? base.prixPart,
    })
    go('usufruit')
  }

  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-slate-800 bg-slate-950 text-slate-300 lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="lg:sticky lg:top-0">
          <div className="flex items-center gap-2.5 px-5 py-4 lg:py-6">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight text-white">
              Fund<span className="text-emerald-400">ToolBox</span>
            </span>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
            <p className="hidden px-2 pb-2 text-[11px] font-medium uppercase tracking-wider text-slate-500 lg:block">Outils</p>
            {TOOLS.map((t) =>
              t.ready ? (
                <button
                  key={t.id}
                  onClick={() => go(t.id as ToolId)}
                  aria-current={tool === t.id ? 'page' : undefined}
                  className={`flex shrink-0 items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                    tool === t.id ? 'bg-white/10 font-medium text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ) : (
                <span key={t.id} className="flex shrink-0 cursor-not-allowed items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-slate-500">
                  {t.label}
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">bientôt</span>
                </span>
              ),
            )}
          </nav>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {tool === 'cles' ? <ClesTool onUse={compareScpi} /> : <UsufruitTool store={store} />}
      </main>
    </div>
  )
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7">
      <rect width="32" height="32" rx="8" fill="#1e293b" />
      <path d="M8 22l5-6 4 3 7-9" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
