import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EmptyState from '@/components/common/EmptyState';
import CropCard from '@/components/crops/CropCard';
import CropDetailDialog from '@/components/crops/CropDetailDialog';
import CropDialog from '@/components/crops/CropDialog';
import { CROP_GROUPS } from '@/lib/cropTraits';
import { Sprout, Plus, Loader2, Search } from 'lucide-react';

export default function Crops() {
    const [crops, setCrops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [group, setGroup] = useState('all');
    const [selected, setSelected] = useState(null);
    const [editing, setEditing] = useState({ open: false, crop: null });
    const [user, setUser] = useState(null);

    const load = async () => {
        const res = await base44.entities.Crop.list({ sort: 'name', limit: 300 });
        setCrops(res.items || []);
        setLoading(false);
    };

    useEffect(() => {
        load();
        base44.auth.me().then(setUser).catch(() => { });
    }, []);

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        return crops.filter((crop) => {
            if (group !== 'all' && crop.crop_group !== group) return false;
            if (!term) return true;
            return [crop.name, crop.scientific_name, crop.family, ...(crop.aliases || [])]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(term));
        });
    }, [crops, query, group]);

    const canEdit = (crop) => Boolean(user && (crop.created_by_id === user.id || user.role === 'admin'));

    const remove = async (crop) => {
        await base44.entities.Crop.delete(crop.id);
        setSelected(null);
        await load();
    };

    return (
        <div>
            <PageHeader
                eyebrow="Crop Library"
                title="Crop traits that drive the rotation"
                description="Every crop the engine can score: botanical family, nitrogen fixation, nutrient removal, water demand, rooting depth, residue and the constraints it brings. Ranges are indicative literature values, each with its own confidence and source note."
                actions={
                    <Button onClick={() => setEditing({ open: true, crop: null })}>
                        <Plus className="mr-1.5 h-4 w-4" /> Add crop
                    </Button>
                }
            />

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative max-w-xs flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search crops or families" className="pl-8" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {[{ value: 'all', label: 'All' }, ...CROP_GROUPS].map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setGroup(option.value)}
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors ${group === option.value
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={Sprout}
                    title={crops.length ? 'No crop matches this filter' : 'No crops in the library yet'}
                    description={
                        crops.length
                            ? 'Clear the search or choose a different group.'
                            : 'Add the crops you grow, then the rotation simulator can score sequences built from them.'
                    }
                    action={
                        <Button onClick={() => setEditing({ open: true, crop: null })}>
                            <Plus className="mr-1.5 h-4 w-4" /> Add crop
                        </Button>
                    }
                />
            ) : (
                <>
                    <p className="mb-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        {filtered.length} of {crops.length} crops
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {filtered.map((crop) => (
                            <CropCard key={crop.id} crop={crop} onOpen={setSelected} />
                        ))}
                    </div>
                </>
            )}

            <CropDetailDialog
                crop={selected}
                open={Boolean(selected)}
                onOpenChange={(open) => !open && setSelected(null)}
                canEdit={Boolean(selected) && canEdit(selected)}
                onEdit={() => {
                    setEditing({ open: true, crop: selected });
                    setSelected(null);
                }}
                onDelete={() => remove(selected)}
            />

            <CropDialog
                open={editing.open}
                onOpenChange={(open) => setEditing((prev) => ({ ...prev, open }))}
                crop={editing.crop}
                onSaved={load}
            />
        </div>
    );
}