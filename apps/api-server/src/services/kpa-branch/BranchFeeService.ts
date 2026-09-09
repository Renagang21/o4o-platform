/**
 * BranchFeeService — 분회 연회비 정책 · 원장
 * WO-O4O-KPA-BRANCH-ANNUAL-FEE-LEDGER-V1
 *
 * 이 파일이 회비의 **쓰기 경계**다. 다음 4가지를 서버에서만 결정한다.
 *
 *   1) 어느 분회인가 — 언제나 호출자(resolveBranch + requireBranchScope)가 확정한
 *      organizationId 다. body 의 값을 읽지 않는다 (CLAUDE.md §7 Guard Rule 1·4).
 *   2) 얼마를 부과하는가 — 정책(branch_fee_policies) × 회원의 회비구분.
 *      금액을 코드에 하드코딩하지 않는다.
 *   3) 상태는 무엇인가 — status 는 금액에서 파생한다. 'exempt' 만 운영자 판정이다.
 *      화면이 따로 계산하지 않도록 `deriveStatus` 하나만 쓴다.
 *   4) 누가 바꿨는가 — updated_by 에 운영자를 남긴다. 대상 회원이 아니다.
 *
 * 하지 않는 것 (WO 원칙):
 *   - 전국/지부/분회 배분을 계산하지 않는다. 부과액은 분회가 정한 한 숫자다.
 *   - 결제·송금·정산을 하지 않는다. 납부는 운영자가 기록하는 사실이다.
 *   - `kpa_members.fee_category` 에 되쓰지 않는다. 회비 원장은 회원 원장을 **읽기만** 한다.
 *   - 이미 만들어진 원장 행을 부과(assess)가 덮어쓰지 않는다 — 납부 기록 보호.
 */
import { AppDataSource } from '../../database/connection.js';
import { BranchFeePolicy } from '../../routes/kpa-branch/entities/branch-fee-policy.entity.js';
import { BranchFeeLedger } from '../../routes/kpa-branch/entities/branch-fee-ledger.entity.js';
import {
  FEE_EXEMPTION_TYPES,
  REPORTABLE_FEE_EXEMPTION_TYPES,
} from '../../routes/kpa-branch/entities/branch-fee-ledger.entity.js';
import type {
  BranchFeeStatus,
  BranchFeeExemptionType,
} from '../../routes/kpa-branch/entities/branch-fee-ledger.entity.js';
import type { KpaFeeCategory } from '../../routes/kpa/entities/kpa-member.entity.js';

export type FeeFailureCode =
  | 'LEDGER_NOT_FOUND'
  | 'POLICY_INVALID'
  | 'FEE_VALUE_INVALID'
  | 'YEAR_INVALID';

