import { useLocation } from "wouter";
import { Bell, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

type HeaderProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  const getPageTitle = () => {
    const pathTitles: Record<string, string> = {
      "/": "Home",
      "/dashboard": "Dashboard",
      "/aircraft": "Aircraft",
      "/owners": "Owners",
      "/lessees": "Flight Schools",
      "/leases": "Lease Agreements",
      "/payments": "Payments",
      "/maintenance": "Maintenance",
      "/documents": "Documents"
    };
    
    return pathTitles[location] || "Dashboard";
  };
  
  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 py-3 flex justify-between items-center">
        <div className="flex items-center md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        
        <div className="flex-1 px-4 md:px-0">
          <h2 className="text-lg font-sans font-semibold text-gray-700">{getPageTitle()}</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-[#e74c3c]"></span>
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="bg-[#3498db] text-white">
                {user?.firstName?.[0] || user?.email?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="ml-2 text-sm font-sans text-gray-700 hidden md:block">
              {user?.firstName || user?.lastName 
                ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                : user?.email || 'User'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/api/logout'}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
