import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";

function formatMonth(ym: string): string {
    if (!ym) return "";
    const [year, month] = ym.split("-");
    if (!year || !month) return ym;
    return new Date(parseInt(year), parseInt(month) - 1, 1)
        .toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
import { Link } from "wouter";
import { Plane, ArrowLeft, Calendar, Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function OwnerAircraftDetail() {
    const [, params] = useRoute("/owner/aircraft/:id");
    const aircraftId = params?.id;

    const { data: aircraft, isLoading } = useQuery<any>({
        queryKey: [`/api/owner/aircraft/${aircraftId}`],
        enabled: !!aircraftId,
    });

    if (isLoading) {
        return (
            <div className="p-10 max-w-5xl mx-auto space-y-8">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-48 rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
                <Skeleton className="h-48 rounded-2xl" />
            </div>
        );
    }

    if (!aircraft) {
        return (
            <div className="p-10 max-w-5xl mx-auto text-center py-20">
                <Plane className="h-16 w-16 text-[#e2e8f0] mx-auto mb-4" />
                <h2 className="text-xl font-bold text-[#1e293b]">Aircraft not found</h2>
                <Button variant="outline" className="mt-4 rounded-xl" asChild>
                    <Link href="/owner/aircraft">Back to Fleet</Link>
                </Button>
            </div>
        );
    }

    const lease = aircraft.currentLease;
    const monthlyPerformance = aircraft.monthlyPerformance || [];
    const documents = aircraft.documents || [];

    return (
        <div className="p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <Button variant="ghost" className="text-[#007AFF] font-bold text-sm rounded-xl hover:bg-blue-50 -ml-3" asChild>
                <Link href="/owner/aircraft"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Fleet</Link>
            </Button>

            {/* Header */}
            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-72 h-48 rounded-2xl overflow-hidden bg-[#f8fafc] border border-[#f1f5f9]">
                    {aircraft.image ? (
                        <img src={aircraft.image} alt={aircraft.registration} className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center">
                            <Plane className="h-16 w-16 text-[#e2e8f0]" />
                        </div>
                    )}
                </div>
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-[#1e293b] tracking-tight">{aircraft.registration}</h1>
                        <Badge className={cn("px-3 py-1 rounded-full font-black text-xs", lease ? "bg-[#ecfdf5] text-[#10b981] border-[#d1fae5]" : "bg-gray-100 text-gray-500")}>
                            {lease ? "Leased" : "Available"}
                        </Badge>
                    </div>
                    <p className="text-[#64748b] font-bold text-lg">{aircraft.make} {aircraft.model} ({aircraft.year})</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mt-2">
                        {aircraft.totalTime != null && (
                            <div>
                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Total Time</p>
                                <p className="font-bold text-[#475569] mt-0.5">{aircraft.totalTime} hrs</p>
                            </div>
                        )}
                        {aircraft.engineType && (
                            <div>
                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Engine</p>
                                <p className="font-bold text-[#475569] mt-0.5">{aircraft.engineType}</p>
                            </div>
                        )}
                        {aircraft.avionics && (
                            <div>
                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Avionics</p>
                                <p className="font-bold text-[#475569] mt-0.5">{aircraft.avionics}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Status</p>
                            <p className="font-bold text-[#475569] mt-0.5">{aircraft.status || "—"}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Current Lease */}
            {lease && (
                <Card className="rounded-2xl border-[#f1f5f9] shadow-sm bg-white">
                    <CardHeader className="pb-4 border-b border-[#f8fafc]">
                        <CardTitle className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Current Lease</CardTitle>
                        <CardDescription className="text-[13px] text-[#8E8E93] font-medium">Read-only lease information</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Leased To</p>
                                <p className="text-sm font-bold text-[#1e293b]">{aircraft.lesseeName || "N/A"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Lease Term</p>
                                <p className="text-sm font-bold text-[#1e293b]">{formatDate(lease.startDate)} - {lease.endDate ? formatDate(lease.endDate) : "Ongoing"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Hourly Rate</p>
                                <p className="text-sm font-bold text-[#1e293b]">{formatCurrency(lease.hourlyRate)}/hr</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Min Hours/Month</p>
                                <p className="text-sm font-bold text-[#1e293b]">{lease.minimumHours || 0} hrs</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Monthly Performance */}
            <Card className="rounded-2xl border-[#f1f5f9] shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-4 border-b border-[#f8fafc]">
                    <CardTitle className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Monthly Performance</CardTitle>
                    <CardDescription className="text-[13px] text-[#8E8E93] font-medium">Revenue breakdown by month</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-[#f8fafc]/50">
                                <TableRow className="hover:bg-transparent border-b border-[#f1f5f9]">
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12">Month</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Hours</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Gross</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Platform Fee (10%)</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Your Net</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {monthlyPerformance.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-12 text-center">
                                            <p className="text-sm font-bold text-[#1e293b]">No performance data yet</p>
                                            <p className="text-xs text-[#94a3b8] mt-1">Data will appear after flight hours are logged.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    monthlyPerformance.map((row: any, i: number) => (
                                        <TableRow key={i} className="hover:bg-[#fcfdfe] border-b border-[#f8fafc]">
                                            <TableCell className="px-6 py-4 font-bold text-[#1e293b]">{formatMonth(row.month)}</TableCell>
                                            <TableCell className="px-6 py-4 text-center font-bold text-[#1e293b]">{row.hours} hrs</TableCell>
                                            <TableCell className="px-6 py-4 text-center font-bold text-[#1e293b]">{formatCurrency(row.gross)}</TableCell>
                                            <TableCell className="px-6 py-4 text-center font-bold text-red-500">{formatCurrency(row.platformFee || 0)}</TableCell>
                                            <TableCell className="px-6 py-4 text-center font-black text-[#10b981]">{formatCurrency(row.net)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Documents */}
            <Card className="rounded-2xl border-[#f1f5f9] shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-4 border-b border-[#f8fafc]">
                    <CardTitle className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Documents</CardTitle>
                    <CardDescription className="text-[13px] text-[#8E8E93] font-medium">Related files and certificates</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {documents.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="h-12 w-12 text-[#e2e8f0] mx-auto mb-3" />
                            <p className="text-sm font-bold text-[#1e293b]">No documents</p>
                            <p className="text-xs text-[#94a3b8] mt-1">Documents will appear here when uploaded.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[#f1f5f9]">
                            {documents.map((doc: any) => (
                                <div key={doc.id} className="flex items-center justify-between px-6 py-4 hover:bg-[#fcfdfe] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                            <FileText className="h-5 w-5 text-[#007AFF]" />
                                        </div>
                                        <div>
                                            <p className="text-[13px] font-bold text-[#1e293b]">{doc.name}</p>
                                            <p className="text-[11px] text-[#94a3b8] font-medium">{doc.type} - {formatDate(doc.createdAt)}</p>
                                        </div>
                                    </div>
                                    {doc.url && (
                                        <Button variant="ghost" size="sm" className="text-[#007AFF] font-bold text-xs rounded-xl hover:bg-blue-50" asChild>
                                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
