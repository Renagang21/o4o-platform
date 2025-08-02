import { FC, Suspense, lazy } from 'react';
import { 
  DropshippingErrorBoundary, 
  HealthcareErrorBoundary, 
  EditorErrorBoundary, 
  AdminErrorBoundary 
} from '../ErrorBoundary';

// 로딩 컴포넌트
const LoadingSpinner: FC<{ module: string }> = ({ module }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">{module} 모듈을 불러오는 중...</p>
    </div>
  </div>
);

// Lazy load 컴포넌트들
const LazyDropshippingPage = lazy(() => import('../../pages/DropshippingPage').then(module => ({ default: module.DropshippingPage })));
const LazyHealthcarePage = lazy(() => import('../../pages/healthcare/HealthcarePage').then(module => ({ default: module.HealthcarePage })));
const LazyHealthcareDemo = lazy(() => import('../../components/healthcare/HealthcareDemo'));
const LazyTheDANGStyleEditorPage = lazy(() => import('../../pages/TheDANGStyleEditorPage'));
const LazyFullScreenEditorSimpleTest = lazy(() => import('../../pages/FullScreenEditorSimpleTest').then(module => ({ default: module.FullScreenEditorSimpleTest })));
const LazyAdminDashboardTest = lazy(() => import('../../pages/AdminDashboardTest').then(module => ({ default: module.AdminDashboardTest })));

// 안전한 Lazy 래퍼 컴포넌트들
export const SafeDropshippingPage: FC = () => (
  <DropshippingErrorBoundary>
    <Suspense fallback={<LoadingSpinner module="드랍쉬핑" />}>
      <LazyDropshippingPage />
    </Suspense>
  </DropshippingErrorBoundary>
);

export const SafeHealthcarePage: FC = () => (
  <HealthcareErrorBoundary>
    <Suspense fallback={<LoadingSpinner module="헬스케어" />}>
      <LazyHealthcarePage />
    </Suspense>
  </HealthcareErrorBoundary>
);

export const SafeHealthcareDemo: FC = () => (
  <HealthcareErrorBoundary>
    <Suspense fallback={<LoadingSpinner module="헬스케어 데모" />}>
      <LazyHealthcareDemo />
    </Suspense>
  </HealthcareErrorBoundary>
);

export const SafeTheDANGStyleEditorPage: FC = () => (
  <EditorErrorBoundary>
    <Suspense fallback={<LoadingSpinner module="에디터" />}>
      <LazyTheDANGStyleEditorPage />
    </Suspense>
  </EditorErrorBoundary>
);

export const SafeFullScreenEditorSimpleTest: FC = () => (
  <EditorErrorBoundary>
    <Suspense fallback={<LoadingSpinner module="전체화면 에디터" />}>
      <LazyFullScreenEditorSimpleTest />
    </Suspense>
  </EditorErrorBoundary>
);

export const SafeAdminDashboardTest: FC = () => (
  <AdminErrorBoundary>
    <Suspense fallback={<LoadingSpinner module="관리자 대시보드" />}>
      <LazyAdminDashboardTest />
    </Suspense>
  </AdminErrorBoundary>
);