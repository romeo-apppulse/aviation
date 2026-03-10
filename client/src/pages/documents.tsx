import { useQuery, useMutation } from "@tanstack/react-query";
import { Document as DocumentType, InsertDocument, AircraftWithDetails } from "@shared/schema";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { Helmet } from "react-helmet";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useModal } from "@/hooks/use-modal";
import { FileText, Plus, Search, Filter, Download, Trash2, Upload, File, FileSpreadsheet, FilePen, Grid3X3, ExternalLink, List, ArrowUpDown, ArrowUp, ArrowDown, Plane, Users, Briefcase, User } from "lucide-react";
import AircraftDetailsModal from "@/components/aircraft/aircraft-details-modal";
import LesseeDetailDrawer from "@/components/lessees/lessee-detail-drawer";
import OwnerDetailDrawer from "@/components/owners/owner-detail-drawer";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Document upload schema
const documentFormSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  type: z.string().min(1, "Document type is required"),
  url: z.string().optional().or(z.literal("")),
  relatedType: z.string().optional(),
  relatedId: z.string()
    .optional()
    .transform(val => val ? parseInt(val) : undefined),
});

type DocumentFormValues = z.infer<typeof documentFormSchema>;

type ViewMode = 'grid' | 'list';
type SortField = 'name' | 'type' | 'uploadDate' | 'relatedType';
type SortDirection = 'asc' | 'desc';

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [deleteDocument, setDeleteDocument] = useState<DocumentType | null>(null);
  const [uploadMode, setUploadMode] = useState<"url" | "file">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const aircraftModal = useModal<AircraftWithDetails>();
  const [selectedLesseeId, setSelectedLesseeId] = useState<number>(0);
  const [lesseeDrawerOpen, setLesseeDrawerOpen] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState<number>(0);
  const [ownerDrawerOpen, setOwnerDrawerOpen] = useState(false);
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery<DocumentType[]>({
    queryKey: ["/api/documents"],
  });

  const { data: aircraft } = useQuery<AircraftWithDetails[]>({
    queryKey: ["/api/aircraft"],
  });

  const { data: leases } = useQuery<any[]>({
    queryKey: ["/api/leases"],
    enabled: addDocumentOpen,
  });

  const { data: owners } = useQuery<any[]>({
    queryKey: ["/api/owners"],
  });

  const { data: lessees } = useQuery<any[]>({
    queryKey: ["/api/lessees"],
  });

  const filteredDocuments = documents
    ? documents.filter((doc) => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === "all" || doc.type === typeFilter;

      return matchesSearch && matchesType;
    })
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
      return <ArrowUpDown className="ml-1 h-4 w-4" />;
    }
    return sortDirection === 'asc' ?
      <ArrowUp className="ml-1 h-4 w-4" /> :
      <ArrowDown className="ml-1 h-4 w-4" />;
  };

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if ((aValue ?? "") < (bValue ?? "")) return sortDirection === 'asc' ? -1 : 1;
    if ((aValue ?? "") > (bValue ?? "")) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const createDocumentMutation = useMutation({
    mutationFn: (data: InsertDocument) =>
      apiRequest("POST", "/api/documents", data).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setAddDocumentOpen(false);
      toast({
        title: "Document added",
        description: "The document has been added successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add document: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setDeleteDocument(null);
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete document: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      name: "",
      type: "",
      url: "",
      relatedType: "none",
      relatedId: undefined,
    },
  });

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(file.name);
      if (!form.getValues("name")) {
        form.setValue("name", file.name.split('.').slice(0, -1).join('.'));
      }
    }
  };

  const resetUploadState = () => {
    setSelectedFile(null);
    setFilePreview("");
    setUploadMode("file");
    form.reset();
  };

  async function onSubmit(values: DocumentFormValues) {
    try {
      let finalUrl = values.url;

      if (uploadMode === "file" && selectedFile) {
        finalUrl = await convertFileToBase64(selectedFile);
      }

      if (!finalUrl && uploadMode === "file") {
        toast({
          title: "Error",
          description: "Please select a file to upload",
          variant: "destructive",
        });
        return;
      }

      createDocumentMutation.mutate({
        ...values,
        url: finalUrl,
        relatedId: values.relatedId || undefined,
        relatedType: values.relatedType === "none" ? undefined : values.relatedType,
      } as InsertDocument);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to process document file",
        variant: "destructive",
      });
    }
  }

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "Lease":
        return <FileText className="h-8 w-8 text-brand" />;
      case "Registration":
        return <FilePen className="h-8 w-8 text-red-500" />;
      case "Insurance":
        return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
      default:
        return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <>
      <Helmet>
        <title>Documents — AeroLease Wise</title>
        <meta name="description" content="Store and manage all aircraft-related documents and files" />
      </Helmet>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-1">
            Store and manage all aircraft-related documents
          </p>
        </div>
        <Button
          onClick={() => setAddDocumentOpen(true)}
          className="bg-brand hover:bg-brand-hover text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Document
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search documents..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="w-full md:w-52">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Lease">Lease</SelectItem>
                  <SelectItem value="Registration">Registration</SelectItem>
                  <SelectItem value="Insurance">Insurance</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex border rounded-lg bg-gray-50 p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="px-3"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="px-3"
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
                  <div className="flex items-center mb-4">
                    <div className="h-10 w-10 bg-gray-200 rounded animate-pulse"></div>
                    <div className="ml-3 flex-1">
                      <div className="h-5 bg-gray-200 rounded animate-pulse mb-2 w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ) : sortedDocuments.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedDocuments.map((document) => (
              <Card key={document.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start">
                      {getDocumentIcon(document.type)}
                      <div className="ml-3">
                        <h3 className="font-medium text-gray-900">{document.name}</h3>
                        <p className="text-sm text-gray-500">{document.type}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteDocument(document)}
                    >
                      <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                    </Button>
                  </div>

                  <div className="mt-4 text-sm text-gray-600">
                    <p>Uploaded: {formatDate(document.uploadDate ?? undefined)}</p>
                    {document.relatedType && document.relatedId && (
                      <p className="capitalize">
                        Related to:{" "}
                        <span
                          className="text-brand hover:underline cursor-pointer font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (document.relatedType === "aircraft") {
                              const ac = aircraft?.find(a => a.id === document.relatedId);
                              if (ac) aircraftModal.openModal(ac);
                            } else if (document.relatedType === "owner") {
                              setSelectedOwnerId(document.relatedId!);
                              setOwnerDrawerOpen(true);
                            } else if (document.relatedType === "lessee") {
                              setSelectedLesseeId(document.relatedId!);
                              setLesseeDrawerOpen(true);
                            }
                          }}
                        >
                          {document.relatedType === "aircraft"
                            ? `Aircraft: ${aircraft?.find(a => a.id === document.relatedId)?.registration ?? `#${document.relatedId}`}`
                            : document.relatedType === "owner"
                            ? `Owner: ${owners?.find(o => o.id === document.relatedId)?.name ?? `#${document.relatedId}`}`
                            : document.relatedType === "lessee"
                            ? `School: ${lessees?.find(l => l.id === document.relatedId)?.name ?? `#${document.relatedId}`}`
                            : `${document.relatedType} #${document.relatedId}`}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => window.open(document.url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-gray-50"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-gray-50"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center">
                      Type
                      {getSortIcon('type')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-gray-50"
                    onClick={() => handleSort('uploadDate')}
                  >
                    <div className="flex items-center">
                      Upload Date
                      {getSortIcon('uploadDate')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none hover:bg-gray-50"
                    onClick={() => handleSort('relatedType')}
                  >
                    <div className="flex items-center">
                      Related To
                      {getSortIcon('relatedType')}
                    </div>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDocuments.map((document) => (
                  <TableRow key={document.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center">
                        {getDocumentIcon(document.type)}
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">{document.name}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-brand">
                        {document.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">
                        {formatDate(document.uploadDate ?? undefined)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {document.relatedType && document.relatedId ? (
                        <div
                          className="text-sm text-brand hover:underline cursor-pointer font-medium"
                          onClick={() => {
                            if (document.relatedType === "aircraft") {
                              const ac = aircraft?.find(a => a.id === document.relatedId);
                              if (ac) aircraftModal.openModal(ac);
                            } else if (document.relatedType === "owner") {
                              setSelectedOwnerId(document.relatedId!);
                              setOwnerDrawerOpen(true);
                            } else if (document.relatedType === "lessee") {
                              setSelectedLesseeId(document.relatedId!);
                              setLesseeDrawerOpen(true);
                            }
                          }}
                        >
                          {document.relatedType === "aircraft"
                            ? `Aircraft: ${aircraft?.find(a => a.id === document.relatedId)?.registration ?? `#${document.relatedId}`}`
                            : document.relatedType === "owner"
                            ? `Owner: ${owners?.find(o => o.id === document.relatedId)?.name ?? `#${document.relatedId}`}`
                            : document.relatedType === "lessee"
                            ? `School: ${lessees?.find(l => l.id === document.relatedId)?.name ?? `#${document.relatedId}`}`
                            : `${document.relatedType} #${document.relatedId}`}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(document.url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDocument(document)}
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
        )
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No documents found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || typeFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Get started by adding a document"}
          </p>
          {searchTerm || typeFilter !== "all" ? (
            <Button
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("all");
              }}
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              onClick={() => setAddDocumentOpen(true)}
              className="bg-brand hover:bg-brand-hover text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          )}
        </div>
      )}

      {/* Add Document Dialog */}
      <Dialog open={addDocumentOpen} onOpenChange={setAddDocumentOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Document</DialogTitle>
            <DialogDescription>
              Upload a document to the system
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. N159G Lease Agreement" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select document type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Lease">Lease Agreement</SelectItem>
                        <SelectItem value="Registration">Registration</SelectItem>
                        <SelectItem value="Insurance">Insurance</SelectItem>
                        <SelectItem value="Maintenance">Maintenance Record</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Document Source</FormLabel>
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        variant={uploadMode === "file" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setUploadMode("file")}
                        className="flex-1"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        File Upload
                      </Button>
                      <Button
                        type="button"
                        variant={uploadMode === "url" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setUploadMode("url")}
                        className="flex-1"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        External URL
                      </Button>
                    </div>

                    <FormControl>
                      {uploadMode === "file" ? (
                        <div className="flex flex-col gap-2">
                          <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-gray-50 transition-colors">
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm font-medium text-gray-600">
                              {filePreview ? `Selected: ${filePreview}` : "Click to select or drag and drop"}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">PDF, DOCX, JPG up to 10MB</span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={handleFileChange}
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                            />
                          </label>
                        </div>
                      ) : (
                        <Input placeholder="https://example.com/document.pdf" {...field} />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="relatedType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related To (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select entity type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="aircraft">Aircraft</SelectItem>
                          <SelectItem value="lease">Lease</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="lessee">Flight School</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("relatedType") && form.watch("relatedType") !== "none" && (
                  <FormField
                    control={form.control}
                    name="relatedId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Link to Entity</FormLabel>
                        <Select
                          onValueChange={(val) => field.onChange(val)}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={`Select ${form.watch("relatedType")}`} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {form.watch("relatedType") === "aircraft" && aircraft?.map((a: any) => (
                              <SelectItem key={a.id} value={a.id.toString()}>
                                <div className="flex items-center">
                                  <Plane className="h-3 w-3 mr-2 text-gray-400" />
                                  {a.registration} ({a.make} {a.model})
                                </div>
                              </SelectItem>
                            ))}
                            {form.watch("relatedType") === "lease" && leases?.map((l: any) => (
                              <SelectItem key={l.id} value={l.id.toString()}>
                                <div className="flex items-center">
                                  <Briefcase className="h-3 w-3 mr-2 text-gray-400" />
                                  Lease #{l.id} - {l.aircraft?.registration}
                                </div>
                              </SelectItem>
                            ))}
                            {form.watch("relatedType") === "owner" && owners?.map((o: any) => (
                              <SelectItem key={o.id} value={o.id.toString()}>
                                <div className="flex items-center">
                                  <User className="h-3 w-3 mr-2 text-gray-400" />
                                  {o.name}
                                </div>
                              </SelectItem>
                            ))}
                            {form.watch("relatedType") === "lessee" && lessees?.map((ls: any) => (
                              <SelectItem key={ls.id} value={ls.id.toString()}>
                                <div className="flex items-center">
                                  <Users className="h-3 w-3 mr-2 text-gray-400" />
                                  {ls.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddDocumentOpen(false);
                    resetUploadState();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-brand hover:bg-brand-hover text-white"
                  disabled={createDocumentMutation.isPending}
                >
                  {createDocumentMutation.isPending ? "Saving..." : "Add Document"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDocument} onOpenChange={(open) => {
        if (!open) setDeleteDocument(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                if (deleteDocument) {
                  deleteDocumentMutation.mutate(deleteDocument.id);
                }
              }}
            >
              {deleteDocumentMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Entity Detail Modals/Drawers */}
      {aircraftModal.data && (
        <AircraftDetailsModal
          isOpen={aircraftModal.isOpen}
          onClose={aircraftModal.closeModal}
          aircraft={aircraftModal.data}
          onViewOwner={(ownerId) => { setSelectedOwnerId(ownerId); setOwnerDrawerOpen(true); }}
          onViewLessee={(lesseeId) => { setSelectedLesseeId(lesseeId); setLesseeDrawerOpen(true); }}
        />
      )}
      <LesseeDetailDrawer
        isOpen={lesseeDrawerOpen}
        onClose={() => setLesseeDrawerOpen(false)}
        lesseeId={selectedLesseeId}
        onViewAircraft={(ac) => aircraftModal.openModal(ac as AircraftWithDetails)}
      />
      <OwnerDetailDrawer
        isOpen={ownerDrawerOpen}
        onClose={() => setOwnerDrawerOpen(false)}
        ownerId={selectedOwnerId}
        onViewAircraft={(ac) => aircraftModal.openModal(ac)}
      />
    </>
  );
}
