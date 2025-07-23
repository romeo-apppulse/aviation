import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Mail, Phone } from "lucide-react";

export default function PendingApproval() {
  return (
    <>
      <Helmet>
        <title>Account Pending Approval - Aviation Ape</title>
        <meta name="description" content="Your account is awaiting administrator approval" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-xl">Account Pending Approval</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Thank you for registering with Aviation Ape. Your account is currently pending 
              administrator approval.
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg text-left">
              <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Our team will review your account details</li>
                <li>• You'll receive an email once approved</li>
                <li>• This typically takes 1-2 business days</li>
              </ul>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-3">
                Need immediate access or have questions?
              </p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.href = 'mailto:admin@aviationape.com'}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Support
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.location.href = 'tel:1-800-237-6532'}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call 1-800-AERO-LEASE
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <Button 
                variant="ghost" 
                className="w-full"
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