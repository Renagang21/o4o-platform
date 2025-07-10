import React from 'react';
import { ModuleErrorBoundary } from './ModuleErrorBoundary';

// 기본 ErrorBoundary 컴포넌트
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                페이지 로딩 오류
              </h2>
              <p className="text-gray-600 mb-4">
                이 페이지를 불러오는 중 오류가 발생했습니다.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                페이지 새로고침
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ModuleErrorBoundary export
export { ModuleErrorBoundary } from './ModuleErrorBoundary';

// 각 모듈별 특화된 Error Boundary 컴포넌트들
export const DropshippingErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ModuleErrorBoundary moduleName="드랍쉬핑" fallbackUrl="/healthcare">
    {children}
  </ModuleErrorBoundary>
);

export const HealthcareErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ModuleErrorBoundary moduleName="헬스케어" fallbackUrl="/">
    {children}
  </ModuleErrorBoundary>
);

export const EditorErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ModuleErrorBoundary moduleName="에디터" fallbackUrl="/healthcare">
    {children}
  </ModuleErrorBoundary>
);

export const AdminErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ModuleErrorBoundary moduleName="관리자" fallbackUrl="/healthcare">
    {children}
  </ModuleErrorBoundary>
);

export const SignageErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ModuleErrorBoundary moduleName="디지털 사이니지" fallbackUrl="/healthcare">
    {children}
  </ModuleErrorBoundary>
);