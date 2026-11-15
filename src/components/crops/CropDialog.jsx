import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
    CONFIDENCE_OPTIONS,
    COVER_OPTIONS,
    CROP_GROUPS,
    DRAINAGE_OPTIONS,
    FROST_OPTIONS,
    RESIDUE_OPTIONS,
    SALINITY_OPTIONS,
} from '@/lib/cropTraits';

const EMPTY = {
    name: '',
    scientific_name: '',
    aliases: '',
    family: '',
    crop_group: 'cereal',
    cycle_days: '',
    growing_seasons: '',
    nitrogen_fixation_kg_ha: '',
    nitrogen_demand_kg_ha: '',
    phosphorus_demand_kg_ha: '',
    potassium_demand_kg_ha: '',
    water_demand_mm: '',
    rooting_depth_cm: '',
    residue_index: 'medium',
    soil_cover_index: 'moderate',
    ph_min: '',
    ph_max: '',
    drainage_requirement: 'moderate',
    heat_tolerance_c: '',
    frost_tolerance: 'low',
    salinity_tolerance: 'low',
    disease_notes: '',
    rotation_role: '',
    literature_basis: '',
    confidence: 'medium',
    notes: '',
};

const NUMERIC = [
    'cycle_days',
    'nitrogen_fixation_kg_ha',
    'nitrogen_demand_kg_ha',
    'phosphorus_demand_kg_ha',
    'potassium_demand_kg_ha',
    'water_demand_mm',
    'rooting_depth_cm',
    'ph_min',
    'ph_max',
    'heat_tolerance_c',
];

