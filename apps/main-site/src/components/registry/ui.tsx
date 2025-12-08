// UI Component Registry
// UI components render visual elements based on props

import type { ViewContext } from '@/view/types';

export interface UIComponentProps {
  context?: ViewContext;
  [key: string]: any;
}

// Dropshipping UI Components
import { DropshippingDashboard } from '@/components/ui/dropshipping/DropshippingDashboard';

// Commerce UI Components
import { ProductCard } from '@/components/ui/commerce/ProductCard';
import { ProductGrid } from '@/components/ui/commerce/ProductGrid';
import { ProductDetailView } from '@/components/ui/commerce/ProductDetailView';
import { CartItem } from '@/components/ui/commerce/CartItem';
import { CartSummary } from '@/components/ui/commerce/CartSummary';
import { CartView } from '@/components/ui/commerce/CartView';
import { CheckoutForm } from '@/components/ui/commerce/CheckoutForm';
import { OrderRow } from '@/components/ui/commerce/OrderRow';
import { OrderListView } from '@/components/ui/commerce/OrderListView';
import { OrderDetailView } from '@/components/ui/commerce/OrderDetailView';

// Customer/Auth UI Components
import { LoginForm } from '@/components/ui/customer/LoginForm';
import { SignupForm } from '@/components/ui/customer/SignupForm';
import { ResetPasswordForm } from '@/components/ui/customer/ResetPasswordForm';
import { CustomerOverview } from '@/components/ui/customer/CustomerOverview';
import { WishlistList } from '@/components/ui/customer/WishlistList';
import { ProfileForm } from '@/components/ui/customer/ProfileForm';

// Admin UI Components
import { AdminStatsCard } from '@/components/ui/admin/AdminStatsCard';
import { AdminDashboardPanel } from '@/components/ui/admin/AdminDashboardPanel';
import { AdminSellerListView } from '@/components/ui/admin/AdminSellerListView';
import { AdminSellerDetailView } from '@/components/ui/admin/AdminSellerDetailView';
import { AdminSupplierListView } from '@/components/ui/admin/AdminSupplierListView';
import { AdminSupplierDetailView } from '@/components/ui/admin/AdminSupplierDetailView';

// AppStore UI Components
import { AppList } from '@/components/ui/appstore/AppList';
import { AppCard } from '@/components/ui/appstore/AppCard';

// CMS UI Components
import { ViewList } from '@/components/ui/cms/ViewList';
import { ViewForm } from '@/components/ui/cms/ViewForm';
import { ViewEditor } from '@/components/ui/cms/ViewEditor';

// CMS Block Components
import { TextBlock } from '@/components/ui/cms/blocks/Text';

// Forum UI Components
import { ForumHomeView } from '@/components/ui/forum/ForumHomeView';
import { ForumListView } from '@/components/ui/forum/ForumListView';
import { ForumDetailView } from '@/components/ui/forum/ForumDetailView';
import { ForumCategoryView } from '@/components/ui/forum/ForumCategoryView';
import { ForumTagView } from '@/components/ui/forum/ForumTagView';

// Digital Signage UI Components
import { SignageGrid } from '@o4o-apps/signage/ui/SignageGrid';
import { SignagePlayer } from '@o4o-apps/signage/ui/SignagePlayer';
import { DeviceCard } from '@o4o-apps/signage/ui/DeviceCard';
import { SlideCard } from '@o4o-apps/signage/ui/SlideCard';
import { PlaylistCard } from '@o4o-apps/signage/ui/PlaylistCard';
import { ScheduleCard } from '@o4o-apps/signage/ui/ScheduleCard';

function DashboardView({ title, data }: { title: string; data?: any }) {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{title}</h1>
      {data && (
        <div className="bg-white rounded-lg shadow p-4">
          <pre className="text-sm">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
        <p className="text-red-600">{message}</p>
      </div>
    </div>
  );
}

function KPIGrid({ columns = 4, items }: { columns?: number; items: Array<{ label: string; value: string | number }> }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} gap-4`}>
      {items.map((item, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">{item.label}</div>
          <div className="text-2xl font-bold">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export const UIComponentRegistry: Record<string, React.ComponentType<any>> = {
  // Base Components
  DashboardView,
  ErrorMessage,
  KPIGrid,
  // Dropshipping
  DropshippingDashboard,
  // Commerce
  ProductCard,
  ProductGrid,
  ProductDetailView,
  CartItem,
  CartSummary,
  CartView,
  CheckoutForm,
  OrderRow,
  OrderListView,
  OrderDetailView,
  // Customer/Auth
  LoginForm,
  SignupForm,
  ResetPasswordForm,
  CustomerOverview,
  WishlistList,
  ProfileForm,
  // Admin
  AdminStatsCard,
  AdminDashboardPanel,
  AdminSellerListView,
  AdminSellerDetailView,
  AdminSupplierListView,
  AdminSupplierDetailView,
  // AppStore
  AppList,
  AppCard,
  // CMS
  ViewList,
  ViewForm,
  ViewEditor,
  // CMS Blocks
  Text: TextBlock,
  // Forum
  ForumHomeView,
  ForumListView,
  ForumDetailView,
  ForumCategoryView,
  ForumTagView,
  // Digital Signage
  SignageGrid,
  SignagePlayer,
  DeviceCard,
  SlideCard,
  PlaylistCard,
  ScheduleCard,
  // Add more UI components here
};
