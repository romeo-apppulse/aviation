import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { useState } from "react";

export default function OwnerDocuments() {
    const [search, setSearch] = useState("");

    const { data: documents, isLoading } = useQuery<any[]>({
        queryKey: ["/api/owner/documents"],
    });

    if (isLoading) {
        return (
            <div className="p-10 max-w-7xl mx-auto space-y-8">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-[400px] rounded-2xl" />
            </div>
        );
    }

    const filtered = documents?.filter(doc =>
        !search || doc.name?.toLowerCase().includes(search.toLowerCase()) ||
        doc.type?.toLowerCase().includes(search.toLowerCase()) ||
        doc.aircraftRegistration?.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-[#1e293b] tracking-tight">Contracts & Documents</h1>
                    <p className="text-[#64748b] font-medium">Access documents related to your fleet and agreements.</p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
                    <Input
                        placeholder="Search documents..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-11 rounded-xl border-[#e2e8f0] bg-white font-medium"
                    />
                </div>
            </div>

            <Card className="rounded-2xl border-[#f1f5f9] shadow-sm bg-white overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-[#f8fafc]/50">
                                <TableRow className="hover:bg-transparent border-b border-[#f1f5f9]">
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12">Document</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Type</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Aircraft</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Uploaded</TableHead>
                                    <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider px-6 h-12 text-center">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-16 text-center">
                                            <FileText className="h-12 w-12 text-[#e2e8f0] mx-auto mb-3" />
                                            <p className="text-sm font-bold text-[#1e293b]">{search ? "No matching documents" : "No documents found"}</p>
                                            <p className="text-xs text-[#94a3b8] mt-1">Documents will appear here when uploaded by your account manager.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((doc) => (
                                        <TableRow key={doc.id} className="hover:bg-[#fcfdfe] border-b border-[#f8fafc]">
                                            <TableCell className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                        <FileText className="h-4 w-4 text-[#007AFF]" />
                                                    </div>
                                                    <span className="text-[13px] font-bold text-[#1e293b]">{doc.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-center">
                                                <Badge variant="outline" className="text-[10px] font-bold uppercase rounded-md border-[#e2e8f0] text-[#64748b]">
                                                    {doc.type || "General"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-center text-[13px] font-bold text-[#1e293b]">
                                                {doc.aircraftRegistration || "—"}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-center text-[13px] font-medium text-[#64748b]">
                                                {formatDate(doc.createdAt)}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-center">
                                                {doc.url ? (
                                                    <Button variant="ghost" size="sm" className="text-[#007AFF] font-bold text-xs rounded-xl hover:bg-blue-50" asChild>
                                                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                            <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                                                        </a>
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-[#94a3b8]">N/A</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
