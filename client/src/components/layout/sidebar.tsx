import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Plane,
  LayoutDashboard,
  UserCircle,
  Building2,
  FileText,
  DollarSign,
  Wrench,
  FolderOpen,
  Settings,
  HelpCircle,
  LogOut,
  Home,
  Menu,
  PanelLeftClose,
  Users,
  Shield,
  Share2,
  Plus,
  Search,
  Clock,
  TrendingUp,
  Bell
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Notification } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


type SidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, isSuperAdmin, isFlightSchool, isAssetOwner } = useAuth();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.clear();
      setLocation("/");
    },
  });

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  const closeSidebarIfMobile = () => {
    if (window.innerWidth < 768) {
      setOpen(false);
    }
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const NavLink = ({ href, icon: Icon, label, badge }: { href: string; icon: any; label: string; badge?: string | number }) => {
    const isActive = location === href;
    return (
      <Link
        href={href}
        onClick={closeSidebarIfMobile}
        className={cn(
          "flex items-center group transition-all duration-400 rounded-2xl mb-1 relative mx-2",
          collapsed ? "justify-center p-3" : "px-4 py-2.5 space-x-3.5",
          isActive
            ? "bg-black/[0.04] text-[#1C1C1E] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)]"
            : "text-[#8E8E93] hover:bg-black/[0.02] hover:text-[#1C1C1E]"
        )}
        title={collapsed ? label : ""}
      >
        <Icon className={cn(
          "h-[20px] w-[20px] shrink-0 transition-all duration-400",
          isActive ? "text-[#007AFF] stroke-[2.25px]" : "text-[#A2A2A7] group-hover:text-[#1C1C1E]"
        )} />
        {!collapsed && (
          <span className={cn(
            "text-[14px] flex-1 tracking-tight",
            isActive ? "font-bold" : "font-semibold"
          )}>
            {label}
          </span>
        )}
        {!collapsed && badge && (
          <span className="bg-[#FF3B30] text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
            {badge}
          </span>
        )}
        {isActive && (
          <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-1 h-5 bg-[#007AFF] rounded-full shadow-[0_0_8px_rgba(0,122,255,0.4)]" />
        )}
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "fixed md:sticky md:top-0 z-50 bg-[#FBFBFD] border-r border-black/[0.06] h-screen flex-shrink-0 flex flex-col transition-all duration-500 ease-in-out",
        collapsed ? "w-[84px]" : "w-[280px]",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
    >
      {/* Header / Logo Section */}
      <div className={cn(
        "p-7 flex items-center shrink-0 mb-4",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center space-x-4">
            <div className="bg-[#007AFF] p-2.5 rounded-[12px] shadow-[0_4px_12px_rgba(0,122,255,0.3)] group cursor-pointer transition-transform hover:scale-105">
              <Plane className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-[#1C1C1E] text-[17px] leading-tight tracking-tight">
                AeroLease <span className="text-[#007AFF]">Wise</span>
              </div>
              <div className="text-[10px] text-[#A2A2A7] font-bold tracking-[0.08em] uppercase mt-0.5 opacity-80">
                Aviation Management
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="bg-[#007AFF] p-2.5 rounded-[12px] shadow-[0_4px_12px_rgba(0,122,255,0.3)] transition-transform hover:scale-110">
            <Plane className="h-5 w-5 text-white" />
          </div>
        )}

        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-full hover:bg-black/[0.04] text-[#A2A2A7] hover:text-[#1C1C1E] transition-all duration-300 shrink-0"
          title={collapsed ? "Expand" : "Collapse"}
        >
          <PanelLeftClose className={cn("h-4 w-4 transition-transform duration-500", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar space-y-8">
        {/* Admin Navigation */}
        {!isFlightSchool && !isAssetOwner && (
          <>
            <div>
              {!collapsed && (
                <h3 className="text-[11px] font-bold text-[#A2A2A7] uppercase tracking-[0.12em] px-6 mb-3 opacity-60">
                  Dashboard
                </h3>
              )}
              <nav className="space-y-0.5">
                <NavLink href="/" icon={Home} label="Overview" />
                <NavLink href="/dashboard" icon={LayoutDashboard} label="Admin Metrics" />
                <NavLink href="/admin/revenue" icon={DollarSign} label="Revenue Hub" />
              </nav>
            </div>

            <div>
              {!collapsed && (
                <h3 className="text-[11px] font-bold text-[#A2A2A7] uppercase tracking-[0.12em] px-6 mb-3 opacity-60">
                  Asset Management
                </h3>
              )}
              <nav className="space-y-0.5">
                <NavLink href="/aircraft" icon={Plane} label="Total Fleet" />
                <NavLink href="/owners" icon={UserCircle} label="Asset Owners" />
                <NavLink href="/lessees" icon={Building2} label="Flight Schools" />
              </nav>
            </div>

            <div>
              {!collapsed && (
                <h3 className="text-[11px] font-bold text-[#A2A2A7] uppercase tracking-[0.12em] px-6 mb-3 opacity-60">
                  Operations
                </h3>
              )}
              <nav className="space-y-0.5">
                <NavLink href="/leases" icon={FileText} label="Agreements" />
                <NavLink href="/payments" icon={DollarSign} label="Financials" />
                <NavLink href="/maintenance" icon={Wrench} label="Technical logs" />
                <NavLink href="/documents" icon={FolderOpen} label="Vault" />
              </nav>
            </div>
          </>
        )}

        {/* Flight School Portal Navigation */}
        {isFlightSchool && (
          <>
            <div>
              {!collapsed && (
                <h3 className="text-[11px] font-bold text-[#A2A2A7] uppercase tracking-[0.12em] px-6 mb-3 opacity-60">
                  Portal
                </h3>
              )}
              <nav className="space-y-0.5">
                <NavLink href="/portal/dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavLink href="/portal/my-aircraft" icon={Plane} label="My Aircraft" />
              </nav>
            </div>

            <div>
              {!collapsed && (
                <h3 className="text-[11px] font-bold text-[#A2A2A7] uppercase tracking-[0.12em] px-6 mb-3 opacity-60">
                  Operations
                </h3>
              )}
              <nav className="space-y-0.5">
                <NavLink href="/portal/hour-logging" icon={Clock} label="Log Flight Hours" />
                <NavLink href="/portal/payments" icon={DollarSign} label="Billing & Payments" />
                <NavLink href="/portal/documents" icon={FileText} label="Documents" />
              </nav>
            </div>
          </>
        )}

        {/* Asset Owner Portal Navigation */}
        {isAssetOwner && (
          <>
            <div>
              {!collapsed && (
                <h3 className="text-[11px] font-bold text-[#A2A2A7] uppercase tracking-[0.12em] px-6 mb-3 opacity-60">
                  Overview
                </h3>
              )}
              <nav className="space-y-0.5">
                <NavLink href="/owner" icon={LayoutDashboard} label="Dashboard" />
                <NavLink href="/owner/aircraft" icon={Plane} label="My Aircraft" />
              </nav>
            </div>

            <div>
              {!collapsed && (
                <h3 className="text-[11px] font-bold text-[#A2A2A7] uppercase tracking-[0.12em] px-6 mb-3 opacity-60">
                  Financials
                </h3>
              )}
              <nav className="space-y-0.5">
                <NavLink href="/owner/revenue" icon={TrendingUp} label="Revenue & Earnings" />
                <NavLink href="/owner/documents" icon={FolderOpen} label="Contracts & Files" />
              </nav>
            </div>
          </>
        )}

        {isSuperAdmin && (
          <div>
            {!collapsed && (
              <h3 className="text-[11px] font-bold text-[#A2A2A7] uppercase tracking-[0.12em] px-6 mb-3 opacity-60">
                System
              </h3>
            )}
            <nav className="space-y-0.5">
              <NavLink href="/admin/users" icon={Users} label="User Control" />
            </nav>
          </div>
        )}

        {/* Notifications — visible to all roles */}
        <div>
          {!collapsed && (
            <h3 className="text-[11px] font-bold text-[#A2A2A7] uppercase tracking-[0.12em] px-6 mb-3 opacity-60">
              Alerts
            </h3>
          )}
          <nav className="space-y-0.5">
            <NavLink
              href="/notifications"
              icon={Bell}
              label="Notifications"
              badge={unreadCount > 0 ? unreadCount : undefined}
            />
          </nav>
        </div>
      </div>

      {/* Footer Section */}
      <div className="px-4 py-8 border-t border-black/[0.04] space-y-1 bg-[#FBFBFD]">
        <NavLink href="/settings" icon={Settings} label="Settings" />
        <NavLink href="/help-support" icon={HelpCircle} label="Assistance" />

        <div className={cn(
          "mt-6 p-3.5 rounded-[24px] bg-white border border-black/[0.04] flex items-center shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-all duration-500 hover:shadow-lg hover:border-black/[0.1] group",
          collapsed ? "justify-center" : "gap-4"
        )}>
          <div className="relative cursor-pointer shrink-0">
            <Avatar className="h-10 w-10 ring-1 ring-black/[0.05] shadow-sm transition-transform group-hover:scale-105">
              <AvatarFallback className="bg-[#1C1C1E] text-white font-bold text-[13px] tracking-tight">
                {user?.firstName?.[0] || user?.email?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#34C759] border-2 border-white rounded-full shadow-sm" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[#1C1C1E] truncate tracking-tight">
                {user?.firstName || 'User'}
              </p>
              <p className="text-[11px] font-bold text-[#8E8E93] truncate uppercase tracking-widest mt-0.5 opacity-80">
                {isSuperAdmin ? "Admin" : isFlightSchool ? "School" : isAssetOwner ? "Owner" : "Manager"}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => logoutMutation.mutate()}
              className="p-1.5 rounded-full hover:bg-[#FF3B3010] text-[#A2A2A7] hover:text-[#FF3B30] transition-all duration-300"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
