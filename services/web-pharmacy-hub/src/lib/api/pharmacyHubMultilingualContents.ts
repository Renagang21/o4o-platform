/**
 * Pharmacy-Hub 다국어 상품 콘텐츠 API 클라이언트 (매장 경영자)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8 (#76)
 *
 * 계약은 KPA / GlycoPharm / K-Cosmetics 와 **동일한 공통 controller**
 * (routes/o4o-store/controllers/multilingual-product-content.controller.ts) 다:
 *   GET    /pharmacy-hub/pharmacy/multilingual-product-contents            내 매장 그룹 목록
 *   GET    /pharmacy-hub/pharmacy/multilingual-product-contents/summary    상품별 요약(배지)
 *   POST   /pharmacy-hub/pharmacy/multilingual-product-contents            그룹 upsert (store_created)
 *   GET    /pharmacy-hub/pharmacy/multilingual-product-contents/:id        편집용 상세
 *   PUT    /pharmacy-hub/pharmacy/multilingual-product-contents/:id/pages/:locale
 *   PATCH  /pharmacy-hub/pharmacy/multilingual-product-contents/:id/pages/:locale/status
 *   POST   /pharmacy-hub/pharmacy/multilingual-product-contents/:id/public-key
 *   GET    /pharmacy-hub/pharmacy/multilingual-product-contents/:id/qr
 *   GET    /pharmacy-hub/public/multilingual-product-contents/:publicKey   (비인증 랜딩)
 *
 * 원장 = 공통 store_multilingual_product_content_groups/pages (organization_id 축).
 * HUB 탐색(/hub)·가져오기(/import)는 PH 에 운영자 원본이 없어 항상 0건이므로 노출하지 않는다
 * (매장허브 운영자 개입 부재 = #85·#86 INTENTIONAL_DIFFERENCE).
 */
import { api, API_BASE_URL } from '../apiClient';

const BASE = '/pharmacy-hub/pharmacy/multilingual-product-contents';

export type MlcLocale = 'ko' | 'en' | 'zh' | 'ja' | 'vi' | 'th' | 'id';
export type MlcTargetKind = 'local' | 'listing';
export type MlcStatus = 'draft' | 'published' | 'archived';
export type MlcContentFormat = 'blocks' | 'html' | 'image_sequence' | 'json';

export const MLC_LOCALES: MlcLocale[] = ['ko', 'en', 'zh', 'ja', 'vi', 'th', 'id'];
export const MLC_LOCALE_LABELS: Record<MlcLocale, string> = {
  ko: '한국어',
  en: 'English',
  zh: '中文',
  ja: '日本語',
  vi: 'Tiếng Việt',
  th: 'ภาษาไทย',
  id: 'Bahasa',
};

