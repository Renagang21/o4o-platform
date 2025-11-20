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
      const response = await authClient.api.get<ThemeSettingsResponse>('/settings/theme');
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    designTokens: query.data?.designTokens || defaultTokens,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
