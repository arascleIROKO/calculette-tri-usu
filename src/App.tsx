import { useEffect, useState } from 'react'
import type { Scpi } from './lib/scpi'
import { scpiInvestment, type Investment } from './lib/usufruit'
import { ClesTool } from './tools/cles/ClesTool'
import { TopTool } from './tools/top/TopTool'
import { useInvestments } from './tools/usufruit/useInvestments'
import { UsufruitTool } from './tools/usufruit/UsufruitTool'

type ToolId = 'usufruit' | 'top' | 'cles'

const TOOLS: { id: ToolId; label: string }[] = [
  { id: 'usufruit', label: 'TRI Usufruit' },
  { id: 'top', label: 'Meilleurs TRI par clé' },
  { id: 'cles', label: 'Clés d’usufruit' },
]

const readHash = (): ToolId => {
  const h = window.location.hash.slice(1)
  return h === 'cles' || h === 'top' ? h : 'usufruit'
}

export default function App() {
  const [tool, setTool] = useState<ToolId>(readHash)
  const store = useInvestments()

  useEffect(() => {
    const onHash = () => setTool(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const go = (t: ToolId) => {
    window.location.hash = t === 'usufruit' ? '' : t
    setTool(t)
    window.scrollTo({ top: 0 })
  }

  /**
   * « Comparer » : investissement 100 % usufruit pré-rempli avec les paramètres publiés de la SCPI
   * (barème, prix de part, TD cible, frais de souscription, délai de jouissance), puis ouverture du comparateur.
   */
  const compareScpi = (s: Scpi, overrides: Partial<Investment> = {}) => {
    store.add(scpiInvestment(s, { partUsufruit: 1, ...overrides }))
    go('usufruit')
  }

  /** Depuis le classement par clé : durée choisie, ticket et date de la référence Zen / Atlas */
  const compareFromRanking = (s: Scpi, duree: number, base: Investment) =>
    compareScpi(s, { nom: `${s.nom} — ${duree} ans`, dureeAnnees: duree, ticketTotal: base.ticketTotal, moisInvestissement: base.moisInvestissement })

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
            {TOOLS.map((t) => (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                aria-current={tool === t.id ? 'page' : undefined}
                className={`flex shrink-0 items-center rounded-lg px-3 py-2 text-left text-sm transition ${
                  tool === t.id ? 'bg-white/10 font-medium text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        {tool === 'cles' && <ClesTool onUse={(s) => compareScpi(s)} />}
        {tool === 'top' && <TopTool onUse={compareFromRanking} />}
        {tool === 'usufruit' && <UsufruitTool store={store} />}
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
