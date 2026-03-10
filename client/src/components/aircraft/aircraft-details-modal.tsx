import { AircraftWithDetails, UpdateAircraft, updateAircraftSchema } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Maintenance } from "@shared/schema";
import { Check, FileText, File, Plane, Calendar, Clock, Wrench, Edit, Save, X, Upload, Trash2, Trash, Gauge, MapPin, Hash, Zap } from "lucide-react";
import { AircraftImage } from "@/components/ui/aircraft-image";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AircraftDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  aircraft: AircraftWithDetails;
  onViewOwner?: (ownerId: number) => void;
  onViewLessee?: (lesseeId: number) => void;
}

// Helper to get fresh aircraft data
const useFreshAircraft = (aircraft: AircraftWithDetails) => {
  const { data: freshAircraft } = useQuery<AircraftWithDetails[]>({
    queryKey: ["/api/aircraft"],
  });

  return freshAircraft?.find(a => a.id === aircraft.id) || aircraft;
};

export default function AircraftDetailsModal({ isOpen, onClose, aircraft, onViewOwner, onViewLessee }: AircraftDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get fresh aircraft data that updates automatically
  const currentAircraft = useFreshAircraft(aircraft);

  const form = useForm<UpdateAircraft>({
    resolver: zodResolver(updateAircraftSchema),
    defaultValues: {
      registration: currentAircraft.registration,
      make: currentAircraft.make,
      model: currentAircraft.model,
      year: currentAircraft.year,
      status: currentAircraft.status || "available",
      engineType: currentAircraft.engineType || "",
      totalTime: currentAircraft.totalTime || undefined,
      avionics: currentAircraft.avionics || "",
      notes: currentAircraft.notes || "",
      image: currentAircraft.image || "",
    },
  });

  const updateAircraftMutation = useMutation({
    mutationFn: async (data: UpdateAircraft) => {
      const response = await apiRequest("PUT", `/api/aircraft/${aircraft.id}`, data);
      return response.json();
    },
    onSuccess: async (updatedAircraft) => {
      // Invalidate all aircraft-related queries and wait for refetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/aircraft"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/aircraft/${aircraft.id}`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/aircraft/${aircraft.id}/maintenance`] })
      ]);

      // Reset form state
      setIsEditing(false);
      setImageFile(null);
      setImagePreview("");

      toast({
        title: "Success",
        description: "Aircraft updated successfully",
      });
    },
    onError: (error) => {
      console.error("Aircraft update error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update aircraft",
        variant: "destructive",
      });
    },
  });

  const { data: maintenanceRecords } = useQuery<Maintenance[]>({
    queryKey: [`/api/aircraft/${aircraft.id}/maintenance`],
    enabled: isOpen && activeTab === "maintenance",
  });

  const { data: documents } = useQuery<any[]>({
    queryKey: [`/api/entity/aircraft/${aircraft.id}/documents`],
    enabled: isOpen && activeTab === "documents",
  });

  const handleClose = () => {
    setIsEditing(false);
    setImageFile(null);
    setImagePreview("");
    form.reset({
      registration: aircraft.registration,
      make: aircraft.make,
      model: aircraft.model,
      year: aircraft.year,
      status: aircraft.status || "available",
      engineType: aircraft.engineType || "",
      totalTime: aircraft.totalTime || undefined,
      avionics: aircraft.avionics || "",
      notes: aircraft.notes || "",
      image: aircraft.image || "",
    });
    onClose();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit for better performance
      toast({
        title: "Error",
        description: "Image file size must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    // Check if it's a valid image type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please upload a valid image file",
        variant: "destructive",
      });
      return;
    }

    setImageFile(file);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const preview = e.target?.result as string;
        if (preview) {
          setImagePreview(preview);
          form.setValue("image", preview);
        }
      } catch (error) {
        console.error("Error setting image preview:", error);
        toast({
          title: "Error",
          description: "Failed to process image",
          variant: "destructive",
        });
      }
    };

    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      toast({
        title: "Error",
        description: "Failed to read image file",
        variant: "destructive",
      });
    };

    try {
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error reading file:", error);
      toast({
        title: "Error",
        description: "Failed to read image file",
        variant: "destructive",
      });
    }

    // Clear the file input to allow re-uploading the same file
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    form.setValue("image", "");
  };

  const onSubmit = (data: UpdateAircraft) => {
    try {
      // The mutation itself handles async operations and errors
      updateAircraftMutation.mutate(data);
    } catch (error) {
      console.error("Error submitting aircraft update:", error);
      toast({
        title: "Error",
        description: "Failed to submit aircraft update",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-hidden p-0 rounded-[28px] border-[#f1f5f9] shadow-2xl bg-white flex flex-col" aria-describedby="aircraft-details-description">
        {/* Modal Header Section */}
        <div className="px-8 pt-8 pb-6 bg-[#f8fafc]/50 border-b border-[#f1f5f9]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="bg-[#6366f1] p-2 rounded-xl text-white shadow-sm">
                  <Plane className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-[#1e293b]">
                    {isEditing ? "Modify Primary Asset" : aircraft.registration}
                  </h3>
                  <p id="aircraft-details-description" className="text-[14px] text-[#64748b] font-medium">
                    {isEditing
                      ? "Updating core specifications and configuration"
                      : `${aircraft.year} ${aircraft.make} ${aircraft.model}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl px-5 border-[#e2e8f0] font-bold text-[#64748b] hover:bg-white"
                    onClick={() => {
                      setIsEditing(false);
                      form.reset();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-10 rounded-xl px-6 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold shadow-sm transition-all"
                    disabled={updateAircraftMutation.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      form.handleSubmit(onSubmit)();
                    }}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateAircraftMutation.isPending ? "Syncing..." : "Commit Update"}
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-4 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-widest border shadow-sm",
                    aircraft.status?.toLowerCase() === 'available' ? "bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]" :
                      aircraft.status?.toLowerCase() === 'leased' ? "bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]" :
                        "bg-[#fff7ed] text-[#ea580c] border-[#ffedd5]"
                  )}>
                    {aircraft.status || 'Active'}
                  </span>
                  <Button
                    variant="outline"
                    className="h-11 w-11 p-0 rounded-xl border-[#e2e8f0] bg-white hover:bg-[#f8fafc] group transition-all"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-5 w-5 text-[#64748b] group-hover:text-[#6366f1]" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Image Upload Area */}
                    <div className="lg:col-span-4 space-y-6">
                      <div className="relative group rounded-2xl overflow-hidden border-2 border-dashed border-[#e2e8f0] hover:border-[#6366f1] transition-all bg-[#f8fafc]">
                        <AircraftImage
                          className="w-full aspect-video object-cover"
                          src={imagePreview || form.watch("image") || undefined}
                          alt="Aircraft Preview"
                          fallbackClassName="rounded-2xl"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => document.getElementById('image-upload')?.click()}
                            className="rounded-xl font-bold"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Replace
                          </Button>
                          {form.watch("image") && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={handleRemoveImage}
                              className="rounded-xl font-bold"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </div>

                      <FormField
                        control={form.control}
                        name="image"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Image URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} value={field.value ?? ""} className="h-11 rounded-xl border-[#e2e8f0] text-[14px]" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Primary Form Fields */}
                    <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">

                      <FormField
                        control={form.control}
                        name="registration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Registration</FormLabel>
                            <FormControl>
                              <Input placeholder="N-XXXXX" {...field} className="h-11 rounded-xl border-[#e2e8f0]" />
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
                            <FormLabel className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                              <FormControl>
                                <SelectTrigger className="h-11 rounded-xl border-[#e2e8f0]">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="available">Available</SelectItem>
                                <SelectItem value="leased">Leased</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="make"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Make</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Cessna" {...field} className="h-11 rounded-xl border-[#e2e8f0]" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Model</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 172 Skyhawk" {...field} className="h-11 rounded-xl border-[#e2e8f0]" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-6 border-t border-[#f1f5f9]">
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Year</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="h-11 rounded-xl border-[#e2e8f0]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="totalTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Total Time (hrs)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} value={field.value ?? ""} onChange={e => field.onChange(parseInt(e.target.value))} className="h-11 rounded-xl border-[#e2e8f0]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="engineType"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Engine Type</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} className="h-11 rounded-xl border-[#e2e8f0]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="avionics"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Avionics</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Garmin G1000" {...field} value={field.value ?? ""} className="h-11 rounded-xl border-[#e2e8f0]" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-bold text-[#64748b] uppercase tracking-wider">Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ""} className="min-h-[120px] rounded-2xl border-[#e2e8f0] p-4 focus-visible:ring-[#6366f1]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            ) : (
              <div className="space-y-10">
                {/* Visual Overview Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                  <div className="lg:col-span-5">
                    <div className="relative rounded-[24px] overflow-hidden shadow-xl border border-[#f1f5f9]">
                      <AircraftImage
                        className="w-full aspect-[4/3] object-cover"
                        src={currentAircraft.image ?? undefined}
                        alt={currentAircraft.registration}
                      />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white shadow-sm flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-[#6366f1]" />
                          <span className="text-[11px] font-bold text-[#1e293b]">Home Base: KAPA</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Aircraft details */}
                  <div className="lg:col-span-7 flex flex-col justify-between py-2">
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-[32px] font-bold text-[#1e293b] leading-tight flex items-center gap-3">
                            {aircraft.make} {aircraft.model}
                            <div className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${aircraft.status === 'available' ? 'bg-[#f0fdf4] text-[#16a34a]' :
                              aircraft.status === 'leased' ? 'bg-[#eff6ff] text-[#2563eb]' :
                                'bg-[#fff7ed] text-[#ea580c]'
                              }`}>
                              {aircraft.status}
                            </div>
                          </h4>
                          <p className="text-[14px] font-medium text-[#64748b] mt-1 flex items-center gap-2">
                            <Hash className="h-3.5 w-3.5" />
                            Registered as <span className="text-[#1e293b] font-bold">{aircraft.registration}</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9]">
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Owner / SPV</p>
                          <p
                            className={`text-[15px] font-bold truncate ${aircraft.owner && onViewOwner ? "text-brand hover:underline cursor-pointer" : "text-[#1e293b]"}`}
                            onClick={() => { if (aircraft.owner && onViewOwner) onViewOwner(aircraft.owner.id); }}
                          >
                            {aircraft.owner?.name || "Private Equity Group"}
                          </p>
                        </div>
                        <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9]">
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Annual Yield</p>
                          <p className="text-[15px] font-bold text-[#059669]">+{aircraft.currentLease ? "12.4%" : "0.0%"}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white border border-[#f1f5f9] shadow-sm hidden lg:block">
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Monthly Rev</p>
                          <p className="text-[15px] font-bold text-[#1e293b] font-mono">
                            {aircraft.currentLease ? formatCurrency(aircraft.currentLease.monthlyRate) : "$0.00"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 pt-2">
                        <div>
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Lease Exposure</p>
                          <p className="text-[14px] font-bold text-[#1e293b] mt-0.5">
                            {aircraft.currentLease ? "High Utilitization" : "Available Capacity"}
                          </p>
                        </div>
                        <div className="h-10 w-px bg-gray-100" />
                        <div>
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Management Fee</p>
                          <p className="text-[14px] font-bold text-[#6366f1] mt-0.5">10% Net Net</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs for more details */}
                <div className="pt-2">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="bg-[#f1f5f9] p-1.5 rounded-2xl w-full flex overflow-x-auto h-auto min-h-[52px]">
                      <TabsTrigger value="overview" className="flex-1 rounded-xl font-bold text-[13px] py-2 data-[state=active]:bg-white data-[state=active]:text-[#6366f1] data-[state=active]:shadow-sm">Overview</TabsTrigger>
                      <TabsTrigger value="lease" className="flex-1 rounded-xl font-bold text-[13px] py-2 data-[state=active]:bg-white data-[state=active]:text-[#6366f1] data-[state=active]:shadow-sm">Lease</TabsTrigger>
                      <TabsTrigger value="maintenance" className="flex-1 rounded-xl font-bold text-[13px] py-2 data-[state=active]:bg-white data-[state=active]:text-[#6366f1] data-[state=active]:shadow-sm">Maintenance</TabsTrigger>
                      <TabsTrigger value="documents" className="flex-1 rounded-xl font-bold text-[13px] py-2 data-[state=active]:bg-white data-[state=active]:text-[#6366f1] data-[state=active]:shadow-sm">Documents</TabsTrigger>
                      <TabsTrigger value="financial" className="flex-1 rounded-xl font-bold text-[13px] py-2 data-[state=active]:bg-white data-[state=active]:text-[#6366f1] data-[state=active]:shadow-sm hidden md:flex">Financial</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="pt-8 animate-in fade-in duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 rounded-2xl border border-[#f1f5f9] bg-[#f8fafc]/50">
                          <Plane className="h-5 w-5 text-[#94a3b8] mb-3" />
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Mfg Year</p>
                          <p className="text-[17px] font-bold text-[#1e293b]">{aircraft.year}</p>
                        </div>
                        <div className="p-5 rounded-2xl border border-[#f1f5f9] bg-[#f8fafc]/50">
                          <Gauge className="h-5 w-5 text-[#94a3b8] mb-3" />
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Engine</p>
                          <p className="text-[17px] font-bold text-[#1e293b] truncate" title={aircraft.engineType || "Piston Engine"}>{aircraft.engineType || "Piston Engine"}</p>
                        </div>
                        <div className="p-5 rounded-2xl border border-[#f1f5f9] bg-[#f8fafc]/50">
                          <Clock className="h-5 w-5 text-[#94a3b8] mb-3" />
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Airframe Time</p>
                          <p className="text-[17px] font-bold text-[#1e293b]">{aircraft.totalTime ? `${aircraft.totalTime} hrs` : "0.0 hrs"}</p>
                        </div>
                        <div className="p-5 rounded-2xl border border-[#f1f5f9] bg-[#f8fafc]/50">
                          <Zap className="h-5 w-5 text-[#94a3b8] mb-3" />
                          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">Avionics</p>
                          <p className="text-[17px] font-bold text-[#1e293b] truncate" title={aircraft.avionics || "Standard IFIS"}>{aircraft.avionics || "Standard IFIS"}</p>
                        </div>
                      </div>

                      {aircraft.notes && (
                        <div className="mt-8 p-6 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9]">
                          <h6 className="text-[12px] font-bold text-[#1e293b] uppercase tracking-widest mb-3 flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5 text-[#6366f1]" />
                            Fleet Manager Intelligence
                          </h6>
                          <p className="text-[14px] text-[#64748b] leading-relaxed italic">"{aircraft.notes}"</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="lease" className="pt-4">
                      {aircraft.currentLease ? (
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h5 className="font-medium">Current Lease Agreement</h5>
                              <p className="text-sm text-gray-500">
                                Lease with{" "}
                                <span
                                  className={aircraft.currentLease.lessee && onViewLessee ? "text-brand hover:underline cursor-pointer font-medium" : ""}
                                  onClick={() => { if (aircraft.currentLease?.lessee && onViewLessee) onViewLessee(aircraft.currentLease.lessee.id); }}
                                >
                                  {aircraft.currentLease.lessee?.name || "Unknown Lessee"}
                                </span>
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getStatusColor(aircraft.currentLease.status ?? "")}`}>
                              {aircraft.currentLease.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="border rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-500">Start Date</p>
                              <p className="text-lg font-sans">{formatDate(aircraft.currentLease.startDate)}</p>
                            </div>
                            <div className="border rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-500">End Date</p>
                              <p className="text-lg font-sans">{formatDate(aircraft.currentLease.endDate)}</p>
                            </div>
                            <div className="border rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                              <p className="text-lg font-mono">{formatCurrency(aircraft.currentLease.monthlyRate)}</p>
                            </div>
                          </div>

                          <div className="mb-4">
                            <h5 className="font-medium mb-2">Lease Terms</h5>
                            <div className="border rounded-lg p-4 bg-gray-50">
                              <p className="text-sm mb-2"><span className="font-medium">Minimum Hours:</span> {aircraft.currentLease.minimumHours} hours monthly</p>
                              <p className="text-sm mb-2"><span className="font-medium">Rate:</span> ${aircraft.currentLease.hourlyRate} per Hobbs hour</p>
                              {aircraft.currentLease.maintenanceTerms && (
                                <p className="text-sm mb-2">
                                  <span className="font-medium">Maintenance:</span> {aircraft.currentLease.maintenanceTerms}
                                </p>
                              )}
                            </div>
                          </div>

                          {aircraft.currentLease.notes && (
                            <div>
                              <h5 className="font-medium mb-2">Additional Notes</h5>
                              <p className="text-sm text-gray-600">{aircraft.currentLease.notes}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                          <h3 className="text-lg font-medium">No Active Lease</h3>
                          <p className="text-gray-500 mt-2">This aircraft currently has no active lease agreement.</p>
                          <Button className="mt-4 bg-brand text-white">
                            <FileText className="mr-2 h-4 w-4" /> Create Lease Agreement
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="maintenance" className="pt-4">
                      {maintenanceRecords && maintenanceRecords.length > 0 ? (
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="font-medium">Maintenance History</h5>
                            <Button variant="outline" size="sm">
                              <Calendar className="mr-2 h-4 w-4" /> Schedule Maintenance
                            </Button>
                          </div>

                          <div className="space-y-4">
                            {maintenanceRecords.map(record => (
                              <div key={record.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h6 className="font-medium">{record.type}</h6>
                                    <p className="text-sm text-gray-500">
                                      Scheduled: {formatDate(record.scheduledDate)}
                                    </p>
                                  </div>
                                  <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status ?? "")}`}>
                                    {record.status}
                                  </span>
                                </div>
                                {record.completedDate && (
                                  <p className="text-sm mt-2">
                                    <span className="font-medium">Completed:</span> {formatDate(record.completedDate)}
                                  </p>
                                )}
                                {record.cost && (
                                  <p className="text-sm mt-2">
                                    <span className="font-medium">Cost:</span> {formatCurrency(record.cost)}
                                  </p>
                                )}
                                {record.performedBy && (
                                  <p className="text-sm mt-2">
                                    <span className="font-medium">Performed by:</span> {record.performedBy}
                                  </p>
                                )}
                                {record.notes && (
                                  <p className="text-sm mt-2 text-gray-600">{record.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Wrench className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                          <h3 className="text-lg font-medium">No Maintenance Records</h3>
                          <p className="text-gray-500 mt-2">No maintenance records found for this aircraft.</p>
                          <Button className="mt-4 bg-brand text-white">
                            <Calendar className="mr-2 h-4 w-4" /> Schedule Maintenance
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="documents" className="pt-4">
                      {documents && documents.length > 0 ? (
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <h5 className="font-medium">Documents</h5>
                            <Button variant="outline" size="sm">
                              <FileText className="mr-2 h-4 w-4" /> Upload Document
                            </Button>
                          </div>

                          <div className="space-y-3">
                            {documents.map(doc => (
                              <div key={doc.id} className="border rounded-lg p-3 flex justify-between items-center">
                                <div className="flex items-center">
                                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                                  <div>
                                    <p className="font-medium">{doc.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {doc.type} • Uploaded {formatDate(doc.uploadDate)}
                                    </p>
                                  </div>
                                </div>
                                <Button variant="ghost" size="sm">
                                  Download
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                          <h3 className="text-lg font-medium">No Documents</h3>
                          <p className="text-gray-500 mt-2">No documents found for this aircraft.</p>
                          <Button className="mt-4 bg-brand text-white">
                            <FileText className="mr-2 h-4 w-4" /> Upload Document
                          </Button>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="financial" className="pt-4">
                      <div className="text-center py-8">
                        <Clock className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                        <h3 className="text-lg font-medium">Financial Overview</h3>
                        <p className="text-gray-500 mt-2">Financial tracking and reporting coming soon.</p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="p-6 border-t border-[#f1f5f9] bg-white flex justify-end gap-3 rounded-b-[32px]">
            <Button variant="outline" onClick={handleClose} className="rounded-xl border-[#e2e8f0] px-8 font-bold text-[13px]">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
