import { useState } from "react";
import { AeroLeaseIcon } from "./aero-lease-icon";

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
      <div className={`${className} ${fallbackClassName} bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border border-blue-200 rounded`}>
        <AeroLeaseIcon className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden rounded`}>
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border border-blue-200">
          <AeroLeaseIcon className="h-8 w-8 text-blue-600 animate-pulse" />
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