export class BranchFeeError extends Error {
  constructor(
    readonly code: FeeFailureCode,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/**
 * 부과액 상한 — 실수로 0 을 더 붙인 입력을 DB 까지 보내지 않는다.
 * 정책값이 아니라 입력 방어선이다 (연회비 1천만원은 오타로 본다).
 */
const AMOUNT_MAX = 10_000_000;

/** 회비구분 코드 최대 길이 — 컬럼 정의와 같은 값 */
const FEE_CATEGORY_MAX = 50;

/** 자유 면제사유 최대 길이 — 원장 기록이지 서술문이 아니다 */
const EXEMPTION_REASON_MAX = 500;

export interface FeePolicyItem {
  feeCategory: string;
  amount: number;
  memo: string | null;
}

export interface FeeLedgerItem {
  id: string;
  year: number;
  userId: string;
  memberName: string | null;
  memberEmail: string | null;
  feeCategory: string | null;
  assessedAmount: number;
  paidAmount: number;
  outstanding: number;
  paidAt: Date | null;
  status: BranchFeeStatus;
  /** 면제 사유 구분. status='exempt' 일 때만 값이 있다 */
  exemptionType: BranchFeeExemptionType | null;
  /**
   * 자유 사유 — `other` 일 때만. **운영자 응답에만 채운다.**
   * 회원 조회에서는 항상 null 이다 (WO §5 — 운영자 기록을 그대로 노출하지 않는다).
   */
  exemptionReason: string | null;
  memo: string | null;
  updatedAt: Date;
}

/** 부과를 건너뛴 회원 1명과 사유 */
export interface FeeAssessSkip {
  userId: string;
  reason: 'ALREADY_ASSESSED' | 'NO_FEE_CATEGORY' | 'NO_POLICY';
  feeCategory: string | null;
}

export class BranchFeeService {
  /**
   * status 는 여기서만 정한다.
   *
   * 면제는 금액으로 계산할 수 없는 **판정**이므로 별도 인자로 받는다.
   * 면제를 "부과액 0" 으로 표현하지 않는다 — 0원 부과와 면제는 다른 사실이고,
   * 나중에 면제를 풀었을 때 원래 부과액을 복원할 수 없게 된다.
   */
  static deriveStatus(assessed: number, paid: number, exempt: boolean): BranchFeeStatus {
    if (exempt) return 'exempt';
    if (paid <= 0) return 'unpaid';
    if (paid < assessed) return 'partial';
    return 'paid';
  }

  /**
   * `kpa_members.fee_category` → 신상신고 양식의 회비구분 코드(갑/을/병/정).
   *
   * 원장 코드는 A1_pharmacy_owner 처럼 세분류이고 양식은 A/B/C/D 4종이다.
   * 세분류의 첫 글자가 대분류다 (A1·A2 → A 갑). 매핑표를 따로 두지 않는 이유는
   * 회비 체계가 바뀌어 A3 가 생겨도 표를 고치지 않아도 되기 때문이다.
   * 첫 글자가 A~D 가 아니면 **추정하지 않고 null** 을 낸다 (가짜 값 금지).
   */
  static toReportFeeCode(feeCategory: string | null | undefined): 'A' | 'B' | 'C' | 'D' | null {
    const head = typeof feeCategory === 'string' ? feeCategory.trim().charAt(0).toUpperCase() : '';
    return head === 'A' || head === 'B' || head === 'C' || head === 'D' ? head : null;
  }

  private static assertYear(year: unknown): number {
    const y = Number(year);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      throw new BranchFeeError('YEAR_INVALID', '연도가 올바르지 않습니다.', 422);
    }
    return y;
  }

  private static assertAmount(value: unknown, label: string): number {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > AMOUNT_MAX) {
      throw new BranchFeeError(
        'FEE_VALUE_INVALID',
        `${label}은(는) 0 이상 ${AMOUNT_MAX.toLocaleString('ko-KR')}원 이하의 정수여야 합니다.`,
        422,
      );
    }
    return n;
  }

  // ── 정책 ──────────────────────────────────────────────────────────────────

  /** 분회 × 연도 정책. 없으면 빈 배열이다 (기본 금액을 지어내지 않는다) */
  static async listPolicies(params: { organizationId: string; year: number }): Promise<FeePolicyItem[]> {
    const year = this.assertYear(params.year);
    const rows = await AppDataSource.getRepository(BranchFeePolicy).find({
      where: { organization_id: params.organizationId, year },
      order: { fee_category: 'ASC' },
    });
    return rows.map((r) => ({ feeCategory: r.fee_category, amount: r.amount, memo: r.memo }));
  }

