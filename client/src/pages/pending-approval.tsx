import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Mail, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";

export default function PendingApproval() {
  const { user } = useAuth();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  };

  return (
    <>
      <Helmet>
        <title>Pending Approval — AeroLease Wise</title>
      </Helmet>

      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <Card className="w-full max-w-md rounded-2xl border-[#f1f5f9] shadow-sm">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle className="text-xl font-bold text-[#1e293b]">Request Under Review</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-5 pt-2">
            <p className="text-[14px] font-medium text-[#64748b] leading-relaxed">
              Your request is under review. You will receive an email once your access is granted.
            </p>

            {user?.createdAt && (
              <div className="bg-[#f8fafc] border border-[#f1f5f9] rounded-xl p-3 text-[12px] font-medium text-[#94a3b8]">
                Request submitted: {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-xl text-left border border-blue-100">
              <h3 className="font-bold text-[#1e293b] text-[13px] mb-2">What happens next?</h3>
              <ul className="text-[12px] text-[#64748b] space-y-1 font-medium">
                <li>• Our team will review your account details</li>
                <li>• You will receive an email notification once approved</li>
                <li>• This typically takes 1–2 business days</li>
              </ul>
            </div>

            <Button
              className="w-full h-11 bg-[#007AFF] hover:bg-[#007AFFee] text-white font-bold rounded-xl shadow-sm"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>

            <div className="border-t border-[#f1f5f9] pt-4 space-y-2">
              <p className="text-[12px] font-medium text-[#94a3b8]">Need help? Contact your account manager.</p>
              <Button
                variant="outline"
                className="w-full rounded-xl border-[#e2e8f0] font-bold text-[#64748b]"
                onClick={() => window.location.href = 'mailto:admin@aerowise.com'}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Support
              </Button>
              <Button
                variant="ghost"
                className="w-full rounded-xl font-bold text-[#94a3b8]"
                onClick={() => window.location.href = '/api/logout'}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}