const CLASSES = [
    {
        label: 'Measured',
        text: 'Laboratory analysis of your own sample.',
        className: 'bg-primary/10 text-primary border-primary/25',
    },
    {
        label: 'Farmer-reported',
        text: 'Entered by you, not independently tested.',
        className: 'bg-sage/10 text-sage border-sage/30',
    },
    {
        label: 'Satellite / regional',
        text: 'Earth observation covering a wider area than one field.',
        className: 'bg-gold-soft text-gold border-gold/30',
    },
    {
        label: 'Model-derived',
        text: 'Computed by a model, not a direct measurement.',
        className: 'bg-muted text-muted-foreground border-border',
    },
    {
        label: 'Missing',
        text: 'Not available. Never filled in with a guess.',
        className: 'border-dashed border-border text-muted-foreground',
    },
];

export default function ProvenanceLegend() {
    return (
        <section className="rounded-md border border-border/80 bg-card px-5 py-4">
            <h2 className="border-b border-border/60 pb-3 text-base text-foreground">How data is labelled</h2>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Every value in Axumite Tech carries the class it belongs to, so a laboratory result is never confused with a regional
                satellite estimate.
            </p>
            <ul className="mt-4 space-y-2.5">
                {CLASSES.map((item) => (
                    <li key={item.label} className="flex gap-2.5">
                        <span
                            className={`mt-0.5 h-fit shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${item.className}`}
                        >
                            {item.label}
                        </span>
                        <span className="text-[11px] leading-relaxed text-muted-foreground">{item.text}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}