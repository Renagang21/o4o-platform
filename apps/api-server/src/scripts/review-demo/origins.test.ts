import { test } from "node:test";
import assert from "node:assert/strict";
import { connectionConfig } from "../../modules/external-ai/auth/oauth-provider.js";
const env = {
  NODE_ENV: "production",
  REVIEW_DEMO_ENVIRONMENT: "isolated",
  EXTERNAL_AI_ISSUER_URL: "https://api.review.example.invalid",
  EXTERNAL_AI_WEB_ORIGIN: "https://review.example.invalid",
  EXTERNAL_AI_ADMIN_ORIGIN: "https://review.example.invalid",
  EXTERNAL_AI_STORE_ORIGIN: "https://store.review.example.invalid",
  EXTERNAL_AI_CREDENTIAL_KEY: "a".repeat(64),
  EXTERNAL_AI_REDIRECT_URIS: "https://client.example.invalid/callback",
};
test("review instance cannot fall back to production origins", () => {
  for (const key of ["EXTERNAL_AI_STORE_ORIGIN", "EXTERNAL_AI_ADMIN_ORIGIN"])
    assert.equal(connectionConfig({ ...env, [key]: undefined }), null);
  for (const key of [
    "EXTERNAL_AI_ISSUER_URL",
    "EXTERNAL_AI_WEB_ORIGIN",
    "EXTERNAL_AI_ADMIN_ORIGIN",
    "EXTERNAL_AI_STORE_ORIGIN",
  ])
    for (const host of [
      "api.neture.co.kr",
      "neture.co.kr",
      "store.neture.co.kr",
      "admin.neture.co.kr",
    ])
      assert.equal(
        connectionConfig({ ...env, [key]: `https://${host}` }),
        null,
      );
});
test("review store origin uses the same URL validation as the OAuth origins", () => {
  for (const value of [
    "http://remote.example.invalid",
    "https://a:b@review.example.invalid",
    "https://review.example.invalid/path",
    "https://review.example.invalid/?query=x",
  ])
    assert.equal(
      connectionConfig({ ...env, EXTERNAL_AI_STORE_ORIGIN: value }),
      null,
    );
  assert.equal(
    connectionConfig(env)?.storeOrigin?.origin,
    "https://store.review.example.invalid",
  );
});
test("existing non-review deployments retain the production store default", () => {
  assert.equal(
    connectionConfig({
      ...env,
      REVIEW_DEMO_ENVIRONMENT: undefined,
      EXTERNAL_AI_STORE_ORIGIN: undefined,
    })?.storeOrigin?.origin,
    "https://store.neture.co.kr",
  );
});
