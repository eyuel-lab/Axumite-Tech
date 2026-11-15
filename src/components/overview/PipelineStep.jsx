import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS = {
    required: 'border-clay/40 bg-clay/10 text-clay',
    ready: 'border-primary/30 bg-primary/10 text-primary',
    next: 'border-border bg-muted text-muted-foreground',
    done: 'border-primary/30 bg-primary/10 text-primary',
};

export default function PipelineStep({ index, title, description, status, statusLabel, to, actionLabel }) {
    return (
        <div className="relative flex gap-4 border-b border-border/60 py-4 last:border-b-0">
            <span className="figure mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[11px] text-muted-foreground">
                {index}
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide', STATUS[status])}>
                        {statusLabel}
                    </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
            {to && (
                <Link
                    to={to}
                    className="mt-0.5 hidden shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline sm:flex"
                >
                    {actionLabel} <ArrowRight className="h-3 w-3" />
                </Link>
            )}
        </div>
    );
}