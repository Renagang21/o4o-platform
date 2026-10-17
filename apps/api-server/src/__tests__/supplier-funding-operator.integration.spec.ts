import { DataSource } from "typeorm";
import { CreateSupplierReviewRequests1792193756961 } from "../database/migrations/1792193756961-CreateSupplierReviewRequests.js";
import { ActionLog } from "@o4o/action-log-core";
import { runCanonicalBootstrap } from "../database/bootstrap/bootstrap-runner.js";
import { INCREMENTAL_MIGRATIONS } from "../database/incremental/manifest.js";
import { EXPECTED_SCHEMA_STATES } from "../database/incremental/expected-schema-states.js";
import { computeSchemaFingerprint } from "../database/bootstrap/schema-fingerprint.js";
import { SupplierReviewRequestService } from "../modules/neture/services/supplier-review-request.service.js";
import { FundingOperatorExceptionsService } from "../services/funding/funding-operator-exceptions.service.js";
import { FundingRewardRecordService } from "../services/funding/funding-reward-record.service.js";

jest.setTimeout(60000);
const fixture =
  process.env.O4O_SUPPLIER_FUNDING_TEST_PORT === "55449"
    ? describe
    : describe.skip;
fixture("isolated supplier review and funding operations", () => {
  const name = `o4o_sf_operator_${process.pid}`;
  let admin: DataSource, db: DataSource;
  const ids = {
    actor: "10000000-0000-4000-8000-000000000001",
    other: "10000000-0000-4000-8000-000000000002",
    supplier: "20000000-0000-4000-8000-000000000001",
    supplier2: "20000000-0000-4000-8000-000000000002",
    trial: "30000000-0000-4000-8000-000000000001",
    participant: "40000000-0000-4000-8000-000000000001",
  };
  const prefixFingerprints: { hash: string; lineCount: number }[] = [];
  beforeAll(async () => {
    const config = {
      type: "postgres" as const,
      host: "127.0.0.1",
      port: 55449,
      username: "o4o_sf_fixture",
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
    const runner = db.createQueryRunner();
    await runner.startTransaction();
    try {
      await runCanonicalBootstrap(runner, {
        info: () => {},
        warn: () => {},
        error: () => {},
      });
      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
    // Apply incrementals one prefix at a time so every registered state k (= baseline + first k) is observed.
    for (let k = 0; k <= INCREMENTAL_MIGRATIONS.length; k++) {
      const step = new DataSource({
        ...config,
        database: name,
        migrations: INCREMENTAL_MIGRATIONS.slice(0, k),
        migrationsTableName: "typeorm_migrations",
      });
      await step.initialize();
      try {
        await step.runMigrations({ transaction: "each" });
        const stepRunner = step.createQueryRunner();
        await stepRunner.startTransaction();
        const { hash, lineCount } = await computeSchemaFingerprint(stepRunner);
        await stepRunner.rollbackTransaction();
        await stepRunner.release();
        prefixFingerprints.push({ hash, lineCount });
      } finally {
        await step.destroy();
      }
    }
    await db.runMigrations({ transaction: "each" });
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    if (admin?.isInitialized) {
      await admin.query(`DROP DATABASE ${name}`);
      await admin.destroy();
    }
  });
  it("matches every registered prefix fingerprint from the baseline through the final migration", () => {
    expect(prefixFingerprints).toEqual(
      EXPECTED_SCHEMA_STATES.map((s) => ({
        hash: s.fingerprint,
        lineCount: s.fingerprintLineCount,
      })),
    );
  });
  it("matches the registered schema fingerprint and reruns migrations without changes", async () => {
    const runner = db.createQueryRunner();
    await runner.startTransaction();
    const fp = await computeSchemaFingerprint(runner);
    await runner.rollbackTransaction();
    expect(fp.hash).toBe(EXPECTED_SCHEMA_STATES.at(-1)!.fingerprint);
    expect(fp.lineCount).toBe(
      EXPECTED_SCHEMA_STATES.at(-1)!.fingerprintLineCount,
    );
    const triggers = await db.query(`SELECT tgenabled FROM pg_trigger
      WHERE tgrelid='public.neture_supplier_review_requests'::regclass
      AND tgname='account_erasure_write_fence'`);
    expect(triggers).toEqual([{ tgenabled: "O" }]);
    expect(await db.runMigrations({ transaction: "each" })).toEqual([]);
    await runner.startTransaction();
    await new CreateSupplierReviewRequests1792193756961().down(runner);
    const previous = await computeSchemaFingerprint(runner);
    expect(previous.hash).toBe(EXPECTED_SCHEMA_STATES.at(-2)!.fingerprint);
    await new CreateSupplierReviewRequests1792193756961().up(runner);
    expect((await computeSchemaFingerprint(runner)).hash).toBe(fp.hash);
    await runner.rollbackTransaction();
    await runner.release();
  });
  it("supports request → supplier submit → operator resolution while preserving approval state", async () => {
    await db.query(
      `INSERT INTO users(id,email,name,"isActive",status) VALUES ($1,'actor@example.invalid','검증 운영자',true,'active'),($2,'owner@example.invalid','검증 공급자',true,'active')`,
      [ids.actor, ids.other],
    );
    await db.query(
      `INSERT INTO neture_suppliers(id,slug,status,user_id) VALUES ($1,'sf-fixture','PENDING',$3),($2,'sf-fixture-2','PENDING',NULL)`,
      [ids.supplier, ids.supplier2, ids.other],
    );
    const service = new SupplierReviewRequestService(db);
    const request = await service.create(ids.supplier, ids.actor, {
      items: ["business_registration"],
      note: "등록증 정보를 확인해 주세요.",
    });
    await expect(
      service.create(ids.supplier, ids.actor, {
        items: ["contact"],
        note: "중복 요청",
      }),
    ).rejects.toMatchObject({ code: "REVIEW_REQUEST_OPEN" });
    await expect(
      service.transition(ids.supplier2, request.id, ids.other, "submit", {
        version: 1,
        note: "다른 공급자 응답",
      }),
    ).rejects.toMatchObject({ code: "REVIEW_REQUEST_NOT_FOUND" });
    const submitted = await service.transition(
      ids.supplier,
      request.id,
      ids.other,
      "submit",
      { version: 1, note: "해당 서류를 수정했습니다." },
    );
    expect(submitted.state).toBe("submitted");
    expect((await service.queue("submitted", 1)).items[0]).toMatchObject({ supplier_id: ids.supplier, state: "submitted" });
    await expect(
      service.transition(ids.supplier, request.id, ids.other, "submit", {
        version: 1,
        note: "늦은 재시도",
      }),
    ).rejects.toMatchObject({ code: "REVIEW_REQUEST_CHANGED" });
    const resolved = await service.transition(
      ids.supplier,
      request.id,
      ids.actor,
      "resolve",
      { version: 2, note: "제출 내용을 확인했습니다." },
    );
    expect(resolved.state).toBe("resolved");
    expect(resolved.version).toBe(3);
    expect(
      (
        await db.query("SELECT status FROM neture_suppliers WHERE id = $1", [
          ids.supplier,
        ])
      )[0].status,
    ).toBe("PENDING");
    const own = await service.list(ids.supplier, 1, false);
    expect(own.current).toBeNull();
    expect(own.requests[0].requested_by).toBeUndefined();
    expect(own.actions).toEqual([]);
    expect(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM action_logs WHERE action_key LIKE 'neture.supplier.review_%'",
        )
      )[0].n,
    ).toBe(3);
  });
  it("serializes concurrent creation and retains only one open request", async () => {
    const service = new SupplierReviewRequestService(db);
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        service.create(ids.supplier, ids.actor, {
          items: ["contact"],
          note: "담당자 연락처 확인",
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM neture_supplier_review_requests WHERE supplier_id=$1 AND resolved_at IS NULL",
          [ids.supplier],
        )
      )[0].n,
    ).toBe(1);
  });
  it("audits fulfillment changes and derives amount/fulfillment exceptions without exposing private reference", async () => {
    await db.query(
      `INSERT INTO market_trials(id,title,status,"fundingStartAt","fundingEndAt","currentParticipants","supplierId","targetAmount","trialPeriodDays","trialUnitPrice") VALUES ($1,'검증 펀딩','outcome_confirming',now(),now(),1,$2,100,30,100)`,
      [ids.trial, ids.supplier],
    );
    await db.query(
      `INSERT INTO market_trial_participants(id,"marketTrialId","participantId","participantType","contributionAmount","paymentStatus","paidAmount","rewardStatus","paymentReference") VALUES ($1,$2,$3,'store_owner',100,'paid',90,'pending','private-fixture-reference')`,
      [ids.participant, ids.trial, ids.other],
    );
    const service = new FundingOperatorExceptionsService(db);
    const before = await service.list({ type: "amount_mismatch" });
    expect(before.items[0].types).toEqual(
      expect.arrayContaining(["amount_mismatch", "fulfillment_pending"]),
    );
    expect(before.items[0].paymentReference).toBeUndefined();
    await new FundingRewardRecordService(db).update(
      ids.trial,
      ids.participant,
      ids.actor,
      "fulfilled",
    );
    const after = await service.list({ type: "fulfillment_pending" });
    expect(after.items).toHaveLength(0);
    const history = await service.history(ids.trial, ids.participant);
    expect(history[0]).toMatchObject({
      beforeStatus: "pending",
      afterStatus: "fulfilled",
      actorId: ids.actor,
    });
    expect(JSON.stringify(history)).not.toContain("private-fixture-reference");
    await expect(
      service.history(ids.trial, ids.supplier),
    ).rejects.toMatchObject({ code: "PARTICIPANT_NOT_FOUND" });
  });
  it("distinguishes review hints without inventing due dates or flagging canceled/refunded records", async () => {
    const service = new FundingOperatorExceptionsService(db);
    for (const [payment, amount, reward, expected] of [
      ["pending", null, "pending", ["payment_pending"]],
      ["failed", null, "pending", ["payment_failed"]],
      ["paid", null, "pending", ["amount_missing", "fulfillment_pending"]],
      ["paid", 100, "fulfilled", []],
      [
        "unpaid",
        null,
        "fulfilled",
        ["payment_pending", "fulfilled_without_payment"],
      ],
      ["canceled", null, "pending", []],
      ["refunded", 100, "fulfilled", []],
    ] as const) {
      await db.query(
        'UPDATE market_trial_participants SET "paymentStatus"=$1,"paidAmount"=$2,"rewardStatus"=$3 WHERE id=$4',
        [payment, amount, reward, ids.participant],
      );
      const result = await service.list({});
      expect(result.items[0]?.types || []).toEqual([...expected]);
    }
  });
  it("rolls back both supplier response and reward changes when audit insertion fails", async () => {
    await db.query(
      `CREATE FUNCTION sf_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture audit blocked'; END; $$`,
    );
    await db.query(
      "CREATE TRIGGER sf_fail_audit BEFORE INSERT ON action_logs FOR EACH ROW EXECUTE FUNCTION sf_fail_audit()",
    );
    try {
      const [request] = await db.query(
        "SELECT id, version FROM neture_supplier_review_requests WHERE supplier_id=$1 AND resolved_at IS NULL",
        [ids.supplier],
      );
      await expect(
        new SupplierReviewRequestService(db).transition(
          ids.supplier,
          request.id,
          ids.other,
          "submit",
          { note: "rollback fixture", version: request.version },
        ),
      ).rejects.toThrow("fixture audit blocked");
      expect(
        (
          await db.query(
            "SELECT state FROM neture_supplier_review_requests WHERE id=$1",
            [request.id],
          )
        )[0].state,
      ).toBe("requested");
      await db.query(
        `UPDATE market_trial_participants SET "rewardStatus"='pending' WHERE id=$1`,
        [ids.participant],
      );
      await expect(
        new FundingRewardRecordService(db).update(
          ids.trial,
          ids.participant,
          ids.actor,
          "fulfilled",
        ),
      ).rejects.toThrow("fixture audit blocked");
      expect(
        (
          await db.query(
            'SELECT "rewardStatus" FROM market_trial_participants WHERE id=$1',
            [ids.participant],
          )
        )[0].rewardStatus,
      ).toBe("pending");
    } finally {
      await db.query("DROP TRIGGER sf_fail_audit ON action_logs");
      await db.query("DROP FUNCTION sf_fail_audit()");
    }
  });
  it("resolves only submitted requests and lets exactly one concurrent resolution win", async () => {
    const service = new SupplierReviewRequestService(db);
    const [open] = await db.query(
      "SELECT id, version, state FROM neture_supplier_review_requests WHERE supplier_id=$1 AND resolved_at IS NULL",
      [ids.supplier],
    );
    expect(open.state).toBe("requested");
    await expect(
      service.transition(ids.supplier, open.id, ids.actor, "resolve", {
        version: open.version,
        note: "제출 전 완료 시도",
      }),
    ).rejects.toMatchObject({ code: "REVIEW_REQUEST_NOT_SUBMITTED" });
    const [unchanged] = await db.query(
      "SELECT state, version, resolved_at, submitted_at FROM neture_supplier_review_requests WHERE id=$1",
      [open.id],
    );
    expect(unchanged).toMatchObject({ state: "requested", version: open.version, resolved_at: null, submitted_at: null });
    const audits = async () =>
      (
        await db.query(
          "SELECT count(*)::int AS n FROM action_logs WHERE action_key LIKE 'neture.supplier.review_%' AND meta->>'requestId' = $1",
          [open.id],
        )
      )[0].n;
    const auditsBefore = await audits();
    const submitted = await service.transition(ids.supplier, open.id, ids.other, "submit", {
      version: open.version,
      note: "보완 제출",
    });
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        service.transition(ids.supplier, open.id, ids.actor, "resolve", {
          version: submitted.version,
          note: "동시 검토 완료",
        }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: expect.objectContaining({ code: "REVIEW_REQUEST_CHANGED" }),
    });
    const [final] = await db.query(
      "SELECT state, version, submitted_at, resolved_at FROM neture_supplier_review_requests WHERE id=$1",
      [open.id],
    );
    expect(final.state).toBe("resolved");
    expect(final.version).toBe(submitted.version + 1);
    expect(final.submitted_at).not.toBeNull();
    expect(final.resolved_at).not.toBeNull();
    expect(await audits()).toBe(auditsBefore + 2);
  });
  it("keeps paid unfulfilled obligations after fulfilled → closed but not after a failed auto-close", async () => {
    const closedAfterFulfilled = "30000000-0000-4000-8000-000000000002";
    const autoClosed = "30000000-0000-4000-8000-000000000003";
    const fulfilledHistory = JSON.stringify([
      { from: "outcome_confirming", to: "fulfilled", at: "2026-10-01T00:00:00Z", reason: "operator_progress", auto: false },
      { from: "fulfilled", to: "closed", at: "2026-10-02T00:00:00Z", reason: "operator_progress", auto: false },
    ]);
    const autoHistory = JSON.stringify([
      { from: "recruiting", to: "closed", at: "2026-10-02T00:00:00Z", reason: "auto_target_missed", auto: true },
    ]);
    await db.query(
      `INSERT INTO market_trials(id,title,status,"fundingStartAt","fundingEndAt","currentParticipants","supplierId","targetAmount","trialPeriodDays","trialUnitPrice","statusHistory","closeReason")
       VALUES ($1,'이행 후 종료','closed',now(),now(),1,$3,100,30,100,$4::jsonb,NULL),
              ($2,'모집 실패 종료','closed',now(),now(),1,$3,100,30,100,$5::jsonb,'auto_target_missed')`,
      [closedAfterFulfilled, autoClosed, ids.supplier, fulfilledHistory, autoHistory],
    );
    await db.query(
      `INSERT INTO market_trial_participants(id,"marketTrialId","participantId","participantType","contributionAmount","paymentStatus","paidAmount","rewardStatus")
       VALUES ($1,$2,$4,'store_owner',100,'paid',100,'pending'),($3,$5,$4,'store_owner',100,'paid',100,'pending')`,
      [
        "40000000-0000-4000-8000-000000000002",
        closedAfterFulfilled,
        "40000000-0000-4000-8000-000000000003",
        ids.other,
        autoClosed,
      ],
    );
    const service = new FundingOperatorExceptionsService(db);
    const pending = await service.list({ type: "fulfillment_pending" });
    expect(pending.items.map((i: { trialId: string }) => i.trialId)).toContain(closedAfterFulfilled);
    expect(pending.items.map((i: { trialId: string }) => i.trialId)).not.toContain(autoClosed);
    const all = await service.list({});
    const byTrial = (id: string) => all.items.find((i: { trialId: string }) => i.trialId === id);
    expect(byTrial(closedAfterFulfilled)?.types).toEqual(["fulfillment_pending"]);
    expect(byTrial(autoClosed)).toBeUndefined();
    // A failed recruiting trial is not collection/fulfillment work in any filter.
    for (const [payment, amount, reward] of [
      ["unpaid", null, "pending"], ["pending", null, "pending"],
      ["failed", null, "pending"], ["paid", null, "pending"],
      ["paid", 50, "pending"], ["unpaid", null, "fulfilled"],
    ]) {
      await db.query(`UPDATE market_trial_participants SET "paymentStatus"=$1,
        "paidAmount"=$2,"rewardStatus"=$3 WHERE "marketTrialId"=$4`,
        [payment, amount, reward, autoClosed]);
      for (const type of [undefined, "payment_pending", "payment_failed", "amount_missing",
        "amount_mismatch", "fulfillment_pending", "fulfilled_without_payment"]) {
        expect((await service.list({type})).items.some(
          (row: {trialId: string}) => row.trialId === autoClosed)).toBe(false);
      }
    }

    await new FundingRewardRecordService(db).update(
      closedAfterFulfilled,
      "40000000-0000-4000-8000-000000000002",
      ids.actor,
      "fulfilled",
    );
    expect(
      (await service.list({ type: "fulfillment_pending" })).items.map((i: { trialId: string }) => i.trialId),
    ).not.toContain(closedAfterFulfilled);
  });
});
