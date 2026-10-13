import { DataSource } from "typeorm";
import { CreateAiUsageReservations1791870434349 } from "../database/migrations/1791870434349-CreateAiUsageReservations.js";
import { runCanonicalBootstrap } from "../database/bootstrap/bootstrap-runner.js";
import { classifyDatabaseState } from "../database/bootstrap/database-state.js";
import { INCREMENTAL_MIGRATIONS } from "../database/incremental/manifest.js";
import { computeSchemaFingerprint } from "../database/bootstrap/schema-fingerprint.js";
import { EXPECTED_SCHEMA_STATES } from "../database/incremental/expected-schema-states.js";
jest.setTimeout(30_000); // Full canonical bootstrap + 26 incremental migrations + classification.
const fixture =
  process.env.O4O_AI_QUOTA_TEST_PORT === "55447" ? describe : describe.skip;
fixture(
  "AI quota migration through isolated canonical bootstrap and TypeORM incremental runner",
  () => {
    let admin: DataSource, db: DataSource;
    const name = `o4o_aiquota_migrate_${process.pid}`;
    beforeAll(async () => {
      const config = {
        type: "postgres" as const,
        host: "127.0.0.1",
        port: 55447,
        username: "o4o_quota_fixture",
        database: "postgres",
      };
      admin = new DataSource(config);
      await admin.initialize();
      await admin.query(`CREATE DATABASE ${name}`);
      db = new DataSource({
        ...config,
        database: name,
        migrations: [...INCREMENTAL_MIGRATIONS],
        migrationsTableName: "typeorm_migrations",
      });
      await db.initialize();
    });
    afterAll(async () => {
      if (db?.isInitialized) await db.destroy();
      if (admin?.isInitialized) {
        await admin.query(`DROP DATABASE ${name}`);
        await admin.destroy();
      }
    });
    it("converges to the registered schema and reruns without applying migrations twice", async () => {
      const runner = db.createQueryRunner();
      await runner.startTransaction();
      expect((await classifyDatabaseState(runner)).state).toBe("FRESH_EMPTY");
      await runCanonicalBootstrap(runner, {
        info: () => {},
        warn: () => {},
        error: () => {},
      });
      await runner.commitTransaction();
      const applied = await db.runMigrations({ transaction: "each" });
      expect(applied).toHaveLength(INCREMENTAL_MIGRATIONS.length);
      expect(await db.runMigrations({ transaction: "each" })).toEqual([]);
      await runner.startTransaction();
      expect((await classifyDatabaseState(runner)).state).toBe("BOOTSTRAPPED");
      const fp = await computeSchemaFingerprint(runner);
      await runner.commitTransaction();
      const expected = EXPECTED_SCHEMA_STATES.at(-1)!;
      expect(fp.hash).toBe(expected.fingerprint);
      expect(fp.lineCount).toBe(expected.fingerprintLineCount);
      await runner.release();
      const precision = await db.query(
        "SELECT numeric_precision,numeric_scale FROM information_schema.columns WHERE table_name='ai_usage_aggregate' AND column_name='current_value'",
      );
      expect(precision[0]).toEqual({ numeric_precision: 20, numeric_scale: 8 });
    });

    async function archives(): Promise<string[]> {
      const rows = await db.query(
        "SELECT nspname FROM pg_namespace WHERE nspname ~ '^ai_usage_rollback_[a-f0-9]{32}$'",
      );
      return rows.map((row: { nspname: string }) => row.nspname).sort();
    }
    it("refuses rollback outside the TypeORM migration transaction before changing schema", async () => {
      const before = await archives();
      const runner = db.createQueryRunner();
      await expect(
        new CreateAiUsageReservations1791870434349().down(runner),
      ).rejects.toThrow("migration transaction");
      expect(await archives()).toEqual(before);
      expect(
        (
          await db.query(
            "SELECT to_regclass('public.ai_usage_reservations') AS name",
          )
        )[0].name,
      ).toBe("ai_usage_reservations");
      await runner.release();
    });
    it("reverts the registered schema with exact receipts and costs archived, and preserves each rollback cycle", async () => {
      const reservation = "00000000-0000-4000-8000-000000000010";
      const log = "00000000-0000-4000-8000-000000000011";
      await db.query(`INSERT INTO ai_usage_aggregate (layer,layer_key,limit_type,period_key,current_value)
      VALUES ('global','rollback-fixture','cost','2026-10',0.12345678)`);
      await db.query(
        `INSERT INTO ai_usage_logs (id,provider,model,status,"costEstimated")
      VALUES ($1,'gemini','rollback-fixture','success',0.12345678)`,
        [log],
      );
      await db.query(
        `INSERT INTO ai_usage_reservations
      (id,scope,service_key,daily_key,monthly_key,status,reserved_requests,reserved_tokens,reserved_cost,pricing,receipt)
      VALUES ($1,'CONTENT_TRANSLATION','neture','2026-10-13','2026-10','settled',1,1,0.00000001,'{}','{"event":"fixture"}')`,
        [reservation],
      );
      const receipt = (
        await db.query("SELECT * FROM ai_usage_reservations WHERE id=$1", [
          reservation,
        ])
      )[0];
      await db.undoLastMigration({ transaction: "each" });
      const firstArchive = (await archives())[0];
      expect(firstArchive).toMatch(/^ai_usage_rollback_[a-f0-9]{32}$/);
      expect(
        (
          await db.query(
            `SELECT * FROM "${firstArchive}".ai_usage_reservations WHERE id=$1`,
            [reservation],
          )
        )[0],
      ).toEqual(receipt);
      expect(
        (
          await db.query(
            `SELECT current_value FROM "${firstArchive}".ai_usage_aggregate WHERE layer_key='rollback-fixture'`,
          )
        )[0].current_value,
      ).toBe("0.12345678");
      expect(
        (
          await db.query(
            `SELECT "costEstimated" FROM "${firstArchive}".ai_usage_logs WHERE id=$1`,
            [log],
          )
        )[0].costEstimated,
      ).toBe("0.12345678");
      const previous = EXPECTED_SCHEMA_STATES.at(-2)!;
      const runner = db.createQueryRunner();
      await runner.startTransaction();
      expect((await classifyDatabaseState(runner)).state).toBe("BOOTSTRAPPED");
      const fingerprint = await computeSchemaFingerprint(runner);
      expect(fingerprint.hash).toBe(previous.fingerprint);
      expect(fingerprint.lineCount).toBe(previous.fingerprintLineCount);
      await runner.commitTransaction();
      await runner.release();
      expect(
        (
          await db.query(
            "SELECT current_value FROM ai_usage_aggregate WHERE layer_key=$1",
            ["rollback-fixture"],
          )
        )[0].current_value,
      ).toBe("0.1235");
      expect(
        (
          await db.query(
            'SELECT "costEstimated" FROM ai_usage_logs WHERE id=$1',
            [log],
          )
        )[0].costEstimated,
      ).toBe("0.123457");
      expect(await db.runMigrations({ transaction: "each" })).toHaveLength(1);
      await db.undoLastMigration({ transaction: "each" });
      expect(await archives()).toHaveLength(2);
      expect(
        (
          await db.query(
            `SELECT * FROM "${firstArchive}".ai_usage_reservations WHERE id=$1`,
            [reservation],
          )
        )[0],
      ).toEqual(receipt);
      expect(await db.runMigrations({ transaction: "each" })).toHaveLength(1);
      const latestRunner = db.createQueryRunner();
      await latestRunner.startTransaction();
      expect((await computeSchemaFingerprint(latestRunner)).hash).toBe(
        EXPECTED_SCHEMA_STATES.at(-1)!.fingerprint,
      );
      await latestRunner.commitTransaction();
      await latestRunner.release();
    });
    it("overflow in the old precision rolls back the entire revert, including archives and migration history", async () => {
      await db.query(
        "UPDATE ai_usage_aggregate SET current_value=100000000000 WHERE layer_key='rollback-fixture'",
      );
      const before = await archives();
      await expect(
        db.undoLastMigration({ transaction: "each" }),
      ).rejects.toThrow("numeric field overflow");
      expect(await archives()).toEqual(before);
      expect(
        (
          await db.query(
            "SELECT to_regclass('public.ai_usage_reservations') AS name",
          )
        )[0].name,
      ).toBe("ai_usage_reservations");
      expect(
        (
          await db.query(
            "SELECT current_value FROM ai_usage_aggregate WHERE layer_key=$1",
            ["rollback-fixture"],
          )
        )[0].current_value,
      ).toBe("100000000000.00000000");
      expect(
        (
          await db.query(
            "SELECT count(*)::int AS count FROM typeorm_migrations WHERE name=$1",
            ["CreateAiUsageReservations1791870434349"],
          )
        )[0].count,
      ).toBe(1);
      const runner = db.createQueryRunner();
      await runner.startTransaction();
      expect((await classifyDatabaseState(runner)).state).toBe("BOOTSTRAPPED");
      expect((await computeSchemaFingerprint(runner)).hash).toBe(
        EXPECTED_SCHEMA_STATES.at(-1)!.fingerprint,
      );
      await runner.commitTransaction();
      await runner.release();
    });
  },
);
