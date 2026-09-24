import { MonthField, NumberField, Segmented, SelectField, SliderField, TextField } from '../../components/fields'
import { GRILLE_LABELS, MONTAGE_LABELS, type GrilleId, type Investment, type Montage } from '../../lib/usufruit'

const GRILLE_OPTIONS = (Object.keys(GRILLE_LABELS) as GrilleId[]).map((g) => ({ value: g, label: GRILLE_LABELS[g] }))
const MONTAGE_OPTIONS = (Object.keys(MONTAGE_LABELS) as Montage[]).map((m) => ({
  value: m,
  label: m === 'usu_np' ? 'Usu / NP' : 'Usu / PP',
}))

export function InvestmentEditor({ inv, onChange }: { inv: Investment; onChange: (patch: Partial<Investment>) => void }) {
  const isPP = inv.montage === 'usu_pp'
  return (
    <div className="grid gap-5">
      <TextField label="Nom" value={inv.nom} onChange={(nom) => onChange({ nom })} />

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

      <Section title="Hypothèses">
        <NumberField label="TD net" value={inv.tdNet} onChange={(tdNet) => onChange({ tdNet })} suffix="%" scale={100} min={0} step={0.1} />
        <NumberField label="Prix de part" value={inv.prixPart} onChange={(prixPart) => onChange({ prixPart })} suffix="€" min={0.01} step={1} />
        {isPP ? (
          <NumberField label="Revalorisation part / an" value={inv.croissancePrixPart}
            onChange={(croissancePrixPart) => onChange({ croissancePrixPart })} suffix="%" scale={100} step={0.1} />
        ) : (
          <NumberField label="Taux de réemploi" value={inv.tauxReemploi} onChange={(tauxReemploi) => onChange({ tauxReemploi })}
            suffix="%" scale={100} min={0} step={0.1} />
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
