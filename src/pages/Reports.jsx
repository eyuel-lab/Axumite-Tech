import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataClassBadge from '@/components/common/DataClassBadge';
import { buildFieldReport } from '@/lib/pdfReport';
import { buildSoilProfile, evaluateSequence } from '@/lib/rotationEngine';
import { formatDate, formatNumber, irrigationLabel, provenanceOption, soilParameter } from '@/lib/nasa';
import { formatHectares } from '@/lib/geo';
import { FileText, Loader2, Download, AlertCircle } from 'lucide-react';

export default function Reports() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [fields, setFields] = useState([]);
    const [fieldId, setFieldId] = useState(searchParams.get('field') || '');
    const [plans, setPlans] = useState([]);
    const [planId, setPlanId] = useState(searchParams.get('plan') || 'none');
    const [data, setData] = useState({ field: null, farm: null, soil: [], climateLog: null, documents: [], sequences: [] });
    const [crops, setCrops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);

    useEffect(() => {
        base44.entities.Field.list({ sort: 'name', limit: 100 }).then((res) => {
            const items = res.items || [];
            setFields(items);
            setFieldId((current) => current || items[0]?.id || '');
            setLoading(false);
        });
        base44.entities.Crop.list({ sort: 'name', limit: 300 }).then((res) => setCrops(res.items || []));
        base44.auth.me().then(setUser).catch(() => { });
    }, []);

    const load = useCallback(async () => {
        if (!fieldId) return;
        setLoading(true);
        const [fieldRes, soilRes, logRes, docRes, planRes] = await Promise.all([
            base44.entities.Field.get(fieldId).catch(() => null),
            base44.entities.SoilMeasurement.filter({ field_id: fieldId }, { sort: '-created_date', limit: 200 }),
            base44.entities.NasaFetchLog.filter({ field_id: fieldId, dataset_key: 'nasa_power' }, { sort: '-retrieved_at', limit: 1 }),
            base44.entities.FieldDocument.filter({ field_id: fieldId }, { sort: '-created_date', limit: 50 }),
            base44.entities.RotationPlan.filter({ field_id: fieldId }, { sort: '-updated_date', limit: 20 }),
        ]);
        const farm = fieldRes?.farm_id
            ? await base44.entities.Farm.get(fieldRes.farm_id).catch(() => null)
            : null;
        setPlans(planRes.items || []);
        setData((prev) => ({
            ...prev,
            farm,
            field: fieldRes,
            soil: soilRes.items || [],
            climateLog: (logRes.items || [])[0] || null,
            documents: docRes.items || [],
            sequences: [],
        }));
        setLoading(false);
    }, [fieldId]);

    useEffect(() => {
        if (fieldId) load();
    }, [fieldId, load]);

    const plan = useMemo(() => plans.find((p) => p.id === planId) || null, [plans, planId]);

    useEffect(() => {
        if (!plan) {
            setData((prev) => ({ ...prev, sequences: [] }));
            return;
        }
        base44.entities.RotationSequence.filter({ plan_id: plan.id }, { sort: 'sort_order', limit: 20 }).then((res) =>
            setData((prev) => ({ ...prev, sequences: res.items || [] }))
        );
    }, [plan]);

    const profile = useMemo(() => buildSoilProfile(data.soil), [data.soil]);

    const evaluations = useMemo(() => {
        if (!plan) return [];
        return data.sequences.map((sequence) => ({
            id: sequence.id,
            name: sequence.name,
            ...evaluateSequence({
                entries: sequence.entries || [],
                crops,
                soil: profile,
                climate: data.climateLog?.summary || null,
                field: data.field || {},
                weights: plan,
            }),
        }));
    }, [plan, data.sequences, crops, profile, data.climateLog, data.field]);

    const pickField = (value) => {
        setFieldId(value);
        setPlanId('none');
        const next = new URLSearchParams(searchParams);
        next.set('field', value);
        next.delete('plan');
        setSearchParams(next);
    };

    const pickPlan = (value) => {
        setPlanId(value);
        const next = new URLSearchParams(searchParams);
        if (value === 'none') next.delete('plan');
        else next.set('plan', value);
        setSearchParams(next);
    };

    const download = () => {
        if (!data.field) return;
        setError('');
        setGenerating(true);
        try {
            const doc = buildFieldReport({
                field: data.field,
                farm: data.farm,
                soil: data.soil,
                climateLog: data.climateLog,
                documents: data.documents,
                plan,
                sequences: data.sequences,
                evaluations,
                generatedFor: user?.full_name || user?.email || '',
            });
            const safe = String(data.field.name || 'field').replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '_');
            doc.save(`Axumite Tech_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (err) {
            setError(err?.message || 'The PDF could not be generated.');
        } finally {
            setGenerating(false);
        }
    };

    if (!loading && fields.length === 0) {
        return (
            <div>
                <PageHeader eyebrow="Reports" title="Field reports" description="A printable record of the evidence behind a decision." />
                <p className="rounded-md border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
                    Register a field to generate a report.
                </p>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                eyebrow="Reports"
                title="Field decision report"
                description="Assemble a PDF from the stored evidence: field profile, soil measurements with their provenance, NASA period indicators, an optional rotation comparison, documents on file and the gaps that remain."
                actions={
                    <Button onClick={download} disabled={!data.field || generating}>
                        {generating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
                        Download PDF
                    </Button>
                }
            />

            <div className="mb-5 flex flex-wrap items-end gap-3 rounded-md border border-border/80 bg-card px-4 py-3">
                <div className="min-w-[200px] flex-1">
                    <label className="label-eyebrow text-muted-foreground">Field</label>
                    <Select value={fieldId} onValueChange={pickField}>
                        <SelectTrigger className="mt-1.5">
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
                <div className="min-w-[200px] flex-1">
                    <label className="label-eyebrow text-muted-foreground">Rotation comparison (optional)</label>
                    <Select value={planId} onValueChange={pickPlan}>
                        <SelectTrigger className="mt-1.5">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Do not include</SelectItem>
                            {plans.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {error && (
                <p className="mb-4 flex items-start gap-1.5 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
                </p>
            )}

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-4">
                    <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                            <FileText className="h-4 w-4 text-gold" />
                            <h2 className="text-base text-foreground">{data.field?.name}</h2>
                        </div>
                        <dl className="mt-3 grid gap-3 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
                            <Info label="Area" value={data.field?.area_hectares ? formatHectares(data.field.area_hectares) : 'Not recorded'} />
                            <Info label="Location" value={[data.field?.admin_area, data.field?.country].filter(Boolean).join(', ') || 'Not recorded'} />
                            <Info label="Irrigation" value={irrigationLabel(data.field?.irrigation)} />
                            <Info label="Soil values" value={`${data.soil.length} (${profile.laboratoryCount} laboratory)`} />
                        </dl>
                    </section>

                    <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                        <h2 className="border-b border-border/60 pb-3 text-base text-foreground">Soil measurements</h2>
                        {data.soil.length === 0 ? (
                            <p className="py-4 text-[11px] text-muted-foreground">No values recorded — the report states this rather than estimating.</p>
                        ) : (
                            <div className="mt-2 overflow-x-auto">
                                <table className="w-full text-left text-[11px]">
                                    <thead>
                                        <tr className="text-[9px] uppercase tracking-wide text-muted-foreground">
                                            <th className="py-2 pr-3 font-medium">Parameter</th>
                                            <th className="py-2 pr-3 font-medium">Value</th>
                                            <th className="py-2 pr-3 font-medium">How obtained</th>
                                            <th className="py-2 font-medium">Sampled</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {data.soil.map((m) => (
                                            <tr key={m.id}>
                                                <td className="py-1.5 pr-3 text-foreground">{soilParameter(m.parameter).label}</td>
                                                <td className="figure py-1.5 pr-3 text-foreground">
                                                    {m.text_value || `${m.value ?? '—'} ${m.unit || soilParameter(m.parameter).unit}`}
                                                </td>
                                                <td className="py-1.5 pr-3 text-muted-foreground">{provenanceOption(m.provenance).label}</td>
                                                <td className="py-1.5 text-muted-foreground">{formatDate(m.sample_date)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                        <div className="flex items-center justify-between border-b border-border/60 pb-3">
                            <h2 className="text-base text-foreground">NASA Earth observations</h2>
                            <DataClassBadge type="regional" />
                        </div>
                        {data.climateLog?.summary ? (
                            (() => {
                                const s = data.climateLog.summary;
                                return (
                                    <dl className="mt-3 grid gap-3 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
                                        <Info label="Period" value={`${formatDate(s.period_start)} → ${formatDate(s.period_end)}`} />
                                        <Info label="Precipitation" value={`${formatNumber(s.precipitation_total_mm)} mm`} />
                                        <Info label="Longest dry spell" value={`${s.longest_dry_spell_days ?? '—'} days`} />
                                        <Info label="Mean / max temp" value={`${formatNumber(s.temp_mean_c)} / ${formatNumber(s.temp_max_c)} °C`} />
                                        <Info label="Heat days >35 °C" value={String(s.heat_days_35c ?? '—')} />
                                        <Info label="Cool days ≤5 °C" value={String(s.frost_days_5c ?? '—')} />
                                        <Info label="Solar" value={`${formatNumber(s.solar_mean_mj_m2_day)} MJ/m²/d`} />
                                        <Info label="Root-zone wetness" value={`${formatNumber(s.rootzone_wetness_mean_frac, 3)} (model)`} />
                                    </dl>
                                );
                            })()
                        ) : (
                            <p className="py-4 text-[11px] text-muted-foreground">No NASA period stored for this field.</p>
                        )}
                    </section>

                    <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                        <h2 className="border-b border-border/60 pb-3 text-base text-foreground">Rotation comparison</h2>
                        {!plan ? (
                            <p className="py-4 text-[11px] text-muted-foreground">Choose a comparison above to include its scores.</p>
                        ) : (
                            <div className="mt-3 space-y-3">
                                <p className="text-[11px] text-muted-foreground">
                                    {plan.name} · {evaluations.length} sequences · engine {evaluations[0]?.engine_version || '—'}
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-[11px]">
                                        <thead>
                                            <tr className="text-[9px] uppercase tracking-wide text-muted-foreground">
                                                <th className="py-2 pr-3 font-medium">Sequence</th>
                                                <th className="py-2 pr-3 font-medium">Index</th>
                                                <th className="py-2 pr-3 font-medium">Soil</th>
                                                <th className="py-2 pr-3 font-medium">Nitrogen</th>
                                                <th className="py-2 pr-3 font-medium">Water</th>
                                                <th className="py-2 pr-3 font-medium">Pest</th>
                                                <th className="py-2 font-medium">Erosion</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60">
                                            {evaluations.map((e) => (
                                                <tr key={e.id}>
                                                    <td className="py-1.5 pr-3 text-foreground">{e.name}</td>
                                                    <td className="figure py-1.5 pr-3 text-foreground">{e.composite ?? '—'}</td>
                                                    <td className="figure py-1.5 pr-3 text-muted-foreground">{e.scores.soil_health ?? '—'}</td>
                                                    <td className="figure py-1.5 pr-3 text-muted-foreground">{e.scores.nitrogen ?? '—'}</td>
                                                    <td className="figure py-1.5 pr-3 text-muted-foreground">{e.scores.water ?? '—'}</td>
                                                    <td className="figure py-1.5 pr-3 text-muted-foreground">{e.scores.pest ?? '—'}</td>
                                                    <td className="figure py-1.5 text-muted-foreground">{e.scores.erosion ?? '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                        <h2 className="border-b border-border/60 pb-3 text-base text-foreground">Documents on file</h2>
                        {data.documents.length === 0 ? (
                            <p className="py-4 text-[11px] text-muted-foreground">No documents uploaded for this field.</p>
                        ) : (
                            <ul className="mt-2 divide-y divide-border/60">
                                {data.documents.map((d) => (
                                    <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-[11px]">
                                        <span className="text-foreground">{d.title}</span>
                                        <span className="text-muted-foreground">
                                            {String(d.doc_type || 'other').replace('_', ' ')} · {formatDate(d.document_date)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                        The PDF also lists evidence gaps. Rotation indices are relative comparisons computed by published rules — not
                        calibrated predictions of yield or soil carbon.
                    </p>
                </div>
            )}
        </div>
    );
}

function Info({ label, value }) {
    return (
        <div>
            <dt className="label-eyebrow text-muted-foreground">{label}</dt>
            <dd className="figure mt-1 text-foreground">{value}</dd>
        </div>
    );
}