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
import { registerLazyShortcode, globalRegistry } from '@o4o/shortcodes';

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
    // Skip utility files, types, legacy array-based files, etc.
    if (
      path.includes('/types.tsx') ||
      path.includes('/utils.tsx') ||
      path.includes('/helpers.tsx') ||
      path.includes('/index.tsx') ||
      path.includes('/__tests__/') ||
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
            console.error(`[Main-Site Shortcode] Component "${componentName}" not found in ${path}`);
            return {
              default: () => {
                if (import.meta.env.DEV) {
                  return (
                    <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '4px' }}>
                      <strong>Shortcode Error:</strong> "{componentName}" not found in {path}
                    </div>
                  );
                }
                return null;
              }
            };
          }

          return { default: Component };
        } catch (err) {
          console.error(`[Main-Site Shortcode] Failed to load "${componentName}":`, err);
          return {
            default: () => {
              if (import.meta.env.DEV) {
                return (
                  <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '4px' }}>
                    <strong>Load Error:</strong> Failed to load {componentName}
                  </div>
                );
              }
              return null;
            }
          };
        }
      },
      description: `Auto-registered from ${path}`
    });

    registered.push(shortcodeName);
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
