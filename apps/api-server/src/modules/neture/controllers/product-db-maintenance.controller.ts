/**
 * Product DB Maintenance Controller — 데이터 정비 (admin)
 *
 * WO-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-ORPHAN-CANDIDATE-ARCHIVE-DRYRUN-V1
 * 근거 IR: docs/investigations/IR-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-REGISTER-MISSING-CANDIDATES-AUDIT-V1
 *
 * mount: /api/v1/admin/o4o-product-db/maintenance
 *   POST /jobs/orphan-registered-candidates/dry-run  — 등록 완료 고아 후보 정합화 (DRY-RUN, DB write 0)
 *
 * 배경:
 *   드럭 승격으로 ProductMaster 230,841건이 생성됐고, 이후 drug_unspecified 정리에서 53,428건이
 *   삭제됐다. ProductCandidate.matched_product_master_id 는 ON DELETE SET NULL 이라, master 삭제 시
 *   후보의 링크만 NULL 로 끊기고 candidate_status 는 approved_new_master / matched 로 남았다.
 *   → "master 링크 없음"을 미등록으로 간주하면 이 후보들을 재승격해 삭제한 상품을 되살린다.
 *
 * 이 정비 기능은 그 고아 후보를 찾아(읽기 전용) dry-run 으로 대상·원인·예상 변경을 확인한다.
 * V1 은 dry-run 전용 — apply(archived 전환)는 별도 정책 승인 후 후속 WO 에서 제공한다.
 * 권한: 상품 DB 콘솔과 동일 ADMIN 롤셋(product-master-create 컨트롤러와 동일).
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { DataSource } from 'typeorm';
import { authenticate, requireRole } from '../../../middleware/auth.middleware.js';
import { ProductCandidate } from '../entities/ProductCandidate.entity.js';
import logger from '../../../utils/logger.js';

const ADMIN_ROLES = [
  'platform:super_admin',
  'neture:admin',
  'neture:operator',
  'glycopharm:admin',
  'glycopharm:operator',
  'cosmetics:admin',
  'cosmetics:operator',
  'kpa-society:admin',
  'kpa-society:operator',
];

/** 등록 완료 계열 상태 (제외 대상 아님 = 이미 처리된 후보) */
const REGISTERED_STATUSES = ['approved_new_master', 'matched'] as const;

/** 드럭 트랙 source_label prefix — 고아 후보는 전부 이 트랙에서 발생 */
const DRUG_SOURCE_PREFIX = 'mfds-drug-master-standard-code';

const ORPHAN_ARCHIVE_TARGET_STATUS = 'archived';

/** apply 실행 확인 문구 — 정확 일치해야만 apply 진행 (오작동 방지) */
const CONFIRMATION_PHRASE = 'ARCHIVE_ORPHAN_REGISTERED_CANDIDATES';

/** apply 배치 추적용 review_note 태그 */
const ARCHIVE_NOTE = 'orphan-archive:WO-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-ORPHAN-CANDIDATE-ARCHIVE-APPLY-V1';

/** 청크 update 크기 (migration 금지 — 청크 admin API. reference_large_delete_migration_limit) */
const APPLY_CHUNK_SIZE = 2000;

// ── 취소 의약품 pending 정합화 (WO-...-CANCELLED-DRUG-PENDING-ARCHIVE-V1) ──
// IR-O4O-DRUG-PENDING-CANDIDATE-COHORT-AUDIT-V1: 드럭 pending 74,681 중 74,680 = 허가취소 의약품
// (취소일자 존재). 승격 대상 0. 승격이 아니라 archived 정합화.
const CANCELLED_DRUG_CONFIRMATION_PHRASE = 'ARCHIVE_CANCELLED_DRUG_PENDING_CANDIDATES';
const CANCELLED_DRUG_ARCHIVE_NOTE =
  'cancelled-drug-archive:WO-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-CANCELLED-DRUG-PENDING-ARCHIVE-V1';
