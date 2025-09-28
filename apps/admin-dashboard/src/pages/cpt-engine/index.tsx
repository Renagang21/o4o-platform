/**
 * CPT Engine Router
 * Main entry point with routing for CPT Engine
 */

import { Routes, Route } from 'react-router-dom';
import CPTDashboardToolset from './CPTDashboardToolset';
import CPTContentEditorWrapper from './CPTContentEditorWrapper';
import CPTBuilder from './components/CPTBuilder';
import CPTFieldManager from './components/CPTFieldManager';
import CPTContentList from './components/CPTContentList';
import FormsManager from './forms/FormsManager';

const CPTEngine = () => {
  return (
    <Routes>
      {/* Main Dashboard - Toolset UI Style */}
      <Route index element={<CPTDashboardToolset />} />
      
      {/* Content Management Routes */}
      <Route path="content/:cptSlug" element={<CPTContentList />} />
      <Route path="content/:cptSlug/new" element={<CPTContentEditorWrapper />} />
      <Route path="content/:cptSlug/:postId/edit" element={<CPTContentEditorWrapper />} />
      
      {/* Type Management Routes */}
      <Route path="types/new" element={<CPTBuilder />} />
      <Route path="types/:slug/edit" element={<CPTBuilder />} />
      
      {/* Field Management Routes */}
      <Route path="fields/new" element={<CPTFieldManager />} />
      <Route path="fields/:id/edit" element={<CPTFieldManager />} />
      
      {/* Taxonomy Routes - Using CPTBuilder for now */}
      <Route path="taxonomies/new" element={<CPTBuilder />} />
      <Route path="taxonomies/:slug/edit" element={<CPTBuilder />} />
      
      {/* Archive Routes - Using CPTBuilder for now */}
      <Route path="archives/new" element={<CPTBuilder />} />
      <Route path="archives/:slug/edit" element={<CPTBuilder />} />
      
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