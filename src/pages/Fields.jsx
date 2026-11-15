import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import FieldCard from '@/components/field/FieldCard';
import FieldDialog from '@/components/field/FieldDialog';
import { MapPinned, Plus, Loader2 } from 'lucide-react';
import { formatHectares } from '@/lib/geo';

export default function Fields() {
    const [fields, setFields] = useState([]);
    const [farms, setFarms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const [fieldRes, farmRes] = await Promise.all([
            base44.entities.Field.list({ sort: 'name', limit: 200 }),
            base44.entities.Farm.list({ sort: 'name', limit: 100 }),
        ]);
        setFields(fieldRes.items || []);
        setFarms(farmRes.items || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const farmName = (id) => farms.find((f) => f.id === id)?.name;
    const totalArea = fields.reduce((sum, f) => sum + (Number(f.area_hectares) || 0), 0);
    const withBoundary = fields.filter((f) => Array.isArray(f.boundary) && f.boundary.length >= 3).length;

    return (
        <div>
            <PageHeader
                eyebrow="Field Intelligence"
                title="Fields"
                description="Each field holds a real boundary polygon, its computed area, and the agronomic context that later decisions are built on."
                actions={
                    <Button onClick={() => setOpen(true)}>
                        <Plus className="mr-1.5 h-4 w-4" /> Register field
                    </Button>
                }
            />

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : fields.length === 0 ? (
                <EmptyState
                    icon={MapPinned}
                    title="No fields registered"
                    description="Register a field with its boundary to compute the area from real geometry, or enter the area manually if you cannot draw on the map."
                    action={<Button onClick={() => setOpen(true)}>Register your first field</Button>}
                />
            ) : (
                <>
                    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <div className="rounded-md border border-border/80 bg-card px-4 py-3">
                            <p className="label-eyebrow text-muted-foreground">Fields</p>
                            <p className="figure mt-1.5 text-lg text-foreground">{fields.length}</p>
                        </div>
                        <div className="rounded-md border border-border/80 bg-card px-4 py-3">
                            <p className="label-eyebrow text-muted-foreground">Total area</p>
                            <p className="figure mt-1.5 text-lg text-foreground">{formatHectares(totalArea)}</p>
                        </div>
                        <div className="rounded-md border border-border/80 bg-card px-4 py-3">
                            <p className="label-eyebrow text-muted-foreground">With boundary</p>
                            <p className="figure mt-1.5 text-lg text-foreground">
                                {withBoundary}/{fields.length}
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {fields.map((field) => (
                            <FieldCard key={field.id} field={field} farmName={farmName(field.farm_id)} />
                        ))}
                    </div>
                </>
            )}

            <FieldDialog open={open} onOpenChange={setOpen} field={null} onSaved={load} />
        </div>
    );
}