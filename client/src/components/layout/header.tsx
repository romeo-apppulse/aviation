import { useLocation } from "wouter";
import { Menu, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { NotificationsDropdown } from "@/components/ui/notifications-dropdown";

type HeaderProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/":                     { title: "Home",               subtitle: "Welcome back" },
  "/dashboard":            { title: "Dashboard",          subtitle: "Fleet overview" },
  "/aircraft":             { title: "Aircraft",           subtitle: "Fleet registry" },
  "/owners":               { title: "Owners",             subtitle: "Asset owners" },
  "/lessees":              { title: "Flight Schools",     subtitle: "Operators & lessees" },
  "/leases":               { title: "Leases",             subtitle: "Lease agreements" },
  "/payments":             { title: "Payments",           subtitle: "Billing & invoices" },
  "/maintenance":          { title: "Maintenance",        subtitle: "Service records" },
  "/documents":            { title: "Documents",          subtitle: "Files & attachments" },
  "/settings":             { title: "Settings",           subtitle: "Account & preferences" },
  "/help-support":         { title: "Help & Support",     subtitle: "Get assistance" },
  "/admin/users":          { title: "User Management",    subtitle: "Accounts & roles" },
  "/admin/revenue":        { title: "Revenue Analytics",  subtitle: "Platform financials" },
  "/portal/dashboard":     { title: "My Dashboard",       subtitle: "Flight school overview" },
  "/portal/my-aircraft":   { title: "My Aircraft",        subtitle: "Leased fleet" },
  "/portal/hour-logging":  { title: "Hour Logging",       subtitle: "Log & track flight hours" },
  "/portal/payments":      { title: "Invoices & Payments", subtitle: "Billing & payment history" },
  "/owner":                { title: "Owner Dashboard",    subtitle: "Portfolio overview" },
  "/owner/dashboard":      { title: "Owner Dashboard",    subtitle: "Portfolio overview" },
  "/owner/aircraft":       { title: "My Fleet",           subtitle: "Aircraft portfolio" },
  "/owner/revenue":        { title: "Revenue",            subtitle: "Earnings & analytics" },
  "/owner/documents":      { title: "Documents",          subtitle: "Contracts & files" },
  "/notifications":        { title: "Notifications",      subtitle: "Activity & alerts" },
};

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const getDynamicMeta = (path: string): { title: string; subtitle: string } => {
    if (path.startsWith("/portal/aircraft/")) {
      return { title: "Aircraft Detail", subtitle: "Leased aircraft info" };
    }
    if (path.startsWith("/owner/aircraft/")) {
      return { title: "Aircraft Detail", subtitle: "Asset detail view" };
    }
    return { title: "Dashboard", subtitle: "Fleet overview" };
  };

  const meta = pageMeta[location] ?? getDynamicMeta(location);

  return (
    <header className="sticky top-0 z-40 h-[64px] bg-white/75 backdrop-blur-2xl border-b border-black/[0.06]">
      <div className="h-full px-6 flex items-center justify-between gap-4">

        {/* Left — mobile toggle + page title */}
        <div className="flex items-center gap-4 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0 h-9 w-9 rounded-xl hover:bg-black/5"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </Button>

          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold text-[#1d1d1f] leading-tight tracking-[-0.01em] truncate">
              {meta.title}
            </h1>
            <p className="text-[11px] text-[#86868b] font-medium leading-tight hidden sm:block">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Center — search */}
        <div className="hidden md:flex flex-1 max-w-[320px] mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-[14px] w-[14px] text-[#86868b]" />
            <input
              type="text"
              placeholder="Search"
              className="w-full h-[34px] pl-8 pr-4 bg-black/[0.06] rounded-[10px] text-[13px] text-[#1d1d1f] placeholder:text-[#86868b] font-medium outline-none focus:bg-black/[0.08] transition-colors"
            />
          </div>
        </div>

        {/* Right — notifications + user */}
        <div className="flex items-center gap-3 shrink-0">
          <NotificationsDropdown />

          <div className="hidden sm:flex items-center gap-2.5 pl-1 border-l border-black/[0.08]">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-sm">
              <span className="text-[11px] font-bold text-white leading-none">
                {user?.firstName?.[0] || user?.email?.[0] || 'U'}
              </span>
            </div>
            <span className="text-[13px] font-medium text-[#1d1d1f] hidden lg:block">
              {user?.firstName || user?.email || ''}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
}
