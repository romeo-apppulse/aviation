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
  LogOut
} from "lucide-react";

type SidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const [location] = useLocation();
  
  const closeSidebarIfMobile = () => {
    if (window.innerWidth < 768) {
      setOpen(false);
    }
  };
  
  return (
    <aside 
      className={cn(
        "sidebar fixed md:static z-20 bg-[#2c3e50] text-white w-64 h-screen flex-shrink-0 shadow-lg overflow-y-auto transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <div className="p-4 flex items-center space-x-3 border-b border-[#34495e]">
        <Plane className="text-[#3498db] h-6 w-6" />
        <h1 className="font-sans font-bold text-xl">AeroLease</h1>
      </div>
      
      <div className="p-4">
        <div className="text-xs uppercase text-gray-400 tracking-wider mb-2">Main Navigation</div>
        <nav>
          <Link href="/">
            <a
              onClick={closeSidebarIfMobile}
              className={cn(
                "flex items-center space-x-3 text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
                location === "/" && "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]"
              )}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </a>
          </Link>
          
          <Link href="/aircraft">
            <a
              onClick={closeSidebarIfMobile}
              className={cn(
                "flex items-center space-x-3 text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
                location === "/aircraft" && "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]"
              )}
            >
              <Plane className="h-5 w-5" />
              <span>Aircraft</span>
            </a>
          </Link>
          
          <Link href="/owners">
            <a
              onClick={closeSidebarIfMobile}
              className={cn(
                "flex items-center space-x-3 text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
                location === "/owners" && "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]"
              )}
            >
              <UserCircle className="h-5 w-5" />
              <span>Owners</span>
            </a>
          </Link>
          
          <Link href="/lessees">
            <a
              onClick={closeSidebarIfMobile}
              className={cn(
                "flex items-center space-x-3 text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
                location === "/lessees" && "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]"
              )}
            >
              <Building2 className="h-5 w-5" />
              <span>Flight Schools</span>
            </a>
          </Link>
          
          <Link href="/leases">
            <a
              onClick={closeSidebarIfMobile}
              className={cn(
                "flex items-center space-x-3 text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
                location === "/leases" && "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]"
              )}
            >
              <FileText className="h-5 w-5" />
              <span>Lease Agreements</span>
            </a>
          </Link>
          
          <Link href="/payments">
            <a
              onClick={closeSidebarIfMobile}
              className={cn(
                "flex items-center space-x-3 text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
                location === "/payments" && "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]"
              )}
            >
              <DollarSign className="h-5 w-5" />
              <span>Payments</span>
            </a>
          </Link>
          
          <Link href="/maintenance">
            <a
              onClick={closeSidebarIfMobile}
              className={cn(
                "flex items-center space-x-3 text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
                location === "/maintenance" && "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]"
              )}
            >
              <Wrench className="h-5 w-5" />
              <span>Maintenance</span>
            </a>
          </Link>
          
          <Link href="/documents">
            <a
              onClick={closeSidebarIfMobile}
              className={cn(
                "flex items-center space-x-3 text-white p-3 rounded transition hover:bg-[#34495e] mb-1",
                location === "/documents" && "bg-[rgba(52,152,219,0.2)] border-l-4 border-[#3498db]"
              )}
            >
              <FolderOpen className="h-5 w-5" />
              <span>Documents</span>
            </a>
          </Link>
        </nav>
      </div>
      
      <div className="p-4 mt-4">
        <div className="text-xs uppercase text-gray-400 tracking-wider mb-2">Settings</div>
        <nav>
          <a href="#" className="flex items-center space-x-3 text-white p-3 rounded transition hover:bg-[#34495e] mb-1">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </a>
          
          <a href="#" className="flex items-center space-x-3 text-white p-3 rounded transition hover:bg-[#34495e] mb-1">
            <HelpCircle className="h-5 w-5" />
            <span>Help & Support</span>
          </a>
          
          <a href="#" className="flex items-center space-x-3 text-white p-3 rounded transition hover:bg-[#34495e] mb-1">
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </a>
        </nav>
      </div>
    </aside>
  );
}
