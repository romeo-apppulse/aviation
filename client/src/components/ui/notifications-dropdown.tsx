import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Notification } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistance } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Clock,
  AlertCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Trash2,
  Inbox,
  Sparkles,
  ShieldCheck,
  Zap,
  Wrench,
  DollarSign,
  FileText,
  Settings,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const notificationCount = { total: notifications.length, unread: unreadCount };

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Feed Synced",
        description: "All notifications are marked as read",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const getPriorityConfig = (priority: string) => {
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
  };

  const getTypeIcon = (type: string) => {
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
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-11 w-11 rounded-xl transition-all duration-300",
            isOpen ? "bg-[#f8fafc] text-[#6366f1] shadow-inner" : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#1e293b]"
          )}
        >
          <Bell className={cn("h-[22px] w-[22px]", isOpen && "stroke-[2.5px]")} />
          {notificationCount.unread > 0 && (
            <span className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full border-2 border-white bg-[#ef4444] text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
              {notificationCount.unread > 9 ? "9+" : notificationCount.unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[420px] p-0 rounded-[24px] border-[#f1f5f9] shadow-2xl overflow-hidden bg-white/95 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300"
      >
        <div className="px-6 py-5 flex items-center justify-between bg-gradient-to-r from-[#f8fafc] to-white border-b border-[#f1f5f9]">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#1e293b]">Notifications</h3>
            {notificationCount.unread > 0 && (
              <Badge className="bg-[#6366f1] text-white hover:bg-[#6366f1] rounded-lg px-2 py-0.5 text-[10px] font-bold">
                {notificationCount.unread} NEW
              </Badge>
            )}
          </div>
          {notificationCount.unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[#6366f1] hover:text-[#4f46e5] text-[11px] font-bold uppercase tracking-wider h-auto py-1 px-2 rounded-lg"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Catch Up
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin h-8 w-8 border-2 border-[#6366f1] border-t-transparent rounded-full mx-auto" />
            <p className="text-[13px] text-[#64748b] font-medium mt-4">Syncing feed...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-[#f8fafc] rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#f1f5f9] shadow-sm">
              <Sparkles className="h-8 w-8 text-[#cbd5e1]" />
            </div>
            <p className="text-[15px] font-bold text-[#1e293b]">All clear for now</p>
            <p className="text-[13px] text-[#64748b] font-medium mt-1 uppercase tracking-widest text-[10px]">No unread system alerts</p>
          </div>
        ) : (
          <ScrollArea className="h-[480px]">
            <div className="divide-y divide-[#f8fafc]">
              {notifications.map((notification) => {
                const config = getPriorityConfig(notification.priority || "medium");
                const TypeIcon = getTypeIcon(notification.type || "system");

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group relative flex items-start gap-4 p-5 transition-all duration-300 hover:bg-[#f8fafc] cursor-pointer",
                      !notification.read ? "bg-[#f5f7ff]/50" : ""
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={cn(
                      "w-11 h-11 shrink-0 rounded-[14px] flex items-center justify-center border shadow-sm transition-transform duration-300 group-hover:scale-110",
                      config.bg, config.border, config.color
                    )}>
                      <TypeIcon className="h-[20px] w-[20px]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-[#6366f1] rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                          )}
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border leading-none bg-white",
                            config.color, config.border
                          )}>
                            {notification.priority}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-[#94a3b8] flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistance(new Date(notification.createdAt || new Date()), new Date(), { addSuffix: true })}
                        </span>
                      </div>

                      <h4 className={cn(
                        "text-[14px] leading-tight mb-1 truncate group-hover:text-[#6366f1] transition-colors",
                        !notification.read ? "font-bold text-[#1e293b]" : "font-semibold text-[#64748b]"
                      )}>
                        {notification.title}
                      </h4>
                      <p className="text-[12px] font-medium text-[#64748b] line-clamp-2 leading-relaxed opacity-80">
                        {notification.message}
                      </p>
                    </div>

                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-[#94a3b8] hover:text-[#ef4444] hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotificationMutation.mutate(notification.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {notification.actionUrl && (
                        <div className="h-8 w-8 flex items-center justify-center text-[#6366f1]">
                          <ExternalLink className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <div className="p-4 bg-[#f8fafc] border-t border-[#f1f5f9] text-center">
          <Button
            variant="link"
            className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#64748b] hover:text-[#6366f1] p-0 h-auto"
            onClick={() => { setIsOpen(false); setLocation("/notifications"); }}
          >
            Open Activity Center
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}