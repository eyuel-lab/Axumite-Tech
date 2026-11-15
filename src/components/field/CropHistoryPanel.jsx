import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/nasa';

const EMPTY = { crop_name: '', season_year: '', season_label: '', planting_date: '', harvest_date: '', notes: '' };

export default function CropHistoryPanel({ fieldId, entries, onChanged }) {
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

    const save = async (e) => {
        e.preventDefault();
        if (!form.crop_name.trim()) {
            setError('Enter the crop name.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await base44.entities.CropHistory.create({
                field_id: fieldId,
                crop_name: form.crop_name.trim(),
                season_year: form.season_year === '' ? null : Number(form.season_year),
                season_label: form.season_label.trim(),
                planting_date: form.planting_date || null,
                harvest_date: form.harvest_date || null,
                notes: form.notes.trim(),
            });
            setForm(EMPTY);
            setAdding(false);
            onChanged?.();
        } catch (err) {
            setError(err?.message || 'Could not save this season.');
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id) => {
        await base44.entities.CropHistory.delete(id);
        onChanged?.();
    };

    return (
        <section className="rounded-md border border-border/80 bg-card px-5 py-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h2 className="text-base text-foreground">Crop history</h2>
                <Button size="sm" variant="ghost" onClick={() => setAdding((v) => !v)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Season
                </Button>
            </div>

            {adding && (
                <form onSubmit={save} className="mt-4 space-y-3 rounded border border-border/70 bg-muted/40 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <Label htmlFor="ch-crop" className="text-xs">Crop</Label>
                            <Input id="ch-crop" value={form.crop_name} onChange={set('crop_name')} className="mt-1" placeholder="e.g. Faba bean" />
                        </div>
                        <div>
                            <Label htmlFor="ch-season" className="text-xs">Season name</Label>
                            <Input id="ch-season" value={form.season_label} onChange={set('season_label')} className="mt-1" placeholder="e.g. Meher" />
                        </div>
                        <div>
                            <Label htmlFor="ch-year" className="text-xs">Year</Label>
                            <Input id="ch-year" type="number" value={form.season_year} onChange={set('season_year')} className="mt-1" placeholder="2025" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label htmlFor="ch-plant" className="text-xs">Planted</Label>
                                <Input id="ch-plant" type="date" value={form.planting_date} onChange={set('planting_date')} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="ch-harvest" className="text-xs">Harvested</Label>
                                <Input id="ch-harvest" type="date" value={form.harvest_date} onChange={set('harvest_date')} className="mt-1" />
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-xs text-destructive">{error}</p>}
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={saving}>
                            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} Add season
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                    </div>
                </form>
            )}

            {entries.length === 0 ? (
                <p className="py-6 text-center text-[11px] text-muted-foreground">
                    No seasons recorded. Rotation planning needs at least the recent history you can remember accurately.
                </p>
            ) : (
                <ul className="mt-2 divide-y divide-border/60">
                    {entries.map((entry) => (
                        <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground">
                                    {entry.crop_name}
                                    {entry.season_label ? <span className="text-muted-foreground"> · {entry.season_label}</span> : null}
                                    {entry.season_year ? <span className="figure text-muted-foreground"> · {entry.season_year}</span> : null}
                                </p>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                    {formatDate(entry.planting_date)} → {formatDate(entry.harvest_date)}
                                    {entry.notes ? ` · ${entry.notes}` : ''}
                                </p>
                            </div>
                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => remove(entry.id)}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}