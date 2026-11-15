export const CROP_GROUPS = [
    { value: 'cereal', label: 'Cereal' },
    { value: 'pulse', label: 'Pulse / legume' },
    { value: 'oilseed', label: 'Oilseed' },
    { value: 'root_tuber', label: 'Root & tuber' },
    { value: 'vegetable', label: 'Vegetable' },
    { value: 'forage', label: 'Forage' },
    { value: 'other', label: 'Other' },
];

export const RESIDUE_OPTIONS = [
    { value: 'low', label: 'Low residue' },
    { value: 'medium', label: 'Medium residue' },
    { value: 'high', label: 'High residue' },
];

export const COVER_OPTIONS = [
    { value: 'poor', label: 'Poor cover' },
    { value: 'moderate', label: 'Moderate cover' },
    { value: 'good', label: 'Good cover' },
];

export const DRAINAGE_OPTIONS = [
    { value: 'well_drained', label: 'Needs well-drained soil' },
    { value: 'moderate', label: 'Moderate drainage' },
    { value: 'tolerant_waterlogging', label: 'Tolerates waterlogging' },
];

export const FROST_OPTIONS = [
    { value: 'none', label: 'No frost tolerance' },
    { value: 'low', label: 'Low' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'high', label: 'High' },
];

export const SALINITY_OPTIONS = [
    { value: 'low', label: 'Low' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'high', label: 'High' },
];

export const CONFIDENCE_OPTIONS = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
];

export function labelOf(list, value, fallback = 'Not recorded') {
    return list.find((o) => o.value === value)?.label || fallback;
}