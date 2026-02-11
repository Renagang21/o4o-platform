/**
 * LMS Instructor Router
 *
 * WO-LMS-INSTRUCTOR-DASHBOARD-UX-REFINEMENT-V1
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

const InstructorDashboard = lazy(() => import('./dashboard'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export default function LmsInstructorRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<PageLoader />}>
            <InstructorDashboard />
          </Suspense>
        }
      />
      <Route
        path="/dashboard"
        element={
          <Suspense fallback={<PageLoader />}>
            <InstructorDashboard />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/admin/lms-instructor" replace />} />
    </Routes>
  );
}
