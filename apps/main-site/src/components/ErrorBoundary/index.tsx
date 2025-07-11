import React from 'react';

export { ErrorBoundary } from '../ErrorBoundary';
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