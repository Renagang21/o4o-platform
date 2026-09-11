/**
 * MemberAnnualReportController — 회원 본인의 신상신고 작성·임시저장·제출·보완 재제출
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
import {
  AnnualReport,
  MEMBER_EDITABLE_STATUSES,
} from '../../routes/kpa-branch/entities/annual-report.entity.js';
import type { AnnualReportStatus } from '../../routes/kpa-branch/entities/annual-report.entity.js';
import { AnnualReportService } from '../../services/kpa-branch/AnnualReportService.js';
import type { AnnualReportTemplate } from '../../routes/kpa-branch/entities/annual-report-template.entity.js';

/**
 * 대상 연도 = 활성 양식의 연도. 클라이언트가 고르지 않는다.
 *
 * WO-O4O-KPA-BRANCH-TENANT-ONBOARDING-AND-MVP-PRODUCTION-E2E-V1 §9:
 *   이전에는 `KPA_BRANCH_ANNUAL_REPORT_YEAR ?? 2026` 상수였다. 주석은 "활성 양식의 연도"
 *   라고 적혀 있었지만 실제로는 코드에 박힌 연도였고, 새 연도 양식을 열어도 회원 화면은
 *   지난 연도에 머물렀다 — 연도 전환에 재배포나 env 변경이 필요했다(MUST_AUTOMATE).
 *   이제 서버가 DB 의 active 양식에서 판정한다. 클라이언트가 고르지 않는 성질은 그대로다.
 */
const currentTemplate = () => AnnualReportService.getCurrentTemplate();

/**
 * 신고 기간 정책 — 역할과 무관하다.
 *
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-PRODUCTION-E2E-CLOSURE-V1 §5:
 *   `/me/annual-report/*` 는 **본인 신고** 경로다. 누가 요청하든 신고 주체는 요청자
 *   자신이므로 member / operator / admin 에 같은 기간 정책을 적용한다.
 *   (이전의 `canBypassPeriod` 운영자 예외는 제거했다 — 운영자가 기간 밖에 회원 신고를
 *   대신 처리하는 기능은 이 경로가 아니라 별도 운영자 경로의 문제다.)
 */

/**
 * W4 §8 — 보완요청 재제출은 신고 기간 제한을 받지 않는다.
 *
 * 운영자가 `revision_requested` 로 되돌린 신고서는 이미 기간 안에 제출된 것이고,
 * 재제출은 그 검수를 마무리하는 행위다. 기간으로 막으면 "보완하라고 열어놓고
 * 고칠 수는 없는" 막다른 길이 생긴다. 이 예외는 요청자의 역할과 무관하게
 * **신고서 상태에만** 걸리므로, W2 가 정리한 "기간 정책은 role 무관" 원칙과 충돌하지 않는다.
 */
function canSubmitNow(period: 'before' | 'open' | 'closed', status: AnnualReportStatus | null): boolean {
  return period === 'open' || status === 'revision_requested';
}

/**
 * 회원이 고칠 수 없는 상태면 409 payload 를, 고칠 수 있으면 null 을 돌려준다.
 * 임시저장과 제출이 **같은 판정**을 쓰도록 한 곳에 둔다.
 */
