import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import PrioritySliders from '@/components/rotation/PrioritySliders';
import SequenceEditor from '@/components/rotation/SequenceEditor';
import SequenceResult from '@/components/rotation/SequenceResult';
import ComparePanel from '@/components/rotation/ComparePanel';
import MethodPanel from '@/components/rotation/MethodPanel';
import { buildSoilProfile, evaluateSequence, ENGINE_VERSION } from '@/lib/rotationEngine';
import { freshness, formatDate, formatNumber, irrigationLabel } from '@/lib/nasa';
import { formatHectares } from '@/lib/geo';
import { ArrowLeft, Plus, Save, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RotationDetail() {
    const { id } = useParams();
    const [plan, setPlan] = useState(null);
    const [field, setField] = useState(null);
    const [soil, setSoil] = useState([]);
    const [climateLog, setClimateLog] = useState(null);
    const [crops, setCrops] = useState([]);
    const [sequences, setSequences] = useState([]);
    const [weights, setWeights] = useState({});
    const [notes, setNotes] = useState('');
    const [dirty, setDirty] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [missing, setMissing] = useState(false);

    const load = useCallback(async () => {
        const record = await base44.entities.RotationPlan.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
        if (!record) {
            setMissing(true);
            setLoading(false);
            return;
        }
        setPlan(record);
        setNotes(record.notes || '');
        setWeights({
            weight_soil_health: record.weight_soil_health ?? 3,
            weight_nitrogen: record.weight_nitrogen ?? 3,
            weight_water: record.weight_water ?? 3,
            weight_pest: record.weight_pest ?? 3,
            weight_erosion: record.weight_erosion ?? 2,
        });
        const [fieldRecord, soilRes, logRes, cropRes, seqRes] = await Promise.all([
            base44.entities.Field.get(record.field_id).catch((e) => (e.status === 404 ? null : Promise.reject(e))),
            base44.entities.SoilMeasurement.filter({ field_id: record.field_id }, { sort: '-created_date', limit: 200 }),
            base44.entities.NasaFetchLog.filter(
                { field_id: record.field_id, dataset_key: 'nasa_power' },
                { sort: '-retrieved_at', limit: 1 }
            ),
            base44.entities.Crop.list({ sort: 'name', limit: 300 }),
            base44.entities.RotationSequence.filter({ plan_id: id }, { sort: 'sort_order', limit: 20 }),
        ]);
        setField(fieldRecord);
        setSoil(soilRes.items || []);
        setClimateLog((logRes.items || [])[0] || null);
        setCrops(cropRes.items || []);
        setSequences((seqRes.items || []).map((s) => ({ ...s, entries: s.entries || [] })));
        setDirty({});
        setLoading(false);
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const profile = useMemo(() => buildSoilProfile(soil), [soil]);

    const evaluations = useMemo(
        () =>
            sequences.map((sequence) => ({
                id: sequence.id,
                name: sequence.name || 'Untitled sequence',
                ...evaluateSequence({
                    entries: sequence.entries || [],
                    crops,
                    soil: profile,
                    climate: climateLog?.summary || null,
                    field: field || {},
                    weights,
                }),
            })),
        [sequences, crops, profile, climateLog, field, weights]
    );

    const updateSequence = (sequenceId, patch) => {
        setSequences((prev) => prev.map((s) => (s.id === sequenceId ? { ...s, ...patch } : s)));
        setDirty((prev) => ({ ...prev, [sequenceId]: true }));
        setNotice('');
    };

    const addSequence = async () => {
        setSaving(true);
        const letter = String.fromCharCode(65 + sequences.length);
        const created = await base44.entities.RotationSequence.create({
            plan_id: id,
            field_id: plan.field_id,
            name: `Option ${letter}`,
            sort_order: sequences.length + 1,
            entries: [],
        });
        setSequences((prev) => [...prev, { ...created, entries: created.entries || [] }]);
        setSaving(false);
    };

    const deleteSequence = async (sequenceId) => {
        if (sequences.length <= 1) {
            setError('Keep at least one sequence in the comparison.');
            return;
        }
        await base44.entities.RotationSequence.delete(sequenceId);
        setSequences((prev) => prev.filter((s) => s.id !== sequenceId));
    };

    const saveAll = async () => {
        setSaving(true);
        setError('');
        try {
            const pending = sequences
                .filter((s) => dirty[s.id])
                .map((s) => ({ id: s.id, name: s.name, entries: s.entries || [] }));
            if (pending.length) await base44.entities.RotationSequence.bulkUpdate(pending);
            const updated = await base44.entities.RotationPlan.update(id, { ...weights, notes });
            setPlan(updated);
            setDirty({});
            setNotice('Sequences and priorities saved.');
        } catch (err) {
            setError(err?.message || 'Could not save.');
        } finally {
            setSaving(false);
        }
    };

    const saveEvaluation = async () => {
        setSaving(true);
        setError('');
        try {
            const snapshot = {
                engine_version: ENGINE_VERSION,
                weights,
                evaluations: evaluations.map((e) => ({
                    id: e.id,
                    name: e.name,
                    composite: e.composite,
                    band: e.band.label,
                    scores: e.scores,
                    flags: e.flags,
                    constraints: e.constraints,
                    seasons: e.rows.map((r) => ({
                        crop_name: r.crop_name,
                        season_year: r.season_year,
                        season_label: r.season_label,
                        n_balance: r.metrics?.nBalance ?? null,
                    })),
                })),
                soil_values: profile.count,
                climate_period: climateLog?.summary
                    ? `${climateLog.summary.period_start} to ${climateLog.summary.period_end}`
                    : null,
            };
            const updated = await base44.entities.RotationPlan.update(id, {
                result: snapshot,
                status: 'evaluated',
                evaluated_at: new Date().toISOString(),
                engine_version: ENGINE_VERSION,
                ...weights,
                notes,
            });
            setPlan(updated);
            setNotice('Evaluation stored with this plan.');
        } catch (err) {
            setError(err?.message || 'Could not store the evaluation.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (missing || !plan) {
        return (
            <div className="py-16 text-center">
                <h1 className="text-xl text-foreground">Comparison not found</h1>
                <p className="mt-2 text-xs text-muted-foreground">It may have been deleted, or it belongs to another account.</p>
                <Button asChild variant="outline" className="mt-5">
                    <Link to="/rotations">Back to comparisons</Link>
                </Button>
            </div>
        );
    }

    const fresh = freshness(climateLog?.retrieved_at);
    const latestSequenceEdit = sequences.reduce((latest, s) => {
        const time = new Date(s.updated_date || 0).getTime();
        return time > latest ? time : latest;
    }, 0);
    const stale = plan.evaluated_at && latestSequenceEdit > new Date(plan.evaluated_at).getTime();

    return (
        <div>
            <Link to="/rotations" className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3 w-3" /> All comparisons
            </Link>

            <div className="mb-5 flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="label-eyebrow text-gold">Rotation Simulator</p>
                    <h1 className="mt-1.5 text-2xl text-foreground sm:text-[1.9rem]">{plan.name}</h1>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                        {field?.name || 'Field removed'}
                        {field?.area_hectares ? ` · ${formatHectares(field.area_hectares)}` : ''}
                        {` · ${irrigationLabel(field?.irrigation)}`}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={saveAll} disabled={saving}>
                        <Save className="mr-1.5 h-3.5 w-3.5" /> Save changes
                    </Button>
                    <Button size="sm" onClick={saveEvaluation} disabled={saving}>
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Save evaluation
                    </Button>
                    <Button asChild variant="outline" size="sm">
                        <Link to={`/reports?field=${plan.field_id}&plan=${plan.id}`}>
                            <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF report
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="mb-5 grid gap-2 rounded-md border border-border/80 bg-card px-4 py-3 sm:grid-cols-3">
                <div>
                    <p className="label-eyebrow text-muted-foreground">Soil evidence</p>
                    <p className="mt-1 text-[11px] text-foreground">
                        {profile.count} values · {profile.laboratoryCount} laboratory
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                        {profile.organic_carbon_g_kg !== null
                            ? `Organic carbon ${formatNumber(profile.organic_carbon_g_kg)} g/kg`
                            : 'No organic carbon recorded'}
                    </p>
                </div>
                <div>
                    <p className="label-eyebrow text-muted-foreground">NASA climate record</p>
                    <p className="mt-1 text-[11px] text-foreground">
                        {climateLog?.summary
                            ? `${formatDate(climateLog.summary.period_start)} → ${formatDate(climateLog.summary.period_end)}`
                            : 'Not retrieved'}
                    </p>
                    <p className={`text-[10px] ${fresh.tone}`}>{fresh.label}</p>
                </div>
                <div>
                    <p className="label-eyebrow text-muted-foreground">Stored evaluation</p>
                    <p className="mt-1 text-[11px] text-foreground">{plan.evaluated_at ? formatDate(plan.evaluated_at) : 'Not saved yet'}</p>
                    <p className="text-[10px] text-muted-foreground">
                        {stale ? 'Sequences changed since this snapshot' : `Engine ${plan.engine_version || ENGINE_VERSION}`}
                    </p>
                </div>
            </div>

            {(!climateLog?.summary || !profile.count) && (
                <p className="mb-4 flex items-start gap-1.5 rounded border border-gold/30 bg-gold-soft px-3 py-2 text-[11px] text-gold">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                        {!climateLog?.summary && 'No NASA record for this field, so the water pillar is not scored. '}
                        {!profile.count && 'No soil measurements, so the soil pillar rests on rotation structure alone. '}
                        <Link to="/nasa" className="underline">Retrieve climate data</Link> or{' '}
                        <Link to="/soil" className="underline">add soil values</Link> to complete the evidence.
                    </span>
                </p>
            )}

            {notice && <p className="mb-4 rounded border border-primary/25 bg-primary/5 px-3 py-2 text-[11px] text-primary">{notice}</p>}
            {error && <p className="mb-4 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">{error}</p>}

            <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-3">
                    <h2 className="text-base text-foreground">Your priorities</h2>
                    <p className="text-[10px] text-muted-foreground">0 removes a pillar from the weighted index</p>
                </div>
                <div className="mt-4">
                    <PrioritySliders weights={weights} onChange={(field_, value) => {
                        setWeights((prev) => ({ ...prev, [field_]: value }));
                        setNotice('');
                    }} />
                </div>
                <div className="mt-4 border-t border-border/60 pt-3">
                    <label className="label-eyebrow text-muted-foreground">Objective for this comparison</label>
                    <Textarea
                        rows={2}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        className="mt-1.5 text-[11px]"
                        placeholder="What are you trying to improve on this field?"
                    />
                </div>
            </section>

            <section className="mt-6">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-base text-foreground">Sequences</h2>
                    <Button size="sm" variant="outline" onClick={addSequence} disabled={saving}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add sequence
                    </Button>
                </div>

                {!crops.length && (
                    <p className="mb-3 rounded border border-gold/30 bg-gold-soft px-3 py-2 text-[11px] text-gold">
                        The crop library is empty. <Link to="/crops" className="underline">Add crops</Link> before building sequences.
                    </p>
                )}

                <div className="space-y-4">
                    {sequences.map((sequence, index) => (
                        <div key={sequence.id} className="rounded-md border border-border/80 bg-card px-4 py-4">
                            <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                                <SequenceEditor
                                    sequence={sequence}
                                    crops={crops}
                                    dirty={Boolean(dirty[sequence.id])}
                                    saving={saving}
                                    startYear={plan.start_year || new Date().getFullYear()}
                                    onChange={(patch) => updateSequence(sequence.id, patch)}
                                    onSave={saveAll}
                                    onDelete={() => deleteSequence(sequence.id)}
                                />
                                <SequenceResult evaluation={evaluations[index]} />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-6 rounded-md border border-border/80 bg-card px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-3">
                    <h2 className="text-base text-foreground">Comparison</h2>
                    <p className="text-[10px] text-muted-foreground">▲ marks the strongest sequence for that pillar</p>
                </div>
                <div className="mt-4">
                    <ComparePanel evaluations={evaluations} />
                </div>
            </section>

            <div className="mt-6">
                <MethodPanel />
            </div>
        </div>
    );
}