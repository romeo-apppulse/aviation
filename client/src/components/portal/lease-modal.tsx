import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Aircraft } from "@shared/schema";
import { Plane, Calendar, DollarSign, ArrowRight, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";

interface LeaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    aircraft: Aircraft;
}

export default function LeaseModal({ isOpen, onClose, aircraft }: LeaseModalProps) {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const [estimatedHours, setEstimatedHours] = useState(40);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    const leaseMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/portal/leases/start", data);
            return res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/aircraft"] });
            queryClient.invalidateQueries({ queryKey: ["/api/portal/aircraft"] });
            queryClient.invalidateQueries({ queryKey: ["/api/portal/dashboard"] });
            queryClient.invalidateQueries({ queryKey: ["/api/portal/browse"] });
            queryClient.invalidateQueries({ queryKey: ["/api/portal/payments"] });
            toast({
                title: "Lease initiated successfully!",
                description: "Your school can now start operating this aircraft.",
            });
            onClose();
            setLocation("/portal/my-aircraft");
        },
        onError: (err: any) => {
            toast({
                title: "Failed to start lease",
                description: err.message || "Something went wrong",
                variant: "destructive",
            });
        },
    });

    const handleStartLease = () => {
        leaseMutation.mutate({
            aircraftId: aircraft.id,
            startDate,
            estimatedMonthlyHours: estimatedHours,
        });
    };

    const hourlyRate = aircraft.hourlyRate || 145;
    const monthlyCost = estimatedHours * hourlyRate;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] rounded-3xl border-[#f1f5f9] p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="bg-[#f8fafc] border-b border-[#f1f5f9] p-8">
                    <div className="bg-brand/10 h-14 w-14 rounded-2xl flex items-center justify-center mb-4">
                        <Plane className="h-8 w-8 text-brand" />
                    </div>
                    <DialogTitle className="text-2xl font-black text-[#1e293b]">Lease Agreement</DialogTitle>
                    <DialogDescription className="text-sm font-medium text-[#64748b] pt-1">
                        Establishing school lease for {aircraft.registration} - {aircraft.make} {aircraft.model}
                    </DialogDescription>
                </DialogHeader>

                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest">Start Date</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
                                <Input
                                    type="date"
                                    className="pl-10 h-12 rounded-xl border-[#e2e8f0] focus:ring-brand/20 bg-[#f8fafc] font-medium"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-[#94a3b8] uppercase tracking-widest">Est. Monthly Hours</Label>
                            <Input
                                type="number"
                                className="h-12 rounded-xl border-[#e2e8f0] focus:ring-brand/20 bg-[#f8fafc] font-medium"
                                value={estimatedHours}
                                min={40}
                                onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-brand/5 border border-brand/10 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-[#475569]">Hourly Dry Rate</span>
                            <span className="text-sm font-black text-[#1e293b]">${hourlyRate}.00</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-[#475569]">Monthly Commitment</span>
                            <span className="text-sm font-black text-[#1e293b]">{estimatedHours} Hours</span>
                        </div>
                        <div className="pt-4 border-t border-brand/10 flex justify-between items-center">
                            <span className="text-base font-black text-[#1e293b]">Initial Monthly Bill</span>
                            <span className="text-xl font-black text-brand">{formatCurrency(monthlyCost)}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 p-4 rounded-xl bg-[#fcfdfe] border border-[#f1f5f9]">
                        <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed text-[#64748b] font-medium">
                            By clicking "Activate Lease", you agree to our standard operating agreement and insurance requirements for flight school operators.
                        </p>
                    </div>
                </div>

                <DialogFooter className="bg-[#f8fafc] p-8 border-t border-[#f1f5f9] flex flex-row gap-4 sm:justify-between items-center">
                    <Button variant="ghost" onClick={onClose} className="font-bold text-[#64748b] hover:text-[#1e293b] rounded-xl px-6">
                        Cancel
                    </Button>
                    <Button
                        className="bg-brand hover:bg-brand-hover text-white font-black rounded-xl h-12 px-8 shadow-lg shadow-blue-100 min-w-[200px]"
                        onClick={handleStartLease}
                        disabled={leaseMutation.isPending}
                    >
                        {leaseMutation.isPending ? "Processing..." : "Activate Lease"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

