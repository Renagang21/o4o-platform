/**
 * GlucoseView Router
 *
 * Phase C-3: GlucoseView Admin Integration
 * Routes for vendors, view profiles, and connections management
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Vendor Pages
import { VendorListPage, VendorDetailPage } from './vendors';

// View Profile Pages
import { ViewProfileListPage, ViewProfileDetailPage } from './view-profiles';

// Connection Pages
import { ConnectionListPage } from './connections';

const GlucoseViewRouter: React.FC = () => {
  return (
    <Routes>
      {/* Default redirect to vendors */}
      <Route path="/" element={<Navigate to="/glucoseview/vendors" replace />} />

      {/* Vendor Routes */}
      <Route path="/vendors" element={<VendorListPage />} />
      <Route path="/vendors/:vendorId" element={<VendorDetailPage />} />

      {/* View Profile Routes */}
      <Route path="/view-profiles" element={<ViewProfileListPage />} />
      <Route path="/view-profiles/:profileId" element={<ViewProfileDetailPage />} />

      {/* Connection Routes */}
      <Route path="/connections" element={<ConnectionListPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/glucoseview/vendors" replace />} />
    </Routes>
  );
};

export default GlucoseViewRouter;
