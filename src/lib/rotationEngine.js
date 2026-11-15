/**
 * Axumite Tech rotation evaluation engine.
 *
 * A transparent, rules-based index — not a calibrated simulation model. Every
 * number below is computed from stored data by a published formula, and every
 * assumption is listed in METHOD_NOTES so the screen can show its work.
 */

export const ENGINE_VERSION = 'rotation-index-1.0.0';

export const PRIORITIES = [
    {
        key: 'soil_health',
        label: 'Soil health & organic matter',
        weightField: 'weight_soil_health',
        description:
            'Residue returned, ground cover, deep-rooted crops and legume frequency, read against the organic carbon you measured.',
    },
    {
        key: 'nitrogen',
        label: 'Nitrogen supply',
        weightField: 'weight_nitrogen',
        description: 'Nitrogen fixed by the preceding legume, net of the next crop’s nitrogen demand.',
    },
    {
        key: 'water',
        label: 'Water balance & climate resilience',
        weightField: 'weight_water',
        description:
            'Seasonal crop water demand against effective rainfall and recorded irrigation, adjusted for dry spells, heat and frost.',
    },
    {
        key: 'pest',
        label: 'Pest & disease break',
        weightField: 'weight_pest',
        description: 'How far apart the same botanical family appears, plus the number of families in the sequence.',
    },
    {
        key: 'erosion',
        label: 'Erosion & soil cover',
        weightField: 'weight_erosion',
        description: 'Residue and canopy cover through the sequence, weighted by rainfall erosivity.',
    },
];

export const DEFAULT_WEIGHTS = {
    weight_soil_health: 3,
    weight_nitrogen: 3,
    weight_water: 3,
    weight_pest: 3,
    weight_erosion: 2,
};

export const METHOD_NOTES = [
    'Indices run 0–100 and are relative: they compare sequences for one field, they are not yields, soil-carbon forecasts or probabilities.',
    'Symbiotic nitrogen fixation is credited at 50 % of the published fixation range for the preceding legume, reflecting the fraction typically available to the following crop. The legume’s own season is charged its removal demand, so fixing a legume does not create credit twice.',
    'Effective rainfall is taken as 55 % of the period total from NASA POWER (runoff, evaporation and deep percolation removed). Rainfall is then divided evenly between the seasons modelled, and supplemental irrigation adds a flat 120 mm per season. Full irrigation is treated as non-limiting. These are conventions, not measurements.',
    'Water, heat and frost penalties use the NASA POWER period statistics shown on the field (longest dry spell, maximum daily temperature, cool days below 5 °C), which describe the recent period, not the future.',
    'Pest and disease risk counts the botanical family, because that is what soil-borne pathogens and residue-borne diseases follow. Same family in consecutive seasons subtracts 30 points, a one-season gap 18, a two-season gap 9.',
    'Erosion exposure is the average uncovered fraction of the season multiplied by a rainfall erosivity proxy (period total ÷ 1400 mm, held between 0.4 and 1.2). Slope is not recorded in Axumite Tech, so gradient is absent from this index.',
    'Organic carbon is read only from your own soil measurements. When none exists the soil health score is based on rotation structure alone and is flagged as unverifiable.',
    'Crop trait ranges in the library are indicative literature ranges, not local variety trials. Each crop carries its own confidence rating and source note.',
];

const RESIDUE = { low: 0.3, medium: 0.65, high: 1 };
const COVER = { poor: 0.3, moderate: 0.65, good: 1 };

const num = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const scale = (v, lo, hi) => clamp(((v - lo) / (hi - lo)) * 100, 0, 100);

const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);

export function ratingBand(score) {
    if (score === null || score === undefined) return { label: 'Not scored', tone: 'text-muted-foreground' };
    if (score >= 75) return { label: 'Strong', tone: 'text-primary' };
    if (score >= 60) return { label: 'Favourable', tone: 'text-primary' };
    if (score >= 45) return { label: 'Mixed', tone: 'text-gold' };
    return { label: 'Weak', tone: 'text-clay' };
}

export function buildCropIndex(crops = []) {
    const byId = new Map();
    const byName = new Map();
    crops.forEach((crop) => {
        if (crop.id) byId.set(crop.id, crop);
        if (crop.name) byName.set(String(crop.name).trim().toLowerCase(), crop);
    });
    return { byId, byName };
}

function resolveCrop(entry, index) {
    if (!entry) return null;
    if (entry.crop_id && index.byId.has(entry.crop_id)) return index.byId.get(entry.crop_id);
    if (entry.crop_name) return index.byName.get(String(entry.crop_name).trim().toLowerCase()) || null;
    return null;
}

const dateOf = (m) => new Date(m.sample_date || m.created_date || 0).getTime() || 0;

