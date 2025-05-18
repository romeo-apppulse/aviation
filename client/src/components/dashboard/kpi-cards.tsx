import { useQuery } from "@tanstack/react-query";
import { DashboardStats } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { ArrowUp, ArrowDown, Plane, FileText, DollarSign, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function KpiCards() {
  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16 mt-1" />
              </div>
              <Skeleton className="rounded-full h-12 w-12" />
            </div>
            <div className="mt-3 flex items-center text-xs">
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const stats = data || {
    totalAircraft: 0,
    activeLeases: 0,
    monthlyRevenue: 0,
    managementFees: 0,
    paymentStatus: { paid: 0, pending: 0, overdue: 0 },
    revenueByMonth: []
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Aircraft</p>
            <p className="text-2xl font-sans font-bold text-[#2c3e50] mt-1">{stats.totalAircraft}</p>
          </div>
          <div className="rounded-full bg-[#3498db] bg-opacity-10 w-12 h-12 flex items-center justify-center">
            <Plane className="text-[#3498db] h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs">
          <span className="text-green-500 flex items-center">
            <ArrowUp className="h-3 w-3 mr-1" /> 8%
          </span>
          <span className="text-gray-500 ml-2">from last month</span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Active Leases</p>
            <p className="text-2xl font-sans font-bold text-[#2c3e50] mt-1">{stats.activeLeases}</p>
          </div>
          <div className="rounded-full bg-green-500 bg-opacity-10 w-12 h-12 flex items-center justify-center">
            <FileText className="text-green-500 h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs">
          <span className="text-green-500 flex items-center">
            <ArrowUp className="h-3 w-3 mr-1" /> 12%
          </span>
          <span className="text-gray-500 ml-2">from last month</span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
            <p className="text-2xl font-sans font-bold text-[#2c3e50] mt-1">{formatCurrency(stats.monthlyRevenue)}</p>
          </div>
          <div className="rounded-full bg-[#3498db] bg-opacity-10 w-12 h-12 flex items-center justify-center">
            <DollarSign className="text-[#3498db] h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs">
          <span className="text-green-500 flex items-center">
            <ArrowUp className="h-3 w-3 mr-1" /> 5.3%
          </span>
          <span className="text-gray-500 ml-2">from last month</span>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Management Fees</p>
            <p className="text-2xl font-sans font-bold text-[#2c3e50] mt-1">{formatCurrency(stats.managementFees)}</p>
          </div>
          <div className="rounded-full bg-[#e74c3c] bg-opacity-10 w-12 h-12 flex items-center justify-center">
            <Percent className="text-[#e74c3c] h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center text-xs">
          <span className="text-green-500 flex items-center">
            <ArrowUp className="h-3 w-3 mr-1" /> 5.3%
          </span>
          <span className="text-gray-500 ml-2">from last month</span>
        </div>
      </div>
    </div>
  );
}
