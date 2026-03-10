import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { Plane, Calendar, AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { formatDate, formatCurrency, getDaysDifference } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function OwnerAircraft() {
    const { data: aircraft, isLoading } = useQuery<any[]>({
        queryKey: ["/api/owner/aircraft"],
    });

    if (isLoading) {
        return (
            <div className="p-10 max-w-7xl mx-auto space-y-8">
                <Skeleton className="h-10 w-64" />
                <div className="space-y-6">
                    {[1, 2].map(i => <Skeleton key={i} className="h-64 rounded-2xl" />)}
                </div>
            </div>
        );
    }

    return (
        <>
        <Helmet>
            <title>My Aircraft — AeroLease Wise</title>
        </Helmet>
        <div className="p-10 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-[#1e293b] tracking-tight">My Aircraft</h1>
                <p className="text-[#64748b] font-medium">View all aircraft in your portfolio and their current status.</p>
            </div>

            <div className="space-y-6">
                {aircraft?.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-[#f1f5f9]">
                        <Plane className="h-20 w-20 text-[#f1f5f9] mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-[#1e293b]">No aircraft in portfolio</h2>
                        <p className="text-[#64748b] mt-2 font-medium">Contact your account manager to add aircraft.</p>
                    </div>
                ) : (
                    aircraft?.map((ac) => {
                        const daysLeft = ac.currentLease?.endDate ? getDaysDifference(ac.currentLease.endDate) : null;
                        return (
                            <Link key={ac.id} href={`/owner/aircraft/${ac.id}`}>
                                <Card className="overflow-hidden rounded-2xl border-[#f1f5f9] bg-white shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group">
                                    <div className="flex flex-col lg:flex-row">
                                        <div className="w-full lg:w-80 h-64 lg:h-auto overflow-hidden bg-[#f8fafc]">
                                            {ac.image ? (
                                                <img src={ac.image} alt={ac.registration} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center">
                                                    <Plane className="h-20 w-20 text-[#e2e8f0]" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            <CardHeader className="flex flex-row items-center justify-between pb-4">
                                                <div>
                                                    <CardTitle className="text-2xl font-black text-[#1e293b] group-hover:text-[#007AFF] transition-colors">{ac.registration}</CardTitle>
                                                    <CardDescription className="text-sm font-bold text-[#64748b]">{ac.make} {ac.model} ({ac.year})</CardDescription>
                                                </div>
                                                <Badge className={cn("px-4 py-1.5 rounded-full font-black text-xs shadow-sm capitalize", ac.currentLease ? "bg-[#ecfdf5] text-[#10b981] border-[#d1fae5]" : "bg-gray-100 text-gray-500 border-gray-200")}>
                                                    {ac.currentLease ? "Leased" : "Available"}
                                                </Badge>
                                            </CardHeader>

                                            <CardContent className="flex-1">
                                                {daysLeft !== null && daysLeft <= 60 && (
                                                    <div className={cn("flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl", daysLeft <= 15 ? "bg-red-50 border border-red-100 text-red-700" : "bg-amber-50 border border-amber-100 text-amber-700")}>
                                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                                        <p className="text-[12px] font-bold">
                                                            {daysLeft <= 15 ? `URGENT: Lease expires in ${daysLeft} days` : `Lease expires in ${daysLeft} days`}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 rounded-xl bg-[#f8fafc] border border-[#f1f5f9]">
                                                    {ac.currentLease ? (
                                                        <>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Lessee</p>
                                                                <p className="text-sm font-bold text-[#475569]">{ac.lesseeName || "N/A"}</p>
                                                            </div>
                                                            <div className="space-y-1 border-l border-[#e2e8f0] pl-6">
                                                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Lease Period</p>
                                                                <p className="text-xs font-bold text-[#475569]">{formatDate(ac.currentLease.startDate)} - {ac.currentLease.endDate ? formatDate(ac.currentLease.endDate) : "Ongoing"}</p>
                                                            </div>
                                                            <div className="space-y-1 border-l border-[#e2e8f0] pl-6 hidden md:block">
                                                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Hours (Month)</p>
                                                                <p className="text-lg font-black text-[#475569] leading-none">{ac.hoursThisMonth || 0}<span className="text-xs text-[#94a3b8] font-bold"> hrs</span></p>
                                                            </div>
                                                            <div className="space-y-1 border-l border-[#e2e8f0] pl-6 hidden md:block">
                                                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Net Revenue</p>
                                                                <p className="text-lg font-black text-[#10b981] leading-none">{formatCurrency(ac.netThisMonth || 0)}</p>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="col-span-full text-center py-2">
                                                            <p className="text-sm font-medium text-[#94a3b8]">Not currently leased</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {ac.currentLease && (
                                                    <div className="grid grid-cols-2 gap-4 mt-4 md:hidden">
                                                        <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#f1f5f9]">
                                                            <p className="text-[10px] font-bold text-[#94a3b8] uppercase">Hours</p>
                                                            <p className="text-lg font-black text-[#475569]">{ac.hoursThisMonth || 0} hrs</p>
                                                        </div>
                                                        <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#f1f5f9]">
                                                            <p className="text-[10px] font-bold text-[#94a3b8] uppercase">Net</p>
                                                            <p className="text-lg font-black text-[#10b981]">{formatCurrency(ac.netThisMonth || 0)}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </CardContent>

                                            <div className="p-4 bg-[#fcfdfe] border-t border-[#f1f5f9] flex justify-end">
                                                <div className="flex items-center gap-2 text-[#007AFF] font-bold text-sm group-hover:gap-3 transition-all">
                                                    View Details <ChevronRight className="h-4 w-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
        </>
    );
}
