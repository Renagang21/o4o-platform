/**
 * PartnerOps Router
 *
 * Main router for PartnerOps app pages
 * Manages partners, affiliate links, conversions, and commissions
 *
 * WO-MENU-ROUTE-WIRING: Added AI Builder routes
 */

import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Routines = lazy(() => import('./pages/Routines'));
const Links = lazy(() => import('./pages/Links'));
const Conversions = lazy(() => import('./pages/Conversions'));
const Settlement = lazy(() => import('./pages/Settlement'));

// Partner AI Builder (WO-MENU-ROUTE-WIRING)
const AiBuilderPage = lazy(() => import('@o4o/partner-ai-builder').then(m => ({ default: m.AiBuilderPage })));

// Loading component
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

/**
 * PartnerOps Router Component
 */
const PartnerOpsRouter: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="routines" element={<Routines />} />
        <Route path="routines/new" element={<Routines />} />
        <Route path="routines/:id" element={<Routines />} />
        <Route path="links" element={<Links />} />
        <Route path="links/new" element={<Links />} />
        <Route path="conversions" element={<Conversions />} />
        <Route path="settlement" element={<Settlement />} />
        {/* AI Builder Routes (WO-MENU-ROUTE-WIRING) */}
        <Route path="ai-builder" element={<AiBuilderPage />} />
        <Route path="ai-builder/routine" element={<AiBuilderPage />} />
        <Route path="ai-builder/recommend" element={<AiBuilderPage />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
};

export default PartnerOpsRouter;
