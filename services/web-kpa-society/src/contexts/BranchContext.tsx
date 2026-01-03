/**
 * BranchContext - 분회 컨텍스트
 * 현재 선택된 분회 정보 관리
 */

import { createContext, useContext, ReactNode } from 'react';

interface BranchContextType {
  branchId: string;
  branchName: string;
}

const BranchContext = createContext<BranchContextType | null>(null);

interface BranchProviderProps {
  branchId: string;
  branchName: string;
  children: ReactNode;
}

export function BranchProvider({ branchId, branchName, children }: BranchProviderProps) {
  return (
    <BranchContext.Provider value={{ branchId, branchName }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext() {
  const context = useContext(BranchContext);
  if (!context) {
    return { branchId: '', branchName: '분회' };
  }
  return context;
}
