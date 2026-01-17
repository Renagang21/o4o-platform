/**
 * Digital Signage Admin Router
 *
 * Admin Dashboard router for Digital Signage system management
 *
 * Route Structure (Role Reform V1):
 * - / (root): System Dashboard
 * - /settings: System settings
 * - /extensions: Extension app management
 * - /suppliers: Supplier management
 * - /analytics: System-wide analytics
 * - /monitoring: System monitoring
 * - /operations/*: Operations legacy (Phase 12)
 *
 * IMPORTANT: This router is for ADMIN ONLY.
 * - HQ Operator routes are in Service Frontend (/signage/hq/*)
 * - Store routes are in Service Frontend (/signage/store/*)
 *
 * See: ROLE-STRUCTURE-V3.md for role definitions
 * See: SIGNAGE-ROUTING-MAP-V3.md for full route structure
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppGuard } from '@/components/common/AppGuard';

// ========== Admin System Pages ==========
// System Dashboard / Monitoring
const SystemDashboard = lazy(() => import('./v2/MonitoringDashboard'));

// System Settings (placeholder - to be implemented)
const SystemSettings = lazy(() =>
  import('./admin/SystemSettings').catch(() => ({
    default: () => <div className="p-6">System Settings - Coming Soon</div>,
  }))
);

// Extension Management (placeholder - to be implemented)
const ExtensionList = lazy(() =>
  import('./admin/ExtensionList').catch(() => ({
    default: () => <div className="p-6">Extension Management - Coming Soon</div>,
  }))
);

// Supplier Management (placeholder - to be implemented)
const SupplierList = lazy(() =>
  import('./admin/SupplierList').catch(() => ({
    default: () => <div className="p-6">Supplier Management - Coming Soon</div>,
  }))
);

// System Analytics (placeholder - to be implemented)
const SystemAnalytics = lazy(() =>
  import('./admin/SystemAnalytics').catch(() => ({
    default: () => <div className="p-6">System Analytics - Coming Soon</div>,
  }))
);

// ========== Operations Pages (Phase 12 Legacy) ==========
const OperationsDashboard = lazy(() => import('./operations/OperationsDashboard'));
const ActionHistory = lazy(() => import('./operations/ActionHistory'));
const DisplayStatusMap = lazy(() => import('./operations/DisplayStatusMap'));
const ProblemTracking = lazy(() => import('./operations/ProblemTracking'));

// ========== Legacy Phase 6 Pages (for backward compatibility) ==========
// Media pages
const MediaSourceList = lazy(() => import('./media/MediaSourceList'));
const MediaSourceDetail = lazy(() => import('./media/MediaSourceDetail'));
const MediaListList = lazy(() => import('./media/MediaListList'));
const MediaListDetail = lazy(() => import('./media/MediaListDetail'));

// Display pages
const DisplayList = lazy(() => import('./display/DisplayList'));
const DisplayDetail = lazy(() => import('./display/DisplayDetail'));
const DisplaySlotList = lazy(() => import('./display/DisplaySlotList'));

// Schedule pages
const ScheduleList = lazy(() => import('./schedule/ScheduleList'));
const ScheduleDetail = lazy(() => import('./schedule/ScheduleDetail'));

// Action pages
const ActionExecutionList = lazy(() => import('./action/ActionExecutionList'));
const ActionExecutionDetail = lazy(() => import('./action/ActionExecutionDetail'));

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
          <Route path="/" element={<Navigate to="monitoring" replace />} />

          {/* ========== Admin: System Management ========== */}
          <Route path="monitoring" element={<SystemDashboard />} />
          <Route path="settings" element={<SystemSettings />} />
          <Route path="extensions" element={<ExtensionList />} />
          <Route path="suppliers" element={<SupplierList />} />
          <Route path="analytics" element={<SystemAnalytics />} />

          {/* ========== Admin: Operations (Phase 12) ========== */}
          <Route path="operations" element={<OperationsDashboard />} />
          <Route path="operations/history" element={<ActionHistory />} />
          <Route path="operations/display-status" element={<DisplayStatusMap />} />
          <Route path="operations/problems" element={<ProblemTracking />} />

          {/* ========== Legacy Phase 6 Routes ========== */}
          {/* These routes are kept for backward compatibility */}
          {/* Media routes */}
          <Route path="media/sources" element={<MediaSourceList />} />
          <Route path="media/sources/:id" element={<MediaSourceDetail />} />
          <Route path="media/lists" element={<MediaListList />} />
          <Route path="media/lists/:id" element={<MediaListDetail />} />

          {/* Display routes */}
          <Route path="displays" element={<DisplayList />} />
          <Route path="displays/:id" element={<DisplayDetail />} />
          <Route path="display-slots" element={<DisplaySlotList />} />

          {/* Schedule routes (legacy) */}
          <Route path="schedules" element={<ScheduleList />} />
          <Route path="schedules/:id" element={<ScheduleDetail />} />

          {/* Action routes */}
          <Route path="actions" element={<ActionExecutionList />} />
          <Route path="actions/:id" element={<ActionExecutionDetail />} />

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
          <Route path="*" element={<Navigate to="monitoring" replace />} />
        </Routes>
      </Suspense>
    </AppGuard>
  );
}
