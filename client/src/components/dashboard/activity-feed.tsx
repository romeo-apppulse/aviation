import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Plane, DollarSign, Wrench, FileText, Clock, ChevronRight } from "lucide-react";
import { getRelativeDateLabel, getStatusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityItem {
  id: string;
  type: 'payment' | 'maintenance' | 'lease' | 'aircraft';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error' | 'info';
}

const getActivityIcon = (type: string, status: string) => {
  const iconBase = "h-4 w-4";
  switch (type) {
    case 'payment':
      return <DollarSign className={iconBase} />;
    case 'maintenance':
      return <Wrench className={iconBase} />;
    case 'lease':
      return <FileText className={iconBase} />;
    case 'aircraft':
      return <Plane className={iconBase} />;
    default:
      return <Bell className={iconBase} />;
  }
};


export default function ActivityFeed() {
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"]
  });

  const recentActivity: ActivityItem[] = (notifications || []).slice(0, 10).map(n => ({
    id: n.id.toString(),
    type: (['payment', 'maintenance', 'lease', 'aircraft'].includes(n.type) ? n.type : 'aircraft') as any,
    title: n.title,
    description: n.message,
    timestamp: n.createdAt ? new Date(n.createdAt) : new Date(),
    status: n.priority === 'urgent' ? 'error' : n.priority === 'high' ? 'warning' : 'info'
  }));

  return (
    <Card className="rounded-[24px] border border-black/[0.04] bg-white shadow-sm hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)] transition-all duration-500 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-6 pt-7 px-8 border-b border-black/[0.02]">
        <div className="space-y-1.5">
          <CardTitle className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Activity Feed</CardTitle>
          <CardDescription className="text-[13px] text-[#8E8E93] font-medium tracking-tight">
            Recent updates from your fleet
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[460px] px-8 py-6">
          <div className="space-y-6">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <Skeleton className="w-10 h-10 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))
            ) : recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[380px] text-center space-y-3">
                <div className="w-14 h-14 rounded-[20px] bg-black/[0.02] flex items-center justify-center border border-black/[0.03] shadow-sm">
                  <Bell className="h-7 w-7 text-[#C7C7CC]" />
                </div>
                <p className="text-[15px] font-bold text-[#1C1C1E] tracking-tight">No Recent Activity</p>
                <p className="text-[13px] text-[#8E8E93] font-medium">Operational updates will appear here.</p>
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div key={activity.id} className="relative group flex items-start space-x-4 rounded-[18px] transition-all duration-300">
                  {/* Connector line for the timeline feel */}
                  {index < recentActivity.length - 1 && (
                    <div className="absolute left-[20px] top-[48px] bottom-[-24px] w-0.5 bg-black/[0.03]" />
                  )}

                  <div className={cn(
                    "relative z-10 w-10 h-10 shrink-0 flex items-center justify-center rounded-2xl border transition-all duration-300 group-hover:scale-105 shadow-sm",
                    activity.status === 'error' ? "bg-[#FF3B3015] text-[#FF3B30] border-[#FF3B3020]" :
                      activity.status === 'warning' ? "bg-[#FF950015] text-[#FF9500] border-[#FF950020]" :
                        "bg-[#007AFF15] text-[#007AFF] border-[#007AFF20]"
                  )}>
                    {getActivityIcon(activity.type, activity.status)}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[14px] font-bold text-[#1C1C1E] leading-tight group-hover:text-[#007AFF] transition-colors tracking-tight">{activity.title}</p>
                      <div className="flex items-center text-[10px] text-[#A2A2A7] font-bold uppercase tracking-wider">
                        <Clock className="h-3 w-3 mr-1 opacity-40" />
                        {getRelativeDateLabel(activity.timestamp)}
                      </div>
                    </div>
                    <p className="text-[12px] text-[#8E8E93] font-medium leading-relaxed line-clamp-2 tracking-tight">{activity.description}</p>
                  </div>

                  <ChevronRight className="h-4 w-4 text-[#C7C7CC] self-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0" />
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="px-8 py-5 bg-black/[0.01] border-t border-black/[0.03] text-center">
          <Button variant="link" size="sm" className="text-[#007AFF] hover:text-[#007AFF] font-bold text-[12px] tracking-tight p-0 h-auto">
            View All Notifications
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}