import { cn } from '@/lib/utils';

const TONES = {
    default: 'text-foreground',
    primary: 'text-primary',
    gold: 'text-gold',
    muted: 'text-muted-foreground',
};

export default function StatTile({ label, value, unit, hint, tone = 'default', badge }) {
    return (
        <div className="rounded-md border border-border/80 bg-card px-4 py-4">
            <div className="flex items-start justify-between gap-2">
                <p className="label-eyebrow text-muted-foreground">{label}</p>
                {badge}
            </div>
            <p className={cn('figure mt-3 text-2xl leading-none', TONES[tone])}>
                {value}
                {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
            </p>
            {hint && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
        </div>
    );
}