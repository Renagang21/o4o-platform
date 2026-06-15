/**
 * Production Materials — 제작 자료 목록 정규화/병합 공통 helper
 *
 * WO-O4O-STORE-PRODUCTION-MATERIAL-LIST-QUERY-CLEANUP-V1
 *
 * `/store/library/production-materials` 의 다중 소스(execution assets / blog / qr / direct)를
 * 단일 `ProductionMaterialItem[]` 로 정규화 + updatedAt DESC 정렬하는 순수 함수.
 * - API client / JSX / 서비스 의존 없음(순수) — 각 서비스 wrapper 가 raw 배열을 주입.
 * - GP/KCos 의 동일 매핑/병합 로직 중복 제거. (KPA 는 richer 구현 — 본 helper 범위 밖.)
 * - qr/direct 는 선택 소스(GP/KCos ready client 완성 시 주입). 미주입 시 빈 배열.
 */

export type ProductionMaterialKind = 'material' | 'blog' | 'qr' | 'direct';

export interface ProductionMaterialItem {
  id: string;
  title: string;
  updatedAt: string;
  kind: ProductionMaterialKind;
  /** material/qr 전용 — 사용 유형(pop/qr/signage 등) */
  usageType?: string | null;
  /** material 전용 — 자료 형태(file/content/external-link) */
  assetType?: string;
  /** blog status */
  status?: string;
  /** 원본 보기(derivation viewer)에 쓸 결과물 kind */
  derivedResultKind: 'pop' | 'blog';
}

export const PRODUCTION_USAGE_LABELS: Record<string, string> = {
  pop: 'POP', qr: 'QR 코드', signage: '사이니지', banner: '배너', notice: '공지',
};

export const PRODUCTION_ASSET_TYPE_LABELS: Record<string, string> = {
  file: '파일', content: '콘텐츠', 'external-link': '외부 링크',
};

export const PRODUCTION_KIND_BADGE: Record<ProductionMaterialKind, { label: string; bg: string; fg: string }> = {
  material: { label: '제작 자료', bg: '#eef2ff', fg: '#4338ca' },
  blog: { label: '블로그', bg: '#ecfdf5', fg: '#047857' },
  qr: { label: 'QR 코드', bg: '#fef3c7', fg: '#92400e' },
  direct: { label: '직접 작성', bg: '#f1f5f9', fg: '#475569' },
};

export const PRODUCTION_BLOG_STATUS_LABELS: Record<string, string> = {
  draft: '초안', published: '발행', archived: '보관',
};

export interface MergeProductionMaterialsInput {
  /** store_execution_assets (source_type=generated) raw rows */
  executionAssets?: any[];
  /** store_blog_posts raw rows */
  blogPosts?: any[];
  /** store_qr_codes raw rows (선택) */
  qrCodes?: any[];
  /** kpa_store_contents (source_type=direct) raw rows (선택) */
  directContents?: any[];
}

/**
 * 다중 소스 raw 배열을 ProductionMaterialItem[] 로 정규화하고 updatedAt DESC 정렬한다.
 * 각 소스는 선택 — 미주입 시 빈 배열로 취급(부분 소스 안전).
 */
export function mergeProductionMaterials(input: MergeProductionMaterialsInput): ProductionMaterialItem[] {
  const execution: ProductionMaterialItem[] = (input.executionAssets ?? []).map((it: any) => ({
    id: it.id,
    title: it.title,
    updatedAt: it.updatedAt,
    kind: 'material',
    usageType: it.usageType,
    assetType: it.assetType,
    derivedResultKind: 'pop',
  }));

  const blog: ProductionMaterialItem[] = (input.blogPosts ?? []).map((it: any) => ({
    id: it.id,
    title: it.title,
    updatedAt: it.updatedAt ?? it.createdAt,
    kind: 'blog',
    status: it.status,
    derivedResultKind: 'blog',
  }));

  const qr: ProductionMaterialItem[] = (input.qrCodes ?? []).map((it: any) => ({
    id: it.id,
    title: it.title,
    updatedAt: it.updatedAt ?? it.createdAt,
    kind: 'qr',
    usageType: 'qr',
    derivedResultKind: 'pop',
  }));

  const direct: ProductionMaterialItem[] = (input.directContents ?? []).map((it: any) => ({
    id: it.id,
    title: it.title,
    updatedAt: it.updatedAt ?? it.createdAt,
    kind: 'direct',
    derivedResultKind: 'pop',
  }));

  return [...execution, ...blog, ...qr, ...direct].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
