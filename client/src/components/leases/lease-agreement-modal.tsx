import { LeaseWithDetails, Payment } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Download, FileText } from "lucide-react";

interface LeaseAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  lease: LeaseWithDetails;
  onViewAircraft?: (aircraft: any) => void;
  onViewLessee?: (lesseeId: number) => void;
  onViewOwner?: (ownerId: number) => void;
}

export default function LeaseAgreementModal({ isOpen, onClose, lease, onViewAircraft, onViewLessee, onViewOwner }: LeaseAgreementModalProps) {
  const { data: payments } = useQuery<Payment[]>({
    queryKey: [`/api/leases/${lease.id}/payments`],
    enabled: isOpen,
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-sans font-semibold">Lease Agreement</DialogTitle>
        </DialogHeader>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h4 className="text-xl font-sans font-semibold">
              <span
                className={lease.aircraft && onViewAircraft ? "text-brand hover:underline cursor-pointer" : ""}
                onClick={() => { if (lease.aircraft && onViewAircraft) onViewAircraft(lease.aircraft); }}
              >
                {lease.aircraft?.registration || 'N/A'}
              </span>
              {" - "}{lease.aircraft?.make} {lease.aircraft?.model}
            </h4>
            <p className="text-gray-500">
              Lease between{" "}
              <span
                className={(lease.aircraft as any)?.owner && onViewOwner ? "text-brand hover:underline cursor-pointer font-medium" : ""}
                onClick={() => { const owner = (lease.aircraft as any)?.owner; if (owner && onViewOwner) onViewOwner(owner.id); }}
              >
                {(lease.aircraft as any)?.owner?.name || 'Unknown Owner'}
              </span>
              {" and "}
              <span
                className={lease.lessee && onViewLessee ? "text-brand hover:underline cursor-pointer font-medium" : ""}
                onClick={() => { if (lease.lessee && onViewLessee) onViewLessee(lease.lessee.id); }}
              >
                {lease.lessee?.name || 'Unknown Lessee'}
              </span>
            </p>
          </div>
          <span className={`px-3 py-1 ${getStatusColor(lease.status ?? "")} rounded-full text-sm font-medium`}>
            {lease.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="border rounded-lg p-3">
            <p className="text-sm font-medium text-gray-500">Start Date</p>
            <p className="text-lg font-sans">{formatDate(lease.startDate)}</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-sm font-medium text-gray-500">End Date</p>
            <p className="text-lg font-sans">{formatDate(lease.endDate)}</p>
          </div>
          <div className="border rounded-lg p-3">
            <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
            <p className="text-lg font-mono">{formatCurrency(lease.monthlyRate)}</p>
          </div>
        </div>

        <div className="mb-6">
          <h5 className="font-medium mb-2">Lease Terms</h5>
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-sm mb-2"><span className="font-medium">Minimum Hours:</span> {lease.minimumHours} hours monthly</p>
            <p className="text-sm mb-2"><span className="font-medium">Rate:</span> ${lease.hourlyRate} per Hobbs hour</p>
            {lease.maintenanceTerms && (
              <p className="text-sm mb-2"><span className="font-medium">Maintenance:</span> {lease.maintenanceTerms}</p>
            )}
            {lease.notes && (
              <p className="text-sm"><span className="font-medium">Notes:</span> {lease.notes}</p>
            )}
          </div>
        </div>

        {lease.documentUrl && (
          <div className="mb-6">
            <h5 className="font-medium mb-2">Lease Document</h5>
            <div className="border rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="text-[#e74c3c] h-5 w-5" />
                <p className="ml-2 text-sm font-medium">
                  {lease.aircraft?.registration || 'N/A'}-Lease-Agreement.pdf
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-brand">
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            </div>
          </div>
        )}

        <div>
          <h5 className="font-medium mb-2">Payment History</h5>
          {payments && payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map(payment => (
                    <tr key={payment.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">{payment.period}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">{formatDate(payment.dueDate)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-mono">{formatCurrency(payment.amount)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status ?? "")}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm">
                        {payment.paidDate ? formatDate(payment.paidDate) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 border rounded-lg">
              <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-gray-500">No payment records found</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button className="bg-brand text-white">Edit Agreement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
