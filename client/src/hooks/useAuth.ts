import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function useAuth() {
  const [authChecked, setAuthChecked] = useState(false);
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !authChecked, // Only run once
  });

  useEffect(() => {
    if (!isLoading && (user || error)) {
      setAuthChecked(true);
    }
  }, [isLoading, user, error]);

  return {
    user,
    isLoading: isLoading && !authChecked,
    isAuthenticated: !!user,
    error,
  };
}