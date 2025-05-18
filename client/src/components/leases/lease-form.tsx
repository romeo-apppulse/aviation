import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Aircraft, Lessee, InsertLease } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plane, Building2 } from "lucide-react";
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

interface LeaseFormProps {
  isOpen: boolean;
  onClose: () => void;
}

// Validation schema for the lease form
const leaseFormSchema = z.object({
  aircraftId: z.number({
    required_error: "Aircraft is required",
  }),
  lesseeId: z.number({
    required_error: "Lessee is required",
  }),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  monthlyRate: z.string()
    .min(1, "Monthly rate is required")
    .transform(val => parseFloat(val)),
  minimumHours: z.string()
    .min(1, "Minimum hours is required")
    .transform(val => parseInt(val)),
  hourlyRate: z.string()
    .min(1, "Hourly rate is required")
    .transform(val => parseFloat(val)),
  maintenanceTerms: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().default("Active"),
  documentUrl: z.string().optional(),
});

type LeaseFormValues = z.infer<typeof leaseFormSchema>;

export default function LeaseForm({ isOpen, onClose }: LeaseFormProps) {
  const { toast } = useToast();
  
  // Fetch aircraft and lessees to populate dropdowns
  const { data: aircraft } = useQuery<Aircraft[]>({
    queryKey: ["/api/aircraft"],
    enabled: isOpen,
  });
  
  const { data: lessees } = useQuery<Lessee[]>({
    queryKey: ["/api/lessees"],
    enabled: isOpen,
  });

  // Set up form with validation
  const form = useForm<LeaseFormValues>({
    resolver: zodResolver(leaseFormSchema),
    defaultValues: {
      aircraftId: undefined,
      lesseeId: undefined,
      startDate: undefined,
      endDate: undefined,
      monthlyRate: "",
      minimumHours: "",
      hourlyRate: "",
      maintenanceTerms: "",
      notes: "",
      status: "Active",
      documentUrl: "",
    }
  });

  // Mutation for creating a new lease
  const createLeaseMutation = useMutation({
    mutationFn: (data: InsertLease) => 
      apiRequest("POST", "/api/leases", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/aircraft"] });
      toast({
        title: "Lease created",
        description: "The lease agreement has been created successfully",
        variant: "default",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create lease: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  function onSubmit(values: LeaseFormValues) {
    createLeaseMutation.mutate(values);
  }

  // Filter out already leased aircraft
  const availableAircraft = aircraft?.filter(a => a.status !== "Leased") || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Lease Agreement</DialogTitle>
          <DialogDescription>
            Enter the details of the new lease agreement
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
                      {availableAircraft.length > 0 ? (
                        availableAircraft.map(aircraft => (
                          <SelectItem key={aircraft.id} value={aircraft.id.toString()}>
                            <div className="flex items-center">
                              <Plane className="h-4 w-4 mr-2 text-gray-500" />
                              <span>{aircraft.registration} - {aircraft.make} {aircraft.model}</span>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No available aircraft</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="lesseeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flight School / Lessee</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a flight school" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {lessees?.map(lessee => (
                        <SelectItem key={lessee.id} value={lessee.id.toString()}>
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{lessee.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
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
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
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
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="monthlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Rate</FormLabel>
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
              
              <FormField
                control={form.control}
                name="minimumHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Hours</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="e.g. 40" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="hourlyRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hourly Rate</FormLabel>
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
            
            <FormField
              control={form.control}
              name="maintenanceTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance Terms</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the maintenance responsibilities and terms"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="documentUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="URL to the lease document PDF" {...field} />
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
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional information or special conditions"
                      {...field} 
                    />
                  </FormControl>
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
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                      <SelectItem value="Terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-[#3498db] hover:bg-[#2980b9] text-white"
                disabled={createLeaseMutation.isPending}
              >
                {createLeaseMutation.isPending ? "Creating..." : "Create Lease"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
