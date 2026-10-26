import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { runCanonicalBootstrap } from "../../../database/bootstrap/bootstrap-runner.js";
import { computeSchemaFingerprint } from "../../../database/bootstrap/schema-fingerprint.js";
import { INCREMENTAL_MIGRATIONS } from "../../../database/incremental/manifest.js";
import { EXPECTED_SCHEMA_STATES } from "../../../database/incremental/expected-schema-states.js";
import { CreatePartnerCommunity1793020000000 } from "../../../database/migrations/1793020000000-CreatePartnerCommunity.js";

/** CLI only. Refuses every target except this disposable local schema-check database. */
async function main() {
  const value = process.env.PARTNER_SCHEMA_TEST_DATABASE_URL;
  if (!value) throw new Error("PARTNER_SCHEMA_TEST_DATABASE_URL required");
  const url = new URL(value);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "55439" ||
    url.pathname !== "/partner_schema_test"
  )
    throw new Error("Disposable schema-check database only");
  const db = new DataSource({
    type: "postgres",
    url: value,
    synchronize: false,
  });
  await db.initialize();
  const q = db.createQueryRunner();
  await q.connect();
  try {
    const [{ count }] = await q.query(
      "SELECT count(*)::int count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','neture','cosmetics') AND c.relkind='r'",
    );
    assert.equal(count, 0, "Schema-check database must be empty");
    await q.startTransaction();
    await runCanonicalBootstrap(q, { info: () => {}, error: console.error });
    const baseline = await computeSchemaFingerprint(q);
    assert.equal(baseline.hash, EXPECTED_SCHEMA_STATES[0].fingerprint);
    await q.commitTransaction();
    let final = baseline;
    for (let i = 0; i < INCREMENTAL_MIGRATIONS.length; i++) {
      const migration = new INCREMENTAL_MIGRATIONS[i]();
      await q.startTransaction();
      await q.query("SET LOCAL search_path TO public");
      await migration.up(q);
      final = await computeSchemaFingerprint(q);
      const expected = EXPECTED_SCHEMA_STATES[i + 1];
      if (expected) {
        assert.equal(final.hash, expected.fingerprint, `prefix ${i + 1}`);
        assert.equal(final.lineCount, expected.fingerprintLineCount);
      }
      await q.commitTransaction();
    }
    console.log(
      JSON.stringify({
        prefixesVerified: INCREMENTAL_MIGRATIONS.length,
        fingerprint: final.hash,
        lineCount: final.lineCount,
      }),
    );
    const previous = EXPECTED_SCHEMA_STATES[INCREMENTAL_MIGRATIONS.length - 1];
    await q.startTransaction();
    await new CreatePartnerCommunity1793020000000().down(q);
    assert.equal(
      (await computeSchemaFingerprint(q)).hash,
      previous.fingerprint,
    );
    await q.commitTransaction();
    await q.startTransaction();
    await new CreatePartnerCommunity1793020000000().up(q);
    assert.equal((await computeSchemaFingerprint(q)).hash, final.hash);
    await q.commitTransaction();
    // Exercise the actual canonical erasure fence, including text-only boards.
    const subject = randomUUID();
    await q.query(
      `INSERT INTO account_erasure_operations(subject_id,subject_hash,requested_by_key) VALUES($1::uuid,encode(digest($1::uuid::text,'sha256'),'hex'),$2)`,
      [subject, randomUUID()],
    );
    const board = (
      await q.query("SELECT id FROM partner_community_boards LIMIT 1")
    )[0].id;
    for (const [sql, params] of [
      [
        "INSERT INTO partner_community_boards(name,description) VALUES($1,$2)",
        ["fence check", subject],
      ],
      [
        "INSERT INTO partner_community_posts(board_id,author_id,title,body) VALUES($1,$2,$3,$4)",
        [board, subject, "check", "check"],
      ],
      [
        "INSERT INTO partner_community_comments(post_id,author_id,body) VALUES($1,$2,$3)",
        [randomUUID(), subject, "check"],
      ],
      [
        "INSERT INTO partner_community_reports(reporter_id,post_id,reason) VALUES($1,$2,$3)",
        [subject, randomUUID(), "check"],
      ],
      [
        "INSERT INTO partner_community_events(actor_id,kind) VALUES($1,$2)",
        [subject, "check"],
      ],
    ] as [string, unknown[]][]) {
      await assert.rejects(q.query(sql, params), /ACCOUNT_ERASURE_PENDING/);
    }
    console.log("PARTNER_COMMUNITY_DOWN_UP_AND_ERASURE_FENCES_PASS");
  } finally {
    if (q.isTransactionActive) await q.rollbackTransaction();
    await q.release();
    await db.destroy();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
