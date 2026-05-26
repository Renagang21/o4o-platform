/**
 * Production Router State Types — K-Cosmetics
 *
 * WO-O4O-STORE-LIBRARY-CONTENT-TO-EXECUTION-PHASE2-E-V1
 *
 * KPA의 ProductionRouterState 구조와 호환되도록 정의.
 * 추후 @o4o/types 공식 이동은 Phase 3 대상.
 */

export interface ProductionSourceItem {
  id: string;
  title: string;
  description?: string | null;
  origin: 'snapshot' | 'direct' | 'library';
}

export interface ProductionSource {
  fromLibrary: 'contents' | 'resources';
  items: ProductionSourceItem[];
}

export interface ProductionRouterState {
  production: {
    source: ProductionSource;
    target: 'pop' | 'qr' | 'blog' | 'product-description';
    selectedTemplateId?: string;
  };
}
