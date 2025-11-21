/**
 * Hook to load SiteThemeSettings (Design Tokens)
 * Loads from /settings/theme endpoint
 */

import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { defaultTokens, type DesignTokens } from '@o4o/appearance-system';

interface ThemeSettingsResponse {
  id?: number;
  designTokens?: DesignTokens;
  createdAt?: string;
  updatedAt?: string;
}

export function useThemeSettings() {
  const query = useQuery({
    queryKey: ['settings', 'theme'],
    queryFn: async () => {
      try {
        const response = await authClient.api.get<ThemeSettingsResponse>('/settings/theme');
        return response.data;
      } catch (error: any) {
        const status = error?.response?.status;

        // Silent fallback for unauthorized/forbidden (guest users)
        if (status === 401 || status === 403) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.debug(
              '[Theme] Unauthorized when fetching /settings/theme, falling back to default theme.',
              status
            );
          }
          // Return default theme response structure
          return { designTokens: defaultTokens };
        }

        // For other errors (500, network errors, etc.), let React Query handle them
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on 401/403
  });

  return {
    designTokens: query.data?.designTokens || defaultTokens,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
