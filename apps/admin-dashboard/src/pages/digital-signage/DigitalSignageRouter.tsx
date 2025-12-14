/**
 * Digital Signage Router
 *
 * Main router for Digital Signage Core management UI
 * Phase 6: Operations/Management UI
 * Phase 12: Operations convenience features
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

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

const PageLoader = () => (
  <div className="p-6 space-y-4">
    <Skeleton className="h-8 w-64" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export default function DigitalSignageRouter() {
  return (
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
      </Routes>
    </Suspense>
  );
}
