/**
 * CPT Engine Router
 * Main entry point with routing for CPT Engine
 */

import { Routes, Route } from 'react-router-dom';
import CPTDashboardToolset from './CPTDashboardToolset';
import CPTContentEditorWrapper from './CPTContentEditorWrapper';
import FormsManager from './forms/FormsManager';

const CPTEngine = () => {
  return (
    <Routes>
      {/* Main Dashboard - Toolset UI Style */}
      <Route index element={<CPTDashboardToolset />} />
      
      {/* Content Editor Routes */}
      <Route path="content/:cptSlug/new" element={<CPTContentEditorWrapper />} />
      <Route path="content/:cptSlug/:postId/edit" element={<CPTContentEditorWrapper />} />
      <Route path="content/:cptSlug" element={<CPTDashboardToolset />} />
      
      {/* Type Management Routes */}
      <Route path="types/new" element={<CPTDashboardToolset />} />
      <Route path="types/:slug/edit" element={<CPTDashboardToolset />} />
      
      {/* Field Management Routes */}
      <Route path="fields/new" element={<CPTDashboardToolset />} />
      <Route path="fields/:id/edit" element={<CPTDashboardToolset />} />
      
      {/* Taxonomy Routes */}
      <Route path="taxonomies/new" element={<CPTDashboardToolset />} />
      <Route path="taxonomies/:slug/edit" element={<CPTDashboardToolset />} />
      
      {/* Forms Routes */}
      <Route path="forms" element={<FormsManager />} />
      <Route path="forms/new" element={<FormsManager />} />
      <Route path="forms/:id/edit" element={<FormsManager />} />
      
      {/* Other routes handled by dashboard */}
      <Route path="*" element={<CPTDashboardToolset />} />
    </Routes>
  );
};

export default CPTEngine;