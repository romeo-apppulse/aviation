import { useQuery } from "@tanstack/react-query";
import { AircraftWithDetails } from "@shared/schema";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { AeroLeaseIcon } from "@/components/ui/aero-lease-icon";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Search, Plus, MoreHorizontal, Filter, ArrowUpDown, Plane } from "lucide-react";
import { useModal } from "@/hooks/use-modal";
import AddAircraftForm from "@/components/aircraft/add-aircraft-form";
import AircraftDetailsModal from "@/components/aircraft/aircraft-details-modal";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
      <Card className="rounded-2xl border-[#f1f5f9] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="w-48 h-10 rounded-xl" />
            <Skeleton className="w-24 h-10 rounded-xl" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-[24px] border border-black/[0.04] bg-white shadow-sm hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)] transition-all duration-500 overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-7 pt-8 px-8 space-y-4 md:space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Fleet Asset Management</CardTitle>
            <CardDescription className="text-[13px] text-[#8E8E93] font-medium tracking-tight">
              Real-time monitoring of currently managed aviation assets
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3.5">
            <div className="relative group">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E8E93] group-focus-within:text-[#007AFF] transition-all" />
              <Input
                type="text"
                placeholder="Search registration, make..."
                className="pl-10 h-10.5 text-[13px] w-[200px] md:w-[260px] border-black/[0.05] bg-black/[0.02] focus:bg-white focus:border-[#007AFF20] focus:ring-[#007AFF10] rounded-xl transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              onClick={() => addAircraftModal.openModal()}
              className="h-10.5 px-5 bg-[#007AFF] hover:bg-[#007AFFee] text-white rounded-xl shadow-[0_4px_12px_rgba(0,122,255,0.25)] hover:shadow-[0_6px_16px_rgba(0,122,255,0.35)] transition-all duration-300"
            >
              <Plus className="h-4.5 w-4.5 mr-2" />
              <span className="text-[13px] font-bold tracking-tight">Add Asset</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/[0.015] border-y border-black/[0.03]">
                  <th className="px-8 py-4 text-[10px] font-bold text-[#8E8E93] uppercase tracking-[0.08em]">
                    <div className="flex items-center">
                      Aircraft Detail
                      <ArrowUpDown className="ml-1.5 h-3 w-3 opacity-30" />
                    </div>
                  </th>
                  <th className="px-8 py-4 text-[10px] font-bold text-[#8E8E93] uppercase tracking-[0.08em]">Registration</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-[#8E8E93] uppercase tracking-[0.08em]">Partners</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-[#8E8E93] uppercase tracking-[0.08em] text-center">Status</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-[#8E8E93] uppercase tracking-[0.08em] text-right">Performance</th>
                  <th className="px-8 py-4 text-[10px] font-bold text-[#8E8E93] uppercase tracking-[0.08em] text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.03]">
                {filteredAircraft.map((aircraft) => (
                  <tr
                    key={aircraft.id}
                    className="group hover:bg-black/[0.01] transition-all duration-300 cursor-pointer"
                    onClick={() => detailsModal.openModal(aircraft)}
                  >
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar className="h-11 w-11 rounded-[14px] shadow-sm border border-black/[0.04] shrink-0 overflow-hidden">
                          <AvatarImage src={aircraft.image || undefined} alt={aircraft.make} className="object-cover" />
                          <AvatarFallback className="bg-black/[0.02] text-[#8E8E93]">
                            <Plane className="h-5 w-5 opacity-40" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                          <p className="text-[14px] font-bold text-[#1C1C1E] group-hover:text-[#007AFF] transition-colors tracking-tight">{aircraft.make} {aircraft.model}</p>
                          <p className="text-[11px] text-[#A2A2A7] font-semibold tracking-tight mt-0.5">{aircraft.year} • Single Propeller</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-black/[0.03] text-[#48484A] text-[11px] font-bold rounded-lg border border-black/[0.03] tracking-tight">
                        {aircraft.registration}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <p className="text-[12px] font-bold text-[#1C1C1E] tracking-tight">{aircraft.owner?.name || "Private Owner"}</p>
                        <p className="text-[11px] text-[#8E8E93] font-medium tracking-tight">{aircraft.currentLease?.lessee?.name || "Unassigned"}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-center">
                      <span className={cn(
                        "px-3 py-1 text-[10px] font-bold rounded-full border shadow-sm tracking-tight uppercase",
                        aircraft.status === 'Available' ? "bg-[#34C75910] text-[#34C759] border-[#34C75920]" :
                          aircraft.status === 'Leased' ? "bg-[#007AFF10] text-[#007AFF] border-[#007AFF20]" :
                            "bg-[#FF950010] text-[#FF9500] border-[#FF950020]"
                      )}>
                        {aircraft.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right">
                      <p className="text-[14px] font-bold text-[#1C1C1E] tracking-tight">
                        {aircraft.currentLease ? formatCurrency(aircraft.currentLease.monthlyRate) : "$0.00"}
                      </p>
                      <p className="text-[10px] text-[#A2A2A7] font-semibold tracking-tight mt-0.5 uppercase">per month</p>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-[#C7C7CC] hover:text-[#1C1C1E] hover:bg-black/[0.03] rounded-xl transition-all">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAircraft.length === 0 && (
            <div className="py-24 text-center">
              <div className="bg-black/[0.02] w-20 h-20 rounded-[24px] flex items-center justify-center mx-auto mb-5">
                <Search className="h-7 w-7 text-[#C7C7CC]" />
              </div>
              <h3 className="text-[15px] font-bold text-[#1C1C1E] tracking-tight">No Results Found</h3>
              <p className="text-[13px] text-[#8E8E93] mt-1.5 max-w-[240px] mx-auto leading-relaxed font-medium">
                Try refining your search terms or adding a new aircraft to the registry.
              </p>
            </div>
          )}

          <div className="px-8 py-5 bg-black/[0.01] border-t border-black/[0.03] flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-[0.05em]">
              Showing {filteredAircraft.length} of {aircraft?.length || 0} Aircraft Assets
            </span>
            <div className="flex items-center space-x-2.5">
              <Button variant="outline" size="sm" className="h-9 px-4 text-[12px] font-bold border-black/[0.05] bg-white rounded-xl hover:bg-black/[0.02] text-[#8E8E93] transition-all" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-[12px] font-bold bg-[#1C1C1E] text-white border-transparent rounded-xl shadow-sm">
                1
              </Button>
              <Button variant="outline" size="sm" className="h-9 px-4 text-[12px] font-bold border-black/[0.05] bg-white rounded-xl hover:bg-black/[0.02] text-[#8E8E93] transition-all" disabled>
                Next
              </Button>
            </div>
          </div>
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
