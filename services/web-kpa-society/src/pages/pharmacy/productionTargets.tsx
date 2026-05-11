/**
 * productionTargets — 제작 진입 카탈로그 (Single Source of Truth)
 *
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-UNIFY-V1
 *
 * "내 자료함" 에서 시작하는 두 진입 흐름이 공유하는 카탈로그:
 *   1. StartProductionModal — 자료 선택 후 진입 (source.items 채워짐)
 *   2. ProductionTypeSelectorModal — 자료 없이 곧장 유형 선택 (source.items 비어 있음)
 *
 * 두 모달의 target/route 정의 중복을 제거하고, router state payload 를 표준화한다.
 *
 * 4유형 화이트리스트 고정: POP / QR 코드 / 블로그 / 상품 상세설명
 * 디지털 사이니지는 의도적 제외 (KPA Signage 구조 freeze 보호).
 *
 * Router state 표준:
 *   navigate(meta.route, { state: buildProductionState({ target, source? }) })
 *
 * 수신측(StorePopPage / StoreQRPage / StoreProductDescriptionsPage / PharmacyBlogPage)은
 * source.items.length === 0 일 때 메뉴 직접 진입과 동일하게 동작 (early return 처리됨).
 */

import { Megaphone, QrCode, BookOpen, FileText, type LucideIcon } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductionTarget = 'pop' | 'qr' | 'blog' | 'product-description';

export interface ProductionSourceItem {
  id: string;
  title: string;
  description?: string | null;
  /** 원본 종류: snapshot(asset_snapshots) | direct(kpa_store_contents) | library(store_execution_assets) */
  origin: 'snapshot' | 'direct' | 'library';
}

export interface ProductionSource {
  fromLibrary: 'contents' | 'resources';
  items: ProductionSourceItem[];
}

export interface ProductionTargetMeta {
  key: ProductionTarget;
  label: string;
  /** 1-line description (유형 선택 모달용) */
  description: string;
  Icon: LucideIcon;
  /** Hex color for icon tint */
  iconColor: string;
  route: string;
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

export const PRODUCTION_TARGET_CATALOG: ProductionTargetMeta[] = [
  {
    key: 'pop',
    label: 'POP',
    description: '매장 내 게시용 인쇄물 (PDF)',
    Icon: Megaphone,
    iconColor: '#f59e0b',
    route: '/store/marketing/pop',
  },
  {
    key: 'qr',
    label: 'QR 코드',
    description: '매장 입구·제품 옆 부착용 QR',
    Icon: QrCode,
    iconColor: '#0ea5e9',
    route: '/store/marketing/qr',
  },
  {
    key: 'blog',
    label: '블로그',
    description: '공개 콘텐츠 게시물',
    Icon: BookOpen,
    iconColor: '#16a34a',
    route: '/store/content/blog',
  },
  {
    key: 'product-description',
    label: '상품 상세설명',
    description: '상품 카드/상세 페이지용 본문',
    Icon: FileText,
    iconColor: '#2563EB',
    route: '/store/marketing/product-descriptions',
  },
];

export function findProductionTarget(key: ProductionTarget): ProductionTargetMeta | undefined {
  return PRODUCTION_TARGET_CATALOG.find((t) => t.key === key);
}

// ─── Router state helper ─────────────────────────────────────────────────────

export interface ProductionRouterState {
  production: {
    source: ProductionSource;
    target: ProductionTarget;
  };
}

/**
 * 표준 router state payload 빌더.
 * source 미지정 시 빈 items 로 진입 (메뉴 직접 진입과 동등).
 */
export function buildProductionState(opts: {
  target: ProductionTarget;
  source?: ProductionSource;
}): ProductionRouterState {
  return {
    production: {
      source: opts.source ?? { fromLibrary: 'contents', items: [] },
      target: opts.target,
    },
  };
}
