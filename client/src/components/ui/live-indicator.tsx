import { cn } from "@/lib/utils";

interface LiveIndicatorProps {
  className?: string;
  label?: string;
}

export function LiveIndicator({ className, label = "Live" }: LiveIndicatorProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="relative">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <div className="absolute top-0 left-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
      </div>
      <span className="text-sm text-gray-600 font-medium">{label}</span>
    </div>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'paid':
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'leased':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={cn(
      "px-2 py-1 text-xs font-medium rounded-full",
      getStatusColor(status),
      className
    )}>
      {status}
    </span>
  );
}