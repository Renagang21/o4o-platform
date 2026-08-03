/**
 * Membership Yaksa Router
 *
 * Main router for Membership management UI with AppGuard protection.
 * Prevents API calls when membership-yaksa app is not installed.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppGuard } from '@/components/common/AppGuard';

// Lazy load pages
const MembershipDashboard = lazy(() => import('./dashboard/MembershipDashboard'));
const MemberManagement = lazy(() => import('./members/MemberManagement'));
const MemberDetail = lazy(() => import('./members/MemberDetail'));
const VerificationManagement = lazy(() => import('./verifications/VerificationManagement'));
const CategoryManagement = lazy(() => import('./categories/CategoryManagement'));
const AuditLogManagement = lazy(() => import('./audit-logs/AuditLogManagement'));
// WO-O4O-MEMBERSHIP-UI-API-CONTRACT-AUDIT-AND-MINIMAL-RECOVERY-V1: AffiliationManagement 제거
// (이 router 자체는 현재 어디에도 mount 되지 않은 legacy 다 — 별도 정리 대상)

const PageLoader = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export default function MembershipRouter() {
  return (
    <AppGuard appId="membership-yaksa" appName="회원 관리">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<MembershipDashboard />} />
          <Route path="members" element={<MemberManagement />} />
          <Route path="members/:id" element={<MemberDetail />} />
          <Route path="verifications" element={<VerificationManagement />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="audit-logs" element={<AuditLogManagement />} />
        </Routes>
      </Suspense>
    </AppGuard>
  );
}