function editableOrConflict(status: AnnualReportStatus | null) {
  if (status === null || MEMBER_EDITABLE_STATUSES.includes(status)) return null;
  if (status === 'approved') {
    return {
      success: false,
      error: '승인이 완료된 신고서는 수정할 수 없습니다.',
      code: 'ALREADY_APPROVED',
    };
  }
  return {
    success: false,
    error: '이미 제출한 신고서입니다. 수정이 필요하면 분회 사무국에 보완요청을 문의해 주세요.',
    code: 'ALREADY_SUBMITTED',
  };
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

    const template = await currentTemplate();
    if (!template) {
      return res.status(404).json({
        success: false,
        error: '신고서 양식이 준비되지 않았습니다.',
        code: 'TEMPLATE_NOT_FOUND',
      });
    }

    const existing = await AppDataSource.getRepository(AnnualReport).findOne({
      where: { user_id: userId, organization_id: organizationId, year: template.year },
    });

    const prefill = await AnnualReportService.buildPrefill(template, { userId, organizationId });
    const association = await AnnualReportService.resolveAssociationValues(template, {
      organizationId,
      year: template.year,
      // 회비구분은 회원별 원장에서 읽는다 (WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1)
      userId,
    });

    /**
     * 제출 완료본은 **스냅샷 그대로** 보여준다 — association 을 다시 주입하지 않는다.
     * 회원이 전출하면 현재 분회가 달라지는데, 과거 신고서의 소속이 그때 값으로
     * 바뀌어 보이면 제출 기록이 훼손된다 (WO §8 스냅샷 보존).
     */
    const isSubmittedSnapshot = Boolean(existing && existing.status !== 'draft');
    const values = isSubmittedSnapshot
      ? { ...existing!.values }
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
              /** 보완요청 사유는 회원에게 그대로 보인다 (W4 §8) */
              revisionReason: existing.revision_reason,
              revisionRequestedAt: existing.revision_requested_at,
              approvedAt: existing.approved_at,
              revisionRound: Array.isArray(existing.revision_history) ? existing.revision_history.length : 0,
            }
          : null,
        values,
        /**
         * `values` 가 어느 시점의 값인지 — 두 필드의 시점 비대칭을 응답에서 명시한다.
         * WO-O4O-KPA-BRANCH-MVP-RESIDUAL-CONTRACT-FINAL-CLOSURE-V1 §B
         *
         *   'submitted_snapshot' — 제출 당시 그대로. 회비구분·소속 등 association 값도
         *                          그때 값이며, 지금 원장이 달라져도 덮어쓰지 않는다.
         *   'draft_composed'     — prefill + 내 draft + **현재** association 을 합성한 값.
         */
        valuesSource: isSubmittedSnapshot ? 'submitted_snapshot' : 'draft_composed',
        visible,
        /**
         * **현재 시점** 연결 가능 여부다. `values` 와 같은 시점이 아니다.
         *
         * 이전 이름은 `associationLinkStatus` 였는데, 제출 완료본(스냅샷)과 나란히 실려
         * 같은 시점처럼 읽혔다. 실제로 "제출 당시 회비 원장이 없어 values['fee.category']=null
         * 인데 지금은 원장이 생겨 'resolved'" 인 조합이 나온다 — 값은 비었는데 연결됨으로
         * 보이는 모순이다. 이름에 시점을 박아 계약을 분명히 한다.
         *
         * 과거 제출본의 값을 현재 원장값으로 덮어쓰지 않는다(스냅샷 보존). 소비 측은
         * valuesSource='submitted_snapshot' 일 때 이 필드를 값의 근거로 쓰지 않는다.
         */
        currentAssociationLinkStatus: association.linkStatus,
        /**
         * 평가할 수 없는 rule (예: R9 — 2018~2025 신고이력 원장이 존재하지 않는다).
         * 있는 것처럼 차단하지 않고 상태만 노출한다.
         */
        notEvaluableRules,
        period: {
          status: period,
          canSubmit: canSubmitNow(period, existing?.status ?? null),
        },
        /** 회원이 값을 고칠 수 있는 상태는 draft / revision_requested 뿐이다 */
        readonly: existing ? !MEMBER_EDITABLE_STATUSES.includes(existing.status) : false,
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

    const template = await currentTemplate();
    if (!template) {
      return res.status(404).json({ success: false, error: '양식이 없습니다.', code: 'TEMPLATE_NOT_FOUND' });
    }

    const repo = AppDataSource.getRepository(AnnualReport);
    const existing = await repo.findOne({
      where: { user_id: userId, organization_id: organizationId, year: template.year },
    });

    const editGate = editableOrConflict(existing?.status ?? null);
    if (editGate) return res.status(409).json(editGate);

    const { accepted, dropped } = AnnualReportService.sanitizeIncoming(template, req.body?.values);
    const association = await AnnualReportService.resolveAssociationValues(template, {
      organizationId,
      year: template.year,
      // 회비구분은 회원별 원장에서 읽는다 (WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1)
      userId,
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

    const template = await currentTemplate();
    if (!template) {
      return res.status(404).json({ success: false, error: '양식이 없습니다.', code: 'TEMPLATE_NOT_FOUND' });
    }

    // 기간 게이트는 신고서 상태를 읽은 뒤에 판정한다 (보완 재제출 예외 — canSubmitNow 주석)
    const repo = AppDataSource.getRepository(AnnualReport);
    const existing = await repo.findOne({
      where: { user_id: userId, organization_id: organizationId, year: template.year },
    });

    const submitGate = editableOrConflict(existing?.status ?? null);
    if (submitGate) return res.status(409).json(submitGate);

    const period = AnnualReportService.periodStatus(template);
    if (!canSubmitNow(period, existing?.status ?? null)) {
      return res.status(403).json({
        success: false,
        error:
          period === 'before'
            ? `신고 기간이 아직 시작되지 않았습니다. (${template.period_start} 부터)`
            : `신고 기간이 종료되었습니다. (${template.period_end} 까지)`,
        code: 'REPORT_PERIOD_CLOSED',
      });
    }

    const { accepted, dropped } = AnnualReportService.sanitizeIncoming(template, req.body?.values);
    const association = await AnnualReportService.resolveAssociationValues(template, {
      organizationId,
      year: template.year,
      // 회비구분은 회원별 원장에서 읽는다 (WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1)
      userId,
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
      const wasRevision = existing.status === 'revision_requested';
      existing.values = values;
      existing.template_id = template.id;
      existing.status = 'submitted';
      existing.submitted_at = now;
      if (wasRevision) {
        /**
         * 재제출로 보완요청은 해소된다. 사유·시각·요청자는 비우되
         * **`revision_history` 는 건드리지 않는다** — 지난 요청과 그때의 제출 내용이
         * 남아야 검수 이력이 성립한다 (W4 §5).
         */
        existing.revision_reason = null;
        existing.revision_requested_at = null;
        existing.revision_requested_by = null;
      }
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
