import { cn } from '@/lib/utils';
import { DATA_CLASSES } from '@/lib/nasa';

export default function DataClassBadge({ type = 'missing', label, className }) {
    const entry = DATA_CLASSES[type] || DATA_CLASSES.missing;
    return (
        <span
            className={cn(
                'inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                entry.className,
                className
            )}
        >
            {label || entry.label}
        </span>
    );
}