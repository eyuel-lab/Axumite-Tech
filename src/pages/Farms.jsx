import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDelete from '@/components/common/ConfirmDelete';
import FarmDialog from '@/components/farm/FarmDialog';
import { Sprout, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

export default function Farms() {
    const [farms, setFarms] = useState([]);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState({ open: false, farm: null });

    const load = useCallback(async () => {
        setLoading(true);
        const [farmRes, fieldRes] = await Promise.all([
            base44.entities.Farm.list({ sort: 'name', limit: 100 }),
            base44.entities.Field.list({ sort: 'name', limit: 200 }),
        ]);
        setFarms(farmRes.items || []);
        setFields(fieldRes.items || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const countFor = (farmId) => fields.filter((f) => f.farm_id === farmId).length;

    const remove = async (farm) => {
        await base44.entities.Farm.delete(farm.id);
        await load();
    };

    return (
        <div>
            <PageHeader
                eyebrow="Farm records"
                title="My Farms"
                description="A farm groups the fields you manage. Fields also work on their own if you do not group them."
                actions={
                    <Button onClick={() => setDialog({ open: true, farm: null })}>
                        <Plus className="mr-1.5 h-4 w-4" /> Add farm
                    </Button>
                }
            />

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : farms.length === 0 ? (
                <EmptyState
                    icon={Sprout}
                    title="No farms yet"
                    description="Add a farm to group your fields, or go straight to Field Intelligence and register a field on its own."
                    action={<Button onClick={() => setDialog({ open: true, farm: null })}>Add your first farm</Button>}
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {farms.map((farm) => (
                        <div key={farm.id} className="rounded-md border border-border/80 bg-card px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="truncate text-base text-foreground">{farm.name}</h3>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        {[farm.admin_area, farm.country].filter(Boolean).join(' · ') || 'Location not recorded'}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDialog({ open: true, farm })}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <ConfirmDelete
                                        title={`Delete ${farm.name}?`}
                                        description="The farm record is removed. Its fields are kept and become unassigned."
                                        onConfirm={() => remove(farm)}
                                        trigger={
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        }
                                    />
                                </div>
                            </div>
                            {farm.description && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{farm.description}</p>}
                            <p className="mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                                <span className="figure text-foreground">{countFor(farm.id)}</span> {countFor(farm.id) === 1 ? 'field' : 'fields'} linked
                            </p>
                        </div>
                    ))}
                </div>
            )}

            <FarmDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
                farm={dialog.farm}
                onSaved={load}
            />
        </div>
    );
}