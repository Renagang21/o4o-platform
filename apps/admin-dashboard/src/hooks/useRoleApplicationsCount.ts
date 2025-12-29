import { useEffect, useState, useRef } from 'react';
import { authClient } from '@o4o/auth-client';
import { useAuth } from '@o4o/auth-context';

export const useRoleApplicationsCount = () => {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  const fetchCount = async () => {
    // Only fetch if user has admin role
    if (!user?.roles?.includes('admin') && !user?.roles?.includes('administrator')) {
      setCount(0);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      // Phase 2-4: Use dedicated metrics endpoint for better performance
      // Note: This endpoint is registered at /api/v2, so we need full path
      const response = await authClient.api.get('/v2/admin/roles/metrics/pending');

      const pendingCount = response.data?.data?.pendingCount || 0;
      setCount(pendingCount);
      setError(null);
    } catch (err: any) {
      // Stop polling on auth errors (401/403)
      const status = err?.response?.status;
      if (status === 401 || status === 403 || status === 404) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setCount(0);
        setError(null); // Don't show error for auth/not-found issues
        return;
      }
      setError(err as Error);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch for admin users
    if (user?.roles?.includes('admin') || user?.roles?.includes('administrator')) {
      fetchCount();

      // Refresh every 60 seconds only for admins
      intervalRef.current = setInterval(fetchCount, 60000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user]);

  return { count, isLoading, error, refetch: fetchCount };
};
