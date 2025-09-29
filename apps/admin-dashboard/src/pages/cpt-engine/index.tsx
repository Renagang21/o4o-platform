/**
 * CPT Engine Router
 * Main entry point with routing for CPT Engine
 */

import { Routes, Route } from 'react-router-dom';
import CPTDashboardToolset from './CPTDashboardToolset';
import CPTContentEditorWrapper from './CPTContentEditorWrapper';
import CPTBuilderWrapper from './components/CPTBuilderWrapper';
import CPTContentList from './components/CPTContentList';
import FormsManager from './forms/FormsManager';
import FormBuilder from './forms/FormBuilder';
import FieldGroupsList from './field-groups/FieldGroupsList';
import FieldGroupEditor from './field-groups/FieldGroupEditor';
import TaxonomiesList from './taxonomies/TaxonomiesList';
import TaxonomyEditor from './taxonomies/TaxonomyEditor';
import TermsManager from './taxonomies/TermsManager';

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
      
      {/* Field Groups Routes */}
      <Route path="field-groups" element={<FieldGroupsList />} />
      <Route path="field-groups/new" element={<FieldGroupEditor />} />
      <Route path="field-groups/:id/edit" element={<FieldGroupEditor />} />
      
      {/* Field Management Routes - Now handled by Field Groups */}
      
      {/* Taxonomy Routes */}
      <Route path="taxonomies" element={<TaxonomiesList />} />
      <Route path="taxonomies/new" element={<TaxonomyEditor />} />
      <Route path="taxonomies/:id/edit" element={<TaxonomyEditor />} />
      <Route path="taxonomies/:taxonomyId/terms" element={<TermsManager />} />
      
      {/* Archive Routes - Using CPTBuilderWrapper for now */}
      <Route path="archives/new" element={<CPTBuilderWrapper />} />
      <Route path="archives/:slug/edit" element={<CPTBuilderWrapper />} />
      
      {/* Forms Routes */}
      <Route path="forms" element={<FormsManager />} />
      <Route path="forms/new" element={<FormBuilder />} />
      <Route path="forms/:id/edit" element={<FormBuilder />} />
      
      {/* Other routes handled by dashboard */}
      <Route path="*" element={<CPTDashboardToolset />} />
    </Routes>
  );
};

export default CPTEngine;