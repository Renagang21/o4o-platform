/**
 * BranchEducationCreditService — 분회 연수교육 평점 원장
 * WO-O4O-KPA-BRANCH-CONTINUING-EDUCATION-CREDIT-LEDGER-V1
 *
 * 이 파일이 평점의 **쓰기 경계**다. 서버에서만 결정하는 것:
 *
 *   1) 어느 분회인가 — 호출자(resolveBranch + requireBranchScope)가 확정한 organizationId.
 *      body 의 organizationId / userId 는 읽지 않는다 (§7 Guard Rule 1·4).
 *   2) 누구에게 여는가 — 그 분회의 **active 소속 회원**(branch_memberships)뿐이다.
 *   3) 상태는 무엇인가 — **계산하지 않는다.** DB generated column 이 정한다.
 *      서비스가 status 를 만들면 DB 값과 두 벌이 되므로 읽기만 한다.
 *   4) 누가 바꿨는가 — updated_by 에 운영자를 남긴다.
 *
 * 하지 않는 것 (WO §10):
 *   - 강좌·수강신청·출결·증빙을 다루지 않는다. LMS 테이블을 읽지도 쓰지도 않는다.
 *   - 대한약사회 연수교육 API 를 부르지 않는다. 자동 평점 수집이 없다.
 *   - 평점 발생내역을 건별로 쌓지 않는다 (WO §1 판단 — entity 주석 참조).
 *   - 회원이 자기 평점을 바꾸는 경로를 만들지 않는다.
 */
import { AppDataSource } from '../../database/connection.js';
import { BranchEducationCreditLedger } from '../../routes/kpa-branch/entities/branch-education-credit-ledger.entity.js';
import {
  EXEMPTION_TYPES,
  type EducationCreditStatus,
  type EducationExemptionType,
} from '../../routes/kpa-branch/entities/branch-education-credit-ledger.entity.js';

export type EducationFailureCode = 'LEDGER_NOT_FOUND' | 'CREDIT_VALUE_INVALID' | 'YEAR_INVALID';

