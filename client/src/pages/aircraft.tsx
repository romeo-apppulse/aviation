import { useQuery } from "@tanstack/react-query";
import { AircraftWithDetails } from "@shared/schema";
import { useState } from "react";
import { useModal } from "@/hooks/use-modal";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet";
import { Search, Plus, Filter } from "lucide-react";
import AircraftDetailsModal from "@/components/aircraft/aircraft-details-modal";
import AddAircraftForm from "@/components/aircraft/add-aircraft-form";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Aircraft() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const addAircraftModal = useModal(false);
  const detailsModal = useModal<AircraftWithDetails>(false);

  const { data: aircraft, isLoading } = useQuery<AircraftWithDetails[]>({
    queryKey: ["/api/aircraft"],
  });

  const filteredAircraft = aircraft
    ? aircraft.filter((a) => {
        const matchesSearch =
          a.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.model.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || a.status === statusFilter;
        
        return matchesSearch && matchesStatus;
      })
    : [];

  return (
    <>
      <Helmet>
        <title>Aircraft Fleet - AeroLease Manager</title>
        <meta name="description" content="Manage your aircraft fleet inventory, status, and details" />
      </Helmet>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aircraft Fleet</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage all aircraft in your fleet
          </p>
        </div>
        <Button 
          onClick={() => addAircraftModal.openModal()}
          className="bg-[#3498db] hover:bg-[#2980b9] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Aircraft
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filter Aircraft</CardTitle>
          <CardDescription>
            Use the filters below to find specific aircraft
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search by registration, make, or model..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-52">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Leased">Leased</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6)
            .fill(null)
            .map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="h-40 bg-gray-200 animate-pulse" />
                <CardContent className="p-4">
                  <div className="h-5 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-4" />
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))
        ) : filteredAircraft.length > 0 ? (
          filteredAircraft.map((aircraft) => (
            <Card 
              key={aircraft.id} 
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => detailsModal.openModal(aircraft)}
            >
              <div className="h-40 relative">
                <img
                  src={aircraft.image || "https://pixabay.com/get/g8ef761b4edb26fd2f832aca8a921b9b37b583c7e33e62db23962a81257f33892d6c8803977391faf10762f318a53e93a2a4d6bd2d0de50e3bae945b68c537ea2_1280.jpg"}
                  alt={`${aircraft.make} ${aircraft.model}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(aircraft.status)}`}>
                    {aircraft.status}
                  </span>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{aircraft.registration}</h3>
                    <p className="text-sm text-gray-500">{aircraft.make} {aircraft.model} ({aircraft.year})</p>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Owner:</span>
                    <span className="font-medium">{aircraft.owner?.name || "Unassigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Lessee:</span>
                    <span className="font-medium">{aircraft.currentLease?.lessee?.name || "None"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Monthly Revenue:</span>
                    <span className="font-mono font-medium">
                      {aircraft.currentLease ? formatCurrency(aircraft.currentLease.monthlyRate) : "$0"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No aircraft found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
            <Button onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
            }}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>

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