  /**
   * 연도 정책 일괄 저장. **보낸 목록이 그 연도 정책의 전부**가 된다
   * (빠진 구분은 삭제). 항목 단위 PATCH 를 만들지 않는 이유는 정책이 "표 한 장"이고
   * 부분 수정하면 화면과 DB 가 조용히 어긋나기 때문이다.
   *
   * 다른 연도는 건드리지 않는다 — 과거 부과 근거를 보존한다.
   */
  static async replacePolicies(params: {
    organizationId: string;
    year: number;
    items: unknown;
  }): Promise<FeePolicyItem[]> {
    const year = this.assertYear(params.year);
    const raw = Array.isArray(params.items) ? params.items : null;
    if (!raw) {
      throw new BranchFeeError('POLICY_INVALID', '정책 목록이 올바르지 않습니다.', 422);
    }

    const seen = new Set<string>();
    const items: FeePolicyItem[] = raw.map((it) => {
      const rec = (it ?? {}) as Record<string, unknown>;
      const feeCategory = typeof rec.feeCategory === 'string' ? rec.feeCategory.trim() : '';
      if (!feeCategory || feeCategory.length > FEE_CATEGORY_MAX) {
        throw new BranchFeeError('POLICY_INVALID', '회비구분이 올바르지 않습니다.', 422);
      }
      if (seen.has(feeCategory)) {
        throw new BranchFeeError('POLICY_INVALID', `회비구분이 중복됐습니다: ${feeCategory}`, 422);
      }
      seen.add(feeCategory);
      const memo = typeof rec.memo === 'string' && rec.memo.trim() ? rec.memo.trim() : null;
      return { feeCategory, amount: this.assertAmount(rec.amount, '부과액'), memo };
    });

    await AppDataSource.transaction(async (manager) => {
      await manager.query(`DELETE FROM branch_fee_policies WHERE organization_id = $1 AND year = $2`, [
        params.organizationId,
        year,
      ]);
      for (const it of items) {
        await manager.query(
          `INSERT INTO branch_fee_policies (organization_id, year, fee_category, amount, memo)
           VALUES ($1, $2, $3, $4, $5)`,
          [params.organizationId, year, it.feeCategory, it.amount, it.memo],
        );
      }
    });

    return this.listPolicies({ organizationId: params.organizationId, year });
  }

  // ── 원장 ──────────────────────────────────────────────────────────────────

