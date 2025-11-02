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
console.log('[Shortcode Registry] Starting lazy shortcode registration...');

// Form shortcodes - 3개
const formShortcodeNames = ['contact_form', 'newsletter_form', 'custom_form'];
formShortcodeNames.forEach(name => {
  registerLazyShortcode({
    name,
    loader: () => import('./components/shortcodes/formShortcodes').then(m => ({
      default: m.formShortcodes.find(s => s.name === name)?.component || (() => null)
    }))
  });
});
console.log(`[Shortcode Registry] ✓ Registered ${formShortcodeNames.length} form shortcodes (lazy)`);

// Auth shortcodes - 2개
const authShortcodeNames = ['login_form', 'register_form'];
authShortcodeNames.forEach(name => {
  registerLazyShortcode({
    name,
    loader: () => import('./components/shortcodes/authShortcodes').then(m => ({
      default: m.authShortcodes.find(s => s.name === name)?.component || (() => null)
    }))
  });
});
console.log(`[Shortcode Registry] ✓ Registered ${authShortcodeNames.length} auth shortcodes (lazy)`);

// Dropshipping shortcodes - 29개
const dropshippingShortcodeNames = [
  'partner_dashboard', 'partner_products', 'partner_commissions', 'partner_link_generator',
  'partner_commission_dashboard', 'partner_payout_requests', 'partner_performance_chart',
  'partner_link_stats', 'partner_marketing_materials', 'partner_referral_tree',
  'partner_quick_stats', 'partner_leaderboard', 'partner_tier_progress',
  'supplier_dashboard', 'supplier_products', 'supplier_product_editor', 'supplier_analytics',
  'supplier_approval_queue', 'seller_dashboard', 'seller_products', 'seller_settlement',
  'seller_analytics', 'seller_pricing_manager', 'affiliate_dashboard',
  'user_dashboard', 'role_verification', 'profile_manager', 'role_switcher'
];
dropshippingShortcodeNames.forEach(name => {
  registerLazyShortcode({
    name,
    loader: () => import('./components/shortcodes/dropshippingShortcodes').then(m => ({
      default: m.dropshippingShortcodes.find(s => s.name === name)?.component || (() => null)
    }))
  });
});
console.log(`[Shortcode Registry] ✓ Registered ${dropshippingShortcodeNames.length} dropshipping shortcodes (lazy)`);

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
