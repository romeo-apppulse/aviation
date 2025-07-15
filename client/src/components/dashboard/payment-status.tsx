import { useQuery } from "@tanstack/react-query";
import { DashboardStats, Payment } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock } from "lucide-react";
import { Link } from "wouter";

export default function PaymentStatus() {
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
  });
  
  const { data: paymentsData, isLoading: isPaymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  if (isDashboardLoading || isPaymentsLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-sans font-semibold text-gray-700">Payment Status</CardTitle>
          <Skeleton className="w-16 h-5" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="w-full h-2 rounded-full" />
              <Skeleton className="w-8 h-5 ml-2" />
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
            
            <Skeleton className="w-32 h-5 mt-2" />
            
            <div className="space-y-3">
              <Skeleton className="h-16 rounded-md" />
              <Skeleton className="h-16 rounded-md" />
              <Skeleton className="h-16 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const paymentStatus = dashboardData?.paymentStatus || { paid: 0, pending: 0, overdue: 0 };
  const totalPayments = paymentStatus.paid + paymentStatus.pending + paymentStatus.overdue;
  const paidPercentage = totalPayments > 0 ? Math.round((paymentStatus.paid / totalPayments) * 100) : 0;
  
  // Get recent payments - take the latest 3
  const recentPayments = paymentsData 
    ? [...paymentsData]
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
        .slice(0, 3)
    : [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-sans font-semibold text-gray-700">Payment Status</CardTitle>
        <Button variant="link" size="sm" className="text-[#3498db]" asChild>
          <Link href="/payments">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Progress value={paidPercentage} className="h-2" />
            <span className="ml-2 text-sm font-medium">{paidPercentage}%</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="bg-green-100 rounded-lg p-2">
              <p className="text-green-600 font-medium">{paymentStatus.paid}</p>
              <p className="text-xs text-gray-500">Paid</p>
            </div>
            <div className="bg-yellow-100 rounded-lg p-2">
              <p className="text-yellow-600 font-medium">{paymentStatus.pending}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
            <div className="bg-red-100 rounded-lg p-2">
              <p className="text-red-600 font-medium">{paymentStatus.overdue}</p>
              <p className="text-xs text-gray-500">Overdue</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Payments</h4>
          <div className="space-y-3">
            {recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                    payment.status === 'Paid' 
                      ? 'bg-green-100' 
                      : payment.status === 'Pending' 
                        ? 'bg-yellow-100' 
                        : 'bg-red-100'
                  }`}>
                    {payment.status === 'Paid' ? (
                      <CheckCircle2 className="text-green-600 h-4 w-4" />
                    ) : (
                      <Clock className={`${
                        payment.status === 'Pending' ? 'text-yellow-600' : 'text-red-600'
                      } h-4 w-4`} />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{payment.period}</p>
                    <p className="text-xs text-gray-500">Due {formatDate(payment.dueDate)}</p>
                  </div>
                </div>
                <p className="font-mono text-sm font-medium">{formatCurrency(payment.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
