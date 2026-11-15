import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PRIORITIES, compareSequences, ratingBand } from '@/lib/rotationEngine';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function ComparePanel({ evaluations }) {
    const { ranked, best } = compareSequences(evaluations);
    const withScores = evaluations.filter((e) => e.scores.soil_health !== null || e.composite !== null);

    const chartData = PRIORITIES.map((priority) => {
        const row = { pillar: priority.label.split(' ')[0] };
        evaluations.forEach((e) => {
            row[e.name] = e.scores[priority.key];
        });
        return row;
    });

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                    <thead>
                        <tr className="text-[9px] uppercase tracking-wide text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Sequence</th>
                            <th className="py-2 pr-3 font-medium">Index</th>
                            {PRIORITIES.map((p) => (
                                <th key={p.key} className="py-2 pr-3 font-medium">
                                    {p.label.split(' ')[0]}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {evaluations.map((e) => {
                            const band = ratingBand(e.composite);
                            const rank = ranked.findIndex((r) => r.id === e.id);
                            return (
                                <tr key={e.id}>
                                    <td className="py-2 pr-3 text-foreground">
                                        {e.name}
                                        {rank === 0 && <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">Highest</span>}
                                    </td>
                                    <td className={`figure py-2 pr-3 ${band.tone}`}>{e.composite ?? '—'}</td>
                                    {PRIORITIES.map((p) => (
                                        <td key={p.key} className="figure py-2 pr-3 text-muted-foreground">
                                            {e.scores[p.key] ?? '—'}
                                            {best[p.key]?.id === e.id && <span className="ml-1 text-primary">▲</span>}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {withScores.length > 1 && (
                <div className="mt-5 h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                            <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="pillar" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                            <Tooltip
                                contentStyle={{
                                    fontSize: 11,
                                    borderRadius: 4,
                                    border: '1px solid hsl(var(--border))',
                                    background: 'hsl(var(--popover))',
                                    color: 'hsl(var(--popover-foreground))',
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            {evaluations.map((e, i) => (
                                <Bar key={e.id} dataKey={e.name} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {ranked.length > 1 && (
                <p className="mt-4 rounded border border-border/70 bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                    <span className="text-foreground">{ranked[0].name}</span> leads by{' '}
                    <span className="figure text-foreground">{ranked[0].composite - ranked[1].composite}</span> points over {ranked[1].name} under
                    these priorities. Change the weights above to see how the ranking responds.
                </p>
            )}
        </div>
    );
}