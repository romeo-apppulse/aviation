import { useQuery } from "@tanstack/react-query";
import { LeaseWithDetails } from "@shared/schema";
import { useState } from "react";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { useModal } from "@/hooks/use-modal";
import { Helmet } from "react-helmet";
import { Plus, FileText, Search, Filter, Calendar, DollarSign, Grid3X3, List, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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

export default function Leases() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('aircraft');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const addLeaseModal = useModal(false);
  const viewLeaseModal = useModal<LeaseWithDetails>(false);

  const { data: leases, isLoading } = useQuery<LeaseWithDetails[]>({
    queryKey: ["/api/leases"],
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
    ? filteredLeases.sort((a, b) => {
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

  return (
    <>
      <Helmet>
        <title>Lease Agreements - AeroLease Manager</title>
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
          className="bg-[#3498db] hover:bg-[#2980b9] text-white"
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
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3498db]"></div>
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
                          variant={lease.status === 'Active' ? 'default' : 'secondary'}
                          className={getStatusColor(lease.status)}
                        >
                          {lease.status}
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
                          <span className="font-semibold text-[#3498db]">
                            {formatCurrency(lease.monthlyRate)}/month
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewLeaseModal.openModal(lease);
                          }}
                          className="w-full"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
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
                        <TableCell>
                          <Badge
                            className={getStatusColor(lease.status)}
                            variant="outline"
                          >
                            {lease.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
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
                  className="bg-[#3498db] hover:bg-[#2980b9] text-white"
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
    </>
  );
}
