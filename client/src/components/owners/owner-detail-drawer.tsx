import { useQuery } from "@tanstack/react-query";
import { Owner, AircraftWithDetails } from "@shared/schema";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Mail, Phone, MapPin, Plane, FileText, Download, DollarSign, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface OwnerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  ownerId: number;
  onViewAircraft?: (aircraft: AircraftWithDetails) => void;
}

interface OwnerDetailData {
  owner: Owner;
  aircraft: (AircraftWithDetails)[];
  documents: any[];
  revenue: {
    grossThisMonth: number;
    commissionThisMonth: number;
    netThisMonth: number;
  };
}

export default function OwnerDetailDrawer({ isOpen, onClose, ownerId, onViewAircraft }: OwnerDetailDrawerProps) {
  const { data, isLoading } = useQuery<OwnerDetailData>({
    queryKey: [`/api/owners/${ownerId}/detail`],
    enabled: isOpen && ownerId > 0,
  });

  const owner = data?.owner;
  const aircraftList = data?.aircraft || [];
  const documents = data?.documents || [];
  const revenue = data?.revenue || { grossThisMonth: 0, commissionThisMonth: 0, netThisMonth: 0 };

  const activeLeaseCount = aircraftList.filter(a => a.currentLease?.status === "Active").length;

  const getPortalStatusBadge = (status: string | null | undefined) => {
    switch (status) {
      case "active": return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case "invited": return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Invited</Badge>;
      default: return <Badge variant="outline" className="text-gray-500">No Account</Badge>;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="sm:max-w-[520px] w-full p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-bold">
                {isLoading ? "Loading..." : owner?.name || "Owner Detail"}
              </SheetTitle>
              <SheetDescription>Asset Owner Portfolio</SheetDescription>
            </div>
            {owner && getPortalStatusBadge(owner.portalStatus)}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array(4).fill(null).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : owner ? (
            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-3 text-gray-400" />
                  <a href={`mailto:${owner.email}`} className="text-brand hover:underline">{owner.email}</a>
                </div>
                {owner.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-3 text-gray-400" />
                    <a href={`tel:${owner.phone}`} className="text-gray-700 hover:underline">{owner.phone}</a>
                  </div>
                )}
                {owner.address && (
                  <div className="flex items-start text-sm">
                    <MapPin className="h-4 w-4 mr-3 text-gray-400 mt-0.5" />
                    <span className="text-gray-700">{owner.address}</span>
                  </div>
                )}
                {owner.paymentDetails && (
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="font-medium text-gray-700 mb-1">Payment Details</p>
                    <p className="text-gray-600">{owner.paymentDetails}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Aircraft Portfolio */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Aircraft Portfolio ({aircraftList.length})
                </h4>
                {aircraftList.length > 0 ? (
                  <div className="space-y-2">
                    {aircraftList.map((ac) => (
                      <div
                        key={ac.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => onViewAircraft?.(ac)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Plane className="h-4 w-4 text-brand" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{ac.registration}</p>
                            <p className="text-xs text-gray-500">{ac.make} {ac.model}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={getStatusColor(ac.status || "Available")}
                          >
                            {ac.status || "Available"}
                          </Badge>
                          <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No aircraft registered to this owner.</p>
                )}
              </div>

              <Separator />

              {/* Revenue Summary */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Revenue Summary (This Month)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 mb-1">Gross</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(revenue.grossThisMonth)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 mb-1">Fee (10%)</p>
                    <p className="text-sm font-bold text-brand">{formatCurrency(revenue.commissionThisMonth)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-xs text-gray-500 mb-1">Net to Owner</p>
                    <p className="text-sm font-bold text-green-600">{formatCurrency(revenue.netThisMonth)}</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Active Leases</span>
                    <span className="font-bold text-brand">{activeLeaseCount}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Documents */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Documents ({documents.length})
                </h4>
                {documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium">{doc.name}</p>
                            <p className="text-xs text-gray-500">{doc.type}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.url, "_blank")}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No documents uploaded.</p>
                )}
              </div>

              {owner.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Notes</h4>
                    <p className="text-sm text-gray-600">{owner.notes}</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">Owner not found.</div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
