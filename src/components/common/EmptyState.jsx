export default function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="rounded-md border border-dashed border-border bg-card/60 px-6 py-12 text-center">
            {Icon && (
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background">
                    <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
                </span>
            )}
            <h3 className="mt-4 text-base text-foreground">{title}</h3>
            {description && <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">{description}</p>}
            {action && <div className="mt-5 flex justify-center">{action}</div>}
        </div>
    );
}