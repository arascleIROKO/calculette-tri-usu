import { MonthField, NumberField, Segmented, SelectField, SliderField, TextField } from '../../components/fields'
import { fmtEur, fmtPct } from '../../lib/format'
import { SCPIS, scpiById } from '../../lib/scpi'
import { GRILLE_LABELS, MONTAGE_LABELS, scpiInvestment, tdSource, type GrilleId, type Investment, type Montage } from '../../lib/usufruit'

const GRILLE_OPTIONS: { value: GrilleId; label: string; group: string }[] = [
  ...(Object.keys(GRILLE_LABELS) as (keyof typeof GRILLE_LABELS)[]).map((g) => ({
    value: g as GrilleId,
    label: GRILLE_LABELS[g],
    group: 'Barèmes BP Iroko',
  })),
  ...SCPIS.map((s) => ({ value: `scpi:${s.id}` as GrilleId, label: `${s.nom} — ${s.sgp}`, group: 'SCPI du marché' })),
]
const MONTAGE_OPTIONS = (Object.keys(MONTAGE_LABELS) as Montage[]).map((m) => ({
  value: m,
  label: m === 'usu_np' ? 'Usu / NP' : 'Usu / PP',
}))

/** Raccourcis de répartition usufruit / NP-PP (les tiers sont exacts) */
const SPLITS = [
  { p: 1, label: '100/0' },
  { p: 0.75, label: '75/25' },
  { p: 2 / 3, label: '66/33' },
  { p: 0.5, label: '50/50' },
  { p: 1 / 3, label: '33/66' },
  { p: 0.25, label: '25/75' },
]

export function InvestmentEditor({ inv, onChange }: { inv: Investment; onChange: (patch: Partial<Investment>) => void }) {
  const isPP = inv.montage === 'usu_pp'
  return (
    <div className="grid gap-5">
      <TextField label="Nom" value={inv.nom} onChange={(nom) => onChange({ nom })} />
      <ScpiParamsBanner inv={inv} onChange={onChange} />

      <Section title="Montage">
        <div className="sm:col-span-2">
          <Segmented value={inv.montage} options={MONTAGE_OPTIONS} onChange={(montage) => onChange({ montage })} />
        </div>
        <div className="sm:col-span-2">
          <SliderField
            label="Répartition du ticket"
            value={inv.partUsufruit}
            onChange={(partUsufruit) => onChange({ partUsufruit })}
            left="Usufruit"
            right={isPP ? 'Pleine propriété' : 'Nue-propriété'}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SPLITS.map(({ p, label }) => (
              <button key={label} type="button" onClick={() => onChange({ partUsufruit: p })}
                className={`rounded-md border px-2 py-0.5 text-[11px] font-medium tabular-nums transition ${
                  Math.abs(inv.partUsufruit - p) < 1e-9
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <NumberField label="Ticket investi" value={inv.ticketTotal} onChange={(ticketTotal) => onChange({ ticketTotal })}
          suffix="€" thousands min={0} step={10000} />
        <NumberField label="Durée" value={inv.dureeAnnees} onChange={(v) => onChange({ dureeAnnees: Math.round(v) })}
          suffix="ans" min={1} max={30} step={1} />
      </Section>

      <Section title="Clé de démembrement">
        <SelectField label="Barème" value={inv.grille} options={GRILLE_OPTIONS} onChange={(grille) => onChange({ grille })} />
        {inv.grille === 'manuel' ? (
          <NumberField label="Clé usufruit" value={inv.cleUsufruitManuelle}
            onChange={(cleUsufruitManuelle) => onChange({ cleUsufruitManuelle })}
            suffix="%" scale={100} min={0.001} max={0.999} step={0.5} />
        ) : (
          <div />
        )}
      </Section>

      <Section title="Frais de souscription">
        <NumberField label="Frais de souscription" value={inv.fraisAcq} onChange={(fraisAcq) => onChange({ fraisAcq })}
          suffix="%" scale={100} min={0} max={0.5} step={0.5}
          hint={inv.partUsufruit < 1
            ? `Sur la ${isPP ? 'PP' : 'NP'} : inclus dans le prix, sortie à la valeur de retrait`
            : 'Sans effet en 100 % usufruit : déjà inclus dans le prix de souscription, base du TD'} />
        <NumberField label="Rétrocession" value={inv.retroFrais} onChange={(retroFrais) => onChange({ retroFrais })}
          suffix="%" scale={100} min={0} max={0.5} step={0.5}
          hint={inv.partUsufruit < 1 ? `En % du montant ${isPP ? 'PP' : 'NP'}, encaissée à l'investissement` : 'S’applique à la part NP / PP'} />
      </Section>

      <Section title="Hypothèses">
        <NumberField label="TD net" value={inv.tdNet} onChange={(tdNet) => onChange({ tdNet })} suffix="%" scale={100} min={0} step={0.1} />
        <NumberField label="Prix de part" value={inv.prixPart} onChange={(prixPart) => onChange({ prixPart })} suffix="€" min={0.01} step={1} />
        {isPP && (
          <NumberField label="Revalorisation part / an" value={inv.croissancePrixPart}
            onChange={(croissancePrixPart) => onChange({ croissancePrixPart })} suffix="%" scale={100} step={0.1} />
        )}
        {!isPP && (
          <NumberField label="Délai de jouissance" value={inv.delaiJouissanceMois}
            onChange={(v) => onChange({ delaiJouissanceMois: Math.round(v) })} suffix="mois" min={0} max={36} step={1} />
        )}
        <MonthField label="Date d'investissement" value={inv.moisInvestissement}
          onChange={(moisInvestissement) => onChange({ moisInvestissement })} />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</legend>
      {children}
    </fieldset>
  )
}

/** Rappel des paramètres publiés de la SCPI du barème, avec un bouton pour les (ré)appliquer. */
function ScpiParamsBanner({ inv, onChange }: { inv: Investment; onChange: (patch: Partial<Investment>) => void }) {
  if (!inv.grille.startsWith('scpi:')) return null
  const s = scpiById(inv.grille.slice(5))
  if (!s) return null
  const src = tdSource(s)
  const apply = () => {
    const p = scpiInvestment(s)
    onChange({ tdNet: p.tdNet, prixPart: p.prixPart, fraisAcq: p.fraisAcq, delaiJouissanceMois: p.delaiJouissanceMois })
  }
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-2">
        <p>
          <b className="font-semibold text-slate-800">{s.nom}</b> · TD {src === 'cible' ? 'cible' : src === 'réalisé' ? 'réalisé (pas d’objectif publié)' : 'non publié'}{' '}
          <b>{fmtPct(s.tdCible ?? s.td)}</b>{(s.anneeTdCible ?? s.anneeTd) ? ` (${s.anneeTdCible ?? s.anneeTd})` : ''} · prix{' '}
          <b>{s.prixPart ? fmtEur(s.prixPart) : '—'}</b> · frais <b>{s.commission != null ? fmtPct(s.commission) : '—'}</b> · délai{' '}
          <b>{s.delaiJouissance != null ? `${s.delaiJouissance} mois` : '—'}</b>
          {s.paramsSourceUrl && (
            <>
              {' · '}
              <a href={s.paramsSourceUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">source</a>
            </>
          )}
        </p>
        <button type="button" onClick={apply}
          className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-700">
          Appliquer
        </button>
      </div>
    </div>
  )
}
