import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function NasaChart({ rows }) {
    const data = rows.map((r) => ({
        date: r.observation_date,
        precip: typeof r.precipitation_mm === 'number' ? r.precipitation_mm : null,
        tmax: typeof r.temp_max_c === 'number' ? r.temp_max_c : null,
        tmin: typeof r.temp_min_c === 'number' ? r.temp_min_c : null,
    }));

    return (
        <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 4" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(v) => v.slice(5)}
                        interval={Math.max(0, Math.floor(data.length / 8))}
                        stroke="hsl(var(--border))"
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                    <Tooltip
                        contentStyle={{
                            fontSize: 11,
                            borderRadius: 4,
                            border: '1px solid hsl(var(--border))',
                            background: 'hsl(var(--popover))',
                            color: 'hsl(var(--popover-foreground))',
                        }}
                        formatter={(value, name) => [value === null ? 'missing' : value, name]}
                    />
                    <Bar yAxisId="left" dataKey="precip" name="Precipitation (mm)" fill="hsl(var(--chart-1))" opacity={0.75} />
                    <Line yAxisId="right" dataKey="tmax" name="T max (°C)" stroke="hsl(var(--gold))" strokeWidth={1.6} dot={false} connectNulls={false} />
                    <Line yAxisId="right" dataKey="tmin" name="T min (°C)" stroke="hsl(var(--sage))" strokeWidth={1.4} dot={false} connectNulls={false} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}