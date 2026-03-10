import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Wrench, CheckCircle2, Clock, AlertTriangle, Plus, Search, Edit2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { MaintenanceWithDetails, AircraftWithDetails } from "@shared/schema";
import { cn } from "@/lib/utils";

const MAINTENANCE_TYPES = [
    "100 Hour Inspection",
    "Annual Inspection",
    "Engine Overhaul",
    "Avionics Check",
    "Routine Service",
    "Unscheduled Repair",
    "Other",
];

const STATUS_OPTIONS = ["Scheduled", "Completed", "Overdue"];

type FormData = {
    aircraftId: string;
    type: string;
    scheduledDate: string;
    completedDate: string;
    status: string;
    performedBy: string;
    cost: string;
    notes: string;
};

const emptyForm: FormData = {
    aircraftId: "",
    type: "",
    scheduledDate: "",
    completedDate: "",
    status: "Scheduled",
    performedBy: "",
    cost: "",
    notes: "",
};

function getStatusBadgeClass(status: string | null) {
    switch (status) {
        case "Completed":
            return "bg-emerald-50 text-emerald-700 border border-emerald-100";
        case "Overdue":
            return "bg-red-50 text-red-700 border border-red-100";
        case "Scheduled":
        default:
            return "bg-blue-50 text-blue-700 border border-blue-100";
    }
}

