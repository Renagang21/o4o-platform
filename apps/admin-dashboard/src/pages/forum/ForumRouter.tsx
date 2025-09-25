import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const ForumDashboard = lazy(() => import('./ForumDashboard'));
const ForumBoards = lazy(() => import('./ForumBoards'));
const ForumCategories = lazy(() => import('./ForumCategories'));
const ForumPosts = lazy(() => import('./ForumPosts'));
const ForumComments = lazy(() => import('./ForumComments'));
const ForumReports = lazy(() => import('./ForumReports'));
const ForumSettings = lazy(() => import('./ForumSettings'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
  </div>
);

const ForumRouter = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<ForumDashboard />} />
        <Route path="boards" element={<ForumBoards />} />
        <Route path="categories" element={<ForumCategories />} />
        <Route path="posts" element={<ForumPosts />} />
        <Route path="comments" element={<ForumComments />} />
        <Route path="reports" element={<ForumReports />} />
        <Route path="settings" element={<ForumSettings />} />
        <Route path="*" element={<Navigate to="/forum" replace />} />
      </Routes>
    </Suspense>
  );
};

export default ForumRouter;