import aircraftIcon from "@assets/aircraft-removebg-preview_1753289219831.png";

interface AeroLeaseIconProps {
  className?: string;
}

export function AeroLeaseIcon({ className = "h-12 w-12" }: AeroLeaseIconProps) {
  return (
    <div className={`${className} bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg`}>
      <img 
        src={aircraftIcon} 
        alt="Aviation Ape Aircraft" 
        className="h-8 w-8 object-contain"
      />
    </div>
  );
}