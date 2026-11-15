const EARTH_RADIUS_M = 6378137;

const toRad = (deg) => (deg * Math.PI) / 180;

export function isCoordinate(lat, lng) {
    return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180
    );
}

export function polygonAreaHectares(points) {
    if (!Array.isArray(points) || points.length < 3) return null;
    const n = points.length;
    let total = 0;
    for (let i = 0; i < n; i += 1) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        if (!isCoordinate(p1?.lat, p1?.lng) || !isCoordinate(p2?.lat, p2?.lng)) return null;
        total += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
    }
    const areaM2 = Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
    return areaM2 / 10000;
}

export function polygonCentroid(points) {
    if (!Array.isArray(points) || !points.length) return null;
    const valid = points.filter((p) => isCoordinate(p?.lat, p?.lng));
    if (!valid.length) return null;
    const lat = valid.reduce((sum, p) => sum + p.lat, 0) / valid.length;
    const lng = valid.reduce((sum, p) => sum + p.lng, 0) / valid.length;
    return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
}

export function validateBoundary(points) {
    if (!Array.isArray(points) || points.length === 0) {
        return { ok: false, message: 'No boundary drawn yet. Area will be taken from the manual entry.' };
    }
    if (points.length < 3) {
        return { ok: false, message: 'A boundary needs at least three vertices.' };
    }
    const invalid = points.find((p) => !isCoordinate(p?.lat, p?.lng));
    if (invalid) return { ok: false, message: 'Boundary contains an invalid coordinate.' };
    const area = polygonAreaHectares(points);
    if (!area || area < 0.005) {
        return { ok: false, message: 'Boundary encloses almost no area — check the vertices.' };
    }
    if (area > 100000) {
        return { ok: false, message: 'Boundary covers more than 100,000 hectares — check the vertices.' };
    }
    return { ok: true, message: `Boundary valid · ${area.toFixed(2)} ha` };
}

export function formatHectares(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
    if (value < 1) return `${(value * 10000).toLocaleString(undefined, { maximumFractionDigits: 0 })} m²`;
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`;
}

export function formatCoordinate(value, axis) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
    const hemi = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
    return `${Math.abs(value).toFixed(4)}° ${hemi}`;
}