import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ENGINE_VERSION, METHOD_NOTES } from '@/lib/rotationEngine';

const FORMULAS = [
    ['Soil health', '0.6 × mean rotation structure + 0.4 × measured organic-carbon position, where structure = residue/cover protection plus bonuses for roots deeper than 90 cm and for legumes.'],
    ['Nitrogen', 'Score = scale(previous legume fixation × 0.5 − crop N removal, from −150 to +40 kg N/ha).'],
    ['Water', 'Score = scale(available ÷ crop demand, 0.4 to 1.1), then −6 for heat stress, −6 for frost stress, and up to −12 for a dry spell longer than 21 days.'],
    ['Pest break', '85 % of a base that starts at 100 and is reduced by same-family repetition (30 / 18 / 9 points for a 0 / 1 / 2-season gap), plus 15 % for family diversity.'],
    ['Erosion', '100 × (1 − mean uncovered fraction × rainfall erosivity ÷ 1.2).'],
    ['Composite', 'Weighted mean of the pillars you weighted above zero. Pillars that cannot be scored are excluded and flagged, not guessed.'],
];

export default function MethodPanel() {
    const [open, setOpen] = useState(false);
    return (
        <section className="rounded-md border border-border/80 bg-card px-5 py-4">
            <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
                <span>
                    <h2 className="text-base text-foreground">How this is calculated</h2>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">Engine {ENGINE_VERSION} · every formula and assumption</p>
                </span>
                {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>

            {open && (
                <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px]">
                            <tbody className="divide-y divide-border/60">
                                {FORMULAS.map(([pillar, formula]) => (
                                    <tr key={pillar} className="align-top">
                                        <th className="w-28 py-2 pr-3 text-left font-medium text-foreground">{pillar}</th>
                                        <td className="py-2 text-muted-foreground">{formula}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <p className="label-eyebrow text-muted-foreground">Assumptions</p>
                        <ul className="mt-1.5 space-y-1.5">
                            {METHOD_NOTES.map((note) => (
                                <li key={note} className="text-[11px] leading-relaxed text-muted-foreground">• {note}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="rounded border border-dashed border-border bg-muted/40 px-3 py-2">
                        <p className="label-eyebrow text-clay">Not modelled</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            Yield, income, labour, soil biology, slope and erosion measurement, variety differences, fertiliser rates and
                            actual pest populations. These indices rank sequences for one field; they are not a prediction of what a season
                            will produce.
                        </p>
                    </div>
                </div>
            )}
        </section>
    );
}