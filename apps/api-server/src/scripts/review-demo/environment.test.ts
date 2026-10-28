import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reviewDatabaseOptions,
  assertReviewDatabase,
  REVIEW_DATABASE,
  REVIEW_USER,
  REVIEW_MARKER,
} from "./environment.js";

const env = {
  REVIEW_DEMO_ENVIRONMENT: "isolated",
  REVIEW_DEMO_DB_HOST: "127.0.0.1",
  REVIEW_DEMO_DB_NAME: REVIEW_DATABASE,
  REVIEW_DEMO_DB_USERNAME: REVIEW_USER,
  REVIEW_DEMO_DB_PASSWORD: "unused-in-this-unit-test",
};
test("production DB variables alone cannot select a provision target", () => {
  assert.throws(
    () =>
      reviewDatabaseOptions({
        DB_HOST: "production.invalid",
        DB_NAME: REVIEW_DATABASE,
      }),
    /CONFIGURATION_REQUIRED/,
  );
});
test("requires dedicated database, role and isolation flag independently", () => {
  for (const key of [
    "REVIEW_DEMO_ENVIRONMENT",
    "REVIEW_DEMO_DB_NAME",
    "REVIEW_DEMO_DB_USERNAME",
  ])
    assert.throws(
      () => reviewDatabaseOptions({ ...env, [key]: "wrong-target" }),
      /CONFIGURATION_REQUIRED/,
    );
  for (const port of ["0", "65536", "1.5", "not-a-port"])
    assert.throws(
      () => reviewDatabaseOptions({ ...env, REVIEW_DEMO_DB_PORT: port }),
      /INVALID_REVIEW_DATABASE_PORT/,
    );
  assert.equal(reviewDatabaseOptions(env).database, REVIEW_DATABASE);
  assert.throws(
    () =>
      reviewDatabaseOptions({
        ...env,
        REVIEW_DEMO_DB_HOST: "remote.example.invalid",
      }),
    /PRIVATE_TRANSPORT_REQUIRED/,
  );
});
test("wrong actual server identity fails before looking at its marker", async () => {
  let calls = 0;
  await assert.rejects(
    assertReviewDatabase({
      query: async () => {
        calls++;
        return [{ database: "other-database", username: REVIEW_USER }];
      },
    }),
    /IDENTITY_MISMATCH/,
  );
  assert.equal(calls, 1);
});
test("correct names are insufficient without the database metadata marker", async () => {
  await assert.rejects(
    assertReviewDatabase({
      query: async (sql) =>
        sql.startsWith("SELECT current_database() AS database")
          ? [{ database: REVIEW_DATABASE, username: REVIEW_USER }]
          : [{ purpose: "wrong-marker" }],
    }),
    /MARKER_REQUIRED/,
  );
  await assertReviewDatabase({
    query: async (sql) =>
      sql.startsWith("SELECT current_database() AS database")
        ? [{ database: REVIEW_DATABASE, username: REVIEW_USER }]
        : [{ purpose: REVIEW_MARKER }],
  });
});