export default function PortalMaintenance() {
    const { toast } = useToast();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MaintenanceWithDetails | null>(null);
    const [formData, setFormData] = useState<FormData>(emptyForm);

    const { data: records, isLoading } = useQuery<MaintenanceWithDetails[]>({
        queryKey: ["/api/portal/maintenance"],
    });

    const { data: myAircraft = [] } = useQuery<AircraftWithDetails[]>({
        queryKey: ["/api/portal/my-aircraft"],
    });

    const aircraftOptions = useMemo(() => {
        return myAircraft.map((ac) => ({
            id: ac.id,
            registration: ac.registration,
            make: ac.make,
            model: ac.model,
        }));
    }, [myAircraft]);

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/maintenance", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/portal/maintenance"] });
            toast({ title: "Maintenance record created" });
            setDialogOpen(false);
            setFormData(emptyForm);
        },
        onError: (err: any) => {
            toast({ title: "Failed to create record", description: err.message || "Something went wrong", variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const res = await apiRequest("PUT", `/api/maintenance/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/portal/maintenance"] });
            toast({ title: "Maintenance record updated" });
            setDialogOpen(false);
            setEditingRecord(null);
            setFormData(emptyForm);
        },
        onError: (err: any) => {
            toast({ title: "Failed to update record", description: err.message || "Something went wrong", variant: "destructive" });
        },
    });

    const openCreate = () => {
        setEditingRecord(null);
        setFormData(emptyForm);
        setDialogOpen(true);
    };

    const openEdit = (record: MaintenanceWithDetails) => {
        setEditingRecord(record);
        setFormData({
            aircraftId: record.aircraftId.toString(),
            type: record.type,
            scheduledDate: record.scheduledDate ?? "",
            completedDate: record.completedDate ?? "",
            status: record.status ?? "Scheduled",
            performedBy: record.performedBy ?? "",
            cost: record.cost != null ? record.cost.toString() : "",
            notes: record.notes ?? "",
        });
        setDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.aircraftId || !formData.type || !formData.scheduledDate) {
            toast({ title: "Incomplete form", description: "Aircraft, type, and scheduled date are required.", variant: "destructive" });
            return;
        }
        const payload = {
            aircraftId: parseInt(formData.aircraftId),
            type: formData.type,
            scheduledDate: formData.scheduledDate,
            completedDate: formData.completedDate || null,
            status: formData.status,
            performedBy: formData.performedBy || null,
            cost: formData.cost ? parseFloat(formData.cost) : null,
            notes: formData.notes || null,
        };
        if (editingRecord) {
            updateMutation.mutate({ id: editingRecord.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const filtered = useMemo(() => {
        if (!records) return [];
        return records.filter((rec) => {
            const matchesStatus = statusFilter === "All" || rec.status === statusFilter;
            const q = search.toLowerCase();
            const matchesSearch =
                !q ||
                rec.aircraft?.registration?.toLowerCase().includes(q) ||
                rec.aircraft?.make?.toLowerCase().includes(q) ||
                rec.aircraft?.model?.toLowerCase().includes(q) ||
                rec.type?.toLowerCase().includes(q);
            return matchesStatus && matchesSearch;
        });
    }, [records, statusFilter, search]);

    // Stats
    const total = records?.length ?? 0;
    const scheduled = records?.filter((r) => r.status === "Scheduled").length ?? 0;
    const completed = records?.filter((r) => r.status === "Completed").length ?? 0;
    const overdue = records?.filter((r) => r.status === "Overdue").length ?? 0;

    const isPending = createMutation.isPending || updateMutation.isPending;

    if (isLoading) {
        return <div className="p-8 max-w-7xl mx-auto space-y-8"><Skeleton className="h-[600px] w-full" /></div>;
    }

    return (
        <>
        <Helmet>
            <title>Maintenance — AeroLease Wise</title>
        </Helmet>
        <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Page Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-[#1e293b] tracking-tight">Technical Logs</h1>
                    <p className="text-[#64748b] font-medium">Track and manage maintenance for your leased aircraft.</p>
                </div>
                <Button
                    onClick={openCreate}
                    className="h-11 px-5 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98] flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Log Maintenance
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Records", value: total, icon: Wrench, color: "text-[#64748b]", bg: "bg-[#f8fafc]" },
                    { label: "Scheduled", value: scheduled, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Overdue", value: overdue, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                    <Card key={label} className="rounded-2xl border-[#f1f5f9] shadow-sm bg-white hover:shadow-md transition-shadow duration-300">
                        <CardContent className="pt-5 pb-5 flex items-center gap-4">
                            <div className={cn("p-2.5 rounded-xl", bg)}>
                                <Icon className={cn("h-5 w-5", color)} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-[#1e293b]">{value}</p>
                                <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">{label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
                    <Input
                        placeholder="Search by registration or type..."
                        className="pl-9 h-11 rounded-xl border-[#e2e8f0] bg-white font-medium focus:ring-brand/20"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 w-44 rounded-xl border-[#e2e8f0] bg-white font-medium focus:ring-brand/20">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#e2e8f0] shadow-xl">
                        {["All", "Scheduled", "Completed", "Overdue"].map((s) => (
                            <SelectItem key={s} value={s} className="font-medium focus:bg-blue-50 focus:text-brand">
                                {s}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <Card className="rounded-2xl border-[#f1f5f9] shadow-sm overflow-hidden bg-white">
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#f8fafc]">
                    <div className="flex items-center space-x-3">
                        <div className="bg-[#f1f5f9] p-2 rounded-xl">
                            <Wrench className="h-5 w-5 text-[#64748b]" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-[#1e293b]">Maintenance Records</CardTitle>
                            <CardDescription className="text-xs font-medium text-[#64748b]">
                                {filtered.length} record{filtered.length !== 1 ? "s" : ""} found
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-[#f8fafc]/50">
                                <TableRow className="hover:bg-transparent border-b border-[#f1f5f9]">
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12">Aircraft</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12">Maintenance Type</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12">Scheduled Date</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12">Completed Date</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12">Status</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12">Cost</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12">Performed By</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-20 text-center">
                                            <Wrench className="h-12 w-12 text-[#f1f5f9] mx-auto mb-3" />
                                            <p className="text-sm font-bold text-[#1e293b]">No records found</p>
                                            <p className="text-xs text-[#94a3b8] font-medium">Maintenance records will appear here.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((rec) => (
                                        <TableRow key={rec.id} className="hover:bg-[#fcfdfe] transition-all border-b border-[#f8fafc]">
                                            <TableCell className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-black text-[#1e293b] leading-tight">{rec.aircraft?.registration ?? "—"}</span>
                                                    <span className="text-[10px] font-bold text-[#94a3b8]">{rec.aircraft?.make} {rec.aircraft?.model}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 font-semibold text-[#1e293b] text-sm">{rec.type}</TableCell>
                                            <TableCell className="px-6 py-4 text-[#64748b] font-medium text-sm">
                                                {rec.scheduledDate ? formatDate(rec.scheduledDate) : "—"}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-[#64748b] font-medium text-sm">
                                                {rec.completedDate ? formatDate(rec.completedDate) : <span className="text-[#c4cdd6]">—</span>}
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <Badge className={cn("px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wide", getStatusBadgeClass(rec.status))}>
                                                    {rec.status ?? "Scheduled"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 font-bold text-[#1e293b] text-sm">
                                                {rec.cost != null ? formatCurrency(rec.cost) : <span className="text-[#c4cdd6]">—</span>}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-[#64748b] font-medium text-sm">
                                                {rec.performedBy || <span className="text-[#c4cdd6]">—</span>}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEdit(rec)}
                                                    className="h-8 px-3 rounded-lg text-[#64748b] hover:text-brand hover:bg-blue-50 font-bold text-xs gap-1.5"
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                    Edit
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingRecord(null); setFormData(emptyForm); } }}>
                <DialogContent className="max-w-lg rounded-2xl border-[#f1f5f9] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-[#1e293b]">
                            {editingRecord ? "Edit Maintenance Record" : "Log Maintenance"}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-5 mt-2">
                        {/* Aircraft */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Aircraft</Label>
                            <Select value={formData.aircraftId} onValueChange={(val) => setFormData({ ...formData, aircraftId: val })}>
                                <SelectTrigger className="h-11 rounded-xl border-[#e2e8f0] bg-[#f8fafc] font-medium focus:ring-brand/20">
                                    <SelectValue placeholder="Select aircraft..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-[#e2e8f0] shadow-xl">
                                    {aircraftOptions.map((ac) => (
                                        <SelectItem key={ac.id} value={ac.id.toString()} className="font-medium focus:bg-blue-50 focus:text-brand">
                                            {ac.registration} — {ac.make} {ac.model}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Maintenance Type */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Maintenance Type</Label>
                            <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                                <SelectTrigger className="h-11 rounded-xl border-[#e2e8f0] bg-[#f8fafc] font-medium focus:ring-brand/20">
                                    <SelectValue placeholder="Select type..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-[#e2e8f0] shadow-xl">
                                    {MAINTENANCE_TYPES.map((t) => (
                                        <SelectItem key={t} value={t} className="font-medium focus:bg-blue-50 focus:text-brand">
                                            {t}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Scheduled Date</Label>
                                <Input
                                    type="date"
                                    className="h-11 rounded-xl border-[#e2e8f0] bg-[#f8fafc] font-medium focus:ring-brand/20"
                                    value={formData.scheduledDate}
                                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Completed Date</Label>
                                <Input
                                    type="date"
                                    className="h-11 rounded-xl border-[#e2e8f0] bg-[#f8fafc] font-medium focus:ring-brand/20"
                                    value={formData.completedDate}
                                    onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Status</Label>
                            <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                <SelectTrigger className="h-11 rounded-xl border-[#e2e8f0] bg-[#f8fafc] font-medium focus:ring-brand/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-[#e2e8f0] shadow-xl">
                                    {STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s} value={s} className="font-medium focus:bg-blue-50 focus:text-brand">
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Performed By & Cost */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Performed By</Label>
                                <Input
                                    placeholder="e.g. Tech team"
                                    className="h-11 rounded-xl border-[#e2e8f0] bg-[#f8fafc] font-medium focus:ring-brand/20"
                                    value={formData.performedBy}
                                    onChange={(e) => setFormData({ ...formData, performedBy: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Cost ($)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="h-11 rounded-xl border-[#e2e8f0] bg-[#f8fafc] font-medium focus:ring-brand/20"
                                    value={formData.cost}
                                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Notes (Optional)</Label>
                            <textarea
                                className="w-full min-h-[90px] p-3 rounded-xl border border-[#e2e8f0] focus:ring-2 focus:ring-brand/20 focus:border-brand/30 outline-none bg-[#f8fafc] text-sm font-medium transition-all"
                                placeholder="Additional notes about this maintenance..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => { setDialogOpen(false); setEditingRecord(null); setFormData(emptyForm); }}
                                className="rounded-xl font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="h-11 px-6 bg-brand hover:bg-brand-hover text-white font-black rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
                                disabled={isPending}
                            >
                                {isPending ? "Saving..." : editingRecord ? "Save Changes" : "Log Maintenance"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
        </>
    );
}
