import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDelete from '@/components/common/ConfirmDelete';
import DataClassBadge from '@/components/common/DataClassBadge';
import SoilDialog from '@/components/soil/SoilDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { SOIL_PARAMETERS, formatDate, provenanceOption, soilParameter } from '@/lib/nasa';

const badgeFor = (provenance) =>
    provenance === 'laboratory_measured'
        ? 'measured'
        : provenance === 'regional_satellite_estimate'
            ? 'regional'
            : provenance === 'model_derived'
                ? 'model'
                : 'farmer';

export default function Soil() {
    const [fields, setFields] = useState([]);
    const [fieldId, setFieldId] = useState('');
    const [measurements, setMeasurements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialog, setDialog] = useState({ open: false, measurement: null });

    useEffect(() => {
        base44.entities.Field.list({ sort: 'name', limit: 200 }).then((res) => {
            const items = res.items || [];
            setFields(items);
            if (items.length) setFieldId(items[0].id);
            setLoading(false);
        });
    }, []);

    const load = useCallback(async () => {
        if (!fieldId) {
            setMeasurements([]);
            return;
        }
        setLoading(true);
        const res = await base44.entities.SoilMeasurement.filter({ field_id: fieldId }, { sort: '-created_date', limit: 300 });
        setMeasurements(res.items || []);
        setLoading(false);
    }, [fieldId]);

    useEffect(() => {
        load();
    }, [load]);

    const grouped = useMemo(() => {
        const map = new Map();
        measurements.forEach((m) => {
            if (!map.has(m.parameter)) map.set(m.parameter, []);
            map.get(m.parameter).push(m);
        });
        return Array.from(map.entries()).sort(
            (a, b) => SOIL_PARAMETERS.findIndex((p) => p.key === a[0]) - SOIL_PARAMETERS.findIndex((p) => p.key === b[0])
        );
    }, [measurements]);

    const coreParams = ['ph', 'organic_carbon_g_kg', 'clay_pct', 'nitrogen_g_kg', 'phosphorus_mg_kg', 'water_holding_capacity_mm_m'];
    const missingCore = coreParams.filter((key) => !measurements.some((m) => m.parameter === key));

    const remove = async (id) => {
        await base44.entities.SoilMeasurement.delete(id);
        await load();
    };

    if (!loading && fields.length === 0) {
        return (
            <div>
                <PageHeader eyebrow="Soil Intelligence" title="Soil profile" description="Measured values, labelled by how they were obtained." />
                <EmptyState
                    icon={FlaskConical}
                    title="Register a field first"
                    description="Soil measurements belong to a field. Create one in Field Intelligence, then record what a laboratory measured or what you know from experience."
                    action={
                        <Button asChild>
                            <Link to="/fields">Go to fields</Link>
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                eyebrow="Soil Intelligence"
                title="Soil profile"
                description="Every value is stored with the way it was obtained — laboratory analysis, your own report, or an estimate. Nothing is inferred from the field's location."
                actions={
                    <Button disabled={!fieldId} onClick={() => setDialog({ open: true, measurement: null })}>
                        <Plus className="mr-1.5 h-4 w-4" /> Add value
                    </Button>
                }
            />

            <div className="mb-5 max-w-sm">
                <Select value={fieldId} onValueChange={setFieldId}>
                    <SelectTrigger>
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

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                    <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                        <h2 className="border-b border-border/60 pb-3 text-base text-foreground">Recorded values</h2>
                        {grouped.length === 0 ? (
                            <p className="py-8 text-center text-[11px] leading-relaxed text-muted-foreground">
                                No soil values recorded for this field. Add what you have — a single pH reading is more useful than a
                                guessed full profile.
                            </p>
                        ) : (
                            <ul className="divide-y divide-border/60">
                                {grouped.map(([parameter, list]) => {
                                    const meta = soilParameter(parameter);
                                    return list.map((m, index) => (
                                        <li key={m.id} className="flex items-start justify-between gap-3 py-3">
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-foreground">
                                                    {meta.label}
                                                    {index > 0 && <span className="ml-1.5 text-[10px] text-muted-foreground">earlier</span>}
                                                </p>
                                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                                    {formatDate(m.sample_date)}
                                                    {m.method_source ? ` · ${m.method_source}` : ''}
                                                    {m.notes ? ` · ${m.notes}` : ''}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <span className="figure text-xs text-foreground">
                                                    {m.text_value || `${m.value ?? '—'} ${m.unit || meta.unit}`}
                                                </span>
                                                <DataClassBadge type={badgeFor(m.provenance)} label={provenanceOption(m.provenance).label} />
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setDialog({ open: true, measurement: m })}>
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                <ConfirmDelete
                                                    title="Delete this value?"
                                                    description="The measurement is removed from this field's soil profile."
                                                    onConfirm={() => remove(m.id)}
                                                    trigger={
                                                        <Button size="icon" variant="ghost" className="h-6 w-6">
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                        </li>
                                    ));
                                })}
                            </ul>
                        )}
                    </section>

                    <section className="space-y-6">
                        <div className="rounded-md border border-border/80 bg-card px-5 py-4">
                            <h2 className="border-b border-border/60 pb-3 text-base text-foreground">Coverage</h2>
                            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                                {measurements.length} values recorded across {grouped.length} parameters.
                            </p>
                            {missingCore.length > 0 ? (
                                <>
                                    <p className="mt-3 flex items-start gap-1.5 text-[11px] text-clay">
                                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                        Not yet recorded:
                                    </p>
                                    <ul className="mt-1.5 space-y-1 pl-4">
                                        {missingCore.map((key) => (
                                            <li key={key} className="text-[11px] text-muted-foreground">
                                                · {soilParameter(key).label}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                                        These stay marked as missing. PYRAVEX does not estimate soil properties from coordinates.
                                    </p>
                                </>
                            ) : (
                                <p className="mt-3 text-[11px] text-primary">All core parameters have at least one recorded value.</p>
                            )}
                        </div>

                        <div className="rounded-md border border-border/80 bg-card px-5 py-4">
                            <h2 className="border-b border-border/60 pb-3 text-base text-foreground">Reading these values</h2>
                            <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                                <li>· Sand, silt and clay should sum to roughly 100% — inconsistencies are kept visible, not corrected.</li>
                                <li>· Organic carbon and organic matter are different units; both can be recorded.</li>
                                <li>· An older value is shown as “earlier” rather than deleted, so change over time stays traceable.</li>
                            </ul>
                        </div>
                    </section>
                </div>
            )}

            <SoilDialog
                open={dialog.open}
                onOpenChange={(open) => setDialog((prev) => ({ ...prev, open }))}
                fieldId={fieldId}
                measurement={dialog.measurement}
                onSaved={load}
            />
        </div>
    );
}