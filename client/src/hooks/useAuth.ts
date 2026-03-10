import { useQuery } from "@tanstack/react-query";
import { isPendingApprovalError } from "@/lib/authUtils";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isPendingApproval = error && isPendingApprovalError(error as Error);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isPendingApproval,
    isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
    isSuperAdmin: user?.role === 'super_admin',
    isFlightSchool: user?.role === 'flight_school',
    isAssetOwner: user?.role === 'asset_owner',
    lesseeId: user?.lesseeId,
    ownerId: user?.ownerId,
    error,
  };
}