import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROVENANCE_OPTIONS, SOIL_PARAMETERS, soilParameter } from '@/lib/nasa';
import { Loader2 } from 'lucide-react';

export default function SoilDialog({ open, onOpenChange, fieldId, measurement, onSaved }) {
    const [parameter, setParameter] = useState('ph');
    const [provenance, setProvenance] = useState('laboratory_measured');
    const [value, setValue] = useState('');
    const [textValue, setTextValue] = useState('');
    const [method, setMethod] = useState('');
    const [sampleDate, setSampleDate] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        if (measurement) {
            setParameter(measurement.parameter);
            setProvenance(measurement.provenance);
            setValue(measurement.value ?? '');
            setTextValue(measurement.text_value || '');
            setMethod(measurement.method_source || '');
            setSampleDate(measurement.sample_date || '');
            setNotes(measurement.notes || '');
        } else {
            setParameter('ph');
            setProvenance('laboratory_measured');
            setValue('');
            setTextValue('');
            setMethod('');
            setSampleDate('');
            setNotes('');
        }
    }, [open, measurement]);

    const meta = soilParameter(parameter);

    const submit = async (e) => {
        e.preventDefault();
        if (meta.kind === 'number') {
            const num = Number(value);
            if (value === '' || !Number.isFinite(num)) {
                setError('Enter a numeric value for this parameter.');
                return;
            }
            if (num < 0) {
                setError('Values cannot be negative.');
                return;
            }
        } else if (!textValue.trim()) {
            setError('Enter a value for this parameter.');
            return;
        }

        setSaving(true);
        setError('');
        const payload = {
            field_id: fieldId,
            parameter,
            provenance,
            value: meta.kind === 'number' ? Number(value) : null,
            text_value: meta.kind === 'text' ? textValue.trim() : '',
            unit: meta.kind === 'number' ? meta.unit : '',
            method_source: method.trim(),
            sample_date: sampleDate || null,
            notes: notes.trim(),
        };
        try {
            if (measurement) {
                await base44.entities.SoilMeasurement.update(measurement.id, payload);
            } else {
                await base44.entities.SoilMeasurement.create(payload);
            }
            onSaved?.();
            onOpenChange(false);
        } catch (err) {
            setError(err?.message || 'Could not save the measurement.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{measurement ? 'Edit soil value' : 'Add soil value'}</DialogTitle>
                    <DialogDescription>
                        Record exactly what was measured and how. Nothing is inferred from the field location.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label>Parameter</Label>
                        <Select value={parameter} onValueChange={setParameter}>
                            <SelectTrigger className="mt-1.5">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SOIL_PARAMETERS.map((p) => (
                                    <SelectItem key={p.key} value={p.key}>
                                        {p.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {meta.kind === 'number' ? (
                        <div>
                            <Label htmlFor="soil-value">Value {meta.unit ? `(${meta.unit})` : ''}</Label>
                            <Input id="soil-value" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} className="mt-1.5" />
                        </div>
                    ) : (
                        <div>
                            <Label htmlFor="soil-text">Value</Label>
                            <Input id="soil-text" value={textValue} onChange={(e) => setTextValue(e.target.value)} className="mt-1.5" placeholder={parameter === 'soil_texture' ? 'e.g. Clay loam' : 'e.g. Well drained'} />
                        </div>
                    )}

                    <div>
                        <Label>How was this obtained?</Label>
                        <Select value={provenance} onValueChange={setProvenance}>
                            <SelectTrigger className="mt-1.5">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PROVENANCE_OPTIONS.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                            This label travels with the value into every analysis, so a farmer estimate is never presented as a
                            laboratory result.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="soil-method">Laboratory / method</Label>
                            <Input id="soil-method" value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1.5" placeholder="e.g. Holeta soil lab" />
                        </div>
                        <div>
                            <Label htmlFor="soil-date">Sample date</Label>
                            <Input id="soil-date" type="date" value={sampleDate} onChange={(e) => setSampleDate(e.target.value)} className="mt-1.5" />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="soil-notes">Notes</Label>
                        <Textarea id="soil-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5" rows={2} />
                    </div>

                    {error && <p className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p>}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save value
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}