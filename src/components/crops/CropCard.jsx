import { CROP_GROUPS, labelOf } from '@/lib/cropTraits';
import { formatNumber } from '@/lib/nasa';

export default function CropCard({ crop, onOpen }) {
    return (
        <button
            type="button"
            onClick={() => onOpen(crop)}
            className="flex h-full flex-col rounded-md border border-border/80 bg-card px-4 py-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">{crop.name}</h3>
                    {crop.scientific_name && <p className="mt-0.5 truncate text-[10px] italic text-muted-foreground">{crop.scientific_name}</p>}
                </div>
                <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                    {labelOf(CROP_GROUPS, crop.crop_group, 'Unclassified')}
                </span>
            </div>

            <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{crop.family}</p>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[10px]">
                <div>
                    <dt className="text-muted-foreground">Cycle</dt>
                    <dd className="figure text-foreground">{crop.cycle_days ? `${crop.cycle_days} d` : '—'}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground">N fixed</dt>
                    <dd className="figure text-foreground">
                        {crop.nitrogen_fixation_kg_ha ? `${crop.nitrogen_fixation_kg_ha} kg/ha` : 'none'}
                    </dd>
                </div>
                <div>
                    <dt className="text-muted-foreground">Water need</dt>
                    <dd className="figure text-foreground">{crop.water_demand_mm ? `${crop.water_demand_mm} mm` : '—'}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground">Rooting</dt>
                    <dd className="figure text-foreground">{crop.rooting_depth_cm ? `${crop.rooting_depth_cm} cm` : '—'}</dd>
                </div>
            </dl>

            <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
                <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                    {crop.residue_index ? `${crop.residue_index} residue` : 'residue unknown'}
                </span>
                {crop.ph_min != null && crop.ph_max != null && (
                    <span className="figure rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                        pH {formatNumber(crop.ph_min, 1)}–{formatNumber(crop.ph_max, 1)}
                    </span>
                )}
                {crop.confidence && (
                    <span className="ml-auto text-[9px] uppercase tracking-wide text-muted-foreground">{crop.confidence} confidence</span>
                )}
            </div>
        </button>
    );
}