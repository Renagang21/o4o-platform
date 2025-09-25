import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const SignageDashboard = lazy(() => import('./SignageDashboard'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
  </div>
);

const SignageRouter = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<SignageDashboard />} />
        <Route path="screens" element={<SignageDashboard />} />
        <Route path="content" element={<SignageDashboard />} />
        <Route path="playlists" element={<SignageDashboard />} />
        <Route path="schedule" element={<SignageDashboard />} />
        <Route path="devices" element={<SignageDashboard />} />
        <Route path="analytics" element={<SignageDashboard />} />
        <Route path="*" element={<Navigate to="/signage" replace />} />
      </Routes>
    </Suspense>
  );
};

export default SignageRouter;