  /**
   * 분회 × 연도 원장 목록. **언제나 organization_id 로 먼저 좁힌다** —
   * 다른 분회 회비는 필터 조합으로도 나올 수 없다 (§7 Guard Rule 1·3).
   */
  static async listLedgers(params: {
    organizationId: string;
    year: number;
    status?: BranchFeeStatus;
  }): Promise<{
    items: FeeLedgerItem[];
    summary: { assessed: number; paid: number; outstanding: number; count: number };
  }> {
    const year = this.assertYear(params.year);
    const args: unknown[] = [params.organizationId, year];
    let where = 'l.organization_id = $1 AND l.year = $2';
    if (params.status) {
      args.push(params.status);
      where += ` AND l.status = $${args.length}`;
    }

    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT l.id, l.year, l.user_id, l.fee_category, l.assessed_amount, l.paid_amount,
              l.paid_at, l.status, l.exemption_type, l.exemption_reason, l.memo, l.updated_at,
              u.name AS user_name, u.email AS user_email
         FROM branch_fee_ledgers l
         JOIN users u ON u.id = l.user_id
        WHERE ${where}
        ORDER BY u.name ASC NULLS LAST, l.created_at ASC`,
      args,
    );

    const items = rows.map((r) => this.serialize(r));
    const summary = items.reduce(
      (acc, it) => ({
        assessed: acc.assessed + it.assessedAmount,
        paid: acc.paid + it.paidAmount,
        outstanding: acc.outstanding + it.outstanding,
        count: acc.count + 1,
      }),
      { assessed: 0, paid: 0, outstanding: 0, count: 0 },
    );

    return { items, summary };
  }

  /** 회원 본인 조회. (user_id, organization_id) 복합 조건 — user_id 단독 조회 금지 */
  static async listMyLedgers(params: { organizationId: string; userId: string }): Promise<FeeLedgerItem[]> {
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT l.id, l.year, l.user_id, l.fee_category, l.assessed_amount, l.paid_amount,
              l.paid_at, l.status, l.exemption_type, l.exemption_reason, l.memo, l.updated_at,
              u.name AS user_name, u.email AS user_email
         FROM branch_fee_ledgers l
         JOIN users u ON u.id = l.user_id
        WHERE l.user_id = $1 AND l.organization_id = $2
        ORDER BY l.year DESC`,
      [params.userId, params.organizationId],
    );
    // 회원에게는 사유 '구분'까지만 낸다 — 자유 사유는 운영자 기록이다 (WO §5)
    return rows.map((r) => this.serialize(r, 'member'));
  }

  /**
   * @param audience 'operator' 만 자유 사유를 받는다. 회원에게는 사유 구분까지만 낸다 (WO §5).
   */
  private static serialize(r: Record<string, any>, audience: 'operator' | 'member' = 'operator'): FeeLedgerItem {
    const assessed = Number(r.assessed_amount ?? 0);
    const paid = Number(r.paid_amount ?? 0);
    return {
      id: r.id,
      year: Number(r.year),
      userId: r.user_id,
      memberName: r.user_name ?? null,
      memberEmail: r.user_email ?? null,
      feeCategory: r.fee_category ?? null,
      assessedAmount: assessed,
      paidAmount: paid,
      // 면제는 미수금이 아니다
      outstanding: r.status === 'exempt' ? 0 : Math.max(assessed - paid, 0),
      paidAt: r.paid_at ?? null,
      status: r.status,
      exemptionType: r.exemption_type ?? null,
      exemptionReason: audience === 'operator' ? (r.exemption_reason ?? null) : null,
      memo: r.memo ?? null,
      updatedAt: r.updated_at,
    };
  }

  /**
   * 연도 일괄 부과 — 이 분회의 **active 소속 회원** 전원에게 정책 기준으로 원장을 만든다.
   *
   * 멱등이다: 이미 행이 있는 회원은 건너뛴다. 재실행이 납부 기록을 지우지 않는다.
   * 금액을 다시 계산해 덮어쓰지도 않는다 — 부과 후 정책이 바뀌어도 이미 낸 사람의
   * 부과액이 소급 변경되면 안 된다. 개별 조정은 PATCH 로 한다.
   *
   * 회비구분이 없거나 해당 구분의 정책이 없으면 **부과하지 않고 사유를 돌려준다.**
   * 0원으로 만들어 넣지 않는다 (WO 원칙: 가짜 값 금지).
   */
  static async assessYear(params: {
    organizationId: string;
    year: number;
    actorUserId: string;
  }): Promise<{ created: number; skipped: FeeAssessSkip[]; targetCount: number }> {
    const year = this.assertYear(params.year);

    const policies = await this.listPolicies({ organizationId: params.organizationId, year });
    if (!policies.length) {
      throw new BranchFeeError('POLICY_INVALID', `${year}년 회비 정책이 없습니다. 먼저 정책을 등록해 주세요.`, 409);
    }
    const amountOf = new Map(policies.map((p) => [p.feeCategory, p.amount]));

    /**
     * 대상 = 이 분회 active 소속 회원. `kpa_members` 는 LEFT JOIN 이다 —
     * 회원 원장이 없어도 대상에서 빼지 않고 NO_FEE_CATEGORY 로 보고한다
     * (조용히 누락되면 운영자가 빠진 사람을 알 수 없다).
     */
    const targets: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT bm.user_id, m.fee_category,
              (l.id IS NOT NULL) AS already
         FROM branch_memberships bm
         LEFT JOIN kpa_members m ON m.user_id = bm.user_id
         LEFT JOIN branch_fee_ledgers l
                ON l.user_id = bm.user_id AND l.organization_id = bm.organization_id AND l.year = $2
        WHERE bm.organization_id = $1 AND bm.status = 'active'`,
      [params.organizationId, year],
    );

    const skipped: FeeAssessSkip[] = [];
    const toCreate: Array<{ userId: string; feeCategory: string; amount: number }> = [];

    for (const t of targets) {
      const feeCategory: string | null = t.fee_category ?? null;
      if (t.already === true) {
        skipped.push({ userId: t.user_id, reason: 'ALREADY_ASSESSED', feeCategory });
        continue;
      }
      if (!feeCategory) {
        skipped.push({ userId: t.user_id, reason: 'NO_FEE_CATEGORY', feeCategory: null });
        continue;
      }
      const amount = amountOf.get(feeCategory);
      if (amount === undefined) {
        skipped.push({ userId: t.user_id, reason: 'NO_POLICY', feeCategory });
        continue;
      }
      toCreate.push({ userId: t.user_id, feeCategory, amount });
    }

    let created = 0;
    if (toCreate.length) {
      await AppDataSource.transaction(async (manager) => {
        for (const c of toCreate) {
          /**
           * 정책 0원은 부과하되 상태를 'exempt' 로 둔다 — CHECK 제약이
           * assessed=0 인 unpaid 를 허용하지 않는다. "0원 부과 = 낼 것이 없다" 이므로
           * 미납 목록에 남기지 않는 편이 운영 실무에 맞다.
           */
          const status: BranchFeeStatus = c.amount > 0 ? 'unpaid' : 'exempt';
          /**
           * WO-O4O-KPA-BRANCH-FEE-EXEMPTION-REASON-LEDGER-V1:
           * exempt 행은 이제 사유가 필수다(CHK_branch_fee_ledgers_exemption_status).
           * 0원 정책 자동 부과는 미취업자도 회비면제자도 아니므로 `other` + 사실 그대로의
           * 사유를 남긴다. 운영자가 나중에 실제 사유로 바꿀 수 있다.
           */
          const exemptionType: BranchFeeExemptionType | null = status === 'exempt' ? 'other' : null;
          const exemptionReason = status === 'exempt' ? '정책 부과액 0원 (일괄 부과 자동 기록)' : null;
          // 동시 실행 대비 — UNIQUE 충돌은 "이미 부과됨"이므로 조용히 넘긴다
          const res = await manager.query(
            `INSERT INTO branch_fee_ledgers
               (organization_id, user_id, year, fee_category, assessed_amount, paid_amount, status,
                exemption_type, exemption_reason, updated_by)
             VALUES ($1, $2, $3, $4, $5, 0, $6, $7, $8, $9)
             ON CONFLICT (organization_id, user_id, year) DO NOTHING
             RETURNING id`,
            [
              params.organizationId, c.userId, year, c.feeCategory, c.amount, status,
              exemptionType, exemptionReason, params.actorUserId,
            ],
          );
          if (Array.isArray(res) && res.length) created += 1;
        }
      });
    }

    return { created, skipped, targetCount: targets.length };
  }

  /**
   * 개별 원장 수정 — 부과액 / 납부액 / 납부일 / 면제 / 메모 / 회비구분.
   *
   * status 를 직접 받지 않는다. 금액과 면제 여부에서 파생한다 (deriveStatus) —
   * 화면이 보낸 상태를 그대로 믿으면 "완납인데 납부액 0" 같은 행이 생긴다.
   * 조회 조건은 항상 (id, organization_id) 복합이다.
   */
  static async updateLedger(params: {
    ledgerId: string;
    organizationId: string;
    actorUserId: string;
    patch: Record<string, unknown>;
  }): Promise<FeeLedgerItem> {
    const repo = AppDataSource.getRepository(BranchFeeLedger);
    const row = await repo.findOne({
      where: { id: params.ledgerId, organization_id: params.organizationId },
    });
    if (!row) {
      throw new BranchFeeError('LEDGER_NOT_FOUND', '회비 원장을 찾을 수 없습니다.', 404);
    }

    const p = params.patch ?? {};

    const assessed =
      p.assessedAmount === undefined ? row.assessed_amount : this.assertAmount(p.assessedAmount, '부과액');
    const paid = p.paidAmount === undefined ? row.paid_amount : this.assertAmount(p.paidAmount, '납부액');
    const exempt = p.exempt === undefined ? row.status === 'exempt' : p.exempt === true;

    if (exempt && paid > 0) {
      throw new BranchFeeError('FEE_VALUE_INVALID', '납부액이 있는 회원은 면제로 지정할 수 없습니다.', 422);
    }
    if (!exempt && assessed === 0) {
      throw new BranchFeeError('FEE_VALUE_INVALID', '부과액이 0원이면 면제로 지정해 주세요.', 422);
    }

    const status = this.deriveStatus(assessed, paid, exempt);

    /**
     * 납부일은 납부액과 함께 움직인다.
     *   납부액 0  → 납부일 없음 (CHECK 제약)
     *   납부액 >0 → 보낸 값, 없으면 기존 값, 그것도 없으면 지금
     */
    let paidAt: Date | null = row.paid_at;
    if (paid === 0) {
      paidAt = null;
    } else if (p.paidAt !== undefined) {
      if (p.paidAt === null || p.paidAt === '') {
        paidAt = row.paid_at ?? new Date();
      } else {
        const d = new Date(String(p.paidAt));
        if (Number.isNaN(d.getTime())) {
          throw new BranchFeeError('FEE_VALUE_INVALID', '납부일이 올바르지 않습니다.', 422);
        }
        paidAt = d;
      }
    } else if (!paidAt) {
      paidAt = new Date();
    }

    let feeCategory = row.fee_category;
    if (p.feeCategory !== undefined) {
      const v = typeof p.feeCategory === 'string' ? p.feeCategory.trim() : '';
      if (v.length > FEE_CATEGORY_MAX) {
        throw new BranchFeeError('FEE_VALUE_INVALID', '회비구분이 올바르지 않습니다.', 422);
      }
      feeCategory = (v || null) as KpaFeeCategory | null;
    }

    let memo = row.memo;
    if (p.memo !== undefined) {
      const v = typeof p.memo === 'string' ? p.memo.trim() : '';
      memo = v || null;
    }

    /**
     * 면제 사유 (WO-O4O-KPA-BRANCH-FEE-EXEMPTION-REASON-LEDGER-V1).
     *
     * 면제가 아니면 **사유를 남기지 않고 지운다.** 면제를 해제했는데 "미취업 면제" 가
     * 남아 있으면 원장이 스스로 모순된다 (DB CHECK 도 같은 것을 강제한다).
     */
    let exemptionType: BranchFeeExemptionType | null = row.exemption_type;
    let exemptionReason: string | null = row.exemption_reason;

    if (!exempt) {
      exemptionType = null;
      exemptionReason = null;
    } else {
      if (p.exemptionType !== undefined) {
        const v = typeof p.exemptionType === 'string' ? p.exemptionType.trim() : '';
        if (!FEE_EXEMPTION_TYPES.includes(v as BranchFeeExemptionType)) {
          throw new BranchFeeError(
            'FEE_VALUE_INVALID',
            '면제 사유 구분은 미취업자(unemployed) · 회비면제자(exempted) · 기타(other) 중 하나여야 합니다.',
            422,
          );
        }
        exemptionType = v as BranchFeeExemptionType;
      }
      if (!exemptionType) {
        // 면제로 전환하는데 사유가 없다 — DB 가 거부하기 전에 422 로 알려준다
        throw new BranchFeeError('FEE_VALUE_INVALID', '면제로 지정하려면 면제 사유 구분을 선택해 주세요.', 422);
      }

      if (p.exemptionReason !== undefined) {
        const v = typeof p.exemptionReason === 'string' ? p.exemptionReason.trim() : '';
        exemptionReason = v || null;
      }
      if (exemptionType === 'other') {
        if (!exemptionReason) {
          throw new BranchFeeError('FEE_VALUE_INVALID', '기타 면제는 사유를 입력해 주세요.', 422);
        }
        if (exemptionReason.length > EXEMPTION_REASON_MAX) {
          throw new BranchFeeError(
            'FEE_VALUE_INVALID',
            `면제 사유는 ${EXEMPTION_REASON_MAX}자를 넘을 수 없습니다.`,
            422,
          );
        }
      } else {
        // 자유 사유는 other 전용이다 (CHK_branch_fee_ledgers_exemption_reason)
        exemptionReason = null;
      }
    }

    await AppDataSource.query(
      `UPDATE branch_fee_ledgers
          SET fee_category = $1, assessed_amount = $2, paid_amount = $3,
              paid_at = $4, status = $5, memo = $6,
              exemption_type = $7, exemption_reason = $8,
              updated_by = $9, updated_at = now()
        WHERE id = $10 AND organization_id = $11`,
      [
        feeCategory, assessed, paid, paidAt, status, memo,
        exemptionType, exemptionReason,
        params.actorUserId, params.ledgerId, params.organizationId,
      ],
    );

    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT l.id, l.year, l.user_id, l.fee_category, l.assessed_amount, l.paid_amount,
              l.paid_at, l.status, l.exemption_type, l.exemption_reason, l.memo, l.updated_at,
              u.name AS user_name, u.email AS user_email
         FROM branch_fee_ledgers l
         JOIN users u ON u.id = l.user_id
        WHERE l.id = $1 AND l.organization_id = $2`,
      [params.ledgerId, params.organizationId],
    );
    return this.serialize(rows[0]);
  }

  /**
   * 신상신고 `fee.exemptionType` 연동용 — 이 회원의 그 해 면제 사유 구분.
   * WO-O4O-KPA-BRANCH-FEE-EXEMPTION-REASON-LEDGER-V1
   *
   * 면제가 아니면 null 이다. 자유 사유(`exemption_reason`)는 **양식에 내보내지 않는다** —
   * 운영자 기록이지 신고 항목이 아니다.
   */
  static async resolveMemberFeeExemptionType(params: {
    organizationId: string;
    userId: string;
    year: number;
  }): Promise<BranchFeeExemptionType | null> {
    const rows: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT status, exemption_type FROM branch_fee_ledgers
        WHERE organization_id = $1 AND user_id = $2 AND year = $3 LIMIT 1`,
      [params.organizationId, params.userId, params.year],
    );
    const r = rows[0];
    if (!r || r.status !== 'exempt' || !r.exemption_type) return null;
    /**
     * 양식(`fee.exemptionType`)에 option 이 있는 코드만 낸다.
     * `other` 는 양식에 없으므로 **추정해서 다른 값으로 바꾸지 않고** 미연결로 둔다
     * (§4 가짜 값 금지 — `toReportFeeCode` 와 같은 판단).
     */
    return REPORTABLE_FEE_EXEMPTION_TYPES.includes(r.exemption_type as BranchFeeExemptionType)
      ? (r.exemption_type as BranchFeeExemptionType)
      : null;
  }

  /**
   * 신상신고 `fee.category` 연동용 — 이 회원의 그 해 회비구분.
   *
   * 우선순위: 그 연도 회비 원장 → 회원 원장(`kpa_members.fee_category`).
   * 회비 원장이 먼저인 이유는 **부과 시점의 스냅샷**이기 때문이다.
   * 둘 다 없으면 null 을 낸다 — 신상신고는 이를 '미연결'로 표시한다.
   */
  static async resolveMemberFeeCategory(params: {
    organizationId: string;
    userId: string;
    year: number;
  }): Promise<{ feeCategory: string | null; source: 'ledger' | 'member' | null }> {
    const ledger: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT fee_category FROM branch_fee_ledgers
        WHERE organization_id = $1 AND user_id = $2 AND year = $3 LIMIT 1`,
      [params.organizationId, params.userId, params.year],
    );
    if (ledger[0]?.fee_category) {
      return { feeCategory: ledger[0].fee_category, source: 'ledger' };
    }

    const member: Array<Record<string, any>> = await AppDataSource.query(
      `SELECT fee_category FROM kpa_members WHERE user_id = $1 LIMIT 1`,
      [params.userId],
    );
    if (member[0]?.fee_category) {
      return { feeCategory: member[0].fee_category, source: 'member' };
    }

    return { feeCategory: null, source: null };
  }
}
