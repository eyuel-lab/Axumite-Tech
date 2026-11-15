import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import BoundaryMap from '@/components/field/BoundaryMap';
import FieldDialog from '@/components/field/FieldDialog';
import CropHistoryPanel from '@/components/field/CropHistoryPanel';
import DocumentPanel from '@/components/field/DocumentPanel';
import ConfirmDelete from '@/components/common/ConfirmDelete';
import DataClassBadge from '@/components/common/DataClassBadge';
import { formatCoordinate, formatHectares } from '@/lib/geo';
import { formatDate, formatDateTime, irrigationLabel, soilParameter } from '@/lib/nasa';
import { Pencil, Trash2, Satellite, FlaskConical, Loader2, ArrowLeft, Repeat2 } from 'lucide-react';

export default function FieldDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [field, setField] = useState(null);
    const [farm, setFarm] = useState(null);
    const [soil, setSoil] = useState([]);
    const [history, setHistory] = useState([]);
    const [latestLog, setLatestLog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editOpen, setEditOpen] = useState(false);
    const [missing, setMissing] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const record = await base44.entities.Field.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
        if (!record) {
            setMissing(true);
            setLoading(false);
            return;
        }
        setField(record);
        const [soilRes, historyRes, logRes] = await Promise.all([
            base44.entities.SoilMeasurement.filter({ field_id: id }, { sort: '-created_date', limit: 200 }),
            base44.entities.CropHistory.filter({ field_id: id }, { sort: '-season_year', limit: 50 }),
            base44.entities.NasaFetchLog.filter({ field_id: id, dataset_key: 'nasa_power' }, { sort: '-retrieved_at', limit: 1 }),
        ]);
        setSoil(soilRes.items || []);
        setHistory(historyRes.items || []);
        setLatestLog((logRes.items || [])[0] || null);
        if (record.farm_id) {
            const farms = await base44.entities.Farm.filter({ id: record.farm_id });
            setFarm((farms.items || [])[0] || null);
        }
        setLoading(false);
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const removeField = async () => {
        await Promise.all([
            base44.entities.SoilMeasurement.deleteMany({ field_id: id }),
            base44.entities.CropHistory.deleteMany({ field_id: id }),
            base44.entities.EnvironmentalObservation.deleteMany({ field_id: id }),
            base44.entities.NasaFetchLog.deleteMany({ field_id: id }),
            base44.entities.FieldDocument.deleteMany({ field_id: id }),
            base44.entities.RotationSequence.deleteMany({ field_id: id }),
            base44.entities.RotationPlan.deleteMany({ field_id: id }),
        ]);
        await base44.entities.Field.delete(id);
        navigate('/fields');
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (missing || !field) {
        return (
            <div className="py-16 text-center">
                <h1 className="text-xl text-foreground">Field not found</h1>
                <p className="mt-2 text-xs text-muted-foreground">It may have been deleted, or it belongs to another account.</p>
                <Button asChild variant="outline" className="mt-5">
                    <Link to="/fields">Back to fields</Link>
                </Button>
            </div>
        );
    }

    const hasBoundary = Array.isArray(field.boundary) && field.boundary.length >= 3;
    const measured = soil.filter((m) => m.provenance === 'laboratory_measured').length;

    return (
        <div>
            <Link to="/fields" className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> All fields
            </Link>

            <div className="mb-6 flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="label-eyebrow text-gold">Field Intelligence</p>
                    <h1 className="mt-1.5 text-2xl text-foreground sm:text-[1.9rem]">{field.name}</h1>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                        {[farm?.name, field.admin_area, field.country].filter(Boolean).join(' · ') || 'No farm or location recorded'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Button>
                    <ConfirmDelete
                        title={`Delete ${field.name}?`}
                        description="This also removes its soil measurements, crop history and stored NASA observations. This cannot be undone."
                        onConfirm={removeField}
                        trigger={
                            <Button variant="outline" size="sm" className="text-destructive">
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                            </Button>
                        }
                    />
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div className="space-y-6">
                    <section className="rounded-md border border-border/80 bg-card p-4">
                        <div className="flex items-center justify-between pb-3">
                            <h2 className="text-base text-foreground">Boundary</h2>
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {field.area_source === 'computed_polygon'
                                    ? 'Area from polygon'
                                    : field.area_source === 'manual_entry'
                                        ? 'Area entered manually'
                                        : 'No area recorded'}
                            </span>
                        </div>
                        <BoundaryMap points={field.boundary || []} center={{ lat: field.latitude, lng: field.longitude }} height="h-[300px]" />
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Stat label="Area" value={field.area_hectares ? formatHectares(field.area_hectares) : '—'} />
                            <Stat label="Vertices" value={hasBoundary ? String(field.boundary.length) : '—'} />
                            <Stat label="Centre lat" value={formatCoordinate(field.latitude, 'lat')} />
                            <Stat label="Centre lng" value={formatCoordinate(field.longitude, 'lng')} />
                        </div>
                        {!hasBoundary && (
                            <p className="mt-3 rounded border border-gold/30 bg-gold-soft px-3 py-2 text-[11px] text-gold">
                                No boundary polygon recorded. The centre point is used only for satellite retrieval — it is not the field
                                extent, so area and any future area-based calculations will stay marked as unsupported.
                            </p>
                        )}
                    </section>

                    <CropHistoryPanel fieldId={field.id} entries={history} onChanged={load} />

                    <DocumentPanel fieldId={field.id} onChanged={load} />
                </div>

                <div className="space-y-6">
                    <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                        <h2 className="border-b border-border/60 pb-3 text-base text-foreground">Management context</h2>
                        <dl className="mt-4 space-y-3 text-xs">
                            <Row label="Current crop" value={field.current_crop || 'Not recorded'} />
                            <Row label="Irrigation" value={irrigationLabel(field.irrigation)} />
                            <Row label="Water access" value={field.water_source || 'Not recorded'} />
                            <Row label="Practices" value={(field.practices || []).join(', ') || 'Not recorded'} />
                            <Row label="Registered" value={formatDate(field.created_date)} />
                        </dl>
                        {field.notes && <p className="mt-4 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">{field.notes}</p>}
                    </section>

                    <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <h2 className="text-base text-foreground">Soil</h2>
                            <FlaskConical className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {soil.length === 0 ? (
                            <p className="py-4 text-[11px] leading-relaxed text-muted-foreground">
                                No soil measurements recorded for this field yet. Axumite Tech will not estimate them from location.
                            </p>
                        ) : (
                            <ul className="mt-2 divide-y divide-border/60">
                                {soil.slice(0, 6).map((m) => (
                                    <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                                        <span className="text-[11px] text-foreground">{soilParameter(m.parameter).label}</span>
                                        <span className="flex items-center gap-2">
                                            <span className="figure text-[11px] text-foreground">
                                                {m.text_value || `${m.value ?? '—'} ${m.unit || soilParameter(m.parameter).unit}`}
                                            </span>
                                            <DataClassBadge type={m.provenance === 'laboratory_measured' ? 'measured' : m.provenance === 'regional_satellite_estimate' ? 'regional' : m.provenance === 'model_derived' ? 'model' : 'farmer'} />
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="mt-3 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
                            {measured} laboratory-measured {measured === 1 ? 'value' : 'values'} of {soil.length} recorded.
                        </p>
                        <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                            <Link to="/soil">Open soil intelligence</Link>
                        </Button>
                    </section>

                    <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <h2 className="text-base text-foreground">NASA observations</h2>
                            <Satellite className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {latestLog ? (
                            <>
                                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{latestLog.message}</p>
                                <dl className="mt-3 space-y-2 text-[11px]">
                                    <Row label="Retrieved" value={formatDateTime(latestLog.retrieved_at)} />
                                    <Row label="Period" value={`${formatDate(latestLog.requested_start)} → ${formatDate(latestLog.requested_end)}`} />
                                    <Row label="Records" value={String(latestLog.records_written ?? 0)} />
                                    <Row label="Status" value={latestLog.status} />
                                </dl>
                            </>
                        ) : (
                            <p className="py-4 text-[11px] leading-relaxed text-muted-foreground">
                                No NASA data retrieved for this field yet.
                            </p>
                        )}
                        <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                            <Link to="/nasa">Open NASA Earth Monitor</Link>
                        </Button>
                    </section>

                    <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <h2 className="text-base text-foreground">Rotation</h2>
                            <Repeat2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                            Compare multi-season sequences for this field and see what each does to soil health under your priorities.
                        </p>
                        <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                            <Link to="/rotations">Open rotation simulator</Link>
                        </Button>
                    </section>
                </div>
            </div>

            <FieldDialog open={editOpen} onOpenChange={setEditOpen} field={field} onSaved={load} />
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div>
            <p className="label-eyebrow text-muted-foreground">{label}</p>
            <p className="figure mt-1 text-xs text-foreground">{value}</p>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex justify-between gap-3">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="truncate text-right text-foreground">{value}</dd>
        </div>
    );
}