import { useEffect, useId, useState, type ReactNode } from 'react'

const inputBase =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-xs outline-none transition ' +
  'placeholder:text-slate-400 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15'

export function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  suffix?: string
  /** Multiplicateur d'affichage (100 pour saisir des pourcentages) */
  scale?: number
  step?: number
  min?: number
  max?: number
  hint?: string
  thousands?: boolean
}

const toDisplay = (v: number, scale: number, thousands: boolean) => {
  const n = Math.round(v * scale * 1e6) / 1e6
  return thousands ? n.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : String(n).replace('.', ',')
}

/** Champ numérique qui garde la saisie libre en cours de frappe et ne remonte que des valeurs valides. */
export function NumberField({ label, value, onChange, suffix, scale = 1, step, min, max, hint, thousands = false }: NumberFieldProps) {
  const [text, setText] = useState(() => toDisplay(value, scale, thousands))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(toDisplay(value, scale, thousands))
  }, [value, scale, thousands, focused])

  const commit = (raw: string) => {
    const n = Number(raw.replace(/[\s  ]/g, '').replace(',', '.'))
    if (raw.trim() === '' || !isFinite(n)) return
    let v = n / scale
    if (min != null) v = Math.max(min, v)
    if (max != null) v = Math.min(max, v)
    onChange(v)
  }

  const bump = (dir: 1 | -1) => {
    if (!step) return
    let v = Math.round((value * scale + dir * step) * 1e6) / 1e6 / scale
    if (min != null) v = Math.max(min, v)
    if (max != null) v = Math.min(max, v)
    onChange(v)
    setText(toDisplay(v, scale, thousands))
  }

  return (
    <Field label={label} hint={hint}>
      {(id) => (
        <div className="relative">
          <input
            id={id}
            inputMode="decimal"
            className={`${inputBase} tabular-nums ${suffix ? 'pr-10' : ''}`}
            value={text}
            onFocus={() => setFocused(true)}
            onChange={(e) => {
              setText(e.target.value)
              commit(e.target.value)
            }}
            onBlur={() => {
              setFocused(false)
              setText(toDisplay(value, scale, thousands))
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                bump(1)
              } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                bump(-1)
              }
            }}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
              {suffix}
            </span>
          )}
        </div>
      )}
    </Field>
  )
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      {(id) => <input id={id} className={inputBase} value={value} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  )
}

export function MonthField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      {(id) => (
        <input
          id={id}
          type="month"
          className={inputBase}
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      )}
    </Field>
  )
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <Field label={label}>
      {(id) => (
        <select id={id} className={`${inputBase} appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8`}
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z'/%3E%3C/svg%3E\")" }}
          value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex w-full rounded-lg bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SliderField({
  label,
  value,
  onChange,
  left,
  right,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  left: string
  right: string
}) {
  return (
    <Field label={label}>
      {(id) => (
        <div className="flex flex-col gap-1.5">
          <input
            id={id}
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(value * 100)}
            onChange={(e) => onChange(Number(e.target.value) / 100)}
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-[11px] tabular-nums text-slate-500">
            <span>
              {left} <b className="font-semibold text-slate-700">{Math.round(value * 100)} %</b>
            </span>
            <span>
              {right} <b className="font-semibold text-slate-700">{Math.round((1 - value) * 100)} %</b>
            </span>
          </div>
        </div>
      )}
    </Field>
  )
}
