/**
 * POP 제작(Composer) 공통 타입 — WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1
 *
 * K-Cosmetics / GlycoPharm 의 `StorePopPage` 가 각자 갖고 있던 동일 타입을 단일 정의로 모은다.
 * 백엔드 계약(POST /{svc}/pharmacy/pop/generate)은 변경하지 않는다 — payload 필드명 그대로다.
 */

/** 공급자 자료 (GET /{svc}/pharmacy/pop/source/supplier-items) */
export interface PopSupplierItem {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  mimeType?: string | null;
  category: string | null;
  supplierId: string;
}

/** 매장 자체 상품(store_local_products) POP 입력 — 화면 표시용 정규화 결과 */
export interface PopLocalProductItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
}

/** 서비스 localProduct API 의 원본 응답(필드 표기가 서비스마다 섞여 있어 느슨하게 받는다) */
export interface PopLocalProductRaw {
  id: string;
  name: string;
  summary?: string | null;
  description?: string | null;
  detail_html?: string | null;
  detailHtml?: string | null;
  thumbnail_url?: string | null;
  images?: string[] | null;
}

/** 가져온 POP 문구 (prefill 경로에서만 설정된다 — 페이지형 AI 생성 진입 없음) */
export interface PopAiContent {
  title: string;
  bullets: string[];
  shortText: string;
  longText: string;
}

export type PopLayout = 'A4' | 'A5';

export interface PopTemplateOption {
  id: string;
  label: string;
  desc: string;
}

export interface PopQrOption {
  id: string;
  title: string;
  landingType?: string;
  slug?: string;
}

/** POP 생성 payload — 기존 백엔드 계약 그대로 */
export interface PopGeneratePayload {
  supplierItemIds?: string[];
  localProductItemIds?: string[];
  layout: PopLayout;
  templateId: string;
  aiContent?: PopAiContent;
  qrId?: string;
  save?: boolean;
  title?: string;
}

/** 서비스 accent(테마) — 인라인 스타일 하드코딩 대신 주입한다 */
export interface PopAccentTheme {
  /** 강조 색 (K-Cosmetics `#db2777` / GlycoPharm `#ea580c`) */
  color: string;
  /** 선택 상태 배경 (K-Cosmetics `#fdf2f8` / GlycoPharm `#fff7ed`) */
  softBg: string;
}

/** 서비스별 문구 (매장 ↔ 약국) */
export interface PopComposerLabels {
  headerTitle: string;
  headerDescription: string;
  storeMissingError: string;
  saveContentSuccess: string;
  saveContentButtonTitle: string;
  saveContentSectionComment: string;
}

/** 서비스가 주입하는 API 어댑터 — endpoint / 인증 / prefix 는 전부 서비스 소유 */
export interface PopComposerApi {
  fetchSupplierItems: () => Promise<PopSupplierItem[]>;
  fetchLocalProduct: (id: string) => Promise<PopLocalProductRaw>;
  fetchQrCodes: () => Promise<PopQrOption[]>;
  /** 서비스 endpoint 로 POST 하고 raw Response 를 그대로 돌려준다(blob/json 분기는 공통) */
  generate: (payload: PopGeneratePayload) => Promise<Response>;
  getStoreSlug: () => Promise<string | null>;
  createPopContent: (
    slug: string,
    body: { title: string; content?: string; excerpt?: string },
  ) => Promise<unknown>;
}

export interface PopComposerNotify {
  success: (message: string) => void;
  error: (message: string) => void;
}
