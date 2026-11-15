import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import ConfirmDelete from '@/components/common/ConfirmDelete';
import { CROP_GROUPS, COVER_OPTIONS, DRAINAGE_OPTIONS, FROST_OPTIONS, RESIDUE_OPTIONS, SALINITY_OPTIONS, labelOf } from '@/lib/cropTraits';
import { formatNumber } from '@/lib/nasa';

export default function CropDetailDialog({ crop, open, onOpenChange, canEdit, onEdit, onDelete }) {
    if (!crop) return null;
    const rows = [
        ['Botanical family', crop.family],
        ['Group', labelOf(CROP_GROUPS, crop.crop_group, 'Unclassified')],
        ['Cycle length', crop.cycle_days ? `${crop.cycle_days} days` : 'Not recorded'],
        ['Seasons', (crop.growing_seasons || []).join(', ') || 'Not recorded'],
        ['Nitrogen fixed', crop.nitrogen_fixation_kg_ha ? `${crop.nitrogen_fixation_kg_ha} kg N/ha` : 'Not a fixing crop'],
        ['N removal', crop.nitrogen_demand_kg_ha ? `${crop.nitrogen_demand_kg_ha} kg N/ha` : 'Not recorded'],
        ['P removal', crop.phosphorus_demand_kg_ha ? `${crop.phosphorus_demand_kg_ha} kg P/ha` : 'Not recorded'],
        ['K removal', crop.potassium_demand_kg_ha ? `${crop.potassium_demand_kg_ha} kg K/ha` : 'Not recorded'],
        ['Seasonal water need', crop.water_demand_mm ? `${crop.water_demand_mm} mm` : 'Not recorded'],
        ['Rooting depth', crop.rooting_depth_cm ? `${crop.rooting_depth_cm} cm` : 'Not recorded'],
        ['Residue', labelOf(RESIDUE_OPTIONS, crop.residue_index)],
        ['Soil cover', labelOf(COVER_OPTIONS, crop.soil_cover_index)],
        ['pH range', crop.ph_min != null && crop.ph_max != null ? `${formatNumber(crop.ph_min, 1)} – ${formatNumber(crop.ph_max, 1)}` : 'Not recorded'],
        ['Drainage', labelOf(DRAINAGE_OPTIONS, crop.drainage_requirement)],
        ['Heat limit', crop.heat_tolerance_c ? `${crop.heat_tolerance_c} °C` : 'Not recorded'],
        ['Frost tolerance', labelOf(FROST_OPTIONS, crop.frost_tolerance)],
        ['Salinity tolerance', labelOf(SALINITY_OPTIONS, crop.salinity_tolerance)],
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-heading text-lg">{crop.name}</DialogTitle>
                    <DialogDescription className="text-[11px]">
                        {crop.scientific_name ? <span className="italic">{crop.scientific_name}</span> : 'Crop library entry'}
                        {(crop.aliases || []).length ? ` · also called ${crop.aliases.join(', ')}` : ''}
                    </DialogDescription>
                </DialogHeader>

                <dl className="grid gap-x-5 gap-y-2 text-[11px] sm:grid-cols-2">
                    {rows.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-3 border-b border-border/50 pb-1.5">
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd className="text-right text-foreground">{value}</dd>
                        </div>
                    ))}
                </dl>

                {crop.rotation_role && (
                    <div>
                        <p className="label-eyebrow text-muted-foreground">Rotation role</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-foreground">{crop.rotation_role}</p>
                    </div>
                )}
                {crop.disease_notes && (
                    <div>
                        <p className="label-eyebrow text-muted-foreground">Pest &amp; disease notes</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-foreground">{crop.disease_notes}</p>
                    </div>
                )}
                {crop.literature_basis && (
                    <p className="rounded border border-dashed border-border bg-muted/50 px-3 py-2 text-[10px] leading-relaxed text-muted-foreground">
                        Trait basis: {crop.literature_basis}
                        {crop.confidence ? ` · confidence ${crop.confidence}.` : ''}
                    </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                    {canEdit && (
                        <>
                            <Button size="sm" variant="outline" onClick={onEdit}>
                                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                            </Button>
                            <ConfirmDelete
                                title={`Delete ${crop.name}?`}
                                description="Sequences that used this crop keep its name but lose the traits, so they stop being scored."
                                onConfirm={onDelete}
                                trigger={
                                    <Button size="sm" variant="outline" className="text-destructive">
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                                    </Button>
                                }
                            />
                        </>
                    )}
                    <Button size="sm" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}