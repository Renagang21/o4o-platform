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
  matchStatus: string;
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
  confidenceScore: string | null;
  rawPayload: Record<string, unknown> | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductCandidateListParams {
  status?: string;
  matchStatus?: string;
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
  if (params.matchStatus) query.matchStatus = params.matchStatus;
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

// ─── ProductMaster ─────────────────────────────────────────────────────────

export interface ProductMasterRow {
  id: string;
  barcode: string;
  name: string;
  regulatoryName: string;
  manufacturerName: string;
  specification: string | null;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  primaryImageUrl: string | null;
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
  barcode: string;
  regulatoryType: string;
  regulatoryName: string;
  name: string;
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

// ─── SharedProductDescription 검토 (WO-O4O-DRUG-SHARED-DESCRIPTION-CANONICAL-CURATION-V1) ──
// mount: /admin/shared-product-descriptions. read-only 목록/상세/dry-run + 단건 setCanonical(PATCH).

export interface DescriptionReviewRow {
  id: string;
  masterId: string;
  sourceType: string;
  status: string;
  language: string | null;
  qualityScore: number | null;
  summary: string | null;
  contentPreview: string | null;
  createdAt: string;
  updatedAt: string;
  masterName: string | null;
  regulatoryName: string | null;
  regulatoryType: string | null;
  manufacturerName: string | null;
  barcode: string | null;
  representativeId: string | null;
  representativeName: string | null;
  mfdsCode: string | null;
  multiManufacturer: boolean | null;
  multiName: boolean | null;
  hasRepresentativeImage: boolean;
}

export interface DescriptionReviewListParams {
  status?: string;
  sourceType?: string;
  regulatoryType?: string;
  language?: string;
  q?: string;
  multiManufacturer?: boolean;
  multiName?: boolean;
  page?: number;
  limit?: number;
}

export interface DescriptionReviewListResult {
  items: DescriptionReviewRow[];
  meta: ProductMasterListMeta;
}

export async function listDescriptionReviews(
  params: DescriptionReviewListParams = {},
): Promise<DescriptionReviewListResult> {
  const query: Record<string, string> = {};
  if (params.status) query.status = params.status;
  if (params.sourceType) query.sourceType = params.sourceType;
  if (params.regulatoryType) query.regulatoryType = params.regulatoryType;
  if (params.language) query.language = params.language;
  if (params.q?.trim()) query.q = params.q.trim();
  if (params.multiManufacturer) query.multiManufacturer = 'true';
  if (params.multiName) query.multiName = 'true';
  query.page = String(params.page ?? 1);
  query.limit = String(params.limit ?? 20);

  const res = await authClient.api.get<{
    success: boolean;
    data: DescriptionReviewRow[];
    meta: ProductMasterListMeta;
  }>(`/admin/shared-product-descriptions?${new URLSearchParams(query).toString()}`);

  return {
    items: res.data?.data ?? [],
    meta: res.data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

export interface DescriptionReviewDetail {
  id: string;
  masterId: string;
  sourceType: string;
  status: string;
  content: string;
  summary: string | null;
  language: string | null;
  curatedBy: string | null;
  curatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  masterName: string | null;
  regulatoryName: string | null;
  manufacturerName: string | null;
  barcode: string | null;
  specification: string | null;
  mfdsProductId: string | null;
  drugCategory: string | null;
  representativeId: string | null;
  representativeName: string | null;
  mfdsCode: string | null;
  reviewFlags: Record<string, unknown> | null;
  thumbnailUrl: string | null;
  identifiers: Array<{ identifierType: string; identifierValue: string; isPrimary: boolean }>;
}

export async function getDescriptionReviewDetail(id: string): Promise<DescriptionReviewDetail | null> {
  const res = await authClient.api.get<{ success: boolean; data: DescriptionReviewDetail }>(
    `/admin/shared-product-descriptions/${encodeURIComponent(id)}/detail`,
  );
  return res.data?.data ?? null;
}

/** 단건 canonical 승격 (기존 setCanonical 재사용 — 같은 master 기존 canonical 강등) */
export async function setDescriptionCanonical(id: string): Promise<DescriptionReviewDetail | null> {
  const res = await authClient.api.patch<{ success: boolean; data: DescriptionReviewDetail }>(
    `/admin/shared-product-descriptions/${encodeURIComponent(id)}/canonical`,
    {},
  );
  return res.data?.data ?? null;
}

/** 상태 변경 (reject=deprecated 등). canonical 은 setDescriptionCanonical 사용 */
export async function setDescriptionStatus(id: string, status: string): Promise<void> {
  await authClient.api.patch(`/admin/shared-product-descriptions/${encodeURIComponent(id)}/status`, { status });
}

export interface BulkCanonicalDryRunResult {
  sourceType: string;
  totalNeedsReview: number;
  eligibleForBulkCanonical: number;
  excludedExistingCanonical: number;
  excludedMultiManufacturer: number;
  excludedEmptyContent: number;
  excludedAmbiguous: number;
  sampleEligible: Array<{ id: string; masterName: string | null; mfdsCode: string | null }>;
}

export async function getBulkCanonicalDryRun(
  sourceType = 'mfds_easy_drug',
): Promise<BulkCanonicalDryRunResult | null> {
  const res = await authClient.api.get<{ success: boolean; data: BulkCanonicalDryRunResult }>(
    `/admin/shared-product-descriptions/bulk-canonical/dry-run?sourceType=${encodeURIComponent(sourceType)}`,
  );
  return res.data?.data ?? null;
}

// ─── ProductCandidate Description Draft (read-only 검토 shell) ────────────────
// WO-O4O-ADMIN-O4O-DRUG-DESCRIPTION-DRAFT-REVIEW-SHELL-V1
// mount: /api/v1/admin/product-candidate-description-drafts (GET only)

export interface DrugDescriptionDraftRow {
  id: string;
  title: string | null;
  sourceLabel: string;
  language: string;
  reviewStatus: string;
  draftType: string;
  groupKey: string | null;
  anchorCandidateId: string;
  verdict: string | null;
  applyRunId: string | null;
  masterTotal: number | null;
  otc: number | null;
  rx: number | null;
  manufacturers: number | null;
  spdMasters: number | null;
  reviewFlags: string[];
  efficacyPreview: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DrugDescriptionDraftListParams {
  sourceLabel?: string;
  applyRunId?: string;
  reviewStatus?: string;
  verdict?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface DrugDescriptionDraftListResult {
  items: DrugDescriptionDraftRow[];
  meta: ProductMasterListMeta;
}

export async function listDrugDescriptionDrafts(
  params: DrugDescriptionDraftListParams = {},
): Promise<DrugDescriptionDraftListResult> {
  const query: Record<string, string> = {};
  if (params.sourceLabel) query.sourceLabel = params.sourceLabel;
  if (params.applyRunId) query.applyRunId = params.applyRunId;
  if (params.reviewStatus) query.reviewStatus = params.reviewStatus;
  if (params.verdict) query.verdict = params.verdict;
  if (params.q?.trim()) query.q = params.q.trim();
  query.page = String(params.page ?? 1);
  query.limit = String(params.limit ?? 20);

  const res = await authClient.api.get<{
    success: boolean;
    data: DrugDescriptionDraftRow[];
    meta: ProductMasterListMeta;
  }>(`/admin/product-candidate-description-drafts?${new URLSearchParams(query).toString()}`);

  return {
    items: res.data?.data ?? [],
    meta: res.data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

export interface DrugDescriptionDraftDetail {
  id: string;
  anchorCandidateId: string;
  sourceLabel: string;
  groupKey: string | null;
  draftType: string;
  language: string;
  title: string | null;
  summary: string | null;
  contentJson: Record<string, unknown>;
  seedJson: Record<string, unknown>;
  guardResult: Record<string, unknown>;
  reviewStatus: string;
  reviewFlags: string[];
  aiProvider: string | null;
  aiModel: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getDrugDescriptionDraft(id: string): Promise<DrugDescriptionDraftDetail | null> {
  const res = await authClient.api.get<{ success: boolean; data: DrugDescriptionDraftDetail }>(
    `/admin/product-candidate-description-drafts/${id}`,
  );
  return res.data?.data ?? null;
}

// ─── Description Status (master 기준 설명 상태 통합 뷰, read-only) ────────────
// WO-O4O-ADMIN-O4O-PRODUCT-DESCRIPTION-STATUS-UNIFIED-VIEW-V1
// mount: /api/v1/admin/o4o-product-db/description-status (GET only)

export type DescriptionFinalStatus = 'canonical' | 'needs_review' | 'draft' | 'none';

export interface DescriptionStatusRow {
  masterId: string;
  productName: string;
  manufacturerName: string | null;
  regulatoryType: string | null;
  primaryIdentifier: string | null;
  canonicalCount: number;
  needsReviewCount: number;
  draftCount: number;
  finalStatus: DescriptionFinalStatus;
  canonicalSourceTypes: string[];
  needsReviewSourceTypes: string[];
  draftVerdicts: string[];
  canonicalDescriptionId: string | null;
  needsReviewDescriptionId: string | null;
  draftId: string | null;
}

export interface DescriptionStatusListParams {
  finalStatus?: string;
  regulatoryType?: string;
  sourceType?: string;
  draftOnly?: boolean;
  q?: string;
  page?: number;
  limit?: number;
}

export interface DescriptionStatusListResult {
  items: DescriptionStatusRow[];
  meta: ProductMasterListMeta;
}

export async function listDescriptionStatus(
  params: DescriptionStatusListParams = {},
): Promise<DescriptionStatusListResult> {
  const query: Record<string, string> = {};
  if (params.finalStatus) query.finalStatus = params.finalStatus;
  if (params.regulatoryType) query.regulatoryType = params.regulatoryType;
  if (params.sourceType) query.sourceType = params.sourceType;
  if (params.draftOnly) query.draftOnly = 'true';
  if (params.q?.trim()) query.q = params.q.trim();
  query.page = String(params.page ?? 1);
  query.limit = String(params.limit ?? 20);

  const res = await authClient.api.get<{
    success: boolean;
    data: DescriptionStatusRow[];
    meta: ProductMasterListMeta;
  }>(`/admin/o4o-product-db/description-status?${new URLSearchParams(query).toString()}`);

  return {
    items: res.data?.data ?? [],
    meta: res.data?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

export async function getDescriptionStatusSummary(): Promise<Record<string, number>> {
  const res = await authClient.api.get<{ success: boolean; data: Record<string, number> }>(
    `/admin/o4o-product-db/description-status/summary`,
  );
  return res.data?.data ?? {};
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

// ─── Product Master Audit Log (작업 이력, read-only) ─────────────────────────
// WO-O4O-ADMIN-O4O-PRODUCT-MASTER-AUDIT-LOG-VIEW-V1

export interface AuditLogItem {
  id: string;
  source: 'product_master_notes' | 'shared_product_descriptions' | 'image' | 'audit_log';
  action: 'note_created' | 'note_hidden' | 'description_curated' | 'image_added' | 'image_primary_changed';
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

/** 이미지 추가 (multipart). Content-Type 은 수동 설정하지 않는다(boundary 자동). */
export async function uploadProductMasterImage(id: string, file: File): Promise<ProductMasterImageAdded | null> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await authClient.api.post<{ success: boolean; data: ProductMasterImageAdded }>(
    `/admin/o4o-product-db/masters/${id}/images`,
    formData,
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
