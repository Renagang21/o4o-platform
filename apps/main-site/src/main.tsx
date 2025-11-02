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
import { registerShortcode, globalRegistry } from '@o4o/shortcodes';
// import { productShortcodes } from './components/shortcodes/productShortcodes'; // TODO: useProducts hook 필요
import { formShortcodes } from './components/shortcodes/formShortcodes';
import { authShortcodes } from './components/shortcodes/authShortcodes';
import { dropshippingShortcodes } from './components/shortcodes/dropshippingShortcodes';

// React 시작 전에 iframe 컨텍스트 초기화
initializeIframeContext();

// React 시작 전에 모든 shortcode 등록
console.log('[Shortcode Registry] Starting shortcode registration...');

// productShortcodes.forEach(def => registerShortcode(def)); // TODO: 의존성 해결 후 활성화
formShortcodes.forEach(def => registerShortcode(def));
console.log(`[Shortcode Registry] ✓ Registered ${formShortcodes.length} form shortcodes`);

authShortcodes.forEach(def => registerShortcode(def));
console.log(`[Shortcode Registry] ✓ Registered ${authShortcodes.length} auth shortcodes`);

dropshippingShortcodes.forEach(def => registerShortcode(def));
console.log(`[Shortcode Registry] ✓ Registered ${dropshippingShortcodes.length} dropshipping shortcodes`);

// Debug: Expose globalRegistry to window
(window as any).__shortcodeRegistry = globalRegistry;

// Verify critical shortcodes
const totalRegistered = globalRegistry.getAll().size;
console.log(`[Shortcode Registry] Total registered: ${totalRegistered} shortcodes`);
console.log('[Shortcode Registry] Checking critical shortcodes:');
console.log('  - partner_dashboard:', globalRegistry.has('partner_dashboard') ? '✓' : '✗ MISSING');
console.log('  - supplier_dashboard:', globalRegistry.has('supplier_dashboard') ? '✓' : '✗ MISSING');
console.log('  - login_form:', globalRegistry.has('login_form') ? '✓' : '✗ MISSING');

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
