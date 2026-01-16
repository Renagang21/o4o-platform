/**
 * useAppStatus Hook
 *
 * Provides centralized access to app installation and activation status
 * across the admin dashboard.
 *
 * Uses the same query key as AppStorePage to share cache.
 */

import { useQuery } from '@tanstack/react-query';
import { adminAppsApi, AppRegistryEntry } from '@/api/admin-apps';
import { useAuth } from '@o4o/auth-context';

export interface UseAppStatusReturn {
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: unknown;
  /** Check if an app is installed */
  isInstalled: (appId: string) => boolean;
  /** Check if an app is active */
  isActive: (appId: string) => boolean;
  /** Get status of a specific app */
  getStatus: (appId: string) => 'active' | 'inactive' | 'installed' | 'not-installed';
  /** Raw app registry data */
  apps: AppRegistryEntry[];
}

/**
 * Hook to check app installation and activation status
 *
 * @returns App status utilities
 */
export function useAppStatus(): UseAppStatusReturn {
  const { isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['installedApps'],
    queryFn: adminAppsApi.getInstalledApps,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (cacheTime renamed to gcTime in v5)
    refetchOnWindowFocus: false,
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  const apps = data ?? [];

  // Build lookup maps for fast access
  const appMap = new Map<string, AppRegistryEntry>();
  const activeSet = new Set<string>();
  const installedSet = new Set<string>();

  for (const app of apps) {
    appMap.set(app.appId, app);
    installedSet.add(app.appId);
    if (app.status === 'active') {
      activeSet.add(app.appId);
    }
  }

  const isInstalled = (appId: string): boolean => {
    return installedSet.has(appId);
  };

  const isActive = (appId: string): boolean => {
    return activeSet.has(appId);
  };

  const getStatus = (
    appId: string
  ): 'active' | 'inactive' | 'installed' | 'not-installed' => {
    const app = appMap.get(appId);
    if (!app) return 'not-installed';
    return app.status;
  };

  return {
    isLoading,
    error,
    isInstalled,
    isActive,
    getStatus,
    apps,
  };
}
