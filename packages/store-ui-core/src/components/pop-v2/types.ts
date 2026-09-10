/**
 * POP V2 공통 Core — 계약
 * WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 * 정본: docs/architecture/O4O-STORE-POP-V2-CANONICAL-MODEL-V1.md
 *
 *   기존:  Content → POP 생성 → PDF → 끝
 *   V2:    Content → POP Document(저장·수정·복제·보관) → Renderer → PDF / PNG
 *
 * 서비스(KPA / PH)는 이 계약의 `PopV2Api` 만 주입한다. 화면 본체는 복제하지 않는다.
 */

export type PopV2Kind = 'product' | 'content';

export type PopV2ContentType =
  | 'health-info'
  | 'consult'
  | 'seasonal'
  | 'store-guide'
  | 'campaign'
  | 'general';

export type PopV2SourceOrigin =
  | 'direct'
  | 'snapshot'
  | 'library'
  | 'local'
  | 'store_pop'
  | 'spd'
  | 'listing';

export type PopV2Status = 'draft' | 'ready' | 'archived';
export type PopV2Layout = 'A4' | 'A5';
export type PopV2Format = 'pdf' | 'png';

export interface PopV2Source {
  origin: PopV2SourceOrigin;
  id: string;
  title: string;
}

export interface PopV2Fields {
  title: string;
  bullets: string[];
  shortText: string;
  longText: string;
  imageUrl: string | null;
}

export interface PopV2Document {
  id: string;
  organizationId: string;
  serviceKey: string;
  title: string;
  popKind: PopV2Kind;
  contentType: PopV2ContentType | null;
  sources: PopV2Source[];
  fields: PopV2Fields;
  templateId: string;
  layout: PopV2Layout;
  qrCodeId: string | null;
  status: PopV2Status;
  lastOutputAssetId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 저장 요청 본문 — 서버 `PopV2DocumentInput` 과 1:1 */
export interface PopV2DocumentInput {
  title: string;
  popKind: PopV2Kind;
  contentType?: PopV2ContentType | null;
  sources: PopV2Source[];
  fields: PopV2Fields;
  templateId: string;
  layout: PopV2Layout;
  qrCodeId?: string | null;
  status?: PopV2Status;
}

/** 일반 "내 매장 콘텐츠" 후보 */
export interface PopV2ContentCandidate {
  origin: PopV2SourceOrigin;
  id: string;
  title: string;
  excerpt: string | null;
  updatedAt: string;
}

export type PopV2ResolvedFrom =
  | 'product-linked-content'
  | 'store-canonical-description'
  | 'product-basic-info'
  | 'store-content';

export interface PopV2ResolvedSource {
  sources: PopV2Source[];
  fields: PopV2Fields;
  /** 어떤 축에서 기본 콘텐츠를 가져왔는지 — 화면에 그대로 표시해 사용자가 출처를 알 수 있게 한다. */
  resolvedFrom: PopV2ResolvedFrom;
}

export interface PopV2RenderResult {
  format: PopV2Format;
  fileUrl: string;
  fileName: string;
  assetId: string;
}

export interface PopV2ProductOption {
  sourceType: 'listing' | 'local';
  id: string;
  title: string;
  subtitle?: string | null;
}

/** 서비스별 주입 — 여기서만 endpoint 가 갈린다. */
export interface PopV2Api {
  list: (status?: PopV2Status | 'all') => Promise<PopV2Document[]>;
  get: (id: string) => Promise<PopV2Document>;
  create: (input: PopV2DocumentInput) => Promise<PopV2Document>;
  update: (id: string, input: PopV2DocumentInput) => Promise<PopV2Document>;
  duplicate: (id: string) => Promise<PopV2Document>;
  setArchived: (id: string, archived: boolean) => Promise<PopV2Document>;
  render: (id: string, format: PopV2Format) => Promise<PopV2RenderResult>;
  /** 상품 기반 POP 의 기본 콘텐츠 결정 (product-linked → STORE canonical → 기본정보) */
  resolveProductSource: (
    productId: string,
    sourceType: 'listing' | 'local',
  ) => Promise<PopV2ResolvedSource>;
  /** 일반 내 매장 콘텐츠 후보 */
  listContentSources: () => Promise<PopV2ContentCandidate[]>;
  /** 선택한 콘텐츠 1건 → POP 필드 초안 */
  resolveContentSource: (origin: PopV2SourceOrigin, id: string) => Promise<PopV2ResolvedSource>;
  /** 상품 선택 후보 (서비스별 상품 원장이 달라 주입한다) */
  listProductOptions?: () => Promise<PopV2ProductOption[]>;
  /** QR 선택 후보 */
  listQrCodes: () => Promise<Array<{ id: string; title: string }>>;
}

export interface PopV2Notify {
  success: (msg: string) => void;
  error: (msg: string) => void;
}

export interface PopV2AccentTheme {
  color: string;
  softBg: string;
}

export interface PopV2TemplateOption {
  id: string;
  label: string;
  desc: string;
}

export const POP_V2_CONTENT_TYPE_LABELS: Record<PopV2ContentType, string> = {
  'health-info': '건강정보',
  consult: '상담 안내',
  seasonal: '계절 안내',
  'store-guide': '매장 안내',
  campaign: '캠페인',
  general: '일반 내 매장 콘텐츠',
};

export const POP_V2_RESOLVED_FROM_LABELS: Record<PopV2ResolvedFrom, string> = {
  'product-linked-content': '이 상품에 연결된 매장 콘텐츠',
  'store-canonical-description': '매장용 설명서(STORE canonical)',
  'product-basic-info': '상품 기본정보',
  'store-content': '내 매장 콘텐츠',
};

export const POP_V2_STATUS_LABELS: Record<PopV2Status, string> = {
  draft: '작성 중',
  ready: '출력 완료',
  archived: '보관됨',
};
