/**
 * Store QR — Operation Model (2세대 공통 계약)
 *
 * WO-O4O-STORE-QR-CANONICAL-TARGET-CONTENT-SOURCE-AND-KPA-PH-COMMONIZATION-V1
 * 설계 정본: docs/design/DESIGN-O4O-STORE-QR-CANONICAL-TARGET-PLACEMENT-AND-ANALYTICS-V1.md
 * 백엔드 정본: apps/api-server/src/services/store/store-qr-target.contract.ts
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일은 **React 를 import 하지 않는다.** 타입·라벨·판정 헬퍼만 갖는다.
 * QR 운영 화면(`StoreQrOperationBoard`)과 각 서비스 페이지가 같은 의미를 쓰도록
 * 하나의 어휘를 고정하는 것이 목적이다.
 *
 * 두 축을 구분한다 (백엔드 계약과 같은 구분이다):
 *   targetKind    — 이 QR 이 "무엇을" 가리키는가
 *   contentSource — 그 내용이 "어디서 오는가"
 *
 * `type` 컬럼은 DEAD residue 다. 이 모델에는 존재하지 않는다.
 * Placement(물리 부착 위치)는 QR 밖의 별도 축이며 여기서 다루지 않는다.
 */

// ────────────────────────────────────────────────────────────────────────────
// 1. Target Kind — canonical 축은 landingType 이다
// ────────────────────────────────────────────────────────────────────────────

export const STORE_QR_TARGET_KINDS = ['PRODUCT', 'CONTENT', 'SCREEN_SET', 'EXTERNAL_LINK'] as const;
export type StoreQrTargetKind = (typeof STORE_QR_TARGET_KINDS)[number];

/** landingType → targetKind. 백엔드 LANDING_TYPE_TO_TARGET_KIND 와 같은 표다. */
export const STORE_QR_LANDING_TYPE_TO_TARGET_KIND: Record<string, StoreQrTargetKind> = {
  product: 'PRODUCT',
  page: 'CONTENT',
  promotion: 'CONTENT',
  video: 'CONTENT',
  screen_set: 'SCREEN_SET',
  link: 'EXTERNAL_LINK',
};

/** 모르는 landingType 은 null. 임의 기본값으로 오분류하지 않는다. */
export function toStoreQrTargetKind(landingType: string | null | undefined): StoreQrTargetKind | null {
  if (!landingType) return null;
  return STORE_QR_LANDING_TYPE_TO_TARGET_KIND[landingType] ?? null;
}

/** 매장 경영자에게 보이는 대상 라벨. 서비스별로 바꾸지 않는다(KPA/PH 동일 의미). */
export const STORE_QR_TARGET_KIND_LABELS: Record<StoreQrTargetKind, string> = {
  PRODUCT: '제품',
  CONTENT: '콘텐츠',
  SCREEN_SET: '태블릿 코너',
  EXTERNAL_LINK: '외부 링크',
};

/**
 * landingType 자체를 보여줘야 할 때의 라벨(생성 폼의 select 등).
 * 목록 배지는 targetKind 를 쓴다 — 같은 의미를 두 어휘로 보여주지 않기 위해서다.
 */
export const STORE_QR_LANDING_TYPE_LABELS: Record<string, string> = {
  product: '제품',
  page: '콘텐츠',
  promotion: '프로모션',
  video: '동영상',
  screen_set: '태블릿 코너',
  link: '외부 링크',
};

// ────────────────────────────────────────────────────────────────────────────
// 2. Content Source — 내용의 원천
// ────────────────────────────────────────────────────────────────────────────

export const STORE_QR_CONTENT_SOURCES = [
  'STORE_PRODUCT_LISTING',
  'SUPPLIER_PRODUCT_OFFER',
  'PRODUCT_MASTER_LANDING',
  'EXECUTION_ASSET',
  'STORE_DIRECT',
  'SHARED_CONTENT',
  'STORE_VIDEO',
  'TABLET_SCREEN_SET',
  'STORE_BLOG',
  'MULTILINGUAL_PRODUCT',
  'EXTERNAL_URL',
] as const;
export type StoreQrContentSource = (typeof STORE_QR_CONTENT_SOURCES)[number];

/** 원천 라벨. 값이 없거나(HOLD) 모르는 값이면 배지를 아예 그리지 않는다. */
export const STORE_QR_CONTENT_SOURCE_LABELS: Record<StoreQrContentSource, string> = {
  STORE_PRODUCT_LISTING: '매장 제품',
  SUPPLIER_PRODUCT_OFFER: '공급 제품',
  PRODUCT_MASTER_LANDING: '제품 대표 페이지',
  EXECUTION_ASSET: '자료함',
  STORE_DIRECT: '매장 작성',
  SHARED_CONTENT: '공유 콘텐츠',
  STORE_VIDEO: '매장 동영상',
  TABLET_SCREEN_SET: '태블릿 화면 세트',
  STORE_BLOG: '매장 블로그',
  MULTILINGUAL_PRODUCT: '다국어 제품 설명',
  EXTERNAL_URL: '외부 주소',
};

