import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border shadow-sm rounded-md">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-blue-600">Revenue: {formatCurrency(payload[0].value || 0)}</p>
        <p className="text-sm text-orange-600">Management Fee: {formatCurrency(payload[1].value || 0)}</p>
      </div>
    );
  }

  return null;
};

export default function RevenueChart() {
  const [timeFilter, setTimeFilter] = useState("last6months");
  
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  const chartData = data?.revenueByMonth || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-sans font-semibold text-gray-700">Revenue Overview</CardTitle>
          <Skeleton className="w-32 h-9" />
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[220px]" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals for the report
  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);
  const totalFees = chartData.reduce((sum, item) => sum + item.managementFee, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-sans font-semibold text-gray-700">Revenue Overview</CardTitle>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-500">Filter:</span>
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="text-xs w-[140px] h-9">
              <SelectValue placeholder="Last 6 Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last6months">Last 6 Months</SelectItem>
              <SelectItem value="yeartodate">Year to Date</SelectItem>
              <SelectItem value="last12months">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue" fill="#3498db" radius={[4, 4, 0, 0]} />
              <Bar dataKey="managementFee" name="Management Fee" fill="#e74c3c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Total Revenue</p>
            <p className="font-mono font-medium text-lg">{formatCurrency(totalRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Management Fees</p>
            <p className="font-mono font-medium text-lg">{formatCurrency(totalFees)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
