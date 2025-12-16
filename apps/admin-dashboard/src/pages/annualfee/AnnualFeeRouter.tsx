/**
 * Annual Fee Yaksa Router
 *
 * Main router for Annual Fee (연회비) management UI with AppGuard protection.
 * Prevents API calls when annualfee-yaksa app is not installed.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppGuard } from '@/components/common/AppGuard';

// Lazy load pages
const FeeDashboard = lazy(() => import('./FeeDashboard'));
const PolicyManagement = lazy(() => import('./PolicyManagement'));
const InvoiceManagement = lazy(() => import('./InvoiceManagement'));
const PaymentManagement = lazy(() => import('./PaymentManagement'));
const SettlementManagement = lazy(() => import('./SettlementManagement'));
const ExemptionManagement = lazy(() => import('./ExemptionManagement'));

const PageLoader = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export default function AnnualFeeRouter() {
  return (
    <AppGuard appId="annualfee-yaksa" appName="연회비 관리">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<FeeDashboard />} />
          <Route path="policies" element={<PolicyManagement />} />
          <Route path="invoices" element={<InvoiceManagement />} />
          <Route path="payments" element={<PaymentManagement />} />
          <Route path="settlements" element={<SettlementManagement />} />
          <Route path="exemptions" element={<ExemptionManagement />} />
        </Routes>
      </Suspense>
    </AppGuard>
  );
}
