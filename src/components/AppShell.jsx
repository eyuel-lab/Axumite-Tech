import { Link, Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import AppNav from '@/components/AppNav';

function Wordmark() {
    return (
        <Link to="/" className="block px-6 pb-6 pt-7">
            <span className="font-display text-2xl tracking-[0.18em] text-forest-foreground">Axumite Tech</span>
            <span className="mt-2.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-forest-foreground/55">
                <span className="h-px w-5 bg-gold" />
                NASA Field Shift
            </span>
        </Link>
    );
}

export default function AppShell() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-background">
            <aside className="hidden border-r border-sidebar-border bg-forest text-forest-foreground lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
                <Wordmark />
                <AppNav />
                <div className="mt-auto border-t border-sidebar-border px-4 py-4">
                    <p className="truncate text-xs font-medium text-forest-foreground/85">{user?.full_name || user?.email}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-forest-foreground/45">
                        {user?.role === 'admin' ? 'Administrator' : 'Farmer account'}
                    </p>
                    <button
                        onClick={() => logout()}
                        className="mt-3 flex items-center gap-2 text-xs text-forest-foreground/55 transition-colors hover:text-gold"
                    >
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                    </button>
                </div>
            </aside>

            <header className="sticky top-0 z-30 border-b border-sidebar-border bg-forest px-5 pb-1 pt-4 text-forest-foreground lg:hidden">
                <div className="flex items-baseline justify-between">
                    <Link to="/" className="font-display text-lg tracking-[0.18em]">Axumite Tech</Link>
                    <span className="text-[9px] uppercase tracking-[0.18em] text-forest-foreground/50">Field Shift</span>
                </div>
                <div className="mt-3">
                    <AppNav variant="bar" />
                </div>
            </header>

            <div className="lg:pl-64">
                <main className="mx-auto max-w-[1180px] px-5 py-8 lg:px-10 lg:py-12">
                    <Outlet />
                </main>
                <footer className="mx-auto max-w-[1180px] border-t border-border/70 px-5 py-6 text-[11px] leading-relaxed text-muted-foreground lg:px-10">
                    Axumite Tech is a decision-support tool. It compares evidence and explains trade-offs; it does not guarantee yields,
                    income, or future soil conditions. Agronomic decisions remain with the farmer and their extension advisor.
                </footer>
            </div>
        </div>
    );
}