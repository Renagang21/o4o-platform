/**
 * Digital Signage Router
 *
 * Main router for Digital Signage Core management UI
 * Phase 6: Operations/Management UI
 * Phase 12: Operations convenience features
 * Sprint 2-5: Phase 2 Admin Dashboard (v2 routes)
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AppGuard } from '@/components/common/AppGuard';

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

// V2 Pages (Sprint 2-5: Phase 2 Admin Dashboard)
const V2ChannelList = lazy(() => import('./v2/ChannelList'));
const V2ChannelEditor = lazy(() => import('./v2/ChannelEditor'));
const V2PlaylistList = lazy(() => import('./v2/PlaylistList'));
const V2PlaylistEditor = lazy(() => import('./v2/PlaylistEditor'));
const V2ScheduleCalendar = lazy(() => import('./v2/ScheduleCalendar'));
const V2MediaLibrary = lazy(() => import('./v2/MediaLibrary'));
const V2TemplateList = lazy(() => import('./v2/TemplateList'));
const V2TemplateBuilder = lazy(() => import('./v2/TemplateBuilder'));
const V2ContentBlockLibrary = lazy(() => import('./v2/ContentBlockLibrary'));
const V2LayoutPresetList = lazy(() => import('./v2/LayoutPresetList'));
const V2MonitoringDashboard = lazy(() => import('./v2/MonitoringDashboard'));

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
        {/* Default redirect - now goes to Operations Dashboard */}
        <Route path="/" element={<Navigate to="operations" replace />} />

        {/* Operations routes (Phase 12) */}
        <Route path="operations" element={<OperationsDashboard />} />
        <Route path="operations/history" element={<ActionHistory />} />
        <Route path="operations/display-status" element={<DisplayStatusMap />} />
        <Route path="operations/problems" element={<ProblemTracking />} />

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

        {/* V2 Routes (Sprint 2-5: Phase 2 Admin Dashboard) */}
        <Route path="v2" element={<Navigate to="v2/monitoring" replace />} />
        <Route path="v2/monitoring" element={<V2MonitoringDashboard />} />
        <Route path="v2/channels" element={<V2ChannelList />} />
        <Route path="v2/channels/new" element={<V2ChannelEditor />} />
        <Route path="v2/channels/:channelId" element={<V2ChannelEditor />} />
        <Route path="v2/playlists" element={<V2PlaylistList />} />
        <Route path="v2/playlists/new" element={<V2PlaylistEditor />} />
        <Route path="v2/playlists/:playlistId" element={<V2PlaylistEditor />} />
        <Route path="v2/schedules" element={<V2ScheduleCalendar />} />
        <Route path="v2/media" element={<V2MediaLibrary />} />
        <Route path="v2/templates" element={<V2TemplateList />} />
        <Route path="v2/templates/new" element={<V2TemplateBuilder />} />
        <Route path="v2/templates/:templateId" element={<V2TemplateBuilder />} />
        <Route path="v2/content-blocks" element={<V2ContentBlockLibrary />} />
        <Route path="v2/layout-presets" element={<V2LayoutPresetList />} />
        </Routes>
      </Suspense>
    </AppGuard>
  );
}
