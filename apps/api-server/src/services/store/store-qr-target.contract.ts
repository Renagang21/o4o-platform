/**
 * Store QR — Canonical Target / Content Source Contract
 *
 * WO-O4O-STORE-QR-CANONICAL-TARGET-CONTENT-SOURCE-AND-KPA-PH-COMMONIZATION-V1
 * 설계 정본: docs/design/DESIGN-O4O-STORE-QR-CANONICAL-TARGET-PLACEMENT-AND-ANALYTICS-V1.md
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 모듈은 store_qr_codes 의 **대상(target) 축**과 **원천(content source) 축**을 분리해
 * 정본으로 고정한다. 두 축은 서로 다른 질문에 답한다.
 *
 *   targetKind    : 이 QR 이 "무엇을" 가리키는가   (PRODUCT / CONTENT / SCREEN_SET / EXTERNAL_LINK)
 *   contentSource : 그 내용이 "어디서 오는가"      (매장 진열 / 자료함 / 매장 직접작성 / 공유 콘텐츠 / …)
 *
 * canonical 축은 `store_qr_codes.landing_type` 이다.
 * `store_qr_codes.type` 은 DEAD residue 다 — 프로덕션 88/88 이 landing_type 과 동일하고,
 * 백엔드·프론트 어디에도 `type` 으로 분기하는 코드가 없다. 이번 회차에서 read/write 의존을
 * 제거하되 **컬럼은 DROP 하지 않는다** (NOT NULL DEFAULT 라 schema housekeeping 은 별도 회차).
 *
 * Placement(물리 부착 위치)는 이 파일의 관심사가 아니다 — QR 밖의 별도 운영/이력 축이며
 * Phase 2 에서 `store_qr_placements` 로 도입한다.
 */

// ────────────────────────────────────────────────────────────────────────────
// 1. Target Kind — QR 이 가리키는 대상의 종류 (canonical 축 = landing_type)
// ────────────────────────────────────────────────────────────────────────────

export const QR_TARGET_KINDS = ['PRODUCT', 'CONTENT', 'SCREEN_SET', 'EXTERNAL_LINK'] as const;
export type QrTargetKind = (typeof QR_TARGET_KINDS)[number];

/**
 * landing_type → targetKind canonical mapping.
 *
 * `promotion` 은 프로덕션 0건 DEAD 이지만 VALID_QR_LANDING_TYPES 에 남아 있어
 * 매핑 구멍(undefined)을 만들지 않도록 CONTENT 로 귀속시킨다.
 */
export const LANDING_TYPE_TO_TARGET_KIND: Record<string, QrTargetKind> = {
  product: 'PRODUCT',
  page: 'CONTENT',
  promotion: 'CONTENT',
  video: 'CONTENT',
  screen_set: 'SCREEN_SET',
  link: 'EXTERNAL_LINK',
};

