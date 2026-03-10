import { useState } from "react";
import { AeroLeaseIcon } from "./aero-lease-icon";
import { cn } from "@/lib/utils";

interface AircraftImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function AircraftImage({ src, alt, className = "", fallbackClassName = "" }: AircraftImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Handle empty, null, or invalid image sources
  if (!src || src.trim() === '' || imageError) {
    return (
      <div className={cn(className, fallbackClassName, "bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center border border-indigo-100 shadow-inner")}>
        <AeroLeaseIcon className="h-10 w-10 text-indigo-400 opacity-60" />
      </div>
    );
  }

  return (
    <div className={cn(className, "relative overflow-hidden")}>
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center animate-pulse">
          <AeroLeaseIcon className="h-10 w-10 text-indigo-300 opacity-40" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => {
          setImageLoaded(true);
          setImageError(false);
        }}
        onError={(e) => {
          console.warn(`Failed to load aircraft image: ${src}`, e);
          setImageError(true);
          setImageLoaded(false);
        }}
      />
    </div>
  );
}