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

// Auto-discover and register all shortcode modules
// Convention: Files named *Shortcodes.tsx or */index.ts in components/shortcodes/
// Examples:
// - formShortcodes.tsx -> exports formShortcodes array
// - auth/index.ts -> exports authShortcodes array
// - product/productShortcodes.tsx -> exports productShortcodes array

const shortcodeFileModules = import.meta.glob('./components/shortcodes/**/*Shortcodes.{ts,tsx}', { eager: false });
const shortcodeIndexModules = import.meta.glob('./components/shortcodes/**/index.{ts,tsx}', { eager: false });

// Merge both patterns
const allShortcodeModules = { ...shortcodeFileModules, ...shortcodeIndexModules };

const registerShortcodesFromModule = async (
  moduleName: string,
  importFn: () => Promise<{ [key: string]: any }>
) => {
  try {
    const module = await importFn();
    const shortcodeArray = module[moduleName];

    if (!Array.isArray(shortcodeArray)) {
      console.error(`[Admin Shortcode Registry] "${moduleName}" is not an array`);
      return;
    }

    shortcodeArray.forEach((definition: any) => {
      if (!definition.name) {
        console.warn(`[Admin Shortcode Registry] Skipping shortcode with no name in ${moduleName}`);
        return;
      }

      registerLazyShortcode({
        name: definition.name,
        loader: () => importFn().then(m => {
          const shortcode = m[moduleName]?.find((s: any) => s.name === definition.name);
          if (!shortcode) {
            console.error(`[Admin Shortcode Error] "${definition.name}" not found`);
            return { default: () => null };
          }
          return { default: shortcode.component };
        }).catch(err => {
          console.error(`[Admin Shortcode Error] Failed to load "${definition.name}":`, err);
          return { default: () => null };
        })
      });
    });
  } catch (err) {
    console.error(`[Admin Shortcode Registry] Failed to load module ${moduleName}:`, err);
  }
};

(async () => {
  const discoveredModules: string[] = [];

  for (const [path, importFn] of Object.entries(allShortcodeModules)) {
    // Extract module name from path
    let moduleName: string;

    if (path.includes('/index.')) {
      // Example: ./components/shortcodes/auth/index.ts -> authShortcodes
      const folderMatch = path.match(/\/([^/]+)\/index\./);
      moduleName = folderMatch ? `${folderMatch[1]}Shortcodes` : '';
    } else {
      // Example: ./components/shortcodes/formShortcodes.tsx -> formShortcodes
      const fileMatch = path.match(/\/([^/]+)\.tsx?$/);
      moduleName = fileMatch ? fileMatch[1] : '';
    }

    if (!moduleName) {
      console.warn(`[Admin Shortcode Registry] Could not extract module name from ${path}`);
      continue;
    }

    discoveredModules.push(moduleName);
    await registerShortcodesFromModule(moduleName, importFn as any);
  }

  console.log(`[Admin Shortcode Registry] ✅ Auto-discovered ${discoveredModules.length} modules:`, discoveredModules);
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