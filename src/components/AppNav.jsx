import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Sprout,
    MapPinned,
    Satellite,
    FlaskConical,
    Wheat,
    Repeat2,
    Bot,
    FileText,
    Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const MODULES = [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/farms', label: 'My Farms', icon: Sprout },
    { to: '/fields', label: 'Field Intelligence', icon: MapPinned },
    { to: '/nasa', label: 'NASA Earth Monitor', icon: Satellite },
    { to: '/soil', label: 'Soil Intelligence', icon: FlaskConical },
    { to: '/crops', label: 'Crop Library', icon: Wheat },
    { to: '/rotations', label: 'Rotation Simulator', icon: Repeat2 },
    { to: '/assistant', label: 'AI Agronomist', icon: Bot },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppNav({ variant = 'sidebar' }) {
    if (variant === 'bar') {
        return (
            <nav className="flex gap-1 overflow-x-auto pb-2">
                {MODULES.map(({ to, label, icon: Icon, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            cn(
                                'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                                isActive
                                    ? 'bg-forest-foreground/15 text-forest-foreground'
                                    : 'text-forest-foreground/65 hover:text-forest-foreground'
                            )
                        }
                    >
                        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {label}
                    </NavLink>
                ))}
            </nav>
        );
    }

    return (
        <nav className="mt-2 flex flex-col gap-0.5 px-3">
            {MODULES.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                        cn(
                            'group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                            isActive
                                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                                : 'text-forest-foreground/65 hover:bg-sidebar-accent/60 hover:text-forest-foreground'
                        )
                    }
                >
                    {({ isActive }) => (
                        <>
                            <span
                                className={cn(
                                    'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gold transition-opacity',
                                    isActive ? 'opacity-100' : 'opacity-0'
                                )}
                            />
                            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                            <span className="truncate">{label}</span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
}