import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Aircraft from "@/pages/aircraft";
import Owners from "@/pages/owners";
import Lessees from "@/pages/lessees";
import Leases from "@/pages/leases";
import Payments from "@/pages/payments";
import Maintenance from "@/pages/maintenance";
import Documents from "@/pages/documents";
import Settings from "@/pages/settings";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useState } from "react";

function Router() {
  const { isAuthenticated, isLoading, error } = useAuth();

  // Show loading only briefly, then show landing page for unauthenticated users
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If there's an auth error (401) or user is not authenticated, show landing page
  if (error || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/aircraft" component={Aircraft} />
      <Route path="/owners" component={Owners} />
      <Route path="/lessees" component={Lessees} />
      <Route path="/leases" component={Leases} />
      <Route path="/payments" component={Payments} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/documents" component={Documents} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthenticatedLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function AuthenticatedLayout({ sidebarOpen, setSidebarOpen }: { sidebarOpen: boolean; setSidebarOpen: (open: boolean) => void }) {
  const { isAuthenticated, isLoading, error } = useAuth();

  // For unauthenticated users or auth errors, show the router directly (which will show landing page)
  if (error || !isAuthenticated) {
    return <Router />;
  }

  // Only show the sidebar/header layout for authenticated users
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          <Router />
        </main>
      </div>
    </div>
  );
}

export default App;
