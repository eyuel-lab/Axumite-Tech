import { PRIORITIES, ratingBand } from '@/lib/rotationEngine';

function Bar({ value }) {
    if (value === null || value === undefined) {
        return <span className="text-[10px] text-muted-foreground">not scored</span>;
    }
    return (
        <div className="flex items-center gap-2">
            <div className="h-1.5 w-full max-w-[110px] overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
            </div>
            <span className="figure w-6 text-right text-[10px] text-foreground">{value}</span>
        </div>
    );
}

export default function SequenceResult({ evaluation }) {
    const band = ratingBand(evaluation.composite);
    return (
        <div className="rounded border border-border/70 bg-muted/20 px-3 py-3">
            <div className="flex items-baseline justify-between gap-2">
                <p className="label-eyebrow text-muted-foreground">Weighted index</p>
                <p className="text-[10px] text-muted-foreground">{band.label}</p>
            </div>
            <p className={`figure mt-1 text-2xl ${band.tone}`}>{evaluation.composite ?? '—'}<span className="text-xs text-muted-foreground"> / 100</span></p>

            <dl className="mt-3 space-y-2">
                {PRIORITIES.map((priority) => (
                    <div key={priority.key} className="flex items-center justify-between gap-3">
                        <dt className="text-[10px] text-muted-foreground">{priority.label}</dt>
                        <dd>
                            <Bar value={evaluation.scores[priority.key]} />
                        </dd>
                    </div>
                ))}
                <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-2">
                    <dt className="text-[10px] text-muted-foreground">Botanical families</dt>
                    <dd className="figure text-[10px] text-foreground">{evaluation.scores.families ?? 0}</dd>
                </div>
            </dl>

            {evaluation.flags.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-border/60 pt-2">
                    {evaluation.flags.map((flag) => (
                        <li key={flag} className="text-[10px] leading-relaxed text-clay">• {flag}</li>
                    ))}
                </ul>
            )}
            {evaluation.constraints.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {evaluation.constraints.map((c, i) => (
                        <li key={`${c.season}-${i}`} className="text-[10px] leading-relaxed text-muted-foreground">
                            • {c.season}: {c.text}
                        </li>
                    ))}
                </ul>
            )}

            {evaluation.rows.length > 0 && (
                <div className="mt-3 overflow-x-auto border-t border-border/60 pt-2">
                    <table className="w-full text-left text-[10px]">
                        <thead>
                            <tr className="text-[8.5px] uppercase tracking-wide text-muted-foreground">
                                <th className="py-1 pr-2 font-medium">Season</th>
                                <th className="py-1 pr-2 font-medium">Crop</th>
                                <th className="py-1 pr-2 font-medium">N credit</th>
                                <th className="py-1 pr-2 font-medium">N balance</th>
                                <th className="py-1 pr-2 font-medium">Water</th>
                                <th className="py-1 font-medium">Cover</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {evaluation.rows.map((row) => (
                                <tr key={row.index} className="align-top">
                                    <td className="py-1.5 pr-2 whitespace-nowrap text-muted-foreground">
                                        {[row.season_label, row.season_year].filter(Boolean).join(' ') || `#${row.index + 1}`}
                                    </td>
                                    <td className="py-1.5 pr-2 text-foreground">{row.crop_name}</td>
                                    <td className="figure py-1.5 pr-2">{row.metrics ? row.metrics.nCredit : '—'}</td>
                                    <td className={`figure py-1.5 pr-2 ${row.metrics?.nBalance < 0 ? 'text-clay' : 'text-foreground'}`}>
                                        {row.metrics?.nBalance ?? '—'}
                                    </td>
                                    <td className="figure py-1.5 pr-2">
                                        {row.metrics?.waterRatio == null ? '—' : `${Math.round(row.metrics.waterRatio * 100)}%`}
                                    </td>
                                    <td className="figure py-1.5">{row.metrics ? `${Math.round(row.metrics.protection * 100)}%` : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}