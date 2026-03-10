import { useQuery, useMutation } from "@tanstack/react-query";
import { AircraftWithDetails } from "@shared/schema";
import { useState } from "react";
import { useModal } from "@/hooks/use-modal";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { AircraftImage } from "@/components/ui/aircraft-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet";
import { Search, Plus, Filter, Grid3X3, List, ArrowUpDown, ArrowUp, ArrowDown, Trash2, MoreHorizontal, Plane, MapPin, Gauge, TrendingUp, Wallet, Wrench, ShieldCheck, Hash, Clock, FileText, Zap, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
import AircraftDetailsModal from "@/components/aircraft/aircraft-details-modal";
import AddAircraftForm from "@/components/aircraft/add-aircraft-form";
import OwnerDetailDrawer from "@/components/owners/owner-detail-drawer";
import LesseeDetailDrawer from "@/components/lessees/lessee-detail-drawer";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import { AeroLeaseIcon } from "@/components/ui/aero-lease-icon";

type ViewMode = 'grid' | 'list';
type SortField = 'registration' | 'make' | 'model' | 'year' | 'status' | 'owner' | 'monthlyRate';
type SortDirection = 'asc' | 'desc';

export default function Aircraft() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('registration');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deleteAircraft, setDeleteAircraft] = useState<AircraftWithDetails | null>(null);
  const addAircraftModal = useModal(false);
  const detailsModal = useModal<AircraftWithDetails>(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number>(0);
  const [ownerDrawerOpen, setOwnerDrawerOpen] = useState(false);
  const [selectedLesseeId, setSelectedLesseeId] = useState<number>(0);
  const [lesseeDrawerOpen, setLesseeDrawerOpen] = useState(false);
  const { toast } = useToast();

  const { data: aircraft, isLoading } = useQuery<AircraftWithDetails[]>({
    queryKey: ["/api/aircraft"],
  });

  const deleteAircraftMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/aircraft/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aircraft"] });
      setDeleteAircraft(null);
      toast({
        title: "Aircraft deleted",
        description: "The aircraft has been deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete aircraft: ${error.message}`,
        variant: "destructive",
      });
    }
  });

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
      return <ArrowUpDown className="h-3 w-3 ml-1.5 opacity-40" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1.5 text-brand" /> : <ArrowDown className="h-3 w-3 ml-1.5 text-brand" />;
  };

  const getModernStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
      case 'active':
        return "bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]";
      case 'leased':
        return "bg-blue-50 text-brand border-blue-100";
      case 'maintenance':
        return "bg-[#fff7ed] text-[#ea580c] border-[#ffedd5]";
      default:
        return "bg-[#f8fafc] text-[#64748b] border-[#f1f5f9]";
    }
  };

  const filteredAndSortedAircraft = aircraft
    ? aircraft
      .filter((a) => {
        const matchesSearch =
          a.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.model.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || a.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'registration':
            aValue = a.registration.toLowerCase();
            bValue = b.registration.toLowerCase();
            break;
          case 'make':
            aValue = a.make.toLowerCase();
            bValue = b.make.toLowerCase();
            break;
          case 'model':
            aValue = a.model.toLowerCase();
            bValue = b.model.toLowerCase();
            break;
          case 'year':
            aValue = a.year;
            bValue = b.year;
            break;
          case 'status':
            aValue = (a.status || '').toLowerCase();
            bValue = (b.status || '').toLowerCase();
            break;
          case 'owner':
            aValue = (a.owner?.name || "").toLowerCase();
            bValue = (b.owner?.name || "").toLowerCase();
            break;
          case 'monthlyRate':
            aValue = a.currentLease?.monthlyRate || 0;
            bValue = b.currentLease?.monthlyRate || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      })
    : [];

  return (
    <div className="max-w-[1600px] mx-auto">
      <Helmet>
        <title>Total Fleet — AeroLease Wise</title>
      </Helmet>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div className="space-y-1.5">
          <h1 className="text-[32px] font-bold tracking-tight text-[#1e293b]">Fleet Overview</h1>
          <p className="text-[14px] text-[#64748b] font-medium flex items-center">
            Managing <span className="text-brand font-bold mx-1.5">{aircraft?.length || 0}</span> strategic assets across your global network
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#f1f5f9] p-1.5 rounded-[14px] border border-[#e2e8f0]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn(
                "h-8 w-8 p-0 rounded-lg transition-all",
                viewMode === 'grid' ? "bg-white shadow-sm text-brand" : "text-[#94a3b8] hover:text-[#64748b]"
              )}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn(
                "h-8 w-8 p-0 rounded-lg transition-all",
                viewMode === 'list' ? "bg-white shadow-sm text-brand" : "text-[#94a3b8] hover:text-[#64748b]"
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => addAircraftModal.openModal()}
            className="h-11 px-6 bg-brand hover:bg-brand-hover text-white rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center gap-2 group border-none"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90 duration-300" />
            <span className="text-[14px] font-bold">Register Asset</span>
          </Button>
        </div>
      </div>

      {/* Fleet Summary — real data only */}
      {aircraft && aircraft.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 pt-6">
          <Card className="rounded-[24px] border-[#f1f5f9] shadow-sm bg-white hover:shadow-md transition-shadow overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-brand">
                  <Plane className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest">Total Aircraft</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-[20px] font-bold text-[#1e293b]">{aircraft.length}</h3>
                    <span className="text-[11px] font-bold text-[#64748b]">assets</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-[#f1f5f9] shadow-sm bg-white hover:shadow-md transition-shadow overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[#f0fdf4] flex items-center justify-center text-[#16a34a]">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest">Active Leases</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-[20px] font-bold text-[#1e293b]">{aircraft.filter(a => a.currentLease).length}</h3>
                    <span className="text-[11px] font-bold text-[#059669]">leased</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-[#f1f5f9] shadow-sm bg-white hover:shadow-md transition-shadow overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-[#f8fafc] flex items-center justify-center text-[#64748b]">
                  <Wrench className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest">In Maintenance</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-[20px] font-bold text-[#1e293b]">{aircraft.filter(a => (a.status || '').toLowerCase() === 'maintenance').length}</h3>
                    <span className="text-[11px] font-bold text-[#ea580c]">aircraft</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Advanced Filters */}
      <Card className="rounded-2xl border-[#f1f5f9] shadow-sm mb-8 bg-white/50 backdrop-blur-sm">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8] group-focus-within:text-brand transition-colors" />
              <Input
                type="text"
                placeholder="Search by registration, make, or model..."
                className="pl-10 h-11 border-[#e2e8f0] focus:border-brand focus:ring-brand rounded-xl transition-all text-[14px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px] h-11 rounded-xl border-[#e2e8f0] focus:ring-brand text-[14px] font-medium text-[#475569]">
                  <div className="flex items-center">
                    <Filter className="h-3.5 w-3.5 mr-2 text-[#94a3b8]" />
                    <SelectValue placeholder="All Status" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#f1f5f9] shadow-xl">
                  <SelectItem value="all" className="rounded-lg">All Statuses</SelectItem>
                  <SelectItem value="Available" className="rounded-lg">Available</SelectItem>
                  <SelectItem value="Leased" className="rounded-lg">Leased</SelectItem>
                  <SelectItem value="Maintenance" className="rounded-lg">Maintenance</SelectItem>
                  <SelectItem value="Unassigned" className="rounded-lg">Unassigned</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="h-11 rounded-xl border-[#e2e8f0] px-4 font-bold text-[#64748b] hover:bg-[#f8fafc] flex items-center gap-2"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(null).map((_, index) => (
              <Card key={index} className="rounded-[32px] border-[#f1f5f9] shadow-sm overflow-hidden">
                <Skeleton className="h-64 w-full" />
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="pt-4 grid grid-cols-2 gap-3 border-t border-[#f8fafc]">
                    <Skeleton className="h-12 rounded-2xl w-full" />
                    <Skeleton className="h-12 rounded-2xl w-full" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredAndSortedAircraft.length > 0 ? (
            filteredAndSortedAircraft.map((aircraft) => (
              <Card
                key={aircraft.id}
                className="group rounded-[32px] border-[#f1f5f9] shadow-sm overflow-hidden bg-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer"
                onClick={() => detailsModal.openModal(aircraft)}
              >
                <div className="h-64 relative overflow-hidden">
                  <AircraftImage
                    src={aircraft.image || ''}
                    alt={aircraft.make}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute top-5 left-5">
                    <div className={cn(
                      "px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border backdrop-blur-md shadow-lg",
                      aircraft.status === 'available' ? 'bg-white/90 text-[#16a34a] border-white' :
                        aircraft.status === 'leased' ? 'bg-white/90 text-brand border-white' :
                          'bg-white/90 text-[#ea580c] border-white'
                    )}>
                      {aircraft.status || 'Active'}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#1e293b]/90 via-[#1e293b]/40 to-transparent">
                    <p className="text-white/80 text-[11px] font-bold uppercase tracking-[0.2em] mb-1">{aircraft.year} {aircraft.make}</p>
                    <h3 className="text-white text-[24px] font-bold tracking-tight">{aircraft.model}</h3>
                  </div>
                  <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                    <div className="bg-brand text-white p-2.5 rounded-xl shadow-xl">
                      <MoreHorizontal className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-[#f8fafc] flex items-center justify-center border border-[#f1f5f9]">
                        <Hash className="h-4 w-4 text-brand" />
                      </div>
                      <span className="text-[14px] font-bold text-[#1e293b] font-mono tracking-tight">{aircraft.registration}</span>
                    </div>
                  </div>

                  {(aircraft.engineType || aircraft.totalTime) && (
                    <div className="flex items-center gap-1.5 mb-4 text-[11px] text-[#64748b] font-medium">
                      <Zap className="h-3 w-3 text-[#94a3b8] shrink-0" />
                      <span className="truncate">
                        {[
                          aircraft.engineType,
                          aircraft.totalTime != null ? `${aircraft.totalTime.toLocaleString()} hrs TT` : null,
                        ].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  )}

                  <div className="space-y-4 pt-2 border-t border-[#f1f5f9]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] flex items-center justify-center border border-[#e2e8f0]">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[9px] font-bold bg-transparent text-[#64748b]">SPV</AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Asset Owner</p>
                          <p className="text-[13px] font-bold text-[#1e293b] truncate max-w-[140px]">
                            {aircraft.owner?.name || "Global Aviation Group"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Net Monthly</p>
                        <p className="text-[15px] font-bold text-[#1e293b] font-mono">
                          {aircraft.currentLease ? formatCurrency(aircraft.currentLease.monthlyRate) : "$0.00"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs font-bold text-[#64748b] hover:text-brand hover:bg-blue-50 rounded-xl"
                        onClick={(e) => { e.stopPropagation(); detailsModal.openModal(aircraft); }}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                        onClick={(e) => { e.stopPropagation(); setDeleteAircraft(aircraft); }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-24 text-center">
              <div className="bg-[#f8fafc] w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-[#cbd5e1]" />
              </div>
              <h3 className="text-[18px] font-bold text-[#1e293b]">No aircraft match your search</h3>
              <p className="text-[14px] text-[#64748b] mt-2 mb-8 max-w-sm mx-auto leading-relaxed">
                We couldn't find any fleet members matching your current filters. Try refining your request.
              </p>
              <Button
                variant="outline"
                className="rounded-xl px-8 h-10 border-[#e2e8f0] font-bold"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card className="rounded-2xl border-[#f1f5f9] shadow-sm overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f8fafc] border-b border-[#f1f5f9] hover:bg-[#f8fafc]">
                <TableHead className="px-6 py-4 w-[100px] text-[11px] font-bold text-[#64748b] uppercase tracking-wider">Asset</TableHead>
                <TableHead className="px-6 py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('registration')}
                    className="h-auto p-0 text-[11px] font-bold text-[#64748b] uppercase tracking-wider hover:bg-transparent"
                  >
                    Registration
                    {getSortIcon('registration')}
                  </Button>
                </TableHead>
                <TableHead className="px-6 py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('make')}
                    className="h-auto p-0 text-[11px] font-bold text-[#64748b] uppercase tracking-wider hover:bg-transparent"
                  >
                    Make & Model
                    {getSortIcon('make')}
                  </Button>
                </TableHead>
                <TableHead className="px-6 py-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('status')}
                    className="h-auto p-0 text-[11px] font-bold text-[#64748b] uppercase tracking-wider hover:bg-transparent mx-auto"
                  >
                    Status
                    {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead className="px-6 py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('owner')}
                    className="h-auto p-0 text-[11px] font-bold text-[#64748b] uppercase tracking-wider hover:bg-transparent"
                  >
                    Owner
                    {getSortIcon('owner')}
                  </Button>
                </TableHead>
                <TableHead className="px-6 py-4 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('monthlyRate')}
                    className="h-auto p-0 text-[11px] font-bold text-[#64748b] uppercase tracking-wider hover:bg-transparent ml-auto"
                  >
                    Monthly Rev
                    {getSortIcon('monthlyRate')}
                  </Button>
                </TableHead>
                <TableHead className="px-6 py-4 w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#f1f5f9]">
              {isLoading ? (
                Array(5).fill(null).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="px-6 py-4"><Skeleton className="h-10 w-14 rounded-lg" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="px-6 py-4 text-center"><Skeleton className="h-5 w-20 rounded-full mx-auto" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="px-6 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-lg ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAndSortedAircraft.length > 0 ? (
                filteredAndSortedAircraft.map((aircraft) => (
                  <TableRow
                    key={aircraft.id}
                    className="group hover:bg-[#f8fafc] transition-colors cursor-pointer border-b border-[#f1f5f9]"
                    onClick={() => detailsModal.openModal(aircraft)}
                  >
                    <TableCell className="px-6 py-5">
                      <div className="h-12 w-16 rounded-xl overflow-hidden border border-white shadow-md shrink-0">
                        <AircraftImage
                          src={aircraft.image || ''}
                          alt={aircraft.registration}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-[#1e293b] font-mono group-hover:text-brand transition-colors leading-none">
                          {aircraft.registration}
                        </span>
                        <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest mt-1">Airframe ID</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-[#1e293b]">{aircraft.make} {aircraft.model}</span>
                        <span className="text-[11px] text-[#64748b] font-medium">{aircraft.year} Manufacturing</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-center">
                      <span className={cn(
                        "px-3 py-1 text-[10px] font-bold rounded-xl border shadow-sm uppercase tracking-wider",
                        getModernStatusStyles(aircraft.status || '')
                      )}>
                        {aircraft.status || 'Active'}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-[#1e293b]">{aircraft.owner?.name || "Global Aviation Group"}</span>
                        <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest mt-0.5">Asset Custodian</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[15px] font-bold text-[#1e293b] font-mono">
                          {aircraft.currentLease ? formatCurrency(aircraft.currentLease.monthlyRate) : "$0.00"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-[#cbd5e1] hover:text-brand hover:bg-blue-50 rounded-2xl"
                          onClick={(e) => { e.stopPropagation(); detailsModal.openModal(aircraft); }}
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-[#cbd5e1] hover:text-red-500 hover:bg-red-50 rounded-2xl"
                          onClick={(e) => { e.stopPropagation(); setDeleteAircraft(aircraft); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="px-6 py-20 text-center">
                    <div className="bg-[#f8fafc] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Search className="h-6 w-6 text-[#cbd5e1]" />
                    </div>
                    <h3 className="text-[16px] font-bold text-[#1e293b]">No aircraft found</h3>
                    <p className="text-[13px] text-[#64748b] mt-1 mb-6">Try searching for something else or clearing filters.</p>
                    <Button variant="outline" className="rounded-xl px-6 h-9" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>Reset Filters</Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modals & Dialogs */}
      {addAircraftModal.isOpen && (
        <AddAircraftForm isOpen={addAircraftModal.isOpen} onClose={addAircraftModal.closeModal} />
      )}

      {detailsModal.isOpen && detailsModal.data && (
        <AircraftDetailsModal
          isOpen={detailsModal.isOpen}
          onClose={detailsModal.closeModal}
          aircraft={detailsModal.data}
          onViewOwner={(ownerId) => { setSelectedOwnerId(ownerId); setOwnerDrawerOpen(true); }}
          onViewLessee={(lesseeId) => { setSelectedLesseeId(lesseeId); setLesseeDrawerOpen(true); }}
        />
      )}

      <AlertDialog open={!!deleteAircraft} onOpenChange={(open) => { if (!open) setDeleteAircraft(null); }}>
        <AlertDialogContent className="rounded-2xl border-[#f1f5f9] shadow-2xl p-8">
          <AlertDialogHeader>
            <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-[#1e293b]">Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-relaxed text-[#64748b] pt-2">
              Are you sure you want to permanently remove <span className="text-[#1e293b] font-bold">{deleteAircraft?.registration}</span> from the fleet database? This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-8 flex gap-3">
            <AlertDialogCancel className="rounded-xl h-11 px-6 font-bold text-[#64748b] border-[#e2e8f0]">Cancel Action</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 rounded-xl h-11 px-8 font-bold"
              onClick={() => { if (deleteAircraft) deleteAircraftMutation.mutate(deleteAircraft.id); }}
            >
              {deleteAircraftMutation.isPending ? "Removing..." : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Entity Detail Drawers */}
      <OwnerDetailDrawer
        isOpen={ownerDrawerOpen}
        onClose={() => setOwnerDrawerOpen(false)}
        ownerId={selectedOwnerId}
        onViewAircraft={(ac) => detailsModal.openModal(ac)}
      />
      <LesseeDetailDrawer
        isOpen={lesseeDrawerOpen}
        onClose={() => setLesseeDrawerOpen(false)}
        lesseeId={selectedLesseeId}
        onViewAircraft={(ac) => detailsModal.openModal(ac as AircraftWithDetails)}
      />
    </div>
  );
}
