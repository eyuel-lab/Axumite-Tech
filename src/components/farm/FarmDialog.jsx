import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const EMPTY = { name: '', country: '', admin_area: '', description: '', notes: '' };

export default function FarmDialog({ open, onOpenChange, farm, onSaved }) {
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setError('');
        setForm(
            farm
                ? {
                    name: farm.name || '',
                    country: farm.country || '',
                    admin_area: farm.admin_area || '',
                    description: farm.description || '',
                    notes: farm.notes || '',
                }
                : EMPTY
        );
    }, [open, farm]);

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            setError('Give the farm a name.');
            return;
        }
        setSaving(true);
        setError('');
        const payload = {
            name: form.name.trim(),
            country: form.country.trim(),
            admin_area: form.admin_area.trim(),
            description: form.description.trim(),
            notes: form.notes.trim(),
        };
        try {
            const saved = farm ? await base44.entities.Farm.update(farm.id, payload) : await base44.entities.Farm.create(payload);
            onSaved?.(saved);
            onOpenChange(false);
        } catch (err) {
            setError(err?.message || 'Could not save the farm.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{farm ? 'Edit farm' : 'Add a farm'}</DialogTitle>
                    <DialogDescription>A farm groups the fields you manage together.</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    <div>
                        <Label htmlFor="farm-name">Farm name</Label>
                        <Input id="farm-name" value={form.name} onChange={set('name')} className="mt-1.5" placeholder="e.g. Gobena smallholding" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="farm-country">Country</Label>
                            <Input id="farm-country" value={form.country} onChange={set('country')} className="mt-1.5" placeholder="Ethiopia" />
                        </div>
                        <div>
                            <Label htmlFor="farm-admin">Region / zone</Label>
                            <Input id="farm-admin" value={form.admin_area} onChange={set('admin_area')} className="mt-1.5" placeholder="e.g. Oromia" />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="farm-description">Description</Label>
                        <Textarea id="farm-description" value={form.description} onChange={set('description')} className="mt-1.5" rows={2} />
                    </div>
                    <div>
                        <Label htmlFor="farm-notes">Notes</Label>
                        <Textarea id="farm-notes" value={form.notes} onChange={set('notes')} className="mt-1.5" rows={2} />
                    </div>
                    {error && <p className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {farm ? 'Save changes' : 'Add farm'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}