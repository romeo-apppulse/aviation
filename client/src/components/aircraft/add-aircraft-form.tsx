import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsertAircraft, Owner } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Upload, Link2, X } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface AddAircraftFormProps {
  isOpen: boolean;
  onClose: () => void;
}

// Validation schema for the aircraft form
const aircraftFormSchema = z.object({
  registration: z.string().min(3, "Registration must be at least 3 characters").max(10, "Registration must be at most 10 characters"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.string()
    .min(1, "Year is required")
    .refine(val => !isNaN(parseInt(val)), "Year must be a number")
    .transform(val => parseInt(val)),
  engineType: z.string().optional(),
  totalTime: z.string()
    .optional()
    .transform(val => val ? parseInt(val) : undefined),
  avionics: z.string().optional(),
  image: z.string().optional(),
  notes: z.string().optional(),
  ownerId: z.string()
    .optional()
    .transform(val => val ? parseInt(val) : undefined),
  status: z.string().default("Available"),
});

type AircraftFormValues = z.infer<typeof aircraftFormSchema>;

export default function AddAircraftForm({ isOpen, onClose }: AddAircraftFormProps) {
  const { toast } = useToast();
  const [imageMode, setImageMode] = useState<"url" | "file">("url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // Fetch owners to populate the owner dropdown
  const { data: owners } = useQuery<Owner[]>({
    queryKey: ["/api/owners"],
    enabled: isOpen,
  });

  // Set up form with validation
  const form = useForm<AircraftFormValues>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: {
      registration: "",
      make: "",
      model: "",
      year: 2024,
      engineType: "",
      totalTime: 0,
      avionics: "",
      image: "",
      notes: "",
      ownerId: undefined,
      status: "Available",
    }
  });

  // Reset form and image state when dialog closes
  const handleClose = () => {
    setSelectedFile(null);
    setImagePreview("");
    setImageMode("url");
    form.reset();
    onClose();
  };

  // Mutation for creating a new aircraft
  const createAircraftMutation = useMutation({
    mutationFn: (data: InsertAircraft) =>
      apiRequest("POST", "/api/aircraft", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aircraft"] });
      toast({
        title: "Aircraft added",
        description: "The aircraft has been added successfully",
        variant: "default",
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add aircraft: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
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

  async function onSubmit(values: AircraftFormValues) {
    try {
      let imageData = values.image;

      // If file mode and a file is selected, convert to base64
      if (imageMode === "file" && selectedFile) {
        imageData = await convertFileToBase64(selectedFile);
      }

      createAircraftMutation.mutate({
        ...values,
        image: imageData,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image file",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Aircraft</DialogTitle>
          <DialogDescription>
            Enter the details of the aircraft you want to add to your fleet
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="registration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. N123AB" {...field} />
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
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Leased">Leased</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Unassigned">Unassigned</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Cessna" {...field} />
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
                      <Input placeholder="e.g. 172S" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 2018" type="number" {...field} />
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
                      <Input placeholder="e.g. Lycoming IO-360" {...field} />
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
                      <Input placeholder="e.g. 1200" type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="avionics"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avionics</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Garmin G1000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aircraft Image</FormLabel>

                  {/* Toggle between URL and File upload */}
                  <div className="flex gap-2 mb-3">
                    <Button
                      type="button"
                      variant={imageMode === "url" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setImageMode("url");
                        setSelectedFile(null);
                        setImagePreview("");
                      }}
                      className="flex items-center gap-2"
                    >
                      <Link2 className="w-4 h-4" />
                      URL
                    </Button>
                    <Button
                      type="button"
                      variant={imageMode === "file" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setImageMode("file");
                        form.setValue("image", "");
                      }}
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Upload
                    </Button>
                  </div>

                  {imageMode === "url" ? (
                    <FormControl>
                      <Input
                        placeholder="URL to aircraft image"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setImagePreview(e.target.value);
                        }}
                      />
                    </FormControl>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="flex-1"
                        />
                        {selectedFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedFile(null);
                              setImagePreview("");
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      {selectedFile && (
                        <p className="text-sm text-gray-600">
                          Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)}KB)
                        </p>
                      )}
                    </div>
                  )}

                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mt-3">
                      <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="Aircraft preview"
                          className="w-full h-full object-cover"
                          onError={() => setImagePreview("")}
                        />
                      </div>
                    </div>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an owner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {owners?.map(owner => (
                        <SelectItem key={owner.id} value={owner.id.toString()}>
                          {owner.name}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional information about the aircraft" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-brand hover:bg-brand-hover text-white"
                disabled={createAircraftMutation.isPending}
              >
                {createAircraftMutation.isPending ? "Adding..." : "Add Aircraft"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
