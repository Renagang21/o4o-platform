import { ViewSchema } from './types';
import { generateRoutes, matchRoute, type RouteConfig } from './route-generator';

// Cache for auto-generated routes
let routeCache: RouteConfig[] | null = null;

/**
 * Gets the cached routes or generates them if not cached
 */
function getRoutes(): RouteConfig[] {
  if (!routeCache) {
    routeCache = generateRoutes();
    console.log('[Router] Generated routes:', routeCache);
  }
  return routeCache;
}

/**
 * Loads a view based on the current URL path
 * Supports both static routes and dynamic parameter routes
 */
export async function loadView(url: string): Promise<ViewSchema> {
  const routes = getRoutes();

  // First try exact match for static routes
  let matchedRoute = routes.find(r => r.path === url);

  // If no exact match, try dynamic parameter matching
  if (!matchedRoute) {
    for (const route of routes) {
      if (route.path.includes(':')) {
        const match = matchRoute(route.path, url);
        if (match) {
          matchedRoute = route;
          // TODO: Store matched params for use in ViewContext
          break;
        }
      }
    }
  }

  const viewId = matchedRoute?.viewId || 'not-found';

  try {
    // Dynamic import of JSON view files
    const json = await import(`../views/${viewId}.json`);
    return json.default as ViewSchema;
  } catch (error) {
    console.error(`Failed to load view: ${viewId}`, error);

    // Return fallback error view
    return {
      viewId: 'error',
      layout: { type: 'MinimalLayout' },
      components: [
        {
          type: 'ErrorMessage',
          props: {
            message: `View not found: ${viewId}`,
          },
        },
      ],
    };
  }
}

/**
 * Gets matched route params from URL
 */
export function getRouteParams(url: string): Record<string, string> {
  const routes = getRoutes();

  for (const route of routes) {
    if (route.path.includes(':')) {
      const match = matchRoute(route.path, url);
      if (match) {
        return match.params;
      }
    }
  }

  return {};
}

// Hot Module Replacement support for development
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    routeCache = null;
    console.log('[Router] Routes cache cleared (HMR)');
  });
}