export function buildSoilProfile(measurements = []) {
    const sorted = [...measurements].sort((a, b) => dateOf(b) - dateOf(a));
    const winners = {};
    sorted.forEach((m) => {
        if (!m?.parameter) return;
        const isLab = m.provenance === 'laboratory_measured';
        const current = winners[m.parameter];
        if (!current) winners[m.parameter] = { record: m, isLab };
        else if (!current.isLab && isLab) winners[m.parameter] = { record: m, isLab };
    });
    const values = {};
    Object.entries(winners).forEach(([key, winner]) => {
        const m = winner.record;
        values[key] = {
            value: num(m.value),
            text: m.text_value || '',
            unit: m.unit || '',
            provenance: m.provenance || '',
            date: m.sample_date || m.created_date || null,
        };
    });
    return {
        values,
        ph: values.ph?.value ?? null,
        organic_carbon_g_kg: values.organic_carbon_g_kg?.value ?? null,
        phosphorus_mg_kg: values.phosphorus_mg_kg?.value ?? null,
        potassium_mg_kg: values.potassium_mg_kg?.value ?? null,
        nitrogen_g_kg: values.nitrogen_g_kg?.value ?? null,
        clay_pct: values.clay_pct?.value ?? null,
        salinity_ds_m: values.salinity_ds_m?.value ?? null,
        texture_text: values.soil_texture?.text || '',
        drainage_text: values.drainage_class?.text || '',
        count: measurements.length,
        laboratoryCount: measurements.filter((m) => m.provenance === 'laboratory_measured').length,
    };
}

function resolveWeights(weights = {}) {
    const entries = PRIORITIES.map((p) => {
        const raw = num(weights[p.weightField]);
        return { key: p.key, value: raw === null ? 3 : clamp(raw, 0, 5) };
    });
    const sum = entries.reduce((acc, e) => acc + e.value, 0);
    if (sum <= 0) {
        return { entries: entries.map((e) => ({ ...e, value: 1 })), sum: entries.length, equal: true };
    }
    return { entries, sum, equal: false };
}

/**
 * Evaluate one crop sequence for one field.
 */
