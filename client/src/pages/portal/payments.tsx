import { useQuery, useMutation } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import { DollarSign, CheckCircle2, Clock, AlertCircle, Calendar, ArrowRight, Wallet, Receipt, History, ChevronDown, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, formatCurrency, getStatusColor } from "@/lib/utils";
import { Payment } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function PortalPayments() {
    const { toast } = useToast();
    const [selectedPayments, setSelectedPayments] = useState<number[]>([]);
    const [expandedPayment, setExpandedPayment] = useState<number | null>(null);

    type EnrichedPayment = Payment & {
        aircraftRegistration: string | null;
        aircraftModel: string | null;
        billableHours: number | null;
        hourlyRate: number | null;
    };

    const { data: payments, isLoading } = useQuery<EnrichedPayment[]>({
        queryKey: ["/api/portal/payments"],
    });

    const payMutation = useMutation({
        mutationFn: async (paymentIds: number[]) => {
            const res = await apiRequest("POST", "/api/portal/payments/pay", { paymentIds });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/portal/payments"] });
            queryClient.invalidateQueries({ queryKey: ["/api/portal/dashboard"] });
            toast({
                title: "Payment successful",
                description: "Your simulated payment has been processed.",
            });
            setSelectedPayments([]);
        },
        onError: () => {
            toast({
                title: "Payment failed",
                description: "Please try again or contact support.",
                variant: "destructive",
            });
        },
    });

    const toggleSelect = (id: number) => {
        setSelectedPayments(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handlePaySelection = () => {
        if (selectedPayments.length === 0) return;
        payMutation.mutate(selectedPayments);
    };

    const handleDownloadInvoice = async (payment: EnrichedPayment) => {
        const doc = new jsPDF({ unit: "mm", format: "a4" });
        const pageW = doc.internal.pageSize.getWidth();
        const margin = 20;
        let y = margin;

        // Try to load logo
        try {
            const img = new Image();
            img.src = "/logo.png";
            await new Promise<void>((resolve) => {
                img.onload = () => {
                    // Scale logo to max 40mm wide, maintain aspect ratio
                    const maxW = 40;
                    const scale = maxW / img.naturalWidth;
                    const h = img.naturalHeight * scale;
                    doc.addImage(img, "PNG", margin, y, maxW, h);
                    y += h + 4;
                    resolve();
                };
                img.onerror = () => resolve(); // no logo, skip
            });
        } catch {
            // no logo
        }

        // Brand name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(30, 41, 59);
        doc.text("Aviation APE", pageW - margin, margin + 6, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("Flight Operations Management", pageW - margin, margin + 12, { align: "right" });

        // Divider
        y = Math.max(y, margin + 20);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(margin, y, pageW - margin, y);
        y += 8;

        // INVOICE title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(26);
        doc.setTextColor(30, 41, 59);
        doc.text("INVOICE", margin, y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Invoice #${payment.id}`, pageW - margin, y - 4, { align: "right" });
        doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, pageW - margin, y + 2, { align: "right" });
        y += 14;

        // Status badge area
        const statusColor = payment.status === "Paid" ? [16, 185, 129] : [239, 68, 68];
        doc.setFillColor(...(statusColor as [number, number, number]));
        doc.roundedRect(margin, y, 28, 7, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.text((payment.status || "PENDING").toUpperCase(), margin + 14, y + 4.8, { align: "center" });
        y += 14;

        // Two-column: billing period / aircraft details
        doc.setTextColor(30, 41, 59);
        const col2 = pageW / 2 + 5;

        const labelStyle = () => { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(148, 163, 184); };
        const valueStyle = () => { doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 41, 59); };

        labelStyle(); doc.text("BILLING PERIOD", margin, y);
        labelStyle(); doc.text("AIRCRAFT", col2, y);
        y += 5;
        valueStyle(); doc.text(payment.period || "—", margin, y);
        valueStyle(); doc.text(payment.aircraftRegistration || "—", col2, y);
        y += 5;
        labelStyle(); doc.text(payment.status === "Paid" ? `Paid: ${payment.paidDate || ""}` : `Due: ${payment.dueDate || ""}`, margin, y);
        labelStyle(); doc.text(payment.aircraftModel || "", col2, y);
        y += 12;

        // Line items table header
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, pageW - margin * 2, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("DESCRIPTION", margin + 3, y + 5.2);
        doc.text("HRS", pageW - margin - 70, y + 5.2, { align: "right" });
        doc.text("RATE", pageW - margin - 40, y + 5.2, { align: "right" });
        doc.text("AMOUNT", pageW - margin, y + 5.2, { align: "right" });
        y += 8;

        // Line item row
        const hrs = payment.billableHours;
        const rate = payment.hourlyRate;
        const gross = payment.grossAmount || payment.amount;
        const description = hrs && rate
            ? `${payment.period} — ${hrs} hrs × $${rate.toFixed(2)}/hr`
            : `Flight hours — ${payment.period}`;

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y, pageW - margin, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(description, margin + 3, y);
        doc.text(hrs != null ? String(hrs) : "—", pageW - margin - 70, y, { align: "right" });
        doc.text(rate != null ? `$${rate.toFixed(2)}/hr` : "—", pageW - margin - 40, y, { align: "right" });
        doc.text(`$${gross.toFixed(2)}`, pageW - margin, y, { align: "right" });
        y += 14;

        // Totals section — just show the total, no internal fee breakdown
        doc.setDrawColor(226, 232, 240);
        doc.line(pageW - margin - 80, y, pageW - margin, y);
        y += 6;

        const totalsX = pageW - margin - 80;
        const amtX = pageW - margin;
        const totalsRow = (label: string, val: string, bold = false) => {
            if (bold) { doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 41, 59); }
            else { doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(100, 116, 139); }
            doc.text(label, totalsX, y);
            doc.text(val, amtX, y, { align: "right" });
            y += bold ? 8 : 6;
        };

        doc.setDrawColor(226, 232, 240);
        doc.line(totalsX, y, amtX, y);
        y += 4;

        if (payment.status === "Paid") {
            totalsRow("TOTAL PAID", `$${payment.amount.toFixed(2)}`, true);
            y += 2;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(16, 185, 129);
            doc.text(`Paid on ${payment.paidDate || ""}`, amtX, y, { align: "right" });
        } else {
            totalsRow("TOTAL DUE", `$${payment.amount.toFixed(2)}`, true);
            y += 2;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(239, 68, 68);
            doc.text(`Due by ${payment.dueDate || ""}`, amtX, y, { align: "right" });
        }

        // Footer
        const footerY = doc.internal.pageSize.getHeight() - 16;
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, footerY - 4, pageW - margin, footerY - 4);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Aviation APE — Flight Operations Management Platform", pageW / 2, footerY, { align: "center" });
        doc.text(`Invoice #${payment.id} · ${new Date().toLocaleDateString()}`, pageW / 2, footerY + 5, { align: "center" });

        doc.save(`invoice-${payment.id}-${(payment.period || "").replace(/\s/g, "-")}.pdf`);
    };

    if (isLoading) {
        return <div className="p-8 max-w-7xl mx-auto space-y-8"><Skeleton className="h-[600px] w-full" /></div>;
    }

    const unpaidPayments = payments?.filter(p => p.status !== "Paid") || [];
    const totalAmountSelected = payments
        ?.filter(p => selectedPayments.includes(p.id))
        .reduce((sum, p) => sum + p.amount, 0) || 0;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-[#1e293b] tracking-tight">Payments & Billing</h1>
                    <p className="text-[#64748b] font-medium">Manage your flight school invoices and transaction history.</p>
                </div>
                <div className="p-1 px-3 bg-white rounded-2xl border border-[#f1f5f9] shadow-sm flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-brand" />
                    <div className="pr-2">
                        <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider leading-none">Total Unpaid</p>
                        <p className="text-lg font-black text-[#1e293b] mt-1">{formatCurrency(unpaidPayments.reduce((sum, p) => sum + p.amount, 0))}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Payments List */}
                <Card className="lg:col-span-2 rounded-2xl border-[#f1f5f9] shadow-sm overflow-hidden bg-white">
                    <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-[#f8fafc]">
                        <div className="flex items-center space-x-3">
                            <div className="bg-brand/5 p-2 rounded-xl">
                                <Receipt className="h-5 w-5 text-brand" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-bold text-[#1e293b]">Invoice History</CardTitle>
                                <CardDescription className="text-xs font-medium text-[#64748b]">Click rows to select for payment</CardDescription>
                            </div>
                        </div>
                        {selectedPayments.length > 0 && (
                            <div className="flex items-center gap-4 animate-in fade-in zoom-in duration-300">
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider leading-none">Selected</p>
                                    <p className="text-sm font-black text-brand">{formatCurrency(totalAmountSelected)}</p>
                                </div>
                                <Button
                                    onClick={handlePaySelection}
                                    className="bg-brand hover:bg-brand-hover text-white font-black rounded-xl h-10 px-6 shadow-lg shadow-blue-100 transition-all active:scale-95"
                                    disabled={payMutation.isPending}
                                >
                                    {payMutation.isPending ? "Processing..." : "Pay Now"}
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-[#f8fafc]/50">
                                    <TableRow className="hover:bg-transparent border-b border-[#f1f5f9]">
                                        <TableHead className="w-12 px-6 h-12"></TableHead>
                                        <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider h-12">Period</TableHead>
                                        <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider h-12 text-center">Amount</TableHead>
                                        <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider h-12 text-center">Due Date</TableHead>
                                        <TableHead className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider h-12 text-center">Status</TableHead>
                                        <TableHead className="w-10 h-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="py-20 text-center">
                                                <div className="bg-[#f8fafc] h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <DollarSign className="h-8 w-8 text-[#cbd5e1]" />
                                                </div>
                                                <p className="text-sm font-bold text-[#1e293b]">No invoices found</p>
                                                <p className="text-xs text-[#94a3b8] font-medium">Billing will be generated based on flight hour reports.</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        payments?.map((payment: EnrichedPayment) => {
                                            const isSelected = selectedPayments.includes(payment.id);
                                            const isUnpaid = payment.status !== "Paid";

                                            return (<>
                                                <TableRow
                                                    key={payment.id}
                                                    className={cn(
                                                        "cursor-pointer transition-all border-b border-[#f8fafc] group",
                                                        isSelected ? "bg-blue-50/50" : "hover:bg-[#fcfdfe]",
                                                        !isUnpaid && "opacity-80"
                                                    )}
                                                    onClick={() => isUnpaid && toggleSelect(payment.id)}
                                                >
                                                    <TableCell className="px-6 py-4">
                                                        {isUnpaid && (
                                                            <div className={cn(
                                                                "h-5 w-5 rounded-md border-2 transition-all flex items-center justify-center",
                                                                isSelected ? "bg-brand border-brand" : "bg-white border-[#e2e8f0] group-hover:border-brand/50"
                                                            )}>
                                                                {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[14px] font-black text-[#1e293b] leading-tight">{payment.period}</span>
                                                            <span className="text-[10px] font-bold text-[#94a3b8] mt-0.5">Invoice #{payment.id}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 text-center font-black text-[#1e293b]">{formatCurrency(payment.amount)}</TableCell>
                                                    <TableCell className="py-4 text-center text-[#64748b] font-medium text-xs">
                                                        {payment.status === "Paid" ? (
                                                            <span className="text-emerald-500 font-bold">Paid {formatDate(payment.paidDate!)}</span>
                                                        ) : formatDate(payment.dueDate)}
                                                    </TableCell>
                                                    <TableCell className="py-4 text-center">
                                                        <Badge className={cn("px-3 py-1 rounded-full font-black text-[10px] shadow-sm uppercase tracking-tighter", getStatusColor(payment.status || "Pending"))}>
                                                            {payment.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-4 px-3">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setExpandedPayment(expandedPayment === payment.id ? null : payment.id); }}
                                                            className="p-1 rounded-lg hover:bg-[#f1f5f9] transition-colors"
                                                        >
                                                            <ChevronDown className={cn("h-4 w-4 text-[#94a3b8] transition-transform", expandedPayment === payment.id && "rotate-180")} />
                                                        </button>
                                                    </TableCell>
                                                </TableRow>
                                                {expandedPayment === payment.id && (
                                                    <TableRow className="bg-[#f8fafc] border-b border-[#f1f5f9]">
                                                        <TableCell colSpan={6} className="px-6 py-4">
                                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Aircraft</p>
                                                                    <p className="font-black text-[#1e293b] mt-1">
                                                                        {payment.aircraftRegistration || "—"}
                                                                        {payment.aircraftModel && (
                                                                            <span className="block text-[10px] font-medium text-[#94a3b8]">{payment.aircraftModel}</span>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Total Amount</p>
                                                                    <p className="font-black text-[#1e293b] mt-1">{formatCurrency(payment.grossAmount || payment.amount)}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Billable Hours</p>
                                                                    <p className="font-black text-[#1e293b] mt-1">{payment.billableHours != null ? `${payment.billableHours} hrs` : "—"}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Hourly Rate</p>
                                                                    <p className="font-black text-[#1e293b] mt-1">{payment.hourlyRate ? formatCurrency(payment.hourlyRate) + "/hr" : "—"}</p>
                                                                </div>
                                                                <div>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="rounded-xl font-bold text-[#64748b] border-[#e2e8f0] text-[11px] h-8 mt-1"
                                                                        onClick={() => handleDownloadInvoice(payment)}
                                                                    >
                                                                        <Download className="h-3 w-3 mr-1.5" /> Download Invoice
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </>);
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Sidebar / Info */}
                <div className="space-y-8">
                    <Card className="rounded-2xl border-none bg-gradient-to-br from-brand to-brand-hover text-white shadow-xl shadow-blue-200 p-6 relative overflow-hidden">
                        <div className="relative z-10 space-y-4">
                            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <History className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black leading-tight">Billing Policy</h3>
                                <p className="text-xs text-blue-100 mt-1 font-medium leading-relaxed opacity-90">
                                    Invoices are generated on the 1st of each month based on your flight hour reports. Payments are due within 15 days of generation.
                                </p>
                            </div>
                            <Button variant="outline" className="w-full h-11 bg-white/10 border-white/20 text-white/50 font-bold rounded-xl cursor-not-allowed" disabled title="Contact your administrator">
                                Download Full Policy
                            </Button>
                        </div>
                        <div className="absolute -bottom-6 -right-6 h-32 w-32 bg-white/10 rounded-full blur-2xl" />
                        <div className="absolute top-10 right-10 h-16 w-16 bg-blue-400/20 rounded-full blur-xl animate-pulse" />
                    </Card>

                    <Card className="rounded-2xl border-[#f1f5f9] shadow-sm p-6 bg-white">
                        <h3 className="text-sm font-bold text-[#1e293b] mb-4">Payment Methods</h3>
                        <p className="text-xs font-medium text-[#64748b] leading-relaxed">
                            Payments are processed by your fleet administrator.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}

