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

  if (!src || imageError) {
    return (
      <div className={`${className} ${fallbackClassName} bg-gray-50 flex items-center justify-center`}>
        <AeroLeaseIcon className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
          <AeroLeaseIcon className="h-12 w-12" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
      />
    </div>
  );
}