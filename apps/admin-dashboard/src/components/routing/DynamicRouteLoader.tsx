/**
 * Dynamic Route Loader
 *
 * Phase P0 Task B: Dynamic Routing System
 *
 * Fetches routes from Routes API and dynamically generates Route components.
 * Uses ViewComponentRegistry to resolve viewId to actual React components.
 *
 * Features:
 * - Fetches routes from /api/v1/routes/admin
 * - Applies RBAC via AdminProtectedRoute
 * - Applies app status checking via AppRouteGuard
 * - Falls back to error page for unregistered components
 * - Caches routes to prevent excessive API calls
 */

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { AppRouteGuard } from '@/components/AppRouteGuard';
import { viewComponentRegistry } from './ViewComponentRegistry';
import { unifiedApi } from '@/api/unified-client';

// Types
interface RouteMeta {
  title?: string;
  layout?: string;
  auth?: boolean;
  roles?: string[];
  permissions?: string[];
}

interface DynamicRoute {
  pattern: string;
  viewId: string;
  appId?: string;
  meta?: RouteMeta;
}

interface RoutesApiResponse {
  success: boolean;
  data: DynamicRoute[];
  total: number;
}

interface DynamicRouteLoaderProps {
  /** Fallback element while loading */
  fallback?: React.ReactNode;
  /** Filter routes by app */
  filterByApp?: string;
  /** Additional static routes to include */
  additionalRoutes?: React.ReactNode;
  /** Called when routes are loaded */
  onRoutesLoaded?: (routes: DynamicRoute[]) => void;
}

// Default page loader
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

// Fallback for views without registered component
const ViewNotFound: React.FC<{ viewId: string }> = ({ viewId }) => (
  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
    <div className="text-lg font-medium mb-2">View Not Found</div>
    <div className="text-sm">
      No component registered for viewId: <code className="bg-gray-100 px-2 py-1 rounded">{viewId}</code>
    </div>
    <div className="text-xs mt-4 text-gray-400">
      Register component in ViewComponentRegistry.ts
    </div>
  </div>
);

/**
 * Dynamic Route Loader Component
 *
 * Loads routes from API and renders them with proper guards.
 */
export const DynamicRouteLoader: React.FC<DynamicRouteLoaderProps> = ({
  fallback = <PageLoader />,
  filterByApp,
  additionalRoutes,
  onRoutesLoaded,
}) => {
  const [routes, setRoutes] = useState<DynamicRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch routes from API
  const fetchRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await unifiedApi.raw.get<RoutesApiResponse>('/v1/routes/admin');

      if (response.data?.success && response.data.data) {
        let fetchedRoutes = response.data.data;

        // Filter by app if specified
        if (filterByApp) {
          fetchedRoutes = fetchedRoutes.filter(r => r.appId === filterByApp);
        }

        setRoutes(fetchedRoutes);
        onRoutesLoaded?.(fetchedRoutes);

        if (process.env.NODE_ENV === 'development') {
          console.debug('[DynamicRouteLoader] Loaded routes:', fetchedRoutes.length);
        }
      } else {
        setRoutes([]);
      }
    } catch (err) {
      console.error('[DynamicRouteLoader] Failed to fetch routes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load routes');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [filterByApp, onRoutesLoaded]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  // Render a single dynamic route
  const renderRoute = (route: DynamicRoute) => {
    const Component = viewComponentRegistry.get(route.viewId);

    // If no component registered, show fallback
    if (!Component) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[DynamicRouteLoader] No component for viewId: ${route.viewId}`);
      }

      return (
        <Route
          key={route.pattern}
          path={route.pattern}
          element={<ViewNotFound viewId={route.viewId} />}
        />
      );
    }

    // Build the element with proper guards
    let element = (
      <Suspense fallback={fallback}>
        <Component />
      </Suspense>
    );

    // Wrap with AppRouteGuard if route has appId
    if (route.appId) {
      element = <AppRouteGuard appId={route.appId}>{element}</AppRouteGuard>;
    }

    // Wrap with AdminProtectedRoute for RBAC
    if (route.meta?.auth !== false) {
      const roles = route.meta?.roles?.length ? route.meta.roles : undefined;
      const permissions = route.meta?.permissions?.length ? route.meta.permissions : undefined;

      element = (
        <AdminProtectedRoute
          requiredRoles={roles}
          requiredPermissions={permissions}
        >
          {element}
        </AdminProtectedRoute>
      );
    }

    return (
      <Route
        key={route.pattern}
        path={route.pattern}
        element={element}
      />
    );
  };

  // Show loading state
  if (loading) {
    return <>{fallback}</>;
  }

  // Show error state
  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading routes: {error}
      </div>
    );
  }

  // No routes available - render additional routes only
  if (routes.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[DynamicRouteLoader] No dynamic routes, using static only');
    }
    return <>{additionalRoutes}</>;
  }

  // Render all routes
  return (
    <Routes>
      {/* Dynamic routes from API */}
      {routes.map(renderRoute)}

      {/* Additional static routes */}
      {additionalRoutes}

      {/* Fallback for unmatched routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

/**
 * Hook to get dynamic routes
 *
 * Useful for menus or other components that need route info.
 */
export const useDynamicRoutes = (filterByApp?: string) => {
  const [routes, setRoutes] = useState<DynamicRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await unifiedApi.raw.get<RoutesApiResponse>('/v1/routes/admin');

        if (response.data?.success && response.data.data) {
          let fetchedRoutes = response.data.data;

          if (filterByApp) {
            fetchedRoutes = fetchedRoutes.filter(r => r.appId === filterByApp);
          }

          setRoutes(fetchedRoutes);
        }
      } catch (err) {
        console.error('[useDynamicRoutes] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [filterByApp]);

  return { routes, loading };
};

export default DynamicRouteLoader;
