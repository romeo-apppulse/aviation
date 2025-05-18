import { useQuery } from "@tanstack/react-query";
import { AircraftWithDetails } from "@shared/schema";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Search, Plus } from "lucide-react";
import { useModal } from "@/hooks/use-modal";
import AddAircraftForm from "@/components/aircraft/add-aircraft-form";
import AircraftDetailsModal from "@/components/aircraft/aircraft-details-modal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function AircraftFleet() {
  const [searchTerm, setSearchTerm] = useState("");
  const addAircraftModal = useModal(false);
  const detailsModal = useModal<AircraftWithDetails>(false);
  
  const { data: aircraft, isLoading } = useQuery<AircraftWithDetails[]>({
    queryKey: ["/api/aircraft"],
  });
  
  const filteredAircraft = aircraft
    ? aircraft.filter(
        (a) =>
          a.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.model.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-sans font-semibold text-gray-700">Aircraft Fleet</CardTitle>
          <div className="flex space-x-2">
            <Skeleton className="w-40 h-9" />
            <Skeleton className="w-24 h-9" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aircraft</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lessee</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="ml-3">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-16 mt-1" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Skeleton className="h-4 w-16" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-sans font-semibold text-gray-700">Aircraft Fleet</CardTitle>
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-gray-500" />
              <Input
                type="text"
                placeholder="Search aircraft..."
                className="pl-8 h-9 text-sm w-40 md:w-auto"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button 
              onClick={() => addAircraftModal.openModal()}
              size="sm"
              className="bg-[#3498db] hover:bg-[#2980b9] text-white"
            >
              <Plus className="h-4 w-4 mr-1" /> Add New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aircraft</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lessee</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAircraft.map((aircraft) => (
                  <tr 
                    key={aircraft.id} 
                    className="hover:bg-gray-50 cursor-pointer" 
                    onClick={() => detailsModal.openModal(aircraft)}
                  >
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 rounded-full">
                          <AvatarImage src={aircraft.image} alt={`${aircraft.make} ${aircraft.model}`} />
                          <AvatarFallback>{aircraft.make.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="ml-3">
                          <p className="text-sm font-medium">{aircraft.make} {aircraft.model}</p>
                          <p className="text-xs text-gray-500">{aircraft.year}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">{aircraft.registration}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">{aircraft.owner?.name || "-"}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">{aircraft.currentLease?.lessee?.name || "-"}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(aircraft.status)}`}>
                        {aircraft.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-mono">
                      {aircraft.currentLease 
                        ? formatCurrency(aircraft.currentLease.monthlyRate) 
                        : "$0"}
                    </td>
                  </tr>
                ))}
                
                {filteredAircraft.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                      No aircraft found matching your search criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {aircraft && aircraft.length > 0 && (
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Showing {filteredAircraft.length} of {aircraft.length} aircraft
              </p>
              <div className="flex space-x-1">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" className="bg-[#3498db] text-white">1</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {addAircraftModal.isOpen && (
        <AddAircraftForm isOpen={addAircraftModal.isOpen} onClose={addAircraftModal.closeModal} />
      )}
      
      {detailsModal.isOpen && detailsModal.data && (
        <AircraftDetailsModal 
          isOpen={detailsModal.isOpen} 
          onClose={detailsModal.closeModal} 
          aircraft={detailsModal.data} 
        />
      )}
    </>
  );
}
