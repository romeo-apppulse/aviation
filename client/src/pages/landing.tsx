import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Users, FileText, Wrench, DollarSign, BarChart3 } from "lucide-react";
import aircraft_final_logo from "@assets/aircraft-final-logo.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <img 
              src={aircraft_final_logo} 
              alt="Aviation Ape" 
              className="h-12 w-12 mr-3"
            />
            <h1 className="text-4xl font-bold text-gray-900">Aviation Ape Manager</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Comprehensive aircraft management system for tracking leases, owners, lessees, payments, and maintenance schedules
          </p>
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            onClick={() => window.location.href = '/api/login'}
          >
            Sign In to Continue
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Plane className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Aircraft Management</CardTitle>
              <CardDescription>
                Track aircraft details, specifications, and ownership information
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Lease Tracking</CardTitle>
              <CardDescription>
                Manage lease agreements between aircraft owners and flight schools
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <DollarSign className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <CardTitle>Payment Management</CardTitle>
              <CardDescription>
                Track payments and calculate 10% management fees automatically
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Wrench className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <CardTitle>Maintenance Scheduling</CardTitle>
              <CardDescription>
                Schedule and track aircraft maintenance and inspections
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <FileText className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Document Management</CardTitle>
              <CardDescription>
                Store and organize lease agreements, registrations, and records
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <CardTitle>Analytics & Reporting</CardTitle>
              <CardDescription>
                Comprehensive dashboard with revenue tracking and analytics
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-center text-blue-900">
              Professional Aircraft Management
            </CardTitle>
            <CardDescription className="text-center text-blue-700">
              Streamline your aircraft leasing operations with our comprehensive management platform
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => window.location.href = '/api/login'}
            >
              Get Started Today
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}