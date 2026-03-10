import { useQuery, useMutation } from "@tanstack/react-query";
import { FlightHourLogWithDetails } from "@shared/schema";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDate, formatMonth } from "@/lib/utils";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, AlertTriangle, Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function AdminHourSubmissions() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [verifyDialog, setVerifyDialog] = useState<FlightHourLogWithDetails | null>(null);
  const [verifiedHours, setVerifiedHours] = useState("");

  const { data: logs = [], isLoading } = useQuery<FlightHourLogWithDetails[]>({
    queryKey: ["/api/admin/hour-submissions"],
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, hours }: { id: number; hours: number }) => {
      const res = await apiRequest("PUT", `/api/flight-hours/${id}/verify`, { verifiedHours: hours });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hour-submissions"] });
      toast({ title: "Hours Verified", description: "The submission has been verified successfully." });
      setVerifyDialog(null);
      setVerifiedHours("");
    },
    onError: () => {
      toast({ title: "Verification Failed", description: "Could not verify hours. Please try again.", variant: "destructive" });
    },
  });

  const filtered = logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.aircraftRegistration?.toLowerCase().includes(search.toLowerCase()) ||
      log.lesseeName?.toLowerCase().includes(search.toLowerCase()) ||
      log.month.includes(search);
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalSubmitted = logs.length;
  const totalVerified = logs.filter((l) => l.status === "verified").length;
  const totalPending = logs.filter((l) => l.status === "submitted").length;
  const totalFlagged = logs.filter((l) => l.discrepancyFlagged).length;

  const getStatusBadge = (log: FlightHourLogWithDetails) => {
    if (log.discrepancyFlagged)
      return <Badge className="bg-red-100 text-red-700 border-red-200 font-semibold">Discrepancy</Badge>;
    if (log.status === "verified")
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-semibold">Verified</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-semibold">Pending</Badge>;
  };

  const openVerifyDialog = (log: FlightHourLogWithDetails) => {
    setVerifyDialog(log);
    setVerifiedHours(String(log.reportedHours));
  };

  return (
    <>
      <Helmet><title>Hour Submissions — AeroLease Wise</title></Helmet>

      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-[#1e293b] tracking-tight">Hour Submissions</h1>
            <p className="text-[14px] text-[#64748b] font-medium mt-1">Review and verify flight hours reported by flight schools</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Submissions", value: totalSubmitted, icon: Clock, color: "text-[#007AFF]", bg: "bg-blue-50" },
            { label: "Pending Review", value: totalPending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Verified", value: totalVerified, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Flagged", value: totalFlagged, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <Card key={label} className="rounded-2xl border-slate-100 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`${bg} p-2.5 rounded-xl`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-[#64748b] uppercase tracking-wide">{label}</p>
                  {isLoading ? <Skeleton className="h-7 w-10 mt-1" /> : (
                    <p className="text-[24px] font-bold text-[#1e293b] leading-tight">{value}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="rounded-2xl border-slate-100 shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
              <Input
                placeholder="Search by aircraft, school, or period..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl border-slate-200 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-44 h-10 rounded-xl border-slate-200 text-sm">
                <Filter className="h-4 w-4 mr-2 text-[#94a3b8]" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="submitted">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f8fafc] border-slate-100">
                <TableHead className="font-bold text-[#475569] text-xs uppercase tracking-wide">Aircraft</TableHead>
                <TableHead className="font-bold text-[#475569] text-xs uppercase tracking-wide">Flight School</TableHead>
                <TableHead className="font-bold text-[#475569] text-xs uppercase tracking-wide">Period</TableHead>
                <TableHead className="font-bold text-[#475569] text-xs uppercase tracking-wide">Reported Hrs</TableHead>
                <TableHead className="font-bold text-[#475569] text-xs uppercase tracking-wide">Verified Hrs</TableHead>
                <TableHead className="font-bold text-[#475569] text-xs uppercase tracking-wide">Submitted</TableHead>
                <TableHead className="font-bold text-[#475569] text-xs uppercase tracking-wide">Status</TableHead>
                <TableHead className="font-bold text-[#475569] text-xs uppercase tracking-wide">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-[#94a3b8]">
                    <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold text-[#64748b]">No submissions found</p>
                    <p className="text-sm mt-1">Hour submissions from flight schools will appear here</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log) => (
                  <TableRow key={log.id} className="hover:bg-[#f8fafc] border-slate-50">
                    <TableCell className="font-bold text-[#1e293b]">{log.aircraftRegistration ?? "—"}</TableCell>
                    <TableCell className="text-[#475569]">{log.lesseeName ?? "—"}</TableCell>
                    <TableCell className="text-[#475569]">{formatMonth(log.month)}</TableCell>
                    <TableCell className="font-semibold text-[#1e293b]">{log.reportedHours} hrs</TableCell>
                    <TableCell className="font-semibold text-[#1e293b]">
                      {log.verifiedHours != null ? `${log.verifiedHours} hrs` : <span className="text-[#94a3b8]">—</span>}
                    </TableCell>
                    <TableCell className="text-[#64748b] text-sm">{log.submittedAt ? formatDate(log.submittedAt.toString()) : "—"}</TableCell>
                    <TableCell>{getStatusBadge(log)}</TableCell>
                    <TableCell>
                      {log.status !== "verified" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openVerifyDialog(log)}
                          className="rounded-xl border-[#007AFF] text-[#007AFF] hover:bg-blue-50 text-xs font-bold h-8"
                        >
                          Verify
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Verify Dialog */}
      <Dialog open={!!verifyDialog} onOpenChange={() => { setVerifyDialog(null); setVerifiedHours(""); }}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold text-[#1e293b]">Verify Flight Hours</DialogTitle>
          </DialogHeader>
          {verifyDialog && (
            <div className="space-y-5 py-2">
              <div className="bg-[#f8fafc] rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#64748b] font-medium">Aircraft</span>
                  <span className="font-bold text-[#1e293b]">{verifyDialog.aircraftRegistration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b] font-medium">School</span>
                  <span className="font-bold text-[#1e293b]">{verifyDialog.lesseeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b] font-medium">Period</span>
                  <span className="font-bold text-[#1e293b]">{formatMonth(verifyDialog.month)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b] font-medium">Reported Hours</span>
                  <span className="font-bold text-[#1e293b]">{verifyDialog.reportedHours} hrs</span>
                </div>
              </div>
              {verifyDialog.discrepancyFlagged && verifyDialog.discrepancyNotes && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex gap-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{verifyDialog.discrepancyNotes}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-[12px] font-bold text-[#1e293b] uppercase tracking-wider">Verified Hours</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={verifiedHours}
                  onChange={(e) => setVerifiedHours(e.target.value)}
                  className="h-11 rounded-xl border-slate-200"
                  placeholder="Enter verified hours"
                />
                <p className="text-[11px] text-[#94a3b8]">If different from reported, a discrepancy will be flagged automatically.</p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setVerifyDialog(null)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={() => verifyDialog && verifyMutation.mutate({ id: verifyDialog.id, hours: parseFloat(verifiedHours) })}
              disabled={!verifiedHours || isNaN(parseFloat(verifiedHours)) || verifyMutation.isPending}
              className="rounded-xl bg-[#007AFF] hover:bg-[#0062CC] text-white font-bold"
            >
              {verifyMutation.isPending ? "Verifying..." : "Confirm Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
