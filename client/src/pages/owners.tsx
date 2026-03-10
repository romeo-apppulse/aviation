import { useQuery, useMutation } from "@tanstack/react-query";
import { Owner, InsertOwner, AircraftWithDetails } from "@shared/schema";
import { useState, useEffect } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useModal } from "@/hooks/use-modal";
import { Plus, Mail, Phone, MapPin, User, Search, Edit, Trash2, Grid3X3, List, ArrowUpDown, ArrowUp, ArrowDown, Eye, MoreHorizontal, RefreshCw, Copy, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import OwnerDetailDrawer from "@/components/owners/owner-detail-drawer";
import AircraftDetailsModal from "@/components/aircraft/aircraft-details-modal";
import { Helmet } from "react-helmet";
import { formatCurrency, cn } from "@/lib/utils";
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
  const [cancelInviteOwner, setCancelInviteOwner] = useState<Owner | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const aircraftModal = useModal<AircraftWithDetails>(false);
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

  const resendInviteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/owners/${id}/resend-invite`),
    onSuccess: () => {
      toast({ title: "Invite resent successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to resend invite: ${error.message}`, variant: "destructive" });
    }
  });

  const cancelInviteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/owners/${id}/invite`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owners"] });
      setCancelInviteOwner(null);
      toast({ title: "Invite cancelled" });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Failed to cancel invite: ${error.message}`, variant: "destructive" });
    }
  });

  async function copyInviteLink(id: number) {
    try {
      const res = await apiRequest("GET", `/api/owners/${id}/invite-link`);
      const data = await res.json() as { link: string };
      await navigator.clipboard.writeText(data.link);
      toast({ title: "Invite link copied to clipboard" });
    } catch {
      toast({ title: "Error", description: "Failed to copy invite link", variant: "destructive" });
    }
  }

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
        <title>Asset Owners — AeroLease Wise</title>
      </Helmet>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight text-[#1e293b]">Aircraft Owners</h1>
          <p className="text-[14px] text-[#64748b] font-medium mt-1">
            Manage all aircraft owners and their details
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingOwner(null);
            setAddOwnerOpen(true);
          }}
          className="bg-brand hover:bg-brand-hover text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Owner
        </Button>
      </div>

      <Card className="rounded-2xl border-[#f1f5f9] shadow-sm mb-6 bg-white/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
              <Input
                type="text"
                placeholder="Search owners by name or email..."
                className="pl-10 h-11 border-[#e2e8f0] focus:border-brand focus:ring-brand rounded-xl transition-all text-[14px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6)
            .fill(null)
            .map((_, index) => (
              <Card key={index} className="rounded-[24px] border-[#f1f5f9] shadow-sm overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : filteredAndSortedOwners.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedOwners.map((owner) => (
              <Card key={owner.id} className="rounded-[24px] border-[#f1f5f9] shadow-sm bg-white hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-[#1e293b]">{owner.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-[#64748b] flex items-center">
                          <User className="h-3.5 w-3.5 mr-1" />
                          Owner
                        </p>
                        {owner.portalStatus && owner.portalStatus !== "none" && (
                          <Badge
                            variant="outline"
                            className={
                              owner.portalStatus === "active"
                                ? "text-green-700 border-green-300 bg-green-50 text-xs"
                                : owner.portalStatus === "invited"
                                ? "text-blue-700 border-blue-300 bg-blue-50 text-xs"
                                : "text-[#475569] border-slate-100 bg-slate-50 text-xs"
                            }
                          >
                            {owner.portalStatus}
                          </Badge>
                        )}
                        {owner.portalStatus === "invited" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 p-0" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => resendInviteMutation.mutate(owner.id)}>
                                <RefreshCw className="h-4 w-4 mr-2 text-blue-600" />
                                Resend Invite
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyInviteLink(owner.id)}>
                                <Copy className="h-4 w-4 mr-2 text-gray-600" />
                                Copy Invite Link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setCancelInviteOwner(owner)}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Invite
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
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
                      <Mail className="h-4 w-4 mr-2 text-[#64748b]" />
                      <a href={`mailto:${owner.email}`} className="text-brand">
                        {owner.email}
                      </a>
                    </div>

                    {owner.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-[#64748b]" />
                        <a href={`tel:${owner.phone}`} className="text-[#475569]">
                          {owner.phone}
                        </a>
                      </div>
                    )}

                    {owner.address && (
                      <div className="flex items-start text-sm">
                        <MapPin className="h-4 w-4 mr-2 text-[#64748b] mt-0.5" />
                        <span className="text-[#475569]">{owner.address}</span>
                      </div>
                    )}
                  </div>

                  {owner.paymentDetails && (
                    <div className="mt-4 p-3 bg-white rounded-md border border-slate-100 text-sm">
                      <p className="font-medium text-[#475569] mb-1">Payment Details</p>
                      <p className="text-[#64748b]">{owner.paymentDetails}</p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOwnerId(owner.id);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Portfolio
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl border-[#f1f5f9] shadow-sm overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f8fafc] border-b border-[#f1f5f9] hover:bg-[#f8fafc]">
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
                  <TableHead>Portal Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedOwners.map((owner) => (
                  <TableRow key={owner.id} className="hover:bg-[#f8fafc] transition-colors border-b border-[#f1f5f9]">
                    <TableCell className="font-medium text-[#1e293b]">{owner.name}</TableCell>
                    <TableCell>
                      <a href={`mailto:${owner.email}`} className="text-brand hover:underline">
                        {owner.email}
                      </a>
                    </TableCell>
                    <TableCell>
                      {owner.phone ? (
                        <a href={`tel:${owner.phone}`} className="text-[#475569] hover:underline">
                          {owner.phone}
                        </a>
                      ) : (
                        <span className="text-[#94a3b8]">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {owner.address ? (
                        <span className="text-[#475569]">{owner.address}</span>
                      ) : (
                        <span className="text-[#94a3b8]">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {owner.portalStatus && owner.portalStatus !== "none" ? (
                          <Badge
                            variant="outline"
                            className={
                              owner.portalStatus === "active"
                                ? "text-green-700 border-green-300 bg-green-50 text-xs"
                                : owner.portalStatus === "invited"
                                ? "text-blue-700 border-blue-300 bg-blue-50 text-xs"
                                : "text-[#475569] border-slate-100 bg-slate-50 text-xs"
                            }
                          >
                            {owner.portalStatus}
                          </Badge>
                        ) : (
                          <span className="text-[#94a3b8] text-xs">—</span>
                        )}
                        {owner.portalStatus === "invited" && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => resendInviteMutation.mutate(owner.id)}>
                                <RefreshCw className="h-4 w-4 mr-2 text-blue-600" />
                                Resend Invite
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyInviteLink(owner.id)}>
                                <Copy className="h-4 w-4 mr-2 text-gray-600" />
                                Copy Invite Link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setCancelInviteOwner(owner)}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancel Invite
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedOwnerId(owner.id)}
                          title="View Portfolio"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
          <div className="mx-auto h-16 w-16 rounded-full bg-[#f8fafc] flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-[#cbd5e1]" />
          </div>
          <h3 className="text-lg font-medium text-[#1e293b] mb-1">No owners found</h3>
          <p className="text-[#64748b] mb-4">
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
              className="bg-brand hover:bg-brand-hover text-white"
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
                  className="bg-brand hover:bg-brand-hover text-white"
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

      {/* Owner Detail Drawer */}
      {selectedOwnerId && (
        <OwnerDetailDrawer
          isOpen={!!selectedOwnerId}
          onClose={() => setSelectedOwnerId(null)}
          ownerId={selectedOwnerId}
          onViewAircraft={(aircraft) => {
            setSelectedOwnerId(null);
            aircraftModal.openModal(aircraft);
          }}
        />
      )}

      {/* Aircraft Details Modal (from owner drawer) */}
      {aircraftModal.isOpen && aircraftModal.data && (
        <AircraftDetailsModal
          isOpen={aircraftModal.isOpen}
          onClose={aircraftModal.closeModal}
          aircraft={aircraftModal.data}
        />
      )}

      {/* Cancel Invite Confirmation */}
      <AlertDialog open={!!cancelInviteOwner} onOpenChange={(open) => {
        if (!open) setCancelInviteOwner(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invite</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the portal invite for "{cancelInviteOwner?.name}"? They will no longer be able to use the invite link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (cancelInviteOwner) {
                  cancelInviteMutation.mutate(cancelInviteOwner.id);
                }
              }}
            >
              {cancelInviteMutation.isPending ? "Cancelling..." : "Cancel Invite"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
