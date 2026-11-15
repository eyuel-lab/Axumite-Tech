import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { DEFAULT_WEIGHTS } from '@/lib/rotationEngine';

export default function PlanDialog({ open, onOpenChange, fields, onCreated }) {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', field_id: '', start_year: String(new Date().getFullYear()), notes: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        setForm({
            name: '',
            field_id: fields[0]?.id || '',
            start_year: String(new Date().getFullYear()),
            notes: '',
        });
    }, [open, fields]);

    const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

    const save = async (event) => {
        event.preventDefault();
        if (!form.name.trim()) return setError('Give the comparison a name.');
        if (!form.field_id) return setError('Choose the field these sequences belong to.');
        setSaving(true);
        setError('');
        try {
            const plan = await base44.entities.RotationPlan.create({
                name: form.name.trim(),
                field_id: form.field_id,
                start_year: Number(form.start_year) || null,
                notes: form.notes.trim(),
                status: 'draft',
                ...DEFAULT_WEIGHTS,
            });
            await base44.entities.RotationSequence.create({
                plan_id: plan.id,
                field_id: form.field_id,
                name: 'Current practice',
                sort_order: 1,
                entries: [],
            });
            await base44.entities.RotationSequence.create({
                plan_id: plan.id,
                field_id: form.field_id,
                name: 'Option B',
                sort_order: 2,
                entries: [],
            });
            onOpenChange(false);
            onCreated?.();
            navigate(`/rotations/${plan.id}`);
        } catch (err) {
            setError(err?.message || 'Could not create this comparison.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-heading text-lg">New rotation comparison</DialogTitle>
                    <DialogDescription className="text-[11px]">
                        A comparison holds several candidate sequences for one field, scored by the same engine and priorities.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={save} className="space-y-3">
                    <div>
                        <Label className="text-[11px]">Name</Label>
                        <Input className="mt-1" value={form.name} onChange={set('name')} placeholder="Teff–faba rotation trial" />
                    </div>
                    <div>
                        <Label className="text-[11px]">Field</Label>
                        <Select value={form.field_id} onValueChange={(v) => setForm((prev) => ({ ...prev, field_id: v }))}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select a field" />
                            </SelectTrigger>
                            <SelectContent>
                                {fields.map((f) => (
                                    <SelectItem key={f.id} value={f.id}>
                                        {f.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-[11px]">First season year</Label>
                        <Input className="mt-1" type="number" value={form.start_year} onChange={set('start_year')} />
                    </div>
                    <div>
                        <Label className="text-[11px]">Objective</Label>
                        <Textarea className="mt-1" rows={2} value={form.notes} onChange={set('notes')} placeholder="What are you trying to improve?" />
                    </div>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Create
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}