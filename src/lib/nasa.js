export const DATASET_KEY = 'nasa_power';

export const DATA_CLASSES = {
  measured: {
    label: 'Measured',
    className: 'border-primary/25 bg-primary/10 text-primary',
    text: 'Laboratory analysis of your own sample.',
  },
  farmer: {
    label: 'Farmer-reported',
    className: 'border-sage/30 bg-sage/10 text-sage',
    text: 'Entered by you, not independently tested.',
  },
  regional: {
    label: 'Satellite / regional',
    className: 'border-gold/35 bg-gold-soft text-gold',
    text: 'Earth observation covering a wider area than one field.',
  },
  model: {
    label: 'Model-derived',
    className: 'border-border bg-muted text-muted-foreground',
    text: 'Computed by a model, not a direct measurement.',
  },
  missing: {
    label: 'Missing',
    className: 'border-dashed border-border text-muted-foreground',
    text: 'Not available. Never filled in with a guess.',
  },
};

export const SOIL_PARAMETERS = [
  { key: 'soil_texture', label: 'Soil texture', kind: 'text', unit: '' },
  { key: 'sand_pct', label: 'Sand', kind: 'number', unit: '%' },
  { key: 'silt_pct', label: 'Silt', kind: 'number', unit: '%' },
  { key: 'clay_pct', label: 'Clay', kind: 'number', unit: '%' },
  { key: 'ph', label: 'pH', kind: 'number', unit: 'pH' },
  { key: 'organic_carbon_g_kg', label: 'Organic carbon', kind: 'number', unit: 'g/kg' },
  { key: 'organic_matter_pct', label: 'Organic matter', kind: 'number', unit: '%' },
  { key: 'nitrogen_g_kg', label: 'Total nitrogen', kind: 'number', unit: 'g/kg' },
  { key: 'phosphorus_mg_kg', label: 'Available phosphorus', kind: 'number', unit: 'mg/kg' },
  { key: 'potassium_mg_kg', label: 'Exchangeable potassium', kind: 'number', unit: 'mg/kg' },
  { key: 'depth_cm', label: 'Effective soil depth', kind: 'number', unit: 'cm' },
  { key: 'water_holding_capacity_mm_m', label: 'Water-holding capacity', kind: 'number', unit: 'mm/m' },
  { key: 'salinity_ds_m', label: 'Salinity (EC)', kind: 'number', unit: 'dS/m' },
  { key: 'drainage_class', label: 'Drainage', kind: 'text', unit: '' },
];

export const PROVENANCE_OPTIONS = [
  { value: 'laboratory_measured', label: 'Laboratory measured', className: 'border-primary/25 bg-primary/10 text-primary' },
  { value: 'farmer_reported', label: 'Farmer reported', className: 'border-sage/30 bg-sage/10 text-sage' },
  {
    value: 'regional_satellite_estimate',
    label: 'Regional satellite estimate',
    className: 'border-gold/35 bg-gold-soft text-gold',
  },
  { value: 'model_derived', label: 'Model derived', className: 'border-border bg-muted text-muted-foreground' },
];

export function soilParameter(key) {
  return SOIL_PARAMETERS.find((p) => p.key === key) || { key, label: key, kind: 'number', unit: '' };
}

export function provenanceOption(value) {
  return PROVENANCE_OPTIONS.find((p) => p.value === value) || PROVENANCE_OPTIONS[1];
}

export const IRRIGATION_OPTIONS = [
  { value: 'rainfed', label: 'Rainfed only' },
  { value: 'supplemental', label: 'Supplemental irrigation' },
  { value: 'full_irrigation', label: 'Full irrigation' },
  { value: 'unknown', label: 'Unknown / not recorded' },
];

export function irrigationLabel(value) {
  return IRRIGATION_OPTIONS.find((o) => o.value === value)?.label || 'Not recorded';
}

export function formatNumber(value, digits = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function freshness(retrievedAt) {
  if (!retrievedAt) return { label: 'No retrieval yet', tone: 'text-muted-foreground' };
  const hours = (Date.now() - new Date(retrievedAt).getTime()) / 3600000;
  if (!Number.isFinite(hours)) return { label: 'Unknown', tone: 'text-muted-foreground' };
  if (hours < 24) return { label: 'Fresh (under 24 h)', tone: 'text-primary' };
  if (hours < 24 * 30) return { label: `Retrieved ${Math.round(hours / 24)} days ago`, tone: 'text-gold' };
  return { label: 'Stale — refetch advised', tone: 'text-clay' };
}