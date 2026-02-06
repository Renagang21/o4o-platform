/**
 * BranchContext - 분회 컨텍스트
 *
 * SVC-C: 분회 서비스 전용 컨텍스트
 * - 현재 선택된 분회 정보 관리
 * - basePath: 분회 서비스 기본 경로 (링크 생성에 사용)
 *
 * NOTE: /demo/*는 SVC-B 전용 — basePath는 /branch-services 기준
 */

import { createContext, useContext, ReactNode } from 'react';

interface BranchContextType {
  branchId: string;
  branchName: string;
  basePath: string;
}

const BranchContext = createContext<BranchContextType | null>(null);

interface BranchProviderProps {
  branchId: string;
  branchName: string;
  basePath: string;
  children: ReactNode;
}

export function BranchProvider({ branchId, branchName, basePath, children }: BranchProviderProps) {
  return (
    <BranchContext.Provider value={{ branchId, branchName, basePath }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext() {
  const context = useContext(BranchContext);
  if (!context) {
    return { branchId: '', branchName: '분회', basePath: '/branch-services' };
  }
  return context;
}
