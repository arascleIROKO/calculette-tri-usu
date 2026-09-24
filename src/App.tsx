import { UsufruitTool } from './tools/usufruit/UsufruitTool'

const TOOLS = [
  { id: 'usufruit', label: 'TRI Usufruit', ready: true },
  { id: 'np', label: 'TRI Nue-propriété', ready: false },
  { id: 'scpi', label: 'Rendement SCPI', ready: false },
]

export default function App() {
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
              <span
                key={t.id}
                aria-current={t.ready ? 'page' : undefined}
                className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                  t.ready ? 'bg-white/10 font-medium text-white' : 'cursor-not-allowed text-slate-500'
                }`}
              >
                {t.label}
                {!t.ready && <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">bientôt</span>}
              </span>
            ))}
          </nav>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <UsufruitTool />
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
