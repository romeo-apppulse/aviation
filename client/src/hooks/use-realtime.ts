import { useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';

// Hook for simulating real-time updates
export function useRealTimeUpdates() {
  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh dashboard data every 30 seconds
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] });
    }, 30000);

    return () => clearInterval(interval);
  }, []);
}