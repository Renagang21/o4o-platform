/**
 * App - K-Cosmetics
 * Based on GlycoPharm App structure
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Layouts
import MainLayout from '@/components/layouts/MainLayout';
import PartnerLayout from '@/components/layouts/PartnerLayout';

// Public Pages
import { HomePage, ContactPage, NotFoundPage, RoleNotAvailablePage, StoresPage, ProductsPage, SupplyPage, TouristHubPage } from '@/pages';
import LoginPage from '@/pages/auth/LoginPage';
import PartnerInfoPage from '@/pages/PartnerInfoPage';
import MyPage from '@/pages/MyPage';

// Partner Application (WO-PARTNER-APPLICATION-V1)
import PartnerApplyPage from '@/pages/partners/ApplyPage';

// Test Guide Pages
import {
  TestGuidePage,
  ConsumerManualPage,
  SellerManualPage,
  SupplierManualPage,
  AdminManualPage,
} from '@/pages/test-guide';

// Forum Pages
import { ForumPage, PostDetailPage } from '@/pages/forum';

// Partner Dashboard Pages
import PartnerIndex from '@/pages/partner/index';
import PartnerOverviewPage from '@/pages/partner/OverviewPage';
import PartnerTargetsPage from '@/pages/partner/TargetsPage';
import PartnerContentPage from '@/pages/partner/ContentPage';
import PartnerEventsPage from '@/pages/partner/EventsPage';
import PartnerStatusPage from '@/pages/partner/StatusPage';

// Protected Route Component - triggers auth check only when entering
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, isLoading, isSessionChecked, checkSession } = useAuth();

  // Trigger session check when entering protected route
  React.useEffect(() => {
    if (!isSessionChecked) {
      checkSession();
    }
  }, [isSessionChecked, checkSession]);

  // Wait for session check to complete
  if (!isSessionChecked || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.currentRole)) {
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
        <Route path="contact" element={<ContactPage />} />
        <Route path="partners" element={<PartnerInfoPage />} />
        <Route path="partners/apply" element={<PartnerApplyPage />} />

        {/* Test Guide */}
        <Route path="test-guide" element={<TestGuidePage />} />
        <Route path="test-guide/manual/consumer" element={<ConsumerManualPage />} />
        <Route path="test-guide/manual/seller" element={<SellerManualPage />} />
        <Route path="test-guide/manual/supplier" element={<SupplierManualPage />} />
        <Route path="test-guide/manual/admin" element={<AdminManualPage />} />

        {/* Forum */}
        <Route path="forum" element={<ForumPage />} />
        <Route path="forum/post/:postId" element={<PostDetailPage />} />

        {/* MyPage (Protected) */}
        <Route
          path="mypage"
          element={
            <ProtectedRoute>
              <MyPage />
            </ProtectedRoute>
          }
        />

        {/* Role Not Available - these roles use Neture platform */}
        <Route path="supplier/*" element={<RoleNotAvailablePage role="supplier" />} />
        <Route path="admin/*" element={<RoleNotAvailablePage role="admin" />} />
        <Route path="seller/*" element={<RoleNotAvailablePage role="seller" />} />

        {/* Platform Routes */}
        <Route path="platform/stores" element={<StoresPage />} />
        <Route path="platform/stores/products" element={<ProductsPage />} />

        {/* B2B Routes */}
        <Route path="b2b/supply" element={<SupplyPage />} />

        {/* Services Routes */}
        <Route path="services/tourists" element={<TouristHubPage />} />
      </Route>

      {/* Partner Dashboard */}
      <Route
        path="partner"
        element={
          <ProtectedRoute allowedRoles={['partner']}>
            <PartnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PartnerIndex />} />
        <Route path="overview" element={<PartnerOverviewPage />} />
        <Route path="targets" element={<PartnerTargetsPage />} />
        <Route path="content" element={<PartnerContentPage />} />
        <Route path="events" element={<PartnerEventsPage />} />
        <Route path="status" element={<PartnerStatusPage />} />
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
