import KpiCards from "@/components/dashboard/kpi-cards";
import RevenueChart from "@/components/dashboard/revenue-chart";
import PaymentStatus from "@/components/dashboard/payment-status";
import AircraftFleet from "@/components/dashboard/aircraft-fleet";
import MaintenanceSchedule from "@/components/dashboard/maintenance-schedule";
import ActivityFeed from "@/components/dashboard/activity-feed";
import { useRealTimeUpdates } from "@/hooks/use-realtime";
import { Helmet } from "react-helmet";

export default function Dashboard() {
  // Enable real-time updates for dashboard data
  useRealTimeUpdates();
  return (
    <>
      <Helmet>
        <title>Dashboard - AeroLease Manager</title>
        <meta name="description" content="Dashboard overview of aircraft fleet, revenue, and maintenance status" />
      </Helmet>
      
      <div className="w-full">
        {/* Dashboard KPI Cards */}
        <KpiCards />
        
        {/* Revenue Chart and Payment Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <div>
            <PaymentStatus />
          </div>
        </div>
        
        {/* Aircraft Fleet, Maintenance, and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AircraftFleet />
          </div>
          <div className="space-y-6">
            <MaintenanceSchedule />
            <ActivityFeed />
          </div>
        </div>
      </div>
    </>
  );
}
