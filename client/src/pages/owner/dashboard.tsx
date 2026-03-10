import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { StatsCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plane, DollarSign, TrendingUp, ChevronRight, BarChart3 } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

function formatPeriod(period: string): string {
    if (!period) return "";
    const [year, month] = period.split("-");
    if (!year || !month) return period;
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function OwnerDashboard() {
    const { user } = useAuth();

    const { data: stats, isLoading } = useQuery<any>({
        queryKey: ["/api/owner/dashboard"],
    });

    if (isLoading) {
        return (
            <div className="p-10 max-w-7xl mx-auto space-y-8">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
                <Skeleton className="h-[400px] rounded-2xl" />
            </div>
        );
    }

    const aircraft = stats?.aircraft || [];
    const recentPayments = stats?.recentPayments || [];

    return (
        <div className="p-10 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
            <div className="space-y-1.5">
                <h1 className="text-3xl font-bold text-[#1C1C1E] tracking-tight">Owner Dashboard</h1>
                <p className="text-[#8E8E93] text-[15px] font-medium tracking-tight">Welcome back, {user?.firstName}. Here is your portfolio overview.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
                <StatsCard
                    title="Total Aircraft"
                    value={stats?.totalAircraft || 0}
                    subtitle="Portfolio"
                    icon={Plane}
                    color="blue"
                />
                <StatsCard
                    title="Currently Leased"
                    value={stats?.leasedAircraft || 0}
                    subtitle="Active"
                    icon={Plane}
                    color="emerald"
                />
                <StatsCard
                    title="Gross Revenue"
                    value={stats?.grossRevenueThisMonth ?? 0}
                    subtitle="This month"
                    icon={DollarSign}
                    color="violet"
                    isCurrency
                />
                <StatsCard
                    title="Net Revenue"
                    value={stats?.netRevenueThisMonth ?? 0}
                    subtitle="After fees"
                    icon={TrendingUp}
                    color="emerald"
                    isCurrency
                />
            </div>

            {/* Portfolio Overview */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Portfolio Overview</h2>
                    <Button variant="ghost" size="sm" className="text-[#007AFF] font-bold text-[12px] rounded-full hover:bg-blue-50" asChild>
                        <Link href="/owner/aircraft">View All <ChevronRight className="h-3 w-3 ml-1" /></Link>
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aircraft.length === 0 ? (
                        <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-black/[0.04]">
                            <Plane className="h-16 w-16 text-[#e2e8f0] mx-auto mb-3" />
                            <p className="text-[15px] font-bold text-[#1C1C1E]">No aircraft in portfolio</p>
                            <p className="text-[13px] text-[#8E8E93] mt-1">Contact your account manager to add aircraft.</p>
                        </div>
                    ) : (
                        aircraft.map((ac: any) => (
                            <Link key={ac.id} href={`/owner/aircraft/${ac.id}`}>
                                <Card className="rounded-2xl border border-black/[0.04] bg-white shadow-sm hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[15px] font-bold text-[#1C1C1E] tracking-tight group-hover:text-[#007AFF] transition-colors">{ac.registration}</p>
                                                <p className="text-[12px] text-[#8E8E93] font-medium">{ac.make} {ac.model}</p>
                                            </div>
                                            <Badge className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", ac.currentLease ? "bg-[#ecfdf5] text-[#10b981] border-[#d1fae5]" : "bg-gray-100 text-gray-500 border-gray-200")}>
                                                {ac.currentLease ? "Leased" : "Available"}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                                            <div>
                                                <p className="text-[#A2A2A7] font-medium">Hours</p>
                                                <p className="text-[#1C1C1E] font-bold">{ac.hoursThisMonth || 0}</p>
                                            </div>
                                            <div>
                                                <p className="text-[#A2A2A7] font-medium">Gross</p>
                                                <p className="text-[#1C1C1E] font-bold">{formatCurrency(ac.grossThisMonth || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[#A2A2A7] font-medium">Net</p>
                                                <p className="text-[#10b981] font-bold">{formatCurrency(ac.netThisMonth || 0)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end">
                                            <ChevronRight className="h-4 w-4 text-[#cbd5e1] group-hover:text-[#007AFF] transition-colors" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))
                    )}
                </div>
            </div>

            {/* Recent Payments */}
            <Card className="rounded-[24px] border border-black/[0.04] bg-white shadow-sm overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-6 pt-8 px-8 border-b border-black/[0.02]">
                    <div className="space-y-1">
                        <CardTitle className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Recent Activity</CardTitle>
                        <CardDescription className="text-[13px] font-medium text-[#8E8E93] tracking-tight">Latest payments across your fleet</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[#007AFF] font-bold text-[12px] rounded-full hover:bg-blue-50" asChild>
                        <Link href="/owner/revenue">See All</Link>
                    </Button>
                </CardHeader>
                <CardContent className="p-8">
                    {recentPayments.length === 0 ? (
                        <div className="text-center py-12">
                            <BarChart3 className="h-12 w-12 text-[#e2e8f0] mx-auto mb-3" />
                            <p className="text-[15px] font-bold text-[#1C1C1E]">No recent activity</p>
                            <p className="text-[13px] text-[#8E8E93] mt-1">Payment activity will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentPayments.map((p: any) => (
                                <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-[#f8fafc] border border-black/[0.03]">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", p.status === "Paid" ? "bg-emerald-50" : "bg-amber-50")}>
                                            <DollarSign className={cn("h-5 w-5", p.status === "Paid" ? "text-emerald-500" : "text-amber-500")} />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-[#1C1C1E]">
                                                {p.aircraftRegistration || "Aircraft"} — {formatPeriod(p.period)}
                                            </p>
                                            <p className="text-[11px] text-[#8E8E93] font-medium">
                                                {p.lesseeName || "Flight School"} · {p.status}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={cn("text-[14px] font-black", p.status === "Paid" ? "text-[#10b981]" : "text-amber-500")}>
                                            {formatCurrency(p.netAmount || p.amount || 0)}
                                        </p>
                                        <p className="text-[10px] text-[#8E8E93] font-medium">
                                            {p.status === "Paid" ? `Paid ${formatDate(p.paidDate)}` : `Due ${formatDate(p.dueDate)}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
