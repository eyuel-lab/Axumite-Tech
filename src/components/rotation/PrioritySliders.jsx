import { Slider } from '@/components/ui/slider';
import { PRIORITIES } from '@/lib/rotationEngine';

export default function PrioritySliders({ weights, onChange }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {PRIORITIES.map((priority) => {
                const value = Number(weights[priority.weightField] ?? 3);
                return (
                    <div key={priority.key}>
                        <div className="flex items-baseline justify-between gap-2">
                            <p className="text-[11px] font-medium text-foreground">{priority.label}</p>
                            <span className="figure text-[11px] text-gold">{value}</span>
                        </div>
                        <Slider
                            className="mt-2"
                            value={[value]}
                            min={0}
                            max={5}
                            step={1}
                            onValueChange={([next]) => onChange(priority.weightField, next)}
                        />
                        <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">{priority.description}</p>
                    </div>
                );
            })}
        </div>
    );
}