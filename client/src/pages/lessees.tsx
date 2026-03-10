import { useQuery, useMutation } from "@tanstack/react-query";
import { Lessee, InsertLessee, Aircraft, Lease, AircraftWithDetails } from "@shared/schema";
import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useModal } from "@/hooks/use-modal";
import { Plus, Mail, Phone, MapPin, Building2, User, Search, Edit, Trash2, Grid3X3, List, ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import LesseeDetailDrawer from "@/components/lessees/lessee-detail-drawer";
import AircraftDetailsModal from "@/components/aircraft/aircraft-details-modal";
import LeaseAgreementModal from "@/components/leases/lease-agreement-modal";
import { Helmet } from "react-helmet";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Extend the insert schema with validation rules
const lesseeFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  state: z.string().optional(),
  contactPerson: z.string().optional(),
  certificationNumber: z.string().optional(),
  notes: z.string().optional(),
});

type LesseeFormValues = z.infer<typeof lesseeFormSchema>;

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'email' | 'phone' | 'address' | 'contactPerson';
type SortDirection = 'asc' | 'desc';

export default function Lessees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [addLesseeOpen, setAddLesseeOpen] = useState(false);
  const [editingLessee, setEditingLessee] = useState<Lessee | null>(null);
  const [deleteLessee, setDeleteLessee] = useState<Lessee | null>(null);
  const [selectedLesseeId, setSelectedLesseeId] = useState<number | null>(null);
  const aircraftModal = useModal<AircraftWithDetails>(false);
  const leaseModal = useModal<Lease & { aircraft?: Aircraft }>(false);
  const { toast } = useToast();

  const { data: lessees, isLoading } = useQuery<Lessee[]>({
    queryKey: ["/api/lessees"],
  });

  const filteredLessees = lessees
    ? lessees.filter((lessee) =>
      lessee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lessee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lessee.contactPerson && lessee.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
    )
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

  const filteredAndSortedLessees = filteredLessees.length > 0
    ? filteredLessees.sort((a, b) => {
      let aValue = '';
      let bValue = '';

      switch (sortField) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'phone':
          aValue = a.phone || '';
          bValue = b.phone || '';
          break;
        case 'address':
          aValue = a.address || '';
          bValue = b.address || '';
          break;
        case 'contactPerson':
          aValue = a.contactPerson || '';
          bValue = b.contactPerson || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    })
    : [];

  const createLesseeMutation = useMutation({
    mutationFn: (data: InsertLessee) =>
      apiRequest("POST", "/api/lessees", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessees"] });
      setAddLesseeOpen(false);
      toast({
        title: "Flight school added",
        description: "The flight school has been added successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add flight school: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateLesseeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertLessee> }) =>
      apiRequest("PUT", `/api/lessees/${id}`, data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessees"] });
      setEditingLessee(null);
      toast({
        title: "Flight school updated",
        description: "The flight school has been updated successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update flight school: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deleteLesseeMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/lessees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessees"] });
      setDeleteLessee(null);
      toast({
        title: "Flight school deleted",
        description: "The flight school has been deleted successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete flight school: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const form = useForm<LesseeFormValues>({
    resolver: zodResolver(lesseeFormSchema),
    defaultValues: {
      name: editingLessee?.name || "",
      email: editingLessee?.email || "",
      phone: editingLessee?.phone || "",
      address: editingLessee?.address || "",
      state: editingLessee?.state || "",
      contactPerson: editingLessee?.contactPerson || "",
      certificationNumber: editingLessee?.certificationNumber || "",
      notes: editingLessee?.notes || "",
    },
  });

  function onSubmit(values: LesseeFormValues) {
    if (editingLessee) {
      updateLesseeMutation.mutate({ id: editingLessee.id, data: values });
    } else {
      createLesseeMutation.mutate(values);
    }
  }

  // Reset form when editingLessee changes
  useEffect(() => {
    if (editingLessee) {
      form.reset({
        name: editingLessee.name,
        email: editingLessee.email,
        phone: editingLessee.phone || "",
        address: editingLessee.address || "",
        state: editingLessee.state || "",
        contactPerson: editingLessee.contactPerson || "",
        certificationNumber: editingLessee.certificationNumber || "",
        notes: editingLessee.notes || "",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        phone: "",
        address: "",
        state: "",
        contactPerson: "",
        certificationNumber: "",
        notes: "",
      });
    }
  }, [editingLessee, form]);

  return (
    <>
      <Helmet>
        <title>Flight Schools - AeroLease Manager</title>
        <meta name="description" content="Manage flight schools and other aircraft lessees" />
      </Helmet>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flight Schools</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all flight schools and organizations leasing your aircraft
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingLessee(null);
            setAddLesseeOpen(true);
          }}
          className="bg-brand hover:bg-brand-hover text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Flight School
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search by name, email, or contact person..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6)
            .fill(null)
            .map((_, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="h-5 bg-gray-200 rounded animate-pulse mb-2 w-3/4" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 mb-4" />
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : filteredAndSortedLessees.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedLessees.map((lessee) => (
              <Card key={lessee.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{lessee.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-500 flex items-center">
                          <Building2 className="h-3.5 w-3.5 mr-1" />
                          Flight School
                        </p>
                        {lessee.portalStatus && lessee.portalStatus !== "none" && (
                          <Badge
                            variant="outline"
                            className={
                              lessee.portalStatus === "active"
                                ? "text-green-700 border-green-300 bg-green-50 text-xs"
                                : lessee.portalStatus === "invited"
                                ? "text-blue-700 border-blue-300 bg-blue-50 text-xs"
                                : "text-gray-600 border-gray-300 bg-gray-50 text-xs"
                            }
                          >
                            {lessee.portalStatus}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLessee(lessee);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteLessee(lessee);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {lessee.contactPerson && (
                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-gray-700">{lessee.contactPerson}</span>
                      </div>
                    )}

                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-gray-500" />
                      <a href={`mailto:${lessee.email}`} className="text-brand">
                        {lessee.email}
                      </a>
                    </div>

                    {lessee.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <a href={`tel:${lessee.phone}`} className="text-gray-700">
                          {lessee.phone}
                        </a>
                      </div>
                    )}

                    {lessee.address && (
                      <div className="flex items-start text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-gray-500 mt-0.5" />
                        <span className="text-gray-700">{lessee.address}</span>
                      </div>
                    )}
                  </div>

                  {lessee.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm">
                      <p className="font-medium text-gray-700 mb-1">Notes</p>
                      <p className="text-gray-600">{lessee.notes}</p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLesseeId(lessee.id);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('name')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Name
                      {getSortIcon('name')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('email')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Email
                      {getSortIcon('email')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('contactPerson')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Contact Person
                      {getSortIcon('contactPerson')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('phone')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Phone
                      {getSortIcon('phone')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('address')}
                      className="h-auto p-0 font-semibold hover:bg-transparent"
                    >
                      Address
                      {getSortIcon('address')}
                    </Button>
                  </TableHead>
                  <TableHead>Portal Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedLessees.map((lessee) => (
                  <TableRow key={lessee.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{lessee.name}</TableCell>
                    <TableCell>
                      <a href={`mailto:${lessee.email}`} className="text-brand hover:underline">
                        {lessee.email}
                      </a>
                    </TableCell>
                    <TableCell>
                      {lessee.contactPerson ? (
                        <span className="text-gray-700">{lessee.contactPerson}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lessee.phone ? (
                        <a href={`tel:${lessee.phone}`} className="text-gray-700 hover:underline">
                          {lessee.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lessee.address ? (
                        <span className="text-gray-700">{lessee.address}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lessee.portalStatus && lessee.portalStatus !== "none" ? (
                        <Badge
                          variant="outline"
                          className={
                            lessee.portalStatus === "active"
                              ? "text-green-700 border-green-300 bg-green-50 text-xs"
                              : lessee.portalStatus === "invited"
                              ? "text-blue-700 border-blue-300 bg-blue-50 text-xs"
                              : "text-gray-600 border-gray-300 bg-gray-50 text-xs"
                          }
                        >
                          {lessee.portalStatus}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLesseeId(lessee.id)}
                          title="View Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingLessee(lessee)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteLessee(lessee)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No flight schools found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? "Try adjusting your search"
              : "Get started by adding a flight school"}
          </p>
          {searchTerm ? (
            <Button onClick={() => setSearchTerm("")}>
              Clear Search
            </Button>
          ) : (
            <Button
              onClick={() => {
                setEditingLessee(null);
                setAddLesseeOpen(true);
              }}
              className="bg-brand hover:bg-brand-hover text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Flight School
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Lessee Dialog */}
      <Dialog open={addLesseeOpen || !!editingLessee} onOpenChange={(open) => {
        if (!open) {
          setAddLesseeOpen(false);
          setEditingLessee(null);
        }
      }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{editingLessee ? "Edit Flight School" : "Add New Flight School"}</DialogTitle>
            <DialogDescription>
              {editingLessee
                ? "Update the flight school's information below"
                : "Fill in the details to add a new flight school or lessee"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Flight school name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email address" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Primary contact name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Full address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="State / Province" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="certificationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certification Number</FormLabel>
                    <FormControl>
                      <Input placeholder="FAA or regulatory cert number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddLesseeOpen(false);
                    setEditingLessee(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand hover:bg-brand-hover text-white"
                  disabled={createLesseeMutation.isPending || updateLesseeMutation.isPending}
                >
                  {(createLesseeMutation.isPending || updateLesseeMutation.isPending) ? "Saving..." : editingLessee ? "Update Flight School" : "Add Flight School"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLessee} onOpenChange={(open) => {
        if (!open) setDeleteLessee(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the flight school. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (deleteLessee) {
                  deleteLesseeMutation.mutate(deleteLessee.id);
                }
              }}
            >
              {deleteLesseeMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lessee Detail Drawer */}
      {selectedLesseeId && (
        <LesseeDetailDrawer
          isOpen={!!selectedLesseeId}
          onClose={() => setSelectedLesseeId(null)}
          lesseeId={selectedLesseeId}
          onViewAircraft={(aircraft) => {
            setSelectedLesseeId(null);
            aircraftModal.openModal(aircraft as AircraftWithDetails);
          }}
          onViewLease={(lease) => {
            setSelectedLesseeId(null);
            leaseModal.openModal(lease);
          }}
        />
      )}

      {/* Aircraft Details Modal (from lessee drawer) */}
      {aircraftModal.isOpen && aircraftModal.data && (
        <AircraftDetailsModal
          isOpen={aircraftModal.isOpen}
          onClose={aircraftModal.closeModal}
          aircraft={aircraftModal.data}
        />
      )}

      {/* Lease Modal (from lessee drawer) */}
      {leaseModal.isOpen && leaseModal.data && (
        <LeaseAgreementModal
          isOpen={leaseModal.isOpen}
          onClose={leaseModal.closeModal}
          lease={leaseModal.data as any}
        />
      )}
    </>
  );
}
