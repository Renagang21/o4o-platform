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

// React 시작 전에 모든 shortcode 등록 (Lazy Loading 사용)
/**
 * Helper to register all shortcodes from a module with lazy loading
 * This approach eliminates hardcoded name arrays and uses a single source of truth
 */
const registerShortcodesFromModule = async (
  moduleName: string,
  importFn: () => Promise<{ [key: string]: any }>
) => {
  try {
    const module = await importFn();
    const shortcodeArray = module[moduleName];

    if (!Array.isArray(shortcodeArray)) {
      console.error(`[Shortcode Registry] "${moduleName}" is not an array in the module`);
      return;
    }

    shortcodeArray.forEach((definition: any) => {
      if (!definition.name) {
        console.warn(`[Shortcode Registry] Skipping shortcode with no name in ${moduleName}`);
        return;
      }

      registerLazyShortcode({
        name: definition.name,
        loader: () => importFn().then(m => {
          const shortcode = m[moduleName]?.find((s: any) => s.name === definition.name);

          if (!shortcode) {
            console.error(`[Shortcode Error] "${definition.name}" not found in ${moduleName}`);
            return {
              default: () => {
                if (import.meta.env.DEV) {
                  return (
                    <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '4px' }}>
                      <strong>Shortcode Error:</strong> "{definition.name}" not found
                    </div>
                  );
                }
                return null;
              }
            };
          }

          return { default: shortcode.component };
        }).catch(err => {
          console.error(`[Shortcode Error] Failed to load "${definition.name}":`, err);
          return {
            default: () => {
              if (import.meta.env.DEV) {
                return (
                  <div style={{ padding: '1rem', background: '#fee', border: '1px solid #fcc', borderRadius: '4px' }}>
                    <strong>Load Error:</strong> Failed to load {definition.name}
                  </div>
                );
              }
              return null;
            }
          };
        })
      });
    });
  } catch (err) {
    console.error(`[Shortcode Registry] Failed to load module ${moduleName}:`, err);
  }
};

// Register all shortcodes from their respective modules
// This runs once at startup to discover and register all available shortcodes
(async () => {
  await registerShortcodesFromModule(
    'formShortcodes',
    () => import('./components/shortcodes/formShortcodes')
  );

  await registerShortcodesFromModule(
    'authShortcodes',
    () => import('./components/shortcodes/auth')
  );

  await registerShortcodesFromModule(
    'dropshippingShortcodes',
    () => import('./components/shortcodes/dropshippingShortcodes')
  );

  await registerShortcodesFromModule(
    'productShortcodes',
    () => import('./components/shortcodes/productShortcodes')
  );
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
