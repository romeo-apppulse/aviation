import { Switch, Route, Redirect } from "wouter";
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
import HelpSupport from "@/pages/help-support";
import AdminUsers from "@/pages/admin-users";
import AdminRevenue from "@/pages/admin-revenue";
import PortalDashboard from "@/pages/portal/dashboard";
import PortalMyAircraft from "@/pages/portal/my-aircraft";
import PortalHourLogging from "@/pages/portal/hour-logging";
import PortalPayments from "@/pages/portal/payments";
import PortalAircraftDetail from "@/pages/portal/aircraft-detail";
import PortalDocuments from "@/pages/portal/documents";
import PortalMaintenance from "@/pages/portal/maintenance";
import AcceptInvite from "@/pages/accept-invite";
import OwnerDashboard from "@/pages/owner/dashboard";
import OwnerAircraft from "@/pages/owner/aircraft";
import OwnerAircraftDetail from "@/pages/owner/aircraft-detail";
import OwnerRevenue from "@/pages/owner/revenue";
import OwnerDocuments from "@/pages/owner/documents";
import NotificationsPage from "@/pages/notifications";
import AdminHourSubmissions from "@/pages/admin-hour-submissions";
import Landing from "@/pages/landing";
import LoginPage from "@/pages/login";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useState } from "react";
import { Plane } from "lucide-react";

function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-2">No Portal Access</h2>
        <p className="text-gray-600">Your account does not have portal access. Please contact your administrator.</p>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading, error, isSuperAdmin, isAdmin, isFlightSchool, isAssetOwner, user } = useAuth();
  const isPlainUser = !!user && !isAdmin && !isFlightSchool && !isAssetOwner;

  // Show loading only briefly, then show landing page for unauthenticated users
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="bg-[#007AFF] p-3 rounded-2xl shadow-lg shadow-[#007AFF]/20">
            <Plane className="h-8 w-8 text-white" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">AeroLease <span className="text-[#007AFF]">Wise</span></div>
            <div className="h-1 w-24 bg-[#F2F2F7] rounded-full overflow-hidden mt-2">
              <div className="h-full bg-[#007AFF] rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If there's an auth error (401) or user is not authenticated, show public pages
  if (error || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={LoginPage} />
        <Route path="/accept-invite" component={AcceptInvite} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/">
        {isAssetOwner
          ? <Redirect to="/owner/dashboard" />
          : isFlightSchool
          ? <Redirect to="/portal/dashboard" />
          : isPlainUser
          ? <AccessDeniedPage />
          : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/dashboard">
        {isAssetOwner
          ? <Redirect to="/owner/dashboard" />
          : isFlightSchool
          ? <Redirect to="/portal/dashboard" />
          : isPlainUser
          ? <AccessDeniedPage />
          : <Dashboard />}
      </Route>
      <Route path="/aircraft" component={Aircraft} />
      <Route path="/owners" component={Owners} />
      <Route path="/lessees" component={Lessees} />
      <Route path="/leases" component={Leases} />
      <Route path="/payments" component={Payments} />
      <Route path="/maintenance" component={Maintenance} />
      <Route path="/documents" component={Documents} />
      <Route path="/settings" component={Settings} />
      <Route path="/help-support" component={HelpSupport} />
      <Route path="/admin/users">
        {isSuperAdmin ? <AdminUsers /> : <NotFound />}
      </Route>
      <Route path="/admin/revenue">
        {isAdmin ? <AdminRevenue /> : <NotFound />}
      </Route>
      <Route path="/admin/hour-submissions">
        {isAdmin ? <AdminHourSubmissions /> : <Redirect to="/dashboard" />}
      </Route>

      {/* Portal Routes — accessible to flight_school, admin, and super_admin */}
      <Route path="/portal">
        {isFlightSchool || isAdmin ? <PortalDashboard /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/portal/dashboard">
        {isFlightSchool || isAdmin ? <PortalDashboard /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/portal/my-aircraft">
        {isFlightSchool || isAdmin ? <PortalMyAircraft /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/portal/hour-logging">
        {isFlightSchool || isAdmin ? <PortalHourLogging /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/portal/payments">
        {isFlightSchool || isAdmin ? <PortalPayments /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/portal/aircraft/:id">
        {isFlightSchool || isAdmin ? <PortalAircraftDetail /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/portal/documents">
        {isFlightSchool || isAdmin ? <PortalDocuments /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/portal/maintenance">
        {isFlightSchool ? <PortalMaintenance /> : <Redirect to="/maintenance" />}
      </Route>
      {/* Owner Routes — accessible to asset_owner and admin */}
      <Route path="/owner">
        {isAssetOwner || isAdmin ? <OwnerDashboard /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/owner/dashboard">
        {isAssetOwner || isAdmin ? <OwnerDashboard /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/owner/aircraft">
        {isAssetOwner || isAdmin ? <OwnerAircraft /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/owner/aircraft/:id">
        {isAssetOwner || isAdmin ? <OwnerAircraftDetail /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/owner/revenue">
        {isAssetOwner || isAdmin ? <OwnerRevenue /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/owner/documents">
        {isAssetOwner || isAdmin ? <OwnerDocuments /> : <Redirect to="/dashboard" />}
      </Route>
      <Route path="/notifications" component={NotificationsPage} />
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
  if (isLoading || error || !isAuthenticated) {
    return <Router />;
  }

  // Only show the sidebar/header layout for authenticated users
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 bg-gray-50 p-4 md:p-6">
          <Router />
        </main>
      </div>
    </div>
  );
}

export default App;
