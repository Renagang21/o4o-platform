/**
 * AnnualReportReviewService — 분회 운영자의 신상신고 검수 (승인 / 보완요청)
 * WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1
 *
 * 이 파일이 **상태 전이 경계**다. 상태를 바꾸는 경로는 여기와
 * MemberAnnualReportController(제출) 둘뿐이며, 허용 전이는 아래가 전부다.
 *
 *   draft              → submitted            (회원 제출)
 *   submitted          → revision_requested   (운영자 보완요청)
 *   submitted          → approved             (운영자 승인)
 *   revision_requested → submitted            (회원 재제출)
 *
 * 역전이는 없다. approved 는 종착이고 승인 취소 경로를 만들지 않는다
 * (WO §1 "임의의 역전이는 허용하지 않는다" · §11 다단계 결재 범위 밖).
 *
 * 하지 않는 것:
 *   - 승인이 `kpa_members` 를 건드리지 않는다. 원장 반영은 별도 sync 행위다 (WO §6).
 *   - 제출 스냅샷(`values`)을 운영자가 고칠 수 없다. 검수는 읽고 판정만 한다.
 *   - 보완요청이 제출 내용을 지우지 않는다 — `revision_history` 에 보존한 뒤 편집을 연다 (§5).
 *   - 현재 회원정보로 association 값을 다시 덮지 않는다. 조회는 저장된 스냅샷 그대로다 (§4).
 */
import type { EntityManager } from 'typeorm';
import { AppDataSource } from '../../database/connection.js';
import { AnnualReport } from '../../routes/kpa-branch/entities/annual-report.entity.js';
import type {
  AnnualReportStatus,
  AnnualReportRevisionRound,
} from '../../routes/kpa-branch/entities/annual-report.entity.js';
import { AnnualReportService } from './AnnualReportService.js';
import { AnnualReportMembershipSyncService } from './AnnualReportMembershipSyncService.js';
import type { MemberLedger } from './AnnualReportMembershipSyncService.js';

export type ReviewFailureCode =
  | 'REPORT_NOT_FOUND'
  | 'REPORT_NOT_REVIEWABLE'
  | 'TEMPLATE_NOT_FOUND'
  | 'REVISION_REASON_REQUIRED';

