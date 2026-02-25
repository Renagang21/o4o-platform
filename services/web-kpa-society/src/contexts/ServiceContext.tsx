/**
 * ServiceContext - KPA 서비스 컨텍스트 (라우트 기반 자동 감지)
 * WO-KPA-CONTEXT-SWITCHER-AND-ORG-RESOLUTION-V1
 *
 * KPA Society SPA 내 3개 서비스 영역을 URL pathname으로 자동 판별:
 *   KPA_A (커뮤니티) — /, /forum, /lms, /news, /courses, ...
 *   KPA_B (데모)     — /demo/*
 *   KPA_C (분회 서비스) — /branch-services/*, /store/*, /hub/*, /pharmacy/*
 *
 * URL이 SSOT이므로 별도 state/localStorage 불필요.
 */

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export type KpaServiceId = 'KPA_A' | 'KPA_B' | 'KPA_C';

interface ServiceContextType {
  /** 현재 서비스 ID */
  currentService: KpaServiceId;
  /** 서비스 한글 이름 */
  serviceName: string;
  /** 조직 표시가 의미 있는 서비스인지 (KPA_C에서만 true) */
  isOrgRelevant: boolean;
}

const SERVICE_META: Record<KpaServiceId, { name: string; isOrgRelevant: boolean }> = {
  KPA_A: { name: '커뮤니티', isOrgRelevant: false },
  KPA_B: { name: '데모', isOrgRelevant: false },
  KPA_C: { name: '분회 서비스', isOrgRelevant: true },
};

/**
 * pathname → KpaServiceId 판별
 *
 * 규칙 (App.tsx 라우트 구조 기반):
 * - /demo/*            → KPA_B (SVC-B: 지부/분회 데모)
 * - /branch-services/* → KPA_C (SVC-C: 분회 서비스)
 * - /store/*           → KPA_C (약국 경영지원 = 분회 서비스 영역)
 * - /hub/*             → KPA_C (약국 HUB)
 * - /pharmacy/*        → KPA_C (약국 관리 게이트/레거시)
 * - /operator/*        → KPA_C (서비스 운영자)
 * - 그 외              → KPA_A (커뮤니티)
 */
function resolveService(pathname: string): KpaServiceId {
  if (pathname.startsWith('/demo')) return 'KPA_B';
  if (pathname.startsWith('/branch-services')) return 'KPA_C';
  if (pathname.startsWith('/store')) return 'KPA_C';
  if (pathname.startsWith('/hub')) return 'KPA_C';
  if (pathname.startsWith('/pharmacy')) return 'KPA_C';
  if (pathname.startsWith('/operator')) return 'KPA_C';
  return 'KPA_A';
}

const ServiceContext = createContext<ServiceContextType | null>(null);

export function ServiceProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  const value = useMemo<ServiceContextType>(() => {
    const serviceId = resolveService(pathname);
    const meta = SERVICE_META[serviceId];
    return {
      currentService: serviceId,
      serviceName: meta.name,
      isOrgRelevant: meta.isOrgRelevant,
    };
  }, [pathname]);

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
