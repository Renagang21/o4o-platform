/**
 * BranchMemberConsoleService — 회원 업무 콘솔 (소속 + 신상신고 + 회비 + 연수교육 통합 조회)
 * WO-O4O-KPA-BRANCH-MEMBER-OPERATIONS-CONSOLE-V1
 *
 * **신규 업무 원장을 만들지 않는다.** W1~W6 이 만든 4개 원장을 읽어 합칠 뿐이며,
 * 통합용 summary 테이블도 denormalized 캐시도 두지 않는다 (WO §5).
 *
 * 이 파일의 존재 이유는 하나다 — **프런트가 3개 API 를 각각 불러 회원별로 조인하는 구조를
 * 막는 것**이다 (WO §1·§2). 그 구조는 회원 수만큼 요청이 늘어나 수백 명 분회에서 무너진다.
 * 그래서 목록은 **쿼리 1회**로 끝난다:
 *
 *   branch_memberships                      (분회 소속 = 목록의 기준 축)
 *     JOIN users                            (성명·이메일)
 *     LEFT JOIN kpa_members                 (면허번호·직역·회비구분)
 *     LEFT JOIN annual_reports              (해당 연도 신상신고)
 *     LEFT JOIN branch_fee_ledgers          (해당 연도 회비)
 *     LEFT JOIN branch_education_credit_ledgers (해당 연도 연수교육)
 *
 * **LEFT JOIN 인 것이 계약이다** (WO §6): 원장이 없는 회원도 목록에서 빠지지 않는다.
 * 없음은 null 이 아니라 명시적 상태로 바꿔 내보낸다 — `not_submitted` / `not_assessed` /
 * `not_recorded`. 화면이 null 을 해석하게 두면 축마다 다르게 해석된다.
 *
 * 팬아웃이 없는 근거 (행이 회원당 1개인 이유):
 *   - `annual_reports`             UNIQUE(user_id, year)                → 조인 조건상 최대 1행
 *   - `branch_fee_ledgers`         UNIQUE(organization_id, user_id, year) → 최대 1행
 *   - `branch_education_credit_ledgers` 동일                            → 최대 1행
 *   - `kpa_members`                user_id 당 1행
 *   - `branch_memberships`         active 는 회원당 최대 1행(부분 UNIQUE).
 *     `status=all` 은 전입·전출 이력이라 회원이 여러 번 나올 수 있다 — 콘솔 기본값이
 *     `active` 인 이유이며, 이는 기존 엔드포인트의 의미를 그대로 물려받은 것이다.
 *
 * 경계 (CLAUDE.md §7 Guard Rule 1·3):
 *   모든 조회가 `bm.organization_id = $1` 로 시작하고, 3개 원장 조인도 각각
 *   `organization_id` 를 조건에 건다. 상세는 (organizationId, userId) 복합이다 —
 *   다른 분회 userId 를 넣어도 소속 행이 없어 결과가 비어 404 가 된다.
 */
import { AppDataSource } from '../../database/connection.js';
import { AnnualReportService } from './AnnualReportService.js';
import { AnnualReportMembershipSyncService } from './AnnualReportMembershipSyncService.js';
// WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1: 현재 직책 표시 (읽기 전용)
import { BranchOfficerService } from './BranchOfficerService.js';

export type ConsoleFailureCode = 'MEMBER_NOT_FOUND' | 'YEAR_INVALID';

