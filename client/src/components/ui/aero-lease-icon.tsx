import { Plane } from "lucide-react";

interface AeroLeaseIconProps {
  className?: string;
}

export function AeroLeaseIcon({ className = "h-12 w-12" }: AeroLeaseIconProps) {
  return (
    <div className={`${className} bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg`}>
      <Plane className="h-6 w-6 text-white" />
    </div>
  );
}