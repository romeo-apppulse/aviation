import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, BarChart3, Plane, FileText, DollarSign, Wrench, Users, Building, FolderOpen } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.firstName || 'User'}!
          </h2>
          <p className="text-gray-600">
            Access your aircraft management dashboard and start managing your fleet.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/dashboard">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-blue-600">Dashboard</CardTitle>
                </div>
                <CardDescription>
                  View your fleet overview, revenue analytics, and key metrics
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/aircraft">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Plane className="h-6 w-6 text-green-600" />
                  </div>
                  <CardTitle className="text-green-600">Aircraft</CardTitle>
                </div>
                <CardDescription>
                  Manage your aircraft fleet and view detailed specifications
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/leases">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <CardTitle className="text-purple-600">Leases</CardTitle>
                </div>
                <CardDescription>
                  Track active lease agreements and manage contracts
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/payments">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                  <CardTitle className="text-yellow-600">Payments</CardTitle>
                </div>
                <CardDescription>
                  Monitor payment status and management fee calculations
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/maintenance">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Wrench className="h-6 w-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-orange-600">Maintenance</CardTitle>
                </div>
                <CardDescription>
                  Schedule and track aircraft maintenance and inspections
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/owners">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Building className="h-6 w-6 text-red-600" />
                  </div>
                  <CardTitle className="text-red-600">Owners</CardTitle>
                </div>
                <CardDescription>
                  Manage aircraft owners and their contact information
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/lessees">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-teal-100 rounded-lg">
                    <Users className="h-6 w-6 text-teal-600" />
                  </div>
                  <CardTitle className="text-teal-600">Lessees</CardTitle>
                </div>
                <CardDescription>
                  Manage flight schools and lessee information
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/documents">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FolderOpen className="h-6 w-6 text-gray-600" />
                  </div>
                  <CardTitle className="text-gray-600">Documents</CardTitle>
                </div>
                <CardDescription>
                  Access important documents and contracts
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
  );
}