export class BranchEducationCreditError extends Error {
  constructor(
    readonly code: EducationFailureCode,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/**
 * 평점 상한 — 입력 방어선이다. 연간 인정평점이 세 자리가 되는 제도는 없다.
 * `numeric(4,1)` 컬럼이 담을 수 있는 범위(999.9)보다 먼저 걸러 DB 오류 대신 422 를 준다.
 */
const CREDIT_MAX = 200;

/** 0.5 단위까지 허용한다 — 연수교육 평점에 반평점이 실재한다 */
const CREDIT_STEP = 0.5;

export interface EducationCreditItem {
  id: string;
  year: number;
  userId: string;
  memberName: string | null;
  memberEmail: string | null;
  requiredCredits: number;
  completedCredits: number;
  /** 남은 평점. 면제는 0 이다 — 화면에서 다시 계산하지 않는다 */
  remainingCredits: number;
  exemptionType: EducationExemptionType | null;
  status: EducationCreditStatus;
  memo: string | null;
  updatedAt: Date;
}

/** 연도 개설에서 건너뛴 회원 1명과 사유 */
export interface EducationOpenSkip {
  userId: string;
  reason: 'ALREADY_OPEN';
}

export class BranchEducationCreditService {
  private static assertYear(year: unknown): number {
    const y = Number(year);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      throw new BranchEducationCreditError('YEAR_INVALID', '연도가 올바르지 않습니다.', 422);
    }
    return y;
  }

  /** 0.5 단위 · 0 이상 · 상한 이하. 그 밖은 422 로 돌려주고 DB 까지 보내지 않는다 */
  private static assertCredit(value: unknown, label: string): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > CREDIT_MAX || Math.round(n / CREDIT_STEP) * CREDIT_STEP !== n) {
      throw new BranchEducationCreditError(
        'CREDIT_VALUE_INVALID',
        `${label}은(는) 0 이상 ${CREDIT_MAX} 이하의 0.5 단위 값이어야 합니다.`,
        422,
      );
    }
    return n;
  }

  /**
   * pg 는 `numeric` 을 문자열로 돌려준다. 화면·계산이 문자열을 받으면
   * "8" + 1 = "81" 같은 사고가 나므로 경계에서 한 번만 숫자로 바꾼다.
   */
  private static serialize(r: Record<string, any>): EducationCreditItem {
    const required = Number(r.required_credits ?? 0);
    const completed = Number(r.completed_credits ?? 0);
    return {
      id: r.id,
      year: Number(r.year),
      userId: r.user_id,
      memberName: r.user_name ?? null,
      memberEmail: r.user_email ?? null,
      requiredCredits: required,
      completedCredits: completed,
      remainingCredits: r.status === 'exempt' ? 0 : Math.max(required - completed, 0),
      exemptionType: r.exemption_type ?? null,
      status: r.status,
      memo: r.memo ?? null,
      updatedAt: r.updated_at,
    };
  }

  /** 목록·상세가 같은 열을 쓰도록 한 곳에 둔다 */
  private static readonly SELECT = `
    SELECT l.id, l.year, l.user_id, l.required_credits, l.completed_credits,
           l.exemption_type, l.status, l.memo, l.updated_at,
           u.name AS user_name, u.email AS user_email
      FROM branch_education_credit_ledgers l
      JOIN users u ON u.id = l.user_id`;

  /**
   * 분회 × 연도 목록. **언제나 organization_id 로 먼저 좁힌다** —
   * 다른 분회 평점은 필터 조합으로도 나올 수 없다 (§7 Guard Rule 1·3).
   */
  static async list(params: {
    organizationId: string;
    year: number;
    status?: EducationCreditStatus;
  }): Promise<{
    items: EducationCreditItem[];
    summary: { count: number; complete: number; incomplete: number; exempt: number };
  }> {
    const year = this.assertYear(params.year);
    const args: unknown[] = [params.organizationId, year];
    let where = 'l.organization_id = $1 AND l.year = $2';
    if (params.status) {
      args.push(params.status);
      where += ` AND l.status = $${args.length}`;
    }

    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `${this.SELECT} WHERE ${where} ORDER BY u.name ASC NULLS LAST, l.created_at ASC`,
      args,
    );

    const items = rows.map((r) => this.serialize(r));
    return {
      items,
      summary: {
        count: items.length,
        complete: items.filter((i) => i.status === 'complete').length,
        incomplete: items.filter((i) => i.status === 'incomplete').length,
        exempt: items.filter((i) => i.status === 'exempt').length,
      },
    };
  }

  /** 회원 본인 조회. (user_id, organization_id) 복합 조건 — user_id 단독 조회 금지 */
  static async listMine(params: { organizationId: string; userId: string }): Promise<EducationCreditItem[]> {
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `${this.SELECT} WHERE l.user_id = $1 AND l.organization_id = $2 ORDER BY l.year DESC`,
      [params.userId, params.organizationId],
    );
    return rows.map((r) => this.serialize(r));
  }

  /**
   * 연도 개설 — 이 분회 active 소속 회원 전원에게 그 해 원장을 만든다.
   *
   * 정책 테이블을 만들지 않았다 (WO §3 최소): 의무평점은 개설할 때 한 숫자로 받는다.
   * 회원마다 다른 의무평점은 개별 PATCH 로 조정한다.
   *
   * 멱등이다 — 이미 행이 있는 회원은 건너뛴다(`ALREADY_OPEN`).
   * 재실행이 이미 입력한 인정평점을 지우거나 의무평점을 소급 변경하지 않는다.
   */
  static async openYear(params: {
    organizationId: string;
    year: number;
    requiredCredits: unknown;
    actorUserId: string;
  }): Promise<{ created: number; skipped: EducationOpenSkip[]; targetCount: number }> {
    const year = this.assertYear(params.year);
    const required = this.assertCredit(params.requiredCredits, '의무평점');
    if (required <= 0) {
      throw new BranchEducationCreditError(
        'CREDIT_VALUE_INVALID',
        '의무평점은 0보다 커야 합니다. 이수 의무가 없으면 개별 면제로 처리해 주세요.',
        422,
      );
    }

    const targets: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT bm.user_id, (l.id IS NOT NULL) AS already
         FROM branch_memberships bm
         LEFT JOIN branch_education_credit_ledgers l
                ON l.user_id = bm.user_id AND l.organization_id = bm.organization_id AND l.year = $2
        WHERE bm.organization_id = $1 AND bm.status = 'active'`,
      [params.organizationId, year],
    );

    const skipped: EducationOpenSkip[] = [];
    const toCreate: string[] = [];
    for (const t of targets) {
      if (t.already === true) skipped.push({ userId: t.user_id, reason: 'ALREADY_OPEN' });
      else toCreate.push(t.user_id);
    }

    let created = 0;
    if (toCreate.length) {
      await AppDataSource.transaction(async (manager) => {
        for (const userId of toCreate) {
          // 동시 실행 대비 — UNIQUE 충돌은 "이미 개설됨"이므로 조용히 넘긴다
          const res = await manager.query(
            `INSERT INTO branch_education_credit_ledgers
               (organization_id, user_id, year, required_credits, completed_credits, updated_by)
             VALUES ($1, $2, $3, $4, 0, $5)
             ON CONFLICT (organization_id, user_id, year) DO NOTHING
             RETURNING id`,
            [params.organizationId, userId, year, required, params.actorUserId],
          );
          if (Array.isArray(res) && res.length) created += 1;
        }
      });
    }

    return { created, skipped, targetCount: targets.length };
  }

  /**
   * 개별 수정 — 의무평점 / 인정평점 / 면제·유예 / 메모.
   *
   * **status 를 받지 않는다.** DB generated column 이 정하므로 보낼 값 자체가 없다.
   * 조회 조건은 항상 (id, organization_id) 복합이다.
   */
  static async update(params: {
    ledgerId: string;
    organizationId: string;
    actorUserId: string;
    patch: Record<string, unknown>;
  }): Promise<EducationCreditItem> {
    const repo = AppDataSource.getRepository(BranchEducationCreditLedger);
    const row = await repo.findOne({
      where: { id: params.ledgerId, organization_id: params.organizationId },
    });
    if (!row) {
      throw new BranchEducationCreditError('LEDGER_NOT_FOUND', '연수교육 원장을 찾을 수 없습니다.', 404);
    }

    const p = params.patch ?? {};

    const required =
      p.requiredCredits === undefined
        ? Number(row.required_credits)
        : this.assertCredit(p.requiredCredits, '의무평점');
    const completed =
      p.completedCredits === undefined
        ? Number(row.completed_credits)
        : this.assertCredit(p.completedCredits, '인정평점');

    let exemptionType = row.exemption_type;
    if (p.exemptionType !== undefined) {
      if (p.exemptionType === null || p.exemptionType === '') {
        exemptionType = null;
      } else {
        const v = String(p.exemptionType);
        if (!EXEMPTION_TYPES.includes(v as EducationExemptionType)) {
          throw new BranchEducationCreditError(
            'CREDIT_VALUE_INVALID',
            '면제 구분은 면제(exempt) 또는 유예(deferred)여야 합니다.',
            422,
          );
        }
        exemptionType = v as EducationExemptionType;
      }
    }

    // 면제를 풀면 이수 의무가 되살아난다 — 채울 수 없는 0평점 행을 남기지 않는다
    if (exemptionType === null && required <= 0) {
      throw new BranchEducationCreditError(
        'CREDIT_VALUE_INVALID',
        '면제를 해제하려면 의무평점을 함께 입력해 주세요.',
        422,
      );
    }

    let memo = row.memo;
    if (p.memo !== undefined) {
      const v = typeof p.memo === 'string' ? p.memo.trim() : '';
      memo = v || null;
    }

    await AppDataSource.query(
      `UPDATE branch_education_credit_ledgers
          SET required_credits = $1, completed_credits = $2, exemption_type = $3,
              memo = $4, updated_by = $5, updated_at = now()
        WHERE id = $6 AND organization_id = $7`,
      [required, completed, exemptionType, memo, params.actorUserId, params.ledgerId, params.organizationId],
    );

    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `${this.SELECT} WHERE l.id = $1 AND l.organization_id = $2`,
      [params.ledgerId, params.organizationId],
    );
    return this.serialize(rows[0]);
  }

  /**
   * 신상신고 `training.*` 연동용 — 이 회원의 그 해 연수교육 원장 한 줄.
   *
   * 없으면 null 을 낸다. **의무평점 기본값을 지어내지 않는다** — 분회가 그 해를
   * 아직 개설하지 않았다면 "8평점"은 사실이 아니라 추측이다 (§4 가짜 값 금지).
   */
  static async resolveForReport(params: {
    organizationId: string;
    userId: string;
    year: number;
  }): Promise<{ year: number; requiredCredits: number; completedCredits: number; status: EducationCreditStatus } | null> {
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT year, required_credits, completed_credits, status
         FROM branch_education_credit_ledgers
        WHERE organization_id = $1 AND user_id = $2 AND year = $3
        LIMIT 1`,
      [params.organizationId, params.userId, params.year],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      year: Number(r.year),
      requiredCredits: Number(r.required_credits),
      completedCredits: Number(r.completed_credits),
      status: r.status,
    };
  }
}
