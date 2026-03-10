import { Helmet } from "react-helmet";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/components/ui/stat-card";
import { AreaChart } from "@/components/ui/area-chart";
import { PaymentRow } from "@/components/ui/payment-row";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plane, Clock, DollarSign, AlertTriangle, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, getDaysDifference } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function PortalDashboard() {
    const { user } = useAuth();

    const { data: stats, isLoading: isStatsLoading } = useQuery<any>({
        queryKey: ["/api/portal/dashboard"],
    });

    const { data: payments, isLoading: isPaymentsLoading } = useQuery<any[]>({
        queryKey: ["/api/portal/payments"],
    });

    const { data: aircraft } = useQuery<any[]>({
        queryKey: ["/api/portal/aircraft"],
    });

    if (isStatsLoading || isPaymentsLoading) {
        return (
            <div className="p-8 space-y-8 max-w-7xl mx-auto">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Skeleton className="lg:col-span-2 h-[400px] rounded-2xl" />
                    <Skeleton className="h-[400px] rounded-2xl" />
                </div>
            </div>
        );
    }

    const recentPayments = payments?.slice(0, 5) || [];

    const hasNoData = !isStatsLoading && !isPaymentsLoading && (!aircraft || aircraft.length === 0) && (!payments || payments.length === 0);

    return (
        <>
        <Helmet>
            <title>Dashboard — AeroLease Wise</title>
        </Helmet>
        <div className="p-10 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl font-bold text-[#1C1C1E] tracking-tight">School Operations</h1>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: "#007AFF" }}>Flight School Portal</span>
                    </div>
                    <p className="text-[#8E8E93] text-[15px] font-medium tracking-tight">Hello, {user?.firstName}. Here's your fleet's status today.</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="outline" className="rounded-xl border-black/[0.05] bg-white h-11 px-6 font-bold text-[#1C1C1E] shadow-sm hover:bg-black/[0.02] transition-all" asChild>
                        <Link href="/portal/payments">View Invoices</Link>
                    </Button>
                    <Button className="rounded-xl bg-[#007AFF] hover:bg-[#007AFFee] h-11 px-6 text-white font-bold shadow-[0_4px_12px_rgba(0,122,255,0.25)] hover:shadow-[0_6px_16px_rgba(0,122,255,0.35)] transition-all" asChild>
                        <Link href="/portal/hour-logging">Log Flight Hours</Link>
                    </Button>
                </div>
            </div>

            {hasNoData ? (
                <div className="bg-white rounded-2xl border border-[#f1f5f9] shadow-sm p-12 text-center">
                    <div className="w-16 h-16 rounded-[24px] bg-[#f8fafc] border border-[#f1f5f9] flex items-center justify-center mx-auto mb-4">
                        <Plane className="h-8 w-8 text-[#C7C7CC]" />
                    </div>
                    <p className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">No fleet data yet</p>
                    <p className="text-[14px] text-[#8E8E93] mt-2 font-medium max-w-sm mx-auto">Your fleet access will appear here once your lease is configured. Contact your account manager to get started.</p>
                </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
                <StatsCard
                    title="Hours Logged"
                    value={stats?.hoursThisMonth || 0}
                    subtitle="Monthly quota"
                    icon={Clock}
                    color="blue"
                />
                <StatsCard
                    title="Active Aircraft"
                    value={stats?.activeAircraft || 0}
                    subtitle="Currently leased"
                    icon={Plane}
                    color="emerald"
                />
                <StatsCard
                    title="Last Payment"
                    value={stats?.lastPaymentAmount || 0}
                    subtitle="Recent activity"
                    icon={DollarSign}
                    color="violet"
                    isCurrency
                />
                <StatsCard
                    title="Total Balance"
                    value={stats?.outstandingBalance || 0}
                    subtitle="Payable amount"
                    icon={DollarSign}
                    color="rose"
                    isCurrency
                />
            </div>

            {/* Active Leases Summary */}
            {aircraft && aircraft.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Active Leases</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {aircraft.map((ac: any) => {
                            const daysLeft = ac.currentLease?.endDate ? getDaysDifference(ac.currentLease.endDate) : null;
                            return (
                                <Card key={ac.id} className="rounded-2xl border border-black/[0.04] bg-white shadow-sm hover:shadow-md transition-all">
                                    <CardContent className="p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-[15px] font-bold text-[#1C1C1E] tracking-tight">{ac.registration}</p>
                                                <p className="text-[12px] text-[#8E8E93] font-medium">{ac.make} {ac.model}</p>
                                            </div>
                                            <Badge className="bg-[#ecfdf5] text-[#10b981] border-[#d1fae5] text-[10px] font-bold px-2 py-0.5 rounded-full">Active</Badge>
                                        </div>
                                        {daysLeft !== null && daysLeft <= 60 && (
                                            <div className={`flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-lg ${daysLeft <= 15 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                                <AlertTriangle className="h-3 w-3" />
                                                {daysLeft <= 15 ? `URGENT: Expires in ${daysLeft} days` : `Expires in ${daysLeft} days`}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                                            <div>
                                                <p className="text-[#A2A2A7] font-medium">Rate</p>
                                                <p className="text-[#1C1C1E] font-bold">${ac.currentLease?.hourlyRate}/hr</p>
                                            </div>
                                            <div>
                                                <p className="text-[#A2A2A7] font-medium">Expires</p>
                                                <p className="text-[#1C1C1E] font-bold">{ac.currentLease?.endDate ? formatDate(ac.currentLease.endDate) : 'N/A'}</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="w-full text-[#007AFF] font-bold text-[12px] rounded-xl hover:bg-blue-50 h-8" asChild>
                                            <Link href={`/portal/hour-logging?aircraftId=${ac.id}`}>
                                                Log Hours <ChevronRight className="h-3 w-3 ml-1" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <Card className="lg:col-span-2 rounded-[24px] border border-black/[0.04] bg-white shadow-sm hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)] transition-all duration-500 overflow-hidden">
                    <CardHeader className="pb-0 pt-8 px-8 border-b border-black/[0.02]">
                        <div className="pb-6">
                            <CardTitle className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Activity Trend</CardTitle>
                            <CardDescription className="text-[13px] font-medium text-[#8E8E93] mt-1 tracking-tight">Historical fleet utilization across all leased assets</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="h-[340px] w-full mt-2">
                            {stats?.byMonth && stats.byMonth.length > 0 ? (
                                <AreaChart
                                    data={stats.byMonth}
                                    lines={[
                                        { dataKey: 'hours', color: '#007AFF', label: 'Flight Hours', gradientId: 'colorHours' },
                                    ]}
                                    height={340}
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                                    <div className="w-16 h-16 rounded-[24px] bg-black/[0.02] flex items-center justify-center mb-4 border border-black/[0.03]">
                                        <Clock className="h-7 w-7 text-[#C7C7CC]" />
                                    </div>
                                    <p className="text-[15px] font-bold text-[#1C1C1E] tracking-tight">Telemetry Data Pending</p>
                                    <p className="text-[13px] text-[#A2A2A7] mt-1 font-medium max-w-[200px]">Utilization reports will appear here after flight logs are verified.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-[24px] border border-black/[0.04] bg-white shadow-sm hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)] transition-all duration-500 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-6 pt-8 px-8 border-b border-black/[0.02]">
                        <div className="space-y-1">
                            <CardTitle className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Recent Billing</CardTitle>
                            <CardDescription className="text-[13px] font-medium text-[#8E8E93] tracking-tight">Monthly statement overview</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="text-[#007AFF] font-bold text-[12px] tracking-tight px-3 rounded-full hover:bg-[#007AFF08]" asChild>
                            <Link href="/portal/payments">See All</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-8 px-6">
                        <div className="space-y-5">
                            {recentPayments.length > 0 ? (
                                recentPayments.map(p => <PaymentRow key={p.id} payment={p} />)
                            ) : (
                                <div className="text-center py-16">
                                    <div className="bg-black/[0.02] h-16 w-16 rounded-[24px] border border-black/[0.03] flex items-center justify-center mx-auto mb-4">
                                        <DollarSign className="h-8 w-8 text-[#C7C7CC]" />
                                    </div>
                                    <p className="text-[15px] font-bold text-[#1C1C1E] tracking-tight">Account Current</p>
                                    <p className="text-[12px] text-[#A2A2A7] mt-1 font-medium">No pending invoices for this period.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
        </>
    );
}