export class AnnualReportReviewError extends Error {
  constructor(
    readonly code: ReviewFailureCode,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/** 보완사유 최대 길이 — 사유는 회원에게 그대로 보인다 */
const REVISION_REASON_MAX = 1000;

export interface ReviewListItem {
  id: string;
  year: number;
  status: AnnualReportStatus;
  submittedAt: Date | null;
  member: { userId: string; name: string | null; email: string | null };
  /** 원장과 달라지는 항목 수 — 운영자가 목록에서 먼저 보는 "주요 변경사항" */
  changedCount: number;
  changedLabels: string[];
  /** 원장 비교가 불가능한 경우(회원 원장 없음·양식 유실) 사유 */
  diffUnavailable: string | null;
  syncedToMembership: boolean;
  revisionRound: number;
  approvedAt: Date | null;
}

export class AnnualReportReviewService {
  /**
   * 검수 목록. **언제나 organization_id 로 먼저 좁힌다** — 다른 분회 신고서는
   * 필터 조합으로도 나올 수 없다 (CLAUDE.md §7 Guard Rule 1·3).
   *
   * 검색·정렬 옵션을 늘리지 않는다 (WO §3 — 과한 CRM 기능 금지).
   */
  static async list(params: {
    organizationId: string;
    year?: number;
    status?: AnnualReportStatus;
  }): Promise<ReviewListItem[]> {
    const args: unknown[] = [params.organizationId];
    const where: string[] = ['r.organization_id = $1'];

    if (typeof params.year === 'number') {
      args.push(params.year);
      where.push(`r.year = $${args.length}`);
    }
    if (params.status) {
      args.push(params.status);
      where.push(`r.status = $${args.length}`);
    }

    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT r.id, r.year, r.status, r.submitted_at, r.values, r.template_id,
              r.synced_to_membership, r.approved_at,
              jsonb_array_length(r.revision_history) AS revision_round,
              u.id AS user_id, u.name AS user_name, u.email AS user_email
         FROM annual_reports r
         JOIN users u ON u.id = r.user_id
        WHERE ${where.join(' AND ')}
        ORDER BY r.submitted_at DESC NULLS LAST, r.updated_at DESC`,
      args,
    );

    // 목록에서도 원장 비교를 보여준다. 판정 로직은 실제 반영(W3)과 **같은 함수**를 쓴다.
    const items: ReviewListItem[] = [];
    const templateCache = new Map<string, Awaited<ReturnType<typeof AnnualReportService.getTemplateById>>>();
    const memberCache = new Map<string, MemberLedger | null>();

    for (const row of rows) {
      let template = templateCache.get(row.template_id);
      if (template === undefined) {
        template = await AnnualReportService.getTemplateById(row.template_id);
        templateCache.set(row.template_id, template);
      }
      let member = memberCache.get(row.user_id);
      if (member === undefined) {
        member = await AnnualReportMembershipSyncService.loadMemberLedger(row.user_id, params.organizationId);
        memberCache.set(row.user_id, member);
      }

      let changedCount = 0;
      let changedLabels: string[] = [];
      let diffUnavailable: string | null = null;

      if (!template) {
        diffUnavailable = '제출 당시 양식을 찾을 수 없습니다.';
      } else if (!member) {
        diffUnavailable = AnnualReportMembershipSyncService.unavailableReason(null);
      } else {
        const diff = AnnualReportMembershipSyncService.diffAgainstLedger(template, row.values ?? {}, member);
        const labelOf = new Map(AnnualReportService.fields(template).map((f) => [f.key, f.label]));
        changedCount = diff.changes.length;
        changedLabels = diff.changes.map((c) => labelOf.get(c.key) ?? c.key);
      }

      items.push({
        id: row.id,
        year: row.year,
        status: row.status,
        submittedAt: row.submitted_at,
        member: { userId: row.user_id, name: row.user_name ?? null, email: row.user_email ?? null },
        changedCount,
        changedLabels,
        diffUnavailable,
        syncedToMembership: row.synced_to_membership === true,
        revisionRound: Number(row.revision_round ?? 0),
        approvedAt: row.approved_at,
      });
    }

    return items;
  }

  /**
   * 상세. 조회 조건은 항상 (id, organization_id) 복합이다 — UUID 단독 조회 금지.
   *
   * `values` 는 **저장된 스냅샷 그대로** 낸다. 회원이 전출해도, 양식이 v2 가 되어도
   * 이 신고서의 소속·내용은 바뀌지 않는다 (WO §4).
   */
  static async detail(params: { reportId: string; organizationId: string }) {
    const report = await AppDataSource.getRepository(AnnualReport).findOne({
      where: { id: params.reportId, organization_id: params.organizationId },
    });
    if (!report) {
      throw new AnnualReportReviewError('REPORT_NOT_FOUND', '신고서를 찾을 수 없습니다.', 404);
    }

    const template = await AnnualReportService.getTemplateById(report.template_id);
    if (!template) {
      throw new AnnualReportReviewError('TEMPLATE_NOT_FOUND', '제출 당시 양식을 찾을 수 없습니다.', 404);
    }

    const rows: Array<Record<string, unknown>> = await AppDataSource.query(
      `SELECT id, name, email FROM users WHERE id = $1 LIMIT 1`,
      [report.user_id],
    );
    const user = rows[0] ?? {};

    const member = await AnnualReportMembershipSyncService.loadMemberLedger(report.user_id, params.organizationId);
    const fields = AnnualReportService.fields(template);
    const labelOf = new Map(fields.map((f) => [f.key, f.label]));
    const fieldOf = new Map(fields.map((f) => [f.key, f]));

    /**
     * 원장 대비 변경 항목. 원장이 없으면 비교를 만들어내지 않고 사유를 낸다.
     * `unavailable` 이 null 이 아니면 반영(sync)도 같은 사유로 거절된다 — 화면은 이 값으로 버튼을 막는다.
     * `beforeLabel/afterLabel` 은 선택지 필드의 raw code 를 양식 label 로 바꾼 표시용 값이다 (원본 before/after 는 유지).
     */
    const ledgerDiff = member
      ? (() => {
          const d = AnnualReportMembershipSyncService.diffAgainstLedger(template, report.values ?? {}, member);
          return {
            unavailable: AnnualReportMembershipSyncService.unavailableReason(member),
            changes: d.changes.map((c) => ({
              ...c,
              label: labelOf.get(c.key) ?? c.key,
              beforeLabel: AnnualReportMembershipSyncService.labelFor(fieldOf.get(c.key), c.before),
              afterLabel: AnnualReportMembershipSyncService.labelFor(fieldOf.get(c.key), c.after),
            })),
            skipped: d.skipped.map((s) => ({ ...s, label: labelOf.get(s.key) ?? s.key })),
            invalid: d.invalid,
            ledgerSource: member.source,
          };
        })()
      : {
          unavailable: AnnualReportMembershipSyncService.unavailableReason(null),
          changes: [], skipped: [], invalid: [], ledgerSource: null,
        };

    return {
      report: {
        id: report.id,
        year: report.year,
        status: report.status,
        submittedAt: report.submitted_at,
        updatedAt: report.updated_at,
        syncedToMembership: report.synced_to_membership,
        syncedChanges: report.synced_changes,
        revisionReason: report.revision_reason,
        revisionRequestedAt: report.revision_requested_at,
        revisionRequestedBy: report.revision_requested_by,
        approvedAt: report.approved_at,
        approvedBy: report.approved_by,
        revisionHistory: report.revision_history ?? [],
      },
      member: { userId: report.user_id, name: (user.name as string) ?? null, email: (user.email as string) ?? null },
      /** 제출 당시 양식 — version 을 함께 낸다 (WO §4) */
      template: {
        id: template.id,
        year: template.year,
        version: template.version,
        title: template.title,
        status: template.status,
      },
      schema: template.schema,
      /** 저장된 스냅샷 그대로. association 재주입 없음 */
      values: report.values ?? {},
      ledgerDiff,
    };
  }

  /** 검수 대상 신고서를 잠금과 함께 읽는다. 상태 판정과 쓰기가 갈라지지 않게 한다. */
  private static async loadReviewable(
    manager: EntityManager,
    reportId: string,
    organizationId: string,
  ): Promise<AnnualReport> {
    const rows: AnnualReport[] = await manager.query(
      `SELECT * FROM annual_reports WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
      [reportId, organizationId],
    );
    const report = rows[0];
    if (!report) {
      throw new AnnualReportReviewError('REPORT_NOT_FOUND', '신고서를 찾을 수 없습니다.', 404);
    }
    if (report.status !== 'submitted') {
      throw new AnnualReportReviewError(
        'REPORT_NOT_REVIEWABLE',
        report.status === 'approved'
          ? '이미 승인된 신고서입니다.'
          : report.status === 'revision_requested'
            ? '이미 보완요청한 신고서입니다. 회원의 재제출을 기다리는 중입니다.'
            : '제출 완료된 신고서만 검수할 수 있습니다.',
        409,
        { status: report.status },
      );
    }
    return report;
  }

  /**
   * 승인 — submitted → approved.
   * 원장은 건드리지 않는다. 반영은 승인 이후 별도 sync 로만 가능하다 (WO §6·§7).
   */
  static async approve(params: { reportId: string; organizationId: string; actorUserId: string }) {
    return AppDataSource.transaction(async (manager) => {
      const report = await this.loadReviewable(manager, params.reportId, params.organizationId);
      const now = new Date();

      await manager.query(
        `UPDATE annual_reports
            SET status = 'approved', approved_at = $1, approved_by = $2, updated_at = now()
          WHERE id = $3 AND organization_id = $4 AND status = 'submitted'`,
        [now, params.actorUserId, report.id, params.organizationId],
      );

      return { id: report.id, status: 'approved' as const, approvedAt: now, approvedBy: params.actorUserId };
    });
  }

  /**
   * 보완요청 — submitted → revision_requested.
   *
   * 회원에게 편집을 다시 열되, **지금 검수 중이던 제출 스냅샷을 먼저 보존한다**.
   * 회원이 `values` 를 고쳐도 운영자가 봤던 내용은 `revision_history` 에 남는다 (WO §5).
   */
  static async requestRevision(params: {
    reportId: string;
    organizationId: string;
    actorUserId: string;
    reason: unknown;
  }) {
    const reason = typeof params.reason === 'string' ? params.reason.trim() : '';
    if (!reason) {
      throw new AnnualReportReviewError('REVISION_REASON_REQUIRED', '보완 사유를 입력해 주세요.', 422);
    }
    if (reason.length > REVISION_REASON_MAX) {
      throw new AnnualReportReviewError(
        'REVISION_REASON_REQUIRED',
        `보완 사유는 ${REVISION_REASON_MAX}자를 넘을 수 없습니다.`,
        422,
      );
    }

    return AppDataSource.transaction(async (manager) => {
      const report = await this.loadReviewable(manager, params.reportId, params.organizationId);
      const now = new Date();
      const history: AnnualReportRevisionRound[] = Array.isArray(report.revision_history)
        ? report.revision_history
        : [];

      const round: AnnualReportRevisionRound = {
        round: history.length + 1,
        submittedAt: report.submitted_at ? new Date(report.submitted_at).toISOString() : null,
        values: report.values ?? {},
        templateId: report.template_id,
        reason,
        requestedBy: params.actorUserId,
        requestedAt: now.toISOString(),
      };

      /**
       * `submitted_at` 은 지우지 않는다 — 이 신고서는 한 번 제출된 사실이 있고,
       * DB 제약도 draft 가 아닌 상태에 제출시각을 요구한다.
       * `values` 도 그대로 둔다: 회원은 자기가 낸 내용에서 이어서 고친다.
       */
      await manager.query(
        `UPDATE annual_reports
            SET status = 'revision_requested',
                revision_reason = $1,
                revision_requested_at = $2,
                revision_requested_by = $3,
                revision_history = revision_history || $4::jsonb,
                updated_at = now()
          WHERE id = $5 AND organization_id = $6 AND status = 'submitted'`,
        [reason, now, params.actorUserId, JSON.stringify([round]), report.id, params.organizationId],
      );

      return {
        id: report.id,
        status: 'revision_requested' as const,
        revisionReason: reason,
        revisionRequestedAt: now,
        revisionRequestedBy: params.actorUserId,
        round: round.round,
      };
    });
  }
}
