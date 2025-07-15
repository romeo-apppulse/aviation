import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">AeroLease Manager</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    {user?.firstName || user?.lastName 
                      ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                      : user?.email || 'User'}
                  </p>
                  <p className="text-gray-500">{user?.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/api/logout'}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || 'User'}!
          </h2>
          <p className="text-gray-600">
            Access your aircraft management dashboard and start managing your fleet.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard">
              <CardHeader>
                <CardTitle className="text-blue-600">Dashboard</CardTitle>
                <CardDescription>
                  View your fleet overview, revenue analytics, and key metrics
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/aircraft">
              <CardHeader>
                <CardTitle className="text-green-600">Aircraft</CardTitle>
                <CardDescription>
                  Manage your aircraft fleet and view detailed specifications
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/leases">
              <CardHeader>
                <CardTitle className="text-purple-600">Leases</CardTitle>
                <CardDescription>
                  Track active lease agreements and manage contracts
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/payments">
              <CardHeader>
                <CardTitle className="text-yellow-600">Payments</CardTitle>
                <CardDescription>
                  Monitor payment status and management fee calculations
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link href="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}