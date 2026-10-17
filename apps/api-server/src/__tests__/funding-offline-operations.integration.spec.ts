import { computeKpiSnapshot } from "../controllers/market-trial/marketTrialOperatorController.js";
import { listSupplierActiveFundings } from "../modules/neture/services/supplier-active-fundings.service.js";
import { DataSource } from "typeorm";
import { ActionLog } from "@o4o/action-log-core";
import { runCanonicalBootstrap } from "../database/bootstrap/bootstrap-runner.js";
import { INCREMENTAL_MIGRATIONS } from "../database/incremental/manifest.js";
import { EXPECTED_SCHEMA_STATES } from "../database/incremental/expected-schema-states.js";
import { computeSchemaFingerprint } from "../database/bootstrap/schema-fingerprint.js";
import { AddFundingOfflineState1792212000000 } from "../database/migrations/1792212000000-AddFundingOfflineState.js";
import { FundingOfflineOperationsService } from "../services/funding/funding-offline-operations.service.js";
import { FundingPaymentRecordService } from "../services/funding/funding-payment-record.service.js";
import { FundingOperatorExceptionsService } from "../services/funding/funding-operator-exceptions.service.js";

const fixture =
  process.env.O4O_FUNDING_OFFLINE_PORT === "55451" ? describe : describe.skip;
