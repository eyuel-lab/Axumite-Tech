import { formatNumber } from '@/lib/nasa';

function Indicator({ label, value, unit, note, badge }) {
    return (
        <div className="rounded border border-border/70 bg-background/60 px-3 py-2.5">
            <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                {badge}
            </div>
            <p className="figure mt-1.5 text-sm text-foreground">
                {value}
                {unit && value !== '—' && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{unit}</span>}
            </p>
            {note && <p className="mt-1 text-[9px] leading-snug text-muted-foreground">{note}</p>}
        </div>
    );
}

export default function NasaSummary({ summary }) {
    if (!summary) {
        return (
            <p className="py-6 text-center text-[11px] text-muted-foreground">
                No indicators yet. Retrieve NASA POWER data for this field to compute them.
            </p>
        );
    }
    const n = (v, d = 1) => (typeof v === 'number' ? formatNumber(v, d) : '—');
    const model = (
        <span className="rounded border border-border bg-muted px-1 py-0.5 text-[8px] uppercase tracking-wide text-muted-foreground">
            model
        </span>
    );

    return (
        <div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Indicator label="Precipitation" value={n(summary.precipitation_total_mm, 1)} unit="mm" note="Total for the period" />
                <Indicator label="Rain days" value={n(summary.rain_days_1mm, 0)} unit="days" note="Days with ≥ 1 mm" />
                <Indicator label="Longest dry spell" value={n(summary.longest_dry_spell_days, 0)} unit="days" note="Consecutive days < 1 mm" />
                <Indicator label="Mean temperature" value={n(summary.temp_mean_c)} unit="°C" />
                <Indicator label="Hottest day" value={n(summary.temp_max_c)} unit="°C" />
                <Indicator label="Coldest night" value={n(summary.temp_min_c)} unit="°C" />
                <Indicator label="Heat days" value={n(summary.heat_days_35c, 0)} unit="days" note="Max ≥ 35 °C" />
                <Indicator label="Cool days" value={n(summary.frost_days_5c, 0)} unit="days" note="Min ≤ 5 °C" />
                <Indicator label="Heat accumulation" value={n(summary.gdd_base10_c, 0)} unit="°C·d" note="Base 10 °C convention" />
                <Indicator label="Mean humidity" value={n(summary.humidity_mean_pct)} unit="%" />
                <Indicator label="Solar irradiance" value={n(summary.solar_mean_mj_m2_day, 2)} unit="MJ/m²/d" />
                <Indicator label="Root-zone wetness" value={n(summary.rootzone_wetness_mean_frac, 3)} unit="frac." badge={model} note="Land-surface estimate" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
                <span>
                    Period <span className="figure">{summary.period_start} → {summary.period_end}</span>
                </span>
                <span>
                    Days stored <span className="figure">{summary.days_stored}</span>
                </span>
                <span>
                    Core completeness <span className="figure">{summary.completeness_pct}%</span>
                </span>
            </div>
            {summary.missing_counts && Object.keys(summary.missing_counts).length > 0 && (
                <p className="mt-2 text-[10px] leading-relaxed text-clay">
                    Some values were unavailable in the source product and are stored as missing:{' '}
                    {Object.entries(summary.missing_counts)
                        .map(([k, v]) => `${k.replace(/_/g, ' ')} (${v})`)
                        .join(', ')}
                    .
                </p>
            )}
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{summary.notes}</p>
        </div>
    );
}