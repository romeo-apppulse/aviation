import { useQuery } from "@tanstack/react-query";
import { MaintenanceWithDetails } from "@shared/schema";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar, Wrench, ChevronRight, AlertTriangle, Plus } from "lucide-react";
import { AircraftImage } from "@/components/ui/aircraft-image";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function MaintenanceSchedule() {
  const { data: upcomingMaintenance, isLoading } = useQuery<MaintenanceWithDetails[]>({
    queryKey: ["/api/maintenance/upcoming"],
  });

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-[#f1f5f9] shadow-sm">
        <CardHeader className="pb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full rounded-2xl mb-6" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[24px] border border-black/[0.04] bg-white shadow-sm hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)] transition-all duration-500 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-6 pt-7 px-8 border-b border-black/[0.02]">
        <div className="space-y-1.5">
          <CardTitle className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Maintenace</CardTitle>
          <CardDescription className="text-[13px] text-[#8E8E93] font-medium tracking-tight">
            Upcoming aircraft inspections
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-[#007AFF] hover:text-[#007AFF] hover:bg-[#007AFF08] font-bold text-[12px] tracking-tight px-3 rounded-full" asChild>
          <Link href="/maintenance">Schedule</Link>
        </Button>
      </CardHeader>

      <CardContent className="px-8 pt-7 pb-8">
        <div className="space-y-6">
          <div className="group relative rounded-[20px] overflow-hidden h-36 mb-6 shadow-sm border border-black/[0.04]">
            <AircraftImage
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:rotate-1"
              src="https://images.unsplash.com/photo-1540962351504-03099e0a754b?q=80&w=2000&auto=format&fit=crop"
              alt="Aircraft maintenance"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-5 left-5 text-white">
              <h4 className="text-[15px] font-bold tracking-tight">Priority Fleet Tasks</h4>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.1em] mt-1">Next 14 Days Overview</p>
            </div>
          </div>

          {upcomingMaintenance && upcomingMaintenance.length > 0 ? (
            <div className="space-y-4">
              {upcomingMaintenance.slice(0, 3).map((maintenance) => {
                const days = Math.round(
                  (new Date(maintenance.scheduledDate).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
                );

                return (
                  <div key={maintenance.id} className="group flex items-center justify-between p-4 rounded-[18px] border border-black/[0.03] bg-white hover:bg-black/[0.01] hover:border-black/[0.08] transition-all duration-300 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-2xl bg-black/[0.02] border border-black/[0.03] flex items-center justify-center mr-4 group-hover:bg-[#007AFF] group-hover:border-[#007AFF20] transition-colors duration-300">
                        <Wrench className="h-5 w-5 text-[#8E8E93] group-hover:text-white transition-colors duration-300" />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-[#1C1C1E] tracking-tight">{maintenance.aircraft?.registration}</p>
                        <p className="text-[11px] font-medium text-[#8E8E93] tracking-tight mt-0.5">{maintenance.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full border shadow-sm tracking-tight inline-block",
                        days < 0 ? "bg-[#FF3B3010] text-[#FF3B30] border-[#FF3B3020]" :
                          days < 7 ? "bg-[#FF950010] text-[#FF9500] border-[#FF950020]" :
                            "bg-[#34C75910] text-[#34C759] border-[#34C75920]"
                      )}>
                        {days === 0 ? 'Today' : days > 0 ? `In ${days}d` : `${Math.abs(days)}d ago`}
                      </span>
                    </div>
                  </div>
                );
              })}

              <Button
                className="w-full h-11 mt-4 bg-black/[0.02] border-black/[0.05] text-[#1C1C1E] hover:bg-black/[0.05] rounded-xl text-[13px] font-bold transition-all"
                variant="outline"
                asChild
              >
                <Link href="/maintenance">
                  <Plus className="h-4 w-4 mr-2" />
                  New Schedule
                </Link>
              </Button>
            </div>
          ) : (
            <div className="py-12 text-center border border-black/[0.04] bg-black/[0.01] rounded-[24px]">
              <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm border border-black/[0.03]">
                <Calendar className="h-6 w-6 text-[#C7C7CC]" />
              </div>
              <h3 className="text-[15px] font-bold text-[#1C1C1E] tracking-tight">Fleet Clear</h3>
              <p className="text-[12px] text-[#A2A2A7] mt-1.5 font-medium">No pending maintenance tasks</p>
              <Button
                className="mt-6 h-10 bg-[#007AFF] hover:bg-[#007AFFee] text-white rounded-xl text-[12px] font-bold shadow-md px-8 trasition-all"
                asChild
              >
                <Link href="/maintenance">Schedule New</Link>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