/** 알 수 없는 landing_type 은 null 을 돌려준다 — 임의 기본값으로 오분류하지 않는다. */
export function toQrTargetKind(landingType: string | null | undefined): QrTargetKind | null {
  if (!landingType) return null;
  return LANDING_TYPE_TO_TARGET_KIND[landingType] ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// 2. Content Source — 그 대상의 내용이 어느 원장에서 오는가
// ────────────────────────────────────────────────────────────────────────────

export const QR_CONTENT_SOURCES = [
  /** organization_product_listings — 매장이 취급 등록한 제품(진열). PRODUCT 의 정본 원천. */
  'STORE_PRODUCT_LISTING',
  /** supplier_product_offers — 공급 offer 직접 연결(KPA 레거시 경로). 프로덕션 실사용 0건. */
  'SUPPLIER_PRODUCT_OFFER',
  /** product_landings — ProductMaster 대표 랜딩 `/p/{public_key}`. Store QR 과 합치지 않는다(예약). */
  'PRODUCT_MASTER_LANDING',
  /** store_execution_assets — 매장 자료함의 실행 자산 사본. */
  'EXECUTION_ASSET',
  /** kpa_store_contents(source_type='direct') — 매장이 직접 작성한 콘텐츠. */
  'STORE_DIRECT',
  /** kpa_contents — HUB 공유 콘텐츠 참조. */
  'SHARED_CONTENT',
  /** store_videos — 매장 동영상. */
  'STORE_VIDEO',
  /** store_tablet_screen_sets — 태블릿 화면 세트(코너 QR). */
  'TABLET_SCREEN_SET',
  /** store_blog_posts — 매장 블로그 글(현재는 절대 URL 로 연결). */
  'STORE_BLOG',
  /** store_multilingual_product_content_groups — 다국어 상품 설명(현재는 절대 URL 로 연결). */
  'MULTILINGUAL_PRODUCT',
  /** 내부 참조가 확인되지 않는 외부 절대 URL. */
  'EXTERNAL_URL',
] as const;
export type QrContentSource = (typeof QR_CONTENT_SOURCES)[number];

export function isQrContentSource(value: unknown): value is QrContentSource {
  return typeof value === 'string' && (QR_CONTENT_SOURCES as readonly string[]).includes(value);
}

/**
 * targetKind × contentSource 정합 표 — 어떤 원천이 어떤 대상에 붙을 수 있는가.
 * 검증(assert)용이 아니라 UI 라벨·분석 그룹핑의 근거다.
 */
export const TARGET_KIND_CONTENT_SOURCES: Record<QrTargetKind, readonly QrContentSource[]> = {
  PRODUCT: ['STORE_PRODUCT_LISTING', 'SUPPLIER_PRODUCT_OFFER', 'PRODUCT_MASTER_LANDING'],
  CONTENT: ['EXECUTION_ASSET', 'STORE_DIRECT', 'SHARED_CONTENT', 'STORE_VIDEO'],
  SCREEN_SET: ['TABLET_SCREEN_SET'],
  EXTERNAL_LINK: ['STORE_BLOG', 'MULTILINGUAL_PRODUCT', 'EXTERNAL_URL'],
};

// ────────────────────────────────────────────────────────────────────────────
// 3. 단일 source resolver — **실제 참조 관계로만** 판정한다
// ────────────────────────────────────────────────────────────────────────────

/**
 * content_source 판정식 (SSOT).
 *
 * title/description 텍스트 추론을 하지 않는다. 각 분기는 실제 원장 행의 존재를 확인하며,
 * 어느 분기에도 걸리지 않으면 **NULL(HOLD)** 을 남긴다 — 오분류보다 공백이 낫다.
 *
 * 20270327000000-AddStoreQrContentSource 마이그레이션은 이 식의 **동결 사본**을 갖는다
 * (마이그레이션은 과거 시점 기록이므로 런타임 코드를 import 하지 않는다).
 */
export function contentSourceClassifySql(cols: {
  landingType: string;
  landingTargetId: string;
  libraryItemId: string;
  organizationId: string;
}): string {
  const { landingType: lt, landingTargetId: tid, libraryItemId: lib, organizationId: org } = cols;
  return `CASE
    WHEN ${lt} = 'screen_set' AND EXISTS (
      SELECT 1 FROM store_tablet_screen_sets s
       WHERE s.id::text = ${tid} AND s.organization_id = ${org}
    ) THEN 'TABLET_SCREEN_SET'
    WHEN ${lt} = 'product' AND EXISTS (
      SELECT 1 FROM organization_product_listings o
       WHERE o.id::text = ${tid} AND o.organization_id = ${org}
    ) THEN 'STORE_PRODUCT_LISTING'
    WHEN ${lt} = 'product' AND EXISTS (
      SELECT 1 FROM supplier_product_offers spo WHERE spo.id::text = ${tid}
    ) THEN 'SUPPLIER_PRODUCT_OFFER'
    WHEN ${lt} = 'page' AND EXISTS (
      SELECT 1 FROM kpa_store_contents c
       WHERE c.id::text = ${tid} AND c.organization_id = ${org} AND c.source_type = 'direct'
    ) THEN 'STORE_DIRECT'
    WHEN ${lt} = 'page' AND EXISTS (
      SELECT 1 FROM kpa_contents c WHERE c.id::text = ${tid}
    ) THEN 'SHARED_CONTENT'
    WHEN ${lt} = 'page' AND ${tid} IS NULL AND EXISTS (
      SELECT 1 FROM store_execution_assets a
       WHERE a.id = ${lib} AND a.organization_id = ${org}
    ) THEN 'EXECUTION_ASSET'
    WHEN ${lt} = 'video' AND EXISTS (
      SELECT 1 FROM store_videos v WHERE v.id::text = ${tid}
    ) THEN 'STORE_VIDEO'
    WHEN ${lt} = 'link' AND EXISTS (
      SELECT 1 FROM store_blog_posts b WHERE ${tid} LIKE '%/blog/' || b.slug
    ) THEN 'STORE_BLOG'
    WHEN ${lt} = 'link' AND EXISTS (
      SELECT 1 FROM store_multilingual_product_content_groups g
       WHERE g.public_key IS NOT NULL AND ${tid} LIKE '%/multilingual-products/' || g.public_key
    ) THEN 'MULTILINGUAL_PRODUCT'
    WHEN ${lt} = 'link' AND ${tid} ~* '^https?://' THEN 'EXTERNAL_URL'
    ELSE NULL
  END`;
}

/** 생성/정정 시점의 content_source 판정. 판정 불가면 null(HOLD) 을 돌려준다. */
export async function resolveQrContentSource(
  dataSource: { query: (sql: string, params?: unknown[]) => Promise<any[]> },
  input: {
    organizationId: string;
    landingType: string;
    landingTargetId: string | null;
    libraryItemId: string | null;
  },
): Promise<QrContentSource | null> {
  const expr = contentSourceClassifySql({
    landingType: '$1::text',
    landingTargetId: '$2::text',
    libraryItemId: '$3::uuid',
    organizationId: '$4::uuid',
  });
  try {
    const [row] = await dataSource.query(`SELECT ${expr} AS cs`, [
      input.landingType,
      input.landingTargetId ?? null,
      input.libraryItemId ?? null,
      input.organizationId,
    ]);
    const cs = row?.cs ?? null;
    return isQrContentSource(cs) ? cs : null;
  } catch {
    // 판정 실패는 QR 생성을 막지 않는다 — content_source 는 additive 분석 축이다.
    return null;
  }
}
