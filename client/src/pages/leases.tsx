import { useQuery, useMutation } from "@tanstack/react-query";
import { LeaseWithDetails } from "@shared/schema";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useModal } from "@/hooks/use-modal";
import { Helmet } from "react-helmet";
import { Plus, FileText, Search, Filter, Calendar, DollarSign, Grid3X3, List, ArrowUpDown, ArrowUp, ArrowDown, Building2, Trash2, MoreHorizontal, Ban, XCircle, RefreshCw, PlayCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LeaseAgreementModal from "@/components/leases/lease-agreement-modal";
import LeaseForm from "@/components/leases/lease-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type ViewMode = 'grid' | 'list';
type SortField = 'aircraft' | 'lessee' | 'startDate' | 'endDate' | 'monthlyRate' | 'status';
type SortDirection = 'asc' | 'desc';

function getLeaseStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'suspended':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'terminated':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'expired':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export default function Leases() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('aircraft');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteLease, setDeleteLease] = useState<LeaseWithDetails | null>(null);
  const [reactivateLease, setReactivateLease] = useState<LeaseWithDetails | null>(null);

  // Suspend dialog state
  const [suspendLease, setSuspendLease] = useState<LeaseWithDetails | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  // Terminate dialog state
  const [terminateLease, setTerminateLease] = useState<LeaseWithDetails | null>(null);
  const [terminateReason, setTerminateReason] = useState("");
  const [terminateDate, setTerminateDate] = useState(new Date().toISOString().split('T')[0]);

  // Renew dialog state
  const [renewLease, setRenewLease] = useState<LeaseWithDetails | null>(null);
  const [renewEndDate, setRenewEndDate] = useState("");
  const [renewMonthlyRate, setRenewMonthlyRate] = useState<string>("");

  const addLeaseModal = useModal(false);
  const viewLeaseModal = useModal<LeaseWithDetails>(false);
  const { toast } = useToast();

  const { data: leases, isLoading } = useQuery<LeaseWithDetails[]>({
    queryKey: ["/api/leases"],
  });

  const invalidateLeases = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
  };

  const deleteLeaseMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/leases/${id}`),
    onSuccess: () => {
      invalidateLeases();
      queryClient.invalidateQueries({ queryKey: ["/api/aircraft"] });
      setDeleteLease(null);
      toast({ title: "Lease deleted", description: "The lease agreement has been deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to delete lease: ${error.message}`, variant: "destructive" });
    }
  });

  const suspendLeaseMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      apiRequest("PUT", `/api/leases/${id}/suspend`, { reason }),
    onSuccess: () => {
      invalidateLeases();
      setSuspendLease(null);
      setSuspendReason("");
      toast({ title: "Lease suspended", description: "The lease has been suspended successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to suspend lease: ${error.message}`, variant: "destructive" });
    }
  });

  const terminateLeaseMutation = useMutation({
    mutationFn: ({ id, reason, effectiveDate }: { id: number; reason: string; effectiveDate: string }) =>
      apiRequest("PUT", `/api/leases/${id}/terminate`, { reason, effectiveDate }),
    onSuccess: () => {
      invalidateLeases();
      setTerminateLease(null);
      setTerminateReason("");
      setTerminateDate(new Date().toISOString().split('T')[0]);
      toast({ title: "Lease terminated", description: "The lease has been terminated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to terminate lease: ${error.message}`, variant: "destructive" });
    }
  });

  const renewLeaseMutation = useMutation({
    mutationFn: ({ id, endDate, monthlyRate }: { id: number; endDate: string; monthlyRate?: number }) =>
      apiRequest("PUT", `/api/leases/${id}/renew`, { endDate, ...(monthlyRate != null ? { monthlyRate } : {}) }),
    onSuccess: () => {
      invalidateLeases();
      setRenewLease(null);
      setRenewEndDate("");
      setRenewMonthlyRate("");
      toast({ title: "Lease renewed", description: "The lease has been renewed successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to renew lease: ${error.message}`, variant: "destructive" });
    }
  });

  const reactivateLeaseMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("PUT", `/api/leases/${id}/reactivate`),
    onSuccess: () => {
      invalidateLeases();
      setReactivateLease(null);
      toast({ title: "Lease reactivated", description: "The lease has been reactivated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to reactivate lease: ${error.message}`, variant: "destructive" });
    }
  });

  const filteredLeases = leases
    ? leases.filter((lease) => {
      const matchesSearch =
        (lease.aircraft?.registration || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lease.aircraft?.make || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lease.aircraft?.model || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lease.lessee?.name || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || lease.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    : [];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3" />;
    }
    return sortDirection === 'asc' ?
      <ArrowUp className="ml-1 h-3 w-3" /> :
      <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const filteredAndSortedLeases = filteredLeases.length > 0
    ? [...filteredLeases].sort((a, b) => {
      let aValue = '';
      let bValue = '';

      switch (sortField) {
        case 'aircraft':
          aValue = `${a.aircraft?.make || ''} ${a.aircraft?.model || ''} (${a.aircraft?.registration || ''})`;
          bValue = `${b.aircraft?.make || ''} ${b.aircraft?.model || ''} (${b.aircraft?.registration || ''})`;
          break;
        case 'lessee':
          aValue = a.lessee?.name || '';
          bValue = b.lessee?.name || '';
          break;
        case 'startDate':
          aValue = a.startDate || '';
          bValue = b.startDate || '';
          break;
        case 'endDate':
          aValue = a.endDate || '';
          bValue = b.endDate || '';
          break;
        case 'monthlyRate':
          return sortDirection === 'asc' ? a.monthlyRate - b.monthlyRate : b.monthlyRate - a.monthlyRate;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    })
    : [];

  function openSuspend(lease: LeaseWithDetails) {
    setSuspendLease(lease);
    setSuspendReason("");
  }

  function openTerminate(lease: LeaseWithDetails) {
    setTerminateLease(lease);
    setTerminateReason("");
    setTerminateDate(new Date().toISOString().split('T')[0]);
  }

  function openRenew(lease: LeaseWithDetails) {
    setRenewLease(lease);
    setRenewEndDate("");
    setRenewMonthlyRate(String(lease.monthlyRate ?? ""));
  }

  function LeaseActionsMenu({ lease }: { lease: LeaseWithDetails }) {
    const status = (lease.status || '').toLowerCase();

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {status === 'active' && (
            <>
              <DropdownMenuItem onClick={() => openSuspend(lease)}>
                <Ban className="h-4 w-4 mr-2 text-yellow-600" />
                Suspend Lease
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openTerminate(lease)}>
                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                Terminate Lease
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openRenew(lease)}>
                <RefreshCw className="h-4 w-4 mr-2 text-blue-600" />
                Renew Lease
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {status === 'suspended' && (
            <>
              <DropdownMenuItem onClick={() => setReactivateLease(lease)}>
                <PlayCircle className="h-4 w-4 mr-2 text-green-600" />
                Reactivate Lease
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openTerminate(lease)}>
                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                Terminate Lease
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {(status === 'terminated' || status === 'expired') && (
            <>
              <DropdownMenuItem onClick={() => openRenew(lease)}>
                <RefreshCw className="h-4 w-4 mr-2 text-blue-600" />
                Renew Lease
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={() => setDeleteLease(lease)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Helmet>
        <title>Lease Agreements — AeroLease Wise</title>
        <meta name="description" content="Manage aircraft lease agreements, terms, and payment schedules" />
      </Helmet>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lease Agreements</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all aircraft lease agreements
          </p>
        </div>
        <Button
          onClick={() => addLeaseModal.openModal()}
          className="bg-brand hover:bg-brand-hover text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Lease
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter Leases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search by aircraft or lessee..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="w-full md:w-52">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex rounded-md border border-gray-200 bg-gray-50">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
            </div>
          ) : filteredAndSortedLeases.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedLeases.map((lease) => (
                  <Card key={lease.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">
                            {lease.aircraft?.make} {lease.aircraft?.model}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {lease.aircraft?.registration}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={getLeaseStatusColor(lease.status || '')}
                        >
                          {lease.status || 'Unknown'}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center text-sm">
                          <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="font-medium">{lease.lessee?.name}</span>
                        </div>

                        <div className="flex items-center text-sm">
                          <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                          <span>
                            {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                          </span>
                        </div>

                        <div className="flex items-center text-sm">
                          <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="font-semibold text-brand">
                            {formatCurrency(lease.monthlyRate)}/month
                          </span>
                        </div>

                        {lease.minimumHours != null && (
                          <div className="flex items-center text-sm text-gray-500">
                            <span>Min: {lease.minimumHours} hrs/mo</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewLeaseModal.openModal(lease);
                          }}
                          className="flex-1"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        <LeaseActionsMenu lease={lease} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('aircraft')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Aircraft
                          {getSortIcon('aircraft')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('lessee')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Lessee
                          {getSortIcon('lessee')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('startDate')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Start Date
                          {getSortIcon('startDate')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('endDate')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          End Date
                          {getSortIcon('endDate')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('monthlyRate')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Monthly Rate
                          {getSortIcon('monthlyRate')}
                        </Button>
                      </TableHead>
                      <TableHead>Min Hrs/Mo</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('status')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Status
                          {getSortIcon('status')}
                        </Button>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedLeases.map((lease) => (
                      <TableRow
                        key={lease.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => viewLeaseModal.openModal(lease)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <div>
                              <p>{lease.aircraft?.registration || "N/A"}</p>
                              <p className="text-xs text-gray-500">
                                {lease.aircraft ? `${lease.aircraft.make} ${lease.aircraft.model}` : ""}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{lease.lessee?.name || "N/A"}</TableCell>
                        <TableCell>{formatDate(lease.startDate)}</TableCell>
                        <TableCell>{formatDate(lease.endDate)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="font-mono">{formatCurrency(lease.monthlyRate)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{lease.minimumHours != null ? `${lease.minimumHours} hrs` : "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getLeaseStatusColor(lease.status || '')}
                          >
                            {lease.status || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                viewLeaseModal.openModal(lease);
                              }}
                            >
                              View
                            </Button>
                            <LeaseActionsMenu lease={lease} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No lease agreements found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating a lease agreement"}
              </p>
              {searchTerm || statusFilter !== "all" ? (
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Button
                  onClick={() => addLeaseModal.openModal()}
                  className="bg-brand hover:bg-brand-hover text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lease Agreement
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {addLeaseModal.isOpen && (
        <LeaseForm isOpen={addLeaseModal.isOpen} onClose={addLeaseModal.closeModal} />
      )}

      {viewLeaseModal.isOpen && viewLeaseModal.data && (
        <LeaseAgreementModal
          isOpen={viewLeaseModal.isOpen}
          onClose={viewLeaseModal.closeModal}
          lease={viewLeaseModal.data}
        />
      )}

      {/* Delete Lease Confirmation */}
      <AlertDialog open={!!deleteLease} onOpenChange={(open) => {
        if (!open) setDeleteLease(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lease Agreement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lease agreement for "{deleteLease?.aircraft?.registration}"? This action cannot be undone and will also delete any associated payments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (deleteLease) {
                  deleteLeaseMutation.mutate(deleteLease.id);
                }
              }}
            >
              {deleteLeaseMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Lease Confirmation */}
      <AlertDialog open={!!reactivateLease} onOpenChange={(open) => {
        if (!open) setReactivateLease(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reactivate Lease</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reactivate the lease for "{reactivateLease?.aircraft?.registration}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => {
                if (reactivateLease) {
                  reactivateLeaseMutation.mutate(reactivateLease.id);
                }
              }}
            >
              {reactivateLeaseMutation.isPending ? "Reactivating..." : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend Lease Dialog */}
      <Dialog open={!!suspendLease} onOpenChange={(open) => {
        if (!open) { setSuspendLease(null); setSuspendReason(""); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Lease</DialogTitle>
            <DialogDescription>
              Provide a reason for suspending the lease for "{suspendLease?.aircraft?.registration}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="suspend-reason">Reason</Label>
            <Textarea
              id="suspend-reason"
              placeholder="Enter reason for suspension..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSuspendLease(null); setSuspendReason(""); }}>
              Cancel
            </Button>
            <Button
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              disabled={!suspendReason.trim() || suspendLeaseMutation.isPending}
              onClick={() => {
                if (suspendLease) {
                  suspendLeaseMutation.mutate({ id: suspendLease.id, reason: suspendReason });
                }
              }}
            >
              {suspendLeaseMutation.isPending ? "Suspending..." : "Suspend Lease"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Terminate Lease Dialog */}
      <Dialog open={!!terminateLease} onOpenChange={(open) => {
        if (!open) { setTerminateLease(null); setTerminateReason(""); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminate Lease</DialogTitle>
            <DialogDescription>
              Provide a reason and effective date for terminating the lease for "{terminateLease?.aircraft?.registration}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="terminate-reason">Reason</Label>
              <Textarea
                id="terminate-reason"
                placeholder="Enter reason for termination..."
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terminate-date">Effective Date</Label>
              <Input
                id="terminate-date"
                type="date"
                value={terminateDate}
                onChange={(e) => setTerminateDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTerminateLease(null); setTerminateReason(""); }}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!terminateReason.trim() || !terminateDate || terminateLeaseMutation.isPending}
              onClick={() => {
                if (terminateLease) {
                  terminateLeaseMutation.mutate({ id: terminateLease.id, reason: terminateReason, effectiveDate: terminateDate });
                }
              }}
            >
              {terminateLeaseMutation.isPending ? "Terminating..." : "Terminate Lease"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Lease Dialog */}
      <Dialog open={!!renewLease} onOpenChange={(open) => {
        if (!open) { setRenewLease(null); setRenewEndDate(""); setRenewMonthlyRate(""); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Lease</DialogTitle>
            <DialogDescription>
              Set the new end date and optionally update the monthly rate for "{renewLease?.aircraft?.registration}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="renew-end-date">New End Date</Label>
              <Input
                id="renew-end-date"
                type="date"
                value={renewEndDate}
                onChange={(e) => setRenewEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="renew-rate">Monthly Rate (optional)</Label>
              <Input
                id="renew-rate"
                type="number"
                placeholder="Leave blank to keep current rate"
                value={renewMonthlyRate}
                onChange={(e) => setRenewMonthlyRate(e.target.value)}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRenewLease(null); setRenewEndDate(""); setRenewMonthlyRate(""); }}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!renewEndDate || renewLeaseMutation.isPending}
              onClick={() => {
                if (renewLease) {
                  const rate = renewMonthlyRate !== "" ? parseFloat(renewMonthlyRate) : undefined;
                  renewLeaseMutation.mutate({ id: renewLease.id, endDate: renewEndDate, monthlyRate: rate });
                }
              }}
            >
              {renewLeaseMutation.isPending ? "Renewing..." : "Renew Lease"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
