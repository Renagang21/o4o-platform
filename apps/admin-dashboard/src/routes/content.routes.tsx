import { Route } from 'react-router-dom';
import { AdminProtectedRoute } from '@o4o/auth-context';
import { Suspense, lazy } from 'react';

// 글 관리
const Posts = lazy(() => import('@/pages/posts/Posts'));
const Categories = lazy(() => import('@/pages/posts/Categories'));
const CategoryEdit = lazy(() => import('@/pages/posts/CategoryEdit'));
const Tags = lazy(() => import('@/pages/posts/Tags'));
const PagesRouter = lazy(() => import('@/pages/pages/PagesRouter'));

// Content Core Shell Pages (WO-O4O-OPERATOR-NAV-CONTENT-SHELL-V1)
const ContentOverviewPage = lazy(() => import('@/pages/content'));
const ContentAssetsPage = lazy(() => import('@/pages/content/assets'));
const ContentAssetDetailPage = lazy(() => import('@/pages/content/assets/[assetId]'));
const ContentCollectionsPage = lazy(() => import('@/pages/content/collections'));
const ContentPoliciesPage = lazy(() => import('@/pages/content/policies'));
const ContentAnalyticsPage = lazy(() => import('@/pages/content/analytics'));

// CMS V2 Pages (Phase C-2.5 & C-3)
const CMSCPTList = lazy(() => import('@/pages/cms/cpts/CMSCPTList'));
const CMSCPTForm = lazy(() => import('@/pages/cms/cpts/CPTForm'));
const CMSFieldList = lazy(() => import('@/pages/cms/fields/CMSFieldList'));
const CMSFieldForm = lazy(() => import('@/pages/cms/fields/FieldForm'));
const CMSViewList = lazy(() => import('@/pages/cms/views/CMSViewList'));
const CMSViewForm = lazy(() => import('@/pages/cms/views/ViewForm'));
const CMSPageList = lazy(() => import('@/pages/cms/pages/CMSPageList'));
const CMSPageForm = lazy(() => import('@/pages/cms/pages/PageForm'));

// CMS V2 Visual Designer (Phase C-3)
const ViewDesigner = lazy(() => import('@/pages/cms/designer/ViewDesigner'));

// CMS Content Admin (P3: WO-P3-CMS-ADMIN-CRUD-P0)
const CMSContentList = lazy(() => import('@/pages/cms/contents/CMSContentList'));

// CMS Slot Management (P3: WO-P3-CMS-SLOT-MANAGEMENT-P1)
const CMSSlotList = lazy(() => import('@/pages/cms/slots/CMSSlotList'));

// CMS Channel Management (P4: WO-P4-CHANNEL-IMPLEMENT-P0)
const ChannelList = lazy(() => import('@/pages/cms/channels/ChannelList'));

// Channel Operations Dashboard (P6: WO-P6-CHANNEL-OPS-DASHBOARD-P0)
const ChannelOpsDashboard = lazy(() => import('@/pages/channels/ops/ChannelOpsDashboard'));

// Ops Metrics Dashboard (NEXT: WO-NEXT-OPS-METRICS-P0)
const OpsMetricsDashboard = lazy(() => import('@/pages/ops/OpsMetricsDashboard'));

// CPT Engine
const CPTEngine = lazy(() => import('@/pages/cpt-engine'));
const FormPresets = lazy(() => import('@/pages/cpt-engine/presets/FormPresets'));
const ViewPresets = lazy(() => import('@/pages/cpt-engine/presets/ViewPresets'));
const TemplatePresets = lazy(() => import('@/pages/cpt-engine/presets/TemplatePresets'));

// CPT/ACF Router
const CPTACFRouter = lazy(() => import('@/pages/cpt-acf/CPTACFRouter'));

