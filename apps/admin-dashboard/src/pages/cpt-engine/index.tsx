/**
 * CPT Engine Router
 * Main entry point with routing for CPT Engine
 */

import { Routes, Route } from 'react-router-dom';
import CPTDashboard from './CPTDashboard';
import CPTContentEditorWrapper from './CPTContentEditorWrapper';

const CPTEngine = () => {
  return (
    <Routes>
      {/* Main Dashboard */}
      <Route index element={<CPTDashboard />} />
      
      {/* Content Editor Routes */}
      <Route path="content/:cptSlug/new" element={<CPTContentEditorWrapper />} />
      <Route path="content/:cptSlug/:postId/edit" element={<CPTContentEditorWrapper />} />
      
      {/* Other routes handled by dashboard tabs for now */}
      <Route path="*" element={<CPTDashboard />} />
    </Routes>
  );
};

export default CPTEngine;