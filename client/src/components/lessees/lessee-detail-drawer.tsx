import { useQuery } from "@tanstack/react-query";
import { Lessee, Lease, Aircraft, Payment, FlightHourLog } from "@shared/schema";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Mail, Phone, MapPin, Building2, User, Plane, FileText, Download, Clock, ExternalLink } from "lucide-react";
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

interface LesseeDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lesseeId: number;
  onViewAircraft?: (aircraft: Aircraft) => void;
  onViewLease?: (lease: Lease & { aircraft?: Aircraft }) => void;
}

interface LesseeDetailData {
  lessee: Lessee;
  leases: (Lease & { aircraft?: Aircraft })[];
  payments: Payment[];
  flightHourLogs: FlightHourLog[];
  documents: any[];
  userAccount: {
    status: string;
    lastLoginAt: string | null;
    role: string;
    email: string;
  } | null;
}

export default function LesseeDetailDrawer({ isOpen, onClose, lesseeId, onViewAircraft, onViewLease }: LesseeDetailDrawerProps) {
  const { data, isLoading } = useQuery<LesseeDetailData>({
    queryKey: [`/api/lessees/${lesseeId}/detail`],
    enabled: isOpen && lesseeId > 0,
  });

  const lessee = data?.lessee;
  const leases = data?.leases || [];
  const payments = data?.payments || [];
  const flightLogs = data?.flightHourLogs || [];
  const documents = data?.documents || [];
  const userAccount = data?.userAccount;

  const activeLeases = leases.filter(l => l.status === "Active");
  const outstandingBalance = payments
    .filter(p => p.status === "Pending" || p.status === "Overdue")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

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
                {isLoading ? "Loading..." : lessee?.name || "Flight School Detail"}
              </SheetTitle>
              <SheetDescription>Flight School Profile</SheetDescription>
            </div>
            {lessee && getPortalStatusBadge(lessee.portalStatus)}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array(4).fill(null).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : lessee ? (
            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="space-y-3">
                {lessee.contactPerson && (
                  <div className="flex items-center text-sm">
                    <User className="h-4 w-4 mr-3 text-gray-400" />
                    <span className="text-gray-700">{lessee.contactPerson}</span>
                  </div>
                )}
                <div className="flex items-center text-sm">
                  <Mail className="h-4 w-4 mr-3 text-gray-400" />
                  <a href={`mailto:${lessee.email}`} className="text-brand hover:underline">{lessee.email}</a>
                </div>
                {lessee.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-3 text-gray-400" />
                    <a href={`tel:${lessee.phone}`} className="text-gray-700 hover:underline">{lessee.phone}</a>
                  </div>
                )}
                {lessee.address && (
                  <div className="flex items-start text-sm">
                    <MapPin className="h-4 w-4 mr-3 text-gray-400 mt-0.5" />
                    <span className="text-gray-700">{lessee.address}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Portal Account */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Portal Account</h4>
                {userAccount ? (
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <Badge variant="outline" className={getStatusColor(userAccount.status)}>{userAccount.status}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Email</span>
                      <span className="text-gray-900">{userAccount.email}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Login</span>
                      <span className="text-gray-900">{userAccount.lastLoginAt ? formatDate(userAccount.lastLoginAt) : "Never"}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No portal account linked.</p>
                )}
              </div>

              <Separator />

              {/* Active Leases */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Active Leases ({activeLeases.length})
                </h4>
                {activeLeases.length > 0 ? (
                  <div className="space-y-2">
                    {activeLeases.map((lease) => (
                      <div
                        key={lease.id}
                        className="p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => onViewLease?.(lease)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Plane className="h-4 w-4 text-brand" />
                            <span
                              className="text-sm font-bold text-brand hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (lease.aircraft) onViewAircraft?.(lease.aircraft);
                              }}
                            >
                              {lease.aircraft?.registration || "N/A"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {lease.aircraft?.make} {lease.aircraft?.model}
                            </span>
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{formatCurrency(lease.hourlyRate)}/hr</span>
                          <span>Expires {formatDate(lease.endDate)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No active leases.</p>
                )}
              </div>

              <Separator />

              {/* Outstanding Balance */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Outstanding Balance</h4>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className={`text-lg font-bold ${outstandingBalance > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(outstandingBalance)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {payments.filter(p => p.status === "Pending" || p.status === "Overdue").length} unpaid invoices
                  </p>
                </div>
              </div>

              <Separator />

              {/* Recent Payments */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Recent Payments ({payments.length})
                </h4>
                {payments.slice(0, 5).length > 0 ? (
                  <div className="space-y-2">
                    {payments.slice(0, 5).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <div>
                          <p className="font-medium">{payment.period}</p>
                          <p className="text-xs text-gray-500">{formatDate(payment.dueDate)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{formatCurrency(payment.amount)}</span>
                          <Badge variant="outline" className={getStatusColor(payment.status || "")}>{payment.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No payment records.</p>
                )}
              </div>

              <Separator />

              {/* Flight Hour Logs */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
                  Flight Hour Logs ({flightLogs.length})
                </h4>
                {flightLogs.slice(0, 5).length > 0 ? (
                  <div className="space-y-2">
                    {flightLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <div>
                          <p className="font-medium">{log.month}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{log.reportedHours} hrs</span>
                          <Badge variant="outline" className={getStatusColor(log.status || "")}>{log.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No flight hour logs.</p>
                )}
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
                        <Button variant="ghost" size="sm" onClick={() => window.open(doc.url, "_blank")}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No documents uploaded.</p>
                )}
              </div>

              {lessee.notes && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Notes</h4>
                    <p className="text-sm text-gray-600">{lessee.notes}</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">Flight school not found.</div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
