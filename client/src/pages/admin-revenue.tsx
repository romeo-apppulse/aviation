import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp, Users, Plane, Calendar, ArrowUpRight, Download, Filter, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stat-card";
import { AreaChart } from "@/components/ui/area-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { useModal } from "@/hooks/use-modal";
import { AircraftWithDetails } from "@shared/schema";
import AircraftDetailsModal from "@/components/aircraft/aircraft-details-modal";
import LesseeDetailDrawer from "@/components/lessees/lessee-detail-drawer";
import OwnerDetailDrawer from "@/components/owners/owner-detail-drawer";

function getMonthRange(timeframe: string): { startMonth: string; endMonth: string } {
    const now = new Date();
    const endMonth = now.toISOString().slice(0, 7);
    let startDate: Date;
    if (timeframe === "last3months") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (timeframe === "thisyear") {
        startDate = new Date(now.getFullYear(), 0, 1);
    } else {
        // last6months default
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    }
    const startMonth = startDate.toISOString().slice(0, 7);
    return { startMonth, endMonth };
}

export default function AdminRevenue() {
    const [timeframe, setTimeframe] = useState("last6months");
    const [breakdownTab, setBreakdownTab] = useState<"school" | "owner" | "aircraft">("school");
    const aircraftModal = useModal<AircraftWithDetails>();
    const [selectedLesseeId, setSelectedLesseeId] = useState<number>(0);
    const [lesseeDrawerOpen, setLesseeDrawerOpen] = useState(false);
    const [selectedOwnerId, setSelectedOwnerId] = useState<number>(0);
    const [ownerDrawerOpen, setOwnerDrawerOpen] = useState(false);

    const { startMonth, endMonth } = getMonthRange(timeframe);

    const { data: stats, isLoading } = useQuery<any>({
        queryKey: [`/api/admin/revenue?startMonth=${startMonth}&endMonth=${endMonth}`],
    });

    const { data: allAircraft } = useQuery<AircraftWithDetails[]>({
        queryKey: ["/api/aircraft"],
    });

    if (isLoading) {
        return <div className="p-8 max-w-7xl mx-auto space-y-8"><Skeleton className="h-[800px] w-full rounded-3xl" /></div>;
    }

    const { summary, byMonth, bySchool, byAircraft, byOwner } = stats || {
        summary: { totalGross: 0, totalCommission: 0, totalNet: 0 },
        byMonth: [],
        bySchool: [],
        byAircraft: [],
        byOwner: []
    };

    const handleExportReport = () => {
        const rows: string[] = [];
        rows.push("Revenue Report Export");
        rows.push(`Timeframe: ${timeframe}`);
        rows.push("");
        rows.push("Summary");
        rows.push(`Total Gross,${summary.totalGross}`);
        rows.push(`Total Commission,${summary.totalCommission}`);
        rows.push(`Total Net,${summary.totalNet}`);
        rows.push("");
        rows.push("By Month");
        rows.push("Month,Gross,Commission,Net");
        byMonth.forEach((m: any) => rows.push(`${m.month},${m.gross},${m.commission},${m.net}`));
        rows.push("");
        rows.push("By School");
        rows.push("Name,Gross,Commission,Net,Payments");
        bySchool.forEach((s: any) => rows.push(`${s.name},${s.gross},${s.commission},${s.net},${s.paymentCount}`));
        rows.push("");
        rows.push("By Aircraft");
        rows.push("Registration,Make,Model,Total Hours,Total Revenue");
        byAircraft.forEach((a: any) => rows.push(`${a.registration},${a.make},${a.model},${a.totalHours},${a.totalRevenue}`));
        rows.push("");
        rows.push("By Owner");
        rows.push("Name,Gross,Commission,Net,Aircraft Count");
        (byOwner || []).forEach((o: any) => rows.push(`${o.name},${o.gross},${o.commission},${o.net},${o.aircraftCount}`));

        const csv = rows.join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `revenue-report-${timeframe}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
        <Helmet>
            <title>Revenue Hub — AeroLease Wise</title>
        </Helmet>
        <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#1e293b] tracking-tight">Revenue Analytics</h1>
                    <p className="text-[#64748b] mt-1 font-medium">Global platform revenue and performance overview.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={timeframe} onValueChange={setTimeframe}>
                        <SelectTrigger className="w-40 h-11 rounded-xl border-[#e2e8f0] bg-white font-bold text-[#475569]">
                            <Calendar className="h-4 w-4 mr-2 text-[#94a3b8]" />
                            <SelectValue placeholder="Timeframe" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-[#e2e8f0] shadow-xl">
                            <SelectItem value="last3months" className="font-medium">Last 3 Months</SelectItem>
                            <SelectItem value="last6months" className="font-medium">Last 6 Months</SelectItem>
                            <SelectItem value="thisyear" className="font-medium">This Year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="h-11 rounded-xl border-[#e2e8f0] font-bold text-[#475569]" onClick={handleExportReport}>
                        <Download className="h-4 w-4 mr-2 text-[#94a3b8]" />
                        Export Report
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard
                    title="Gross Revenue"
                    value={summary.totalGross}
                    subtitle="Total billing"
                    icon={DollarSign}
                    color="blue"
                    isCurrency
                />
                <StatsCard
                    title="Platform Commission"
                    value={summary.totalCommission}
                    subtitle="Net earnings"
                    icon={TrendingUp}
                    color="emerald"
                    isCurrency
                />
                <StatsCard
                    title="Net to Owners"
                    value={summary.totalNet}
                    subtitle="Disbursed amount"
                    icon={ArrowUpRight}
                    color="indigo"
                    isCurrency
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 rounded-2xl border-[#f1f5f9] shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow duration-300">
                    <CardHeader className="pb-0 pt-6 px-6">
                        <CardTitle className="text-xl font-bold text-[#1e293b]">Revenue Growth</CardTitle>
                        <CardDescription className="text-sm font-medium text-[#64748b]">System-wide platform earnings trend</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[350px] w-full mt-4">
                            <AreaChart
                                data={byMonth}
                                lines={[
                                    { dataKey: 'gross', color: '#3498db', label: 'Gross Revenue', gradientId: 'colorGross' },
                                    { dataKey: 'commission', color: '#10b981', label: 'Commission', gradientId: 'colorComm' }
                                ]}
                                height={350}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-[#f1f5f9] shadow-sm overflow-hidden bg-white">
                    <CardHeader className="pb-3 border-b border-[#f8fafc]">
                        <CardTitle className="text-lg font-bold text-[#1e293b]">Revenue Breakdown</CardTitle>
                        <div className="flex items-center gap-1 bg-[#f8fafc] rounded-lg p-1 w-fit border border-[#f1f5f9] mt-2">
                            <button onClick={() => setBreakdownTab("school")} className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${breakdownTab === "school" ? "bg-white shadow-sm text-[#1e293b]" : "text-[#64748b]"}`}>By School</button>
                            <button onClick={() => setBreakdownTab("owner")} className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${breakdownTab === "owner" ? "bg-white shadow-sm text-[#1e293b]" : "text-[#64748b]"}`}>By Owner</button>
                            <button onClick={() => setBreakdownTab("aircraft")} className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${breakdownTab === "aircraft" ? "bg-white shadow-sm text-[#1e293b]" : "text-[#64748b]"}`}>By Aircraft</button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableBody>
                                {breakdownTab === "school" && (
                                    bySchool.length === 0 ? (
                                        <TableRow><TableCell className="py-16 text-center"><Users className="h-10 w-10 text-[#f1f5f9] mx-auto mb-2" /><p className="text-sm font-bold text-[#64748b]">No school data yet</p></TableCell></TableRow>
                                    ) : bySchool.slice(0, 6).map((school: any) => (
                                        <TableRow key={school.lesseeId} className="hover:bg-[#fcfdfe] border-b border-[#f8fafc]">
                                            <TableCell className="px-6 py-3">
                                                <span className="text-[13px] font-black text-brand hover:underline cursor-pointer" onClick={() => { if (school.lesseeId) { setSelectedLesseeId(school.lesseeId); setLesseeDrawerOpen(true); } }}>{school.name}</span>
                                                <p className="text-[10px] text-[#94a3b8] font-bold">{school.paymentCount} payments</p>
                                            </TableCell>
                                            <TableCell className="px-6 py-3 text-right">
                                                <p className="text-[13px] font-black text-brand">{formatCurrency(school.commission)}</p>
                                                <p className="text-[10px] text-[#94a3b8] font-bold uppercase">Comm.</p>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                                {breakdownTab === "owner" && (
                                    (byOwner || []).length === 0 ? (
                                        <TableRow><TableCell className="py-16 text-center"><User className="h-10 w-10 text-[#f1f5f9] mx-auto mb-2" /><p className="text-sm font-bold text-[#64748b]">No owner data yet</p></TableCell></TableRow>
                                    ) : (byOwner || []).slice(0, 6).map((owner: any) => (
                                        <TableRow key={owner.ownerId} className="hover:bg-[#fcfdfe] border-b border-[#f8fafc]">
                                            <TableCell className="px-6 py-3">
                                                <span className="text-[13px] font-black text-[#1e293b] hover:underline cursor-pointer" onClick={() => { if (owner.ownerId) { setSelectedOwnerId(owner.ownerId); setOwnerDrawerOpen(true); } }}>{owner.name}</span>
                                                <p className="text-[10px] text-[#94a3b8] font-bold">{owner.aircraftCount} aircraft</p>
                                            </TableCell>
                                            <TableCell className="px-6 py-3 text-right">
                                                <p className="text-[13px] font-black text-[#10b981]">{formatCurrency(owner.net)}</p>
                                                <p className="text-[10px] text-[#94a3b8] font-bold uppercase">Net</p>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                                {breakdownTab === "aircraft" && (
                                    byAircraft.length === 0 ? (
                                        <TableRow><TableCell className="py-16 text-center"><Plane className="h-10 w-10 text-[#f1f5f9] mx-auto mb-2" /><p className="text-sm font-bold text-[#64748b]">No aircraft data yet</p></TableCell></TableRow>
                                    ) : byAircraft.slice(0, 6).map((ac: any) => (
                                        <TableRow key={ac.aircraftId} className="hover:bg-[#fcfdfe] border-b border-[#f8fafc]">
                                            <TableCell className="px-6 py-3">
                                                <span className="text-[13px] font-black text-brand hover:underline cursor-pointer" onClick={() => { const fullAc = allAircraft?.find(a => a.id === ac.aircraftId); if (fullAc) aircraftModal.openModal(fullAc); }}>{ac.registration}</span>
                                                <p className="text-[10px] text-[#94a3b8] font-bold">{ac.make} {ac.model}</p>
                                            </TableCell>
                                            <TableCell className="px-6 py-3 text-right">
                                                <p className="text-[13px] font-black text-[#1e293b]">{formatCurrency(ac.totalRevenue)}</p>
                                                <p className="text-[10px] text-[#94a3b8] font-bold uppercase">{ac.totalHours} hrs</p>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <Card className="rounded-2xl border-[#f1f5f9] shadow-sm overflow-hidden bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-[#f8fafc]">
                    <div>
                        <CardTitle className="text-lg font-bold text-[#1e293b]">Aircraft Performance</CardTitle>
                        <CardDescription className="text-xs font-medium text-[#64748b]">Utilization and revenue by asset</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-[#f8fafc]/50">
                            <TableRow className="hover:bg-transparent border-b border-[#f1f5f9]">
                                <TableHead className="px-6 h-12 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Registration</TableHead>
                                <TableHead className="px-6 h-12 text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Type</TableHead>
                                <TableHead className="px-6 h-12 text-[11px] font-bold text-[#64748b] uppercase tracking-wider text-center">Total Hours</TableHead>
                                <TableHead className="px-6 h-12 text-[11px] font-bold text-[#64748b] uppercase tracking-wider text-center">Revenue Generated</TableHead>
                                <TableHead className="px-6 h-12 text-[11px] font-bold text-[#64748b] uppercase tracking-wider text-right">Platform Fee</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {byAircraft.map((ac: any) => (
                                <TableRow key={ac.aircraftId} className="hover:bg-[#fcfdfe] transition-all border-b border-[#f8fafc]">
                                    <TableCell className="px-6 py-4">
                                        <div
                                            className="flex items-center gap-3 cursor-pointer group"
                                            onClick={() => {
                                                const fullAc = allAircraft?.find(a => a.id === ac.aircraftId);
                                                if (fullAc) aircraftModal.openModal(fullAc);
                                            }}
                                        >
                                            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                                <Plane className="h-4 w-4 text-blue-500" />
                                            </div>
                                            <span className="text-[14px] font-black text-brand group-hover:underline">{ac.registration}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-[13px] font-medium text-[#475569]">{ac.make} {ac.model}</TableCell>
                                    <TableCell className="px-6 py-4 text-center font-black text-[#1e293b]">{ac.totalHours} hrs</TableCell>
                                    <TableCell className="px-6 py-4 text-center font-black text-[#1e293b]">{formatCurrency(ac.totalRevenue)}</TableCell>
                                    <TableCell className="px-6 py-4 text-right font-black text-emerald-600">{formatCurrency(ac.totalRevenue * 0.1)}</TableCell>
                                </TableRow>
                            ))}
                            {byAircraft.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-20 text-center">
                                        <Plane className="h-12 w-12 text-[#f1f5f9] mx-auto mb-3" />
                                        <p className="text-sm font-bold text-[#64748b]">No aircraft performance data found</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {/* Entity Detail Modals/Drawers */}
            {aircraftModal.data && (
                <AircraftDetailsModal
                    isOpen={aircraftModal.isOpen}
                    onClose={aircraftModal.closeModal}
                    aircraft={aircraftModal.data}
                    onViewOwner={(ownerId) => { setSelectedOwnerId(ownerId); setOwnerDrawerOpen(true); }}
                    onViewLessee={(lesseeId) => { setSelectedLesseeId(lesseeId); setLesseeDrawerOpen(true); }}
                />
            )}
            <LesseeDetailDrawer
                isOpen={lesseeDrawerOpen}
                onClose={() => setLesseeDrawerOpen(false)}
                lesseeId={selectedLesseeId}
                onViewAircraft={(ac) => aircraftModal.openModal(ac as AircraftWithDetails)}
            />
            <OwnerDetailDrawer
                isOpen={ownerDrawerOpen}
                onClose={() => setOwnerDrawerOpen(false)}
                ownerId={selectedOwnerId}
                onViewAircraft={(ac) => aircraftModal.openModal(ac)}
            />
        </div>
        </>
    );
}
