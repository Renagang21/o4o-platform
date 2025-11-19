import { StrictMode } from 'react';
import './utils/react-compat'; // React 19 호환성
import './utils/iframe-context'; // iframe 컨텍스트 초기화 (가장 먼저)
import './index.css';
import './styles/wordpress-blocks.css';
import './styles/markdown-reader.css';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { initializeIframeContext } from './utils/iframe-context';
import App from './App';

// Shortcode 등록
import { registerLazyShortcode, globalRegistry, hasShortcode } from '@o4o/shortcodes';

// React 시작 전에 iframe 컨텍스트 초기화
initializeIframeContext();

// Auto-discover and register all shortcode components (Pure File-Based Convention)
// Convention: Filename → Shortcode Name (PascalCase → snake_case)
// Examples:
// - PartnerDashboard.tsx → [partner_dashboard]
// - ProductCarousel.tsx → [product_carousel]
// - ContactForm.tsx → [contact_form]
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
 * ./components/shortcodes/PartnerDashboard.tsx → PartnerDashboard
 * ./components/shortcodes/SocialLoginShortcode.tsx → SocialLogin
 */
function extractComponentName(path: string): string {
  const match = path.match(/\/([^/]+)\.tsx$/);
  if (!match) return '';

  let componentName = match[1];
  // Remove 'Shortcode' suffix if present
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
      path.endsWith('Shortcodes.tsx') || // Legacy array-based definition files
      path.endsWith('shortcodes.tsx')
    ) {
      continue;
    }

    try {
      const module = await importFn();
      let foundShortcodes = false;

      // Strategy 1: Look for ShortcodeDefinition[] arrays (e.g., authShortcodes, dashboardShortcodes)
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
              // Skip if already registered
              if (hasShortcode(shortcodeDef.name)) {
                if (import.meta.env.DEV) {
                  console.log(`[Main-Site Shortcode] ⏭️  Skipped [${shortcodeDef.name}] (already registered)`);
                }
                continue;
              }

              registerLazyShortcode({
                name: shortcodeDef.name,
                loader: async () => ({ default: shortcodeDef.component }),
                description: shortcodeDef.description || `Auto-registered from ${path} (${exportName} array)`
              });

              registered.push(shortcodeDef.name);
              foundShortcodes = true;

              if (import.meta.env.DEV) {
                console.log(`[Main-Site Shortcode] ✅ Registered [${shortcodeDef.name}] from ${exportName}[] in ${path}`);
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

            // Skip if already registered
            if (hasShortcode(shortcodeDef.name)) {
              if (import.meta.env.DEV) {
                console.log(`[Main-Site Shortcode] ⏭️  Skipped [${shortcodeDef.name}] (already registered)`);
              }
              continue;
            }

            registerLazyShortcode({
              name: shortcodeDef.name,
              loader: async () => ({ default: shortcodeDef.component }),
              description: shortcodeDef.description || `Auto-registered from ${path} (${exportName})`
            });

            registered.push(shortcodeDef.name);
            foundShortcodes = true;

            if (import.meta.env.DEV) {
              console.log(`[Main-Site Shortcode] ✅ Registered [${shortcodeDef.name}] from ${exportName} in ${path}`);
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

        // Skip if already registered
        if (hasShortcode(shortcodeName)) {
          if (import.meta.env.DEV) {
            console.log(`[Main-Site Shortcode] ⏭️  Skipped [${shortcodeName}] (already registered)`);
          }
          continue;
        }

        const Component = (module as any)[componentName] || (module as any).default;

        if (!Component) {
          if (import.meta.env.DEV) {
            console.warn(`[Main-Site Shortcode] Component "${componentName}" not found in ${path}`);
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
      console.error(`[Main-Site Shortcode] Failed to load ${path}:`, err);
    }
  }

  if (import.meta.env.DEV) {
    console.log(`[Main-Site Shortcode Registry] ✅ Auto-registered ${registered.length} shortcodes:`, registered.sort());
  }
})();

// Debug: Expose globalRegistry to window (development only)
if (import.meta.env.DEV) {
  (window as any).__shortcodeRegistry = globalRegistry;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
); 
