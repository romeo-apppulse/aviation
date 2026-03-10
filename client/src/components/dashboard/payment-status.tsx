import { useQuery } from "@tanstack/react-query";
import { DashboardStats, Payment } from "@shared/schema";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { PaymentRow } from "@/components/ui/payment-row";

export default function PaymentStatus() {
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });

  const { data: paymentsData, isLoading: isPaymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  if (isDashboardLoading || isPaymentsLoading) {
    return (
      <Card className="rounded-2xl border-[#f1f5f9] shadow-sm">
        <CardHeader className="pb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>

            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const paymentStatus = dashboardData?.paymentStatus || { paid: 0, pending: 0, overdue: 0 };
  const totalPayments = paymentStatus.paid + paymentStatus.pending + paymentStatus.overdue;
  const paidPercentage = totalPayments > 0 ? Math.round((paymentStatus.paid / totalPayments) * 100) : 0;

  const recentPayments = paymentsData
    ? [...paymentsData]
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
      .slice(0, 3)
    : [];

  return (
    <Card className="rounded-[24px] border border-black/[0.04] bg-white shadow-sm hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)] transition-all duration-500 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-6 pt-7 px-8 border-b border-black/[0.02]">
        <div className="space-y-1.5">
          <CardTitle className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Payment Health</CardTitle>
          <CardDescription className="text-[13px] text-[#8E8E93] font-medium tracking-tight">
            Monitoring collection performance
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-[#007AFF] hover:text-[#007AFF] hover:bg-[#007AFF08] font-bold text-[12px] tracking-tight px-3 rounded-full" asChild>
          <Link href="/payments">Details</Link>
        </Button>
      </CardHeader>

      <CardContent className="px-8 pt-7 pb-8">
        <div className="space-y-8">
          <div className="space-y-2.5">
            <div className="flex justify-between items-baseline px-0.5">
              <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-[0.05em]">Monthly Collection</span>
              <span className="text-[14px] font-bold text-[#1C1C1E] tracking-tight">{paidPercentage}%</span>
            </div>
            <div className="relative h-2.5 w-full bg-black/[0.03] rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-[#34C759] rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(52,199,89,0.3)]"
                style={{ width: `${paidPercentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[#34C75908] border border-[#34C75910] rounded-[18px] p-4 text-center transition-all hover:bg-[#34C75912] hover:scale-[1.03] duration-300">
              <p className="text-[10px] font-bold text-[#34C759] uppercase tracking-wider mb-1">Paid</p>
              <p className="text-xl font-bold text-[#1C1C1E] tracking-tight leading-none">{paymentStatus.paid}</p>
            </div>
            <div className="bg-[#FF950008] border border-[#FF950010] rounded-[18px] p-4 text-center transition-all hover:bg-[#FF950012] hover:scale-[1.03] duration-300">
              <p className="text-[10px] font-bold text-[#FF9500] uppercase tracking-wider mb-1">Pending</p>
              <p className="text-xl font-bold text-[#1C1C1E] tracking-tight leading-none">{paymentStatus.pending}</p>
            </div>
            <div className="bg-[#FF3B3008] border border-[#FF3B3010] rounded-[18px] p-4 text-center transition-all hover:bg-[#FF3B3012] hover:scale-[1.03] duration-300">
              <p className="text-[10px] font-bold text-[#FF3B30] uppercase tracking-wider mb-1">Overdue</p>
              <p className="text-xl font-bold text-[#1C1C1E] tracking-tight leading-none">{paymentStatus.overdue}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-black/[0.03]">
            <h4 className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-[0.05em] mb-4">Recent Activity</h4>
            <div className="space-y-4">
              {recentPayments.length > 0 ? (
                recentPayments.map((payment) => (
                  <PaymentRow key={payment.id} payment={payment} />
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-[13px] text-[#A2A2A7] font-medium italic tracking-tight">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
