export default function PageHeader({ eyebrow, title, description, actions }) {
    return (
        <div className="mb-8 flex flex-col gap-5 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
                {eyebrow && <p className="label-eyebrow text-gold">{eyebrow}</p>}
                <h1 className="mt-2 text-2xl leading-[1.15] text-foreground sm:text-[2rem]">{title}</h1>
                {description && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
    );
}