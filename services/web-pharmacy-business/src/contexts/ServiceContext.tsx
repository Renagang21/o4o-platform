/**
 * ServiceContext - KPA 서비스 컨텍스트 (라우트 기반 자동 감지)
 * WO-KPA-CONTEXT-SWITCHER-AND-ORG-RESOLUTION-V1
 *
 * KPA Society SPA 내 서비스 영역을 제공하는 컨텍스트.
 * /demo/* 제거 후 단일 서비스(KPA_A 커뮤니티)만 운영.
 */

import { createContext, useContext, ReactNode } from 'react';

export type KpaServiceId = 'KPA_A';

interface ServiceContextType {
  /** 현재 서비스 ID */
  currentService: KpaServiceId;
  /** 서비스 한글 이름 */
  serviceName: string;
  /** 조직 표시가 의미 있는 서비스인지 */
  isOrgRelevant: boolean;
}

const SERVICE_META: Record<KpaServiceId, { name: string; isOrgRelevant: boolean }> = {
  KPA_A: { name: '커뮤니티', isOrgRelevant: false },
};

const ServiceContext = createContext<ServiceContextType | null>(null);

export function ServiceProvider({ children }: { children: ReactNode }) {
  const value: ServiceContextType = {
    currentService: 'KPA_A',
    serviceName: SERVICE_META.KPA_A.name,
    isOrgRelevant: SERVICE_META.KPA_A.isOrgRelevant,
  };

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
}

export function useService(): ServiceContextType {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useService must be used within ServiceProvider');
  }
  return context;
}
