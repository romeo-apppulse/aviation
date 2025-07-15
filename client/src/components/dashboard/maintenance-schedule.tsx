import { useQuery } from "@tanstack/react-query";
import { MaintenanceWithDetails } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar } from "lucide-react";
import { AircraftImage } from "@/components/ui/aircraft-image";
import { Link } from "wouter";

export default function MaintenanceSchedule() {
  const { data: upcomingMaintenance, isLoading } = useQuery<MaintenanceWithDetails[]>({
    queryKey: ["/api/maintenance/upcoming"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-sans font-semibold text-gray-700">Upcoming Maintenance</CardTitle>
          <Skeleton className="w-16 h-5" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full rounded-lg mb-4" />
          
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
          
          <Skeleton className="h-10 w-full mt-4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-sans font-semibold text-gray-700">Upcoming Maintenance</CardTitle>
        <Button variant="link" size="sm" className="text-[#3498db]" asChild>
          <Link href="/maintenance">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-lg overflow-hidden h-40 mb-4 relative">
            <AircraftImage 
              className="w-full h-full object-cover" 
              src="https://cdn.pixabay.com/photo/2022/10/14/09/12/aircraft-7520859_1280.jpg" 
              alt="Aircraft maintenance" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
            <div className="absolute bottom-0 left-0 p-3 text-white">
              <h4 className="font-medium">Scheduled Maintenance</h4>
              <p className="text-sm">Next 2 Weeks</p>
            </div>
          </div>
          
          {upcomingMaintenance && upcomingMaintenance.length > 0 ? (
            <>
              {upcomingMaintenance.slice(0, 3).map((maintenance) => {
                const days = Math.round(
                  (new Date(maintenance.scheduledDate).getTime() - new Date().getTime()) / 
                  (1000 * 60 * 60 * 24)
                );
                
                let borderColor = "border-[#3498db]";
                let bgColor = "bg-[#3498db] bg-opacity-10 text-[#3498db]";
                
                if (days < 7) {
                  borderColor = "border-[#f39c12]";
                  bgColor = "bg-[#f39c12] bg-opacity-10 text-[#f39c12]";
                }
                
                if (days < 0) {
                  borderColor = "border-[#e74c3c]";
                  bgColor = "bg-[#e74c3c] bg-opacity-10 text-[#e74c3c]";
                }
                
                return (
                  <div key={maintenance.id} className={`border-l-4 ${borderColor} pl-3 py-2`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">
                          {maintenance.aircraft?.registration} - {maintenance.type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {maintenance.aircraft?.make} {maintenance.aircraft?.model}
                        </p>
                      </div>
                      <span className={`text-xs ${bgColor} px-2 py-1 rounded`}>
                        {days === 0 
                          ? 'Today' 
                          : days > 0 
                            ? `In ${days} days` 
                            : `${Math.abs(days)} days ago`}
                      </span>
                    </div>
                  </div>
                );
              })}
              
              <Button 
                className="w-full mt-2 py-2 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 whitespace-normal break-words"
                variant="outline"
                asChild
              >
                <Link href="/maintenance">
                  <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="break-words">Schedule Maintenance</span>
                </Link>
              </Button>
            </>
          ) : (
            <div className="text-center py-6">
              <Clock className="h-10 w-10 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No upcoming maintenance scheduled</p>
              <Button 
                className="mt-4 whitespace-normal break-words"
                variant="outline"
                asChild
              >
                <Link href="/maintenance">
                  <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="break-words">Schedule Maintenance</span>
                </Link>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
