import { useQuery, useMutation } from "@tanstack/react-query";
import { Owner, InsertOwner } from "@shared/schema";
import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Mail, Phone, MapPin, User, Search, Edit, Trash2, Grid3X3, List, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Helmet } from "react-helmet";
import { formatCurrency } from "@/lib/utils";
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
const ownerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  paymentDetails: z.string().optional(),
  notes: z.string().optional(),
});

type OwnerFormValues = z.infer<typeof ownerFormSchema>;

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'email' | 'phone' | 'address';
type SortDirection = 'asc' | 'desc';

export default function Owners() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [addOwnerOpen, setAddOwnerOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [deleteOwner, setDeleteOwner] = useState<Owner | null>(null);
  const { toast } = useToast();

  const { data: owners, isLoading } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
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

  const filteredAndSortedOwners = owners
    ? owners
        .filter((owner) =>
          owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          owner.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
          let aValue: any;
          let bValue: any;
          
          switch (sortField) {
            case 'name':
              aValue = a.name.toLowerCase();
              bValue = b.name.toLowerCase();
              break;
            case 'email':
              aValue = a.email.toLowerCase();
              bValue = b.email.toLowerCase();
              break;
            case 'phone':
              aValue = (a.phone || "").toLowerCase();
              bValue = (b.phone || "").toLowerCase();
              break;
            case 'address':
              aValue = (a.address || "").toLowerCase();
              bValue = (b.address || "").toLowerCase();
              break;
            default:
              return 0;
          }
          
          if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        })
    : [];

  const createOwnerMutation = useMutation({
    mutationFn: (data: InsertOwner) => 
      apiRequest("POST", "/api/owners", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      setAddOwnerOpen(false);
      toast({
        title: "Owner created",
        description: "The owner has been added successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create owner: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateOwnerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertOwner> }) => 
      apiRequest("PUT", `/api/owners/${id}`, data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      setEditingOwner(null);
      toast({
        title: "Owner updated",
        description: "The owner has been updated successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update owner: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deleteOwnerMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest("DELETE", `/api/owners/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      setDeleteOwner(null);
      toast({
        title: "Owner deleted",
        description: "The owner has been deleted successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete owner: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const form = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues: {
      name: editingOwner?.name || "",
      email: editingOwner?.email || "",
      phone: editingOwner?.phone || "",
      address: editingOwner?.address || "",
      paymentDetails: editingOwner?.paymentDetails || "",
      notes: editingOwner?.notes || "",
    },
  });

  function onSubmit(values: OwnerFormValues) {
    if (editingOwner) {
      updateOwnerMutation.mutate({ id: editingOwner.id, data: values });
    } else {
      createOwnerMutation.mutate(values);
    }
  }

  // Reset form when editingOwner changes
  useEffect(() => {
    if (editingOwner) {
      form.reset({
        name: editingOwner.name,
        email: editingOwner.email,
        phone: editingOwner.phone || "",
        address: editingOwner.address || "",
        paymentDetails: editingOwner.paymentDetails || "",
        notes: editingOwner.notes || "",
      });
    } else {
      form.reset({
        name: "",
        email: "",
        phone: "",
        address: "",
        paymentDetails: "",
        notes: "",
      });
    }
  }, [editingOwner, form]);

  return (
    <>
      <Helmet>
        <title>Aircraft Owners - AeroLease Manager</title>
        <meta name="description" content="Manage aircraft owners, their contact information, and payment details" />
      </Helmet>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aircraft Owners</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all aircraft owners and their details
          </p>
        </div>
        <Button 
          onClick={() => {
            setEditingOwner(null);
            setAddOwnerOpen(true);
          }}
          className="bg-[#3498db] hover:bg-[#2980b9] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Owner
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search owners by name or email..."
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
      ) : filteredAndSortedOwners.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedOwners.map((owner) => (
            <Card key={owner.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{owner.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <User className="h-3.5 w-3.5 mr-1" />
                      Owner
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingOwner(owner);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteOwner(owner);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-gray-500" />
                    <a href={`mailto:${owner.email}`} className="text-[#3498db]">
                      {owner.email}
                    </a>
                  </div>
                  
                  {owner.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-gray-500" />
                      <a href={`tel:${owner.phone}`} className="text-gray-700">
                        {owner.phone}
                      </a>
                    </div>
                  )}
                  
                  {owner.address && (
                    <div className="flex items-start text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500 mt-0.5" />
                      <span className="text-gray-700">{owner.address}</span>
                    </div>
                  )}
                </div>
                
                {owner.paymentDetails && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm">
                    <p className="font-medium text-gray-700 mb-1">Payment Details</p>
                    <p className="text-gray-600">{owner.paymentDetails}</p>
                  </div>
                )}
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedOwners.map((owner) => (
                  <TableRow key={owner.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{owner.name}</TableCell>
                    <TableCell>
                      <a href={`mailto:${owner.email}`} className="text-[#3498db] hover:underline">
                        {owner.email}
                      </a>
                    </TableCell>
                    <TableCell>
                      {owner.phone ? (
                        <a href={`tel:${owner.phone}`} className="text-gray-700 hover:underline">
                          {owner.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {owner.address ? (
                        <span className="text-gray-700">{owner.address}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingOwner(owner)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteOwner(owner)}
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
            <User className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No owners found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm
              ? "Try adjusting your search"
              : "Get started by adding an aircraft owner"}
          </p>
          {searchTerm ? (
            <Button onClick={() => setSearchTerm("")}>
              Clear Search
            </Button>
          ) : (
            <Button
              onClick={() => {
                setEditingOwner(null);
                setAddOwnerOpen(true);
              }}
              className="bg-[#3498db] hover:bg-[#2980b9] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Owner
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Owner Dialog */}
      <Dialog open={addOwnerOpen || !!editingOwner} onOpenChange={(open) => {
        if (!open) {
          setAddOwnerOpen(false);
          setEditingOwner(null);
        }
      }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{editingOwner ? "Edit Owner" : "Add New Owner"}</DialogTitle>
            <DialogDescription>
              {editingOwner
                ? "Update the owner's information below"
                : "Fill in the details to add a new aircraft owner"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Owner name" {...field} />
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
                name="paymentDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Details</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Bank account, payment method, etc." {...field} />
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
                    setAddOwnerOpen(false);
                    setEditingOwner(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="bg-[#3498db] hover:bg-[#2980b9] text-white"
                  disabled={createOwnerMutation.isPending || updateOwnerMutation.isPending}
                >
                  {(createOwnerMutation.isPending || updateOwnerMutation.isPending) ? "Saving..." : editingOwner ? "Update Owner" : "Add Owner"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteOwner} onOpenChange={(open) => {
        if (!open) setDeleteOwner(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the owner. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (deleteOwner) {
                  deleteOwnerMutation.mutate(deleteOwner.id);
                }
              }}
            >
              {deleteOwnerMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
