/**
 * O4O Product DB API (read-only)
 *
 * WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1
 *
 * 정부/공공데이터 기반 기본 상품 DB(read-only) admin 조회 client.
 * - ProductCandidate: GET /operator/product-candidates (+ :id)
 * - ProductMaster   : GET /neture/products/library/search (+ /:id)
 *
 * 원칙: read-only. 어떤 mutation endpoint 도 여기서 호출하지 않는다.
 * 검증 근거:
 *  - 후보 API 는 platform admin 에게 all=true 또는 serviceKey 를 요구한다
 *    (utils/serviceScope.ts resolveOperatorScope). platform 전역 조회를 위해 all=true 기본 전송.
 *  - 후보 목록 응답은 { success, data: { items, total } } — meta/page 없음.
 *  - master 검색 응답은 { success, data, meta{page,limit,total,totalPages} } — meta 사용.
 */

import { authClient } from '@o4o/auth-client';

// ─── ProductCandidate ──────────────────────────────────────────────────────

export interface ProductCandidateRow {
  id: string;
  serviceKey: string | null;
  organizationId: string | null;
  sourceType: string;
  sourceLabel: string | null;
  candidateStatus: string;
  /** 등록(승격) 결과로 연결된 O4O 상품 ID — 사전 매칭 아님 */
  matchedProductMasterId: string | null;
  identifierType: string | null;
  identifierValue: string | null;
  candidateName: string | null;
  candidateBrand: string | null;
  candidateManufacturer: string | null;
  candidateCategory: string | null;
  candidateSpec: string | null;
  candidateUnit: string | null;
  candidateImageUrl: string | null;
  candidatePrice: string | null;
  rawPayload: Record<string, unknown> | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCandidateListParams {
  /** 원시 status 단건 필터 (내부/호환용). 일반 UI 는 groupedStatus 사용. */
  status?: string;
  /**
   * 화면용 그룹 상태: pending | review_required | registered | rejected.
   * WO-O4O-ADMIN-PRODUCT-CANDIDATE-STATUS-SIMPLIFY-V2.
   */
  groupedStatus?: string;
  sourceType?: string;
  /** 공공 seed 라벨 정확일치 (예: MFDS_HEALTH_FUNCTIONAL_FOOD) */
  sourceLabel?: string;
  /** 후보명/제조사/식별자(STTEMNT_NO 등) 부분검색 */
  search?: string;
  serviceKey?: string;
  page?: number;
  limit?: number;
}

export interface ProductCandidateListResult {
  items: ProductCandidateRow[];
  total: number;
}

/**
 * 후보 목록. platform admin 전역 조회를 위해 all=true 를 기본 전송한다.
 * serviceKey 를 지정하면 단일 서비스 스코프로 좁힌다 (all 대신 serviceKey 우선).
 */
export async function listProductCandidates(
  params: ProductCandidateListParams = {},
): Promise<ProductCandidateListResult> {
  const query: Record<string, string> = {};
  if (params.serviceKey) {
    query.serviceKey = params.serviceKey;
  } else {
    query.all = 'true'; // platform cross-service opt-in (감사 로그 기록됨)
  }
  if (params.status) query.status = params.status;
  if (params.groupedStatus) query.groupedStatus = params.groupedStatus;
  if (params.sourceType) query.sourceType = params.sourceType;
  if (params.sourceLabel?.trim()) query.sourceLabel = params.sourceLabel.trim();
  if (params.search?.trim()) query.search = params.search.trim();
  query.page = String(params.page ?? 1);
  query.limit = String(params.limit ?? 20);

  const res = await authClient.api.get<{
    success: boolean;
    data: { items: ProductCandidateRow[]; total: number };
  }>(`/operator/product-candidates?${new URLSearchParams(query).toString()}`);

  return {
    items: res.data?.data?.items ?? [],
    total: res.data?.data?.total ?? 0,
  };
}

export async function getProductCandidate(id: string): Promise<ProductCandidateRow | null> {
  const res = await authClient.api.get<{ success: boolean; data: ProductCandidateRow }>(
    `/operator/product-candidates/${encodeURIComponent(id)}`,
  );
  return res.data?.data ?? null;
}

// ─── Candidate 상세 보조 정보 ─────
// WO-O4O-PUBLIC-DATA-CANDIDATE-LEGACY-MASTER-MATCHING-REMOVAL-V1:
//   사전 매칭(conflictingCandidates/possibleMasters·manualMatchCandidate) 제거.
//   상세는 원천 식별자 + 승격 가능 여부 + rawPayload 요약만 제공한다.

export interface CandidateConflictInfo {
  candidate: ProductCandidateRow;
  /** 신규 ProductMaster 등록(승격) 가능 여부 (drug 소스만 eligible) */
  promotable?: { eligible: boolean; reason: string | null };
  conflictKey: { identifierType: string | null; identifierValue: string | null; normalizedIdentifierValue: string | null };
  rawPayloadSummary: Record<string, unknown>;
}

/** 후보 상세 보조 정보 조회 (read-only). */
export async function getCandidateConflictInfo(id: string): Promise<CandidateConflictInfo> {
  const res = await authClient.api.get<{ success: boolean; data: CandidateConflictInfo }>(
    `/operator/product-candidates/${encodeURIComponent(id)}/conflict-info`,
  );
  return res.data.data;
}

export type CandidateBulkAction = 'archive' | 'ignore' | 'manual_review';

/** 선택 후보 일괄 상태 처리 (archive/ignore/manual_review). hard delete 없음. */
export async function bulkCandidateAction(ids: string[], action: CandidateBulkAction): Promise<{ updated: number; status: string }> {
  const res = await authClient.api.post<{ success: boolean; data: { updated: number; status: string } }>(
    `/operator/product-candidates/bulk-action`,
    { ids, action },
  );
  return res.data.data;
}

export interface PromoteMasterResult {
  outcome: 'create' | 'link' | 'conflict' | 'skip';
  masterId?: string;
  skipReason?: string;
  conflictReason?: string;
}

/** 후보를 신규 ProductMaster 로 승격 (drug 소스만, 1건). approveAsNewProductMaster(TX+dedup) 재사용. */
export async function promoteCandidateToMaster(id: string): Promise<PromoteMasterResult> {
  const res = await authClient.api.post<{ success: boolean; data: PromoteMasterResult }>(
    `/operator/product-candidates/${encodeURIComponent(id)}/promote-master`,
    {},
  );
  return res.data.data;
}

// ─── ProductMaster ─────────────────────────────────────────────────────────

/** 상품 이용 상태 — WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1 */
export type ProductMasterStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

/** 목록 상태 필터값 (관리자 목록 전용) */
export type ProductMasterStatusFilter = 'all' | 'active' | 'suspended' | 'archived';

export const PRODUCT_MASTER_STATUS_LABEL: Record<ProductMasterStatus, string> = {
  ACTIVE: '정상',
  SUSPENDED: '이용 중단',
  ARCHIVED: '보관',
};

export interface ProductMasterRow {
  id: string;
  barcode: string | null;
  name: string;
  regulatoryName: string;
  manufacturerName: string;
  specification: string | null;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  primaryImageUrl: string | null;
  /** 이용 상태(관리자 배지용). 구버전 응답 대비 optional — 없으면 ACTIVE 로 간주. */
  status?: ProductMasterStatus;
}

export interface ProductMasterListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductMasterListResult {
  items: ProductMasterRow[];
  meta: ProductMasterListMeta;
}

export interface ProductMasterListParams {
  q?: string;
  page?: number;
  limit?: number;
  /** 관리자 상태 필터. 'active'/미전달 → ACTIVE-only. 'all'/'suspended'/'archived' 는 관리자 롤에서만 유효. */
  status?: ProductMasterStatusFilter;
}

/**
 * 기본 상품(ProductMaster) 목록/검색.
 * 검증: 빈 q 는 전체 목록(이름순)을 반환하므로 검색어 없이도 브라우징 가능.
 * (admin 전용 목록 helper — 기존 searchProductMaster 는 빈 q 를 차단하므로 별도 함수.)
 */
export async function listProductMasters(
  params: ProductMasterListParams = {},
): Promise<ProductMasterListResult> {
  const query: Record<string, string> = {};
  if (params.q?.trim()) query.q = params.q.trim();
  query.page = String(params.page ?? 1);
  query.limit = String(params.limit ?? 20);
  // 상태 필터 — 'all'/'active' 이 아닐 때만 전달. 관리자 목록에서 전체/특정 상태 조회.
  if (params.status && params.status !== 'active') query.status = params.status;

  const res = await authClient.api.get<{
    success: boolean;
    data: ProductMasterRow[];
    meta: ProductMasterListMeta;
  }>(`/neture/products/library/search?${new URLSearchParams(query).toString()}`);

  return {
    items: res.data?.data ?? [],
    meta: res.data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

export interface ProductMasterImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
  type: string;
}

/** WO-O4O-DRUG-CANONICAL-DESCRIPTION-OUTPUT-LINK-V1: 공식 canonical 설명(status='canonical') */
export interface CanonicalDescription {
  id: string;
  sourceType: string;
  sourceRefId: string | null;
  content: string;
  summary: string | null;
  status: string;
  isCanonical: boolean;
  curatedAt: string | null;
  updatedAt: string;
}

// ── WO-O4O-ADMIN-O4O-PRODUCT-MASTER-DETAIL-GET-ENRICHMENT-V1: 상세 enrichment (read-only) ──

export interface ProductIdentifierSummary {
  id: string;
  type: string;
  value: string;
  normalizedValue: string | null;
  sourceType: string | null;
  sourceRefId: string | null;
  sourceLabel: string | null;
  isPrimary: boolean;
  verificationStatus: string | null;
  createdAt: string | null;
}

export interface ProductDescriptionSummary {
  id: string;
  status: string;
  sourceType: string;
  language: string | null;
  summary: string | null;
  contentPreview: string | null;
  qualityScore: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProductSourceLinkSummary {
  candidateId: string | null;
  sourceType: string;
  sourceLabel: string | null;
  candidateName: string | null;
  candidateManufacturer: string | null;
  candidateStatus: string | null;
  matchStatus: string | null;
  createdAt: string | null;
}

export interface ProductUsageSummary {
  organizationListingCount: number;
  storeLocalProductCount: number;
}

export interface ProductMasterDetail {
  id: string;
  barcode: string | null;
  regulatoryType: string;
  regulatoryName: string;
  name: string;
  /** 이용 상태(현재 상태 배지 + 상태 변경 액션용). 구버전 응답 대비 optional. */
  status?: ProductMasterStatus;
  manufacturerName: string;
  brandName: string | null;
  specification: string | null;
  originCountry: string | null;
  tags: string[];
  isMfdsVerified: boolean;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  images: ProductMasterImage[];
  /** 공식 소비자 설명 (없으면 null). 매장용 AI 설명과 구분. */
  canonicalDescription: CanonicalDescription | null;
  /** 상세 enrichment (additive, read-only). 구버전 API 응답에는 없을 수 있어 optional. */
  identifiers?: ProductIdentifierSummary[];
  descriptions?: ProductDescriptionSummary[];
  sourceLinks?: ProductSourceLinkSummary[];
  usageSummary?: ProductUsageSummary;
  createdAt: string;
}

export async function getProductMaster(id: string): Promise<ProductMasterDetail | null> {
  const res = await authClient.api.get<{ success: boolean; data: ProductMasterDetail }>(
    `/neture/products/library/${encodeURIComponent(id)}`,
  );
  return res.data?.data ?? null;
}

// ─── ProductMaster 상태 변경 (WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1) ──
// PATCH /admin/o4o-product-db/masters/:id/status — ACTIVE | SUSPENDED | ARCHIVED + 사유.
// product_masters.status 만 변경하고 변경 이력을 관리 메모(작업 이력)에 기록. 사용처 무변경.

export interface ProductMasterStatusChangeResult {
  id: string;
  previousStatus: ProductMasterStatus;
  status: ProductMasterStatus;
  changed: boolean;
}

export async function setProductMasterStatus(
  id: string,
  status: ProductMasterStatus,
  reason?: string,
): Promise<ProductMasterStatusChangeResult> {
  const res = await authClient.api.patch<{ success: boolean; data: ProductMasterStatusChangeResult }>(
    `/admin/o4o-product-db/masters/${encodeURIComponent(id)}/status`,
    { status, reason: reason?.trim() || undefined },
  );
  return res.data.data;
}

// ─── ProductMaster 수동 등록 (WO-O4O-ADMIN-PRODUCT-MASTER-MANUAL-REGISTRATION-UI-V1) ──
// POST /admin/o4o-product-db/masters. barcode 선택 — 없으면 barcode=NULL 로 등록(합성 내부코드 생성 안 함).
// 정체성 = ProductMaster.id(UUID). WO-O4O-PRODUCT-BARCODE-NULLABLE-AND-INTERNAL-CODE-GENERATION-STOP-V1

export interface CreateProductMasterInput {
  name: string;
  manufacturerName?: string;
  barcode?: string;
  regulatoryType?: string;
  regulatoryName?: string;
  mfdsPermitNumber?: string;
  specification?: string;
  originCountry?: string;
  tags?: string[];
}

export interface CreatedProductMaster {
  id: string;
  name: string;
  barcode: string | null;
}

export async function createProductMaster(input: CreateProductMasterInput): Promise<CreatedProductMaster> {
  const res = await authClient.api.post<{ success: boolean; data: CreatedProductMaster }>(
    '/admin/o4o-product-db/masters',
    input,
  );
  const data = res.data?.data;
  if (!data?.id) {
    throw new Error('등록 응답이 올바르지 않습니다');
  }
  return data;
}

// ─── Product Usage Links (master 활용 연결, read-only) ────────────────────────
// WO-O4O-ADMIN-O4O-PRODUCT-USAGE-LINKS-READONLY-V1
// mount: GET /api/v1/admin/o4o-product-db/masters/:id/usage-links

export interface UsageOrganizationListing {
  id: string;
  organizationId: string;
  organizationName: string | null;
  serviceKey: string | null;
  status: string | null;
  sourceType: string | null;
  price: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UsageStoreLocalProduct {
  id: string;
  organizationId: string;
  organizationName: string | null;
  displayName: string | null;
  price: number | null;
  isActive: boolean | null;
  thumbnailUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UsageContentLink {
  linkId: string;
  productSourceType: string;
  contentId: string;
  title: string | null;
  contentSourceType: string | null;
  workspaceStatus: string | null;
  shareStatus: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProductUsageLinks {
  masterId: string;
  barcode: string | null;
  summary: {
    organizationListingCount: number;
    storeLocalProductCount: number;
    contentLinkCount: number;
  };
  organizationListings: UsageOrganizationListing[];
  storeLocalProducts: UsageStoreLocalProduct[];
  contentLinks: UsageContentLink[];
  notMapped: string[];
}

export async function getProductUsageLinks(id: string): Promise<ProductUsageLinks | null> {
  const res = await authClient.api.get<{ success: boolean; data: ProductUsageLinks }>(
    `/admin/o4o-product-db/masters/${id}/usage-links`,
  );
  return res.data?.data ?? null;
}

// ─── Image Quality (master 이미지 상태, read-only) ───────────────────────────
// WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-QUALITY-SHELL-V1

export type ImageStatus = 'has_representative_image' | 'has_images_no_representative' | 'missing_image';

export interface ImageQualityRow {
  masterId: string;
  productName: string;
  manufacturerName: string | null;
  regulatoryType: string | null;
  barcode: string | null;
  imageCount: number;
  hasRepresentative: boolean;
  thumbnailUrl: string | null;
  thumbnailType: string | null;
  imageStatus: ImageStatus;
  imageUpdatedAt: string | null;
}

export interface ImageQualityListParams {
  imageStatus?: string;
  regulatoryType?: string;
  hasRepresentative?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ImageQualityListResult {
  items: ImageQualityRow[];
  meta: ProductMasterListMeta;
}

export async function listImageQuality(params: ImageQualityListParams = {}): Promise<ImageQualityListResult> {
  const query: Record<string, string> = {};
  if (params.imageStatus) query.imageStatus = params.imageStatus;
  if (params.regulatoryType) query.regulatoryType = params.regulatoryType;
  if (params.hasRepresentative !== undefined) query.hasRepresentative = String(params.hasRepresentative);
  if (params.q?.trim()) query.q = params.q.trim();
  query.page = String(params.page ?? 1);
  query.limit = String(params.limit ?? 20);

  const res = await authClient.api.get<{
    success: boolean;
    data: ImageQualityRow[];
    meta: ProductMasterListMeta;
  }>(`/admin/o4o-product-db/image-quality?${new URLSearchParams(query).toString()}`);

  return {
    items: res.data?.data ?? [],
    meta: res.data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

export async function getImageQualitySummary(): Promise<Record<string, number>> {
  const res = await authClient.api.get<{ success: boolean; data: Record<string, number> }>(
    `/admin/o4o-product-db/image-quality/summary`,
  );
  return res.data?.data ?? {};
}

// ─── Product Master Notes (내부 운영 메모, 첫 write) ──────────────────────────
// WO-O4O-ADMIN-O4O-PRODUCT-MASTER-NOTE-V1

export interface ProductMasterNote {
  id: string;
  productMasterId: string;
  note: string;
  visibility: string;
  createdBy: string;
  createdByName: string | null;
  createdAt: string;
}

export async function listProductMasterNotes(id: string): Promise<ProductMasterNote[]> {
  const res = await authClient.api.get<{ success: boolean; data: ProductMasterNote[] }>(
    `/admin/o4o-product-db/masters/${id}/notes`,
  );
  return res.data?.data ?? [];
}

export async function addProductMasterNote(id: string, note: string): Promise<ProductMasterNote | null> {
  const res = await authClient.api.post<{ success: boolean; data: ProductMasterNote }>(
    `/admin/o4o-product-db/masters/${id}/notes`,
    { note },
  );
  return res.data?.data ?? null;
}

export async function deleteProductMasterNote(id: string, noteId: string): Promise<void> {
  await authClient.api.delete(`/admin/o4o-product-db/masters/${id}/notes/${noteId}`);
}

// ─── 매장용(STORE) 상세설명서 저작 — 관리자 직접 등록 (진입점 4) ──
// IR-O4O-PRODUCT-REGISTRATION-MODULE-UNIFIED-V1 §5
// mount: /admin/o4o-product-db/masters/:id/store-descriptions
export interface ProductMasterStoreDescription {
  id: string;
  language: string;
  status: string;
  summary: string | null;
  content: string | null;
  updatedAt: string;
}

export async function listProductMasterStoreDescriptions(id: string): Promise<ProductMasterStoreDescription[]> {
  const res = await authClient.api.get<{ success: boolean; data: { items: ProductMasterStoreDescription[] } }>(
    `/admin/o4o-product-db/masters/${id}/store-descriptions`,
  );
  return res.data?.data?.items ?? [];
}

export async function saveProductMasterStoreDescription(
  id: string,
  input: { content: string; summary?: string | null; language?: string },
): Promise<{ id: string; status: string; language: string } | null> {
  const res = await authClient.api.post<{ success: boolean; data: { id: string; status: string; language: string } }>(
    `/admin/o4o-product-db/masters/${id}/store-descriptions`,
    { content: input.content, summary: input.summary ?? null, language: input.language ?? 'ko' },
  );
  return res.data?.data ?? null;
}

// ─── Product Master Audit Log (작업 이력, read-only) ─────────────────────────
// WO-O4O-ADMIN-O4O-PRODUCT-MASTER-AUDIT-LOG-VIEW-V1

export interface AuditLogItem {
  id: string;
  source: 'product_master_notes' | 'shared_product_descriptions' | 'image' | 'audit_log';
  action:
    | 'note_created'
    | 'note_hidden'
    | 'description_curated'
    | 'image_added'
    | 'image_primary_changed'
    | 'image_hidden'
    | 'image_restored';
  summary: string;
  actorId: string | null;
  actorName: string | null;
  occurredAt: string;
}

export interface AuditLogGap {
  area: string;
  reason: string;
}

export interface ProductMasterAuditLog {
  masterId: string;
  items: AuditLogItem[];
  gaps: AuditLogGap[];
}

export async function getProductMasterAuditLog(id: string): Promise<ProductMasterAuditLog | null> {
  const res = await authClient.api.get<{ success: boolean; data: ProductMasterAuditLog }>(
    `/admin/o4o-product-db/masters/${id}/audit-logs`,
  );
  return res.data?.data ?? null;
}

// ─── Product Master Image actions (admin write, Phase 1) ─────────────────────
// WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-ACTION-V1
// mount: POST /api/v1/admin/o4o-product-db/masters/:id/images (+ /:imageId/set-primary)

export interface ProductMasterImageAdded {
  id: string;
  masterId: string;
  imageUrl: string;
  gcsPath: string;
  isPrimary: boolean;
  source: string | null;
  createdAt: string;
}

/**
 * 이미지 추가 (multipart).
 * authClient.api 인스턴스는 기본 Content-Type: application/json 을 강제하므로,
 * FormData 전송 시 이를 제거해 브라우저가 multipart/form-data + boundary 를 설정하게 한다.
 * (제거하지 않으면 서버 multer 가 body 를 파싱하지 못해 req.file 이 비어 NO_FILE 400)
 */
export async function uploadProductMasterImage(id: string, file: File): Promise<ProductMasterImageAdded | null> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await authClient.api.post<{ success: boolean; data: ProductMasterImageAdded }>(
    `/admin/o4o-product-db/masters/${id}/images`,
    formData,
    // 좁은 AxiosRequestConfig 타입에 transformRequest 가 없어 as any (런타임 axios 는 지원)
    ({
      transformRequest: (data: unknown, headers?: any) => {
        // AxiosHeaders(.delete) / plain object 양쪽 대응 — Content-Type 제거 → 브라우저가 boundary 설정
        if (headers?.delete) headers.delete('Content-Type');
        if (headers) { delete headers['Content-Type']; delete headers['content-type']; }
        return data;
      },
    } as any),
  );
  return res.data?.data ?? null;
}

export interface ProductMasterPrimaryResult {
  id: string;
  masterId: string;
  isPrimary: boolean;
  previousPrimaryImageId: string | null;
}

/** 대표 이미지 지정 */
export async function setProductMasterPrimaryImage(
  id: string,
  imageId: string,
): Promise<ProductMasterPrimaryResult | null> {
  const res = await authClient.api.post<{ success: boolean; data: ProductMasterPrimaryResult }>(
    `/admin/o4o-product-db/masters/${id}/images/${imageId}/set-primary`,
    {},
  );
  return res.data?.data ?? null;
}

// ─── Image soft-delete / restore (admin write, Phase 2) ──────────────────────
// WO-O4O-ADMIN-O4O-PRODUCT-IMAGE-SOFT-DELETE-RESTORE-V1
// 정책: "삭제가 아니라 숨김". GCS 원본 삭제 없음. 숨김 시 대표 자동 해제(승계 없음).

/** admin 이미지 목록 (숨김 포함). 공유 상세(getProductMaster)는 active 만 반환하므로 복원 UI 용 별도 조회. */
export interface ProductMasterImageAdminRow {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  sortOrder: number;
  type: string;
  source: string | null;
  createdAt: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export async function listProductMasterImages(id: string): Promise<ProductMasterImageAdminRow[]> {
  const res = await authClient.api.get<{ success: boolean; data: ProductMasterImageAdminRow[] }>(
    `/admin/o4o-product-db/masters/${id}/images`,
  );
  return res.data?.data ?? [];
}

export interface ProductMasterImageHideResult {
  id: string;
  masterId: string;
  hidden: boolean;
  /** 숨긴 이미지가 대표였는지 */
  wasPrimary: boolean;
  /** 대표 자동 승계된 이미지 id (남은 active 없으면 null) */
  newPrimaryImageId: string | null;
}

/** 이미지 숨김 (soft delete). 대표였으면 대표 해제되고 primaryCleared=true. */
export async function hideProductMasterImage(
  id: string,
  imageId: string,
): Promise<ProductMasterImageHideResult | null> {
  const res = await authClient.api.delete<{ success: boolean; data: ProductMasterImageHideResult }>(
    `/admin/o4o-product-db/masters/${id}/images/${imageId}`,
  );
  return res.data?.data ?? null;
}

/** 숨김 이미지 복원 (대표 자동 지정 없음). */
export async function restoreProductMasterImage(id: string, imageId: string): Promise<void> {
  await authClient.api.post(`/admin/o4o-product-db/masters/${id}/images/${imageId}/restore`, {});
}

// ─── Description/QR Summary (제품 리스트 badge, read-only) ─────────────────────
// WO-O4O-PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1
// mount: GET /api/v1/admin/o4o-product-db/masters/description-qr-summary?ids=uuid,uuid,...
// ko/zh 는 SPD(master-scope) language 기준. QR 은 master↔QR 직접 매핑 부재로 deferred(자리만).

export interface DescriptionLangState {
  exists: boolean;
  status: string | null; // canonical | candidate | null (needs_review 폐지)
  descriptionId: string | null;
}

export interface ProductDescriptionQrSummary {
  masterId: string;
  descriptions: { ko: DescriptionLangState; zh: DescriptionLangState };
  qr: { exists: false; deferred: true };
  needsReview: boolean;
}

/** master id 배열 → masterId 키 맵. 빈 배열이면 요청하지 않음. 최대 100건. */
export async function getProductDescriptionQrSummary(
  masterIds: string[],
): Promise<Record<string, ProductDescriptionQrSummary>> {
  const ids = Array.from(new Set(masterIds.filter(Boolean))).slice(0, 100);
  if (ids.length === 0) return {};
  const res = await authClient.api.get<{
    success: boolean;
    data: Record<string, ProductDescriptionQrSummary>;
  }>(`/admin/o4o-product-db/masters/description-qr-summary?ids=${encodeURIComponent(ids.join(','))}`);
  return res.data?.data ?? {};
}

// ─── Product Landing QR (제품 대표 QR/랜딩, WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1) ──
// mount: GET /api/v1/admin/o4o-product-db/product-landings/by-master/:masterId/qr

export interface ProductLandingQr {
  publicKey: string;
  url: string;   // neture.co.kr/p/{publicKey}
  svg: string;   // QR SVG(동적 생성, 비저장)
  created: boolean;
}

export async function getProductLandingQr(masterId: string, size = 320): Promise<ProductLandingQr> {
  const res = await authClient.api.get<{ success: boolean; data: ProductLandingQr }>(
    `/admin/o4o-product-db/product-landings/by-master/${encodeURIComponent(masterId)}/qr?size=${size}`,
  );
  return res.data.data;
}
