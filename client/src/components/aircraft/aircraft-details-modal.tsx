import { AircraftWithDetails, UpdateAircraft, updateAircraftSchema } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Maintenance } from "@shared/schema";
import { Check, FileText, Plane, Calendar, Clock, Wrench, Edit, Save, X, Upload, Trash2 } from "lucide-react";
import { AircraftImage } from "@/components/ui/aircraft-image";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AircraftDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  aircraft: AircraftWithDetails;
}

export default function AircraftDetailsModal({ isOpen, onClose, aircraft }: AircraftDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<UpdateAircraft>({
    resolver: zodResolver(updateAircraftSchema),
    defaultValues: {
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
    },
  });

  const updateAircraftMutation = useMutation({
    mutationFn: async (data: UpdateAircraft) => {
      return await apiRequest(`/api/aircraft/${aircraft.id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aircraft"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Aircraft updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update aircraft",
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
    form.reset();
    onClose();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Error",
          description: "Image file size must be less than 5MB",
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
        const preview = e.target?.result as string;
        setImagePreview(preview);
        form.setValue("image", preview);
      };
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read image file",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    form.setValue("image", "");
  };

  const onSubmit = (data: UpdateAircraft) => {
    updateAircraftMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-sans font-semibold">
              {isEditing ? "Edit Aircraft" : "Aircraft Details"}
            </DialogTitle>
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      form.reset();
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-[#3498db] hover:bg-[#2980b9]"
                    disabled={updateAircraftMutation.isPending}
                    onClick={form.handleSubmit(onSubmit)}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {updateAircraftMutation.isPending ? "Saving..." : "Save"}  
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
        
        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Aircraft image */}
                <div className="w-full md:w-1/3">
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aircraft Image</FormLabel>
                        <div className="space-y-3">
                          <FormControl>
                            <Input placeholder="Image URL (optional)" {...field} />
                          </FormControl>
                          
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById('image-upload')?.click()}
                              className="flex-1"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Image
                            </Button>
                            
                            {(field.value || imagePreview) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRemoveImage}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                          />
                        </div>
                        <FormMessage /> 
                      </FormItem>
                    )}
                  />
                  <AircraftImage 
                    className="w-full h-48 object-cover rounded-lg mt-3" 
                    src={imagePreview || form.watch("image") || aircraft.image} 
                    alt={`${aircraft.make} ${aircraft.model}`} 
                  />
                </div>
                
                {/* Edit form fields */}
                <div className="w-full md:w-2/3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="registration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration</FormLabel>
                          <FormControl>
                            <Input placeholder="N123AB" {...field} />
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
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="make"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Make</FormLabel>
                          <FormControl>
                            <Input placeholder="Cessna" {...field} />
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
                          <FormLabel>Model</FormLabel>
                          <FormControl>
                            <Input placeholder="172" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="year"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="2020" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
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
                          <FormLabel>Total Time (hours)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1500" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
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
                        <FormItem>
                          <FormLabel>Engine Type</FormLabel>
                          <FormControl>
                            <Input placeholder="Lycoming IO-360" {...field} />
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
                          <FormLabel>Avionics</FormLabel>
                          <FormControl>
                            <Input placeholder="Garmin G1000" {...field} />
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
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional information about the aircraft" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        ) : (
          <div className="flex flex-col md:flex-row gap-6">
          {/* Aircraft image */}
          <div className="w-full md:w-1/3">
            <AircraftImage 
              className="w-full h-48 object-cover rounded-lg" 
              src={aircraft.image} 
              alt={`${aircraft.make} ${aircraft.model}`} 
            />
          </div>
          
          {/* Aircraft details */}
          <div className="w-full md:w-2/3">
            <h4 className="text-xl font-sans font-semibold">{aircraft.make} {aircraft.model}</h4>
            <p className="text-gray-500 mb-4">Registration: {aircraft.registration}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Owner</p>
                <p className="text-sm">{aircraft.owner?.name || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Current Lessee</p>
                <p className="text-sm">{aircraft.currentLease?.lessee?.name || "None"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                <p className="text-sm font-mono">
                  {aircraft.currentLease ? formatCurrency(aircraft.currentLease.monthlyRate) : "$0"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Management Fee</p>
                <p className="text-sm font-mono">
                  {aircraft.currentLease 
                    ? formatCurrency(aircraft.currentLease.monthlyRate * 0.1) + " (10%)" 
                    : "$0 (10%)"}
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-500">Status</p>
              <div className="flex items-center mt-1">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(aircraft.status)}`}>
                  {aircraft.status}
                </span>
                {aircraft.currentLease && (
                  <span className="text-sm text-gray-500 ml-2">
                    Since {formatDate(aircraft.currentLease.startDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
        
        {/* Tabs for more details */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 md:grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="lease">Lease Details</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="financial" className="hidden md:block">Financial</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="pt-4">
              <h5 className="font-medium mb-2">Aircraft Specifications</h5>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Year</p>
                  <p className="text-sm">{aircraft.year}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Engine</p>
                  <p className="text-sm">{aircraft.engineType || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Time</p>
                  <p className="text-sm">{aircraft.totalTime ? `${aircraft.totalTime} hours` : "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Avionics</p>
                  <p className="text-sm">{aircraft.avionics || "Not specified"}</p>
                </div>
              </div>
              
              {aircraft.notes && (
                <>
                  <h5 className="font-medium mb-2">Notes</h5>
                  <p className="text-sm text-gray-600">{aircraft.notes}</p>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="lease" className="pt-4">
              {aircraft.currentLease ? (
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="font-medium">Current Lease Agreement</h5>
                      <p className="text-sm text-gray-500">
                        Lease with {aircraft.currentLease.lessee?.name || "Unknown Lessee"}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getStatusColor(aircraft.currentLease.status)}`}>
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
                  <Button className="mt-4 bg-[#3498db]">
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
                          <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${getStatusColor(record.status)}`}>
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
                  <Button className="mt-4 bg-[#3498db]">
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
                  <Button className="mt-4 bg-[#3498db]">
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
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose}>Close</Button>
          {!isEditing && (
            <Button 
              className="bg-[#3498db] hover:bg-[#2980b9]" 
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit Details
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
