import { useAuth } from '@/lib/AuthContext';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import ProvenanceLegend from '@/components/overview/ProvenanceLegend';

export default function Settings() {
    const { user, logout } = useAuth();

    return (
        <div>
            <PageHeader
                eyebrow="Account"
                title="Settings"
                description="Your account, the unit conventions used across PYRAVEX, and the limits of what this platform claims."
            />

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                    <h2 className="border-b border-border/60 pb-3 text-base text-foreground">Account</h2>
                    <dl className="mt-4 space-y-3 text-xs">
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">Name</dt>
                            <dd className="text-foreground">{user?.full_name || '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">Email</dt>
                            <dd className="truncate text-foreground">{user?.email}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">Access level</dt>
                            <dd className="text-foreground">{user?.role === 'admin' ? 'Administrator' : 'Farmer'}</dd>
                        </div>
                    </dl>
                    <Button variant="outline" size="sm" className="mt-5" onClick={() => logout()}>
                        <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign out
                    </Button>
                </section>

                <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                    <h2 className="border-b border-border/60 pb-3 text-base text-foreground">Units</h2>
                    <dl className="mt-4 space-y-3 text-xs">
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">Field area</dt>
                            <dd className="figure text-foreground">hectares (m² under 1 ha)</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">Precipitation</dt>
                            <dd className="figure text-foreground">mm / day</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">Temperature</dt>
                            <dd className="figure text-foreground">°C</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">Solar irradiance</dt>
                            <dd className="figure text-foreground">MJ / m² / day</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted-foreground">Humidity</dt>
                            <dd className="figure text-foreground">%</dd>
                        </div>
                    </dl>
                </section>

                <ProvenanceLegend />

                <section className="rounded-md border border-border/80 bg-card px-5 py-4">
                    <h2 className="border-b border-border/60 pb-3 text-base text-foreground">What PYRAVEX does not do</h2>
                    <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
                        <li>· It does not forecast weather. NASA POWER values here are historical reanalysis, not a forecast.</li>
                        <li>· It does not measure your soil. Values are only those you or a laboratory recorded.</li>
                        <li>· It never fills a missing satellite value with an estimate.</li>
                        <li>· It does not promise yields, income, or a specific future soil condition.</li>
                        <li>· Rotation scoring, when added, is relative decision support — not a validated prediction.</li>
                    </ul>
                </section>
            </div>
        </div>
    );
}