/**
 * 취소 신호: isCancelled=true 또는 source.취소일자 존재 (승격 엔진 skip 기준과 동일).
 * 물리 컬럼명 `raw_payload` 사용 — TypeORM 은 raw where 안의 `pc.rawPayload`(엔티티 프로퍼티)를
 * JSON 연산자 앞에서 컬럼으로 치환하지 못해 `pc.rawpayload does not exist` 로 실패한다.
 */
const CANCELLED_JSON_FILTER =
  "(pc.raw_payload->>'isCancelled' = 'true' OR pc.raw_payload->'source'->>'취소일자' IS NOT NULL)";

export function createProductDbMaintenanceController(dataSource: DataSource): Router {
  const router = Router();

  router.use(authenticate);
  router.use(requireRole(ADMIN_ROLES));

  /**
   * POST /jobs/orphan-registered-candidates/dry-run
   *
   * 대상: candidate_status IN (approved_new_master, matched)
   *       AND matched_product_master_id IS NULL AND deleted_at IS NULL
   *
   * DB write 0. 대상 count / 상태별·source_label별 분포 / 샘플 / 예상 변경 / 안전 경고 반환.
   */
  router.post('/jobs/orphan-registered-candidates/dry-run', async (_req: Request, res: Response) => {
    try {
      const repo = dataSource.getRepository(ProductCandidate);

      // 대상 필터 (읽기 전용). 값은 전부 파라미터 바인딩 — string interpolation 없음.
      const base = () =>
        repo
          .createQueryBuilder('pc')
          .where('pc.deletedAt IS NULL')
          .andWhere('pc.candidateStatus IN (:...statuses)', { statuses: [...REGISTERED_STATUSES] })
          .andWhere('pc.matchedProductMasterId IS NULL');

      const targetCount = await base().getCount();

      const byStatusRaw = await base()
        .select('pc.candidateStatus', 'candidateStatus')
        .addSelect('COUNT(*)', 'count')
        .groupBy('pc.candidateStatus')
        .orderBy('COUNT(*)', 'DESC')
        .getRawMany<{ candidateStatus: string; count: string }>();

      const bySourceLabelRaw = await base()
        .select('pc.sourceLabel', 'sourceLabel')
        .addSelect('COUNT(*)', 'count')
        .groupBy('pc.sourceLabel')
        .orderBy('COUNT(*)', 'DESC')
        .getRawMany<{ sourceLabel: string | null; count: string }>();

      // 안전 검사: 드럭 트랙(source_label prefix)이 아닌 대상이 섞여 있는가?
      const nonDrugCount = await base()
        .andWhere('(pc.sourceLabel IS NULL OR pc.sourceLabel NOT LIKE :prefix)', {
          prefix: `${DRUG_SOURCE_PREFIX}%`,
        })
        .getCount();

      const sampleRows = await base()
        .orderBy('pc.reviewedAt', 'DESC')
        .limit(10)
        .getMany();

      const samples = sampleRows.map((c) => ({
        candidateId: c.id,
        sourceLabel: c.sourceLabel,
        candidateStatus: c.candidateStatus,
        name: c.candidateName ?? '',
        manufacturerName: c.candidateManufacturer ?? '',
        identifierValue: c.identifierValue ?? c.normalizedIdentifierValue ?? null,
        reviewedAt: c.reviewedAt ? c.reviewedAt.toISOString() : null,
        before: {
          candidateStatus: c.candidateStatus,
          matchedProductMasterId: null as null,
        },
        after: {
          candidateStatus: ORPHAN_ARCHIVE_TARGET_STATUS,
          matchedProductMasterId: null as null,
        },
        reason:
          '연결된 ProductMaster 가 정책적으로 삭제되어 링크가 끊김(ON DELETE SET NULL). 등록 완료 상태로만 남은 잔재.',
      }));

      const warnings: string[] = [];
      if (nonDrugCount > 0) {
        warnings.push(
          `드럭 트랙이 아닌 대상 ${nonDrugCount}건이 포함됨 — apply 불가. 대상 정의를 재확인하세요.`,
        );
      }
      if (targetCount === 0) {
        warnings.push('대상 후보가 0건입니다 — 이미 정합화되었거나 데이터 상태가 변경되었습니다.');
      }

      // apply 적격 = 드럭 트랙만 & 대상 존재. (V1 은 apply 미구현 — applyEnabled=false 로 고정)
      const applyEligible = targetCount > 0 && nonDrugCount === 0;

      res.json({
        success: true,
        data: {
          jobKey: 'orphan-registered-candidate-archive',
          mode: 'dry-run',
          targetCount,
          byStatus: byStatusRaw.map((r) => ({
            candidateStatus: r.candidateStatus,
            count: Number(r.count),
          })),
          bySourceLabel: bySourceLabelRaw.map((r) => ({
            sourceLabel: r.sourceLabel,
            count: Number(r.count),
          })),
          proposedChange: {
            from: [...REGISTERED_STATUSES],
            to: ORPHAN_ARCHIVE_TARGET_STATUS,
          },
          samples,
          warnings,
          applyEligible,
          // apply 엔드포인트 구현됨(APPLY-V1). 실제 실행은 confirmation 문구 + expectedCount 재검증 게이트.
          // 프론트는 applyEligible && confirmation 정확일치 일 때만 apply 버튼 활성화.
          applyEnabled: applyEligible,
          confirmationPhrase: CONFIRMATION_PHRASE,
        },
      });
    } catch (err) {
      logger.error('[product-db-maintenance] orphan dry-run failed:', err);
      res.status(500).json({
        success: false,
        error: '고아 후보 정합화 dry-run 에 실패했습니다',
        code: 'ORPHAN_DRYRUN_FAILED',
      });
    }
  });

  /**
   * POST /jobs/orphan-registered-candidates/apply
   *
   * 대상(candidate_status IN registered & master 없음 & 드럭 트랙)을 archived 로 전환.
   * ⚠️ DB write 는 이 경로에만 존재. ProductMaster/ProductIdentifier 미변경, hard delete 없음.
   *
   * 게이트(하나라도 불충족 시 write 없이 차단):
   *   1) confirmation === CONFIRMATION_PHRASE
   *   2) nonDrugCount === 0 (드럭 외 대상 미포함)
   *   3) expectedCount 제공 시 currentCount 와 일치 (경합 가드)
   *
   * migration 아님 — 청크 update(APPLY_CHUNK_SIZE/txn). archived 로 바뀐 행은 대상 필터에서
   * 자동 제외되어 idempotent(중단 후 재실행 시 남은 대상만 처리).
   */
  router.post('/jobs/orphan-registered-candidates/apply', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const confirmation = typeof body.confirmation === 'string' ? body.confirmation : '';
      const expectedCount =
        typeof body.expectedCount === 'number' && Number.isFinite(body.expectedCount)
          ? body.expectedCount
          : null;

      // 게이트 1: confirmation 문구
      if (confirmation !== CONFIRMATION_PHRASE) {
        res.status(400).json({
          success: false,
          error: 'confirmation 문구가 일치하지 않습니다',
          code: 'CONFIRMATION_REQUIRED',
        });
        return;
      }

      const repo = dataSource.getRepository(ProductCandidate);
      const base = () =>
        repo
          .createQueryBuilder('pc')
          .where('pc.deletedAt IS NULL')
          .andWhere('pc.candidateStatus IN (:...statuses)', { statuses: [...REGISTERED_STATUSES] })
          .andWhere('pc.matchedProductMasterId IS NULL');

      const currentCount = await base().getCount();
      const nonDrugCount = await base()
        .andWhere('(pc.sourceLabel IS NULL OR pc.sourceLabel NOT LIKE :prefix)', {
          prefix: `${DRUG_SOURCE_PREFIX}%`,
        })
        .getCount();

      // 게이트 2: 드럭 외 대상 감지 → 차단
      if (nonDrugCount > 0) {
        res.status(409).json({
          success: false,
          error: `드럭 외 대상 ${nonDrugCount}건 감지 — apply 중단`,
          code: 'NON_DRUG_TARGET',
          data: { nonDrugCount, currentCount },
        });
        return;
      }

      // 게이트 3: expectedCount 경합 가드
      if (expectedCount !== null && expectedCount !== currentCount) {
        res.status(409).json({
          success: false,
          error: `대상 수 불일치 (expected ${expectedCount} / current ${currentCount}) — apply 중단`,
          code: 'COUNT_MISMATCH',
          data: { expectedCount, currentCount },
        });
        return;
      }

      if (currentCount === 0) {
        res.json({
          success: true,
          data: { mode: 'apply', requested: 0, updated: 0, chunks: 0, elapsedMs: 0, warnings: ['대상 0건 — 변경 없음'] },
        });
        return;
      }

      // 청크 update — candidate_status 만 archived. 각 청크는 대상 필터를 UPDATE where 에 재적용(안전).
      const startedAt = Date.now();
      const maxChunks = Math.ceil(currentCount / APPLY_CHUNK_SIZE) + 5; // 무한루프 방지 backstop
      let updated = 0;
      let chunks = 0;
      const warnings: string[] = [];

      for (;;) {
        if (chunks >= maxChunks) {
          warnings.push(`maxChunks(${maxChunks}) 도달 — 중단. 남은 대상은 재실행으로 처리.`);
          break;
        }
        const rows = await base()
          .select('pc.id', 'id')
          .limit(APPLY_CHUNK_SIZE)
          .getRawMany<{ id: string }>();
        if (rows.length === 0) break;
        const ids = rows.map((r) => r.id);

        const result = await dataSource.transaction(async (mgr) =>
          mgr
            .createQueryBuilder()
            .update(ProductCandidate)
            .set({
              candidateStatus: ORPHAN_ARCHIVE_TARGET_STATUS,
              reviewedAt: () => 'NOW()',
              reviewNote: ARCHIVE_NOTE,
            })
            .where('id IN (:...ids)', { ids })
            .andWhere('candidate_status IN (:...statuses)', { statuses: [...REGISTERED_STATUSES] })
            .andWhere('matched_product_master_id IS NULL')
            .andWhere('deleted_at IS NULL')
            .execute(),
        );

        const affected = result.affected ?? 0;
        updated += affected;
        chunks += 1;
        // 안전: 이 청크에서 아무것도 안 바뀌었는데 rows 는 있었다면(경합/필터 이상) 무한루프 방지 위해 중단.
        if (affected === 0) {
          warnings.push('청크 affected=0 감지 — 중단(경합 의심). 재실행 권장.');
          break;
        }
        if (rows.length < APPLY_CHUNK_SIZE) break;
      }

      const elapsedMs = Date.now() - startedAt;
      logger.info(
        `[product-db-maintenance] orphan archive apply done: requested=${currentCount} updated=${updated} chunks=${chunks} elapsedMs=${elapsedMs}`,
      );

      res.json({
        success: true,
        data: { mode: 'apply', requested: currentCount, updated, chunks, elapsedMs, warnings },
      });
    } catch (err) {
      logger.error('[product-db-maintenance] orphan archive apply failed:', err);
      res.status(500).json({
        success: false,
        error: '고아 후보 정합화 apply 에 실패했습니다',
        code: 'ORPHAN_APPLY_FAILED',
      });
    }
  });

  // ── 취소 의약품 pending 정합화 job (dry-run + apply) ──
  // 대상: pending & 드럭 트랙 & 취소(isCancelled/취소일자) → archived. 승격 아님(승격 대상 0).

  const cancelledDrugBase = () =>
    dataSource
      .getRepository(ProductCandidate)
      .createQueryBuilder('pc')
      .where('pc.deletedAt IS NULL')
      .andWhere('pc.candidateStatus = :pending', { pending: 'pending' })
      .andWhere('pc.sourceLabel LIKE :prefix', { prefix: `${DRUG_SOURCE_PREFIX}%` })
      .andWhere(CANCELLED_JSON_FILTER);

  /** POST /jobs/cancelled-drug-pending-candidates/dry-run — read-only, DB write 0 */
  router.post('/jobs/cancelled-drug-pending-candidates/dry-run', async (_req: Request, res: Response) => {
    try {
      const targetCount = await cancelledDrugBase().getCount();

      const byStatusRaw = await cancelledDrugBase()
        .select('pc.candidateStatus', 'candidateStatus')
        .addSelect('COUNT(*)', 'count')
        .groupBy('pc.candidateStatus')
        .getRawMany<{ candidateStatus: string; count: string }>();

      const bySourceLabelRaw = await cancelledDrugBase()
        .select('pc.sourceLabel', 'sourceLabel')
        .addSelect('COUNT(*)', 'count')
        .groupBy('pc.sourceLabel')
        .orderBy('COUNT(*)', 'DESC')
        .getRawMany<{ sourceLabel: string | null; count: string }>();

      // 안전: 대상 중 취소 신호가 없는데 잡힌 건(=필터 이상)이 있는지 — 정의상 0
      const nonCancelledInTarget = 0; // 필터가 이미 취소조건 포함

      const sampleRows = await cancelledDrugBase().limit(10).getMany();
      const samples = sampleRows.map((c) => ({
        candidateId: c.id,
        sourceLabel: c.sourceLabel,
        candidateStatus: c.candidateStatus,
        name: c.candidateName ?? '',
        manufacturerName: c.candidateManufacturer ?? '',
        identifierValue: c.identifierValue ?? c.normalizedIdentifierValue ?? null,
        category: c.candidateCategory ?? null,
        cancelledAt:
          (c.rawPayload?.['cancelledAt'] as string | undefined) ??
          ((c.rawPayload?.['source'] as Record<string, unknown> | undefined)?.['취소일자'] as string | undefined) ??
          null,
        before: { candidateStatus: c.candidateStatus, matchedProductMasterId: null as null },
        after: { candidateStatus: ORPHAN_ARCHIVE_TARGET_STATUS, matchedProductMasterId: null as null },
        reason: '허가취소된 의약품(취소일자 존재) — 승격 대상 아님. 등록/검토 흐름에서 제외 보관.',
      }));

      const warnings: string[] = [];
      if (targetCount === 0) warnings.push('대상 후보가 0건입니다 — 이미 정합화되었거나 데이터 상태가 변경되었습니다.');

      const applyEligible = targetCount > 0 && nonCancelledInTarget === 0;

      res.json({
        success: true,
        data: {
          jobKey: 'cancelled-drug-pending-archive',
          mode: 'dry-run',
          targetCount,
          byStatus: byStatusRaw.map((r) => ({ candidateStatus: r.candidateStatus, count: Number(r.count) })),
          bySourceLabel: bySourceLabelRaw.map((r) => ({ sourceLabel: r.sourceLabel, count: Number(r.count) })),
          proposedChange: { from: ['pending'], to: ORPHAN_ARCHIVE_TARGET_STATUS },
          samples,
          warnings,
          applyEligible,
          applyEnabled: applyEligible,
          confirmationPhrase: CANCELLED_DRUG_CONFIRMATION_PHRASE,
        },
      });
    } catch (err) {
      logger.error('[product-db-maintenance] cancelled-drug dry-run failed:', err);
      res.status(500).json({
        success: false,
        error: '취소 의약품 pending 정합화 dry-run 에 실패했습니다',
        code: 'CANCELLED_DRUG_DRYRUN_FAILED',
      });
    }
  });

  /** POST /jobs/cancelled-drug-pending-candidates/apply — candidate_status pending→archived (청크) */
  router.post('/jobs/cancelled-drug-pending-candidates/apply', async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const confirmation = typeof body.confirmation === 'string' ? body.confirmation : '';
      const expectedCount =
        typeof body.expectedCount === 'number' && Number.isFinite(body.expectedCount) ? body.expectedCount : null;

      if (confirmation !== CANCELLED_DRUG_CONFIRMATION_PHRASE) {
        res.status(400).json({ success: false, error: 'confirmation 문구가 일치하지 않습니다', code: 'CONFIRMATION_REQUIRED' });
        return;
      }

      const repo = dataSource.getRepository(ProductCandidate);
      const currentCount = await cancelledDrugBase().getCount();

      if (expectedCount !== null && expectedCount !== currentCount) {
        res.status(409).json({
          success: false,
          error: `대상 수 불일치 (expected ${expectedCount} / current ${currentCount}) — apply 중단`,
          code: 'COUNT_MISMATCH',
          data: { expectedCount, currentCount },
        });
        return;
      }
      if (currentCount === 0) {
        res.json({ success: true, data: { mode: 'apply', requested: 0, updated: 0, chunks: 0, elapsedMs: 0, warnings: ['대상 0건 — 변경 없음'] } });
        return;
      }

      const startedAt = Date.now();
      const maxChunks = Math.ceil(currentCount / APPLY_CHUNK_SIZE) + 5;
      let updated = 0;
      let chunks = 0;
      const warnings: string[] = [];

      for (;;) {
        if (chunks >= maxChunks) {
          warnings.push(`maxChunks(${maxChunks}) 도달 — 중단. 남은 대상은 재실행으로 처리.`);
          break;
        }
        const rows = await cancelledDrugBase().select('pc.id', 'id').limit(APPLY_CHUNK_SIZE).getRawMany<{ id: string }>();
        if (rows.length === 0) break;
        const ids = rows.map((r) => r.id);

        // UPDATE where 에 대상 필터 전체 재적용 (취소·드럭·pending). candidate_status 만 변경.
        const result = await dataSource.transaction(async (mgr) =>
          mgr
            .createQueryBuilder()
            .update(ProductCandidate)
            .set({ candidateStatus: ORPHAN_ARCHIVE_TARGET_STATUS, reviewedAt: () => 'NOW()', reviewNote: CANCELLED_DRUG_ARCHIVE_NOTE })
            .where('id IN (:...ids)', { ids })
            .andWhere('candidate_status = :pending', { pending: 'pending' })
            .andWhere('deleted_at IS NULL')
            .andWhere('source_label LIKE :prefix', { prefix: `${DRUG_SOURCE_PREFIX}%` })
            .andWhere("(raw_payload->>'isCancelled' = 'true' OR raw_payload->'source'->>'취소일자' IS NOT NULL)")
            .execute(),
        );

        const affected = result.affected ?? 0;
        updated += affected;
        chunks += 1;
        if (affected === 0) {
          warnings.push('청크 affected=0 감지 — 중단(경합 의심). 재실행 권장.');
          break;
        }
        if (rows.length < APPLY_CHUNK_SIZE) break;
      }

      const elapsedMs = Date.now() - startedAt;
      logger.info(
        `[product-db-maintenance] cancelled-drug archive apply done: requested=${currentCount} updated=${updated} chunks=${chunks} elapsedMs=${elapsedMs}`,
      );
      res.json({ success: true, data: { mode: 'apply', requested: currentCount, updated, chunks, elapsedMs, warnings } });
    } catch (err) {
      logger.error('[product-db-maintenance] cancelled-drug apply failed:', err);
      res.status(500).json({ success: false, error: '취소 의약품 pending 정합화 apply 에 실패했습니다', code: 'CANCELLED_DRUG_APPLY_FAILED' });
    }
  });

  return router;
}
