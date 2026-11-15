import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import DataClassBadge from '@/components/common/DataClassBadge';
import DatasetCard from '@/components/nasa/DatasetCard';
import NasaSummary from '@/components/nasa/NasaSummary';
import NasaChart from '@/components/nasa/NasaChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Satellite, DownloadCloud, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { DATASET_KEY, formatDateTime, formatDate, freshness, formatNumber } from '@/lib/nasa';

const MONTH_OPTIONS = [
    { value: '3', label: 'Last 3 months' },
    { value: '6', label: 'Last 6 months' },
    { value: '12', label: 'Last 12 months' },
    { value: '24', label: 'Last 24 months' },
];

export default function NasaMonitor() {
    const [fields, setFields] = useState([]);
    const [fieldId, setFieldId] = useState('');
    const [datasets, setDatasets] = useState([]);
    const [observations, setObservations] = useState([]);
    const [observationCount, setObservationCount] = useState(0);
    const [latestLog, setLatestLog] = useState(null);
    const [logs, setLogs] = useState([]);
    const [months, setMonths] = useState('12');
    const [loading, setLoading] = useState(true);
    const [fetching, setFetching] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            base44.entities.Field.list({ sort: 'name', limit: 200 }),
            base44.entities.NasaDataset.list({ sort: 'sort_order', limit: 20 }),
        ]).then(([fieldRes, datasetRes]) => {
            const items = fieldRes.items || [];
            setFields(items);
            setDatasets(datasetRes.items || []);
            if (items.length) setFieldId(items[0].id);
            setLoading(false);
        });
    }, []);

    const loadField = useCallback(async () => {
        if (!fieldId) return;
        setLoading(true);
        const [obsRes, countRes, latestRes, logsRes] = await Promise.all([
            base44.entities.EnvironmentalObservation.filter(
                { field_id: fieldId, dataset_key: DATASET_KEY },
                { sort: '-observation_date', limit: 200 }
            ),
            base44.entities.EnvironmentalObservation.count({ field_id: fieldId, dataset_key: DATASET_KEY }),
            base44.entities.NasaFetchLog.filter(
                { field_id: fieldId, dataset_key: DATASET_KEY },
                { sort: '-retrieved_at', limit: 1 }
            ),
            base44.entities.NasaFetchLog.filter(
                { field_id: fieldId, dataset_key: DATASET_KEY },
                { sort: '-retrieved_at', limit: 6 }
            ),
        ]);
        setObservations((obsRes.items || []).slice().reverse());
        setObservationCount(countRes || 0);
        setLatestLog((latestRes.items || [])[0] || null);
        setLogs(logsRes.items || []);
        setLoading(false);
    }, [fieldId]);

    useEffect(() => {
        loadField();
    }, [loadField]);

    const runFetch = async (force = false) => {
        if (!fieldId) return;
        setFetching(true);
        setError('');
        setNotice('');
        try {
            const res = await base44.functions.invoke('nasaPowerFetch', {
                field_id: fieldId,
                months: Number(months),
                force,
            });
            setNotice(res.data?.message || 'Retrieval complete.');
            await loadField();
        } catch (err) {
            setError(err?.response?.data?.error || err?.message || 'Retrieval failed.');
            await loadField();
        } finally {
            setFetching(false);
        }
    };

    if (!loading && fields.length === 0) {
        return (
            <div>
                <PageHeader
                    eyebrow="NASA Earth Monitor"
                    title="Earth observations"
                    description="Real NASA products, retrieved per field, with source, date, resolution and limitations attached."
                />
                <EmptyState
                    icon={Satellite}
                    title="No fields to observe yet"
                    description="NASA data is retrieved for a specific field location. Register a field with coordinates, then return here."
                    action={
                        <Button asChild>
                            <Link to="/fields">Register a field</Link>
                        </Button>
                    }
                />
            </div>
        );
    }

    const fresh = freshness(latestLog?.retrieved_at);

    return (
        <div>
            <PageHeader
                eyebrow="NASA Earth Monitor"
                title="Earth observations"
                description="Historical NASA products retrieved for a field's location, stored with full provenance. These are reanalysis and observation records — not forecasts."
            />

            <div className="mb-5 flex flex-wrap items-end gap-3 rounded-md border border-border/80 bg-card px-4 py-3">
                <div className="min-w-[180px] flex-1">
                    <label className="label-eyebrow text-muted-foreground">Field</label>
                    <Select value={fieldId} onValueChange={setFieldId}>
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
                <div className="w-[160px]">
                    <label className="label-eyebrow text-muted-foreground">Period</label>
                    <Select value={months} onValueChange={setMonths}>
                        <SelectTrigger className="mt-1.5">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTH_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => runFetch(false)} disabled={fetching || !fieldId}>
                    {fetching ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <DownloadCloud className="mr-1.5 h-4 w-4" />}
                    {fetching ? 'Retrieving…' : 'Retrieve NASA data'}
                </Button>
                <Button variant="outline" onClick={() => runFetch(true)} disabled={fetching || !fieldId}>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Force refresh
                </Button>
            </div>

            {notice && <p className="mb-4 rounded border border-primary/25 bg-primary/5 px-3 py-2 text-[11px] text-primary">{notice}</p>}
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
                <>
                    <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-3">
                            <div>
                                <h2 className="text-base text-foreground">Derived indicators</h2>
                                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                                    NASA POWER <DataClassBadge type="regional" label="Satellite-derived regional" />
                                    <span>· grid-scale, not an in-field measurement</span>
                                </p>
                            </div>
                            <div className="text-right text-[10px]">
                                <p className={fresh.tone}>{fresh.label}</p>
                                <p className="mt-0.5 text-muted-foreground">
                                    {observationCount} observations stored
                                </p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <NasaSummary summary={latestLog?.summary} />
                        </div>
                        {observations.length > 0 && (
                            <div className="mt-5 border-t border-border/60 pt-4">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold text-foreground">Daily series</h3>
                                    <p className="text-[10px] text-muted-foreground">
                                        Last {Math.min(observations.length, 200)} stored days · gaps are shown as missing
                                    </p>
                                </div>
                                <NasaChart rows={observations} />
                            </div>
                        )}
                    </section>

                    <section className="mt-6">
                        <div className="mb-3 flex items-baseline justify-between">
                            <h2 className="text-base text-foreground">Dataset registry</h2>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">One integration live, others declared</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {datasets.map((d) => (
                                <DatasetCard key={d.id} dataset={d} />
                            ))}
                        </div>
                    </section>

                    <section className="mt-6 rounded-md border border-border/80 bg-card px-5 py-4">
                        <h2 className="border-b border-border/60 pb-3 text-base text-foreground">Retrieval log</h2>
                        {logs.length === 0 ? (
                            <p className="py-6 text-center text-[11px] text-muted-foreground">
                                No retrieval has been attempted for this field.
                            </p>
                        ) : (
                            <div className="mt-2 overflow-x-auto">
                                <table className="w-full text-left text-[11px]">
                                    <thead>
                                        <tr className="text-[9px] uppercase tracking-wide text-muted-foreground">
                                            <th className="py-2 pr-3 font-medium">Retrieved</th>
                                            <th className="py-2 pr-3 font-medium">Status</th>
                                            <th className="py-2 pr-3 font-medium">Period</th>
                                            <th className="py-2 pr-3 font-medium">Records</th>
                                            <th className="py-2 font-medium">Detail</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {logs.map((log) => (
                                            <tr key={log.id} className="align-top text-muted-foreground">
                                                <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(log.retrieved_at)}</td>
                                                <td className="py-2 pr-3">
                                                    <span
                                                        className={
                                                            log.status === 'success'
                                                                ? 'text-primary'
                                                                : log.status === 'partial'
                                                                    ? 'text-gold'
                                                                    : log.status === 'failed'
                                                                        ? 'text-destructive'
                                                                        : 'text-muted-foreground'
                                                        }
                                                    >
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-3 whitespace-nowrap">
                                                    {formatDate(log.requested_start)} → {formatDate(log.requested_end)}
                                                </td>
                                                <td className="figure py-2 pr-3">{formatNumber(log.records_written, 0)}</td>
                                                <td className="py-2">{log.message}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}