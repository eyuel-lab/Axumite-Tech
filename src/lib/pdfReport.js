import { jsPDF } from 'jspdf';
import { ENGINE_VERSION } from '@/lib/rotationEngine';
import { formatDate, irrigationLabel, soilParameter, provenanceOption } from '@/lib/nasa';
import { formatCoordinate, formatHectares } from '@/lib/geo';

const FOREST = [24, 44, 37];
const GOLD = [168, 133, 63];
const INK = [38, 44, 41];
const MUTED = [112, 118, 112];
const RULE = [222, 216, 202];

export function buildFieldReport({
    field,
    farm,
    soil = [],
    climateLog = null,
    documents = [],
    plan = null,
    sequences = [],
    evaluations = [],
    generatedFor = '',
}) {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const M = 42;
    const width = pageWidth - M * 2;
    let y = M;

    const ensure = (needed) => {
        if (y + needed > pageHeight - 54) {
            doc.addPage();
            y = M;
        }
    };

    const text = (value, { size = 9.5, color = INK, bold = false, gap = 4, leading = 1.35 } = {}) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        const lines = doc.splitTextToSize(String(value ?? ''), width);
        lines.forEach((line) => {
            ensure(size * leading);
            doc.text(line, M, y);
            y += size * leading;
        });
        y += gap;
    };

    const heading = (label) => {
        ensure(34);
        y += 6;
        doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
        doc.setLineWidth(1.4);
        doc.line(M, y, M + 22, y);
        y += 12;
        text(label, { size: 12, bold: true, gap: 6 });
    };

    const keyValues = (pairs) => {
        pairs.forEach(([label, value]) => {
            ensure(13);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
            doc.text(String(label), M, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(INK[0], INK[1], INK[2]);
            const lines = doc.splitTextToSize(String(value ?? '—'), width - 150);
            ensure(Math.max(12, lines.length * 11));
            lines.forEach((line, index) => doc.text(line, M + 150, y + index * 11));
            y += Math.max(12, lines.length * 11);
        });
        y += 2;
    };

    const table = (headers, rows, columnWidths) => {
        const drawHeader = () => {
            ensure(16);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.6);
            doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
            let x = M;
            headers.forEach((h, i) => {
                doc.text(String(h).toUpperCase(), x, y);
                x += columnWidths[i];
            });
            y += 4;
            doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
            doc.setLineWidth(0.6);
            doc.line(M, y, M + width, y);
            y += 9;
        };
        drawHeader();
        rows.forEach((cells) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.4);
            const wrapped = cells.map((cell, i) => doc.splitTextToSize(String(cell ?? '—'), columnWidths[i] - 8));
            const lines = Math.max(...wrapped.map((w) => w.length), 1);
            const height = lines * 11;
            if (y + height > pageHeight - 54) {
                doc.addPage();
                y = M;
                drawHeader();
            }
            doc.setTextColor(INK[0], INK[1], INK[2]);
            let x = M;
            wrapped.forEach((lines_, i) => {
                lines_.forEach((line, li) => doc.text(line, x, y + li * 11));
                x += columnWidths[i];
            });
            y += height + 3;
        });
        y += 4;
    };

    // Cover
    doc.setFillColor(FOREST[0], FOREST[1], FOREST[2]);
    doc.rect(0, 0, pageWidth, 118, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(244, 240, 230);
    doc.text('Axumite Tech', M, 52);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(198, 174, 126);
    doc.text('FIELD DECISION REPORT', M, 70);
    doc.setFontSize(15);
    doc.setTextColor(248, 245, 238);
    doc.text(field?.name || 'Field', M, 96);
    y = 140;

    text(`Generated ${new Date().toLocaleString()}${generatedFor ? ` for ${generatedFor}` : ''}`, {
        size: 8.5,
        color: MUTED,
        gap: 10,
    });

    heading('1. Field profile');
    keyValues([
        ['Farm', farm?.name || 'Not assigned'],
        ['Location', [field?.admin_area, field?.country].filter(Boolean).join(', ') || 'Not recorded'],
        ['Centre', `${formatCoordinate(field?.latitude, 'lat')}, ${formatCoordinate(field?.longitude, 'lng')}`],
        ['Area', field?.area_hectares ? `${formatHectares(field.area_hectares)} (${field.area_source === 'manual_entry' ? 'entered manually' : field.area_source === 'computed_polygon' ? 'computed from boundary' : 'source not recorded'})` : 'Not recorded'],
        ['Boundary', Array.isArray(field?.boundary) && field.boundary.length >= 3 ? `${field.boundary.length} vertices stored` : 'No polygon stored'],
        ['Current crop', field?.current_crop || 'Not recorded'],
        ['Irrigation', irrigationLabel(field?.irrigation)],
        ['Practices', (field?.practices || []).join(', ') || 'Not recorded'],
    ]);

    heading('2. Soil measurements');
    if (!soil.length) {
        text('No soil measurements recorded for this field. Axumite Tech does not estimate soil properties from coordinates, so this section is empty rather than inferred.', { color: MUTED });
    } else {
        table(
            ['Parameter', 'Value', 'How obtained', 'Sampled'],
            soil.map((m) => [
                soilParameter(m.parameter).label,
                m.text_value || `${m.value ?? '—'} ${m.unit || soilParameter(m.parameter).unit}`,
                provenanceOption(m.provenance).label,
                formatDate(m.sample_date),
            ]),
            [170, 110, 130, width - 410]
        );
        text('Each value keeps the way it was obtained. Farmer-reported and laboratory-measured values are never averaged together silently.', {
            size: 7.8,
            color: MUTED,
        });
    }

    heading('3. NASA Earth observations');
    if (!climateLog?.summary) {
        text('No NASA POWER record stored for this field yet. Retrieve data from the NASA Earth Monitor before relying on the climate pillars.', { color: MUTED });
    } else {
        const s = climateLog.summary;
        keyValues([
            ['Dataset', `NASA POWER (${climateLog.dataset_key || 'nasa_power'}) · daily · AG community`],
            ['Period', `${formatDate(s.period_start)} → ${formatDate(s.period_end)}`],
            ['Stored days', `${s.days_stored ?? '—'} (core completeness ${s.completeness_pct ?? '—'} %)`],
            ['Precipitation', `${s.precipitation_total_mm ?? '—'} mm total · ${s.rain_days_1mm ?? '—'} days above 1 mm`],
            ['Longest dry spell', `${s.longest_dry_spell_days ?? '—'} days`],
            ['Temperature', `mean ${s.temp_mean_c ?? '—'} °C · max ${s.temp_max_c ?? '—'} °C · min ${s.temp_min_c ?? '—'} °C`],
            ['Heat / cool days', `${s.heat_days_35c ?? '—'} above 35 °C · ${s.frost_days_5c ?? '—'} at or below 5 °C`],
            ['Solar', `${s.solar_mean_mj_m2_day ?? '—'} MJ/m²/day`],
            ['Root-zone wetness', `${s.rootzone_wetness_mean_frac ?? '—'} of saturation (model-derived)`],
            ['Growing-degree days', `${s.gdd_base10_c ?? '—'} °C·d above 10 °C`],
        ]);
        if (s.missing_counts && Object.keys(s.missing_counts).length) {
            text(
                `Missing values are recorded rather than filled: ${Object.entries(s.missing_counts)
                    .map(([k, v]) => `${k} (${v} days)`)
                    .join(', ')}.`,
                { size: 7.8, color: MUTED }
            );
        }
        text(
            'Provenance: satellite/reanalysis product at grid scale, not an in-field measurement, and a historical record rather than a forecast.',
            { size: 7.8, color: MUTED }
        );
    }

    heading('4. Rotation comparison');
    if (!plan || !evaluations.length) {
        text('No rotation plan was included in this report. Open Rotation Simulator to compare sequences for this field.', { color: MUTED });
    } else {
        keyValues([
            ['Plan', plan.name],
            ['Engine', `${ENGINE_VERSION} · evaluated ${plan.evaluated_at ? formatDate(plan.evaluated_at) : 'live in this report'}`],
            ['Sequences', String(sequences.length)],
            ['Priorities', `soil ${plan.weight_soil_health ?? 3} · nitrogen ${plan.weight_nitrogen ?? 3} · water ${plan.weight_water ?? 3} · pest ${plan.weight_pest ?? 3} · erosion ${plan.weight_erosion ?? 2}`],
        ]);

        table(
            ['Sequence', 'Composite', 'Soil health', 'Nitrogen', 'Water', 'Pest break', 'Erosion'],
            evaluations.map((e) => [
                e.name,
                e.composite ?? '—',
                e.scores.soil_health ?? '—',
                e.scores.nitrogen ?? '—',
                e.scores.water ?? '—',
                e.scores.pest ?? '—',
                e.scores.erosion ?? '—',
            ]),
            [150, 70, 70, 70, 62, 70, width - 492]
        );

        const best = [...evaluations].filter((e) => e.composite !== null).sort((a, b) => b.composite - a.composite)[0];
        if (best) {
            text(`Highest weighted index: ${best.name} at ${best.composite} of 100 (${best.band.label.toLowerCase()}).`, {
                bold: true,
                gap: 4,
            });
            const seasonRows = best.rows.filter((r) => r.metrics);
            if (seasonRows.length) {
                table(
                    ['Season', 'Crop', 'N balance (kg/ha)', 'Water supply', 'Soil cover'],
                    seasonRows.map((r) => [
                        `${r.season_label || 'Season'}${r.season_year ? ` ${r.season_year}` : ''}`,
                        r.crop_name,
                        r.metrics.nBalance ?? '—',
                        r.metrics.waterRatio === null ? '—' : `${Math.round(r.metrics.waterRatio * 100)} %`,
                        `${Math.round(r.metrics.protection * 100)} %`,
                    ]),
                    [110, 150, 130, 100, width - 490]
                );
            }
            if (best.flags.length) {
                text('Limits noted for this sequence:', { size: 8.5, bold: true, gap: 2 });
                best.flags.forEach((f) => text(`• ${f}`, { size: 7.9, color: MUTED, gap: 1.5 }));
            }
        }
        text(
            'Indices are relative and transparent: computed by published formulas from stored data, not calibrated yield or soil-carbon predictions. Use them to compare options, not to promise an outcome.',
            { size: 7.8, color: MUTED }
        );
    }

    heading('5. Documents on file');
    if (!documents.length) {
        text('No documents uploaded for this field.', { color: MUTED });
    } else {
        table(
            ['Title', 'Type', 'Document date', 'File'],
            documents.map((d) => [d.title, String(d.doc_type || '').replace('_', ' '), formatDate(d.document_date), d.file_name || '—']),
            [180, 110, 100, width - 390]
        );
        text('Documents are stored privately and download links are generated when opened in the app.', { size: 7.8, color: MUTED });
    }

    heading('6. Evidence gaps');
    const gaps = [];
    if (!soil.length) gaps.push('No soil measurements recorded — soil health and nutrient pillars cannot be verified.');
    else {
        if (soil.every((m) => m.parameter !== 'ph')) gaps.push('No soil pH recorded.');
        if (soil.every((m) => m.parameter !== 'organic_carbon_g_kg')) gaps.push('No organic carbon recorded — carbon trend cannot be checked.');
        if (soil.every((m) => m.parameter !== 'phosphorus_mg_kg')) gaps.push('No available phosphorus recorded.');
    }
    if (!climateLog?.summary) gaps.push('No NASA POWER period stored for this field.');
    if (field?.irrigation === 'unknown' || !field?.irrigation) gaps.push('Irrigation not recorded; water balance assumed rainfed.');
    gaps.push('GPM IMERG (precipitation), SMAP (soil moisture) and Landsat (imagery) are declared in the dataset registry but not connected: the first two need a NASA Earthdata token, the third needs an imagery pipeline.');
    gaps.forEach((g) => text(`• ${g}`, { size: 8, color: MUTED, gap: 2 }));

    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p += 1) {
        doc.setPage(p);
        doc.setDrawColor(RULE[0], RULE[1], RULE[2]);
        doc.setLineWidth(0.6);
        doc.line(M, pageHeight - 42, pageWidth - M, pageHeight - 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.4);
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text('Axumite Tech · decision support, not a substitute for local agronomic advice', M, pageHeight - 30);
        doc.text(`${p} / ${pages}`, pageWidth - M, pageHeight - 30, { align: 'right' });
    }

    return doc;
}