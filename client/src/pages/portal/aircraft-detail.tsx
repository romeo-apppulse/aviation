import { useQuery } from "@tanstack/react-query";
import { Plane, Calendar, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRoute } from "wouter";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { AircraftWithDetails } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function PortalAircraftDetail() {
    const [, params] = useRoute("/portal/aircraft/:id");
    const id = parseInt(params?.id || "0");

    const { data: aircraft, isLoading: isAircraftLoading } = useQuery<AircraftWithDetails>({
        queryKey: [`/api/portal/browse/${id}`],
    });

    const { data: availability, isLoading: isAvailLoading } = useQuery<{ days: { date: string, status: string }[] }>({
        queryKey: [`/api/portal/aircraft/${id}/availability`],
    });

    if (isAircraftLoading || isAvailLoading) {
        return <div className="p-8 max-w-7xl mx-auto space-y-8"><Skeleton className="h-[600px] w-full" /></div>;
    }

    if (!aircraft) return <div>Aircraft not found</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button variant="ghost" className="text-[#64748b] hover:text-brand font-bold mb-2 rounded-xl" asChild>
                <Link href="/portal/my-aircraft">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to My Fleet
                </Link>
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Image & Info */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="overflow-hidden rounded-3xl border-[#f1f5f9] bg-white shadow-xl shadow-gray-100">
                        <div className="relative h-[480px] bg-[#f8fafc]">
                            {aircraft.image ? (
                                <img src={aircraft.image} alt={aircraft.registration} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                    <Plane className="h-32 w-32 text-[#e2e8f0]" />
                                </div>
                            )}
                            <div className="absolute top-6 right-6">
                                <Badge className={cn("px-6 py-2 rounded-full font-black text-sm shadow-xl capitalize", getStatusColor(aircraft.status || "Available"))}>
                                    {aircraft.status}
                                </Badge>
                            </div>
                        </div>

                        <CardContent className="p-8">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div>
                                    <h1 className="text-4xl font-black text-[#1e293b] tracking-tight">{aircraft.make} {aircraft.model}</h1>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-xl font-bold text-brand">{aircraft.registration}</span>
                                        {aircraft.year && (
                                            <>
                                                <div className="h-1.5 w-1.5 rounded-full bg-[#cbd5e1]" />
                                                <span className="text-[#64748b] font-bold">{aircraft.year} Model</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {aircraft.hourlyRate && (
                                    <div className="bg-[#f8fafc] p-4 rounded-2xl border border-[#f1f5f9] text-center min-w-[160px]">
                                        <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest">Hourly Rate</p>
                                        <p className="text-3xl font-black text-[#1e293b] mt-1 tracking-tight">
                                            {formatCurrency(aircraft.hourlyRate)}<span className="text-sm text-[#94a3b8]"> / hr</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-10">
                                {aircraft.engineType && (
                                    <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9]">
                                        <p className="text-[10px] font-bold text-[#94a3b8] uppercase">Engine</p>
                                        <p className="text-sm font-black text-[#1e293b] mt-1">{aircraft.engineType}</p>
                                    </div>
                                )}
                                {aircraft.avionics && (
                                    <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9]">
                                        <p className="text-[10px] font-bold text-[#94a3b8] uppercase">Avionics</p>
                                        <p className="text-sm font-black text-[#1e293b] mt-1">{aircraft.avionics}</p>
                                    </div>
                                )}
                                {aircraft.totalTime != null && (
                                    <div className="p-4 rounded-2xl bg-[#f8fafc] border border-[#f1f5f9]">
                                        <p className="text-[10px] font-bold text-[#94a3b8] uppercase">Total Time</p>
                                        <p className="text-sm font-black text-[#1e293b] mt-1">{aircraft.totalTime} hrs</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Availability */}
                <div className="space-y-8">
                    <Card className="rounded-3xl border-[#f1f5f9] shadow-xl shadow-gray-100 bg-white">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-black text-[#1e293b]">Availability</CardTitle>
                                <Calendar className="h-4 w-4 text-[#94a3b8]" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-7 gap-2">
                                {availability?.days.map((day, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all",
                                            day.status === 'available' ? "bg-emerald-50 border-emerald-100 text-emerald-600 hover:scale-110" :
                                                day.status === 'leased' ? "bg-gray-50 border-gray-100 text-gray-400 opacity-50" :
                                                    "bg-amber-50 border-amber-100 text-amber-600"
                                        )}
                                        title={`${day.date}: ${day.status}`}
                                    >
                                        {idx + 1}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 flex flex-wrap gap-4 justify-between border-t border-[#f8fafc] pt-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-tighter">Available</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                                    <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-tighter">Maint.</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                                    <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-tighter">Leased</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
