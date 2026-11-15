import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PencilRuler, Undo2, Trash2 } from 'lucide-react';
import BoundaryMap from '@/components/field/BoundaryMap';
import { formatHectares, polygonAreaHectares, validateBoundary } from '@/lib/geo';

export default function FieldBoundaryEditor({ points, setPoints, drawing, setDrawing, manualArea, setManualArea }) {
    const area = polygonAreaHectares(points);
    const check = validateBoundary(points);

    const addPoint = (lat, lng) => {
        setPoints((prev) => [...prev, { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) }]);
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <Label>Field boundary</Label>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                        The polygon decides the area. The centre point alone is never treated as the boundary.
                    </p>
                </div>
                <div className="flex gap-1.5">
                    <Button
                        type="button"
                        size="sm"
                        variant={drawing ? 'default' : 'outline'}
                        onClick={() => setDrawing(!drawing)}
                    >
                        <PencilRuler className="mr-1.5 h-3.5 w-3.5" />
                        {drawing ? 'Finish drawing' : 'Draw boundary'}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!points.length}
                        onClick={() => setPoints((prev) => prev.slice(0, -1))}
                    >
                        <Undo2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!points.length}
                        onClick={() => setPoints([])}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            <div className="mt-3">
                <BoundaryMap points={points} drawing={drawing} onAddPoint={addPoint} />
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className={check.ok ? 'text-primary' : 'text-muted-foreground'}>
                    {check.ok ? check.message : check.message}
                    {drawing && !check.ok ? ' · Click the map to place vertices.' : ''}
                </span>
                <span className="text-muted-foreground">
                    {points.length} {points.length === 1 ? 'vertex' : 'vertices'}
                </span>
            </div>

            {area ? (
                <div className="mt-2 rounded border border-border bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
                    Computed from the polygon: <span className="figure text-foreground">{formatHectares(area)}</span> — stored as
                    the field area with the source marked as computed geometry.
                </div>
            ) : (
                <div className="mt-2">
                    <Label htmlFor="manual-area" className="text-xs">
                        Area (hectares) — manual entry, used until a boundary is drawn
                    </Label>
                    <Input
                        id="manual-area"
                        type="number"
                        min="0"
                        step="0.01"
                        value={manualArea}
                        onChange={(e) => setManualArea(e.target.value)}
                        placeholder="e.g. 2.4"
                        className="mt-1.5"
                    />
                </div>
            )}
        </div>
    );
}