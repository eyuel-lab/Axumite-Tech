import { Link } from 'react-router-dom';
import { MapPin, Droplets, Sprout, ChevronRight } from 'lucide-react';
import { formatHectares, formatCoordinate } from '@/lib/geo';
import { irrigationLabel } from '@/lib/nasa';

export default function FieldCard({ field, farmName }) {
    const hasBoundary = Array.isArray(field.boundary) && field.boundary.length >= 3;
    return (
        <Link
            to={`/fields/${field.id}`}
            className="group flex flex-col justify-between rounded-md border border-border/80 bg-card px-4 py-4 transition-colors hover:border-primary/40"
        >
            <div>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-foreground">{field.name}</h3>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {farmName || field.admin_area || field.country || 'No farm assigned'}
                        </p>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>

                <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="figure text-xl text-foreground">
                        {field.area_hectares ? formatHectares(field.area_hectares) : '—'}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {field.area_source === 'computed_polygon' ? 'from boundary' : field.area_source === 'manual_entry' ? 'manual' : 'no area'}
                    </span>
                </div>
            </div>

            <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <p className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    {hasBoundary ? `${field.boundary.length} boundary vertices` : 'No boundary recorded'}
                    <span className="text-border">|</span>
                    {formatCoordinate(field.latitude, 'lat')}, {formatCoordinate(field.longitude, 'lng')}
                </p>
                <p className="flex items-center gap-1.5">
                    <Sprout className="h-3 w-3" />
                    {field.current_crop || 'No current crop recorded'}
                </p>
                <p className="flex items-center gap-1.5">
                    <Droplets className="h-3 w-3" />
                    {irrigationLabel(field.irrigation)}
                </p>
            </div>
        </Link>
    );
}