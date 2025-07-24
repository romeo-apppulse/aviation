import { useQuery, useMutation } from "@tanstack/react-query";
import { AircraftWithDetails } from "@shared/schema";
import { useState } from "react";
import { useModal } from "@/hooks/use-modal";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { AircraftImage } from "@/components/ui/aircraft-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet";
import { Search, Plus, Filter, Grid3X3, List, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
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
        variant: "default",
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
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
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
    <>
      <Helmet>
        <title>Aircraft Fleet - AeroLease Manager</title>
        <meta name="description" content="Manage your aircraft fleet inventory, status, and details" />
      </Helmet>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aircraft Fleet</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all aircraft in your fleet
          </p>
        </div>
        <Button 
          onClick={() => addAircraftModal.openModal()}
          className="bg-[#3498db] hover:bg-[#2980b9] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Aircraft
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter Aircraft</CardTitle>
          <CardDescription>
            Use the filters below to find specific aircraft
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search by registration, make, or model..."
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
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Leased">Leased</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
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

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6)
            .fill(null)
            .map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="h-40 bg-gray-200 animate-pulse" />
                <CardContent className="p-4">
                  <div className="h-5 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-4" />
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))
        ) : filteredAndSortedAircraft.length > 0 ? (
          filteredAndSortedAircraft.map((aircraft) => (
            <Card 
              key={aircraft.id} 
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => detailsModal.openModal(aircraft)}
            >
              <div className="h-40 relative">
                <AircraftImage
                  src={aircraft.image || ''}
                  alt={`${aircraft.make} ${aircraft.model}`}
                  className="w-full h-full"
                />
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(aircraft.status || '')}`}>
                    {aircraft.status || 'Unknown'}
                  </span>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{aircraft.registration}</h3>
                    <p className="text-sm text-gray-500">{aircraft.make} {aircraft.model} ({aircraft.year})</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex-shrink-0">Owner:</span>
                    <span className="font-medium text-right truncate ml-2">{aircraft.owner?.name || "Unassigned"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex-shrink-0">Current Lessee:</span>
                    <span className="font-medium text-right truncate ml-2">{aircraft.currentLease?.lessee?.name || "None"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 flex-shrink-0">Monthly Revenue:</span>
                    <span className="font-mono font-medium text-right">
                      {aircraft.currentLease ? formatCurrency(aircraft.currentLease.monthlyRate) : "$0"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No aircraft found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
            <Button onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
            }}>
              Clear Filters
            </Button>
          </div>
        )}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Image</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('registration')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Registration
                    {getSortIcon('registration')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('make')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Make
                    {getSortIcon('make')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('model')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Model
                    {getSortIcon('model')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('year')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Year
                    {getSortIcon('year')}
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
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('owner')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Owner
                    {getSortIcon('owner')}
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
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5)
                  .fill(null)
                  .map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><div className="h-12 w-16 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 bg-gray-200 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-8 w-8 bg-gray-200 rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))
              ) : filteredAndSortedAircraft.length > 0 ? (
                filteredAndSortedAircraft.map((aircraft) => (
                  <TableRow 
                    key={aircraft.id} 
                    className="hover:bg-gray-50"
                  >
                    <TableCell 
                      className="cursor-pointer"
                      onClick={() => detailsModal.openModal(aircraft)}
                    >
                      <div className="h-12 w-16 rounded overflow-hidden">
                        <AircraftImage
                          src={aircraft.image || ''}
                          alt={`${aircraft.make} ${aircraft.model}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell 
                      className="font-medium cursor-pointer"
                      onClick={() => detailsModal.openModal(aircraft)}
                    >{aircraft.registration}</TableCell>
                    <TableCell 
                      className="cursor-pointer"
                      onClick={() => detailsModal.openModal(aircraft)}
                    >{aircraft.make}</TableCell>
                    <TableCell 
                      className="cursor-pointer"
                      onClick={() => detailsModal.openModal(aircraft)}
                    >{aircraft.model}</TableCell>
                    <TableCell 
                      className="cursor-pointer"
                      onClick={() => detailsModal.openModal(aircraft)}
                    >{aircraft.year}</TableCell>
                    <TableCell 
                      className="cursor-pointer"
                      onClick={() => detailsModal.openModal(aircraft)}
                    >
                      <Badge className={getStatusColor(aircraft.status || '')}>
                        {aircraft.status || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer"
                      onClick={() => detailsModal.openModal(aircraft)}
                    >{aircraft.owner?.name || "Unassigned"}</TableCell>
                    <TableCell 
                      className="font-mono cursor-pointer"
                      onClick={() => detailsModal.openModal(aircraft)}
                    >
                      {aircraft.currentLease ? formatCurrency(aircraft.currentLease.monthlyRate) : "$0"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteAircraft(aircraft);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No aircraft found</h3>
                    <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
                    <Button onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}>
                      Clear Filters
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {addAircraftModal.isOpen && (
        <AddAircraftForm isOpen={addAircraftModal.isOpen} onClose={addAircraftModal.closeModal} />
      )}
      
      {detailsModal.isOpen && detailsModal.data && (
        <AircraftDetailsModal 
          isOpen={detailsModal.isOpen} 
          onClose={detailsModal.closeModal} 
          aircraft={detailsModal.data} 
        />
      )}

      {/* Delete Aircraft Confirmation */}
      <AlertDialog open={!!deleteAircraft} onOpenChange={(open) => {
        if (!open) setDeleteAircraft(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Aircraft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteAircraft?.registration}"? This action cannot be undone and will also delete any associated leases and payments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (deleteAircraft) {
                  deleteAircraftMutation.mutate(deleteAircraft.id);
                }
              }}
            >
              {deleteAircraftMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
