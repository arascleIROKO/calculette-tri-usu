import { useEffect, useState } from 'react'
import { blankInvestment, newId, presetInvestment, type Investment } from '../../lib/usufruit'

const STORAGE_KEY = 'fundtoolbox.usufruit.v1'

const defaults = (): Investment[] => [presetInvestment('Iroko Zen'), presetInvestment('Iroko Atlas')]

function load(): Investment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Investment[]
      if (Array.isArray(parsed) && parsed.length) return parsed.map((p) => ({ ...blankInvestment(0), ...p }))
    }
  } catch {
    /* stockage indisponible : on repart des valeurs par défaut */
  }
  return defaults()
}

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>(load)
  const [selectedId, setSelectedId] = useState<string>(() => investments[0]?.id ?? '')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(investments))
    } catch {
      /* ignore */
    }
  }, [investments])

  const selected = investments.find((i) => i.id === selectedId) ?? investments[0]

  const add = (inv: Investment) => {
    setInvestments((xs) => [...xs, inv])
    setSelectedId(inv.id)
  }

  return {
    investments,
    selected,
    select: setSelectedId,
    update: (id: string, patch: Partial<Investment>) =>
      setInvestments((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    add,
    addBlank: () => add(blankInvestment(investments.length + 1)),
    addPreset: (name: Parameters<typeof presetInvestment>[0]) => add(presetInvestment(name)),
    duplicate: (id: string) => {
      const src = investments.find((x) => x.id === id)
      if (src) add({ ...src, id: newId(), nom: `${src.nom} (copie)` })
    },
    remove: (id: string) => {
      const idx = investments.findIndex((x) => x.id === id)
      const next = investments.filter((x) => x.id !== id)
      setInvestments(next)
      if (id === selected?.id) setSelectedId(next[Math.max(0, idx - 1)]?.id ?? '')
    },
    reset: () => {
      const d = defaults()
      setInvestments(d)
      setSelectedId(d[0].id)
    },
  }
}
