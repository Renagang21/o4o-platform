import type { DataSource, EntityManager } from "typeorm";
import { listSupplierOwnerUserIds } from "../middleware/supplier-context.resolver.js";
import {
  notificationEventHub,
  type NotificationEmitPayload,
} from "../../../services/forum/NotificationEventHub.js";
import logger from "../../../utils/logger.js";

export type SettlementNotificationState =
  | "pending"
  | "failed"
  | "delivered"
  | "legacy_unknown"
  | "not_applicable";
export interface SettlementNotificationStatus {
  settlementId: string;
  state: SettlementNotificationState;
  attempts: number;
  deliveredCount: number;
  lastErrorCode: string | null;
  deliveredAt: string | null;
  updatedAt: string | null;
}
export class SettlementNotificationError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}
const JOB_COLUMNS = `j.settlement_id AS "settlementId",j.state,j.attempts,j.delivered_count AS "deliveredCount",
  j.last_error_code AS "lastErrorCode",j.delivered_at AS "deliveredAt",j.updated_at AS "updatedAt"`;
function missing(
  id: string,
  state: "legacy_unknown" | "not_applicable",
): SettlementNotificationStatus {
  return {
    settlementId: id,
    state,
    attempts: 0,
    deliveredCount: 0,
    lastErrorCode: null,
    deliveredAt: null,
    updatedAt: null,
  };
}

/** Domain outbox: stored in-app notifications + completion are one transaction, SSE follows commit. */
export class SettlementNotificationService {
  constructor(private readonly db: DataSource) {}
  async getStatus(id: string): Promise<SettlementNotificationStatus> {
    const [row] = await this.db.query(
      `SELECT s.status,${JOB_COLUMNS} FROM neture_settlements s
      LEFT JOIN neture_settlement_notification_jobs j ON j.settlement_id=s.id WHERE s.id=$1`,
      [id],
    );
    if (!row) throw new SettlementNotificationError("NOT_FOUND", 404);
    if (row.status !== "paid") return missing(id, "not_applicable");
    return row.state ? this.status(row) : missing(id, "legacy_unknown");
  }
  async list(state: "pending" | "failed", page: number, limit: number) {
    const offset = (page - 1) * limit;
    const rows = await this.db.query(
      `SELECT ${JOB_COLUMNS},COALESCE(o.name,'공급자') AS "supplierName",s.period_start AS "periodStart",s.period_end AS "periodEnd"
      FROM neture_settlement_notification_jobs j JOIN neture_settlements s ON s.id=j.settlement_id AND s.status='paid'
      LEFT JOIN neture_suppliers supplier ON supplier.id=s.supplier_id LEFT JOIN organizations o ON o.id=supplier.organization_id
      WHERE j.state=$1 ORDER BY j.updated_at,j.settlement_id LIMIT $2 OFFSET $3`,
      [state, limit, offset],
    );
    const [count] = await this.db.query(
      `SELECT count(*)::int AS total FROM neture_settlement_notification_jobs j
      JOIN neture_settlements s ON s.id=j.settlement_id AND s.status='paid' WHERE j.state=$1`,
      [state],
    );
    return {
      items: rows.map((row: any) => ({ ...row, ...this.status(row) })),
      page,
      limit,
      total: Number(count.total),
    };
  }
  async retry(id: string): Promise<SettlementNotificationStatus> {
    const outcome = await this.db.transaction(async (manager) => {
      const [settlement] = await manager.query(
        "SELECT id,supplier_id,status FROM neture_settlements WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!settlement) throw new SettlementNotificationError("NOT_FOUND", 404);
      if (settlement.status !== "paid")
        throw new SettlementNotificationError("SETTLEMENT_NOT_PAID", 409);
      const [job] = await manager.query(
        `SELECT ${JOB_COLUMNS} FROM neture_settlement_notification_jobs j WHERE settlement_id=$1 FOR UPDATE`,
        [id],
      );
      if (!job)
        throw new SettlementNotificationError(
          "LEGACY_NOTIFICATION_UNKNOWN",
          409,
        );
      if (job.state === "delivered")
        return {
          job: this.status(job),
          events: [] as NotificationEmitPayload[],
        };
      const events: NotificationEmitPayload[] = [];
      let errorCode: string | null = null;
      await manager.query("SAVEPOINT settlement_notification_delivery");
      try {
        const recipients = [
          ...new Set(
            await listSupplierOwnerUserIds(manager, settlement.supplier_id),
          ),
        ];
        if (recipients.length === 0) errorCode = "NO_CURRENT_OWNER";
        else
          await recipients.reduce(
            (chain, userId) =>
              chain.then(async () => {
                events.push(await this.store(manager, userId, id));
              }),
            Promise.resolve(),
          );
      } catch {
        await manager.query(
          "ROLLBACK TO SAVEPOINT settlement_notification_delivery",
        );
        events.length = 0;
        errorCode = "NOTIFICATION_STORAGE_FAILED";
      }
      await manager.query("RELEASE SAVEPOINT settlement_notification_delivery");
      const [saved] = await manager.query(
        `WITH changed AS (UPDATE neture_settlement_notification_jobs j
        SET state=$2::varchar,attempts=attempts+1,delivered_count=$3,last_error_code=$4,
          delivered_at=CASE WHEN $2::varchar='delivered' THEN now() ELSE NULL END,updated_at=now()
        WHERE settlement_id=$1 RETURNING ${JOB_COLUMNS}) SELECT * FROM changed`,
        [id, errorCode ? "failed" : "delivered", events.length, errorCode],
      );
      return { job: this.status(saved), events };
    });
    // The transaction has committed. SSE failure never turns a durable notification into a failed job.
    for (const event of outcome.events) {
      try {
        notificationEventHub.emitNotification(event);
      } catch {
        logger.warn("[Settlement Notification] realtime hint unavailable");
      }
    }
    return outcome.job;
  }
  private async store(
    manager: EntityManager,
    userId: string,
    id: string,
  ): Promise<NotificationEmitPayload> {
    const metadata = {
      settlementId: id,
      status: "paid",
      targetUrl: "/supplier/settlements",
    };
    const [row] = await manager.query(
      `INSERT INTO notifications("userId",type,title,message,channel,"serviceKey",metadata,"isRead")
      VALUES($1,'settlement.paid','정산이 완료되었습니다','정산 지급이 완료되었습니다. 정산 내역에서 확인해 주세요.','in_app','neture',$2::jsonb,false)
      RETURNING id,"userId",type,title,message,"serviceKey",metadata,"createdAt"`,
      [userId, JSON.stringify(metadata)],
    );
    return row;
  }
  private status(row: any): SettlementNotificationStatus {
    return {
      settlementId: row.settlementId,
      state: row.state,
      attempts: Number(row.attempts),
      deliveredCount: Number(row.deliveredCount),
      lastErrorCode: row.lastErrorCode ?? null,
      deliveredAt: row.deliveredAt
        ? new Date(row.deliveredAt).toISOString()
        : null,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    };
  }
}
