import { useEffect, useState } from 'react';
import { authClient } from '@o4o/auth-client';

export const useRoleApplicationsCount = () => {
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCount = async () => {
    try {
      setIsLoading(true);
      const response = await authClient.api.get('/admin/roles/applications', {
        params: { status: 'pending' }
      });

      const applications = response.data?.data || [];
      setCount(Array.isArray(applications) ? applications.length : 0);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch role applications count:', err);
      setError(err as Error);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();

    // Refresh every 60 seconds
    const interval = setInterval(fetchCount, 60000);

    return () => clearInterval(interval);
  }, []);

  return { count, isLoading, error, refetch: fetchCount };
};
