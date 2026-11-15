import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import StatTile from '@/components/overview/StatTile';
import PipelineStep from '@/components/overview/PipelineStep';
import ProvenanceLegend from '@/components/overview/ProvenanceLegend';
import { formatHectares } from '@/lib/geo';

export default function Overview() {
    const [stats, setStats] = useState({
        farms: 0,
        fields: 0,
        observations: 0,
        area: 0,
        lastSync: null,
        soil: 0,
        crops: 0,
        plans: 0,
        documents: 0,
    });

    useEffect(() => {
        Promise.all([
            base44.entities.Farm.count(),
            base44.entities.Field.list({ limit: 200 }),
            base44.entities.EnvironmentalObservation.count(),
            base44.entities.NasaFetchLog.filter({ dataset_key: 'nasa_power' }, { sort: '-retrieved_at', limit: 1 }),
            base44.entities.SoilMeasurement.count(),
            base44.entities.Crop.count(),
            base44.entities.RotationPlan.count(),
            base44.entities.FieldDocument.count(),
        ])
            .then(([farms, fieldRes, observations, logRes, soil, crops, plans, documents]) => {
                const fields = fieldRes.items || [];
                setStats({
                    farms: farms || 0,
                    fields: fields.length,
                    area: fields.reduce((sum, f) => sum + (Number(f.area_hectares) || 0), 0),
                    observations: observations || 0,
                    soil: soil || 0,
                    crops: crops || 0,
                    plans: plans || 0,
                    documents: documents || 0,
                    lastSync: (logRes.items || [])[0]?.retrieved_at || null,
                });
            })
            .catch(() => { });
    }, []);

    return (
        <div>
            <section className="overflow-hidden rounded-md bg-forest px-6 py-9 text-forest-foreground sm:px-9 sm:py-11">
                <p className="label-eyebrow flex items-center gap-2 text-gold">
                    <span className="h-px w-6 bg-gold" /> NASA Field Shift
                </p>
                <h1 className="mt-4 max-w-2xl text-[1.7rem] leading-[1.15] text-forest-foreground sm:text-[2.4rem]">
                    Crop rotation decisions, grounded in evidence.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-forest-foreground/70">
                    Axumite Tech evaluates multi-season rotation strategies for your fields using NASA Earth observations, the soil
                    measurements you enter, and the priorities you set. It shows the trade-offs and the gaps in the evidence
                    instead of hiding them behind a single score.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                    <Button asChild>
                        <Link to="/fields">Register a field</Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="border-forest-foreground/25 bg-transparent text-forest-foreground hover:bg-forest-foreground/10 hover:text-forest-foreground"
                    >
                        <Link to="/nasa">NASA Earth Monitor</Link>
                    </Button>
                </div>
            </section>

            <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                <StatTile
                    label="Farms"
                    value={String(stats.farms)}
                    hint={stats.farms ? 'Records you manage.' : 'No farms registered yet.'}
                />
                <StatTile
                    label="Fields"
                    value={String(stats.fields)}
                    hint={stats.fields ? `${formatHectares(stats.area)} mapped in total.` : 'Boundaries and area appear here once added.'}
                />
                <StatTile
                    label="NASA observations"
                    value={stats.observations.toLocaleString()}
                    tone="primary"
                    hint={stats.lastSync ? `Last retrieval ${new Date(stats.lastSync).toLocaleDateString()}.` : 'Retrieve NASA POWER data per field.'}
                />
                <StatTile
                    label="Soil values"
                    value={String(stats.soil)}
                    hint={stats.soil ? 'Each labelled by how it was obtained.' : 'No soil measurements recorded yet.'}
                />
                <StatTile
                    label="Crops in library"
                    value={String(stats.crops)}
                    hint={stats.crops ? 'Traits the rotation engine scores.' : 'Add crops to score sequences.'}
                />
                <StatTile
                    label="Rotation comparisons"
                    value={String(stats.plans)}
                    tone="primary"
                    hint={
                        stats.plans
                            ? `${stats.documents} documents on file.`
                            : 'Compare multi-season sequences per field.'
                    }
                />
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
                <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                    <div className="flex items-baseline justify-between border-b border-border/60 pb-3">
                        <h2 className="text-base text-foreground">Your decision pipeline</h2>
                        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Build order</span>
                    </div>
                    <PipelineStep
                        index="1"
                        title="Field and boundary"
                        description="A boundary polygon, its computed area, current crop and farming practices."
                        status={stats.fields ? 'done' : 'required'}
                        statusLabel={stats.fields ? 'Done' : 'Required'}
                        to="/fields"
                        actionLabel="Open"
                    />
                    <PipelineStep
                        index="2"
                        title="Soil profile"
                        description="Laboratory or farmer-reported measurements, each labelled with how it was obtained."
                        status={stats.soil ? 'done' : 'required'}
                        statusLabel={stats.soil ? 'Recorded' : 'Required'}
                        to="/soil"
                        actionLabel="Open"
                    />
                    <PipelineStep
                        index="3"
                        title="NASA observations"
                        description="Retrieve and cache daily climate data for the field, with source and quality recorded."
                        status={stats.observations ? 'done' : 'ready'}
                        statusLabel={stats.observations ? 'Active' : 'Available'}
                        to="/nasa"
                        actionLabel="Open"
                    />
                    <PipelineStep
                        index="4"
                        title="Rotation comparison"
                        description="Candidate sequences scored season by season against you priorities, with every formula shown."
                        status={stats.plans ? 'done' : stats.crops && stats.fields ? 'ready' : 'next'}
                        statusLabel={stats.plans ? 'Evaluated' : stats.crops && stats.fields ? 'Available' : 'Needs crops'}
                        to="/rotations"
                        actionLabel="Open"
                    />
                    <PipelineStep
                        index="5"
                        title="Report and assistant"
                        description="A PDF that carries the evidence and the gaps, plus an assistant that answers from these records only."
                        status={stats.documents || stats.plans ? 'done' : 'ready'}
                        statusLabel={stats.documents || stats.plans ? 'Available' : 'Ready'}
                        to="/reports"
                        actionLabel="Open"
                    />
                </section>

                <ProvenanceLegend />
            </div>

            <section className="mt-6 rounded-md border border-dashed border-border bg-card/60 px-5 py-5">
                <h2 className="text-base text-foreground">Declared, but not connected</h2>
                <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                    GPM IMERG precipitation and SMAP soil moisture are listed in the dataset registry and require a NASA Earthdata
                    token before they can be retrieved. Landsat is listed as deferred because it needs an imagery processing
                    pipeline. None of the three is simulated, and no figure on any screen is placeholder data.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to="/nasa">Review the dataset registry</Link>
                </Button>
            </section>
        </div>
    );
}