import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { isPendingApprovalError } from "@/lib/authUtils";
import type { User } from "@shared/schema";

export function useAuth() {
  const [authChecked, setAuthChecked] = useState(false);
  
  const { data: user, isLoading, error } = useQuery<User>({
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

  const isPendingApproval = error && isPendingApprovalError(error as Error);

  return {
    user,
    isLoading: isLoading && !authChecked,
    isAuthenticated: !!user,
    isPendingApproval,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
    error,
  };
}