fixture("offline funding on disposable local PostgreSQL", () => {
  const name = `funding_offline_${process.pid}`;
  const actor = "10000000-0000-4000-8000-000000000001",
    trial = "20000000-0000-4000-8000-000000000001",
    participant = "30000000-0000-4000-8000-000000000001";
  let admin: DataSource,
    db: DataSource,
    service: FundingOfflineOperationsService;
  beforeAll(async () => {
    const config = {
      type: "postgres" as const,
      host: "127.0.0.1",
      port: 55451,
      username: "funding_fixture",
      database: "postgres",
    };
    admin = new DataSource(config);
    await admin.initialize();
    await admin.query(`CREATE DATABASE ${name}`);
    db = new DataSource({
      ...config,
      database: name,
      entities: [ActionLog],
      migrations: [...INCREMENTAL_MIGRATIONS],
      migrationsTableName: "typeorm_migrations",
    });
    await db.initialize();
    const q = db.createQueryRunner();
    await q.startTransaction();
    try {
      await runCanonicalBootstrap(q, {
        info: () => {},
        warn: () => {},
        error: () => {},
      });
      await q.commitTransaction();
    } catch (e) {
      await q.rollbackTransaction();
      throw e;
    } finally {
      await q.release();
    }
    await db.runMigrations({ transaction: "each" });
    service = new FundingOfflineOperationsService(db);
  }, 120000);
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    if (admin?.isInitialized) {
      await admin.query(`DROP DATABASE ${name}`);
      expect(
        await admin.query("SELECT datname FROM pg_database WHERE datname=$1", [
          name,
        ]),
      ).toEqual([]);
      await admin.destroy();
    }
  }, 60000);
  it("matches the registered schema, replays safely and round trips only the new migration", async () => {
    const q = db.createQueryRunner();
    await q.startTransaction();
    try {
      const fp = await computeSchemaFingerprint(q);
      expect(fp.hash).toBe(EXPECTED_SCHEMA_STATES.at(-1)!.fingerprint);
      expect(fp.lineCount).toBe(
        EXPECTED_SCHEMA_STATES.at(-1)!.fingerprintLineCount,
      );
      await new AddFundingOfflineState1792212000000().down(q);
      expect((await computeSchemaFingerprint(q)).hash).toBe(
        EXPECTED_SCHEMA_STATES.at(-2)!.fingerprint,
      );
      await new AddFundingOfflineState1792212000000().up(q);
      expect((await computeSchemaFingerprint(q)).hash).toBe(fp.hash);
    } finally {
      await q.rollbackTransaction();
      await q.release();
    }
    expect(await db.runMigrations({ transaction: "each" })).toEqual([]);
  });
  it("uses recorded deposits rather than pledges, and never auto-advances an expired recruitment", async () => {
    await db.query(
      `INSERT INTO users(id,email,name,"isActive",status) VALUES ($1,'operator@example.invalid','격리 운영자',true,'active')`,
      [actor],
    );
    await db.query(
      `INSERT INTO market_trials(id,title,status,"fundingStartAt","fundingEndAt","currentParticipants","supplierId","targetAmount","trialPeriodDays","trialUnitPrice") VALUES ($1,'격리 펀딩','recruiting',now()-interval '2 days',now()-interval '1 day',1,$2,100,30,100)`,
      [trial, actor],
    );
    await db.query(
      `INSERT INTO market_trial_participants(id,"marketTrialId","participantId","participantType","contributionAmount","paymentStatus","rewardStatus") VALUES ($1,$2,$3,'store_owner',0,'unpaid','pending')`,
      [participant, trial, actor],
    );
    await service.update(trial, participant, actor, {
      action: "pledge",
      amount: 100,
      version: 0,
      reason: "약정 확인",
    });
    expect(Number((await service.snapshot(trial)).totals.netAmount)).toBe(0);
    // A historical amount on a canceled/unpaid record is not a confirmed deposit.
    await db.query(
      'UPDATE market_trial_participants SET "paidAmount"=100 WHERE id=$1',
      [participant],
    );
    await expect(
      service.update(trial, participant, actor, {
        action: "refund",
        amount: 10,
        version: 1,
        processedAt: "2026-10-17T01:00:00Z",
        reason: "미확인 입금 환급 차단",
      }),
    ).rejects.toMatchObject({ status: 409 });
    await new FundingPaymentRecordService(db).update(
      trial,
      participant,
      actor,
      { paymentStatus: "paid", paidAmount: 100 },
    );
    const state = await service.snapshot(trial);
    expect(Number(state.totals.netAmount)).toBe(100);
    expect(Number(state.trial.currentAmount)).toBe(100);
    expect(state.trial.status).toBe("recruiting");
  });
  it("records an explicit result, rejects replay and stops without automatically refunding", async () => {
    await service.update(trial, null, actor, {
      action: "result",
      decision: "met",
      version: 0,
      reason: "오프라인 모금 확인",
    });
    await expect(
      service.update(trial, null, actor, {
        action: "result",
        decision: "met",
        version: 0,
        reason: "재전송",
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await service.snapshot(trial)).trial.status).toBe("development");
    await service.update(trial, null, actor, {
      action: "stop",
      version: 1,
      reason: "오프라인 사후 처리 예정",
    });
    const s = await service.snapshot(trial);
    expect(s.trial.closeReason).toBe("operator_stopped");
    expect(Number(s.totals.netAmount)).toBe(100);
    expect(Number(s.participants[0].refundPending)).toBe(100);
    const pending = await new FundingOperatorExceptionsService(db).list({
      type: "refund_pending",
    });
    expect(pending.items[0].participantId).toBe(participant);
    expect(
      (
        await new FundingOperatorExceptionsService(db).list({
          type: "payment_pending",
        })
      ).items,
    ).toEqual([]);
  });
  it("withdraws once and preserves the recorded money until an actual refund is recorded", async () => {
    await service.update(trial, participant, actor, {
      action: "withdraw",
      version: 1,
      reason: "참여자 철회 요청 확인",
    });
    await expect(
      service.update(trial, participant, actor, {
        action: "withdraw",
        version: 1,
        reason: "중복 철회",
      }),
    ).rejects.toMatchObject({ status: 409 });
    const s = await service.snapshot(trial);
    expect(s.participants[0].offlineState.withdrawn).toBe(true);
    expect(Number(s.totals.netAmount)).toBe(100);
    expect(
      (
        await db.query(
          'SELECT "currentParticipants" FROM market_trials WHERE id=$1',
          [trial],
        )
      )[0].currentParticipants,
    ).toBe(0);
  });
  const refund = (amount: number, version: number) =>
    service.update(trial, participant, actor, {
      action: "refund",
      version,
      amount,
      processedAt: "2026-10-17T01:00:00Z",
      reason: "오프라인 환급 확인·정정",
    });
  it("supports partial/full refund and correction without exceeding deposits", async () => {
    await refund(40, 2);
    expect(Number((await service.snapshot(trial)).totals.netAmount)).toBe(60);
    await expect(refund(101, 3)).rejects.toMatchObject({ status: 400 });
    await refund(100, 3);
    expect(Number((await service.snapshot(trial)).totals.netAmount)).toBe(0);
    expect((await service.snapshot(trial)).participants[0].paymentStatus).toBe(
      "refunded",
    );
    await refund(50, 4);
    expect(Number((await service.snapshot(trial)).totals.netAmount)).toBe(50);
    expect((await service.snapshot(trial)).participants[0].paymentStatus).toBe(
      "paid",
    );
    await expect(
      new FundingPaymentRecordService(db).update(trial, participant, actor, {
        paymentStatus: "paid",
        paidAmount: 40,
      }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("rolls back state and money when audit persistence fails", async () => {
    await db.query(
      `CREATE FUNCTION public.fail_offline_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_key='funding.offline_operation' THEN RAISE EXCEPTION 'fixture audit unavailable'; END IF; RETURN NEW; END $$`,
    );
    await db.query(
      `CREATE TRIGGER fixture_fail_offline BEFORE INSERT ON action_logs FOR EACH ROW EXECUTE FUNCTION public.fail_offline_audit()`,
    );
    try {
      await expect(refund(60, 5)).rejects.toThrow("fixture audit unavailable");
    } finally {
      await db.query("DROP TRIGGER fixture_fail_offline ON action_logs");
      await db.query("DROP FUNCTION public.fail_offline_audit()");
    }
    const s = await service.snapshot(trial);
    expect(s.participants[0].offlineState.version).toBe(5);
    expect(Number(s.totals.netAmount)).toBe(50);
    expect(Number(s.trial.currentAmount)).toBe(50);
  });
  it("rejects malformed and cross-project targets without a write", async () => {
    await expect(
      service.update(trial, actor, actor, {
        action: "withdraw",
        version: 0,
        reason: "다른 참여자",
      }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      service.update(trial, participant, actor, {
        action: "refund",
        version: 5,
        amount: -1,
        reason: "잘못된 금액",
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.update(trial, participant, actor, {
        action: "refund",
        version: 5,
        amount: 10,
        processedAt: "2026-02-30T00:00:00Z",
        reason: "잘못된 날짜",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect((await service.snapshot(trial)).history).toHaveLength(7);
  });
  it("keeps historical supplier-account identity over legacy user ownership without stopping funding", async () => {
    const supplier1 = "40000000-0000-4000-8000-000000000001",
      supplier2 = "40000000-0000-4000-8000-000000000002";
    const otherTrial = "50000000-0000-4000-8000-000000000001";
    await db.query(
      `INSERT INTO neture_suppliers(id,slug,status,user_id) VALUES ($1,'offline-supplier-one','ACTIVE',$3),($2,'offline-supplier-two','ACTIVE',NULL)`,
      [supplier1, supplier2, actor],
    );
    await db.query(
      `INSERT INTO market_trials(id,title,status,"fundingStartAt","fundingEndAt","currentParticipants","supplierId","targetAmount","trialPeriodDays","trialUnitPrice","statusHistory") VALUES ($1,'다른 공급 조직 펀딩','recruiting',now(),now(),0,$2,100,30,100,$3::jsonb)`,
      [
        otherTrial,
        actor,
        JSON.stringify([
          { reason: "funding_created", supplierAccountId: supplier2 },
        ]),
      ],
    );
    expect((await listSupplierActiveFundings(db, supplier1)).items).toEqual([]);
    expect(
      (await listSupplierActiveFundings(db, supplier2)).items.map(
        (r: any) => r.id,
      ),
    ).toEqual([otherTrial]);
    expect(
      (
        await db.query("SELECT status FROM market_trials WHERE id=$1", [
          otherTrial,
        ])
      )[0].status,
    ).toBe("recruiting");
  });
  it("preserves net deposits when correcting payment after a partial refund", async () => {
    const payment = new FundingPaymentRecordService(db);
    await expect(
      payment.update(trial, participant, actor, { paymentStatus: "unpaid" }),
    ).rejects.toMatchObject({ status: 409 });
    await payment.update(trial, participant, actor, {
      paymentStatus: "refunded",
      paidAmount: 120,
    });
    const state = await service.snapshot(trial);
    expect(state.participants[0].paymentStatus).toBe("paid");
    expect(Number(state.totals.netAmount)).toBe(70);
    expect(Number(state.trial.currentAmount)).toBe(70);
  });
  it("serializes concurrent requests so the same participant version can commit only once", async () => {
    const command = {
      action: "pledge",
      amount: 100,
      version: 5,
      reason: "동시 정정 검증",
    };
    const results = await Promise.allSettled([
      service.update(trial, participant, actor, command),
      service.update(trial, participant, actor, command),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      results
        .filter((r) => r.status === "rejected")
        .map((r: any) => r.reason.status),
    ).toEqual([409]);
    expect(
      (await service.snapshot(trial)).participants[0].offlineState.version,
    ).toBe(6);
  });
  it("closes a recruitment only after an explicit target-missed decision", async () => {
    const id = "50000000-0000-4000-8000-000000000001";
    await service.update(id, null, actor, {
      action: "result",
      decision: "not_met",
      version: 0,
      reason: "오프라인 모금 미달 확인",
    });
    expect((await service.snapshot(id)).trial).toMatchObject({
      status: "closed",
      closeReason: "operator_target_missed",
      offlineState: { decision: "not_met" },
    });
  });
  it("reports manually confirmed results and live net amounts in the existing KPI", async () => {
    const kpi = await computeKpiSnapshot(db, { supplierId: null });
    expect(kpi.failedTrials).toBe(1);
    expect(kpi.successfulTrials).toBe(1);
    expect(kpi.totalRecruitingAmount).toBe(70);
  });
});
