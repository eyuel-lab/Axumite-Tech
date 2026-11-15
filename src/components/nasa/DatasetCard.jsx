import { ExternalLink } from 'lucide-react';

const AVAILABILITY = {
    available: { label: 'Available', className: 'border-primary/25 bg-primary/10 text-primary' },
    requires_credentials: { label: 'Needs credentials', className: 'border-gold/35 bg-gold-soft text-gold' },
    deferred: { label: 'Not implemented', className: 'border-border bg-muted text-muted-foreground' },
};

export default function DatasetCard({ dataset }) {
    const badge = AVAILABILITY[dataset.availability] || AVAILABILITY.deferred;
    return (
        <div className="flex flex-col rounded-md border border-border/80 bg-card px-4 py-4">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{dataset.name}</h3>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {dataset.provider} · {dataset.product_id}
                    </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide ${badge.className}`}>
                    {badge.label}
                </span>
            </div>
            {dataset.description && <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{dataset.description}</p>}
            <dl className="mt-3 space-y-1.5 text-[10px] text-muted-foreground">
                <div className="flex gap-1.5">
                    <dt className="shrink-0 font-medium">Spatial</dt>
                    <dd>{dataset.spatial_resolution || '—'}</dd>
                </div>
                <div className="flex gap-1.5">
                    <dt className="shrink-0 font-medium">Temporal</dt>
                    <dd>{dataset.temporal_resolution || '—'}</dd>
                </div>
                <div className="flex gap-1.5">
                    <dt className="shrink-0 font-medium">Method</dt>
                    <dd>{dataset.processing_method || '—'}</dd>
                </div>
            </dl>
            {dataset.limitations && (
                <p className="mt-3 border-t border-border/60 pt-2.5 text-[10px] leading-relaxed text-clay">{dataset.limitations}</p>
            )}
            {dataset.access_note && dataset.availability !== 'available' && (
                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{dataset.access_note}</p>
            )}
            {dataset.source_url && (
                <a
                    href={dataset.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                >
                    Official source <ExternalLink className="h-2.5 w-2.5" />
                </a>
            )}
        </div>
    );
}