import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Percent, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AreaChart } from "@/components/ui/area-chart";

type Period = "current" | "last" | "quarter" | "all";

const PERIODS: { value: Period; label: string }[] = [
    { value: "current", label: "This Month" },
    { value: "last", label: "Last Month" },
    { value: "quarter", label: "Last 3 Months" },
    { value: "all", label: "All Time" },
];

function formatMonth(ym: string): string {
    if (!ym) return "";
    const [year, month] = ym.split("-");
    if (!year || !month) return ym;
    return new Date(parseInt(year), parseInt(month) - 1, 1)
        .toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function OwnerRevenue() {
    const [period, setPeriod] = useState<Period>("all");
    const [tab, setTab] = useState<"monthly" | "aircraft">("monthly");

    const { data: revenue, isLoading } = useQuery<any>({
        queryKey: ["/api/owner/revenue", period],
        queryFn: async () => {
            const res = await fetch(`/api/owner/revenue?period=${period}`, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to load revenue");
            return res.json();
        },
    });

    if (isLoading) {
        return (
            <div className="p-10 max-w-7xl mx-auto space-y-8">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-32 rounded-2xl" />
                <Skeleton className="h-[400px] rounded-2xl" />
            </div>
        );
    }

    const summary = revenue?.summary || { totalGross: 0, platformFee: 0, totalNet: 0 };
    const monthlyBreakdown = revenue?.monthlyBreakdown || [];
    const byAircraft = revenue?.byAircraft || [];

    // Aggregate monthly breakdown rows by month for the chart
    const chartDataMap = new Map<string, { month: string; gross: number; net: number }>();
    monthlyBreakdown.forEach((row: any) => {
        if (!row.month) return;
        if (!chartDataMap.has(row.month)) {
            chartDataMap.set(row.month, { month: row.month, gross: 0, net: 0 });
        }
        const entry = chartDataMap.get(row.month)!;
        entry.gross += row.gross || 0;
        entry.net += row.net || 0;
    });
    const chartData = Array.from(chartDataMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    return (
        <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-[#1e293b] tracking-tight">Revenue & Earnings</h1>
                    <p className="text-[#64748b] font-medium">Track your fleet earnings and platform fees.</p>
                </div>
                <div className="flex items-center gap-1 bg-white rounded-xl border border-[#f1f5f9] p-1 shadow-sm">
                    {PERIODS.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => setPeriod(value)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                                period === value ? "bg-[#007AFF] text-white shadow-sm" : "text-[#64748b] hover:bg-[#f8fafc]"
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-2xl border-[#f1f5f9] shadow-sm bg-white p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-[#007AFF]" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">Total Gross</p>
                            <p className="text-2xl font-black text-[#1e293b]">{formatCurrency(summary.totalGross)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="rounded-2xl border-[#f1f5f9] shadow-sm bg-white p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center">
                            <Percent className="h-6 w-6 text-red-500" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">Platform Fee (10%)</p>
                            <p className="text-2xl font-black text-red-500">{formatCurrency(summary.platformFee)}</p>
                        </div>
                    </div>
                </Card>
                <Card className="rounded-2xl border-[#f1f5f9] shadow-sm bg-white p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-[#10b981]" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">Your Net Revenue</p>
                            <p className="text-2xl font-black text-[#10b981]">{formatCurrency(summary.totalNet)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Earnings Trend Chart */}
            {chartData.length > 0 && (
                <Card className="rounded-2xl border-[#f1f5f9] shadow-sm bg-white overflow-hidden">
                    <CardHeader className="pb-0 pt-6 px-6">
                        <CardTitle className="text-xl font-bold text-[#1e293b]">Earnings Trend</CardTitle>
                        <CardDescription className="text-sm font-medium text-[#64748b]">Monthly gross vs. net revenue for your fleet</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[280px] w-full mt-4">
                            <AreaChart
                                data={chartData}
                                lines={[
                                    { dataKey: 'gross', color: '#3498db', label: 'Gross Revenue', gradientId: 'colorGross' },
                                    { dataKey: 'net', color: '#10b981', label: 'Net Revenue', gradientId: 'colorNet' },
                                ]}
                                height={280}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tab Switch */}
            <div className="flex items-center gap-1 bg-[#f8fafc] rounded-xl p-1 w-fit border border-[#f1f5f9]">
                <button
                    onClick={() => setTab("monthly")}
                    className={cn("px-5 py-2 rounded-lg text-xs font-bold transition-all", tab === "monthly" ? "bg-white shadow-sm text-[#1e293b]" : "text-[#64748b]")}
                >
                    Monthly Breakdown
                </button>
                <button
                    onClick={() => setTab("aircraft")}
                    className={cn("px-5 py-2 rounded-lg text-xs font-bold transition-all", tab === "aircraft" ? "bg-white shadow-sm text-[#1e293b]" : "text-[#64748b]")}
                >
                    By Aircraft
                </button>
            </div>

            {/* Table */}
            <Card className="rounded-2xl border-[#f1f5f9] shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-[#f8fafc]/50">
                                <TableRow className="hover:bg-transparent border-b border-[#f1f5f9]">
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12">
                                        {tab === "monthly" ? "Month" : "Aircraft"}
                                    </TableHead>
                                    {tab === "monthly" && (
                                        <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12">Aircraft</TableHead>
                                    )}
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Hours</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Gross</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Platform Fee</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Your Net</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tab === "monthly" ? (
                                    monthlyBreakdown.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-16 text-center">
                                                <BarChart3 className="h-12 w-12 text-[#e2e8f0] mx-auto mb-3" />
                                                <p className="text-sm font-bold text-[#1e293b]">No revenue data for this period</p>
                                                <p className="text-xs text-[#94a3b8] mt-1">Revenue will appear after flight hours are logged and invoiced.</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        monthlyBreakdown.map((row: any, i: number) => (
                                            <TableRow key={i} className="hover:bg-[#fcfdfe] border-b border-[#f8fafc]">
                                                <TableCell className="px-6 py-4 font-bold text-[#1e293b]">{formatMonth(row.month)}</TableCell>
                                                <TableCell className="px-6 py-4 font-bold text-[#1e293b]">{row.aircraft || "—"}</TableCell>
                                                <TableCell className="px-6 py-4 text-center font-bold text-[#1e293b]">{row.hours} hrs</TableCell>
                                                <TableCell className="px-6 py-4 text-center font-bold text-[#1e293b]">{formatCurrency(row.gross)}</TableCell>
                                                <TableCell className="px-6 py-4 text-center font-bold text-red-500">{formatCurrency(row.fee || 0)}</TableCell>
                                                <TableCell className="px-6 py-4 text-center font-black text-[#10b981]">{formatCurrency(row.net)}</TableCell>
                                            </TableRow>
                                        ))
                                    )
                                ) : (
                                    byAircraft.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-16 text-center">
                                                <BarChart3 className="h-12 w-12 text-[#e2e8f0] mx-auto mb-3" />
                                                <p className="text-sm font-bold text-[#1e293b]">No aircraft data</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        byAircraft.map((row: any, i: number) => (
                                            <TableRow key={i} className="hover:bg-[#fcfdfe] border-b border-[#f8fafc]">
                                                <TableCell className="px-6 py-4 font-bold text-[#1e293b]">{row.registration}</TableCell>
                                                <TableCell className="px-6 py-4 text-center font-bold text-[#1e293b]">{row.totalHours} hrs</TableCell>
                                                <TableCell className="px-6 py-4 text-center font-bold text-[#1e293b]">{formatCurrency(row.totalGross)}</TableCell>
                                                <TableCell className="px-6 py-4 text-center font-bold text-red-500">{formatCurrency(row.totalFee || 0)}</TableCell>
                                                <TableCell className="px-6 py-4 text-center font-black text-[#10b981]">{formatCurrency(row.totalNet)}</TableCell>
                                            </TableRow>
                                        ))
                                    )
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