export class BranchMemberConsoleError extends Error {
  constructor(
    readonly code: ConsoleFailureCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** 원장이 없을 때의 상태. null 을 그대로 내보내지 않는다 (WO §6) */
export type ReportSummaryStatus =
  | 'not_submitted'
  | 'draft'
  | 'submitted'
  | 'revision_requested'
  | 'approved';
export type FeeSummaryStatus = 'not_assessed' | 'unpaid' | 'partial' | 'paid' | 'exempt';
export type EducationSummaryStatus = 'not_recorded' | 'incomplete' | 'complete' | 'exempt';

/**
 * 운영자가 목록에서 바로 알아야 하는 상태.
 * 통계가 아니라 **행동이 필요한 항목**만 담는다 (WO §1 "주요 주의상태").
 */
export type AttentionCode =
  | 'REPORT_REVIEW_PENDING' // 제출됨 — 운영자 검수 대기
  | 'REPORT_REVISION_OPEN' // 보완요청 — 회원 재제출 대기
  | 'REPORT_SYNC_PENDING' // 승인됐으나 회원 원장 미반영
  | 'REPORT_MISSING' // 해당 연도 신고 없음(미작성 포함)
  | 'FEE_OUTSTANDING' // 미납 또는 일부납부
  | 'FEE_NOT_ASSESSED' // 회비 미부과
  | 'EDUCATION_INCOMPLETE' // 연수교육 미이수
  | 'EDUCATION_NOT_RECORDED'; // 연수교육 기록 없음

export interface MemberConsoleListItem {
  // ── 기존 `GET /operator/members` 응답 필드 (소비처 0건이지만 파괴하지 않는다) ──
  id: string;
  userId: string;
  organizationId: string;
  status: string;
  joinedAt: Date;
  leftAt: Date | null;
  transferReason: string | null;
  note: string | null;

  // ── 통합 요약 ──
  name: string | null;
  email: string | null;
  licenseNumber: string | null;
  activityType: string | null;
  /** canonical 약사 프로필 존재 여부 — false 면 면허번호·직역은 fallback 값이거나 없다 */
  hasPharmacistProfile: boolean;
  feeCategory: string | null;
  /** 분회별 속성 (`branch_memberships`) */
  workplaceName: string | null;
  workplaceAddress: string | null;
  report: { status: ReportSummaryStatus; submittedAt: Date | null; approvedAt: Date | null };
  fee: { status: FeeSummaryStatus; assessedAmount: number | null; paidAmount: number | null };
  education: {
    status: EducationSummaryStatus;
    requiredCredits: number | null;
    completedCredits: number | null;
  };
  attention: AttentionCode[];
  /**
   * 이 회원의 **현재 직책** (WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1).
   * 임원 명부에서 `user_id` 로 연결된 현직만 들어온다. 외부 인사(연결 없음)는 대상이 아니다.
   * 읽기 전용 표시이며 권한과 무관하다 — 직책은 RBAC 이 아니다.
   */
  positions: string[];
}

/**
 * 목록·상세가 같은 조인을 쓰도록 한 곳에 둔다 — 두 화면이 다른 판정을 내지 않게 한다.
 *
 * 면허번호·직역의 canonical source 는 `kpa_pharmacist_profiles` 다
 * (WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICALIZATION-V1). `kpa_members` 는 profile 에 값이
 * 없을 때만 읽는 fallback 이며, 이 콘솔은 어느 쪽에도 쓰지 않는다.
 * 분회별 속성(회비구분·근무처)은 `branch_memberships` 의 그 분회 행에서 읽는다.
 */
const CONSOLE_SELECT = `
  SELECT bm.id, bm.user_id, bm.organization_id, bm.status AS membership_status,
         bm.joined_at, bm.left_at, bm.transfer_reason, bm.note,
         u.name AS user_name, u.email AS user_email,
         COALESCE(p.license_number, km.license_number) AS license_number,
         COALESCE(p.activity_type, km.activity_type) AS activity_type,
         (p.id IS NOT NULL) AS has_profile,
         bm.fee_category AS bm_fee_category,
         bm.workplace_name, bm.workplace_address,
         COALESCE(bm.fee_category, km.fee_category) AS member_fee_category,
         ar.id AS report_id, ar.status AS report_status, ar.submitted_at AS report_submitted_at,
         ar.approved_at AS report_approved_at, ar.synced_to_membership AS report_synced,
         ar.revision_reason AS report_revision_reason,
         ar.revision_requested_at AS report_revision_requested_at,
         ar.template_id AS report_template_id, ar.values AS report_values,
         ar.revision_history AS report_revision_history,
         fl.id AS fee_id, fl.status AS fee_status, fl.assessed_amount, fl.paid_amount,
         fl.paid_at AS fee_paid_at, fl.fee_category AS fee_ledger_category, fl.memo AS fee_memo,
         el.id AS edu_id, el.status AS edu_status, el.required_credits, el.completed_credits,
         el.exemption_type AS edu_exemption_type, el.memo AS edu_memo
    FROM branch_memberships bm
    JOIN users u ON u.id = bm.user_id
    LEFT JOIN kpa_pharmacist_profiles p ON p.user_id = bm.user_id
    LEFT JOIN kpa_members km ON km.user_id = bm.user_id
    LEFT JOIN annual_reports ar
           ON ar.user_id = bm.user_id AND ar.organization_id = bm.organization_id AND ar.year = $2
    LEFT JOIN branch_fee_ledgers fl
           ON fl.user_id = bm.user_id AND fl.organization_id = bm.organization_id AND fl.year = $2
    LEFT JOIN branch_education_credit_ledgers el
           ON el.user_id = bm.user_id AND el.organization_id = bm.organization_id AND el.year = $2`;

export class BranchMemberConsoleService {
  private static assertYear(year: unknown): number {
    const y = Number(year);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      throw new BranchMemberConsoleError('YEAR_INVALID', '연도가 올바르지 않습니다.', 422);
    }
    return y;
  }

  /** pg 는 numeric 을 문자열로 준다. 경계에서 한 번만 숫자로 바꾼다 (W6 와 같은 처리) */
  private static num(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private static attentionOf(r: Record<string, any>): AttentionCode[] {
    const out: AttentionCode[] = [];

    if (!r.report_id) out.push('REPORT_MISSING');
    else if (r.report_status === 'draft') out.push('REPORT_MISSING');
    else if (r.report_status === 'submitted') out.push('REPORT_REVIEW_PENDING');
    else if (r.report_status === 'revision_requested') out.push('REPORT_REVISION_OPEN');
    else if (r.report_status === 'approved' && r.report_synced !== true) out.push('REPORT_SYNC_PENDING');

    if (!r.fee_id) out.push('FEE_NOT_ASSESSED');
    else if (r.fee_status === 'unpaid' || r.fee_status === 'partial') out.push('FEE_OUTSTANDING');

    if (!r.edu_id) out.push('EDUCATION_NOT_RECORDED');
    else if (r.edu_status === 'incomplete') out.push('EDUCATION_INCOMPLETE');

    return out;
  }

  private static serialize(r: Record<string, any>): MemberConsoleListItem {
    return {
      id: r.id,
      userId: r.user_id,
      organizationId: r.organization_id,
      status: r.membership_status,
      joinedAt: r.joined_at,
      leftAt: r.left_at,
      transferReason: r.transfer_reason,
      note: r.note,

      name: r.user_name ?? null,
      email: r.user_email ?? null,
      licenseNumber: r.license_number ?? null,
      activityType: r.activity_type ?? null,
      hasPharmacistProfile: r.has_profile === true,
      // 회비 원장의 구분(부과 시점 스냅샷)이 있으면 그것이 그 해의 사실이다 (W5 §6 과 같은 우선순위)
      feeCategory: r.fee_ledger_category ?? r.member_fee_category ?? null,
      workplaceName: r.workplace_name ?? null,
      workplaceAddress: r.workplace_address ?? null,

      report: {
        status: (r.report_id ? r.report_status : 'not_submitted') as ReportSummaryStatus,
        submittedAt: r.report_submitted_at ?? null,
        approvedAt: r.report_approved_at ?? null,
      },
      fee: {
        status: (r.fee_id ? r.fee_status : 'not_assessed') as FeeSummaryStatus,
        assessedAmount: r.fee_id ? this.num(r.assessed_amount) : null,
        paidAmount: r.fee_id ? this.num(r.paid_amount) : null,
      },
      education: {
        status: (r.edu_id ? r.edu_status : 'not_recorded') as EducationSummaryStatus,
        requiredCredits: r.edu_id ? this.num(r.required_credits) : null,
        completedCredits: r.edu_id ? this.num(r.completed_credits) : null,
      },
      attention: this.attentionOf(r),
      // 직책은 목록·상세에서 배치 조회로 채운다 (serialize 는 행 단위라 여기서 비워 둔다)
      positions: [],
    };
  }

  /**
   * 회원 목록 — **DB 쿼리 1회**. 회원 수에 비례해 늘어나지 않는다 (WO §2).
   *
   * 검색은 성명·면허번호 부분일치 하나뿐이다. 정렬·다중조건·태그 등 CRM 검색을
   * 만들지 않는다 (WO §1 "과도한 CRM 검색 기능을 만들지 않는다").
   */
  static async list(params: {
    organizationId: string;
    year: number;
    membershipStatus?: 'active' | 'left' | 'all';
    attention?: AttentionCode;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: MemberConsoleListItem[]; total: number; year: number }> {
    const year = this.assertYear(params.year);
    const membershipStatus = params.membershipStatus ?? 'active';
    const limit = Math.min(Math.max(Number(params.limit ?? 100) || 100, 1), 200);
    const offset = Math.max(Number(params.offset ?? 0) || 0, 0);

    const args: unknown[] = [params.organizationId, year];
    const where: string[] = ['bm.organization_id = $1'];

    if (membershipStatus !== 'all') {
      args.push(membershipStatus);
      where.push(`bm.status = $${args.length}`);
    }
    if (params.q && params.q.trim()) {
      args.push(`%${params.q.trim()}%`);
      where.push(
        `(u.name ILIKE $${args.length} OR COALESCE(p.license_number, km.license_number) ILIKE $${args.length})`,
      );
    }

    const whereSql = where.join(' AND ');
    args.push(limit, offset);

    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `${CONSOLE_SELECT}
        WHERE ${whereSql}
        ORDER BY u.name ASC NULLS LAST, bm.joined_at DESC
        LIMIT $${args.length - 1} OFFSET $${args.length}`,
      args,
    );

    let items = rows.map((r) => this.serialize(r));
    /**
     * 주의상태 필터는 **조회 후**에 건다. 8종 코드가 3개 축의 조합으로 만들어지므로
     * SQL 조건으로 옮기면 코드와 SQL 두 곳에 같은 규칙이 생기고 반드시 어긋난다.
     * 분회 회원 수(수백)에서는 애플리케이션 필터가 충분하다.
     */
    if (params.attention) {
      items = items.filter((i) => i.attention.includes(params.attention as AttentionCode));
    }

    /**
     * 현재 직책을 붙인다 — **쿼리 1회**다 (WO §W7 연동 "N+1 로 만들지 않는다").
     * 회원마다 조회하면 목록의 1-query 계약이 깨진다. userId 를 모아 한 번에 읽고 Map 으로 붙인다.
     */
    if (items.length) {
      const positions = await BranchOfficerService.currentPositionsByUsers({
        organizationId: params.organizationId,
        userIds: items.map((i) => i.userId),
      });
      items = items.map((i) => ({ ...i, positions: positions.get(i.userId) ?? [] }));
    }

    return { items, total: items.length, year };
  }

  /**
   * 회원 1명 상세 — 4영역을 **1회 조회**로 만든다.
   *
   * 신상신고의 "주요 변경사항"만 추가 조회가 필요하다(양식 + 회원 원장). 회원 1명 기준
   * 상수 회수이고, 무엇보다 **검수 화면(W4)·실제 반영(W3)과 같은 판정 함수**를 써야
   * 화면끼리 다른 답을 내지 않는다.
   */
  static async detail(params: { organizationId: string; userId: string; year: number }) {
    const year = this.assertYear(params.year);

    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `${CONSOLE_SELECT}
        WHERE bm.organization_id = $1 AND bm.user_id = $3
        ORDER BY bm.status = 'active' DESC, bm.joined_at DESC
        LIMIT 1`,
      [params.organizationId, year, params.userId],
    );
    const r = rows[0];
    if (!r) {
      // 다른 분회 회원이면 소속 행이 없어 여기로 떨어진다 — 존재 여부를 알려주지 않는다
      throw new BranchMemberConsoleError('MEMBER_NOT_FOUND', '이 분회의 회원을 찾을 수 없습니다.', 404);
    }

    const summary = this.serialize(r);

    /** 신고 상세 — 원장 대비 변경항목은 W3/W4 와 같은 함수로 판정한다 */
    let reportChanges: Array<{
      key: string; label: string; before: unknown; after: unknown;
      beforeLabel: string | null; afterLabel: string | null;
    }> = [];
    let reportDiffUnavailable: string | null = null;

    if (r.report_id) {
      const template = await AnnualReportService.getTemplateById(r.report_template_id);
      const ledger = await AnnualReportMembershipSyncService.loadMemberLedger(r.user_id, params.organizationId);
      if (!template) {
        reportDiffUnavailable = '제출 당시 양식을 찾을 수 없습니다.';
      } else if (!ledger) {
        reportDiffUnavailable = AnnualReportMembershipSyncService.unavailableReason(null);
      } else {
        const diff = AnnualReportMembershipSyncService.diffAgainstLedger(
          template,
          r.report_values ?? {},
          ledger,
        );
        const fields = AnnualReportService.fields(template);
        const fieldOf = new Map(fields.map((f) => [f.key, f]));
        // 반영 불가 사유는 sync 와 같은 판정을 쓴다 — 화면은 이 값으로 반영 버튼을 막는다
        reportDiffUnavailable = AnnualReportMembershipSyncService.unavailableReason(ledger);
        reportChanges = diff.changes.map((c) => ({
          key: c.key,
          label: fieldOf.get(c.key)?.label ?? c.key,
          before: c.before,
          after: c.after,
          beforeLabel: AnnualReportMembershipSyncService.labelFor(fieldOf.get(c.key), c.before),
          afterLabel: AnnualReportMembershipSyncService.labelFor(fieldOf.get(c.key), c.after),
        }));
      }
    } else {
      reportDiffUnavailable = '해당 연도 신고서가 없습니다.';
    }

    const officerPositions = await BranchOfficerService.currentPositionsByUsers({
      organizationId: params.organizationId,
      userIds: [r.user_id],
    });

    const revisionHistory: unknown[] = Array.isArray(r.report_revision_history)
      ? r.report_revision_history
      : [];

    return {
      year,
      /** A. 회원 기본정보 + 현재 소속 */
      member: {
        userId: r.user_id,
        name: r.user_name ?? null,
        email: r.user_email ?? null,
        licenseNumber: r.license_number ?? null,
        activityType: r.activity_type ?? null,
        hasPharmacistProfile: summary.hasPharmacistProfile,
        feeCategory: summary.feeCategory,
        workplaceName: summary.workplaceName,
        workplaceAddress: summary.workplaceAddress,
        /** 현재 직책 — 회원 1명 기준이라 상수 회수다 */
        positions: officerPositions.get(r.user_id) ?? [],
      },
      affiliation: {
        membershipId: r.id,
        organizationId: r.organization_id,
        status: r.membership_status,
        joinedAt: r.joined_at,
        leftAt: r.left_at,
        transferReason: r.transfer_reason,
        note: r.note,
      },
      /** B. 신상신고 */
      report: r.report_id
        ? {
            id: r.report_id,
            status: r.report_status,
            submittedAt: r.report_submitted_at,
            approvedAt: r.report_approved_at,
            syncedToMembership: r.report_synced === true,
            revisionReason: r.report_revision_reason ?? null,
            revisionRequestedAt: r.report_revision_requested_at ?? null,
            revisionRound: revisionHistory.length,
            changes: reportChanges,
            diffUnavailable: reportDiffUnavailable,
          }
        : { status: 'not_submitted' as const, diffUnavailable: reportDiffUnavailable },
      /** C. 회비 */
      fee: r.fee_id
        ? {
            id: r.fee_id,
            status: r.fee_status,
            feeCategory: r.fee_ledger_category ?? null,
            assessedAmount: this.num(r.assessed_amount),
            paidAmount: this.num(r.paid_amount),
            outstanding:
              r.fee_status === 'exempt'
                ? 0
                : Math.max((this.num(r.assessed_amount) ?? 0) - (this.num(r.paid_amount) ?? 0), 0),
            paidAt: r.fee_paid_at ?? null,
            memo: r.fee_memo ?? null,
          }
        : { status: 'not_assessed' as const },
      /** D. 연수교육 */
      education: r.edu_id
        ? {
            id: r.edu_id,
            status: r.edu_status,
            requiredCredits: this.num(r.required_credits),
            completedCredits: this.num(r.completed_credits),
            remainingCredits:
              r.edu_status === 'exempt'
                ? 0
                : Math.max((this.num(r.required_credits) ?? 0) - (this.num(r.completed_credits) ?? 0), 0),
            exemptionType: r.edu_exemption_type ?? null,
            memo: r.edu_memo ?? null,
          }
        : { status: 'not_recorded' as const },
      attention: summary.attention,
    };
  }
}