export interface MlcPage {
  id: string;
  groupId: string;
  locale: MlcLocale;
  title: string;
  summary?: string | null;
  contentFormat: string;
  status: MlcStatus;
  isDefault: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface MlcPageDetail extends MlcPage {
  content: Record<string, unknown>;
  assets: Array<Record<string, unknown>>;
  buttons: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

export interface MlcGroup {
  id: string;
  organizationId: string;
  serviceKey?: string | null;
  targetKind: MlcTargetKind;
  targetId: string;
  contentKey: string;
  title: string;
  defaultLocale: MlcLocale;
  sourceType: string;
  sourceRefId?: string | null;
  status: MlcStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  pages: MlcPage[];
}

export interface MlcGroupDetail extends Omit<MlcGroup, 'pages'> {
  pages: MlcPageDetail[];
}

export interface MlcCreateGroupInput {
  targetKind: MlcTargetKind;
  targetId: string;
  title: string;
  defaultLocale?: MlcLocale;
  contentKey?: string;
}

export interface MlcPageInput {
  title: string;
  summary?: string;
  contentFormat?: MlcContentFormat;
  content?: Record<string, unknown>;
  status?: MlcStatus;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface MlcSummaryItem {
  groupId: string;
  targetKind: MlcTargetKind;
  targetId: string;
  title: string;
  status: MlcStatus;
  sourceType: string;
  defaultLocale: MlcLocale;
  updatedAt: string;
  locales: MlcLocale[];
  localeCount: number;
  publishedLocaleCount: number;
}

/** 내 매장 다국어 콘텐츠 목록 */
export async function listMyMlcGroups(params?: {
  targetKind?: MlcTargetKind;
  targetId?: string;
  includeArchived?: boolean;
}): Promise<MlcGroup[]> {
  const res = await api.get(BASE, { params });
  return res.data?.data ?? [];
}

/** targetId → 요약 매핑 (목록 배지용, N+1 없이) */
export async function getMlcSummaryMap(targetKind: MlcTargetKind): Promise<Map<string, MlcSummaryItem>> {
  const res = await api.get(`${BASE}/summary`, { params: { targetKind } });
  const items: MlcSummaryItem[] = res.data?.data ?? [];
  const map = new Map<string, MlcSummaryItem>();
  for (const item of items) {
    if (item?.targetId) map.set(item.targetId, item);
  }
  return map;
}

/** 단건 그룹 조회 (초안 본문까지 hydrate) */
export async function getMlcGroup(groupId: string): Promise<MlcGroupDetail> {
  const res = await api.get(`${BASE}/${encodeURIComponent(groupId)}`);
  return res.data?.data;
}

/** 그룹 생성/갱신 (target+contentKey upsert, source_type='store_created') */
export async function createMlcGroup(input: MlcCreateGroupInput): Promise<MlcGroupDetail> {
  const res = await api.post(BASE, { sourceType: 'store_created', ...input });
  return res.data?.data;
}

/** 언어별 page upsert */
export async function upsertMlcPage(
  groupId: string,
  locale: MlcLocale,
  input: MlcPageInput,
): Promise<MlcGroupDetail> {
  const res = await api.put(
    `${BASE}/${encodeURIComponent(groupId)}/pages/${encodeURIComponent(locale)}`,
    input,
  );
  return res.data?.data;
}

/** 언어별 page 발행/초안 토글 */
export async function setMlcPageStatus(
  groupId: string,
  locale: MlcLocale,
  status: MlcStatus,
): Promise<MlcGroupDetail> {
  const res = await api.patch(
    `${BASE}/${encodeURIComponent(groupId)}/pages/${encodeURIComponent(locale)}/status`,
    { status },
  );
  return res.data?.data;
}

/** 언어 fallback resolve (매장 자가 검증) */
export async function resolveMlc(
  groupId: string,
  locale: MlcLocale,
): Promise<{ group: MlcGroup; page: any; requestedLocale: MlcLocale | null }> {
  const res = await api.get(`${BASE}/${encodeURIComponent(groupId)}/resolve`, { params: { locale } });
  return res.data?.data;
}

/** public/QR 키 발급 (idempotent) */
export async function ensureMlcPublicKey(groupId: string): Promise<{ publicKey: string; url: string }> {
  const res = await api.post(`${BASE}/${encodeURIComponent(groupId)}/public-key`);
  return res.data?.data;
}

/** landing URL + QR SVG (백엔드 생성 — 프론트 QR 의존성 없음) */
export async function getMlcQr(groupId: string): Promise<{ publicKey: string; url: string; svg: string }> {
  const res = await api.get(`${BASE}/${encodeURIComponent(groupId)}/qr`);
  return res.data?.data;
}

export interface PublicMlcPage {
  locale: MlcLocale;
  title: string;
  summary?: string | null;
  contentFormat: string;
  content: Record<string, unknown>;
  assets: Array<Record<string, unknown>>;
  buttons: Array<Record<string, unknown>>;
  updatedAt: string;
}

export interface PublicMlcResolve {
  title: string;
  targetKind: MlcTargetKind;
  contentKey: string;
  defaultLocale: MlcLocale;
  requestedLocale: MlcLocale | null;
  resolvedLocale: MlcLocale | null;
  fallbackUsed: boolean;
  availableLocales: MlcLocale[];
  page: PublicMlcPage | null;
}

/**
 * 비인증 public landing resolve (고객용).
 * axios 인스턴스는 인증 인터셉터를 태우므로, 고객 랜딩은 순수 fetch 로 호출한다.
 */
export async function resolvePublicMlc(publicKey: string, locale?: MlcLocale): Promise<PublicMlcResolve> {
  const qs = locale ? `?locale=${encodeURIComponent(locale)}` : '';
  const res = await fetch(
    `${API_BASE_URL}/api/v1/pharmacy-hub/public/multilingual-product-contents/${encodeURIComponent(publicKey)}${qs}`,
  );
  const json = await res.json().catch(() => ({}) as any);
  if (!res.ok || !json.success) {
    const err: any = new Error(json.error || `요청에 실패했습니다 (${res.status})`);
    err.status = res.status;
    err.code = json.code;
    throw err;
  }
  return json.data;
}
