import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const DATASET_KEY = 'nasa_power';
const PRODUCT_ID = 'POWER_AG_DAILY';
const CACHE_HOURS = 24;
const MAX_MONTHS = 36;
const SOURCE_DOC = 'https://power.larc.nasa.gov/';
const SPATIAL_RESOLUTION = '0.5° latitude × 0.625° longitude (MERRA-2 grid, ~50 km)';
const PROCESSING =
    'Retrieved from the NASA POWER API (community AG, daily point endpoint) at the field centre point; values stored unmodified except unit-standardisation.';

const PARAMETERS = {
    PRECTOTCORR: 'precipitation_mm',
    T2M_MAX: 'temp_max_c',
    T2M_MIN: 'temp_min_c',
    T2M: 'temp_mean_c',
    RH2M: 'humidity_mean_pct',
    WS2M: 'wind_mean_ms',
    ALLSKY_SFC_SW_DWN: 'solar_mj_m2',
    GWETROOT: 'rootzone_wetness_frac',
};

const isoDay = (d) => d.toISOString().slice(0, 10);
const powerDay = (iso) => iso.replace(/-/g, '');
const round = (v, dp = 2) => {
    const f = Math.pow(10, dp);
    return Math.round(v * f) / f;
};

function numericValues(rows, key) {
    return rows.map((r) => r[key]).filter((v) => typeof v === 'number' && Number.isFinite(v));
}
function mean(values) {
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function buildSummary(rows, missingCounts, periodStart, periodEnd) {
    const order = rows.slice().sort((a, b) => a.observation_date.localeCompare(b.observation_date));
    const precip = numericValues(order, 'precipitation_mm');
    const tmax = numericValues(order, 'temp_max_c');
    const tmin = numericValues(order, 'temp_min_c');
    const tmean = numericValues(order, 'temp_mean_c');
    const humidity = numericValues(order, 'humidity_mean_pct');
    const solar = numericValues(order, 'solar_mj_m2');
    const wetness = numericValues(order, 'rootzone_wetness_frac');

    let longestDry = 0;
    let currentDry = 0;
    for (const row of order) {
        const p = row.precipitation_mm;
        if (typeof p !== 'number' || !Number.isFinite(p)) {
            currentDry = 0;
            continue;
        }
        if (p < 1) {
            currentDry += 1;
            longestDry = Math.max(longestDry, currentDry);
        } else {
            currentDry = 0;
        }
    }

    let gdd = 0;
    let gddDays = 0;
    for (const row of order) {
        const hi = row.temp_max_c;
        const lo = row.temp_min_c;
        if (typeof hi === 'number' && typeof lo === 'number' && Number.isFinite(hi) && Number.isFinite(lo)) {
            gdd += Math.max(0, (hi + lo) / 2 - 10);
            gddDays += 1;
        }
    }

    const completeCore = order.filter(
        (r) =>
            typeof r.precipitation_mm === 'number' &&
            typeof r.temp_max_c === 'number' &&
            typeof r.temp_min_c === 'number'
    ).length;

    return {
        period_start: periodStart,
        period_end: periodEnd,
        days_stored: order.length,
        precipitation_total_mm: precip.length ? round(precip.reduce((a, b) => a + b, 0), 1) : null,
        precipitation_mean_mm_day: precip.length ? round(mean(precip), 2) : null,
        rain_days_1mm: precip.length ? precip.filter((v) => v >= 1).length : null,
        longest_dry_spell_days: precip.length ? longestDry : null,
        temp_mean_c: tmean.length ? round(mean(tmean), 1) : null,
        temp_max_c: tmax.length ? round(Math.max(...tmax), 1) : null,
        temp_min_c: tmin.length ? round(Math.min(...tmin), 1) : null,
        heat_days_35c: tmax.length ? tmax.filter((v) => v >= 35).length : null,
        frost_days_5c: tmin.length ? tmin.filter((v) => v <= 5).length : null,
        humidity_mean_pct: humidity.length ? round(mean(humidity), 1) : null,
        solar_mean_mj_m2_day: solar.length ? round(mean(solar), 2) : null,
        rootzone_wetness_mean_frac: wetness.length ? round(mean(wetness), 3) : null,
        gdd_base10_c: gddDays ? round(gdd, 0) : null,
        gdd_days_used: gddDays,
        completeness_pct: order.length ? round((completeCore / order.length) * 100, 1) : 0,
        missing_counts: missingCounts,
        notes:
            'Derived indicators computed from stored NASA POWER daily values. Growing-degree days use a 10 °C base as a convention, not a crop-specific threshold. Root-zone wetness is a model-derived land-surface estimate, not an in-field measurement. Historical reanalysis data, not a forecast.',
    };
}

export default async function (req) {
    const started = Date.now();
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const fieldId = typeof body?.field_id === 'string' ? body.field_id : '';
        if (!fieldId) return Response.json({ error: 'field_id is required' }, { status: 400 });

        let months = Number(body?.months ?? 12);
        if (!Number.isFinite(months)) months = 12;
        months = Math.min(Math.max(Math.round(months), 1), MAX_MONTHS);

        const field = await base44.entities.Field.get(fieldId).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
        if (!field) return Response.json({ error: 'Field not found' }, { status: 404 });
        if (field.created_by_id !== user.id && user.role !== 'admin') {
            return Response.json({ error: 'Not authorised for this field' }, { status: 403 });
        }

        const lat = Number(field.latitude);
        const lon = Number(field.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
            return Response.json(
                { error: 'This field has no valid centre coordinates. Edit the field and set its location first.' },
                { status: 400 }
            );
        }

        const end = new Date(Date.now() - 3 * 86400000);
        const start = new Date(end);
        start.setUTCMonth(start.getUTCMonth() - months);
        const periodStart = isoDay(start);
        const periodEnd = isoDay(end);

        const logs = await base44.entities.NasaFetchLog.filter(
            { field_id: fieldId, dataset_key: DATASET_KEY },
            { sort: '-retrieved_at', limit: 5 }
        );
        const fresh = (logs.items || []).find(
            (l) =>
                l.status === 'success' &&
                typeof l.requested_start === 'string' &&
                typeof l.requested_end === 'string' &&
                l.requested_start <= periodStart &&
                l.requested_end >= periodEnd &&
                Date.now() - new Date(l.retrieved_at).getTime() < CACHE_HOURS * 3600000
        );
        if (fresh && body?.force !== true) {
            return Response.json({
                status: 'cached',
                cached: true,
                summary: fresh.summary || null,
                records: fresh.records_written || 0,
                log_id: fresh.id,
                retrieved_at: fresh.retrieved_at,
                message: 'Served from stored observations retrieved in the last 24 hours. No new request was sent to NASA.',
            });
        }

        const url =
            `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${Object.keys(PARAMETERS).join(',')}` +
            `&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}` +
            `&start=${powerDay(periodStart)}&end=${powerDay(periodEnd)}&format=JSON`;

        let payload = null;
        let httpStatus = 0;
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
            httpStatus = res.status;
            if (!res.ok) {
                throw new Error(`NASA POWER returned HTTP ${res.status}`);
            }
            payload = await res.json();
        } catch (fetchError) {
            const message = `Retrieval failed: ${fetchError?.message || 'unknown network error'}. No observations were stored.`;
            await base44.entities.NasaFetchLog.create({
                field_id: fieldId,
                dataset_key: DATASET_KEY,
                status: 'failed',
                http_status: httpStatus || null,
                requested_start: periodStart,
                requested_end: periodEnd,
                records_written: 0,
                duration_ms: Date.now() - started,
                message,
                retrieved_at: new Date().toISOString(),
            });
            return Response.json({ error: message }, { status: 502 });
        }

        const series = payload?.properties?.parameter;
        if (!series || typeof series !== 'object') {
            const message = 'NASA POWER response did not contain a parameter block. No observations were stored.';
            await base44.entities.NasaFetchLog.create({
                field_id: fieldId,
                dataset_key: DATASET_KEY,
                status: 'failed',
                http_status: httpStatus,
                requested_start: periodStart,
                requested_end: periodEnd,
                records_written: 0,
                duration_ms: Date.now() - started,
                message,
                retrieved_at: new Date().toISOString(),
            });
            return Response.json({ error: message }, { status: 502 });
        }

        const fillRaw = payload?.header?.fill_value;
        const fillValue = Number.isFinite(Number(fillRaw)) ? Number(fillRaw) : -999;

        const dateSet = new Set();
        for (const powerKey of Object.keys(PARAMETERS)) {
            const block = series[powerKey];
            if (block && typeof block === 'object') Object.keys(block).forEach((d) => dateSet.add(d));
        }
        const dates = Array.from(dateSet).sort();
        if (!dates.length) {
            const message = 'NASA POWER returned no daily values for this location and period.';
            await base44.entities.NasaFetchLog.create({
                field_id: fieldId,
                dataset_key: DATASET_KEY,
                status: 'failed',
                http_status: httpStatus,
                requested_start: periodStart,
                requested_end: periodEnd,
                records_written: 0,
                duration_ms: Date.now() - started,
                message,
                retrieved_at: new Date().toISOString(),
            });
            return Response.json({ error: message }, { status: 502 });
        }

        const retrievedAt = new Date().toISOString();
        const missingCounts = {};
        const rows = [];

        for (const powerDate of dates) {
            const row = {
                field_id: fieldId,
                dataset_key: DATASET_KEY,
                product_id: PRODUCT_ID,
                observation_date: `${powerDate.slice(0, 4)}-${powerDate.slice(4, 6)}-${powerDate.slice(6, 8)}`,
                missing_parameters: [],
                quality_flag: 'POWER daily screened value',
                processing_method: PROCESSING,
                spatial_resolution: SPATIAL_RESOLUTION,
                temporal_resolution: 'daily',
                sample_latitude: lat,
                sample_longitude: lon,
                source_url: url,
                retrieved_at: retrievedAt,
                created_by_id: field.created_by_id,
                created_by: field.created_by || undefined,
            };

            for (const [powerKey, fieldKey] of Object.entries(PARAMETERS)) {
                const raw = series?.[powerKey]?.[powerDate];
                const num = raw === undefined || raw === null ? NaN : Number(raw);
                if (!Number.isFinite(num) || num === fillValue) {
                    row[fieldKey] = null;
                    row.missing_parameters.push(fieldKey);
                    missingCounts[fieldKey] = (missingCounts[fieldKey] || 0) + 1;
                } else {
                    row[fieldKey] = num;
                }
            }
            rows.push(row);
        }

        await base44.asServiceRole.entities.EnvironmentalObservation.deleteMany({
            field_id: fieldId,
            dataset_key: DATASET_KEY,
            observation_date: { $gte: periodStart, $lte: periodEnd },
        });

        for (let i = 0; i < rows.length; i += 200) {
            await base44.asServiceRole.entities.EnvironmentalObservation.bulkCreate(rows.slice(i, i + 200));
        }

        const summary = buildSummary(rows, missingCounts, periodStart, periodEnd);
        const coreComplete = summary.completeness_pct >= 99;
        const message = coreComplete
            ? `Retrieved ${rows.length} daily records from NASA POWER for ${periodStart} to ${periodEnd}.`
            : `Retrieved ${rows.length} daily records for ${periodStart} to ${periodEnd}; some values were unavailable and are marked as missing.`;

        const log = await base44.entities.NasaFetchLog.create({
            field_id: fieldId,
            dataset_key: DATASET_KEY,
            status: coreComplete ? 'success' : 'partial',
            http_status: httpStatus,
            requested_start: periodStart,
            requested_end: periodEnd,
            records_written: rows.length,
            duration_ms: Date.now() - started,
            message,
            summary,
            retrieved_at: retrievedAt,
        });

        return Response.json({
            status: coreComplete ? 'success' : 'partial',
            cached: false,
            summary,
            records: rows.length,
            log_id: log.id,
            retrieved_at: retrievedAt,
            message,
            source_url: SOURCE_DOC,
        });
    } catch (error) {
        return Response.json({ error: error?.message || 'Unexpected retrieval error' }, { status: 500 });
    }
}