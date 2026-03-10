import { Helmet } from "react-helmet";
import { useQuery } from "@tanstack/react-query";
import { Plane, Calendar, Clock, DollarSign, ChevronRight, Fuel, Gauge, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { formatDate, formatCurrency, getStatusColor, getDaysDifference } from "@/lib/utils";
import { AircraftWithDetails, Lease } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function PortalMyAircraft() {
    const { data: aircraft, isLoading } = useQuery<(AircraftWithDetails & { currentLease: Lease })[]>({
        queryKey: ["/api/portal/aircraft"],
    });

    if (isLoading) {
        return (
            <div className="p-8 max-w-7xl mx-auto space-y-8">
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
            <title>My Fleet — AeroLease Wise</title>
        </Helmet>
        <div className="p-8 max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-[#1e293b] tracking-tight">My Fleet</h1>
                <p className="text-[#64748b] font-medium">Manage your currently leased aircraft and reporting.</p>
            </div>

            <div className="space-y-6">
                {aircraft?.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-[#f1f5f9]">
                        <Plane className="h-20 w-20 text-[#f1f5f9] mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-[#1e293b]">No aircraft leased yet</h2>
                        <p className="text-[#64748b] mt-2 font-medium">Contact your account manager to set up a lease.</p>
                    </div>
                ) : (
                    aircraft?.map((ac) => (
                        <Card key={ac.id} className="overflow-hidden rounded-2xl border-[#f1f5f9] bg-white shadow-sm hover:shadow-lg transition-all duration-300">
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
                                            <CardTitle className="text-2xl font-black text-[#1e293b]">{ac.registration}</CardTitle>
                                            <CardDescription className="text-sm font-bold text-[#64748b]">{ac.make} {ac.model} ({ac.year})</CardDescription>
                                        </div>
                                        <Badge className={cn("px-4 py-1.5 rounded-full font-black text-xs shadow-sm capitalize", getStatusColor("Active"))}>
                                            Active Lease
                                        </Badge>
                                    </CardHeader>

                                    <CardContent className="flex-1">
                                        {ac.currentLease?.endDate && (() => {
                                            const daysLeft = getDaysDifference(ac.currentLease.endDate);
                                            if (daysLeft <= 15) {
                                                return (
                                                    <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-700">
                                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                                        <p className="text-[12px] font-bold">URGENT: Lease expires in {daysLeft} days - contact your account manager</p>
                                                    </div>
                                                );
                                            } else if (daysLeft <= 60) {
                                                return (
                                                    <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-700">
                                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                                        <p className="text-[12px] font-bold">Lease expires in {daysLeft} days</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 rounded-xl bg-[#f8fafc] border border-[#f1f5f9]">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Hourly Rate</p>
                                                <p className="text-lg font-black text-brand leading-none">${ac.currentLease.hourlyRate}<span className="text-xs text-[#94a3b8] font-bold">/hr</span></p>
                                            </div>
                                            <div className="space-y-1 border-l border-[#e2e8f0] pl-6">
                                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Min. Monthly</p>
                                                <p className="text-lg font-black text-[#475569] leading-none">{ac.currentLease.minimumHours}<span className="text-xs text-[#94a3b8] font-bold">hrs</span></p>
                                            </div>
                                            <div className="space-y-1 border-l border-[#e2e8f0] pl-6 hidden md:block">
                                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Lease Start</p>
                                                <p className="text-sm font-bold text-[#475569] mt-1">{formatDate(ac.currentLease.startDate)}</p>
                                            </div>
                                            <div className="space-y-1 border-l border-[#e2e8f0] pl-6 hidden md:block">
                                                <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Lease End</p>
                                                <p className="text-sm font-bold text-[#475569] mt-1">{ac.currentLease.endDate ? formatDate(ac.currentLease.endDate) : 'Indefinite'}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mt-6">
                                            <Link href={`/portal/hour-logging?aircraftId=${ac.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-[#f1f5f9] hover:bg-[#fcfdfe] transition-colors cursor-pointer group">
                                                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                                                    <Gauge className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide">Usage Reporting</p>
                                                    <p className="text-[13px] font-bold text-[#1e293b] group-hover:text-brand transition-colors">Submit monthly hours</p>
                                                </div>
                                                <ChevronRight className="ml-auto h-4 w-4 text-[#cbd5e1] group-hover:text-brand" />
                                            </Link>
                                            <Link href={`/portal/hour-logging?aircraftId=${ac.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-[#f1f5f9] hover:bg-[#fcfdfe] transition-colors cursor-pointer group">
                                                <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                                                    <Calendar className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wide">Log Hours</p>
                                                    <p className="text-[13px] font-bold text-[#1e293b] group-hover:text-brand transition-colors">Log flight hours</p>
                                                </div>
                                                <ChevronRight className="ml-auto h-4 w-4 text-[#cbd5e1] group-hover:text-brand" />
                                            </Link>
                                        </div>
                                    </CardContent>

                                    <div className="p-4 bg-[#fcfdfe] border-t border-[#f1f5f9] flex justify-end gap-3">
                                        <Button variant="outline" className="rounded-xl font-bold text-[#64748b] border-[#e2e8f0]" asChild>
                                            <Link href={`/portal/payments?aircraftId=${ac.id}`}>View Invoices</Link>
                                        </Button>
                                        <Button variant="outline" className="rounded-xl font-bold text-[#64748b] border-[#e2e8f0]" asChild>
                                            <Link href={`/portal/aircraft/${ac.id}`}>View Aircraft Info</Link>
                                        </Button>
                                        <Button className="bg-brand hover:bg-brand-hover text-white font-bold rounded-xl shadow-lg shadow-blue-50" asChild>
                                            <Link href={`/portal/hour-logging?aircraftId=${ac.id}`}>Log Flight Hours</Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
        </>
    );
}
