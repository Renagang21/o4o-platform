import { useQuery } from '@tanstack/react-query';
import { getPageContext } from '../utils/context-detector';
import { useLocation } from 'react-router';
import { cookieAuthClient } from '@o4o/auth-client';

interface MenuItem {
  id: string;
  title: string;
  url: string;
  type: string;
  target: string;
  children?: MenuItem[];
}

interface MenuData {
  id: string;
  name: string;
  slug: string;
  location: string;
  metadata?: {
    theme?: string;
    logo_url?: string;
    subdomain?: string;
    path_prefix?: string;
  };
  items: MenuItem[];
}

interface UseMenuOptions {
  location: string; // Menu location key (e.g., 'primary', 'shop-categories')
  subdomain?: string | null;
  path?: string;
  enabled?: boolean; // Enable/disable query
}

interface UseMenuResult {
  menu: MenuData | null;
  items: MenuItem[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch menu data by location with automatic caching
 *
 * @param options - Menu fetch options
 * @returns Menu data, items, loading state, and error
 *
 * @example
 * ```tsx
 * const { items, isLoading } = useMenu({
 *   location: 'shop-categories',
 *   subdomain: 'shop',
 *   path: '/shop/products'
 * });
 * ```
 */
export function useMenu(options: UseMenuOptions): UseMenuResult {
  const { location, subdomain, path, enabled = true } = options;
  const routerLocation = useLocation();

  // Auto-detect context if not provided
  const pageContext = getPageContext(routerLocation.pathname);
  const finalSubdomain = subdomain !== undefined ? subdomain : pageContext.subdomain;
  const finalPath = path !== undefined ? path : pageContext.path;

  const query = useQuery({
    queryKey: ['menu', location, finalSubdomain, finalPath],
    queryFn: async () => {
      const params: Record<string, string> = {};

      if (finalSubdomain) {
        params.subdomain = finalSubdomain;
      }
      if (finalPath) {
        params.path = finalPath;
      }

      const response = await cookieAuthClient.api.get(`/menus/location/${location}`, { params });

      if (!response.data?.success || !response.data?.data) {
        throw new Error(response.data?.message || 'Failed to fetch menu');
      }

      return response.data.data as MenuData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    enabled,
    retry: 1,
  });

  return {
    menu: query.data || null,
    items: query.data?.items || [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
