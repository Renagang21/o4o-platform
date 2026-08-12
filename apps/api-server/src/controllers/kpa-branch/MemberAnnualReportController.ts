/**
 * MemberAnnualReportController — 회원 본인의 신상신고 작성·임시저장·제출
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1 §7 §8 §9
 *
 * 신뢰 경계:
 *   body 의 userId / organizationId / serviceKey / year 를 **읽지 않는다.**
 *     userId         ← req.user.id            (requireAuth)
 *     organizationId ← req.branch.id          (resolveBranch + requireBranchScope)
 *     year           ← active Template        (URL·body 아님)
 *   따라서 남의 신고를 건드리거나 다른 분회로 저장하는 경로가 존재하지 않는다.
 *
 * 조회는 항상 (user_id, organization_id) 복합 조건이다 — UUID 단독 조회 금지(§7 Guard Rule 1).
 */
import type { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { AnnualReport } from '../../routes/kpa-branch/entities/annual-report.entity.js';
import { AnnualReportService } from '../../services/kpa-branch/AnnualReportService.js';
import type { AnnualReportTemplate } from '../../routes/kpa-branch/entities/annual-report-template.entity.js';

/** 대상 연도 = 활성 양식의 연도. 클라이언트가 고르지 않는다. */
const TARGET_YEAR = Number(process.env.KPA_BRANCH_ANNUAL_REPORT_YEAR ?? 2026);

/**
 * 신고 기간 밖 제출 허용 여부.
 * 회원은 기간 내에만 제출할 수 있다. 운영자·관리자는 기간 밖에도 제출할 수 있다 —
 * 분회 실무상 기간 외 대리 처리·검증이 필요하고, 예외가 없으면 연중 대부분 기간에
 * 이 경로를 점검조차 할 수 없다.
 */
function canBypassPeriod(req: Request): boolean {
  const roles: string[] = Array.isArray((req as any).user?.roles) ? (req as any).user.roles : [];
  return roles.includes('kpa-branch:operator') || roles.includes('kpa-branch:admin');
}

function templateSummary(t: AnnualReportTemplate) {
  return {
    id: t.id,
    year: t.year,
    version: t.version,
    title: t.title,
    status: t.status,
    periodStart: t.period_start,
    periodEnd: t.period_end,
  };
}

export class MemberAnnualReportController {
  /**
   * GET /branches/:branchSlug/me/annual-report
   * 양식 + 내 draft/제출본 + prefill + association 주입값을 한 번에 준다.
   * 화면은 이 응답만으로 4 STEP 을 그린다 (필드 목록을 프런트에 복제하지 않는다).
   */
  static async get(req: Request, res: Response) {
    const userId = (req as any).user.id as string;
    const organizationId = req.branch!.id;

    const template = await AnnualReportService.getActiveTemplate(TARGET_YEAR);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: `${TARGET_YEAR}년도 신고서 양식이 준비되지 않았습니다.`,
        code: 'TEMPLATE_NOT_FOUND',
      });
    }

    const existing = await AppDataSource.getRepository(AnnualReport).findOne({
      where: { user_id: userId, organization_id: organizationId, year: template.year },
    });

    const prefill = await AnnualReportService.buildPrefill(template, { userId });
    const association = await AnnualReportService.resolveAssociationValues(template, {
      organizationId,
      year: template.year,
    });

    /**
     * 제출 완료본은 **스냅샷 그대로** 보여준다 — association 을 다시 주입하지 않는다.
     * 회원이 전출하면 현재 분회가 달라지는데, 과거 신고서의 소속이 그때 값으로
     * 바뀌어 보이면 제출 기록이 훼손된다 (WO §8 스냅샷 보존).
     */
    const values = existing?.status === 'submitted'
      ? { ...existing.values }
      : { ...prefill, ...(existing?.values ?? {}), ...association.values };

    const { visible, notEvaluableRules } = AnnualReportService.computeVisibility(template, values);
    const period = AnnualReportService.periodStatus(template);

    return res.json({
      success: true,
      data: {
        template: templateSummary(template),
        schema: template.schema,
        report: existing
          ? {
              id: existing.id,
              status: existing.status,
              submittedAt: existing.submitted_at,
              updatedAt: existing.updated_at,
            }
          : null,
        values,
        visible,
        associationLinkStatus: association.linkStatus,
        /**
         * 평가할 수 없는 rule (예: R9 — 2018~2025 신고이력 원장이 존재하지 않는다).
         * 있는 것처럼 차단하지 않고 상태만 노출한다.
         */
        notEvaluableRules,
        period: {
          status: period,
          canSubmit: period === 'open' || canBypassPeriod(req),
          bypassReason: period !== 'open' && canBypassPeriod(req) ? 'OPERATOR_BYPASS' : null,
        },
        readonly: existing?.status === 'submitted',
      },
    });
  }

  /**
   * POST /branches/:branchSlug/me/annual-report/draft
   * 필수항목 완성을 요구하지 않는다. ownership 필터는 항상 적용한다.
   * 제출 완료본은 덮어쓰지 않는다.
   */
  static async saveDraft(req: Request, res: Response) {
    const userId = (req as any).user.id as string;
    const organizationId = req.branch!.id;

    const template = await AnnualReportService.getActiveTemplate(TARGET_YEAR);
    if (!template) {
      return res.status(404).json({ success: false, error: '양식이 없습니다.', code: 'TEMPLATE_NOT_FOUND' });
    }

    const repo = AppDataSource.getRepository(AnnualReport);
    const existing = await repo.findOne({
      where: { user_id: userId, organization_id: organizationId, year: template.year },
    });

    if (existing?.status === 'submitted') {
      return res.status(409).json({
        success: false,
        error: '이미 제출한 신고서는 수정할 수 없습니다.',
        code: 'ALREADY_SUBMITTED',
      });
    }

    const { accepted, dropped } = AnnualReportService.sanitizeIncoming(template, req.body?.values);
    const association = await AnnualReportService.resolveAssociationValues(template, {
      organizationId,
      year: template.year,
    });

    const values = { ...(existing?.values ?? {}), ...accepted, ...association.values };

    let saved: AnnualReport;
    if (existing) {
      existing.values = values;
      existing.template_id = template.id;
      saved = await repo.save(existing);
    } else {
      saved = await repo.save(
        repo.create({
          template_id: template.id,
          user_id: userId,
          organization_id: organizationId,
          year: template.year,
          status: 'draft',
          values,
          submitted_at: null,
        }),
      );
    }

    return res.json({
      success: true,
      data: {
        id: saved.id,
        status: saved.status,
        updatedAt: saved.updated_at,
        values: saved.values,
        /** 서버가 무시한 키 — 클라이언트가 association/readonly 를 보냈다는 증거 */
        ignoredKeys: dropped,
      },
    });
  }

  /**
   * POST /branches/:branchSlug/me/annual-report/submit
   * active Template 기준 최종 검증 후 status='submitted'.
   */
  static async submit(req: Request, res: Response) {
    const userId = (req as any).user.id as string;
    const organizationId = req.branch!.id;

    const template = await AnnualReportService.getActiveTemplate(TARGET_YEAR);
    if (!template) {
      return res.status(404).json({ success: false, error: '양식이 없습니다.', code: 'TEMPLATE_NOT_FOUND' });
    }

    const period = AnnualReportService.periodStatus(template);
    if (period !== 'open' && !canBypassPeriod(req)) {
      return res.status(403).json({
        success: false,
        error:
          period === 'before'
            ? `신고 기간이 아직 시작되지 않았습니다. (${template.period_start} 부터)`
            : `신고 기간이 종료되었습니다. (${template.period_end} 까지)`,
        code: 'REPORT_PERIOD_CLOSED',
      });
    }

    const repo = AppDataSource.getRepository(AnnualReport);
    const existing = await repo.findOne({
      where: { user_id: userId, organization_id: organizationId, year: template.year },
    });

    if (existing?.status === 'submitted') {
      return res.status(409).json({
        success: false,
        error: '이미 제출한 신고서입니다.',
        code: 'ALREADY_SUBMITTED',
      });
    }

    const { accepted, dropped } = AnnualReportService.sanitizeIncoming(template, req.body?.values);
    const association = await AnnualReportService.resolveAssociationValues(template, {
      organizationId,
      year: template.year,
    });

    const now = new Date();
    const values: Record<string, unknown> = {
      ...(existing?.values ?? {}),
      ...accepted,
      ...association.values,
      'submission.declaredAt': now.toISOString().slice(0, 10),
    };

    const issues = AnnualReportService.validateForSubmit(template, values);
    if (issues.length) {
      return res.status(422).json({
        success: false,
        error: '입력하지 않은 필수 항목이 있습니다.',
        code: 'VALIDATION_FAILED',
        data: { issues, ignoredKeys: dropped },
      });
    }

    let saved: AnnualReport;
    if (existing) {
      existing.values = values;
      existing.template_id = template.id;
      existing.status = 'submitted';
      existing.submitted_at = now;
      saved = await repo.save(existing);
    } else {
      saved = await repo.save(
        repo.create({
          template_id: template.id,
          user_id: userId,
          organization_id: organizationId,
          year: template.year,
          status: 'submitted',
          values,
          submitted_at: now,
        }),
      );
    }

    return res.json({
      success: true,
      data: {
        id: saved.id,
        status: saved.status,
        submittedAt: saved.submitted_at,
        /** 제출 스냅샷 — Template 이 v2 가 되어도 이 조합은 변하지 않는다 */
        snapshot: {
          templateId: saved.template_id,
          organizationId: saved.organization_id,
          year: saved.year,
        },
        ignoredKeys: dropped,
      },
    });
  }
}
