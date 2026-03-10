import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock, CheckCircle2, AlertCircle, Calendar, Plane, History, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { Aircraft, FlightHourLog } from "@shared/schema";
import { useLocation, useSearch } from "wouter";
import { cn } from "@/lib/utils";

export default function PortalHourLogging() {
    const { toast } = useToast();
    const search = useSearch();
    const params = new URLSearchParams(search);
    const initialAircraftId = params.get("aircraftId") ? parseInt(params.get("aircraftId")!) : undefined;

    const [formData, setFormData] = useState({
        aircraftId: initialAircraftId || 0,
        month: new Date().toISOString().slice(0, 7), // YYYY-MM
        reportedHours: "",
        notes: "",
    });

    const { data: aircraft, isLoading: isAircraftLoading } = useQuery<any[]>({
        queryKey: ["/api/portal/aircraft"],
    });

    const selectedAircraft = aircraft?.find((a: any) => a.id === formData.aircraftId);
    const minimumHours = selectedAircraft?.currentLease?.minimumHours || 0;
    const hourlyRate = selectedAircraft?.currentLease?.hourlyRate || 0;
    const reportedHrs = parseFloat(formData.reportedHours) || 0;
    const billableHours = Math.max(reportedHrs, minimumHours);
    const amountDue = billableHours * hourlyRate;
    const isBelowMinimum = reportedHrs > 0 && reportedHrs < minimumHours;

    const { data: logs, isLoading: isLogsLoading } = useQuery<FlightHourLog[]>({
        queryKey: ["/api/portal/hours"],
    });

    const submitMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/portal/hours", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/portal/hours"] });
            queryClient.invalidateQueries({ queryKey: ["/api/portal/dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["/api/portal/payments"] });
            toast({
                title: "Hours submitted successfully",
                description: "Your monthly invoice has been generated.",
            });
            setFormData({
                ...formData,
                reportedHours: "",
                notes: "",
            });
        },
        onError: (err: any) => {
            toast({
                title: "Failed to submit hours",
                description: err.message || "Something went wrong",
                variant: "destructive",
            });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.aircraftId || !formData.reportedHours) {
            toast({
                title: "Incomplete form",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }
        submitMutation.mutate({
            ...formData,
            aircraftId: parseInt(formData.aircraftId.toString()),
            reportedHours: parseFloat(formData.reportedHours),
        });
    };

    if (isAircraftLoading || isLogsLoading) {
        return <div className="p-8 max-w-7xl mx-auto space-y-8"><Skeleton className="h-[600px] w-full" /></div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-[#1e293b] tracking-tight">Hour Logging</h1>
                <p className="text-[#64748b] font-medium">Submit your monthly flight hours for each leased aircraft.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Form Section */}
                <Card className="rounded-2xl border-[#f1f5f9] shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow duration-300">
                    <CardHeader className="bg-[#f8fafc] border-b border-[#f1f5f9] pb-6">
                        <div className="flex items-center space-x-3">
                            <div className="bg-brand/10 p-2 rounded-xl">
                                <Clock className="h-5 w-5 text-brand" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-[#1e293b]">New Report</CardTitle>
                                <CardDescription className="text-xs font-medium text-[#64748b]">Monthly flight time reporting</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Select Aircraft</Label>
                                <Select
                                    value={formData.aircraftId.toString()}
                                    onValueChange={(val) => setFormData({ ...formData, aircraftId: parseInt(val) })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-[#e2e8f0] focus:ring-brand/20 bg-[#f8fafc] font-medium">
                                        <SelectValue placeholder="Choose an aircraft..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-[#e2e8f0] shadow-xl">
                                        {aircraft?.map(ac => (
                                            <SelectItem key={ac.id} value={ac.id.toString()} className="focus:bg-blue-50 focus:text-brand font-medium">
                                                {ac.registration} - {ac.make} {ac.model}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Reporting Month</Label>
                                <Input
                                    type="month"
                                    className="h-11 rounded-xl border-[#e2e8f0] focus:ring-brand/20 bg-[#f8fafc] font-medium"
                                    value={formData.month}
                                    max={new Date().toISOString().slice(0, 7)}
                                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Flight Hours</Label>
                                    {minimumHours > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, reportedHours: minimumHours.toString() })}
                                            className="text-[10px] font-bold text-brand hover:text-brand-hover px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 transition-colors"
                                        >
                                            Pay Minimum ({minimumHours} hrs)
                                        </button>
                                    )}
                                </div>
                                <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="e.g. 45.5"
                                    className="h-11 rounded-xl border-[#e2e8f0] focus:ring-brand/20 bg-[#f8fafc] font-medium"
                                    value={formData.reportedHours}
                                    onChange={(e) => setFormData({ ...formData, reportedHours: e.target.value })}
                                />
                                {isBelowMinimum && (
                                    <p className="text-[11px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                                        Below minimum ({minimumHours} hrs) - you will be billed for {minimumHours} hrs
                                    </p>
                                )}
                            </div>

                            {/* Live Calculation */}
                            {reportedHrs > 0 && selectedAircraft && (
                                <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#f1f5f9] space-y-2">
                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Invoice Preview</p>
                                    <div className="space-y-1.5 text-[12px]">
                                        <div className="flex justify-between">
                                            <span className="text-[#64748b] font-medium">Reported Hours</span>
                                            <span className="font-bold text-[#1e293b]">{reportedHrs} hrs</span>
                                        </div>
                                        {minimumHours > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-[#64748b] font-medium">Minimum Required</span>
                                                <span className="font-bold text-[#1e293b]">{minimumHours} hrs</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-[#64748b] font-medium">Billable Hours</span>
                                            <span className={cn("font-bold", isBelowMinimum ? "text-amber-600" : "text-[#1e293b]")}>
                                                {billableHours} hrs {isBelowMinimum ? "(minimum)" : ""}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#64748b] font-medium">Hourly Rate</span>
                                            <span className="font-bold text-[#1e293b]">{formatCurrency(hourlyRate)}/hr</span>
                                        </div>
                                        <div className="border-t border-[#e2e8f0] pt-1.5 flex justify-between">
                                            <span className="text-[#1e293b] font-bold">Amount Due</span>
                                            <span className="font-black text-brand text-[14px]">{formatCurrency(amountDue)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Notes (Optional)</Label>
                                <textarea
                                    className="w-full min-h-[100px] p-3 rounded-xl border border-[#e2e8f0] focus:ring-2 focus:ring-brand/20 focus:border-brand/30 outline-none bg-[#f8fafc] text-sm font-medium transition-all"
                                    placeholder="Any discrepancies or maintenance notes..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start space-x-3">
                                <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] leading-relaxed text-blue-700 font-medium">
                                    Submitting this report will generate a monthly invoice. Minimum hours will be applied if reported time is below contract limits.
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 bg-brand hover:bg-brand-hover text-white font-black rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
                                disabled={submitMutation.isPending}
                            >
                                {submitMutation.isPending ? "Submitting..." : "Submit Monthly Report"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* History Section */}
                <Card className="xl:col-span-2 rounded-2xl border-[#f1f5f9] shadow-sm overflow-hidden bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-[#f8fafc]">
                        <div className="flex items-center space-x-3">
                            <div className="bg-emerald-50 p-2 rounded-xl">
                                <History className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-[#1e293b]">Submission History</CardTitle>
                                <CardDescription className="text-xs font-medium text-[#64748b]">Past usage reports and verification status</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-[#f8fafc]/50">
                                    <TableRow className="hover:bg-transparent border-b border-[#f1f5f9]">
                                        <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Month</TableHead>
                                        <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Aircraft</TableHead>
                                        <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Reported</TableHead>
                                        <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Verified / Billed</TableHead>
                                        <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Submitted</TableHead>
                                        <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-20 text-center">
                                                <History className="h-12 w-12 text-[#f1f5f9] mx-auto mb-3" />
                                                <p className="text-sm font-bold text-[#1e293b]">No history found</p>
                                                <p className="text-xs text-[#94a3b8] font-medium">Your reports will appear here after submission.</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs?.map((log) => {
                                            const ac = aircraft?.find(a => a.id === log.aircraftId);
                                            return (
                                                <TableRow key={log.id} className="hover:bg-[#fcfdfe] transition-all border-b border-[#f8fafc]">
                                                    <TableCell className="px-6 py-4 font-bold text-[#1e293b] text-center">{log.month}</TableCell>
                                                    <TableCell className="px-6 py-4 text-center">
                                                        <div className="flex flex-col">
                                                            <span className="text-[13px] font-black text-[#1e293b] leading-tight">{ac?.registration}</span>
                                                            <span className="text-[10px] font-bold text-[#94a3b8]">{ac?.make} {ac?.model}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 font-black text-[#1e293b] text-center">{log.reportedHours} hrs</TableCell>
                                                    <TableCell className="px-6 py-4 font-black text-center">
                                                        {log.verifiedHours != null ? (
                                                            <span className={cn(log.verifiedHours !== log.reportedHours ? "text-amber-600" : "text-[#10b981]")}>
                                                                {log.verifiedHours} hrs
                                                            </span>
                                                        ) : (
                                                            <span className="text-[#94a3b8]">{log.reportedHours} hrs</span>
                                                        )}
                                                        {log.discrepancyFlagged && (
                                                            <div className="flex items-center justify-center gap-1 mt-1">
                                                                <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                                                                <span className="text-[10px] font-bold text-red-500">Flagged</span>
                                                            </div>
                                                        )}
                                                        {log.discrepancyNotes && (
                                                            <p className="text-[10px] font-medium text-red-400 mt-0.5 max-w-[120px] truncate" title={log.discrepancyNotes}>
                                                                {log.discrepancyNotes}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="px-6 py-4 text-[#64748b] font-medium text-center">{formatDate(log.submittedAt ?? undefined)}</TableCell>
                                                    <TableCell className="px-6 py-4 text-center">
                                                        <Badge className={cn("px-3 py-1 rounded-full font-black text-[10px] shadow-sm uppercase tracking-tighter", getStatusColor(log.status || "submitted"))}>
                                                            {log.status === "verified" ? (
                                                                <><CheckCircle2 className="h-3 w-3 mr-1 inline" /> Verified</>
                                                            ) : log.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
