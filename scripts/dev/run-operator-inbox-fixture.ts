/** Disposable, fixed loopback PostgreSQL fixture. Never uses runtime DB_* or production credentials. */
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { DataSource } from "typeorm";
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from "../../apps/api-server/src/database/bootstrap/canonical-schema-baseline.js";
import { CANONICAL_SCHEMA_BASELINE_META } from "../../apps/api-server/src/database/bootstrap/canonical-schema-baseline.meta.js";
import { INCREMENTAL_MIGRATIONS } from "../../apps/api-server/src/database/incremental/manifest.js";
import { expectedSchemaStateFor } from "../../apps/api-server/src/database/incremental/expected-schema-states.js";
import { computeSchemaFingerprint } from "../../apps/api-server/src/database/bootstrap/schema-fingerprint.js";
const options = {
  type: "postgres" as const,
  host: "127.0.0.1",
  port: 55439,
  username: "operator_inbox_fixture",
};
const database = "o4o_operator_inbox_fixture";
const marker = `operator-inbox:${randomUUID()}`;
async function main() {
  const control = new DataSource({ ...options, database: "postgres" });
  await control.initialize();
  let created = false;
  let failure: unknown;
  try {
    if (
      (
        await control.query("SELECT 1 FROM pg_database WHERE datname=$1", [
          database,
        ])
      ).length
    )
      throw new Error("Fixture exists: refusing reuse/deletion");
    await control.query(`CREATE DATABASE ${database}`);
    created = true;
    await control.query(`COMMENT ON DATABASE ${database} IS '${marker}'`);
    const db = new DataSource({ ...options, database });
    await db.initialize();
    try {
      const q = db.createQueryRunner();
      await q.connect();
      await q.startTransaction();
      try {
        for (const ext of CANONICAL_SCHEMA_BASELINE_META.requiredExtensions)
          await q.query(
            `CREATE EXTENSION "${ext.name}" WITH SCHEMA "${ext.schema}"`,
          );
        for (const sql of CANONICAL_SCHEMA_BASELINE_STATEMENTS)
          await q.query(sql);
        for (let i = 0; i <= INCREMENTAL_MIGRATIONS.length; i++) {
          const fp = await computeSchemaFingerprint(q),
            expected = expectedSchemaStateFor(i);
          if (
            i === INCREMENTAL_MIGRATIONS.length &&
            process.argv.includes("--inspect-new-state")
          )
            console.log(`NEW_SCHEMA ${fp.hash} ${fp.lineCount}`);
          else if (
            !expected ||
            fp.hash !== expected.fingerprint ||
            fp.lineCount !== expected.fingerprintLineCount
          )
            throw new Error(
              `Schema prefix ${i} mismatch: ${fp.hash} ${fp.lineCount}`,
            );
          if (i < INCREMENTAL_MIGRATIONS.length) {
            await q.query("SET LOCAL search_path TO public");
            await new INCREMENTAL_MIGRATIONS[i]().up(q);
          }
        }
        await q.commitTransaction();
      } catch (e) {
        await q.rollbackTransaction();
        throw e;
      } finally {
        await q.release();
      }
      const migration = new INCREMENTAL_MIGRATIONS[
        INCREMENTAL_MIGRATIONS.length - 1
      ]();
      await migration.down(db.createQueryRunner());
      await migration.up(db.createQueryRunner());
      console.log("All schema prefixes and empty down/up PASS");
    } finally {
      await db.destroy();
    }
    if (!process.argv.includes("--inspect-new-state")) {
      const require = createRequire(
        new URL("../../apps/api-server/package.json", import.meta.url),
      );
      const code = await new Promise<number | null>((resolve, reject) => {
        const child = spawn(
          process.execPath,
          [
            require.resolve("jest/bin/jest"),
            "--config",
            "apps/api-server/jest.config.cjs",
            "--runInBand",
            "--runTestsByPath",
            "apps/api-server/src/__tests__/operator-inbox.integration.spec.ts",
          ],
          {
            stdio: "inherit",
            env: { ...process.env, O4O_OPERATOR_INBOX_PG_TEST: "1" },
          },
        );
        child.once("error", reject);
        child.once("exit", resolve);
      });
      if (code !== 0) throw new Error("Operator inbox fixture tests failed");
    }
  } catch (error) {
    failure = error;
  }
  try {
    if (created) {
      const [row] = await control.query(
        "SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=$1",
        [database],
      );
      if (row?.marker !== marker)
        throw new Error("Fixture ownership changed; refusing removal");
      await control.query(`DROP DATABASE ${database}`);
      console.log("Fixture cleanup PASS: database count 0");
    }
  } catch (error) {
    failure = failure
      ? new AggregateError([failure, error], "Fixture and cleanup failed")
      : error;
  } finally {
    await control.destroy();
  }
  if (failure) throw failure;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
