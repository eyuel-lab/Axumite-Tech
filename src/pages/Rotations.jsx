import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDelete from '@/components/common/ConfirmDelete';
import PlanDialog from '@/components/rotation/PlanDialog';
import { Repeat, Plus, Loader2, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/nasa';

export default function Rotations() {
    const [plans, setPlans] = useState([]);
    const [fields, setFields] = useState([]);
    const [sequences, setSequences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    const load = async () => {
        const [planRes, fieldRes, seqRes] = await Promise.all([
            base44.entities.RotationPlan.list({ sort: '-updated_date', limit: 100 }),
            base44.entities.Field.list({ sort: 'name', limit: 200 }),
            base44.entities.RotationSequence.list({ limit: 300 }),
        ]);
        setPlans(planRes.items || []);
        setFields(fieldRes.items || []);
        setSequences(seqRes.items || []);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const fieldName = (id) => fields.find((f) => f.id === id)?.name || 'Field removed';
    const seqCount = (id) => sequences.filter((s) => s.plan_id === id).length;
    const bestScore = (plan) => {
        const list = plan.result?.evaluations || [];
        const scored = list.filter((e) => typeof e.composite === 'number');
        if (!scored.length) return null;
        return scored.reduce((top, e) => (e.composite > top.composite ? e : top));
    };

    const remove = async (plan) => {
        await base44.entities.RotationSequence.deleteMany({ plan_id: plan.id });
        await base44.entities.RotationPlan.delete(plan.id);
        await load();
    };

    return (
        <div>
            <PageHeader
                eyebrow="Rotation Simulator"
                title="Rotation comparisons"
                description="Map candidate crop sequences season by season for one field, then compare what each does to soil health, nitrogen, water, pest breaks and erosion under your own priorities."
                actions={
                    <Button onClick={() => setOpen(true)} disabled={!fields.length}>
                        <Plus className="mr-1.5 h-4 w-4" /> New comparison
                    </Button>
                }
            />

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : !fields.length ? (
                <EmptyState
                    icon={Repeat}
                    title="Register a field first"
                    description="Rotation scoring uses the field’s soil measurements, irrigation and NASA climate record, so a field record is required."
                    action={
                        <Button asChild>
                            <Link to="/fields">Register a field</Link>
                        </Button>
                    }
                />
            ) : plans.length === 0 ? (
                <EmptyState
                    icon={Repeat}
                    title="No comparisons yet"
                    description="Create a comparison, lay out the sequence you follow today and the alternatives you are considering."
                    action={
                        <Button onClick={() => setOpen(true)}>
                            <Plus className="mr-1.5 h-4 w-4" /> New comparison
                        </Button>
                    }
                />
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {plans.map((plan) => {
                        const best = bestScore(plan);
                        return (
                            <div key={plan.id} className="flex flex-col rounded-md border border-border/80 bg-card px-4 py-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="truncate text-sm font-semibold text-foreground">{plan.name}</h3>
                                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{fieldName(plan.field_id)}</p>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide ${plan.status === 'evaluated'
                                                ? 'border-primary/25 bg-primary/10 text-primary'
                                                : 'border-border bg-muted text-muted-foreground'
                                            }`}
                                    >
                                        {plan.status === 'evaluated' ? 'Evaluated' : 'Draft'}
                                    </span>
                                </div>

                                <dl className="mt-3 space-y-1.5 text-[10px] text-muted-foreground">
                                    <div className="flex justify-between gap-2">
                                        <dt>Sequences</dt>
                                        <dd className="figure text-foreground">{seqCount(plan.id)}</dd>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <dt>Best index</dt>
                                        <dd className="figure text-foreground">
                                            {best ? `${best.composite} · ${best.name}` : 'not evaluated'}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <dt>Last evaluated</dt>
                                        <dd className="text-foreground">{plan.evaluated_at ? formatDate(plan.evaluated_at) : '—'}</dd>
                                    </div>
                                </dl>

                                {plan.notes && <p className="mt-3 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{plan.notes}</p>}

                                <div className="mt-auto flex items-center gap-2 pt-4">
                                    <Button asChild size="sm" className="flex-1">
                                        <Link to={`/rotations/${plan.id}`}>
                                            Open <ArrowRight className="ml-1 h-3 w-3" />
                                        </Link>
                                    </Button>
                                    <ConfirmDelete
                                        title={`Delete ${plan.name}?`}
                                        description="The comparison and all its sequences are removed. Field data is untouched."
                                        onConfirm={() => remove(plan)}
                                        trigger={<Button size="sm" variant="outline" className="text-destructive">Delete</Button>}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <PlanDialog open={open} onOpenChange={setOpen} fields={fields} onCreated={load} />
        </div>
    );
}