import { ViewSchema } from './types';

export interface RouteConfig {
  path: string;
  viewId: string;
  meta?: {
    title?: string;
    description?: string;
    authRequired?: boolean;
    roles?: string[];
    [key: string]: any;
  };
}

/**
 * Generates route configurations from all view JSON files
 * Uses Vite's import.meta.glob to scan and load all views
 */
export function generateRoutes(): RouteConfig[] {
  const routes: RouteConfig[] = [];

  // Load all view JSON files using Vite's glob import
  const viewModules = import.meta.glob<{ default: ViewSchema }>(
    '../views/*.json',
    { eager: true }
  );

  for (const [_filePath, module] of Object.entries(viewModules)) {
    const view = module.default;

    // Use explicit route from meta, or convert viewId to route
    const routePath = view.meta?.route || convertViewIdToRoute(view.viewId);

    routes.push({
      path: routePath,
      viewId: view.viewId,
      meta: view.meta,
    });
  }

  // Sort routes: static routes first, then dynamic routes
  return routes.sort((a, b) => {
    // Dynamic routes (with :param) should come after static routes
    const aHasParam = a.path.includes(':');
    const bHasParam = b.path.includes(':');

    if (aHasParam && !bHasParam) return 1;
    if (!aHasParam && bHasParam) return -1;

    // If both are static or both are dynamic, sort by length (more specific first)
    return b.path.length - a.path.length;
  });
}

/**
 * Converts viewId to route path using naming conventions
 *
 * Examples:
 * - "home" → "/"
 * - "not-found" → "/404"
 * - "product-list" → "/products"
 * - "product-detail" → "/product/:id"
 * - "admin-seller-detail" → "/admin/seller/:id"
 * - "seller-dashboard" → "/dashboard/seller"
 */
function convertViewIdToRoute(viewId: string): string {
  // Special cases
  if (viewId === 'home') return '/';
  if (viewId === 'not-found') return '/404';

  // Detail pages with dynamic :id parameter
  // "product-detail" → "/product/:id"
  // "admin-seller-detail" → "/admin/seller/:id"
  if (viewId.endsWith('-detail')) {
    const base = viewId.replace('-detail', '').replace(/-/g, '/');
    return `/${base}/:id`;
  }

  // List pages
  // "admin-seller-list" → "/admin/sellers" (pluralize)
  // "product-list" → "/products"
  if (viewId.endsWith('-list')) {
    const base = viewId.replace('-list', '').replace(/-/g, '/');
    const parts = base.split('/');
    const lastPart = parts[parts.length - 1];
    parts[parts.length - 1] = pluralize(lastPart);
    return `/${parts.join('/')}`;
  }

  // Dashboard pages
  // "seller-dashboard" → "/dashboard/seller"
  // "admin-dashboard" → "/admin/dashboard"
  if (viewId.endsWith('-dashboard')) {
    const role = viewId.replace('-dashboard', '');
    if (role === 'admin') {
      return '/admin';
    }
    return `/dashboard/${role}`;
  }

  // Default: convert hyphens to slashes
  // "my-account" → "/my-account"
  // "reset-password" → "/reset-password"
  return `/${viewId}`;
}

/**
 * Simple pluralization (English rules)
 */
function pluralize(word: string): string {
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  }
  if (word.endsWith('s') || word.endsWith('sh') || word.endsWith('ch')) {
    return word + 'es';
  }
  return word + 's';
}

/**
 * Matches a URL path against a route pattern with dynamic parameters
 *
 * @param pattern Route pattern like "/product/:id"
 * @param path Actual URL path like "/product/123"
 * @returns Match result with extracted params, or null if no match
 */
export function matchRoute(
  pattern: string,
  path: string
): { params: Record<string, string> } | null {
  // Convert pattern to regex
  // "/product/:id" → /^\/product\/([^/]+)$/
  const paramNames: string[] = [];
  const regexPattern = pattern.replace(/:(\w+)/g, (_, paramName) => {
    paramNames.push(paramName);
    return '([^/]+)';
  });

  const regex = new RegExp(`^${regexPattern}$`);
  const match = path.match(regex);

  if (!match) {
    return null;
  }

  // Extract parameter values
  const params: Record<string, string> = {};
  paramNames.forEach((name, index) => {
    params[name] = match[index + 1];
  });

  return { params };
}
