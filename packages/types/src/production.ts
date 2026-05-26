/**
 * @o4o/types/production — Store Production Router State Types (canonical)
 *
 * WO-O4O-STORE-PRODUCTION-TYPES-COMMONIZATION-PHASE2-F-V1 (2026-05-26)
 *
 * Phase 2-E 까지 KPA / GlycoPharm / K-Cosmetics 가 동일 구조의 production router
 * state 타입을 각자 로컬에 중복 정의해 왔다. 본 모듈이 4 개 타입의 canonical 출처.
 *
 * Phase 2-F 범위 (본 모듈):
 *   - ProductionTarget / ProductionSourceItem / ProductionSource / ProductionRouterState
 *
 * Phase 2-G 이후 (본 모듈 대상 아님):
 *   - buildProductionState() / composeSourceTextFromItems() / useProductionRouterState() 등 유틸/hook
 *   - ProductionTargetMeta / PRODUCTION_TARGET_CATALOG (KPA 전용 카탈로그 — 이동 금지)
 *   - SelectContentsForProductionModal / StartProductionModal / AiContentModal 공통화
 *
 * Phase 2-F 동작 보존:
 *   - 기존 사용처는 KPA productionTargets.tsx / GlycoPharm types/production.ts /
 *     K-Cosmetics types/production.ts 에서 본 모듈을 re-export 하므로 import 경로 변경 0.
 *   - 런타임 동작 / router state shape 0 변경.
 */

/**
 * 제작 대상 — 매장 운영자가 콘텐츠를 가지고 제작할 실행 자산 종류.
 *
 *   - 'pop'                  : POP (인쇄용 안내물)
 *   - 'qr'                   : QR-code (랜딩 redirect)
 *   - 'blog'                 : 매장 블로그 게시글
 *   - 'product-description'  : 상품 상세 설명
 */
export type ProductionTarget = 'pop' | 'qr' | 'blog' | 'product-description';

/**
 * 제작 소스 단일 항목.
 *
 *   - origin 'snapshot' : asset_snapshots (커뮤니티/공급자에서 가져온 자료의 매장 사본)
 *   - origin 'direct'   : kpa_store_contents (매장이 직접 작성한 콘텐츠)
 *   - origin 'library'  : store_execution_assets (매장 자료함의 실행 자료)
 */
export interface ProductionSourceItem {
  id: string;
  title: string;
  description?: string | null;
  origin: 'snapshot' | 'direct' | 'library';
}

/**
 * 제작 소스 묶음 — 제작 진입 시 router state 로 전달.
 *
 *   - fromLibrary 'contents'  : 자료함의 콘텐츠 탭에서 진입
 *   - fromLibrary 'resources' : 자료함의 자료 탭에서 진입
 */
export interface ProductionSource {
  fromLibrary: 'contents' | 'resources';
  items: ProductionSourceItem[];
}

/**
 * 제작 router state payload — 자료함 → 제작 페이지 진입 시 location.state.
 *
 *   selectedTemplateId 미지정 시 수신측에서 target 의 defaultTemplateId 로 fallback.
 */
export interface ProductionRouterState {
  production: {
    source: ProductionSource;
    target: ProductionTarget;
    selectedTemplateId?: string;
  };
}
