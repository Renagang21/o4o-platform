import type { DataSource } from "typeorm";
import { FundingError } from "./funding-workspace.service.js";

// A trial reaches fulfillment obligations only after outcome confirmation. CLOSED alone is ambiguous
// (auto target-missed closes from recruiting), so closed trials qualify only via a recorded fulfilled→closed step.
const FULFILLMENT_STAGE_SQL = `(t.status IN ('outcome_confirming','fulfilled') OR (t.status = 'closed' AND COALESCE(t."statusHistory", '[]'::jsonb) @> '[{"from":"fulfilled","to":"closed"}]'::jsonb))`;

// These are review hints derived from the ledger, not new payment or trial states/deadlines.
export const FUNDING_EXCEPTION_SQL = {
  payment_pending: `COALESCE(p."paymentStatus", 'unpaid') IN ('unpaid','pending')`,
  payment_failed: `p."paymentStatus" = 'failed'`,
  amount_missing: `p."paymentStatus" = 'paid' AND p."paidAmount" IS NULL`,
  amount_mismatch: `p."paymentStatus" = 'paid' AND p."paidAmount" IS NOT NULL AND p."paidAmount" <> p."contributionAmount"`,
  fulfillment_pending: `p."paymentStatus" = 'paid' AND COALESCE(p."rewardStatus", 'pending') <> 'fulfilled' AND ${FULFILLMENT_STAGE_SQL}`,
  fulfilled_without_payment: `p."rewardStatus" = 'fulfilled' AND COALESCE(p."paymentStatus", 'unpaid') IN ('unpaid','pending','failed')`,
} as const;
export function fundingExceptionFilter(value: unknown) {
  if (value === undefined || value === "" || value === "all") return null;
  if (typeof value !== "string" || !Object.hasOwn(FUNDING_EXCEPTION_SQL, value))
    throw new FundingError(
      400,
      "INVALID_EXCEPTION_FILTER",
      "예외 조회 조건을 확인해 주세요.",
    );
  return value as keyof typeof FUNDING_EXCEPTION_SQL;
}
export class FundingOperatorExceptionsService {
  constructor(private readonly ds: DataSource) {}
  async list(input: Record<string, unknown>) {
    const type = fundingExceptionFilter(input.type);
    const page = Number(input.page ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000)
      throw new FundingError(
        400,
        "INVALID_EXCEPTION_PAGE",
        "페이지를 확인해 주세요.",
      );
    const entries = Object.entries(FUNDING_EXCEPTION_SQL);
    const conditions = type
      ? FUNDING_EXCEPTION_SQL[type]
      : entries.map(([, sql]) => `(${sql})`).join(" OR ");
    const flags = entries
      .map(([key, sql]) => `CASE WHEN ${sql} THEN '${key}' END`)
      .join(", ");
    const rows = await this.ds.query(
      `SELECT p.id AS "participantId", t.id AS "trialId", t.title AS "trialTitle", t.status AS "trialStatus",
      COALESCE(u.name, '참여자') AS "participantName", p."paymentStatus", p."rewardStatus", p."contributionAmount", p."paidAmount", p."updatedAt",
      array_remove(ARRAY[${flags}], NULL) AS types
      FROM market_trial_participants p JOIN market_trials t ON t.id = p."marketTrialId" LEFT JOIN users u ON u.id = p."participantId"
      WHERE t.status NOT IN ('draft','submitted') AND (${conditions})
      ORDER BY p."updatedAt" ASC, p.id ASC LIMIT 31 OFFSET $1`,
      [(page - 1) * 30],
    );
    return { items: rows.slice(0, 30), hasMore: rows.length > 30, page };
  }
  async history(trialId: string, participantId: string) {
    const [target] = await this.ds.query(
      'SELECT id FROM market_trial_participants WHERE id = $1 AND "marketTrialId" = $2',
      [participantId, trialId],
    );
    if (!target)
      throw new FundingError(
        404,
        "PARTICIPANT_NOT_FOUND",
        "이 펀딩의 참여자가 아닙니다.",
      );
    // Explicit field projection: never expose payment reference/note or arbitrary action-log metadata.
    return this.ds.query(
      `SELECT id, action_key AS action, user_id AS "actorId", created_at AS at,
      meta->>'beforeStatus' AS "beforeStatus", meta->>'afterStatus' AS "afterStatus",
      meta->>'beforeAmount' AS "beforeAmount", meta->>'afterAmount' AS "afterAmount",
      meta->'referenceChanged' AS "referenceChanged", meta->'noteChanged' AS "noteChanged"
      FROM action_logs WHERE service_key = 'neture' AND status = 'success' AND meta->>'trialId' = $1 AND meta->>'participantId' = $2
      AND action_key IN ('neture.operator.market_trial_payment_change','neture.operator.market_trial_reward_change')
      ORDER BY created_at DESC, id DESC LIMIT 50`,
      [trialId, participantId],
    );
  }
}
