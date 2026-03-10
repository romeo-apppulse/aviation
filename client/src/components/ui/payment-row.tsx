import { CheckCircle2, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Payment } from "@shared/schema";

interface PaymentRowProps {
    payment: Payment;
    onClick?: () => void;
}

export const PaymentRow = ({ payment, onClick }: PaymentRowProps) => {
    return (
        <div
            className="group flex items-center justify-between p-3.5 rounded-[18px] border border-black/[0.03] bg-white hover:bg-black/[0.01] hover:border-black/[0.08] transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
            onClick={onClick}
        >
            <div className="flex items-center">
                <div className={cn(
                    "h-10 w-10 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105",
                    payment.status === 'Paid' ? "bg-[#34C75915]" : payment.status === 'Pending' ? "bg-[#FF950015]" : "bg-[#FF3B3015]"
                )}>
                    {payment.status === 'Paid' ? (
                        <CheckCircle2 className="text-[#34C759] h-5 w-5" />
                    ) : payment.status === 'Pending' ? (
                        <Clock className="text-[#FF9500] h-5 w-5" />
                    ) : (
                        <AlertCircle className="text-[#FF3B30] h-5 w-5" />
                    )}
                </div>
                <div className="ml-4">
                    <p className="text-[14px] font-bold text-[#1C1C1E] tracking-tight">{payment.period}</p>
                    <p className="text-[11px] text-[#8E8E93] font-medium tracking-tight">Due {formatDate(payment.dueDate)}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <p className="text-[14px] font-bold text-[#1C1C1E] tracking-tight">{formatCurrency(payment.amount)}</p>
                    <div className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md inline-block",
                        payment.status === 'Paid' ? "text-[#34C759] bg-[#34C75910]" : payment.status === 'Pending' ? "text-[#FF9500] bg-[#FF950010]" : "text-[#FF3B30] bg-[#FF3B3010]"
                    )}>
                        {payment.status}
                    </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#C7C7CC] group-hover:translate-x-0.5 transition-transform" />
            </div>
        </div>
    );
};