// Media & Custom Fields
const MediaLibrary = lazy(() => import('@/pages/media/Media'));
const CustomFields = lazy(() => import('@/pages/custom-fields/CustomFields'));
const Analytics = lazy(() => import('@/pages/analytics/Analytics'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
  </div>
);

/**
 * Content routes — posts, categories, pages, content core, CMS V2, CPT, media, analytics
 */
export function ContentRoutes() {
  return [
    // 글 관리
    <Route key="/posts" path="/posts" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <Posts />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 카테고리 & 태그
    <Route key="/posts/categories" path="/posts/categories" element={
      <AdminProtectedRoute requiredPermissions={['categories:read']}>
        <Suspense fallback={<PageLoader />}>
          <Categories />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/categories" path="/categories" element={
      <AdminProtectedRoute requiredPermissions={['categories:read']}>
        <Suspense fallback={<PageLoader />}>
          <Categories />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/categories/new" path="/categories/new" element={
      <AdminProtectedRoute requiredPermissions={['categories:write']}>
        <Suspense fallback={<PageLoader />}>
          <CategoryEdit />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/categories/edit/:id" path="/categories/edit/:id" element={
      <AdminProtectedRoute requiredPermissions={['categories:write']}>
        <Suspense fallback={<PageLoader />}>
          <CategoryEdit />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/posts/tags" path="/posts/tags" element={
      <AdminProtectedRoute requiredPermissions={['categories:read']}>
        <Suspense fallback={<PageLoader />}>
          <Tags />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 페이지 관리
    <Route key="/pages/*" path="/pages/*" element={
      <AdminProtectedRoute requiredPermissions={['pages:read']}>
        <Suspense fallback={<PageLoader />}>
          <PagesRouter />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Content Core Shell (WO-O4O-OPERATOR-NAV-CONTENT-SHELL-V1)
    <Route key="/content" path="/content" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ContentOverviewPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/content/assets" path="/content/assets" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ContentAssetsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/content/assets/:assetId" path="/content/assets/:assetId" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ContentAssetDetailPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/content/collections" path="/content/collections" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ContentCollectionsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/content/policies" path="/content/policies" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ContentPoliciesPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/content/analytics" path="/content/analytics" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ContentAnalyticsPage />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // CMS V2 관리 (Phase C-2.5)
    // CPT Routes
    <Route key="/admin/cms/cpts" path="/admin/cms/cpts" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSCPTList />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/cms/cpts/new" path="/admin/cms/cpts/new" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSCPTForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/cms/cpts/:id/edit" path="/admin/cms/cpts/:id/edit" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSCPTForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Field Routes
    <Route key="/admin/cms/fields" path="/admin/cms/fields" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSFieldList />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/cms/fields/new" path="/admin/cms/fields/new" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSFieldForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/cms/fields/:id/edit" path="/admin/cms/fields/:id/edit" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSFieldForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // View Routes
    <Route key="/admin/cms/views" path="/admin/cms/views" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSViewList />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/cms/views/new" path="/admin/cms/views/new" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSViewForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/cms/views/:id/edit" path="/admin/cms/views/:id/edit" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSViewForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Visual Designer Route (Phase C-3)
    <Route key="/admin/cms/views/:id/designer" path="/admin/cms/views/:id/designer" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ViewDesigner />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Page Routes
    <Route key="/admin/cms/pages" path="/admin/cms/pages" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSPageList />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/cms/pages/new" path="/admin/cms/pages/new" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSPageForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/admin/cms/pages/:id/edit" path="/admin/cms/pages/:id/edit" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSPageForm />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // CMS Content Routes (P3: WO-P3-CMS-ADMIN-CRUD-P0)
    <Route key="/admin/cms/contents" path="/admin/cms/contents" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSContentList />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // CMS Slot Routes (P3: WO-P3-CMS-SLOT-MANAGEMENT-P1)
    <Route key="/admin/cms/slots" path="/admin/cms/slots" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <CMSSlotList />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // CMS Channel Routes (P4: WO-P4-CHANNEL-IMPLEMENT-P0)
    <Route key="/admin/cms/channels" path="/admin/cms/channels" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ChannelList />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Channel Operations Dashboard (P6: WO-P6-CHANNEL-OPS-DASHBOARD-P0)
    <Route key="/admin/cms/channels/ops" path="/admin/cms/channels/ops" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <ChannelOpsDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // Ops Metrics Dashboard (NEXT: WO-NEXT-OPS-METRICS-P0)
    <Route key="/admin/ops/metrics" path="/admin/ops/metrics" element={
      <AdminProtectedRoute requiredRoles={['admin']}>
        <Suspense fallback={<PageLoader />}>
          <OpsMetricsDashboard />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 미디어 관리
    <Route key="/media/*" path="/media/*" element={
      <AdminProtectedRoute requiredPermissions={['media:read']}>
        <Suspense fallback={<PageLoader />}>
          <MediaLibrary />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // 분석
    <Route key="/analytics/*" path="/analytics/*" element={
      <AdminProtectedRoute requiredPermissions={['analytics:read']}>
        <Suspense fallback={<PageLoader />}>
          <Analytics />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // CPT Engine - New Unified Dashboard
    <Route key="/cpt-engine/*" path="/cpt-engine/*" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <CPTEngine />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // CPT Presets
    <Route key="/cpt-engine/presets/forms" path="/cpt-engine/presets/forms" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <FormPresets />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/cpt-engine/presets/views" path="/cpt-engine/presets/views" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <ViewPresets />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/cpt-engine/presets/templates" path="/cpt-engine/presets/templates" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <TemplatePresets />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // CPT/ACF Archive & Forms
    <Route key="/admin/cpt-acf/*" path="/admin/cpt-acf/*" element={
      <AdminProtectedRoute requiredPermissions={['content:read']}>
        <Suspense fallback={<PageLoader />}>
          <CPTACFRouter />
        </Suspense>
      </AdminProtectedRoute>
    } />,

    // ACF Legacy Routes
    <Route key="/acf/*" path="/acf/*" element={
      <AdminProtectedRoute requiredPermissions={['custom_fields:read']}>
        <Suspense fallback={<PageLoader />}>
          <CustomFields />
        </Suspense>
      </AdminProtectedRoute>
    } />,
    <Route key="/acf/groups" path="/acf/groups" element={
      <AdminProtectedRoute requiredPermissions={['custom_fields:read']}>
        <Suspense fallback={<PageLoader />}>
          <CustomFields />
        </Suspense>
      </AdminProtectedRoute>
    } />,
  ];
}
