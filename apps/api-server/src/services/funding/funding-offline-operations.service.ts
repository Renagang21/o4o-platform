import type { DataSource, EntityManager } from "typeorm";
import { FundingError } from "./funding-workspace.service.js";
const active = ["recruiting", "development", "outcome_confirming", "fulfilled"];
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (status: number, message: string): never => {
  throw new FundingError(status, "OFFLINE_OPERATION_FAILED", message);
};
const money = (v: unknown) =>
  typeof v === "number" &&
  Number.isFinite(v) &&
  v >= 0 &&
  v <= 9999999999.99 &&
  /^\d+(\.\d{1,2})?$/.test(String(v));
const text = (v: unknown) => {
  if (
    typeof v !== "string" ||
    !v.trim() ||
    [...v.trim()].length > 2000 ||
    v.includes("\0")
  )
    return fail(400, "사유는 1~2,000자로 입력해 주세요.");
  return v.trim();
};
const secret = (value: unknown) => ({
  toPostgres: () => JSON.stringify(value),
  toJSON: () => "[redacted]",
});
export async function refreshFundingAmount(m: EntityManager, id: string) {
  await m.query(
    `UPDATE market_trials SET "currentAmount"=(SELECT COALESCE(SUM(GREATEST(COALESCE("paidAmount",0)-COALESCE(("offlineState"->>'refundAmount')::numeric,0),0)),0)
 FROM market_trial_participants WHERE "marketTrialId"=$1 AND "paymentStatus"='paid'),"updatedAt"=now() WHERE id=$1`,
    [id],
  );
}
export class FundingOfflineOperationsService {
  constructor(private readonly db: DataSource) {}
  async snapshot(id: string, page = 1, historyPage = 1) {
    if (
      !uuid.test(id) ||
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 10000 || !Number.isSafeInteger(historyPage) || historyPage < 1 || historyPage > 10000
    )
      return fail(400, "펀딩과 페이지를 확인해 주세요.");
    const [trial] = await this.db.query(
      'SELECT id,status,title,"targetAmount","currentAmount","closeReason","offlineState" FROM market_trials WHERE id=$1',
      [id],
    );
    if (!trial) return fail(404, "펀딩을 찾을 수 없습니다.");
    const rows = await this.db.query(
      `SELECT p.id,COALESCE(u.name,'참여자') AS name,p."contributionAmount",p."paymentStatus",p."paidAmount",p."offlineState",
   CASE WHEN p."paymentStatus"='paid' AND (COALESCE((p."offlineState"->>'withdrawn')::boolean,false) OR $2::boolean)
   THEN GREATEST(COALESCE(p."paidAmount",0)-COALESCE((p."offlineState"->>'refundAmount')::numeric,0),0) ELSE 0 END AS "refundPending"
   FROM market_trial_participants p LEFT JOIN users u ON u.id=p."participantId" WHERE p."marketTrialId"=$1 ORDER BY p."createdAt",p.id LIMIT 31 OFFSET $3`,
      [
        id,
        [
          "operator_stopped",
          "operator_target_missed",
          "auto_target_missed",
        ].includes(trial.closeReason),
        (page - 1) * 30,
      ],
    );
    const [totals] = await this.db.query(
      `SELECT COUNT(*) FILTER(WHERE COALESCE(("offlineState"->>'withdrawn')::boolean,false))::int AS "withdrawnCount",
   COALESCE(SUM(COALESCE(("offlineState"->>'refundAmount')::numeric,0)),0) AS "refundedAmount",
   COALESCE(SUM(CASE WHEN "paymentStatus"='paid' THEN GREATEST(COALESCE("paidAmount",0)-COALESCE(("offlineState"->>'refundAmount')::numeric,0),0) ELSE 0 END),0) AS "netAmount"
   FROM market_trial_participants WHERE "marketTrialId"=$1`,
      [id],
    );
    const history = await this.db.query(
      `SELECT id,user_id AS "actorId",created_at AS at,meta->>'participantId' AS "participantId",meta->>'action' AS action,
   meta->>'reason' AS reason,meta->'before' AS before,meta->'after' AS after FROM action_logs
   WHERE service_key='funding' AND action_key='funding.offline_operation' AND status='success' AND meta->>'trialId'=$1 ORDER BY created_at DESC,id DESC LIMIT 31 OFFSET $2`,
      [id, (historyPage - 1) * 30],
    );
    return {
      trial,
      totals,
      participants: rows.slice(0, 30),
      hasMore: rows.length > 30,
      page,
      history: history.slice(0, 30),
      historyPage,
      historyHasMore: history.length > 30,
    };
  }
  async update(
    id: string,
    participantId: string | null,
    actor: string,
    input: Record<string, unknown>,
  ) {
    if (
      !uuid.test(id) ||
      (participantId !== null &&
        (typeof participantId !== "string" || !uuid.test(participantId)))
    )
      return fail(400, "처리 대상을 확인해 주세요.");
    const reason = text(input.reason);
    if (!Number.isSafeInteger(input.version) || Number(input.version) < 0)
      return fail(400, "최신 현황을 다시 조회해 주세요.");
    return this.db.transaction(async (m) => {
      const [trial] = await m.query(
        'SELECT id,status,"statusHistory","offlineState" FROM market_trials WHERE id=$1 FOR UPDATE',
        [id],
      );
      if (!trial) return fail(404, "펀딩을 찾을 수 없습니다.");
      let before: Record<string, unknown>, after: Record<string, unknown>;
      if (participantId) {
        if (![...active, "closed"].includes(trial.status))
          return fail(409, "모집 시작 전 펀딩은 사후 처리할 수 없습니다.");
        const [p] = await m.query(
          'SELECT id,"offlineState","paidAmount","paymentStatus","contributionAmount" FROM market_trial_participants WHERE id=$1 AND "marketTrialId"=$2 FOR UPDATE',
          [participantId, id],
        );
        if (!p) return fail(404, "이 펀딩의 참여자를 찾을 수 없습니다.");
        before = p.offlineState;
        if (before.version !== input.version)
          return fail(409, "다른 처리가 반영됐습니다. 다시 조회해 주세요.");
        after = { ...before, version: Number(before.version) + 1 };
        if (input.action === "withdraw") {
          if (before.withdrawn)
            return fail(409, "이미 철회 처리된 참여자입니다.");
          after = {
            ...after,
            withdrawn: true,
            withdrawnAt: new Date().toISOString(),
            withdrawalReason: reason,
          };
          await m.query(
            'UPDATE market_trials SET "currentParticipants"=GREATEST("currentParticipants"-1,0) WHERE id=$1',
            [id],
          );
        } else if (input.action === "refund") {
          if (
            Number(input.amount) > 0 &&
            !["paid", "refunded"].includes(p.paymentStatus)
          ) {
            return fail(
              409,
              "입금 확인 상태와 실제 입금액을 먼저 확인·정정해 주세요.",
            );
          }
          if (
            !money(input.amount) ||
            Number(input.amount) > Number(p.paidAmount ?? 0)
          )
            return fail(
              400,
              "누적 환급액은 기록된 입금액 이내로 입력해 주세요.",
            );
          if (
            typeof input.processedAt !== "string" ||
            !/^\d{4}-\d{2}-\d{2}T/.test(input.processedAt) ||
            !Number.isFinite(Date.parse(input.processedAt))
          )
            return fail(400, "실제 환급 처리일을 확인해 주세요.");
          const d = input.processedAt.slice(0, 10),
            [y, mo, day] = d.split("-").map(Number);
          if (
            mo < 1 ||
            mo > 12 ||
            day < 1 ||
            day > new Date(Date.UTC(y, mo, 0)).getUTCDate()
          )
            return fail(400, "실제 환급 처리일을 확인해 주세요.");
          after = {
            ...after,
            refundAmount: input.amount,
            refundedAt: input.processedAt,
            refundReason: reason,
          };
          const status =
            Number(input.amount) > 0 &&
            Number(input.amount) === Number(p.paidAmount)
              ? "refunded"
              : p.paymentStatus === "refunded"
                ? "paid"
                : p.paymentStatus;
          await m.query(
            'UPDATE market_trial_participants SET "paymentStatus"=$1 WHERE id=$2',
            [status, participantId],
          );
        } else if (input.action === "pledge") {
          if (!money(input.amount))
            return fail(400, "약정 참여금액을 확인해 주세요.");
          after = {
            ...after,
            pledgedAt: new Date().toISOString(),
            pledgeReason: reason,
            contributionAmount: input.amount,
          };
          before = { ...before, contributionAmount: p.contributionAmount };
          await m.query(
            'UPDATE market_trial_participants SET "contributionAmount"=$1 WHERE id=$2',
            [input.amount, participantId],
          );
        } else return fail(400, "처리 종류를 확인해 주세요.");
        await m.query(
          'UPDATE market_trial_participants SET "offlineState"=$1::jsonb,"updatedAt"=now() WHERE id=$2',
          [secret(after), participantId],
        );
      } else {
        before = trial.offlineState;
        if (before.version !== input.version)
          return fail(409, "다른 처리가 반영됐습니다. 다시 조회해 주세요.");
        if (!active.includes(trial.status))
          return fail(409, "진행 중 펀딩만 처리할 수 있습니다.");
        const decision = input.action === "result";
        if (!decision && input.action !== "stop")
          return fail(400, "처리 종류를 확인해 주세요.");
        if (
          !decision &&
          !["recruiting", "development", "outcome_confirming"].includes(
            trial.status,
          )
        ) {
          return fail(
            409,
            "이행 완료된 펀딩은 중지가 아닌 정상 종료로 처리해 주세요.",
          );
        }
        if (
          decision &&
          (trial.status !== "recruiting" ||
            !["met", "not_met"].includes(String(input.decision)))
        )
          return fail(409, "모집 중 펀딩의 모금 결과를 확인해 주세요.");
        const next =
            decision && input.decision === "met" ? "development" : "closed",
          closeReason =
            next === "closed"
              ? decision
                ? "operator_target_missed"
                : "operator_stopped"
              : null;
        after = {
          ...before,
          version: Number(before.version) + 1,
          reason,
          processedAt: new Date().toISOString(),
          ...(decision ? { decision: input.decision } : { stopped: true }),
        };
        const event = {
          from: trial.status,
          to: next,
          at: new Date().toISOString(),
          reason: closeReason ?? "operator_target_confirmed",
          auto: false,
          actorUserId: actor,
        };
        await m.query(
          'UPDATE market_trials SET status=$1,"closeReason"=$2,"offlineState"=$3::jsonb,"statusHistory"=COALESCE("statusHistory",\'[]\'::jsonb)||$4::jsonb,"updatedAt"=now() WHERE id=$5',
          [next, closeReason, secret(after), JSON.stringify([event]), id],
        );
      }
      await refreshFundingAmount(m, id);
      await m.query(
        `INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta) VALUES('funding',$1,'funding.offline_operation','manual','success',$2::jsonb)`,
        [
          actor,
          secret({
            trialId: id,
            participantId,
            action: input.action,
            reason,
            before,
            after,
          }),
        ],
      );
      return { saved: true };
    });
  }
}

/** Read legacy and current ledgers without a GET-time backfill or lifecycle transition. */
export async function readFundingAmounts(db: DataSource, ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const rows = await db.query(
    `SELECT "marketTrialId" AS id,
    COALESCE(SUM(GREATEST(COALESCE("paidAmount",0)-COALESCE(("offlineState"->>'refundAmount')::numeric,0),0)),0) AS amount
    FROM market_trial_participants WHERE "marketTrialId"=ANY($1::uuid[]) AND "paymentStatus"='paid' GROUP BY "marketTrialId"`,
    [ids],
  );
  return new Map<string, number>(
    rows.map((row: { id: string; amount: string }) => [
      row.id,
      Number(row.amount),
    ]),
  );
}
