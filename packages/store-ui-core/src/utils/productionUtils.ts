/**
 * Production Router State Utilities — @o4o/store-ui-core
 *
 * WO-O4O-STORE-PRODUCTION-ROUTER-UTILS-COMMONIZATION-PHASE2-G-V1
 *
 * 3 서비스(KPA / GlycoPharm / K-Cosmetics)에서 중복 정의되던
 * production router state 빌더·파서를 단일 공통 모듈로 통합.
 *
 * Zero-dependency: @o4o/types/production 을 직접 import 하지 않고 타입을 인라인으로 정의.
 * (store-ui-core 는 peerDeps만 허용. @o4o/* 직접 import 금지.)
 * 타입 구조는 @o4o/types/production canonical 과 동기 유지 필요.
 *
 * 범위:
 *   - buildProductionState()        : router state payload 빌더 (KPA productionTargets.tsx에서 이동)
 *   - composeSourceTextFromItems()  : AI 입력용 텍스트 변환 (KPA productionTargets.tsx에서 이동)
 *   - parseProductionRouterState()  : location.state → production 파서 (신규 — 타입 캐스트 제거)
 *   - useProductionRouterState()    : hook 래퍼 (신규 — react-router-dom peerDep 활용)
 *
 * 범위 외 (KPA 전용, 이동 금지):
 *   - ProductionTargetMeta / PRODUCTION_TARGET_CATALOG
 *   - SelectContentsForProductionModal / StartProductionModal / AiContentModal
 */

import { useLocation } from 'react-router-dom';

// ─── Inline types (sync with @o4o/types/production canonical) ─────────────────

export type ProductionTarget = 'pop' | 'qr' | 'blog' | 'product-description';

export interface ProductionSourceItem {
  id: string;
  title: string;
  description?: string | null;
  /** 'local' = store_local_products (매장 자체 상품) — WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1 */
  origin: 'snapshot' | 'direct' | 'library' | 'local';
}

export interface ProductionSource {
  fromLibrary: 'contents' | 'resources';
  items: ProductionSourceItem[];
}

export interface ProductionRouterState {
  production: {
    source: ProductionSource;
    target: ProductionTarget;
    selectedTemplateId?: string;
  };
}

// ─── Utils ────────────────────────────────────────────────────────────────────

/**
 * 표준 router state payload 빌더.
 * source 미지정 시 빈 items 로 진입 (메뉴 직접 진입과 동등).
 * selectedTemplateId 미지정 시 undefined (수신측에서 defaultTemplateId fallback).
 */
export function buildProductionState(opts: {
  target: ProductionTarget;
  source?: ProductionSource;
  selectedTemplateId?: string;
}): ProductionRouterState {
  return {
    production: {
      source: opts.source ?? { fromLibrary: 'contents', items: [] },
      target: opts.target,
      selectedTemplateId: opts.selectedTemplateId,
    },
  };
}

/**
 * ProductionSourceItem[] → AI 입력용 텍스트 변환.
 * 콘텐츠 화면에서 선택된 항목을 AiContentModal(initialText=...)에 자동 주입하는 용도.
 */
export function composeSourceTextFromItems(items: ProductionSourceItem[]): string {
  if (items.length === 0) return '';
  const lines: string[] = [
    '다음 콘텐츠를 참고하여 매장 제작 자료 형태로 정리해 주세요.',
    '',
  ];
  items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.title}`);
    if (it.description) lines.push(`   설명: ${it.description}`);
    const originLabel =
      it.origin === 'direct' ? '매장 직접 작성'
      : it.origin === 'snapshot' ? '커뮤니티 콘텐츠'
      : it.origin === 'local' ? '매장 자체 상품'
      : '자료함';
    lines.push(`   출처: ${originLabel}`);
    lines.push('');
  });
  return lines.join('\n').trim();
}

// ─── 매장 자체 상품 POP 진입 (canonical) ─────────────────────────────────────

/**
 * WO-O4O-STORE-LOCAL-PRODUCT-POP-CANONICAL-FLOW-ALIGNMENT-V1
 *
 * 매장 자체 상품 POP 제작의 canonical 진입 route.
 * 과거 `/store/commerce/products/:id/pop` (ProductPopBuilderPage) 는 local product UUID 를
 * ProductMaster ID 처럼 사용하던 잘못된 흐름이었고, 현재는 legacy compatibility route 로만 남아
 * 이 route 로 1홉 수렴한다.
 */
export const CANONICAL_STORE_POP_ROUTE = '/store/marketing/pop';

/**
 * 매장 자체 상품 → canonical POP 화면 진입 router state 빌더.
 *
 * URL/state 에는 source identity(id + origin)만 싣는다. 상품명·이미지·문구는 수신측이
 * organization-scoped API 로 다시 조회한다(새로고침에도 prefill 유지, 본문 URL 노출 없음).
 * title/description 은 수신측 조회 전 표시용 hint 이며 신뢰 대상이 아니다.
 */
export function buildLocalProductPopState(product: {
  id: string;
  name?: string | null;
  summary?: string | null;
  description?: string | null;
}): ProductionRouterState {
  return buildProductionState({
    target: 'pop',
    source: {
      fromLibrary: 'contents',
      items: [
        {
          id: product.id,
          title: product.name ?? '',
          description: product.summary ?? product.description ?? null,
          origin: 'local',
        },
      ],
    },
  });
}

/**
 * location.state → production 필드 파서 (pure, no react-router-dom dep).
 * 타입 캐스트 대신 이 함수를 사용해 undefined-safe 하게 꺼낸다.
 */
export function parseProductionRouterState(
  locationState: unknown,
): ProductionRouterState['production'] | undefined {
  return (locationState as ProductionRouterState | null)?.production;
}

/**
 * useLocation().state → production 필드 hook.
 * react-router-dom 을 peerDep으로 사용하므로 서비스 내에서 바로 사용 가능.
 */
export function useProductionRouterState(): ProductionRouterState['production'] | undefined {
  const location = useLocation();
  return parseProductionRouterState(location.state);
}
