import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { AreaChart } from "@/components/ui/area-chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { TrendingUp, Calendar } from "lucide-react";



export default function RevenueChart() {
  const [timeFilter, setTimeFilter] = useState("last6months");

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  const chartData = data?.revenueByMonth || [];

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-[#f1f5f9] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="w-32 h-9 rounded-lg" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[240px] rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  // Calculate totals for the report
  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const totalFees = chartData.reduce((sum, item) => sum + item.managementFee, 0);

  return (
    <Card className="rounded-[24px] border border-black/[0.04] bg-white shadow-sm hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)] transition-all duration-500 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-6 pt-7 px-8 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-[17px] font-bold text-[#1C1C1E] flex items-center tracking-tight">
            Revenue Performance
            <div className="ml-2.5 px-2 py-0.5 bg-[#007AFF10] text-[#007AFF] text-[10px] font-bold rounded-full tracking-wide uppercase">
              Live
            </div>
          </CardTitle>
          <CardDescription className="text-[13px] text-[#8E8E93] font-medium tracking-tight">
            Comprehensive revenue and management fee tracking
          </CardDescription>
        </div>
        <div className="flex items-center">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="text-[13px] font-semibold w-[150px] h-10 border-black/[0.05] bg-black/[0.02] rounded-xl focus:ring-[#007AFF20]">
              <Calendar className="h-4 w-4 mr-2 text-[#8E8E93]" />
              <SelectValue placeholder="Last 6 Months" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-black/[0.05] shadow-xl">
              <SelectItem value="last6months">Last 6 Months</SelectItem>
              <SelectItem value="yeartodate">Year to Date</SelectItem>
              <SelectItem value="last12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <div className="h-[280px] w-full mt-2">
          <AreaChart
            data={chartData}
            lines={[
              { dataKey: "revenue", color: "#007AFF", label: "Revenue", gradientId: "colorRevenue" },
              { dataKey: "managementFee", color: "#34C759", label: "Mgmt Fee", gradientId: "colorFee" }
            ]}
            height={280}
          />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-0 border border-black/[0.04] rounded-[20px] overflow-hidden bg-black/[0.01]">
          <div className="p-6 space-y-2 group/rev hover:bg-black/[0.01] transition-colors">
            <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-[0.05em]">Total Revenue</p>
            <div className="flex items-center space-x-2">
              <p className="font-bold text-2xl text-[#1C1C1E] tracking-tight">{formatCurrency(totalRevenue)}</p>
              <span className="flex items-center text-[10px] font-bold text-[#34C759] bg-[#34C75915] px-2 py-0.5 rounded-full">
                <TrendingUp className="h-3 w-3 mr-1" />
                {data?.trends?.revenue || "4.2%"}
              </span>
            </div>
          </div>
          <div className="p-6 space-y-2 border-l border-black/[0.04] group/fee hover:bg-black/[0.01] transition-colors">
            <p className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-[0.05em]">Management Fees</p>
            <div className="flex items-center space-x-2">
              <p className="font-bold text-2xl text-[#1C1C1E] tracking-tight">{formatCurrency(totalFees)}</p>
              <span className="flex items-center text-[10px] font-bold text-[#34C759] bg-[#34C75915] px-2 py-0.5 rounded-full">
                <TrendingUp className="h-3 w-3 mr-1" />
                {data?.trends?.fees || "2.8%"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
