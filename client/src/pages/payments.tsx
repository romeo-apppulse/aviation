import { useQuery, useMutation } from "@tanstack/react-query";
import { Payment, Lease, LeaseWithDetails, PaymentWithDetails, AircraftWithDetails } from "@shared/schema";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatDate, getStatusColor, cn } from "@/lib/utils";
import { Helmet } from "react-helmet";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useModal } from "@/hooks/use-modal";
import { CalendarIcon, Check, Clock, DollarSign, Plus, Search, Filter, FileText, Plane, ArrowUpDown, ArrowUp, ArrowDown, Upload, Link2, X, Download, Trash2 } from "lucide-react";
import AircraftDetailsModal from "@/components/aircraft/aircraft-details-modal";
import LesseeDetailDrawer from "@/components/lessees/lessee-detail-drawer";
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
import { format } from "date-fns";

const paymentFormSchema = z.object({
  leaseId: z.number({
    required_error: "Please select a lease agreement",
  }),
  amount: z.string().min(1, "Amount is required")
    .transform(val => parseFloat(val)),
  period: z.string().min(1, "Period is required"),
  dueDate: z.date({
    required_error: "Due date is required",
  }),
  paidDate: z.date().optional(),
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
  invoiceUrl: z.string().optional(),
  invoiceNumber: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

type SortField = 'period' | 'amount' | 'dueDate' | 'paidDate' | 'status';
type SortDirection = 'asc' | 'desc';

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [markAsPaidId, setMarkAsPaidId] = useState<number | null>(null);
  const [deletePayment, setDeletePayment] = useState<Payment | null>(null);
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [invoiceMode, setInvoiceMode] = useState<"url" | "file">("url");
  const [selectedInvoiceFile, setSelectedInvoiceFile] = useState<File | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<string>("");
  const aircraftModal = useModal<AircraftWithDetails>();
  const [selectedLesseeId, setSelectedLesseeId] = useState<number>(0);
  const [lesseeDrawerOpen, setLesseeDrawerOpen] = useState(false);
  const { toast } = useToast();

  const { data: payments, isLoading } = useQuery<PaymentWithDetails[]>({
    queryKey: ["/api/payments"],
  });

  const { data: leases } = useQuery<LeaseWithDetails[]>({
    queryKey: ["/api/leases"],
    enabled: addPaymentOpen,
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
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4 text-brand" /> : <ArrowDown className="h-4 w-4 text-brand" />;
  };

  const filteredAndSortedPayments = payments
    ? payments
      .filter((payment) => {
        const matchesSearch =
          payment.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (payment.notes && payment.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (payment.lease?.aircraft?.registration.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (payment.lease?.lessee?.name.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === "all" || payment.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'period':
            aValue = a.period.toLowerCase();
            bValue = b.period.toLowerCase();
            break;
          case 'amount':
            aValue = a.amount;
            bValue = b.amount;
            break;
          case 'dueDate':
            aValue = new Date(a.dueDate);
            bValue = new Date(b.dueDate);
            break;
          case 'paidDate':
            aValue = a.paidDate ? new Date(a.paidDate) : new Date('1900-01-01');
            bValue = b.paidDate ? new Date(b.paidDate) : new Date('1900-01-01');
            break;
          case 'status':
            aValue = (a.status || '').toLowerCase();
            bValue = (b.status || '').toLowerCase();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      })
    : [];

  const createPaymentMutation = useMutation({
    mutationFn: (data: PaymentFormValues) =>
      apiRequest("POST", "/api/payments", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      handleCloseForm();
      toast({
        title: "Payment created",
        description: "The payment has been created successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create payment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Payment> }) =>
      apiRequest("PUT", `/api/payments/${id}`, data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setMarkAsPaidId(null);
      toast({
        title: "Payment updated",
        description: "The payment has been marked as paid",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update payment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setDeletePayment(null);
      toast({
        title: "Payment deleted",
        description: "The payment has been deleted successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete payment: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle invoice file selection
  const handleInvoiceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedInvoiceFile(file);
      setInvoicePreview(file.name);
    }
  };

  // Convert file to base64 for storage
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Generate invoice download
  const generateInvoiceDownload = (payment: Payment) => {
    if (!payment.invoiceUrl) {
      toast({
        title: "No invoice available",
        description: "This payment doesn't have an invoice attached.",
        variant: "destructive",
      });
      return;
    }

    // If it's a base64 string, create a download link
    if (payment.invoiceUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = payment.invoiceUrl;
      link.download = `invoice-${payment.invoiceNumber || payment.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // If it's a URL, open in new tab
      window.open(payment.invoiceUrl, '_blank');
    }
  };

  // Reset form and invoice state when dialog closes
  const handleCloseForm = () => {
    try {
      setSelectedInvoiceFile(null);
      setInvoicePreview("");
      setInvoiceMode("url");
      form.reset();
      setAddPaymentOpen(false);
    } catch (error) {
      console.error("Error closing form:", error);
      // Force close even if there's an error
      setAddPaymentOpen(false);
    }
  };

  const form = useForm({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      leaseId: 0,
      amount: "",
      period: "",
      dueDate: new Date(),
      paidDate: undefined,
      status: "Pending",
      notes: "",
      invoiceUrl: "",
      invoiceNumber: "",
    },
  });

  async function onSubmit(values: any) {
    if (createPaymentMutation.isPending) return;

    try {
      let invoiceData = values.invoiceUrl || "";

      // If file mode and a file is selected, convert to base64
      if (invoiceMode === "file" && selectedInvoiceFile) {
        invoiceData = await convertFileToBase64(selectedInvoiceFile);
      }

      // Prepare the final data
      const finalData = {
        ...values,
        invoiceUrl: invoiceData,
        invoiceNumber: values.invoiceNumber || "",
        notes: values.notes || "",
      };

      createPaymentMutation.mutate(finalData);
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: "Failed to process invoice file",
        variant: "destructive",
      });
    }
  }

  // Handling lease selection to auto-populate amount
  const onLeaseChange = (leaseId: number) => {
    const selectedLease = leases?.find(lease => lease.id === leaseId);
    if (selectedLease) {
      form.setValue("amount", selectedLease.monthlyRate.toString());
    }
  };

  const markAsPaid = (paymentId: number) => {
    updatePaymentMutation.mutate({
      id: paymentId,
      data: {
        status: "Paid",
        paidDate: new Date().toISOString()
      }
    });
  };

  return (
    <>
      <Helmet>
        <title>Payments - AeroLease Manager</title>
        <meta name="description" content="Track and manage payments for aircraft leases" />
      </Helmet>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage all lease payments
          </p>
        </div>
        <Button
          onClick={() => setAddPaymentOpen(true)}
          className="bg-brand hover:bg-brand-hover text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search by period or notes..."
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
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
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
          ) : filteredAndSortedPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        onClick={() => handleSort('period')}
                        className={cn("flex items-center gap-2 transition-colors", sortField === 'period' ? "text-brand" : "hover:text-gray-900")}
                      >
                        Period {getSortIcon('period')}
                      </button>
                    </TableHead>
                    <TableHead>Aircraft</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('amount')}
                        className={cn("flex items-center gap-2 transition-colors", sortField === 'amount' ? "text-brand" : "hover:text-gray-900")}
                      >
                        Amount {getSortIcon('amount')}
                      </button>
                    </TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('dueDate')}
                        className={cn("flex items-center gap-2 transition-colors", sortField === 'dueDate' ? "text-brand" : "hover:text-gray-900")}
                      >
                        Due Date {getSortIcon('dueDate')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('paidDate')}
                        className={cn("flex items-center gap-2 transition-colors", sortField === 'paidDate' ? "text-brand" : "hover:text-gray-900")}
                      >
                        Paid Date {getSortIcon('paidDate')}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('status')}
                        className={cn("flex items-center gap-2 transition-colors", sortField === 'status' ? "text-brand" : "hover:text-gray-900")}
                      >
                        Status {getSortIcon('status')}
                      </button>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="font-medium">{payment.period}</div>
                        <div className="text-xs text-gray-500">{payment.invoiceNumber || 'No Invoice #'}</div>
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center cursor-pointer group"
                          onClick={() => {
                            if (payment.lease?.aircraft) {
                              aircraftModal.openModal(payment.lease.aircraft as AircraftWithDetails);
                            }
                          }}
                        >
                          <Plane className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="font-medium text-brand group-hover:underline">{payment.lease?.aircraft?.registration || 'N/A'}</span>
                        </div>
                        <div className="text-xs text-gray-500">{payment.lease?.aircraft?.make} {payment.lease?.aircraft?.model}</div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={payment.lease?.lessee ? "font-medium text-brand hover:underline cursor-pointer" : "font-medium"}
                          onClick={() => {
                            if (payment.lease?.lessee) {
                              setSelectedLesseeId(payment.lease.lessee.id);
                              setLesseeDrawerOpen(true);
                            }
                          }}
                        >
                          {payment.lease?.lessee?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">{payment.lease?.lessee?.email}</div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="font-mono text-gray-600">
                        {payment.grossAmount != null ? formatCurrency(payment.grossAmount) : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell className="font-mono text-gray-600">
                        {payment.commissionAmount != null ? formatCurrency(payment.commissionAmount) : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell className="font-mono text-gray-600">
                        {payment.netAmount != null ? formatCurrency(payment.netAmount) : <span className="text-gray-400">—</span>}
                      </TableCell>
                      <TableCell>
                        {formatDate(payment.dueDate)}
                      </TableCell>
                      <TableCell>
                        {payment.paidDate ? formatDate(payment.paidDate) : 'Not paid'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={getStatusColor(payment.status || '')}
                          variant="outline"
                        >
                          {payment.status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {payment.status !== "Paid" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => setMarkAsPaidId(payment.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Mark as Paid
                            </Button>
                          )}
                          {payment.invoiceUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-brand border-blue-100 hover:bg-blue-50"
                              onClick={() => generateInvoiceDownload(payment)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Invoice
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletePayment(payment)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
                <DollarSign className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No payments found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by recording a payment"}
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
                  onClick={() => setAddPaymentOpen(true)}
                  className="bg-brand hover:bg-brand-hover text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card >

      {/* Add Payment Dialog */}
      < Dialog open={addPaymentOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseForm();
        }
      }
      }>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
            <DialogDescription>
              Enter the payment details for an aircraft lease
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="leaseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lease Agreement</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        onLeaseChange(parseInt(value));
                      }}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a lease agreement" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leases?.map((lease) => (
                          <SelectItem key={lease.id} value={lease.id.toString()}>
                            <div className="flex items-center">
                              <Plane className="h-4 w-4 mr-2 text-gray-500" />
                              <span>
                                {lease.aircraft?.registration} - {lease.lessee?.name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. January 2024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
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
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch("status") === "Paid" && (
                <FormField
                  control={form.control}
                  name="paidDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Payment Date</FormLabel>
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
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. INV-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Document (Optional)</FormLabel>

                    {/* Toggle between URL and File upload */}
                    <div className="flex gap-2 mb-3">
                      <Button
                        type="button"
                        variant={invoiceMode === "url" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setInvoiceMode("url");
                          setSelectedInvoiceFile(null);
                          setInvoicePreview("");
                        }}
                        className="flex items-center gap-2"
                      >
                        <Link2 className="w-4 h-4" />
                        URL
                      </Button>
                      <Button
                        type="button"
                        variant={invoiceMode === "file" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setInvoiceMode("file");
                          form.setValue("invoiceUrl", "");
                        }}
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </Button>
                    </div>

                    {invoiceMode === "url" ? (
                      <FormControl>
                        <Input
                          placeholder="URL to invoice document"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setInvoicePreview(e.target.value);
                          }}
                        />
                      </FormControl>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                            onChange={handleInvoiceFileChange}
                            className="flex-1"
                          />
                          {selectedInvoiceFile && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedInvoiceFile(null);
                                setInvoicePreview("");
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        {selectedInvoiceFile && (
                          <p className="text-sm text-gray-600">
                            Selected: {selectedInvoiceFile.name} ({(selectedInvoiceFile.size / 1024).toFixed(1)}KB)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Invoice Preview */}
                    {invoicePreview && invoiceMode === "file" && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium">{invoicePreview}</span>
                        </div>
                      </div>
                    )}

                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForm}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand hover:bg-brand-hover text-white"
                  disabled={createPaymentMutation.isPending}
                >
                  {createPaymentMutation.isPending ? "Saving..." : "Record Payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog >

      {/* Mark as Paid Confirmation */}
      < Dialog open={markAsPaidId !== null} onOpenChange={(open) => {
        if (!open) setMarkAsPaidId(null);
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Mark Payment as Paid</DialogTitle>
            <DialogDescription>
              This will record the payment as paid today. Do you want to continue?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setMarkAsPaidId(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={updatePaymentMutation.isPending}
              onClick={() => {
                if (markAsPaidId !== null) {
                  markAsPaid(markAsPaidId);
                }
              }}
            >
              {updatePaymentMutation.isPending ? (
                <span className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-opacity-50 border-t-transparent rounded-full"></div>
                  Processing
                </span>
              ) : (
                <span className="flex items-center">
                  <Check className="mr-2 h-4 w-4" />
                  Confirm Payment
                </span>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog >

      {/* Delete Payment Confirmation */}
      < AlertDialog open={!!deletePayment} onOpenChange={(open) => {
        if (!open) setDeletePayment(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record for "{deletePayment?.period}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (deletePayment) {
                  deletePaymentMutation.mutate(deletePayment.id);
                }
              }}
            >
              {deletePaymentMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog >

      {/* Entity Detail Modals/Drawers */}
      {aircraftModal.data && (
        <AircraftDetailsModal
          isOpen={aircraftModal.isOpen}
          onClose={aircraftModal.closeModal}
          aircraft={aircraftModal.data}
          onViewLessee={(lesseeId) => { setSelectedLesseeId(lesseeId); setLesseeDrawerOpen(true); }}
        />
      )}
      <LesseeDetailDrawer
        isOpen={lesseeDrawerOpen}
        onClose={() => setLesseeDrawerOpen(false)}
        lesseeId={selectedLesseeId}
        onViewAircraft={(ac) => aircraftModal.openModal(ac as AircraftWithDetails)}
      />
    </>
  );
}