export function evaluateSequence({ entries = [], crops = [], soil = {}, climate = null, field = {}, weights = {} }) {
    const index = buildCropIndex(crops);
    const resolvedWeights = resolveWeights(weights);
    const flags = [];
    const constraints = [];

    const seasonCount = entries.length;
    const years = Array.from(new Set(entries.map((e) => num(e.season_year)).filter((v) => v !== null)));
    const seasonsPerYear = years.length ? Math.max(1, seasonCount / years.length) : 1;
    if (!years.length && seasonCount) {
        flags.push('Season years are missing, so rainfall is divided evenly across the seasons modelled.');
    }

    const annualRain = num(climate?.precipitation_total_mm);
    const irrigation = field?.irrigation || 'unknown';
    const waterUnlimited = irrigation === 'full_irrigation';
    let availablePerSeason = null;
    if (annualRain !== null) {
        availablePerSeason = (annualRain * 0.55) / seasonsPerYear;
        if (irrigation === 'supplemental') availablePerSeason += 120;
    } else {
        flags.push('No NASA rainfall record for this field: the water pillar cannot be scored until data is retrieved.');
    }
    if (irrigation === 'unknown') {
        flags.push('Irrigation is not recorded for this field, so water balance is treated as fully rainfed.');
    }

    const rows = [];
    let pestBase = 100;
    const families = new Set();

    entries.forEach((entry, i) => {
        const crop = resolveCrop(entry, index);
        const previous = i > 0 ? resolveCrop(entries[i - 1], index) : null;
        const notes = [];
        const rowConstraints = [];

        const base = {
            index: i,
            crop_name: entry.crop_name || crop?.name || 'Unassigned',
            season_year: num(entry.season_year),
            season_label: entry.season_label || '',
            family: crop?.family || '',
            crop_group: crop?.crop_group || '',
            resolved: Boolean(crop),
        };

        if (!crop) {
            rows.push({
                ...base,
                metrics: null,
                notes: ['This crop is not in the library, so its traits are unknown and it is excluded from the scores.'],
                constraints: [],
            });
            return;
        }

        families.add(crop.family);

        // --- nitrogen -------------------------------------------------------
        const fixation = num(previous?.nitrogen_fixation_kg_ha) || 0;
        const nCredit = Math.round(fixation * 0.5);
        const nDemand = num(crop.nitrogen_demand_kg_ha);
        const nBalance = nDemand === null ? null : nCredit - nDemand;
        if (i === 0) notes.push('First season: no preceding crop recorded, so nitrogen credit starts at zero.');
        if (nCredit > 0) notes.push(`Previous ${previous.name} credited ${nCredit} kg N/ha (50 % of its fixation range).`);
        if (nBalance !== null && nBalance < -80) notes.push(`Nitrogen removal of ${Math.abs(nBalance)} kg N/ha is not covered by the preceding legume.`);

        // --- cover, residue, structure --------------------------------------
        const residue = RESIDUE[crop.residue_index] ?? 0.6;
        const cover = COVER[crop.soil_cover_index] ?? 0.6;
        const protection = 0.5 * residue + 0.5 * cover;
        let structure = protection;
        if ((num(crop.rooting_depth_cm) || 0) >= 90) structure += 0.06;
        if ((num(crop.nitrogen_fixation_kg_ha) || 0) > 0) structure += 0.04;
        structure = clamp(structure, 0, 1);

        // --- water and climate ----------------------------------------------
        const demand = num(crop.water_demand_mm);
        let waterRatio = null;
        if (waterUnlimited) waterRatio = 1.15;
        else if (availablePerSeason !== null && demand) waterRatio = availablePerSeason / demand;

        const heatLimit = num(crop.heat_tolerance_c);
        const observedMax = num(climate?.temp_max_c);
        const heatStress = Boolean(heatLimit && observedMax && observedMax > heatLimit);
        if (heatStress) {
            notes.push(`Period maximum ${observedMax} °C exceeds the ${heatLimit} °C usually tolerated.`);
        }
        const coolDays = num(climate?.frost_days_5c) || 0;
        const frostStress = coolDays > 0 && (crop.frost_tolerance === 'none' || crop.frost_tolerance === 'low');
        if (frostStress) notes.push(`${coolDays} days at or below 5 °C in the period; this crop has ${crop.frost_tolerance} frost tolerance.`);

        if (waterRatio !== null && waterRatio < 0.8) {
            notes.push(`Seasonal water supply covers about ${Math.round(waterRatio * 100)} % of this crop’s requirement.`);
        }

        // --- pest and disease break -----------------------------------------
        for (let back = 1; back <= 3 && i - back >= 0; back += 1) {
            const earlier = resolveCrop(entries[i - back], index);
            if (earlier && crop.family && earlier.family === crop.family) {
                const penalty = back === 1 ? 30 : back === 2 ? 18 : 9;
                pestBase -= penalty;
                notes.push(
                    back === 1
                        ? `${crop.family} in consecutive seasons — the shortest possible break.`
                        : `${crop.family} also grown ${back} seasons earlier — a ${back - 1}-season break.`
                );
                break;
            }
        }

        // --- constraints from measured soil ---------------------------------
        const ph = soil.ph;
        const phMin = num(crop.ph_min);
        const phMax = num(crop.ph_max);
        if (ph !== null && phMin !== null && phMax !== null && (ph < phMin || ph > phMax)) {
            rowConstraints.push(`Measured pH ${ph} is outside this crop’s ${phMin}–${phMax} range.`);
        }
        const pSoil = soil.phosphorus_mg_kg;
        const pDemand = num(crop.phosphorus_demand_kg_ha);
        if (pSoil !== null && pSoil < 10 && pDemand !== null && pDemand >= 20) {
            rowConstraints.push(`Available phosphorus ${pSoil} mg/kg is low for a crop removing about ${pDemand} kg P/ha.`);
        }
        const drainage = String(soil.drainage_text || '').toLowerCase();
        if (drainage.includes('poor') && crop.drainage_requirement === 'well_drained') {
            rowConstraints.push('Recorded drainage is poor and this crop needs well-drained soil.');
        }
        const salinity = soil.salinity_ds_m;
        if (salinity !== null && salinity > 2 && crop.salinity_tolerance === 'low') {
            rowConstraints.push(`Recorded salinity ${salinity} dS/m exceeds this crop’s low salinity tolerance.`);
        }

        rows.push({
            ...base,
            metrics: { nCredit, nDemand, nBalance, waterRatio, residue, cover, protection, structure, heatStress, frostStress },
            notes,
            constraints: rowConstraints,
        });
    });

    const scored = rows.filter((r) => r.metrics);
    rows.forEach((r) =>
        r.constraints.forEach((text) =>
            constraints.push({ season: `${r.crop_name}${r.season_year ? ` ${r.season_year}` : ''}`, text })
        )
    );

    if (!scored.length) {
        flags.push('No season in this sequence uses a crop from the library, so nothing can be scored yet.');
        return {
            engine_version: ENGINE_VERSION,
            rows,
            scores: { soil_health: null, nitrogen: null, water: null, pest: null, erosion: null, diversity: null, families: families.size },
            composite: null,
            band: ratingBand(null),
            flags,
            constraints,
            weights_used: resolvedWeights.entries,
        };
    }

    const protections = scored.map((r) => r.metrics.protection);
    const structures = scored.map((r) => r.metrics.structure);
    const nScores = scored.filter((r) => r.metrics.nBalance !== null).map((r) => scale(r.metrics.nBalance, -150, 40));
    const waterScores = scored.filter((r) => r.metrics.waterRatio !== null).map((r) => scale(r.metrics.waterRatio, 0.4, 1.1));

    // Soil health: rotation structure, tempered by measured organic carbon.
    const organicCarbon = soil.organic_carbon_g_kg;
    const carbonBaseline = organicCarbon === null ? null : clamp((organicCarbon - 5) / 20, 0, 1);
    const structureMean = mean(structures);
    let soilHealth = null;
    if (structureMean !== null) {
        if (carbonBaseline === null) {
            soilHealth = 100 * structureMean;
            flags.push(
                'No organic carbon measurement on this field: the soil health score reflects rotation structure only and cannot show whether carbon is actually building.'
            );
        } else {
            soilHealth = 100 * (0.6 * structureMean + 0.4 * carbonBaseline);
        }
    }

    const nitrogen = nScores.length ? mean(nScores) : null;
    if (nitrogen === null) flags.push('Nitrogen demand is missing for the crops in this sequence.');

    let water = waterScores.length ? mean(waterScores) : null;
    if (water !== null) {
        if (scored.some((r) => r.metrics.heatStress)) water -= 6;
        if (scored.some((r) => r.metrics.frostStress)) water -= 6;
        const drySpell = num(climate?.longest_dry_spell_days);
        if (drySpell !== null && drySpell > 21) {
            water -= Math.min(12, (drySpell - 21) * 0.7);
        }
        water = clamp(water, 0, 100);
    }

    const diversity = scale(families.size, 1, 4);
    const pest = clamp(0.85 * clamp(pestBase, 0, 100) + 0.15 * diversity, 0, 100);

    const exposure = mean(scored.map((r) => 1 - r.metrics.protection));
    const erosivity = annualRain === null ? 0.8 : clamp(annualRain / 1400, 0.4, 1.2);
    const erosionRisk = clamp((exposure * erosivity) / 1.2, 0, 1);
    const erosion = 100 * (1 - erosionRisk);
    if (annualRain === null) flags.push('Rainfall erosivity used a default value because no NASA record exists for this field.');

    const scores = {
        soil_health: Math.round(soilHealth),
        nitrogen: nitrogen === null ? null : Math.round(nitrogen),
        water: water === null ? null : Math.round(water),
        pest: Math.round(pest),
        erosion: Math.round(erosion),
        diversity: Math.round(diversity),
        families: families.size,
    };

    const available = resolvedWeights.entries.filter((w) => scores[w.key] !== null);
    const weightSum = available.reduce((a, w) => a + w.value, 0);
    const composite =
        weightSum > 0
            ? Math.round(available.reduce((acc, w) => acc + scores[w.key] * w.value, 0) / weightSum)
            : null;

    if (pestBase < 100) {
        const repeated = scored.filter((r, i) => i > 0 && scored[i - 1].family === r.family);
        if (repeated.length) {
            flags.push(
                `Same-family crops in consecutive seasons: ${repeated.map((r) => `${r.crop_name}${r.season_year ? ` ${r.season_year}` : ''}`).join(', ')}.`
            );
        }
    }

    return {
        engine_version: ENGINE_VERSION,
        rows,
        scores,
        composite,
        band: ratingBand(composite),
        flags,
        constraints,
        weights_used: resolvedWeights.entries,
        context: {
            seasons_per_year: Number(seasonsPerYear.toFixed(2)),
            annual_rain_mm: annualRain,
            available_per_season_mm: availablePerSeason === null ? null : Math.round(availablePerSeason),
            irrigation,
            organic_carbon_g_kg: organicCarbon,
            ph: soil.ph,
            phosphorus_mg_kg: soil.phosphorus_mg_kg,
            protection_mean: protections.length ? Number(mean(protections).toFixed(3)) : null,
        },
    };
}

/**
 * Rank sequences against each other for one field and one set of priorities.
 */
export function compareSequences(evaluations = []) {
    const scored = evaluations.filter((e) => e?.composite !== null && e?.composite !== undefined);
    const ranked = [...scored].sort((a, b) => b.composite - a.composite);
    const best = {};
    PRIORITIES.forEach((p) => {
        let top = null;
        scored.forEach((e) => {
            const value = e.scores?.[p.key];
            if (value === null || value === undefined) return;
            if (!top || value > top.value) top = { value, name: e.name, id: e.id };
        });
        best[p.key] = top;
    });
    return { ranked, best };
}