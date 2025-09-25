import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const CrowdfundingDashboard = lazy(() => import('./CrowdfundingDashboard'));
const ProjectList = lazy(() => import('./ProjectList'));
const ProjectDetail = lazy(() => import('./ProjectDetail'));
const ProjectEdit = lazy(() => import('./ProjectEdit'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
  </div>
);

const CrowdfundingRouter = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<CrowdfundingDashboard />} />
        <Route path="projects" element={<ProjectList />} />
        <Route path="projects/new" element={<ProjectEdit />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="projects/:id/edit" element={<ProjectEdit />} />
        <Route path="backers" element={<CrowdfundingDashboard />} />
        <Route path="rewards" element={<CrowdfundingDashboard />} />
        <Route path="payments" element={<CrowdfundingDashboard />} />
        <Route path="reports" element={<CrowdfundingDashboard />} />
        <Route path="settings" element={<CrowdfundingDashboard />} />
        <Route path="*" element={<Navigate to="/crowdfunding" replace />} />
      </Routes>
    </Suspense>
  );
};

export default CrowdfundingRouter;