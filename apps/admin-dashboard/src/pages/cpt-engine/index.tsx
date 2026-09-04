/**
 * CPT Engine Router
 * Main entry point with routing for CPT Engine
 */

import { Routes, Route } from 'react-router-dom';
import CPTDashboardToolset from './CPTDashboardToolset';
import CPTBuilderWrapper from './components/CPTBuilderWrapper';
import CPTContentList from './components/CPTContentList';
import FormsManager from './forms/FormsManager';
import FormBuilder from './forms/FormBuilder';
import FieldGroupsList from './field-groups/FieldGroupsList';
import FieldGroupEditor from './field-groups/FieldGroupEditor';
import TaxonomiesList from './taxonomies/TaxonomiesList';
import TaxonomyEditor from './taxonomies/TaxonomyEditor';
import TermsManager from './taxonomies/TermsManager';
import ToolsPage from './tools/ToolsPage';

const CPTEngine = () => {
  return (
    <Routes>
      {/* Main Dashboard - Toolset UI Style */}
      <Route index element={<CPTDashboardToolset />} />
      
      {/* Content Management Routes */}
      <Route path="content/:cptSlug" element={<CPTContentList />} />
      {/*
        (제거됨) content/:cptSlug/new · content/:cptSlug/:postId/edit
        WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-RETIREMENT-V1

        `CPTContentEditorWrapper` 는 legacy WordPress block editor(`StandaloneEditor`) 로
        가는 bridge 전용 파일이었고 다른 책임이 없었다. legacy editor 축과 함께 은퇴한다.
        CPT Engine 본체(대시보드 · 타입 · 필드그룹 · 택소노미 · 폼 · 도구 · 콘텐츠 목록)는
        이번 범위 밖이며 그대로 유지한다.
      */}
      
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

      {/* Tools Routes */}
      <Route path="tools" element={<ToolsPage />} />

      {/* Other routes handled by dashboard */}
      <Route path="*" element={<CPTDashboardToolset />} />
    </Routes>
  );
};

export default CPTEngine;