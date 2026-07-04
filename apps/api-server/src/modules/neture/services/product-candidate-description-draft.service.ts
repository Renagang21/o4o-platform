/**
 * ProductCandidateDescriptionDraftService — 후보 기반 AI 설명 draft 저장/조회
 *
 * WO-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-BULK-APPLY-V1
 *
 * raw parameterized SQL 사용(최소 DataSource CLI 호환). ProductCandidate 무변경.
 * upsert 축 = 활성 (candidate_id, draft_type, language) 1개 (partial unique index).
 *
 * `buildDescriptionDraftRow` 는 **순수 함수**(DB 무관) — 단위 테스트 대상.
 */

import type { DataSource } from 'typeorm';
import type {
  HealthFunctionalFoodDescriptionSeed,
  HealthFunctionalFoodStoreDescriptionDraft,
} from '../drug-import/health-functional-food-store-description.prompt.js';
import type {
  HffBulkDraftVerdict,
  HffDescriptionPreFlag,
} from '../drug-import/health-functional-food-description-guards.js';
import type { ProductCandidateDescriptionReviewStatus } from '../entities/ProductCandidateDescriptionDraft.entity.js';

export interface DescriptionDraftGuardResult {
  preFlags: HffDescriptionPreFlag[];
  draftVerdict: HffBulkDraftVerdict;
  sourceFidelity?: Record<string, unknown>;
  medicineLike?: Record<string, unknown>;
  quality?: Record<string, unknown>;
  promptVersion?: string;
}

export interface BuildDescriptionDraftInput {
  candidateId: string;
  sourceLabel: string;
  sourceIdentifierValue: string | null;
  draftType?: string; // 기본 store_description
  language?: string; // 기본 ko
  seed: HealthFunctionalFoodDescriptionSeed;
  draft: HealthFunctionalFoodStoreDescriptionDraft;
  guard: DescriptionDraftGuardResult;
  ai: {
    provider: string | null;
    model: string | null;
    policyScope: string | null;
    costEstimate: number | null;
    generatedAt: Date | null;
  };
}

export interface DescriptionDraftRow {
  candidate_id: string;
  source_label: string;
  source_identifier_value: string | null;
  draft_type: string;
  language: string;
  title: string | null;
  summary: string | null;
  content_json: Record<string, unknown>;
  content_html: string | null;
  seed_json: Record<string, unknown>;
  guard_result: Record<string, unknown>;
  review_status: ProductCandidateDescriptionReviewStatus;
  review_flags: string[];
  ai_provider: string | null;
  ai_model: string | null;
  ai_policy_scope: string | null;
  ai_cost_estimate: number | null;
  generated_at: Date | null;
}

/** guard FAIL 은 rejected, 그 외 needs_review (WO §12 설계 기준). */
const FAIL_VERDICTS = new Set<HffBulkDraftVerdict>([
  'FAIL_BEYOND_SOURCE',
  'FAIL_MEDICINE_LIKE',
  'FAIL_CAUTION_LOSS',
  'FAIL_JSON_PARSE',
  'FAIL_PROVIDER_ERROR',
]);

export function resolveReviewStatus(verdict: HffBulkDraftVerdict): ProductCandidateDescriptionReviewStatus {
  return FAIL_VERDICTS.has(verdict) ? 'rejected' : 'needs_review';
}

/**
 * 순수: draft 저장 row 조립. seed_json 은 추적용(원문 무손실 목적 아님) — 필요한 필드만.
 */
export function buildDescriptionDraftRow(input: BuildDescriptionDraftInput): DescriptionDraftRow {
  const { seed, draft, guard, ai } = input;
  const reviewFlags = Array.from(new Set<string>([...guard.preFlags, guard.draftVerdict]));
  // seed_json: 원문 raw_payload 전체 중복 저장 금지 — 추적 최소 필드만
  const seedJson = {
    sttemntNo: seed.sttemntNo,
    productName: seed.productName,
    manufacturerName: seed.manufacturerName,
    functionalClaims: seed.functionalClaims,
    sourceFields: seed.sourceFields,
    missingFields: seed.missingFields,
  };
  return {
    candidate_id: input.candidateId,
    source_label: input.sourceLabel,
    source_identifier_value: input.sourceIdentifierValue,
    draft_type: input.draftType ?? 'store_description',
    language: input.language ?? 'ko',
    title: draft.title ?? null,
    summary: draft.summary ?? null,
    content_json: draft as unknown as Record<string, unknown>,
    content_html: null,
    seed_json: seedJson,
    guard_result: guard as unknown as Record<string, unknown>,
    review_status: resolveReviewStatus(guard.draftVerdict),
    review_flags: reviewFlags,
    ai_provider: ai.provider,
    ai_model: ai.model,
    ai_policy_scope: ai.policyScope,
    ai_cost_estimate: ai.costEstimate,
    generated_at: ai.generatedAt,
  };
}

export class ProductCandidateDescriptionDraftService {
  constructor(private dataSource: DataSource) {}

  /**
   * 멱등 upsert: 활성 (candidate_id, draft_type, language) 1개.
   * partial unique index(uniq_pcdd_candidate_draft_type_language_active) 추론.
   */
  async upsertDraft(row: DescriptionDraftRow): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO product_candidate_description_drafts
        (candidate_id, source_label, source_identifier_value, draft_type, language,
         title, summary, content_json, content_html, seed_json, guard_result,
         review_status, review_flags, ai_provider, ai_model, ai_policy_scope, ai_cost_estimate, generated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (candidate_id, draft_type, language) WHERE deleted_at IS NULL
       DO UPDATE SET
         source_label = EXCLUDED.source_label,
         source_identifier_value = EXCLUDED.source_identifier_value,
         title = EXCLUDED.title,
         summary = EXCLUDED.summary,
         content_json = EXCLUDED.content_json,
         content_html = EXCLUDED.content_html,
         seed_json = EXCLUDED.seed_json,
         guard_result = EXCLUDED.guard_result,
         review_status = EXCLUDED.review_status,
         review_flags = EXCLUDED.review_flags,
         ai_provider = EXCLUDED.ai_provider,
         ai_model = EXCLUDED.ai_model,
         ai_policy_scope = EXCLUDED.ai_policy_scope,
         ai_cost_estimate = EXCLUDED.ai_cost_estimate,
         generated_at = EXCLUDED.generated_at,
         updated_at = NOW()`,
      [
        row.candidate_id, row.source_label, row.source_identifier_value, row.draft_type, row.language,
        row.title, row.summary, JSON.stringify(row.content_json), row.content_html,
        JSON.stringify(row.seed_json), JSON.stringify(row.guard_result),
        row.review_status, row.review_flags, row.ai_provider, row.ai_model, row.ai_policy_scope,
        row.ai_cost_estimate, row.generated_at,
      ],
    );
  }

  async countBySourceLabel(sourceLabel: string): Promise<number> {
    const r: { count: string }[] = await this.dataSource.query(
      `SELECT COUNT(*) AS count FROM product_candidate_description_drafts
       WHERE source_label = $1 AND deleted_at IS NULL`,
      [sourceLabel],
    );
    return Number(r[0]?.count ?? 0);
  }

  async countByStatus(sourceLabel: string): Promise<Record<string, number>> {
    const rows: { review_status: string; count: string }[] = await this.dataSource.query(
      `SELECT review_status, COUNT(*) AS count FROM product_candidate_description_drafts
       WHERE source_label = $1 AND deleted_at IS NULL GROUP BY review_status`,
      [sourceLabel],
    );
    return Object.fromEntries(rows.map((r) => [r.review_status, Number(r.count)]));
  }
}
