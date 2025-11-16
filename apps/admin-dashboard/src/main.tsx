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
 *
 * OFFICIAL SHORTCODE NAMING CONVENTION:
 * File: PartnerDashboard.tsx -> Shortcode: [partner_dashboard]
 * File: ProductCarousel.tsx -> Shortcode: [product_carousel]
 * File: ContactForm.tsx -> Shortcode: [contact_form]
 *
 * For explicit naming, use ShortcodeDefinition array export (Phase SC-2)
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
    // Skip utility files, types, renderers, etc.
    // NOTE: index.tsx is NO LONGER skipped (Phase SC-2 change)
    if (
      path.includes('/types.tsx') ||
      path.includes('/utils.tsx') ||
      path.includes('/helpers.tsx') ||
      path.includes('/__tests__/') ||
      path.endsWith('ShortcodeRenderer.tsx') ||
      path.endsWith('Shortcodes.tsx') || // Legacy array-based definition files
      path.endsWith('shortcodes.tsx')
    ) {
      continue;
    }

    try {
      const module = await importFn();
      let foundShortcodes = false;

      // Strategy 1: Look for ShortcodeDefinition[] arrays (e.g., partnerShortcodes, sellerShortcodes)
      // This is the PREFERRED pattern for index.tsx files or multi-shortcode files
      for (const [exportName, exportValue] of Object.entries(module)) {
        if (Array.isArray(exportValue) && exportValue.length > 0) {
          // Check if it's an array of ShortcodeDefinitions
          const firstItem = exportValue[0];
          if (
            firstItem &&
            typeof firstItem === 'object' &&
            'name' in firstItem &&
            'component' in firstItem
          ) {
            // Register all shortcodes from this array
            for (const shortcodeDef of exportValue as any[]) {
              registerLazyShortcode({
                name: shortcodeDef.name,
                loader: async () => ({ default: shortcodeDef.component }),
                description: shortcodeDef.description || `Auto-registered from ${path} (${exportName} array)`
              });

              registered.push(shortcodeDef.name);
              foundShortcodes = true;

              if (import.meta.env.DEV) {
                console.log(`[Admin Shortcode] ✅ Registered [${shortcodeDef.name}] from ${exportName}[] in ${path}`);
              }
            }
          }
        }
      }

      // Strategy 2: Look for individual ShortcodeDefinition objects (less common)
      if (!foundShortcodes) {
        for (const [exportName, exportValue] of Object.entries(module)) {
          if (
            exportValue &&
            typeof exportValue === 'object' &&
            !Array.isArray(exportValue) &&
            'name' in exportValue &&
            'component' in exportValue
          ) {
            const shortcodeDef = exportValue as any;

            registerLazyShortcode({
              name: shortcodeDef.name,
              loader: async () => ({ default: shortcodeDef.component }),
              description: shortcodeDef.description || `Auto-registered from ${path} (${exportName})`
            });

            registered.push(shortcodeDef.name);
            foundShortcodes = true;

            if (import.meta.env.DEV) {
              console.log(`[Admin Shortcode] ✅ Registered [${shortcodeDef.name}] from ${exportName} in ${path}`);
            }
          }
        }
      }

      // Strategy 3 (Fallback): Filename-based registration for simple default exports
      // Skip if this is index.tsx since it typically doesn't have a component named "index"
      if (!foundShortcodes && !path.endsWith('/index.tsx')) {
        const componentName = extractComponentName(path);
        if (!componentName) continue;

        const shortcodeName = pascalToSnakeCase(componentName);
        const Component = (module as any)[componentName] || (module as any).default;

        if (!Component) {
          if (import.meta.env.DEV) {
            console.warn(`[Admin Shortcode] Component "${componentName}" not found in ${path}`);
          }
          continue;
        }

        registerLazyShortcode({
          name: shortcodeName,
          loader: async () => ({ default: Component }),
          description: `Auto-registered from ${path}`
        });

        registered.push(shortcodeName);
      }
    } catch (err) {
      console.error(`[Admin Shortcode] Failed to load ${path}:`, err);
    }
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