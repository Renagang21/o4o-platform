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
      const response = await authClient.api.get('/v2/admin/roles/applications', {
        params: { status: 'pending' },
        validateStatus: (status) => status < 500 // Don't throw on 401/403
      });

      if (response.status === 401 || response.status === 403) {
        // Stop polling if unauthorized
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setCount(0);
        setError(null); // Don't show error for non-admins
        return;
      }

      const applications = response.data?.data || [];
      setCount(Array.isArray(applications) ? applications.length : 0);
      setError(null);
    } catch (err: any) {
      // Stop polling on auth errors
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
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
