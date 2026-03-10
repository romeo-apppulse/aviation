import { useQuery, useMutation } from "@tanstack/react-query";
import { MaintenanceWithDetails, Aircraft, AircraftWithDetails } from "@shared/schema";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, getStatusColor, getRelativeDateLabel } from "@/lib/utils";
import { Helmet } from "react-helmet";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useModal } from "@/hooks/use-modal";
import { CalendarIcon, CheckCircle, Plus, Search, Filter, Wrench, Plane, ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2 } from "lucide-react";
import AircraftDetailsModal from "@/components/aircraft/aircraft-details-modal";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

const maintenanceFormSchema = z.object({
  aircraftId: z.number({
    required_error: "Please select an aircraft",
  }),
  type: z.string().min(1, "Maintenance type is required"),
  scheduledDate: z.date({
    required_error: "Scheduled date is required",
  }),
  completedDate: z.date().optional().nullable(),
  cost: z.coerce.number().optional(),
  performedBy: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default("Scheduled"),
});

type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

type SortField = 'aircraft' | 'type' | 'scheduledDate' | 'status' | 'performedBy';
type SortDirection = 'asc' | 'desc';

export default function Maintenance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addMaintenanceOpen, setAddMaintenanceOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceWithDetails | null>(null);
  const [deleteMaintenance, setDeleteMaintenance] = useState<MaintenanceWithDetails | null>(null);
  const [markAsCompleteId, setMarkAsCompleteId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>('scheduledDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const aircraftModal = useModal<AircraftWithDetails>();
  const { toast } = useToast();

  const { data: maintenance, isLoading } = useQuery<MaintenanceWithDetails[]>({
    queryKey: ["/api/maintenance"],
  });

  const { data: aircraft } = useQuery<AircraftWithDetails[]>({
    queryKey: ["/api/aircraft"],
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

  const filteredAndSortedMaintenance = maintenance
    ? maintenance
      .filter((item) => {
        const matchesSearch =
          (item.type || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.aircraft?.registration || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === "all" || item.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'aircraft':
            aValue = (a.aircraft?.registration || "").toLowerCase();
            bValue = (b.aircraft?.registration || "").toLowerCase();
            break;
          case 'type':
            aValue = (a.type || "").toLowerCase();
            bValue = (b.type || "").toLowerCase();
            break;
          case 'scheduledDate':
            aValue = new Date(a.scheduledDate);
            bValue = new Date(b.scheduledDate);
            break;
          case 'status':
            aValue = (a.status || "").toLowerCase();
            bValue = (b.status || "").toLowerCase();
            break;
          case 'performedBy':
            aValue = (a.performedBy || "").toLowerCase();
            bValue = (b.performedBy || "").toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      })
    : [];

  const createMaintenanceMutation = useMutation({
    mutationFn: (data: MaintenanceFormValues) =>
      apiRequest("POST", "/api/maintenance", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aircraft"] });
      setAddMaintenanceOpen(false);
      toast({
        title: "Maintenance scheduled",
        description: "The maintenance has been scheduled successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to schedule maintenance: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updateMaintenanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MaintenanceFormValues> }) =>
      apiRequest("PUT", `/api/maintenance/${id}`, data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aircraft"] });
      setMarkAsCompleteId(null);
      setEditingMaintenance(null);
      toast({
        title: "Maintenance updated",
        description: "The maintenance record has been updated successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update maintenance: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deleteMaintenanceMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/maintenance/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aircraft"] });
      setDeleteMaintenance(null);
      toast({
        title: "Maintenance deleted",
        description: "The maintenance record has been deleted successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete maintenance: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      aircraftId: 0,
      type: "",
      scheduledDate: new Date(),
      completedDate: null,
      cost: 0,
      performedBy: "",
      notes: "",
      status: "Scheduled",
    },
  });

  function onSubmit(values: MaintenanceFormValues) {
    const data = {
      ...values,
      scheduledDate: format(values.scheduledDate, "yyyy-MM-dd"),
      completedDate: values.completedDate ? format(values.completedDate, "yyyy-MM-dd") : null,
    };

    if (editingMaintenance) {
      updateMaintenanceMutation.mutate({
        id: editingMaintenance.id,
        data: data as any
      });
    } else {
      createMaintenanceMutation.mutate(data as any);
    }
  }

  const bulkActionMutation = useMutation({
    mutationFn: ({ ids, action }: { ids: number[]; action: "mark_completed" | "delete" }) =>
      apiRequest("POST", "/api/maintenance/bulk", { ids, action }).then(res => res.json()),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aircraft"] });
      setSelectedIds([]);
      setBulkDeleteOpen(false);
      const labels: Record<string, string> = { mark_completed: "marked as completed", delete: "deleted" };
      toast({ title: "Bulk action complete", description: `${variables.ids.length} record(s) ${labels[variables.action]}` });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Bulk action failed: ${error.message}`, variant: "destructive" });
    }
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAndSortedMaintenance.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSortedMaintenance.map(m => m.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const markAsComplete = (maintenanceId: number) => {
    updateMaintenanceMutation.mutate({
      id: maintenanceId,
      data: {
        status: "Completed",
        completedDate: format(new Date(), "yyyy-MM-dd")
      } as any
    });
  };

  return (
    <>
      <Helmet>
        <title>Maintenance - AeroLease Manager</title>
        <meta name="description" content="Schedule and track aircraft maintenance" />
      </Helmet>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Schedule and track aircraft maintenance
          </p>
        </div>
        <Button
          onClick={() => setAddMaintenanceOpen(true)}
          className="bg-brand hover:bg-brand-hover text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule Maintenance
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search by type, registration, or notes..."
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
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <span className="text-sm font-semibold text-blue-700">{selectedIds.length} selected</span>
          <Button
            size="sm"
            variant="outline"
            className="text-green-600 border-green-200 hover:bg-green-50"
            onClick={() => bulkActionMutation.mutate({ ids: selectedIds, action: "mark_completed" })}
            disabled={bulkActionMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-1" /> Mark Completed
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={bulkActionMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete Selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
            ✕
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
            </div>
          ) : filteredAndSortedMaintenance.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={filteredAndSortedMaintenance.length > 0 && selectedIds.length === filteredAndSortedMaintenance.length}
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('aircraft')}
                        className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                      >
                        Aircraft {getSortIcon('aircraft')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('type')}
                        className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                      >
                        Type {getSortIcon('type')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('scheduledDate')}
                        className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                      >
                        Scheduled Date {getSortIcon('scheduledDate')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                      >
                        Status {getSortIcon('status')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('performedBy')}
                        className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                      >
                        Performed By {getSortIcon('performedBy')}
                      </button>
                    </TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Completed Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedMaintenance.map((item) => (
                    <TableRow key={item.id} className={selectedIds.includes(item.id) ? "bg-blue-50" : ""}>
                      <TableCell className="w-10">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectOne(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div
                          className="flex items-center space-x-2 cursor-pointer group"
                          onClick={() => {
                            if (item.aircraft) {
                              const fullAc = aircraft?.find(a => a.id === item.aircraftId);
                              if (fullAc) aircraftModal.openModal(fullAc);
                            }
                          }}
                        >
                          <Plane className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-brand group-hover:underline">{item.aircraft?.registration || "N/A"}</p>
                            <p className="text-xs text-gray-500">
                              {item.aircraft ? `${item.aircraft.make} ${item.aircraft.model}` : ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>
                        <div>
                          <p>{formatDate(item.scheduledDate)}</p>
                          <p className="text-xs text-gray-500">
                            {getRelativeDateLabel(item.scheduledDate)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusColor(item.status || "Scheduled")}
                          variant="outline"
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.performedBy || "Not assigned"}</TableCell>
                      <TableCell>
                        {item.reportedByLessee ? (
                          <span className="text-sm">{item.reportedByLessee.name}</span>
                        ) : item.performedBy ? (
                          <span className="text-sm">{item.performedBy}</span>
                        ) : (
                          <span className="text-sm text-gray-500">Internal</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono">
                        {item.cost != null && item.cost > 0 ? formatCurrency(item.cost) : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell>
                        {item.completedDate ? formatDate(item.completedDate) : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingMaintenance(item);
                              // Reset form with current data
                              form.reset({
                                aircraftId: item.aircraftId,
                                type: item.type,
                                scheduledDate: new Date(item.scheduledDate),
                                completedDate: item.completedDate ? new Date(item.completedDate) : null,
                                cost: item.cost || 0,
                                performedBy: item.performedBy || "",
                                notes: item.notes || "",
                                status: item.status || "Scheduled",
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteMaintenance(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {item.status !== "Completed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => setMarkAsCompleteId(item.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Complete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Wrench className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No maintenance records found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by scheduling maintenance"}
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
                  onClick={() => setAddMaintenanceOpen(true)}
                  className="bg-brand hover:bg-brand-hover text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Maintenance Dialog */}
      <Dialog open={addMaintenanceOpen || !!editingMaintenance} onOpenChange={(open) => {
        if (!open) {
          setAddMaintenanceOpen(false);
          setEditingMaintenance(null);
          form.reset();
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingMaintenance ? "Edit Maintenance" : "Schedule Maintenance"}</DialogTitle>
            <DialogDescription>
              {editingMaintenance ? "Update maintenance record details" : "Set up maintenance for an aircraft"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="aircraftId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aircraft</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an aircraft" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {aircraft?.map((a) => (
                          <SelectItem key={a.id} value={a.id.toString()}>
                            {a.registration} - {a.make} {a.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maintenance Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="100 Hour Inspection">100 Hour Inspection</SelectItem>
                        <SelectItem value="Annual Inspection">Annual Inspection</SelectItem>
                        <SelectItem value="Engine Overhaul">Engine Overhaul</SelectItem>
                        <SelectItem value="Avionics Check">Avionics Check</SelectItem>
                        <SelectItem value="Routine Service">Routine Service</SelectItem>
                        <SelectItem value="Unscheduled Repair">Unscheduled Repair</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="scheduledDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Scheduled Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Scheduled">Scheduled</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="performedBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Performed By</FormLabel>
                      <FormControl>
                        <Input placeholder="Maintenance provider" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Cost</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2.5 text-gray-500">$</span>
                          <Input type="number" step="0.01" min="0" className="pl-7" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("status") === "Completed" && (
                <FormField
                  control={form.control}
                  name="completedDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Completion Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Maintenance details or notes" {...field} />
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
                    setAddMaintenanceOpen(false);
                    setEditingMaintenance(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand hover:bg-brand-hover text-white"
                  disabled={createMaintenanceMutation.isPending || updateMaintenanceMutation.isPending}
                >
                  {editingMaintenance ?
                    (updateMaintenanceMutation.isPending ? "Updating..." : "Update Maintenance") :
                    (createMaintenanceMutation.isPending ? "Scheduling..." : "Schedule Maintenance")
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Mark as Complete Confirmation */}
      <Dialog open={markAsCompleteId !== null} onOpenChange={(open) => {
        if (!open) setMarkAsCompleteId(null);
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Mark Maintenance as Complete</DialogTitle>
            <DialogDescription>
              This will mark the maintenance as completed today. Do you want to continue?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setMarkAsCompleteId(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={updateMaintenanceMutation.isPending}
              onClick={() => {
                if (markAsCompleteId !== null) {
                  markAsComplete(markAsCompleteId);
                }
              }}
            >
              {updateMaintenanceMutation.isPending ? (
                <span className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-opacity-50 border-t-transparent rounded-full"></div>
                  Processing
                </span>
              ) : (
                <span className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Completion
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Maintenance Confirmation */}
      <AlertDialog open={!!deleteMaintenance} onOpenChange={(open) => {
        if (!open) setDeleteMaintenance(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Maintenance Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this maintenance record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (deleteMaintenance) {
                  deleteMaintenanceMutation.mutate(deleteMaintenance.id);
                }
              }}
            >
              {deleteMaintenanceMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Maintenance Record(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected maintenance records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => bulkActionMutation.mutate({ ids: selectedIds, action: "delete" })}
            >
              {bulkActionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Aircraft Detail Modal */}
      {aircraftModal.data && (
        <AircraftDetailsModal
          isOpen={aircraftModal.isOpen}
          onClose={aircraftModal.closeModal}
          aircraft={aircraftModal.data}
        />
      )}
    </>
  );
}
