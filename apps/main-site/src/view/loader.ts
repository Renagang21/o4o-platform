import { ViewSchema } from './types';
import { generateRoutes, matchRoute, type RouteConfig } from './route-generator';
import { loadCMSView } from '@/lib/cms/loader';

// Cache for auto-generated routes
let routeCache: RouteConfig[] | null = null;

/**
 * Gets the cached routes or generates them if not cached
 */
function getRoutes(): RouteConfig[] {
  if (!routeCache) {
    routeCache = generateRoutes();
  }
  return routeCache;
}

/**
 * Loads a view based on the current URL path
 * Priority: CMS pages > Static routes > Dynamic parameter routes > Not found
 *
 * @param url - The URL path to load
 * @param preview - If true, loads draft/scheduled pages from CMS (no caching)
 */
export async function loadView(url: string, preview = false): Promise<ViewSchema> {
  // Remove leading slash for consistent slug matching
  const slug = url.startsWith('/') ? url.slice(1) : url;

  // Handle root path
  if (!slug || slug === '') {
    return loadStaticView('home');
  }

  // PRIORITY 1: Try loading from CMS first
  try {
    const cmsView = await loadCMSView(slug, preview);
    if (cmsView) {
      console.log(`✅ Loaded CMS page: ${slug}${preview ? ' (preview mode)' : ''}`);
      return cmsView;
    }
  } catch (error) {
    console.error(`Error loading CMS view for ${slug}:`, error);
  }

  // PRIORITY 2: Fall back to static routes
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

  return loadStaticView(viewId);
}

/**
 * Load a static view from JSON files
 */
async function loadStaticView(viewId: string): Promise<ViewSchema> {
  try {
    // Dynamic import of JSON view files
    const json = await import(`../views/${viewId}.json`);
    return json.default as ViewSchema;
  } catch (error) {
    console.error(`Failed to load static view: ${viewId}`, error);

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
  });
}
