/**
 * Digital Signage Admin Router
 *
 * Admin Dashboard router for Digital Signage system management
 *
 * Route Structure (WO-O4O-SIGNAGE-RESIDUAL-DEAD-RUNTIME-FINAL-RETIREMENT-V1):
 * - / (root): Content Hub
 * - /content: Content Hub (`/api/signage/:serviceKey/global/*`)
 *
 * Phase 6 legacy 화면(media / display / schedule / action / operations)과
 * Channel 기반 monitoring 화면은 consumer 0 이 증명되어 은퇴했다.
 * 남은 canonical admin 진입점은 Content Hub 하나다.
 *
 * IMPORTANT: This router is for ADMIN ONLY.
 * - HQ Operator routes are in Service Frontend (/signage/hq/*)
 * - Store routes are in Service Frontend (/signage/store/*)
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppGuard } from '@/components/common/AppGuard';

// Content Hub (WO-SIGNAGE-CONTENT-HUB-V1)
const ContentHub = lazy(() => import('./v2/ContentHub'));

const PageLoader = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-64 w-full" />
  </div>
);

/**
 * Redirect component for removed routes
 * Shows a message and redirects to the appropriate location
 */
const RemovedRouteRedirect = ({ message }: { message: string }) => (
  <div className="p-6 space-y-4">
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <h3 className="font-medium text-yellow-800">Route Relocated</h3>
      <p className="text-yellow-700 mt-1">{message}</p>
      <p className="text-sm text-yellow-600 mt-2">
        This route has been moved as part of Role Reform.
        Please access it from the appropriate service frontend.
      </p>
    </div>
  </div>
);

export default function DigitalSignageRouter() {
  return (
    <AppGuard appId="digital-signage-core" appName="Digital Signage">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ========== Admin Dashboard Root ========== */}
          <Route path="/" element={<Navigate to="content" replace />} />

          {/* ========== Admin: Content Hub (canonical) ========== */}
          <Route path="content" element={<ContentHub />} />

          {/* ========== Removed Routes (Role Reform) ========== */}
          {/* These routes have been moved to Service Frontend */}

          {/* HQ routes → Service Frontend /signage/hq/* */}
          <Route
            path="preview/hq"
            element={
              <RemovedRouteRedirect message="HQ Content Manager has been moved to Service Frontend at /signage/hq" />
            }
          />
          <Route
            path="v2/hq"
            element={
              <RemovedRouteRedirect message="HQ Content Manager has been moved to Service Frontend at /signage/hq" />
            }
          />

          {/* Store routes → Service Frontend /signage/store/* */}
          <Route
            path="preview/store/*"
            element={
              <RemovedRouteRedirect message="Store Dashboard has been moved to Service Frontend at /signage/store" />
            }
          />
          <Route
            path="v2/store"
            element={
              <RemovedRouteRedirect message="Store Dashboard has been moved to Service Frontend at /signage/store" />
            }
          />

          {/* Template routes → Operator or Extension */}
          <Route
            path="templates/*"
            element={
              <RemovedRouteRedirect message="Templates are now managed by HQ Operators at /signage/hq/templates" />
            }
          />
          <Route
            path="v2/templates/*"
            element={
              <RemovedRouteRedirect message="Templates are now managed by HQ Operators at /signage/hq/templates" />
            }
          />

          {/* Content blocks → Operator or Extension */}
          <Route
            path="content-blocks"
            element={
              <RemovedRouteRedirect message="Content Blocks are now managed by HQ Operators" />
            }
          />
          <Route
            path="layout-presets"
            element={
              <RemovedRouteRedirect message="Layout Presets are now managed by HQ Operators" />
            }
          />

          {/* Legacy V2 redirects → Removed */}
          <Route
            path="v2/*"
            element={
              <RemovedRouteRedirect message="V2 routes have been reorganized. Please use the new navigation." />
            }
          />

          {/* Catch-all for unknown routes */}
          <Route path="*" element={<Navigate to="content" replace />} />
        </Routes>
      </Suspense>
    </AppGuard>
  );
}