export default function CropDialog({ open, onOpenChange, crop, onSaved }) {
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        if (crop) {
            const next = { ...EMPTY };
            Object.keys(EMPTY).forEach((key) => {
                const value = crop[key];
                if (Array.isArray(value)) next[key] = value.join(', ');
                else if (value !== null && value !== undefined) next[key] = String(value);
            });
            setForm(next);
        } else {
            setForm(EMPTY);
        }
    }, [open, crop]);

    const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

    const save = async (event) => {
        event.preventDefault();
        if (!form.name.trim() || !form.family.trim()) {
            setError('A crop name and botanical family are required.');
            return;
        }
        setSaving(true);
        setError('');
        const payload = {
            name: form.name.trim(),
            scientific_name: form.scientific_name.trim(),
            aliases: form.aliases.split(',').map((s) => s.trim()).filter(Boolean),
            family: form.family.trim(),
            crop_group: form.crop_group,
            growing_seasons: form.growing_seasons.split(',').map((s) => s.trim()).filter(Boolean),
            residue_index: form.residue_index,
            soil_cover_index: form.soil_cover_index,
            drainage_requirement: form.drainage_requirement,
            frost_tolerance: form.frost_tolerance,
            salinity_tolerance: form.salinity_tolerance,
            confidence: form.confidence,
            disease_notes: form.disease_notes.trim(),
            rotation_role: form.rotation_role.trim(),
            literature_basis: form.literature_basis.trim(),
            notes: form.notes.trim(),
        };
        NUMERIC.forEach((key) => {
            payload[key] = form[key] === '' ? null : Number(form[key]);
        });
        try {
            if (crop) await base44.entities.Crop.update(crop.id, payload);
            else await base44.entities.Crop.create(payload);
            onOpenChange(false);
            onSaved?.();
        } catch (err) {
            setError(err?.message || 'Could not save this crop.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-heading text-lg">{crop ? `Edit ${crop.name}` : 'Add a crop'}</DialogTitle>
                    <DialogDescription className="text-[11px]">
                        Trait ranges feed the rotation engine. Use published ranges for your region — they are indicative, not calibrated to
                        your soil.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={save} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Crop name *">
                            <Input value={form.name} onChange={set('name')} placeholder="e.g. Faba bean" />
                        </Field>
                        <Field label="Botanical family *">
                            <Input value={form.family} onChange={set('family')} placeholder="e.g. Fabaceae" />
                        </Field>
                        <Field label="Scientific name">
                            <Input value={form.scientific_name} onChange={set('scientific_name')} placeholder="Vicia faba" />
                        </Field>
                        <Field label="Local names">
                            <Input value={form.aliases} onChange={set('aliases')} placeholder="Bakela, horse bean" />
                        </Field>
                        <Field label="Group">
                            <Picker value={form.crop_group} onChange={set('crop_group')} options={CROP_GROUPS} />
                        </Field>
                        <Field label="Seasons">
                            <Input value={form.growing_seasons} onChange={set('growing_seasons')} placeholder="Meher, Belg" />
                        </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Cycle (days)"><Input type="number" value={form.cycle_days} onChange={set('cycle_days')} /></Field>
                        <Field label="N fixed (kg/ha)"><Input type="number" value={form.nitrogen_fixation_kg_ha} onChange={set('nitrogen_fixation_kg_ha')} /></Field>
                        <Field label="N removed (kg/ha)"><Input type="number" value={form.nitrogen_demand_kg_ha} onChange={set('nitrogen_demand_kg_ha')} /></Field>
                        <Field label="P removed (kg/ha)"><Input type="number" value={form.phosphorus_demand_kg_ha} onChange={set('phosphorus_demand_kg_ha')} /></Field>
                        <Field label="K removed (kg/ha)"><Input type="number" value={form.potassium_demand_kg_ha} onChange={set('potassium_demand_kg_ha')} /></Field>
                        <Field label="Water need (mm)"><Input type="number" value={form.water_demand_mm} onChange={set('water_demand_mm')} /></Field>
                        <Field label="Rooting depth (cm)"><Input type="number" value={form.rooting_depth_cm} onChange={set('rooting_depth_cm')} /></Field>
                        <Field label="Heat limit (°C)"><Input type="number" value={form.heat_tolerance_c} onChange={set('heat_tolerance_c')} /></Field>
                        <Field label="pH min"><Input type="number" step="0.1" value={form.ph_min} onChange={set('ph_min')} /></Field>
                        <Field label="pH max"><Input type="number" step="0.1" value={form.ph_max} onChange={set('ph_max')} /></Field>
                        <Field label="Residue"><Picker value={form.residue_index} onChange={set('residue_index')} options={RESIDUE_OPTIONS} /></Field>
                        <Field label="Soil cover"><Picker value={form.soil_cover_index} onChange={set('soil_cover_index')} options={COVER_OPTIONS} /></Field>
                        <Field label="Drainage"><Picker value={form.drainage_requirement} onChange={set('drainage_requirement')} options={DRAINAGE_OPTIONS} /></Field>
                        <Field label="Frost tolerance"><Picker value={form.frost_tolerance} onChange={set('frost_tolerance')} options={FROST_OPTIONS} /></Field>
                        <Field label="Salinity tolerance"><Picker value={form.salinity_tolerance} onChange={set('salinity_tolerance')} options={SALINITY_OPTIONS} /></Field>
                        <Field label="Confidence"><Picker value={form.confidence} onChange={set('confidence')} options={CONFIDENCE_OPTIONS} /></Field>
                    </div>

                    <Field label="Rotation role">
                        <Input value={form.rotation_role} onChange={set('rotation_role')} placeholder="Nitrogen-fixing break crop" />
                    </Field>
                    <Field label="Pest and disease notes">
                        <Textarea rows={2} value={form.disease_notes} onChange={set('disease_notes')} placeholder="Soil-borne problems and required break length" />
                    </Field>
                    <Field label="Trait basis">
                        <Textarea rows={2} value={form.literature_basis} onChange={set('literature_basis')} placeholder="Source of the ranges above" />
                    </Field>

                    {error && <p className="text-xs text-destructive">{error}</p>}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                            {crop ? 'Save changes' : 'Add crop'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <Label className="text-[11px]">{label}</Label>
            <div className="mt-1">{children}</div>
        </div>
    );
}

function Picker({ value, onChange, options }) {
    return (
        <Select value={value} onValueChange={(v) => onChange({ target: { value: v } })}>
            <SelectTrigger>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}