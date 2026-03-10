import { Helmet } from "react-helmet";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistance, isToday, isYesterday } from "date-fns";
import {
  Bell,
  CheckCheck,
  Clock,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  Sparkles,
  Settings,
  Wrench,
  DollarSign,
  FileText,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function getPriorityConfig(priority: string) {
  switch (priority) {
    case "urgent":
      return { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" };
    case "high":
      return { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100" };
    case "medium":
      return { icon: Info, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" };
    case "low":
      return { icon: Clock, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-100" };
    default:
      return { icon: Info, color: "text-indigo-500", bg: "bg-indigo-50", border: "border-indigo-100" };
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case "payment":
      return DollarSign;
    case "maintenance":
      return Wrench;
    case "lease":
      return FileText;
    case "document":
      return Inbox;
    case "system":
      return Settings;
    default:
      return Bell;
  }
}

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];

  for (const n of notifications) {
    const date = new Date(n.createdAt || new Date());
    if (isToday(date)) {
      today.push(n);
    } else if (isYesterday(date)) {
      yesterday.push(n);
    } else {
      earlier.push(n);
    }
  }

  const groups: { label: string; items: Notification[] }[] = [];
  if (today.length > 0) groups.push({ label: "Today", items: today });
  if (yesterday.length > 0) groups.push({ label: "Yesterday", items: yesterday });
  if (earlier.length > 0) groups.push({ label: "Earlier", items: earlier });

  return groups;
}

export default function NotificationsPage() {
  const { toast } = useToast();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const groups = groupByDate(notifications);

  return (
    <>
    <Helmet>
      <title>Notifications — AeroLease Wise</title>
    </Helmet>
    <div className="max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1e293b]">All Notifications</h2>
          <p className="text-sm text-[#64748b] mt-0.5">
            {notifications.length === 0
              ? "No notifications yet"
              : `${notifications.length} total · ${unreadCount} unread`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-[#6366f1] border-[#6366f1]/30 hover:bg-[#6366f1]/5 font-semibold"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#f1f5f9] p-16 text-center shadow-sm">
          <div className="animate-spin h-8 w-8 border-2 border-[#6366f1] border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-[#64748b] font-medium mt-4">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#f1f5f9] p-20 text-center shadow-sm">
          <div className="w-16 h-16 bg-[#f8fafc] rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#f1f5f9]">
            <Sparkles className="h-8 w-8 text-[#cbd5e1]" />
          </div>
          <p className="text-base font-bold text-[#1e293b]">All clear</p>
          <p className="text-sm text-[#64748b] mt-1">No notifications to show</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#94a3b8] mb-3 px-1">
                {group.label}
              </h3>
              <div className="bg-white rounded-2xl border border-[#f1f5f9] shadow-sm overflow-hidden divide-y divide-[#f8fafc]">
                {group.items.map((notification) => {
                  const config = getPriorityConfig(notification.priority || "medium");
                  const TypeIcon = getTypeIcon(notification.type || "system");

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "group flex items-start gap-4 p-5 transition-colors hover:bg-[#f8fafc]",
                        !notification.read ? "bg-[#f5f7ff]/50" : ""
                      )}
                    >
                      <div
                        className={cn(
                          "w-11 h-11 shrink-0 rounded-[14px] flex items-center justify-center border shadow-sm",
                          config.bg, config.border, config.color
                        )}
                      >
                        <TypeIcon className="h-[20px] w-[20px]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <div className="w-2 h-2 bg-[#6366f1] rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            )}
                            <span
                              className={cn(
                                "text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border leading-none bg-white",
                                config.color, config.border
                              )}
                            >
                              {notification.priority}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-[#94a3b8] flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistance(new Date(notification.createdAt || new Date()), new Date(), { addSuffix: true })}
                          </span>
                        </div>

                        <h4
                          className={cn(
                            "text-[14px] leading-tight mb-1",
                            !notification.read ? "font-bold text-[#1e293b]" : "font-semibold text-[#64748b]"
                          )}
                        >
                          {notification.title}
                        </h4>
                        <p className="text-[12px] font-medium text-[#64748b] leading-relaxed">
                          {notification.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-[#94a3b8] hover:text-[#6366f1] hover:bg-[#6366f1]/10"
                            title="Mark as read"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-[#94a3b8] hover:text-[#ef4444] hover:bg-red-50"
                          title="Delete"
                          onClick={() => deleteNotificationMutation.mutate(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
