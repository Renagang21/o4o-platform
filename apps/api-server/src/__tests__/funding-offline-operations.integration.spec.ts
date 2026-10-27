import { AppDataSource } from "../database/connection.js";
import { MarketTrial } from "@o4o/market-trial";
import { marketTrialNotification } from "../services/marketTrial.notification.js";
import { notificationService } from "../services/NotificationService.js";
import {
  readFundingParticipantActivity,
  readCurrentFundingParticipantIds,
} from "../services/funding/funding-participant-activity.service.js";
import { computeKpiSnapshot } from "../controllers/market-trial/marketTrialOperatorController.js";
import { listSupplierActiveFundings } from "../modules/neture/services/supplier-active-fundings.service.js";
import { DataSource } from "typeorm";
import { ActionLog } from "@o4o/action-log-core";
import { runCanonicalBootstrap } from "../database/bootstrap/bootstrap-runner.js";
import { INCREMENTAL_MIGRATIONS } from "../database/incremental/manifest.js";
import { EXPECTED_SCHEMA_STATES } from "../database/incremental/expected-schema-states.js";
import { computeSchemaFingerprint } from "../database/bootstrap/schema-fingerprint.js";
import { AddFundingOfflineState1792212000000 } from "../database/migrations/1792212000000-AddFundingOfflineState.js";
import {
  FundingOfflineOperationsService,
  readFundingAmounts,
} from "../services/funding/funding-offline-operations.service.js";
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
      // Later migrations now follow offline-state: down is not the previous manifest state.
      expect((await computeSchemaFingerprint(q)).hash).not.toBe(fp.hash);
      expect(
        await q.query(
          `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('market_trials','market_trial_participants') AND column_name='offlineState'`,
        ),
      ).toEqual([]);
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
      { version: 1, paymentStatus: "paid", paidAmount: 100 },
    );
    const state = await service.snapshot(trial);
    expect(Number(state.totals.netAmount)).toBe(100);
    expect(Number(state.trial.currentAmount)).toBe(100);
    expect(state.trial.status).toBe("recruiting");
    await expect(
      new FundingPaymentRecordService(db).update(trial, participant, actor, {
        version: 2,
        paymentStatus: "refunded",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "OFFLINE_REFUND_RECORD_REQUIRED",
    });
    expect(Number((await service.snapshot(trial)).totals.netAmount)).toBe(100);
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
      version: 2,
      reason: "참여자 철회 요청 확인",
    });
    await expect(
      service.update(trial, participant, actor, {
        action: "withdraw",
        version: 2,
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
    await refund(40, 3);
    expect(Number((await service.snapshot(trial)).totals.netAmount)).toBe(60);
    await expect(refund(101, 4)).rejects.toMatchObject({ status: 400 });
    await refund(100, 4);
    expect(Number((await service.snapshot(trial)).totals.netAmount)).toBe(0);
    expect((await service.snapshot(trial)).participants[0].paymentStatus).toBe(
      "refunded",
    );
    await refund(50, 5);
    expect(Number((await service.snapshot(trial)).totals.netAmount)).toBe(50);
    expect((await service.snapshot(trial)).participants[0].paymentStatus).toBe(
      "paid",
    );
    await expect(
      new FundingPaymentRecordService(db).update(trial, participant, actor, {
        version: 6,
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
      await expect(refund(60, 6)).rejects.toThrow("fixture audit unavailable");
    } finally {
      await db.query("DROP TRIGGER fixture_fail_offline ON action_logs");
      await db.query("DROP FUNCTION public.fail_offline_audit()");
    }
    const s = await service.snapshot(trial);
    expect(s.participants[0].offlineState.version).toBe(6);
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
        version: 6,
        amount: -1,
        reason: "잘못된 금액",
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.update(trial, participant, actor, {
        action: "refund",
        version: 6,
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
      payment.update(trial, participant, actor, {
        version: 6,
        paymentStatus: "unpaid",
      }),
    ).rejects.toMatchObject({ status: 409 });
    await payment.update(trial, participant, actor, {
      version: 6,
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
      version: 7,
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
    ).toBe(8);
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
    await db.query('UPDATE market_trials SET "currentAmount"=999 WHERE id=$1', [
      trial,
    ]);
    expect((await readFundingAmounts(db, [trial])).get(trial)).toBe(70);
    expect(
      Number(
        (
          await db.query(
            'SELECT "currentAmount" FROM market_trials WHERE id=$1',
            [trial],
          )
        )[0].currentAmount,
      ),
    ).toBe(999);
    const kpi = await computeKpiSnapshot(db, { supplierId: null });
    expect(kpi.failedTrials).toBe(1);
    expect(kpi.successfulTrials).toBe(1);
    expect(kpi.totalRecruitingAmount).toBe(70);
  });
  it("keeps withdrawn/stopped participants out of pledge reminders while retaining refund follow-up", async () => {
    for (const [status, closeReason, withdrawn, expected] of [
      ["development", null, false, true],
      ["development", null, true, false],
      ["closed", "operator_stopped", false, false],
      ["closed", "operator_target_missed", false, false],
    ] as const) {
      await db.query(
        'UPDATE market_trials SET status=$1,"closeReason"=$2 WHERE id=$3',
        [status, closeReason, trial],
      );
      await db.query(
        `UPDATE market_trial_participants SET "contributionAmount"=0,"offlineState"=jsonb_set("offlineState"-'pledgedAt','{withdrawn}',to_jsonb($1::boolean)) WHERE id=$2`,
        [withdrawn, participant],
      );
      const service = new FundingOperatorExceptionsService(db);
      expect(
        (await service.list({ type: "pledge_missing" })).items.some(
          (r: any) => r.participantId === participant,
        ),
      ).toBe(expected);
      expect(
        (await service.list({ type: "refund_pending" })).items.some(
          (r: any) => r.participantId === participant,
        ),
      ).toBe(!expected);
    }
  });
  it("separates active capacity from preserved participant history", async () => {
    const replacement = "60000000-0000-4000-8000-000000000001";
    await db.query(
      `INSERT INTO users(id,email,name) VALUES ($1,'replacement@example.invalid','격리 대체 참여자')`,
      [replacement],
    );
    await db.query(
      `UPDATE market_trials SET "currentParticipants"=1,"maxParticipants"=1 WHERE id=$1`,
      [trial],
    );
    await db.query(
      `UPDATE market_trial_participants SET "offlineState"=jsonb_set("offlineState",'{withdrawn}','true') WHERE id=$1`,
      [participant],
    );
    await db.query(
      `INSERT INTO market_trial_participants("marketTrialId","participantId","participantType","contributionAmount","rewardType","rewardStatus") VALUES ($1,$2,'store_owner',0,'product','pending')`,
      [trial, replacement],
    );
    const rows = await readFundingParticipantActivity(db, trial);
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => !r.withdrawn)).toHaveLength(1);
    expect(Number((await service.snapshot(trial)).totals.netAmount)).toBe(70);
  });
  it("rejects whole-trial stop after fulfillment while allowing participant corrections", async () => {
    await db.query(
      `UPDATE market_trials SET status='fulfilled',"closeReason"=NULL WHERE id=$1`,
      [trial],
    );
    const before = await service.snapshot(trial);
    await expect(
      service.update(trial, null, actor, {
        action: "stop",
        version: before.trial.offlineState.version,
        reason: "완료 후 중지 차단",
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await service.snapshot(trial)).trial.status).toBe("fulfilled");
    const target = before.participants.find((p) => p.id === participant);
    await service.update(trial, participant, actor, {
      action: "pledge",
      version: target.offlineState.version,
      amount: 100,
      reason: "완료 후 과거 약정 정정",
    });
    expect((await service.snapshot(trial)).trial.status).toBe("fulfilled");
  });
  it("surfaces legacy failed recruitment deposits for refund review and removes only the signal after refund", async () => {
    const id = "70000000-0000-4000-8000-000000000001",
      p = "80000000-0000-4000-8000-000000000001";
    await db.query(
      `INSERT INTO market_trials(id,title,status,"fundingStartAt","fundingEndAt","currentParticipants","supplierId","targetAmount","trialPeriodDays","trialUnitPrice","closeReason") VALUES ($1,'과거 실패 모집','closed',now(),now(),1,$2,200,30,100,'auto_target_missed')`,
      [id, actor],
    );
    await db.query(
      `INSERT INTO market_trial_participants(id,"marketTrialId","participantId","participantType","contributionAmount","paymentStatus","paidAmount","rewardStatus") VALUES ($1,$2,$3,'store_owner',200,'paid',100,'pending')`,
      [p, id, actor],
    );
    const exceptions = new FundingOperatorExceptionsService(db);
    expect(
      (await exceptions.list({})).items.find((r: any) => r.trialId === id)
        ?.types,
    ).toEqual(["refund_pending"]);
    expect(
      Number((await service.snapshot(id)).participants[0].refundPending),
    ).toBe(100);
    for (const type of [
      "payment_pending",
      "payment_failed",
      "amount_missing",
      "amount_mismatch",
      "fulfillment_pending",
      "pledge_missing",
      "fulfilled_without_payment",
    ]) {
      expect(
        (await exceptions.list({ type })).items.some(
          (r: any) => r.trialId === id,
        ),
      ).toBe(false);
    }
    await service.update(id, p, actor, {
      action: "refund",
      version: 0,
      amount: 100,
      processedAt: "2026-10-17T01:00:00Z",
      reason: "과거 건 오프라인 환급 확인",
    });
    expect(
      (await exceptions.list({ type: "refund_pending" })).items.some(
        (r: any) => r.trialId === id,
      ),
    ).toBe(false);
    expect((await service.snapshot(id)).participants[0].id).toBe(p);
  });
  it("notifies the current participant and creator without treating withdrawn history as a participant recipient", async () => {
    const recipients = await readCurrentFundingParticipantIds(db, trial);
    expect(recipients.map((r) => r.participantId)).toEqual([
      "60000000-0000-4000-8000-000000000001",
    ]);
    const repository = jest
      .spyOn(AppDataSource, "getRepository")
      .mockImplementation(((target: unknown) => {
        if (target !== MarketTrial)
          throw Error("Unexpected fixture repository");
        return {
          findOne: async () =>
            (
              await db.query("SELECT * FROM market_trials WHERE id=$1", [trial])
            )[0],
        };
      }) as any);
    const query = jest
      .spyOn(AppDataSource, "query")
      .mockImplementation(((sql: string, params: unknown[]) =>
        db.query(sql, params)) as any);
    const notify = jest
      .spyOn(notificationService, "createNotification")
      .mockResolvedValue({ id: "synthetic-notification" } as any);
    try {
      await marketTrialNotification.onRecruitingResult(trial, true, actor);
      expect(
        notify.mock.calls
          .filter(([input]) => !!input.metadata?.participantId)
          .map(([input]) => input.userId),
      ).toEqual(recipients.map((r) => r.participantId));
      expect(
        notify.mock.calls.some(
          ([input]) => input.userId === actor && !input.metadata?.participantId,
        ),
      ).toBe(true);
    } finally {
      notify.mockRestore();
      query.mockRestore();
      repository.mockRestore();
    }
  });
  it("allows one concurrent payment revision and rejects an offline action based on its old version", async () => {
    const t = "a0000000-0000-4000-8000-000000000001",
      p = "b0000000-0000-4000-8000-000000000001";
    await db.query(
      `INSERT INTO market_trials(id,title,status,"supplierId","targetAmount","trialPeriodDays","trialUnitPrice","fundingStartAt","fundingEndAt") VALUES ($1,'동시 수정 격리','recruiting',$2,100,30,100,now(),now()+interval '1 day')`,
      [t, actor],
    );
    await db.query(
      `INSERT INTO market_trial_participants(id,"marketTrialId","participantId","participantType","paymentStatus","rewardStatus","contributionAmount") VALUES ($1,$2,$3,'store_owner','unpaid','pending',0)`,
      [p, t, actor],
    );
    const payment = new FundingPaymentRecordService(db);
    const results = await Promise.allSettled(
      [100, 120].map((paidAmount) =>
        payment.update(t, p, actor, {
          version: 0,
          paymentStatus: "paid",
          paidAmount,
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      results
        .filter((r) => r.status === "rejected")
        .map((r: any) => r.reason.code),
    ).toEqual(["PAYMENT_VERSION_CONFLICT"]);
    const state = (await service.snapshot(t)).participants[0];
    expect(state.offlineState.version).toBe(1);
    await expect(
      payment.update(t, p, actor, { paymentStatus: "paid", paidAmount: 90 }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      payment.update(t, p, actor, {
        version: 0,
        paymentStatus: "paid",
        paidAmount: 90,
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service.update(t, p, actor, {
        version: 0,
        action: "withdraw",
        reason: "오래된 철회",
      }),
    ).rejects.toMatchObject({ status: 409 });
    await service.update(t, p, actor, {
      version: 1,
      action: "refund",
      amount: 20,
      processedAt: "2026-10-20T00:00:00Z",
      reason: "격리 환급",
    });
    await expect(
      payment.update(t, p, actor, {
        version: 1,
        paymentStatus: "paid",
        paidAmount: 90,
      }),
    ).rejects.toMatchObject({ status: 409 });
    const logs = await new FundingOperatorExceptionsService(db).history(t, p);
    expect(logs.items.map((row: any) => row.action)).toEqual([
      "funding.offline_operation",
      "neture.operator.market_trial_payment_change",
    ]);
    expect(logs.items[0]).toMatchObject({
      offlineAction: "refund",
      afterRefundAmount: "20",
    });
    expect(logs.hasMore).toBe(false);
    expect(Number((await service.snapshot(t)).participants[0].paidAmount)).toBe(
      Number(state.paidAmount),
    );
    await db.query(
      `CREATE FUNCTION public.fail_payment_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_key='neture.operator.market_trial_payment_change' THEN RAISE EXCEPTION 'fixture payment audit unavailable'; END IF; RETURN NEW; END $$`,
    );
    await db.query(
      `CREATE TRIGGER fixture_fail_payment BEFORE INSERT ON action_logs FOR EACH ROW EXECUTE FUNCTION public.fail_payment_audit()`,
    );
    try {
      await expect(
        payment.update(t, p, actor, {
          version: 2,
          paymentStatus: "paid",
          paidAmount: 150,
        }),
      ).rejects.toThrow("fixture payment audit unavailable");
    } finally {
      await db.query("DROP TRIGGER fixture_fail_payment ON action_logs");
      await db.query("DROP FUNCTION public.fail_payment_audit()");
    }
    const unchanged = (await service.snapshot(t)).participants[0];
    expect(unchanged.offlineState.version).toBe(2);
    expect(Number(unchanged.paidAmount)).toBe(Number(state.paidAmount));
    expect(
      (await new FundingOperatorExceptionsService(db).history(t, p)).items,
    ).toHaveLength(2);
  });
  it("pages unified and trial-level history beyond the old limits without exposing raw payment metadata", async () => {
    for (let n = 0; n < 61; n++) {
      await db.query(
        `INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta) VALUES('funding',$1,'funding.offline_operation','manual','success',$2::jsonb)`,
        [
          actor,
          JSON.stringify({
            trialId: trial,
            participantId: participant,
            action: "refund",
            reason: "합성 이력",
            before: { refundAmount: 0 },
            after: { refundAmount: 1 },
            paymentReference: "private-reference",
            paymentNote: "private-note",
          }),
        ],
      );
    }
    const history = new FundingOperatorExceptionsService(db);
    const first = await history.history(trial, participant),
      second = await history.history(trial, participant, 2);
    expect(first.items).toHaveLength(50);
    expect(first.hasMore).toBe(true);
    expect(second.items.length).toBeGreaterThan(0);
    expect(second.hasMore).toBe(false);
    expect(
      first.items.some((a: any) =>
        second.items.some((b: any) => a.id === b.id),
      ),
    ).toBe(false);
    expect(JSON.stringify([...first.items, ...second.items])).not.toContain(
      "private-reference",
    );
    expect(JSON.stringify(first.items)).not.toContain("private-note");
    const a = await service.snapshot(trial, 1, 1),
      b = await service.snapshot(trial, 1, 2),
      c = await service.snapshot(trial, 1, 3);
    expect(a.historyHasMore).toBe(true);
    expect(b.historyHasMore).toBe(true);
    expect(c.historyHasMore).toBe(false);
    expect(
      new Set(
        [...a.history, ...b.history, ...c.history].map((row: any) => row.id),
      ).size,
    ).toBe(a.history.length + b.history.length + c.history.length);
    await expect(service.snapshot(trial, 1, 0)).rejects.toMatchObject({
      status: 400,
    });
  });
});
