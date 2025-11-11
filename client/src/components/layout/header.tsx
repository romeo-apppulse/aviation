import { useLocation } from "wouter";
import { Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { NotificationsDropdown } from "@/components/ui/notifications-dropdown";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type HeaderProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: async () => {
      // Clear all cache and invalidate auth
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.clear();
      // Redirect to landing page
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Logout Failed",
        description: error.message || "Failed to logout",
        variant: "destructive",
      });
    },
  });
  
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
      "/documents": "Documents",
      "/settings": "Settings",
      "/help-support": "Help & Support"
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
          <NotificationsDropdown />
          
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
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
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              aria-label="Sign out"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
