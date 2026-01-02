import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Layouts
import MainLayout from '@/components/layouts/MainLayout';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import StoreLayout from '@/components/layouts/StoreLayout';

// Public Pages
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import RoleSelectPage from '@/pages/auth/RoleSelectPage';

// Pharmacy Dashboard
import PharmacyDashboard from '@/pages/pharmacy/PharmacyDashboard';
import PharmacyProducts from '@/pages/pharmacy/PharmacyProducts';
import PharmacyOrders from '@/pages/pharmacy/PharmacyOrders';
import PharmacyPatients from '@/pages/pharmacy/PharmacyPatients';
import PharmacySettings from '@/pages/pharmacy/PharmacySettings';

// Supplier Dashboard
import SupplierDashboard from '@/pages/supplier/SupplierDashboard';

// Partner Dashboard
import PartnerDashboard from '@/pages/partner/PartnerDashboard';

// Operator Dashboard
import OperatorDashboard from '@/pages/operator/OperatorDashboard';

// Consumer Store
import StoreFront from '@/pages/store/StoreFront';
import StoreProducts from '@/pages/store/StoreProducts';
import StoreProductDetail from '@/pages/store/StoreProductDetail';
import StoreCart from '@/pages/store/StoreCart';

// Forum & Education
import ForumPage from '@/pages/forum/ForumPage';
import EducationPage from '@/pages/education/EducationPage';

// Common Pages
import MyPage from '@/pages/MyPage';
import NotFoundPage from '@/pages/NotFoundPage';

// Pharmacy Application Pages
import PharmacyApplyPage from '@/pages/apply/PharmacyApplyPage';
import MyApplicationsPage from '@/pages/apply/MyApplicationsPage';

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// App Routes
function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes with MainLayout */}
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="role-select" element={<RoleSelectPage />} />
        <Route path="forum" element={<ForumPage />} />
        <Route path="education" element={<EducationPage />} />
        <Route path="mypage" element={
          <ProtectedRoute>
            <MyPage />
          </ProtectedRoute>
        } />
        <Route path="apply" element={
          <ProtectedRoute>
            <PharmacyApplyPage />
          </ProtectedRoute>
        } />
        <Route path="apply/status" element={
          <ProtectedRoute>
            <MyApplicationsPage />
          </ProtectedRoute>
        } />
      </Route>

      {/* Pharmacy Dashboard */}
      <Route
        path="pharmacy"
        element={
          <ProtectedRoute allowedRoles={['pharmacy']}>
            <DashboardLayout role="pharmacy" />
          </ProtectedRoute>
        }
      >
        <Route index element={<PharmacyDashboard />} />
        <Route path="products" element={<PharmacyProducts />} />
        <Route path="orders" element={<PharmacyOrders />} />
        <Route path="patients" element={<PharmacyPatients />} />
        <Route path="settings" element={<PharmacySettings />} />
      </Route>

      {/* Supplier Dashboard */}
      <Route
        path="supplier"
        element={
          <ProtectedRoute allowedRoles={['supplier']}>
            <DashboardLayout role="supplier" />
          </ProtectedRoute>
        }
      >
        <Route index element={<SupplierDashboard />} />
      </Route>

      {/* Partner Dashboard */}
      <Route
        path="partner"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <DashboardLayout role="partner" />
          </ProtectedRoute>
        }
      >
        <Route index element={<PartnerDashboard />} />
      </Route>

      {/* Operator Dashboard */}
      <Route
        path="operator"
        element={
          <ProtectedRoute allowedRoles={['operator']}>
            <DashboardLayout role="operator" />
          </ProtectedRoute>
        }
      >
        <Route index element={<OperatorDashboard />} />
      </Route>

      {/* Consumer Store (Subdirectory) */}
      <Route path="store/:pharmacyId" element={<StoreLayout />}>
        <Route index element={<StoreFront />} />
        <Route path="products" element={<StoreProducts />} />
        <Route path="products/:productId" element={<StoreProductDetail />} />
        <Route path="cart" element={<StoreCart />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
