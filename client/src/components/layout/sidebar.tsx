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
} from "lucide-react";
import { useState } from "react";

import aircraft_removebg_preview from "@assets/aircraft-removebg-preview.png";

import aircraft_final_logo from "@assets/aircraft-final-logo.png";

type SidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const closeSidebarIfMobile = () => {
    if (window.innerWidth < 768) {
      setOpen(false);
    }
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  return (
    <aside
      className={cn(
        "sidebar fixed md:sticky md:top-0 z-20 bg-[#2c3e50] text-white h-screen flex-shrink-0 shadow-lg overflow-y-auto transition-all duration-300",
        collapsed ? "w-16" : "w-64",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
    >
      <div className="p-4 border-b border-[#34495e]">
        {collapsed ? (
          <div className="flex flex-col items-center space-y-2">
            <img
              src={aircraft_final_logo}
              alt="Aviation Ape"
              className="h-12 w-12 pt-[10px] pb-[10px]"
            />
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded hover:bg-[#34495e] transition-colors"
              title="Expand menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center">
              <img
                src={aircraft_final_logo}
                alt="Aviation Ape"
                className="h-18 w-18 pl-[0px] pr-[0px]"
              />
            </div>
            <div className="flex items-center justify-between">
              <h1 className="font-sans font-bold text-xl text-center flex-1">
                Aviation Ape
              </h1>
              <button
                onClick={toggleCollapse}
                className="p-1.5 rounded hover:bg-[#34495e] transition-colors flex-shrink-0"
                title="Collapse menu"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="p-4">
        {!collapsed && (
          <div className="text-xs uppercase text-gray-400 tracking-wider mb-2">
            Main Navigation
          </div>
        )}
        <nav>
          <Link
            href="/"
            onClick={closeSidebarIfMobile}
            className={cn(
              "flex items-center text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
              collapsed ? "justify-center" : "space-x-3",
              location === "/" &&
                "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]",
            )}
            title={collapsed ? "Home" : ""}
          >
            <Home className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Home</span>}
          </Link>

          <Link
            href="/dashboard"
            onClick={closeSidebarIfMobile}
            className={cn(
              "flex items-center text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
              collapsed ? "justify-center" : "space-x-3",
              location === "/dashboard" &&
                "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]",
            )}
            title={collapsed ? "Dashboard" : ""}
          >
            <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Dashboard</span>}
          </Link>

          <Link
            href="/aircraft"
            onClick={closeSidebarIfMobile}
            className={cn(
              "flex items-center text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
              collapsed ? "justify-center" : "space-x-3",
              location === "/aircraft" &&
                "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]",
            )}
            title={collapsed ? "Aircraft" : ""}
          >
            <Plane className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Aircraft</span>}
          </Link>

          <Link
            href="/owners"
            onClick={closeSidebarIfMobile}
            className={cn(
              "flex items-center text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
              collapsed ? "justify-center" : "space-x-3",
              location === "/owners" &&
                "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]",
            )}
            title={collapsed ? "Owners" : ""}
          >
            <UserCircle className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Owners</span>}
          </Link>

          <Link
            href="/lessees"
            onClick={closeSidebarIfMobile}
            className={cn(
              "flex items-center text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
              collapsed ? "justify-center" : "space-x-3",
              location === "/lessees" &&
                "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]",
            )}
            title={collapsed ? "Flight Schools" : ""}
          >
            <Building2 className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Flight Schools</span>}
          </Link>

          <Link
            href="/leases"
            onClick={closeSidebarIfMobile}
            className={cn(
              "flex items-center text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
              collapsed ? "justify-center" : "space-x-3",
              location === "/leases" &&
                "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]",
            )}
            title={collapsed ? "Lease Agreements" : ""}
          >
            <FileText className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Lease Agreements</span>}
          </Link>

          <Link
            href="/payments"
            onClick={closeSidebarIfMobile}
            className={cn(
              "flex items-center text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
              collapsed ? "justify-center" : "space-x-3",
              location === "/payments" &&
                "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]",
            )}
            title={collapsed ? "Payments" : ""}
          >
            <DollarSign className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Payments</span>}
          </Link>

          <Link
            href="/maintenance"
            onClick={closeSidebarIfMobile}
            className={cn(
              "flex items-center text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
              collapsed ? "justify-center" : "space-x-3",
              location === "/maintenance" &&
                "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]",
            )}
            title={collapsed ? "Maintenance" : ""}
          >
            <Wrench className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Maintenance</span>}
          </Link>

          <Link
            href="/documents"
            onClick={closeSidebarIfMobile}
            className={cn(
              "flex items-center text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
              collapsed ? "justify-center" : "space-x-3",
              location === "/documents" &&
                "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]",
            )}
            title={collapsed ? "Documents" : ""}
          >
            <FolderOpen className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Documents</span>}
          </Link>
        </nav>
      </div>
      <div className="p-4 mt-4">
        {!collapsed && (
          <div className="text-xs uppercase text-gray-400 tracking-wider mb-2">
            Settings
          </div>
        )}
        <nav>
          <Link
            href="/settings"
            onClick={closeSidebarIfMobile}
            className={cn(
              "flex items-center text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
              collapsed ? "justify-center" : "space-x-3",
              location === "/settings" &&
                "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]",
            )}
            title={collapsed ? "Settings" : ""}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>

          <Link
            href="/help-support"
            onClick={closeSidebarIfMobile}
            className={cn(
              "flex items-center text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
              collapsed ? "justify-center" : "space-x-3",
              location === "/help-support" &&
                "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]",
            )}
            title={collapsed ? "Help & Support" : ""}
          >
            <HelpCircle className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Help & Support</span>}
          </Link>

          <a
            href="#"
            className={cn(
              "flex items-center text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
              collapsed ? "justify-center" : "space-x-3",
            )}
            title={collapsed ? "Logout" : ""}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </a>
        </nav>
      </div>
    </aside>
  );
}
