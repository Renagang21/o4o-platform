/**
 * CPT Engine Router
 * Main entry point with routing for CPT Engine
 */

import { Routes, Route } from 'react-router-dom';
import CPTDashboardToolset from './CPTDashboardToolset';
import CPTContentEditorWrapper from './CPTContentEditorWrapper';
import CPTBuilderWrapper from './components/CPTBuilderWrapper';
import CPTFieldManagerWrapper from './components/CPTFieldManagerWrapper';
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
      <Route path="types/new" element={<CPTBuilderWrapper />} />
      <Route path="types/:slug/edit" element={<CPTBuilderWrapper />} />
      
      {/* Field Management Routes */}
      <Route path="fields/new" element={<CPTFieldManagerWrapper />} />
      <Route path="fields/:id/edit" element={<CPTFieldManagerWrapper />} />
      
      {/* Taxonomy Routes - Using CPTBuilderWrapper for now */}
      <Route path="taxonomies/new" element={<CPTBuilderWrapper />} />
      <Route path="taxonomies/:slug/edit" element={<CPTBuilderWrapper />} />
      
      {/* Archive Routes - Using CPTBuilderWrapper for now */}
      <Route path="archives/new" element={<CPTBuilderWrapper />} />
      <Route path="archives/:slug/edit" element={<CPTBuilderWrapper />} />
      
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