import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FieldBoundaryEditor from '@/components/field/FieldBoundaryEditor';
import { IRRIGATION_OPTIONS } from '@/lib/nasa';
import { polygonAreaHectares, polygonCentroid } from '@/lib/geo';
import { Loader2 } from 'lucide-react';

const EMPTY = {
    name: '',
    farm_id: 'none',
    country: '',
    admin_area: '',
    current_crop: '',
    irrigation: 'unknown',
    water_source: '',
    practices: '',
    notes: '',
    latitude: '',
    longitude: '',
};

export default function FieldDialog({ open, onOpenChange, field, onSaved }) {
    const [form, setForm] = useState(EMPTY);
    const [points, setPoints] = useState([]);
    const [drawing, setDrawing] = useState(false);
    const [manualArea, setManualArea] = useState('');
    const [farms, setFarms] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        setDrawing(false);
        if (field) {
            setForm({
                name: field.name || '',
                farm_id: field.farm_id || 'none',
                country: field.country || '',
                admin_area: field.admin_area || '',
                current_crop: field.current_crop || '',
                irrigation: field.irrigation || 'unknown',
                water_source: field.water_source || '',
                practices: (field.practices || []).join(', '),
                notes: field.notes || '',
                latitude: field.latitude ?? '',
                longitude: field.longitude ?? '',
            });
            setPoints(Array.isArray(field.boundary) ? field.boundary : []);
            setManualArea(field.area_source === 'manual_entry' ? String(field.area_hectares ?? '') : '');
        } else {
            setForm(EMPTY);
            setPoints([]);
            setManualArea('');
        }
        base44.entities.Farm.list({ sort: 'name', limit: 100 })
            .then((res) => setFarms(res.items || res || []))
            .catch(() => setFarms([]));
    }, [open, field]);

    useEffect(() => {
        if (!points.length) return;
        const centroid = polygonCentroid(points);
        if (!centroid) return;
        setForm((prev) =>
            prev.latitude === '' || prev.longitude === ''
                ? { ...prev, latitude: String(centroid.lat), longitude: String(centroid.lng) }
                : prev
        );
    }, [points]);

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setError('Give the field a name.');
            return;
        }
        const lat = form.latitude === '' ? null : Number(form.latitude);
        const lng = form.longitude === '' ? null : Number(form.longitude);
        if (lat !== null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) {
            setError('Latitude must be between -90 and 90.');
            return;
        }
        if (lng !== null && (!Number.isFinite(lng) || Math.abs(lng) > 180)) {
            setError('Longitude must be between -180 and 180.');
            return;
        }

        const polygonArea = polygonAreaHectares(points);
        const manual = manualArea === '' ? null : Number(manualArea);
        if (!polygonArea && manual !== null && (!Number.isFinite(manual) || manual <= 0)) {
            setError('Enter a valid area in hectares, or draw the boundary.');
            return;
        }

        setSaving(true);
        setError('');
        const payload = {
            name: form.name.trim(),
            farm_id: form.farm_id === 'none' ? '' : form.farm_id,
            country: form.country.trim(),
            admin_area: form.admin_area.trim(),
            current_crop: form.current_crop.trim(),
            irrigation: form.irrigation,
            water_source: form.water_source.trim(),
            practices: form.practices
                .split(',')
                .map((p) => p.trim())
                .filter(Boolean),
            notes: form.notes.trim(),
            latitude: lat,
            longitude: lng,
            boundary: points,
            area_hectares: polygonArea || manual || null,
            area_source: polygonArea ? 'computed_polygon' : manual ? 'manual_entry' : 'unspecified',
        };
        try {
            const saved = field
                ? await base44.entities.Field.update(field.id, payload)
                : await base44.entities.Field.create(payload);
            onSaved?.(saved);
            onOpenChange(false);
        } catch (err) {
            setError(err?.message || 'Could not save the field.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{field ? 'Edit field' : 'Register a field'}</DialogTitle>
                    <DialogDescription>
                        Boundary polygon, area and agronomic context. Values you leave blank stay blank — nothing is inferred.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="field-name">Field name</Label>
                            <Input id="field-name" value={form.name} onChange={set('name')} className="mt-1.5" placeholder="e.g. North terrace" />
                        </div>
                        <div>
                            <Label>Farm</Label>
                            <Select value={form.farm_id} onValueChange={(v) => setForm((p) => ({ ...p, farm_id: v }))}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue placeholder="Select a farm" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No farm / standalone field</SelectItem>
                                    {farms.map((f) => (
                                        <SelectItem key={f.id} value={f.id}>
                                            {f.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="field-country">Country</Label>
                            <Input id="field-country" value={form.country} onChange={set('country')} className="mt-1.5" placeholder="Ethiopia" />
                        </div>
                        <div>
                            <Label htmlFor="field-admin">Region / zone / district</Label>
                            <Input id="field-admin" value={form.admin_area} onChange={set('admin_area')} className="mt-1.5" placeholder="e.g. Arsi, Oromia" />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="field-lat">Centre latitude</Label>
                            <Input id="field-lat" type="number" step="any" value={form.latitude} onChange={set('latitude')} className="mt-1.5" placeholder="9.03" />
                        </div>
                        <div>
                            <Label htmlFor="field-lng">Centre longitude</Label>
                            <Input id="field-lng" type="number" step="any" value={form.longitude} onChange={set('longitude')} className="mt-1.5" placeholder="38.74" />
                        </div>
                    </div>
                    <p className="-mt-3 text-[11px] text-muted-foreground">
                        The centre point is used only for satellite retrieval. It is not the field boundary and never substitutes for one.
                    </p>

                    <FieldBoundaryEditor
                        points={points}
                        setPoints={setPoints}
                        drawing={drawing}
                        setDrawing={setDrawing}
                        manualArea={manualArea}
                        setManualArea={setManualArea}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="field-crop">Current crop</Label>
                            <Input id="field-crop" value={form.current_crop} onChange={set('current_crop')} className="mt-1.5" placeholder="e.g. Wheat" />
                        </div>
                        <div>
                            <Label>Irrigation</Label>
                            <Select value={form.irrigation} onValueChange={(v) => setForm((p) => ({ ...p, irrigation: v }))}>
                                <SelectTrigger className="mt-1.5">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {IRRIGATION_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>
                                            {o.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="field-water">Water access</Label>
                            <Input id="field-water" value={form.water_source} onChange={set('water_source')} className="mt-1.5" placeholder="e.g. Borehole, seasonal river" />
                        </div>
                        <div>
                            <Label htmlFor="field-practices">Farming practices (comma separated)</Label>
                            <Input id="field-practices" value={form.practices} onChange={set('practices')} className="mt-1.5" placeholder="e.g. Conservation tillage, Compost" />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="field-notes">Notes</Label>
                        <Textarea id="field-notes" value={form.notes} onChange={set('notes')} className="mt-1.5" rows={3} placeholder="Anything relevant to this field" />
                    </div>

                    {error && <p className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {field ? 'Save changes' : 'Register field'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}