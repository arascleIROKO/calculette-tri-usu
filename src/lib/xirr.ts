/** XIRR sur flux datés, base Actual/365 (même convention que pyxirr / Excel XIRR). */
const DAY_MS = 86_400_000

export function xirr(dates: Date[], flows: number[]): number | null {
  if (dates.length !== flows.length || flows.length < 2) return null
  if (!flows.some((f) => f > 0) || !flows.some((f) => f < 0)) return null

  const t0 = dates[0].getTime()
  const years = dates.map((d) => (d.getTime() - t0) / DAY_MS / 365)

  const npv = (r: number) => flows.reduce((s, f, i) => s + f / Math.pow(1 + r, years[i]), 0)
  const dnpv = (r: number) =>
    flows.reduce((s, f, i) => s - (years[i] * f) / Math.pow(1 + r, years[i] + 1), 0)

  // Newton-Raphson
  let r = 0.1
  for (let i = 0; i < 100; i++) {
    const v = npv(r)
    const d = dnpv(r)
    if (!isFinite(v) || !isFinite(d) || d === 0) break
    const next = r - v / d
    if (next <= -1) break
    if (Math.abs(next - r) < 1e-12) return next
    r = next
  }

  // Repli : bissection sur ]-1, 10]
  let lo = -0.9999
  let hi = 10
  let flo = npv(lo)
  if (flo * npv(hi) > 0) return null
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2
    const fm = npv(mid)
    if (Math.abs(fm) < 1e-9 || hi - lo < 1e-12) return mid
    if (flo * fm < 0) hi = mid
    else {
      lo = mid
      flo = fm
    }
  }
  return (lo + hi) / 2
}
