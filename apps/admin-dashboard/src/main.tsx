import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { initVersionCheck } from '@/utils/versionCheck'
import { registerAllBlocks } from '@/blocks'
import { registerAllWidgets } from '@/lib/widgets/registerWidgets'
import { registerLazyShortcode, globalRegistry } from '@o4o/shortcodes'
import App from './App'
import './styles/globals.css'
// WordPress styles will be loaded only when needed
// import './styles/wordpress-dashboard.css'
import './styles/dashboard-simple.css'
import './styles/bulk-actions.css'
import './styles/quick-edit.css'
import './styles/help-tab.css'
import './styles/media-upload.css'
// import './styles/ui-improvements.css' // Temporarily disabled to fix sidebar conflict
import './styles/wordpress-table-fix.css'
// Toolset UI styles for CPT Engine
import './styles/toolset-ui.css'


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 404 or 401 errors
        if (error?.response?.status === 404 || error?.response?.status === 401) {
          return false;
        }
        // Retry up to 1 time for other errors
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
      gcTime: 10 * 60 * 1000, // Keep cache for 10 minutes (gcTime replaced cacheTime in v5)
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
})

// Initialize version checking
initVersionCheck();

// Register all blocks before rendering
registerAllBlocks();

// Register all dashboard widgets before rendering (P1 Phase C)
registerAllWidgets();

// Auto-discover and register all shortcode components (Pure File-Based Convention)
// Convention: Filename → Shortcode Name (PascalCase → snake_case)
// Examples:
// - PartnerDashboard.tsx → [partner_dashboard]
// - SupplierProducts.tsx → [supplier_products]
// - UserRoleVerification.tsx → [user_role_verification]
//
// NO manual registration needed! Just create/delete component files.

/**
 * Convert PascalCase filename to snake_case shortcode name
 * PartnerDashboard → partner_dashboard
 */
function pascalToSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Extract component name from file path and remove 'Shortcode' suffix
 * ./components/shortcodes/dropshipping/PartnerDashboard.tsx → PartnerDashboard
 * ./components/shortcodes/VideoShortcodes.tsx → VideoShortcodes (already filtered)
 */
function extractComponentName(path: string): string {
  const match = path.match(/\/([^/]+)\.tsx$/);
  if (!match) return '';

  let componentName = match[1];
  // Remove 'Shortcode' suffix if present (for files like SocialLoginShortcode.tsx)
  if (componentName.endsWith('Shortcode')) {
    componentName = componentName.slice(0, -9); // Remove 'Shortcode' (9 chars)
  }

  return componentName;
}

// Scan all .tsx component files
const componentModules = import.meta.glob('./components/shortcodes/**/*.tsx', { eager: false });

(async () => {
  const registered: string[] = [];

  for (const [path, importFn] of Object.entries(componentModules)) {
    // Skip utility files, types, legacy array-based files, etc.
    if (
      path.includes('/types.tsx') ||
      path.includes('/utils.tsx') ||
      path.includes('/helpers.tsx') ||
      path.includes('/index.tsx') ||
      path.includes('/__tests__/') ||
      path.endsWith('ShortcodeRenderer.tsx') ||
      path.endsWith('Shortcodes.tsx') || // Legacy array-based definition files
      path.endsWith('shortcodes.tsx')
    ) {
      continue;
    }

    const componentName = extractComponentName(path);
    if (!componentName) continue;

    const shortcodeName = pascalToSnakeCase(componentName);

    // Register with lazy loading
    registerLazyShortcode({
      name: shortcodeName,
      loader: async () => {
        try {
          const module = await importFn();
          // Try named export first, then default
          const Component = (module as any)[componentName] || (module as any).default;

          if (!Component) {
            console.error(`[Admin Shortcode] Component "${componentName}" not found in ${path}`);
            return { default: () => null };
          }

          return { default: Component };
        } catch (err) {
          console.error(`[Admin Shortcode] Failed to load "${componentName}":`, err);
          return { default: () => null };
        }
      },
      description: `Auto-registered from ${path}`
    });

    registered.push(shortcodeName);
  }

  if (import.meta.env.DEV) {
    console.log(`[Admin Shortcode Registry] ✅ Auto-registered ${registered.length} shortcodes:`, registered.sort());
  }
})();

// Debug: Expose globalRegistry to window (development only)
if (import.meta.env.DEV) {
  (window as any).__shortcodeRegistry = globalRegistry;
}

// Note: StrictMode disabled for Slate.js compatibility
// Slate's focus management conflicts with React's double-rendering in development mode
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
      <Toaster position="top-center" reverseOrder={false} />
    </BrowserRouter>
  </QueryClientProvider>,
)