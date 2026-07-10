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
  'platform:admin',
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
          // V1: apply 는 정책 승인 후 후속 WO. 프론트는 이 플래그로 apply 버튼을 비활성 처리.
          applyEnabled: false,
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

  return router;
}
