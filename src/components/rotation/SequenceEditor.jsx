import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDown, ArrowUp, Plus, Trash2, Save } from 'lucide-react';

export default function SequenceEditor({ sequence, crops, dirty, saving, onChange, onSave, onDelete, startYear }) {
    const entries = sequence.entries || [];

    const updateEntry = (index, patch) => {
        onChange({ entries: entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)) });
    };

    const move = (index, direction) => {
        const next = [...entries];
        const target = index + direction;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        onChange({ entries: next });
    };

    const addSeason = () => {
        const last = entries[entries.length - 1];
        const year = last?.season_year ? Number(last.season_year) : Number(startYear) || new Date().getFullYear();
        onChange({ entries: [...entries, { crop_id: '', crop_name: '', season_year: entries.length ? year : year, season_label: '' }] });
    };

    return (
        <div>
            <div className="flex items-center gap-2">
                <Input
                    value={sequence.name}
                    onChange={(event) => onChange({ name: event.target.value })}
                    className="h-8 max-w-[240px] text-xs font-medium"
                />
                <div className="ml-auto flex items-center gap-1.5">
                    {dirty && <span className="text-[9px] uppercase tracking-wide text-gold">Unsaved</span>}
                    <Button size="sm" variant="outline" onClick={onSave} disabled={!dirty || saving}>
                        <Save className="mr-1 h-3 w-3" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}>
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {entries.length === 0 ? (
                <p className="mt-3 rounded border border-dashed border-border px-3 py-4 text-center text-[11px] text-muted-foreground">
                    No seasons yet. Add the seasons in the order they would be grown.
                </p>
            ) : (
                <ul className="mt-3 space-y-2">
                    {entries.map((entry, index) => (
                        <li key={index} className="flex flex-wrap items-center gap-1.5 rounded border border-border/70 bg-muted/30 px-2 py-2">
                            <span className="figure w-5 shrink-0 text-[10px] text-muted-foreground">{index + 1}</span>
                            <Select value={entry.crop_id || ''} onValueChange={(value) => {
                                const crop = crops.find((c) => c.id === value);
                                updateEntry(index, { crop_id: value, crop_name: crop?.name || '' });
                            }}>
                                <SelectTrigger className="h-7 min-w-[150px] flex-1 text-[11px]">
                                    <SelectValue placeholder="Choose a crop" />
                                </SelectTrigger>
                                <SelectContent>
                                    {crops.map((crop) => (
                                        <SelectItem key={crop.id} value={crop.id}>
                                            {crop.name} · {crop.family}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                className="h-7 w-20 text-[11px]"
                                type="number"
                                value={entry.season_year ?? ''}
                                onChange={(event) => updateEntry(index, { season_year: event.target.value === '' ? null : Number(event.target.value) })}
                                placeholder="Year"
                            />
                            <Input
                                className="h-7 w-24 text-[11px]"
                                value={entry.season_label || ''}
                                onChange={(event) => updateEntry(index, { season_label: event.target.value })}
                                placeholder="Season"
                            />
                            <div className="flex items-center gap-0.5">
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(index, -1)} disabled={index === 0}>
                                    <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => move(index, 1)}
                                    disabled={index === entries.length - 1}
                                >
                                    <ArrowDown className="h-3 w-3" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => onChange({ entries: entries.filter((_, i) => i !== index) })}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <Button size="sm" variant="ghost" className="mt-2" onClick={addSeason}>
                <Plus className="mr-1 h-3 w-3" /> Add season
            </Button>
        </div>
    );
}