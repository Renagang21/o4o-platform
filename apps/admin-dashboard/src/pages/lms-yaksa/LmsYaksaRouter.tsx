/**
 * LMS-Yaksa Admin Router
 *
 * Router for all LMS-Yaksa admin pages
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';

// Lazy load pages
const YaksaDashboard = lazy(() => import('./dashboard'));
const LicenseProfiles = lazy(() => import('./license-profiles'));
const RequiredPolicy = lazy(() => import('./required-policy'));
const Assignments = lazy(() => import('./assignments'));
const Credits = lazy(() => import('./credits'));
const Reports = lazy(() => import('./reports'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export default function LmsYaksaRouter() {
  return (
    <Routes>
      {/* Dashboard */}
      <Route
        path="/"
        element={
          <Suspense fallback={<PageLoader />}>
            <YaksaDashboard />
          </Suspense>
        }
      />
      <Route
        path="/dashboard"
        element={
          <Suspense fallback={<PageLoader />}>
            <YaksaDashboard />
          </Suspense>
        }
      />

      {/* License Profiles */}
      <Route
        path="/license-profiles"
        element={
          <Suspense fallback={<PageLoader />}>
            <LicenseProfiles />
          </Suspense>
        }
      />

      {/* Required Course Policy */}
      <Route
        path="/required-policy"
        element={
          <Suspense fallback={<PageLoader />}>
            <RequiredPolicy />
          </Suspense>
        }
      />

      {/* Course Assignments */}
      <Route
        path="/assignments"
        element={
          <Suspense fallback={<PageLoader />}>
            <Assignments />
          </Suspense>
        }
      />

      {/* Credit Records */}
      <Route
        path="/credits"
        element={
          <Suspense fallback={<PageLoader />}>
            <Credits />
          </Suspense>
        }
      />

      {/* Reports */}
      <Route
        path="/reports"
        element={
          <Suspense fallback={<PageLoader />}>
            <Reports />
          </Suspense>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/admin/lms-yaksa/dashboard" replace />} />
    </Routes>
  );
}
