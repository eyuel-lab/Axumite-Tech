import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function Resizer() {
    const map = useMap();
    useEffect(() => {
        const t = setTimeout(() => map.invalidateSize(), 150);
        return () => clearTimeout(t);
    }, [map]);
    return null;
}

function ClickCapture({ onAdd }) {
    useMapEvents({
        click(e) {
            onAdd(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function BoundaryMap({ points = [], drawing = false, onAddPoint, center, height = 'h-[300px]' }) {
    const first = points[0];
    const initialCenter = first
        ? [first.lat, first.lng]
        : center && Number.isFinite(center.lat)
            ? [center.lat, center.lng]
            : [9.03, 38.74];
    const initialZoom = points.length || center ? 13 : 6;
    const positions = points.map((p) => [p.lat, p.lng]);

    return (
        <div className={`${height} w-full overflow-hidden rounded-md border border-border ${drawing ? 'cursor-crosshair' : ''}`}>
            <MapContainer
                center={initialCenter}
                zoom={initialZoom}
                scrollWheelZoom={false}
                className="h-full w-full"
                attributionControl
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    maxZoom={19}
                />
                <Resizer />
                {drawing && <ClickCapture onAdd={onAddPoint} />}
                {positions.length >= 3 ? (
                    <Polygon positions={positions} pathOptions={{ color: '#1E4D3B', weight: 2, fillOpacity: 0.22 }} />
                ) : positions.length >= 2 ? (
                    <Polyline positions={positions} pathOptions={{ color: '#1E4D3B', weight: 2, dashArray: '5 4' }} />
                ) : null}
                {points.map((p, i) => (
                    <CircleMarker
                        key={`${p.lat}-${p.lng}-${i}`}
                        center={[p.lat, p.lng]}
                        radius={4}
                        pathOptions={{ color: '#B08D4F', fillColor: '#B08D4F', fillOpacity: 1, weight: 2 }}
                    />
                ))}
            </MapContainer>
        </div>
    );
}