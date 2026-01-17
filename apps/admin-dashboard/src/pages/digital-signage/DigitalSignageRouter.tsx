/**
 * Digital Signage Router
 *
 * Admin Dashboard router for Digital Signage Core management UI
 *
 * Route Structure (R-1 Refinement):
 * - / (root): System Dashboard (Admin)
 * - /operations/*: Operations monitoring (Admin)
 * - /templates/*: Global template management (Admin)
 * - /layout-presets/*: Layout preset management (Admin)
 * - /content-blocks/*: Content block library (Admin)
 * - /settings/*: System settings (Admin)
 * - /analytics/*: Analytics dashboard (Admin)
 *
 * Note: Store and HQ Operator routes are in Service Frontend
 * See: SIGNAGE-ROUTING-MAP-V2.md for full route structure
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppGuard } from '@/components/common/AppGuard';

// ========== Legacy Pages (Phase 6/12) ==========
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

// Operations pages (Phase 12)
const OperationsDashboard = lazy(() => import('./operations/OperationsDashboard'));
const ActionHistory = lazy(() => import('./operations/ActionHistory'));
const DisplayStatusMap = lazy(() => import('./operations/DisplayStatusMap'));
const ProblemTracking = lazy(() => import('./operations/ProblemTracking'));

// ========== Admin Pages (R-1: Admin-only) ==========
// System Dashboard / Monitoring
const V2MonitoringDashboard = lazy(() => import('./v2/MonitoringDashboard'));

// Template Management (Admin)
const V2TemplateList = lazy(() => import('./v2/TemplateList'));
const V2TemplateBuilder = lazy(() => import('./v2/TemplateBuilder'));

// Layout Preset Management (Admin)
const V2LayoutPresetList = lazy(() => import('./v2/LayoutPresetList'));

// Content Block Library (Admin)
const V2ContentBlockLibrary = lazy(() => import('./v2/ContentBlockLibrary'));

// ========== Store/HQ Preview Pages (for Admin reference) ==========
// These are kept for admin to preview Store/HQ functionality
// In production, these will be in Service Frontend
const V2ChannelList = lazy(() => import('./v2/ChannelList'));
const V2ChannelEditor = lazy(() => import('./v2/ChannelEditor'));
const V2PlaylistList = lazy(() => import('./v2/PlaylistList'));
const V2PlaylistEditor = lazy(() => import('./v2/PlaylistEditor'));
const V2ScheduleCalendar = lazy(() => import('./v2/ScheduleCalendar'));
const V2MediaLibrary = lazy(() => import('./v2/MediaLibrary'));

// Sprint 2-6: Global Content Pages (Store/HQ Preview)
const StoreSignageDashboard = lazy(() => import('./v2/store/StoreSignageDashboard'));
const HQContentManager = lazy(() => import('./v2/hq/HQContentManager'));

const PageLoader = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export default function DigitalSignageRouter() {
  return (
    <AppGuard appId="digital-signage-core" appName="Digital Signage">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* ========== Admin Dashboard Root ========== */}
          {/* Default redirect to System Dashboard (Monitoring) */}
          <Route path="/" element={<Navigate to="v2/monitoring" replace />} />

          {/* ========== Admin: System Dashboard ========== */}
          <Route path="v2" element={<Navigate to="v2/monitoring" replace />} />
          <Route path="v2/monitoring" element={<V2MonitoringDashboard />} />

          {/* ========== Admin: Template Management ========== */}
          <Route path="templates" element={<V2TemplateList />} />
          <Route path="templates/new" element={<V2TemplateBuilder />} />
          <Route path="templates/:templateId" element={<V2TemplateBuilder />} />
          {/* Legacy v2 path redirect */}
          <Route path="v2/templates" element={<Navigate to="/digital-signage/templates" replace />} />
          <Route path="v2/templates/*" element={<Navigate to="/digital-signage/templates" replace />} />

          {/* ========== Admin: Layout Preset Management ========== */}
          <Route path="layout-presets" element={<V2LayoutPresetList />} />
          {/* Legacy v2 path redirect */}
          <Route path="v2/layout-presets" element={<Navigate to="/digital-signage/layout-presets" replace />} />

          {/* ========== Admin: Content Block Library ========== */}
          <Route path="content-blocks" element={<V2ContentBlockLibrary />} />
          {/* Legacy v2 path redirect */}
          <Route path="v2/content-blocks" element={<Navigate to="/digital-signage/content-blocks" replace />} />

          {/* ========== Admin: Operations (Phase 12 Legacy) ========== */}
          <Route path="operations" element={<OperationsDashboard />} />
          <Route path="operations/history" element={<ActionHistory />} />
          <Route path="operations/display-status" element={<DisplayStatusMap />} />
          <Route path="operations/problems" element={<ProblemTracking />} />

          {/* ========== Store/HQ Preview (Admin Reference Only) ========== */}
          {/* These routes allow admins to preview Store/HQ functionality */}
          {/* In production, these will be served from Service Frontend */}

          {/* Store Preview */}
          <Route path="preview/store" element={<StoreSignageDashboard />} />
          <Route path="preview/store/playlists" element={<V2PlaylistList />} />
          <Route path="preview/store/playlists/new" element={<V2PlaylistEditor />} />
          <Route path="preview/store/playlists/:playlistId" element={<V2PlaylistEditor />} />
          <Route path="preview/store/schedules" element={<V2ScheduleCalendar />} />
          <Route path="preview/store/media" element={<V2MediaLibrary />} />
          <Route path="preview/store/channels" element={<V2ChannelList />} />
          <Route path="preview/store/channels/new" element={<V2ChannelEditor />} />
          <Route path="preview/store/channels/:channelId" element={<V2ChannelEditor />} />

          {/* HQ Operator Preview */}
          <Route path="preview/hq" element={<HQContentManager />} />

          {/* ========== Legacy V2 Redirects (for backward compatibility) ========== */}
          <Route path="v2/store" element={<Navigate to="/digital-signage/preview/store" replace />} />
          <Route path="v2/hq" element={<Navigate to="/digital-signage/preview/hq" replace />} />
          <Route path="v2/channels" element={<Navigate to="/digital-signage/preview/store/channels" replace />} />
          <Route path="v2/channels/*" element={<Navigate to="/digital-signage/preview/store/channels" replace />} />
          <Route path="v2/playlists" element={<Navigate to="/digital-signage/preview/store/playlists" replace />} />
          <Route path="v2/playlists/*" element={<Navigate to="/digital-signage/preview/store/playlists" replace />} />
          <Route path="v2/schedules" element={<Navigate to="/digital-signage/preview/store/schedules" replace />} />
          <Route path="v2/media" element={<Navigate to="/digital-signage/preview/store/media" replace />} />

          {/* ========== Legacy Phase 6 Routes ========== */}
          {/* Media routes */}
          <Route path="media/sources" element={<MediaSourceList />} />
          <Route path="media/sources/:id" element={<MediaSourceDetail />} />
          <Route path="media/lists" element={<MediaListList />} />
          <Route path="media/lists/:id" element={<MediaListDetail />} />

          {/* Display routes */}
          <Route path="displays" element={<DisplayList />} />
          <Route path="displays/:id" element={<DisplayDetail />} />
          <Route path="display-slots" element={<DisplaySlotList />} />

          {/* Schedule routes */}
          <Route path="schedules" element={<ScheduleList />} />
          <Route path="schedules/:id" element={<ScheduleDetail />} />

          {/* Action routes */}
          <Route path="actions" element={<ActionExecutionList />} />
          <Route path="actions/:id" element={<ActionExecutionDetail />} />
        </Routes>
      </Suspense>
    </AppGuard>
  );
}
