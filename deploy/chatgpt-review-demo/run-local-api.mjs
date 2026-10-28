/** Run after standard migrations and provision, with --env-file=.../.env. */
import { spawn } from "node:child_process";
const required = [
  "REVIEW_DEMO_DB_HOST",
  "REVIEW_DEMO_DB_PASSWORD",
  "REVIEW_DEMO_JWT_SECRET",
  "REVIEW_DEMO_JWT_REFRESH_SECRET",
  "REVIEW_DEMO_CREDENTIAL_KEY",
  "REVIEW_DEMO_API_ORIGIN",
  "REVIEW_DEMO_WEB_ORIGIN",
  "REVIEW_DEMO_STORE_ORIGIN",
  "REVIEW_DEMO_REDIRECT_URIS",
];
if (
  required.some((key) => !process.env[key]) ||
  process.env.REVIEW_DEMO_ENVIRONMENT !== "isolated" ||
  process.env.REVIEW_DEMO_DB_NAME !== "o4o_chatgpt_review_demo" ||
  process.env.REVIEW_DEMO_DB_USERNAME !== "o4o_review_demo"
)
  throw new Error("ISOLATED_REVIEW_CONFIGURATION_REQUIRED");
const p = process.env;
const child = spawn(process.execPath, ["apps/api-server/dist/main.js"], {
  stdio: "inherit",
  env: {
    // No production account/provider variables inherited into the review API.
    PATH: p.PATH,
    NODE_EXTRA_CA_CERTS: p.NODE_EXTRA_CA_CERTS,
    HTTP_PROXY: p.HTTP_PROXY,
    HTTPS_PROXY: p.HTTPS_PROXY,
    NO_PROXY: p.NO_PROXY,
    NODE_ENV: "development",
    GRACEFUL_STARTUP: "false",
    PORT: "13002",
    DB_TYPE: "postgres",
    DB_HOST: p.REVIEW_DEMO_DB_HOST,
    DB_PORT: p.REVIEW_DEMO_DB_PORT || "55459",
    DB_NAME: p.REVIEW_DEMO_DB_NAME,
    DB_USERNAME: p.REVIEW_DEMO_DB_USERNAME,
    DB_PASSWORD: p.REVIEW_DEMO_DB_PASSWORD,
    REVIEW_DEMO_ENVIRONMENT: "isolated",
    JWT_SECRET: p.REVIEW_DEMO_JWT_SECRET,
    JWT_REFRESH_SECRET: p.REVIEW_DEMO_JWT_REFRESH_SECRET,
    JWT_ISSUER: "o4o-chatgpt-review-demo",
    JWT_AUDIENCE: "o4o-chatgpt-review-demo",
    COOKIE_DOMAIN: "",
    CORS_ORIGIN: `${p.REVIEW_DEMO_WEB_ORIGIN},${p.REVIEW_DEMO_STORE_ORIGIN}`,
    EXTERNAL_AI_ISSUER_URL: p.REVIEW_DEMO_API_ORIGIN,
    EXTERNAL_AI_WEB_ORIGIN: p.REVIEW_DEMO_WEB_ORIGIN,
    EXTERNAL_AI_ADMIN_ORIGIN: p.REVIEW_DEMO_WEB_ORIGIN,
    EXTERNAL_AI_STORE_ORIGIN: p.REVIEW_DEMO_STORE_ORIGIN,
    EXTERNAL_AI_REDIRECT_URIS: p.REVIEW_DEMO_REDIRECT_URIS,
    EXTERNAL_AI_CREDENTIAL_KEY: p.REVIEW_DEMO_CREDENTIAL_KEY,
    EMAIL_SERVICE_ENABLED: "false",
    PERSONAL_MAIL_ENABLED: "false",
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
child.on("error", () => {
  console.error("REVIEW_API_START_FAILED");
  process.exitCode = 1;
});
