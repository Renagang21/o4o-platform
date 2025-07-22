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

// Vendor Dashboard imports
import VendorLayout from './pages/vendor/layout/VendorLayout';
import VendorDashboard from './pages/vendor/Dashboard';
import VendorProducts from './pages/vendor/Products';
import VendorOrders from './pages/vendor/Orders';
import VendorAnalytics from './pages/vendor/Analytics';
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
        element: <VendorDashboard />,
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
        element: <VendorAnalytics />,
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
]);