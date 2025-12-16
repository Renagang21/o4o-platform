/**
 * Reporting Yaksa Router
 *
 * Main router for Reporting (신상신고) management UI with AppGuard protection.
 * Prevents API calls when reporting-yaksa app is not installed.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppGuard } from '@/components/common/AppGuard';

// Lazy load pages
const ReportingDashboard = lazy(() => import('./dashboard/ReportingDashboard'));
const ReportList = lazy(() => import('./reports/ReportList'));
const TemplateList = lazy(() => import('./templates/TemplateList'));

const PageLoader = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export default function ReportingRouter() {
  return (
    <AppGuard appId="reporting-yaksa" appName="신상신고 관리">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<ReportingDashboard />} />
          <Route path="reports" element={<ReportList />} />
          <Route path="templates" element={<TemplateList />} />
        </Routes>
      </Suspense>
    </AppGuard>
  );
}
