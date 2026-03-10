import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { ArrowUp, ArrowDown, Plane, FileText, DollarSign, Percent, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StatsCard } from "@/components/ui/stat-card";



export default function KpiCards() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  const stats = data || {
    totalAircraft: 0,
    activeLeases: 0,
    monthlyRevenue: 0,
    managementFees: 0,
    paymentStatus: { paid: 0, pending: 0, overdue: 0 },
    revenueByMonth: []
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="Total Aircraft"
        value={stats.totalAircraft}
        subtitle={stats.trends?.aircraft || "+2.4%"}
        icon={Plane}
        color="violet"
        isLoading={isLoading}
      />

      <StatsCard
        title="Active Leases"
        value={stats.activeLeases}
        subtitle={stats.trends?.leases || "+5.1%"}
        icon={FileText}
        color="emerald"
        isLoading={isLoading}
      />

      <StatsCard
        title="Monthly Revenue"
        value={stats.monthlyRevenue}
        subtitle={stats.trends?.revenue || "+4.2%"}
        isCurrency
        icon={DollarSign}
        color="blue"
        isLoading={isLoading}
      />

      <StatsCard
        title="Mgmt Fees (Est.)"
        value={stats.managementFees}
        subtitle={stats.trends?.fees || "+2.8%"}
        isCurrency
        icon={Percent}
        color="amber"
        isLoading={isLoading}
      />
    </div>
  );
}
