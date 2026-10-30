import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Exclusive creation; never imports or overwrites production environment files.
const secret = () => randomBytes(32).toString("hex");
const values = {
  REVIEW_DEMO_NODE_ENV: "development",
  REVIEW_DEMO_API_IMAGE: "o4o-chatgpt-review-api:local",
  REVIEW_DEMO_WEB_IMAGE: "o4o-chatgpt-review-web:local",
  REVIEW_DEMO_STORE_IMAGE: "o4o-chatgpt-review-store:local",
  REVIEW_DEMO_ENVIRONMENT: "isolated",
  REVIEW_DEMO_DB_NAME: "o4o_chatgpt_review_demo",
  REVIEW_DEMO_DB_USERNAME: "o4o_review_demo",
  REVIEW_DEMO_DB_HOST: "127.0.0.1",
  REVIEW_DEMO_DB_PORT: "55459",
  REVIEW_DEMO_DB_PASSWORD: secret(),
  REVIEW_DEMO_PASSWORD: `R${secret()}!`,
  REVIEW_DEMO_JWT_SECRET: secret(),
  REVIEW_DEMO_JWT_REFRESH_SECRET: secret(),
  REVIEW_DEMO_CREDENTIAL_KEY: secret(),
  REVIEW_DEMO_API_ORIGIN: "http://localhost:13002",
  REVIEW_DEMO_WEB_ORIGIN: "http://localhost:13000",
  REVIEW_DEMO_STORE_ORIGIN: "http://localhost:13001",
  REVIEW_DEMO_REDIRECT_URIS: "http://localhost:13000/review-callback",
};
try {
  writeFileSync(
    fileURLToPath(new URL(".env", import.meta.url)),
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n") + "\n",
    { mode: 0o600, flag: "wx" },
  );
  console.log(
    "Created private local review configuration. No secret values printed.",
  );
} catch (error) {
  console.error(
    error.code === "EEXIST"
      ? "Private review configuration already exists; left unchanged."
      : "Could not create private review configuration.",
  );
  process.exitCode = 1;
}
