/**
 * App - K-Cosmetics
 * Based on GlycoPharm App structure
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

// Layouts
import MainLayout from '@/components/layouts/MainLayout';

// Public Pages
import { HomePage, ContactPage, NotFoundPage, RoleNotAvailablePage } from '@/pages';
import LoginPage from '@/pages/auth/LoginPage';
import PartnerInfoPage from '@/pages/PartnerInfoPage';

// Test Guide Pages
import {
  TestGuidePage,
  ConsumerManualPage,
  SellerManualPage,
  SupplierManualPage,
  AdminManualPage,
} from '@/pages/test-guide';

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

        {/* Test Guide */}
        <Route path="test-guide" element={<TestGuidePage />} />
        <Route path="test-guide/manual/consumer" element={<ConsumerManualPage />} />
        <Route path="test-guide/manual/seller" element={<SellerManualPage />} />
        <Route path="test-guide/manual/supplier" element={<SupplierManualPage />} />
        <Route path="test-guide/manual/admin" element={<AdminManualPage />} />

        {/* Role Not Available */}
        <Route path="supplier/*" element={<RoleNotAvailablePage role="supplier" />} />
        <Route path="partner/*" element={<RoleNotAvailablePage role="partner" />} />
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
