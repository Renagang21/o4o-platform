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
