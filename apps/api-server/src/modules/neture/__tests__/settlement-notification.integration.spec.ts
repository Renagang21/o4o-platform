import { DataSource } from "typeorm";
import { randomUUID } from "node:crypto";
import { SettlementNotificationService } from "../services/settlement-notification.service.js";
import { SettlementCommandService } from "../services/settlement-command.service.js";
import { notificationEventHub } from "../../../services/forum/NotificationEventHub.js";
import { CreateSettlementNotificationJobs1793087685658 } from "../../../database/migrations/1793087685658-CreateSettlementNotificationJobs.js";
const url = process.env.NETURE_SUPPLIER_STORE_IT_DATABASE_URL;
if (url) {
  const target = new URL(url);
  if (
    target.hostname !== "127.0.0.1" ||
    target.port !== "55432" ||
    target.pathname !== "/o4o_supplier_store_integration"
  )
    throw Error("Dedicated local fixture required");
}
const local = url ? describe : describe.skip;
local("settlement notification durable recovery — canonical PostgreSQL", () => {
  let ds: DataSource,
    service: SettlementNotificationService,
    command: SettlementCommandService,
    supplier: string,
    org: string,
    owners: string[],
    id: string;
  let emit: jest.SpyInstance;
  const tag = randomUUID();
  let seq = 0;
  beforeAll(async () => {
    ds = new DataSource({
      type: "postgres",
      url,
      entities: [],
      logging: false,
    });
    await ds.initialize();
    const [marker] = await ds.query(
      "SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()",
    );
    if (!marker?.marker?.startsWith("supplier-store-fixture:"))
      throw Error("Fixture ownership required");
    owners = [];
    for (const label of ["a", "b"]) {
      const [u] = await ds.query(
        `INSERT INTO users(email,status,"isActive","isEmailVerified") VALUES($1,'active',true,true) RETURNING id`,
        [`notification-${label}-${tag}@example.test`],
      );
      owners.push(u.id);
    }
    const [organization] = await ds.query(
      "INSERT INTO organizations(name,code,type) VALUES('Synthetic notification supplier',$1,'supplier') RETURNING id",
      ["notification-" + tag],
    );
    org = organization.id;
    for (const owner of owners)
      await ds.query(
        "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')",
        [org, owner],
      );
    const [s] = await ds.query(
      "INSERT INTO neture_suppliers(slug,status,organization_id) VALUES($1,'ACTIVE',$2) RETURNING id",
      ["notify-" + tag, org],
    );
    supplier = s.id;
    service = new SettlementNotificationService(ds);
    command = new SettlementCommandService(ds);
    emit = jest
      .spyOn(notificationEventHub, "emitNotification")
      .mockImplementation(() => {});
  });
  beforeEach(async () => {
    emit.mockClear();
    emit.mockImplementation(() => {});
    const start = new Date(Date.UTC(2026, seq++, 1)).toISOString().slice(0, 10);
    const [row] = await ds.query(
      "INSERT INTO neture_settlements(supplier_id,period_start,period_end,status,notes,total_sales,platform_fee,supplier_amount) VALUES($1,$2::date,$2::date+27,'approved','Fixture notes',10000,1000,9000) RETURNING id",
      [supplier, start],
    );
    id = row.id;
  });
  afterEach(async () => {
    await ds.query(
      "DROP TRIGGER IF EXISTS notification_fixture_failure ON notifications",
    );
    await ds.query(
      "DROP FUNCTION IF EXISTS public.notification_fixture_failure()",
    );
    await ds.query('DELETE FROM notifications WHERE "userId"=ANY($1::uuid[])', [
      owners,
    ]);
    await ds.query("DELETE FROM neture_settlements WHERE id=$1", [id]);
    await ds.query(
      "UPDATE organization_members SET left_at=null WHERE organization_id=$1",
      [org],
    );
  });
  afterAll(async () => {
    emit?.mockRestore();
    if (ds?.isInitialized) {
      await ds.query(
        "DELETE FROM organization_members WHERE organization_id=$1",
        [org],
      );
      await ds.query("DELETE FROM neture_suppliers WHERE id=$1", [supplier]);
      await ds.query("DELETE FROM organizations WHERE id=$1", [org]);
      await ds.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [owners]);
      await ds.destroy();
    }
  });
  async function pending() {
    await ds.query(
      "UPDATE neture_settlements SET status='paid',paid_at=now() WHERE id=$1",
      [id],
    );
    await ds.query(
      "INSERT INTO neture_settlement_notification_jobs(settlement_id) VALUES($1)",
      [id],
    );
  }
  async function notifications() {
    return ds.query(
      "SELECT * FROM notifications WHERE metadata->>'settlementId'=$1 ORDER BY \"userId\"",
      [id],
    );
  }
  async function failSecond() {
    await ds.query(
      `CREATE FUNCTION public.notification_fixture_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."userId"='${owners[1]}'::uuid AND NEW.type='settlement.paid' THEN RAISE EXCEPTION 'synthetic fixture storage failure'; END IF;RETURN NEW;END $$`,
    );
    await ds.query(
      "CREATE TRIGGER notification_fixture_failure BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION public.notification_fixture_failure()",
    );
  }
  it("commits paid and pending together even when the initial worker stops, then recovers without changing settlement values", async () => {
    const stopped = jest
      .spyOn(SettlementNotificationService.prototype, "retry")
      .mockRejectedValueOnce(Error("fixture interruption"));
    try {
      expect(await command.paySettlement(id)).toMatchObject({ success: true });
    } finally {
      stopped.mockRestore();
    }
    expect(await service.getStatus(id)).toMatchObject({
      state: "pending",
      attempts: 0,
    });
    expect(await notifications()).toHaveLength(0);
    const [before] = await ds.query(
      "SELECT * FROM neture_settlements WHERE id=$1",
      [id],
    );
    expect(await service.retry(id)).toMatchObject({
      state: "delivered",
      attempts: 1,
      deliveredCount: 2,
    });
    expect(
      (await ds.query("SELECT * FROM neture_settlements WHERE id=$1", [id]))[0],
    ).toEqual(before);
    expect(await command.paySettlement(id)).toBeNull();
  });
  it("stores both canonical owners with minimal metadata and publishes SSE only after commit", async () => {
    await pending();
    let committed = false;
    const proxy = new Proxy(ds, {
      get: (target, key) =>
        key === "transaction"
          ? async (callback: any) => {
              const result = await target.transaction(callback);
              committed = true;
              return result;
            }
          : typeof (target as any)[key] === "function"
            ? (target as any)[key].bind(target)
            : (target as any)[key],
    });
    emit.mockImplementation(() => expect(committed).toBe(true));
    expect(
      await new SettlementNotificationService(proxy).retry(id),
    ).toMatchObject({ state: "delivered", deliveredCount: 2 });
    const rows = await notifications();
    expect(rows.map((r) => r.userId).sort()).toEqual([...owners].sort());
    for (const row of rows) {
      expect(row).toMatchObject({
        type: "settlement.paid",
        channel: "in_app",
        serviceKey: "neture",
        isRead: false,
        metadata: {
          settlementId: id,
          status: "paid",
          targetUrl: "/supplier/settlements",
        },
      });
      expect(Object.keys(row.metadata).sort()).toEqual([
        "settlementId",
        "status",
        "targetUrl",
      ]);
    }
    expect(emit).toHaveBeenCalledTimes(2);
  });
  it("serializes concurrent retries, and a later deletion of notifications never recreates them", async () => {
    await pending();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => service.retry(id)),
    );
    expect(
      results.every((r) => r.state === "delivered" && r.attempts === 1),
    ).toBe(true);
    expect(await notifications()).toHaveLength(2);
    expect(emit).toHaveBeenCalledTimes(2);
    await ds.query(
      "DELETE FROM notifications WHERE metadata->>'settlementId'=$1",
      [id],
    );
    expect(await service.retry(id)).toMatchObject({
      state: "delivered",
      attempts: 1,
    });
    expect(await notifications()).toHaveLength(0);
  });
  it("rolls back partial storage, persists a fixed failure and retries every recipient exactly once", async () => {
    await pending();
    await failSecond();
    expect(await service.retry(id)).toMatchObject({
      state: "failed",
      attempts: 1,
      lastErrorCode: "NOTIFICATION_STORAGE_FAILED",
      deliveredCount: 0,
    });
    expect(await notifications()).toHaveLength(0);
    expect(emit).not.toHaveBeenCalled();
    await ds.query(
      "DROP TRIGGER notification_fixture_failure ON notifications",
    );
    await ds.query("DROP FUNCTION public.notification_fixture_failure()");
    expect(await service.retry(id)).toMatchObject({
      state: "delivered",
      attempts: 2,
      deliveredCount: 2,
      lastErrorCode: null,
    });
    expect(await notifications()).toHaveLength(2);
  });
  it("failure of the initial notification attempt preserves paid and a visible recoverable failure", async () => {
    await failSecond();
    expect(await command.paySettlement(id)).toMatchObject({ success: true });
    expect(await service.getStatus(id)).toMatchObject({
      state: "failed",
      lastErrorCode: "NOTIFICATION_STORAGE_FAILED",
    });
    expect(
      (
        await ds.query("SELECT status FROM neture_settlements WHERE id=$1", [
          id,
        ])
      )[0].status,
    ).toBe("paid");
    expect(await notifications()).toHaveLength(0);
  });
  it("resolves current owners at retry time and never delivers to a revoked owner", async () => {
    await pending();
    await ds.query(
      "UPDATE organization_members SET left_at=now() WHERE organization_id=$1 AND user_id=$2",
      [org, owners[1]],
    );
    expect(await service.retry(id)).toMatchObject({
      state: "delivered",
      deliveredCount: 1,
    });
    expect((await notifications()).map((r) => r.userId)).toEqual([owners[0]]);
  });
  it("reports no current owner without pretending it stored a notification", async () => {
    await pending();
    await ds.query(
      "UPDATE organization_members SET left_at=now() WHERE organization_id=$1",
      [org],
    );
    expect(await service.retry(id)).toMatchObject({
      state: "failed",
      lastErrorCode: "NO_CURRENT_OWNER",
      attempts: 1,
    });
    expect(await notifications()).toHaveLength(0);
  });
  it("SSE failure is not a storage failure and cannot cause duplicate in-app notifications", async () => {
    await pending();
    emit.mockImplementation(() => {
      throw Error("fixture SSE failure");
    });
    expect(await service.retry(id)).toMatchObject({ state: "delivered" });
    expect(await service.retry(id)).toMatchObject({
      state: "delivered",
      attempts: 1,
    });
    expect(await notifications()).toHaveLength(2);
  });
  it("keeps historical paid/untracked and unpaid states separate and refuses either retry", async () => {
    expect(await service.getStatus(id)).toMatchObject({
      state: "not_applicable",
    });
    await expect(service.retry(id)).rejects.toMatchObject({
      code: "SETTLEMENT_NOT_PAID",
    });
    await ds.query("UPDATE neture_settlements SET status='paid' WHERE id=$1", [
      id,
    ]);
    expect(await service.getStatus(id)).toMatchObject({
      state: "legacy_unknown",
    });
    await expect(service.retry(id)).rejects.toMatchObject({
      code: "LEGACY_NOTIFICATION_UNKNOWN",
    });
    expect(await notifications()).toHaveLength(0);
  });
  it("lists failed/pending independently of payment totals and rejects nonexistent targets", async () => {
    await pending();
    expect(
      (await service.list("pending", 1, 10)).items.some(
        (r: any) => r.settlementId === id,
      ),
    ).toBe(true);
    expect(
      (await service.list("failed", 1, 10)).items.some(
        (r: any) => r.settlementId === id,
      ),
    ).toBe(false);
    await expect(service.getStatus(randomUUID())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(service.retry(randomUUID())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("blocks migration rollback while any durable delivery proof exists", async () => {
    await pending();
    const q = ds.createQueryRunner();
    await q.startTransaction();
    try {
      await expect(
        new CreateSettlementNotificationJobs1793087685658().down(q),
      ).rejects.toThrow("SETTLEMENT_NOTIFICATION_HISTORY_MUST_BE_PRESERVED");
    } finally {
      await q.rollbackTransaction();
      await q.release();
    }
  });
  it("never commits paid without its queue when the schema is unavailable", async () => {
    await expect(
      ds.transaction(async (m) => {
        await m.query("DROP TABLE public.neture_settlement_notification_jobs");
        await m.query("SAVEPOINT before_pay");
        await expect(
          new SettlementCommandService(
            m as unknown as DataSource,
          ).paySettlement(id),
        ).rejects.toBeDefined();
        await m.query("ROLLBACK TO SAVEPOINT before_pay");
        expect(
          (
            await m.query("SELECT status FROM neture_settlements WHERE id=$1", [
              id,
            ])
          )[0].status,
        ).toBe("approved");
        throw Error("fixture rollback");
      }),
    ).rejects.toThrow("fixture rollback");
    expect(await service.getStatus(id)).toMatchObject({
      state: "not_applicable",
    });
  });
});