export function storeQrContentSourceLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return STORE_QR_CONTENT_SOURCE_LABELS[value as StoreQrContentSource] ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// 3. 출력 규격 (Export Preset)
// ────────────────────────────────────────────────────────────────────────────

export type StoreQrExportFormat = 'png' | 'svg' | 'pdf';
export type StoreQrExportPreset = 'small' | 'medium' | 'large' | 'a4' | 'a4_4up';

export interface StoreQrExportOption {
  label: string;
  hint: string;
  format: StoreQrExportFormat;
  preset: StoreQrExportPreset;
}

/**
 * 출력 규격 canonical 5종 (KPA 에서 확립된 목록을 그대로 승격).
 * 이것은 **출력물의 규격**이지 물리 부착 위치(Placement)가 아니다.
 */
export const STORE_QR_EXPORT_PRESETS: StoreQrExportOption[] = [
  { label: 'PNG (이미지)', hint: '화면 확인·간단 공유', format: 'png', preset: 'medium' },
  { label: 'PNG 고해상도', hint: 'POP·포스터 삽입', format: 'png', preset: 'large' },
  { label: 'SVG (벡터)', hint: '전문 출력소 전달', format: 'svg', preset: 'medium' },
  { label: 'A4 1장 PDF', hint: '약국에서 바로 출력', format: 'pdf', preset: 'a4' },
  { label: 'A4 4분할 PDF', hint: '작은 안내카드 4장', format: 'pdf', preset: 'a4_4up' },
];

// ────────────────────────────────────────────────────────────────────────────
// 4. 운영 화면이 다루는 QR 한 건
// ────────────────────────────────────────────────────────────────────────────

/**
 * 서비스별 API 클라이언트의 QR 타입이 **구조적으로 만족**하면 되는 최소 계약이다.
 * (KPA `StoreQrCode` · PH `StoreQrCode` 모두 이 형태를 포함한다.)
 * `type` 은 의도적으로 없다 — DEAD residue 를 공통 계약에 들이지 않는다.
 */
export interface StoreQrOperationItem {
  id: string;
  title: string;
  description?: string | null;
  slug: string;
  landingType: string;
  landingTargetId?: string | null;
  /** 백엔드가 landingType 에서 파생해 내려준다. 없으면 프론트에서 파생한다. */
  targetKind?: string | null;
  /** NULL = 판정 보류(HOLD). 배지를 그리지 않는다. */
  contentSource?: string | null;
  scanCount?: number;
  isActive?: boolean;
  /** 코너 QR 전용 — 원본 화면 세트의 상태('active' | 'archived' 등). */
  screenSetStatus?: string | null;
  /** 백엔드가 계산해 내려주는 "지금 열리는가" 판정. 없으면 프론트가 보수적으로 추정한다. */
  landable?: boolean;
}

/**
 * 보관된 화면 세트의 코너 QR.
 * 목록에는 남는다(주소 유지 · 보관 해제 시 재개방). 출력·다운로드만 막는다 —
 * 서버가 같은 판정으로 409 를 주므로 UI 가 왕복을 미리 아낀다.
 */
export function isArchivedCornerQr(item: StoreQrOperationItem): boolean {
  return item.landingType === 'screen_set' && item.screenSetStatus === 'archived';
}

/** 지금 스캔하면 실제로 열리는가. 백엔드 landable 이 있으면 그 값이 우선이다. */
export function isQrLandable(item: StoreQrOperationItem): boolean {
  if (typeof item.landable === 'boolean') return item.landable;
  if (item.isActive === false) return false;
  return !isArchivedCornerQr(item);
}

/** 출력·다운로드가 가능한가(보관 코너 QR 은 불가). */
export function isQrExportable(item: StoreQrOperationItem): boolean {
  return !isArchivedCornerQr(item);
}

/** 목록 배지에 쓸 대상 라벨. 백엔드 targetKind → 없으면 landingType 파생 → 그래도 없으면 원문. */
export function storeQrTargetLabel(item: StoreQrOperationItem): string {
  const kind = (item.targetKind as StoreQrTargetKind | null) ?? toStoreQrTargetKind(item.landingType);
  if (kind && STORE_QR_TARGET_KIND_LABELS[kind]) return STORE_QR_TARGET_KIND_LABELS[kind];
  return STORE_QR_LANDING_TYPE_LABELS[item.landingType] ?? item.landingType;
}
