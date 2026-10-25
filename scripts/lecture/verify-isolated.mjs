#!/usr/bin/env node
/** Does not start servers, authenticate accounts or connect to an application database. */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const root = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
const synthetic = args.length === 1 && args[0] === "--synthetic-only";
const port =
  args.length === 2 && args[0] === "--postgres-port" ? Number(args[1]) : NaN;
if (
  !synthetic &&
  (!Number.isInteger(port) ||
    port < 1024 ||
    port > 65535 ||
    [5432, 5442].includes(port))
) {
  console.error(
    "Usage: node scripts/lecture/verify-isolated.mjs --synthetic-only | --postgres-port <dedicated disposable PostgreSQL port, not 5432/5442>",
  );
  process.exit(2);
}
const require = createRequire(import.meta.url);
const executables = {
  vitest: join(dirname(require.resolve("vitest/package.json")), "vitest.mjs"),
  jest: require.resolve("jest/bin/jest"),
};
function run(tool, commandArgs, cwd = root, extraEnv = {}) {
  const result = spawnSync(
    process.execPath,
    [executables[tool], ...commandArgs],
    {
      cwd,
      env: { ...process.env, O4O_LECTURE_CERT_OPS_PG_PORT: "", ...extraEnv },
      stdio: "inherit",
      shell: false,
    },
  );
  if (result.error || result.status !== 0) {
    console.error(
      "FAIL: verification command. Remaining checks were not executed.",
    );
    process.exit(result.status || 1);
  }
}
run("vitest", [
  "run",
  "--config",
  "services/web-lecture/vitest.config.mjs",
  "--maxWorkers=2",
]);
run(
  "jest",
  [
    "--runInBand",
    "--runTestsByPath",
    "src/__tests__/lecture-certificate-renewal-expiry.spec.ts",
    "src/__tests__/lms-completion-certificate-chain.spec.ts",
    "src/__tests__/lecture-public-curriculum.spec.ts",
    "src/__tests__/lecture-public-preview.spec.ts",
    "src/__tests__/lecture-instructor-profile.spec.ts",
    "src/__tests__/lecture-instructor-application.spec.ts",
    "src/__tests__/lecture-phase2-merge-gate-contract.spec.ts",
    "src/__tests__/lecture-phase2-access-contract.spec.ts",
    "src/__tests__/canonical-database-bootstrap-incremental-migration-separation.spec.ts",
    "src/__tests__/database-migration-ownership-startup-health-final-closure.spec.ts",
    "src/__tests__/lecture-playback-boundary.spec.ts",
  ],
  fileURLToPath(new URL("../../apps/api-server/", import.meta.url)),
);
if (synthetic) {
  console.log(
    "PASS: synthetic checks only. PostgreSQL, real login, media delivery and end-to-end issuance: UNRUN.",
  );
} else {
  console.log(
    "Disposable PostgreSQL must already be running on loopback; the spec creates and drops its own database.",
  );
  run(
    "jest",
    [
      "--runInBand",
      "--runTestsByPath",
      "src/__tests__/lecture-certificate-operations.postgres.spec.ts",
    ],
    fileURLToPath(new URL("../../apps/api-server/", import.meta.url)),
    { O4O_LECTURE_CERT_OPS_PG_PORT: String(port) },
  );
  console.log(
    "PASS: synthetic + isolated PostgreSQL checks. Real login and browser end-to-end issuance: UNRUN.",
  );
}
