import { createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { SupplierShop } from './pages/shop/SupplierShop';
import { SupplierStoreSettings } from './pages/supplier/SupplierStoreSettings';
import { ShortcodeDemo } from './pages/ShortcodeDemo';
import { VendorRoute } from './components/auth/VendorRoute';

// Groupbuy pages
import {
  GroupbuyListPage,
  GroupbuyCampaignDetailPage,
  GroupbuyHistoryPage
} from './pages/groupbuy';

// Partner pages (Phase K)
import {
  PartnerLanding,
  PartnerSignup,
  PartnerDashboardLayout,
  PartnerDashboardHome,
  PartnerLinks,
  PartnerEarnings,
  PartnerContent
} from './pages/partner';

// Market Trial pages (Phase L-1)
import {
  MarketTrialListPage,
  MarketTrialDetailPage,
  MarketTrialJoinPage
} from './pages/market-trial';

// Vendor Dashboard imports
import VendorLayout from './pages/vendor/layout/VendorLayout';
// import VendorDashboard from './pages/vendor/Dashboard';
import VendorProducts from './pages/vendor/Products';
import VendorOrders from './pages/vendor/Orders';
// import VendorAnalytics from './pages/vendor/Analytics';
import VendorSettings from './pages/vendor/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'products',
        element: <ProductsPage />,
      },
      {
        path: 'products/:id',
        element: <ProductDetailPage />,
      },
      {
        path: 'cart',
        element: <CartPage />,
      },
      {
        path: 'checkout',
        element: <CheckoutPage />,
      },
      {
        path: 'orders',
        element: <OrdersPage />,
      },
      {
        path: 'orders/:id',
        element: <OrderDetailPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'shop/:slug',
        element: <SupplierShop />,
      },
      {
        path: 'supplier/store-settings',
        element: <SupplierStoreSettings />,
      },
      {
        path: 'shortcode-demo',
        element: <ShortcodeDemo />,
      },
      // Groupbuy routes (Member/Pharmacy)
      {
        path: 'groupbuy',
        element: <GroupbuyListPage />,
      },
      {
        path: 'groupbuy/history',
        element: <GroupbuyHistoryPage />,
      },
      {
        path: 'groupbuy/:campaignId',
        element: <GroupbuyCampaignDetailPage />,
      },
    ],
  },
  {
    path: '/vendor',
    element: (
      <VendorRoute>
        <VendorLayout />
      </VendorRoute>
    ),
    children: [
      {
        index: true,
        element: <div>대시보드는 준비 중입니다.</div>,
      },
      {
        path: 'products',
        element: <VendorProducts />,
      },
      {
        path: 'orders',
        element: <VendorOrders />,
      },
      {
        path: 'analytics',
        element: <div>분석 페이지는 준비 중입니다.</div>,
      },
      {
        path: 'settings',
        element: <VendorSettings />,
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  // Partner routes (Phase K)
  {
    path: '/partner',
    children: [
      {
        index: true,
        element: <PartnerLanding />,
      },
      {
        path: 'signup',
        element: <PartnerSignup />,
      },
      {
        path: 'dashboard',
        element: <PartnerDashboardLayout />,
        children: [
          {
            index: true,
            element: <PartnerDashboardHome />,
          },
          {
            path: 'links',
            element: <PartnerLinks />,
          },
          {
            path: 'earnings',
            element: <PartnerEarnings />,
          },
          {
            path: 'content',
            element: <PartnerContent />,
          },
        ],
      },
    ],
  },
  // Alias route: /business/partner -> PartnerLanding
  {
    path: '/business/partner',
    element: <PartnerLanding />,
  },
  // Market Trial routes (Phase L-1)
  {
    path: '/market-trial',
    children: [
      {
        index: true,
        element: <MarketTrialListPage />,
      },
      {
        path: ':trialId',
        element: <MarketTrialDetailPage />,
      },
      {
        path: ':trialId/join',
        element: <MarketTrialJoinPage />,
      },
    ],
  },
]);