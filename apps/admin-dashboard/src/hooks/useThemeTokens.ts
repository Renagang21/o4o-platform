import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { DesignTokens, defaultTokens } from '@o4o/appearance-system';

export function useThemeTokens() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['settings', 'theme'],
    queryFn: async () => {
      try {
        const response = await authClient.api.get('/settings/theme');
        return response.data.data;
      } catch (err) {
        console.error('Failed to fetch theme settings:', err);
        return null;
      }
    }
  });

  // Get design tokens from response, fallback to defaults
  const tokens: DesignTokens = data?.designTokens || defaultTokens;

  return {
    tokens,
    isLoading,
    error
  };
}
