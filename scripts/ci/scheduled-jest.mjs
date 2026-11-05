#!/usr/bin/env node
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  appendFileSync,
} from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { getHeapStatistics } from "node:v8";
import { totalmem } from "node:os";
import { fileURLToPath } from "node:url";

export const SHARDS = 3;
const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const baseline = JSON.parse(
  readFileSync(path.join(ROOT, "package.json"), "utf8"),
).volta;
export const NODE_VERSION = "v" + baseline.node;
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const save = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
};
const check = (ok, message) => {
  if (!ok) throw new Error(message);
};
const comparePaths = (a, b) => a.localeCompare(b, "en");
const same = (a, b) =>
  JSON.stringify([...a].sort(comparePaths)) ===
  JSON.stringify([...b].sort(comparePaths));
export function relativeTests(names, root) {
  return names
    .map((name) => {
      const relative = path.isAbsolute(name) ? path.relative(root, name) : name;
      const normalized = relative.split(path.sep).join("/");
      check(
        normalized &&
          !normalized.startsWith("../") &&
          !path.isAbsolute(normalized),
        "Test path escapes API root",
      );
      return normalized;
    })
    .sort(comparePaths);
}
export function assertPartition(full, bins) {
  check(
    full.length > 0 && new Set(full).size === full.length,
    "Full discovery is empty or contains duplicates",
  );
  check(bins.length === SHARDS, "Expected exactly three shards");
  const all = bins.flat();
  check(
    new Set(all).size === all.length,
    "A test is assigned to more than one shard",
  );
  check(same(full, all), "Shard union differs from full discovery");
}
export function validatePlan(plan) {
  check(
    plan.schemaVersion === 1 && /^[a-f0-9]{40}$/.test(plan.sha),
    "Invalid plan version or SHA",
  );
  check(
    ["balanced", "hash"].includes(plan.strategy) &&
      ["default", "disabled"].includes(plan.cacheMode),
    "Invalid execution policy",
  );
  check(plan.node === NODE_VERSION, "Node baseline changed");
  check(
    typeof plan.buildCacheDisabled === "boolean",
    "Invalid build cache policy",
  );
  assertPartition(plan.full, plan.bins);
  const { digest, ...content } = plan;
  check(digest === hash(content), "Plan digest mismatch");
  return plan;
}
export function validateShard(plan, record, report, index) {
  validatePlan(plan);
  check(
    record.index === index &&
      record.sha === plan.sha &&
      record.planDigest === plan.digest,
    "Shard identity mismatch",
  );
  check(
    record.npm === baseline.npm && record.pnpm === baseline.pnpm,
    "npm/pnpm baseline mismatch",
  );
  check(
    record.node === plan.node &&
      record.strategy === plan.strategy &&
      record.cacheMode === plan.cacheMode &&
      record.buildCacheDisabled === plan.buildCacheDisabled,
    "Shard runtime/cache policy mismatch",
  );
  check(
    record.exitCode === 0 && !record.signal && !record.error,
    "Shard command did not succeed",
  );
  check(
    Number.isFinite(record.maxRssKb) &&
      record.maxRssKb > 0 &&
      Number.isFinite(record.heapLimitBytes) &&
      record.heapLimitBytes > 0,
    "Memory evidence is missing",
  );
  check(
    report?.success === true &&
      report.numFailedTestSuites === 0 &&
      report.numFailedTests === 0,
    "Jest reports a failure",
  );
  const names = relativeTests(
    report.testResults.map((item) => item.name),
    record.apiRoot,
  );
  check(
    names.length === new Set(names).size && same(names, plan.bins[index - 1]),
    "Reported suites differ from the planned shard",
  );
  check(
    report.numTotalTestSuites === names.length,
    "Jest suite totals do not reconcile",
  );
  return names;
}
function commandVersion(command) {
  const r = spawnSync(command, ["--version"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "unavailable";
}
function gitSha() {
  // Scheduled runners are Ubuntu; fixed system paths avoid PATH command substitution.
  const r = spawnSync("/usr/bin/git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  check(r.status === 0, "Cannot identify checkout SHA");
  return r.stdout.trim();
}
function jestBin(apiRoot) {
  return createRequire(path.join(apiRoot, "package.json")).resolve(
    "jest/bin/jest",
  );
}
function discover(apiRoot, index, strategy, cacheMode = "default") {
  const args = [jestBin(apiRoot), "--listTests", "--json", "--maxWorkers=1"];
  if (index) args.push(`--shard=${index}/${SHARDS}`);
  if (cacheMode === "disabled") args.push("--no-cache");
  const result = spawnSync(process.execPath, args, {
    cwd: apiRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, O4O_JEST_SHARD_STRATEGY: strategy },
  });
  check(result.status === 0, "Jest test discovery failed");
  return relativeTests(JSON.parse(result.stdout), apiRoot);
}
function output(values) {
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      Object.entries(values)
        .map(([k, v]) => `${k}=${v}\n`)
        .join(""),
    );
}
function summary(text) {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + "\n");
}
const RESOURCE_RUNNER = `import json,resource,subprocess,sys,time
started=time.monotonic()
result=subprocess.run(sys.argv[2:])
metrics={'maxRssKb':resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss,'elapsedSeconds':time.monotonic()-started,'childExitCode':result.returncode}
with open(sys.argv[1],'w') as output:json.dump(metrics,output)
sys.exit(result.returncode if result.returncode>=0 else 128-result.returncode)
`;
async function runShard(plan, index, apiRoot, out) {
  mkdirSync(out, { recursive: true });
  const record = {
    schemaVersion: 1,
    index,
    sha: gitSha(),
    planDigest: plan.digest,
    node: process.version,
    npm: commandVersion("npm"),
    pnpm: commandVersion("pnpm"),
    strategy: plan.strategy,
    cacheMode: plan.cacheMode,
    buildCacheDisabled:
      String(process.env.CI_BUILD_CACHE_DISABLED).toLowerCase() === "true",
    apiRoot,
    heapLimitBytes: getHeapStatistics().heap_size_limit,
    totalMemoryBytes: totalmem(),
    attempt: process.env.GITHUB_RUN_ATTEMPT ?? "local",
    exitCode: null,
    signal: null,
  };
  const started = Date.now();
  try {
    check(
      record.sha === plan.sha && record.node === plan.node,
      "Checkout/Node differs from discovery",
    );
    check(
      record.buildCacheDisabled === plan.buildCacheDisabled,
      "Build cache policy differs from discovery",
    );
    check(
      record.npm === baseline.npm && record.pnpm === baseline.pnpm,
      "npm/pnpm must match the repository baseline",
    );
    check(
      same(
        discover(apiRoot, undefined, plan.strategy, plan.cacheMode),
        plan.full,
      ),
      "Full discovery changed on this runner",
    );
    check(
      same(
        discover(apiRoot, index, plan.strategy, plan.cacheMode),
        plan.bins[index - 1],
      ),
      "Shard discovery changed on this runner",
    );
    const args = [
      jestBin(apiRoot),
      "--maxWorkers=1",
      `--shard=${index}/${SHARDS}`,
      "--logHeapUsage",
      "--json",
      `--outputFile=${path.join(out, "jest-report.json")}`,
    ];
    if (plan.cacheMode === "disabled") args.push("--no-cache");
    const result = await new Promise((resolve, reject) => {
      const child = spawn(
        "/usr/bin/python3",
        [
          "-c",
          RESOURCE_RUNNER,
          path.join(out, "resources.json"),
          process.execPath,
          ...args,
        ],
        {
          cwd: apiRoot,
          stdio: "inherit",
          env: { ...process.env, O4O_JEST_SHARD_STRATEGY: plan.strategy },
        },
      );
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code, signal }));
    });
    record.exitCode = result.code;
    record.signal = result.signal;
    if (existsSync(path.join(out, "resources.json"))) {
      const resources = json(path.join(out, "resources.json"));
      record.maxRssKb = resources.maxRssKb;
      record.childExitCode = resources.childExitCode;
    }
    check(
      existsSync(path.join(out, "jest-report.json")),
      "Jest report is missing (including crash/OOM)",
    );
    validateShard(
      plan,
      record,
      json(path.join(out, "jest-report.json")),
      index,
    );
  } catch (error) {
    record.error = error.message;
    process.exitCode = record.exitCode || 1;
  } finally {
    record.elapsedMs = Date.now() - started;
    save(path.join(out, "shard-result.json"), record);
  }
}
function find(root, name) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return find(path.join(root, entry.name), name);
    return entry.name === name ? [path.join(root, entry.name)] : [];
  });
}
export function aggregate(root, planResult, matrixResult) {
  const plans = find(root, "plan.json");
  check(plans.length === 1, "Exactly one discovery artifact is required");
  const plan = validatePlan(json(plans[0]));
  const files = find(root, "shard-result.json");
  check(files.length === SHARDS, "One artifact per shard is required");
  const seen = new Set(),
    rows = [],
    reported = [];
  for (const file of files) {
    const record = json(file),
      index = record.index;
    check(
      Number.isInteger(index) &&
        index >= 1 &&
        index <= SHARDS &&
        !seen.has(index),
      "Duplicate/invalid shard artifact",
    );
    seen.add(index);
    const names = validateShard(
      plan,
      record,
      json(path.join(path.dirname(file), "jest-report.json")),
      index,
    );
    record.reportedSuites = names.length;
    reported.push(...names);
    rows.push(record);
  }
  check(
    same(plan.full, reported) && new Set(reported).size === reported.length,
    "Executed suite union differs from full discovery",
  );
  check(
    planResult === "success" && matrixResult === "success",
    "A required discovery/shard job failed or was cancelled",
  );
  rows.sort((a, b) => a.index - b.index);
  return { sha: plan.sha, totalSuites: plan.full.length, rows };
}
async function main() {
  const [mode, ...args] = process.argv.slice(2),
    options = {};
  for (let i = 0; i < args.length; i += 2) {
    check(args[i]?.startsWith("--") && args[i + 1], "Invalid CLI argument");
    options[args[i].slice(2)] = args[i + 1];
  }
  const apiRoot = path.resolve(
    options["api-root"] ?? path.join(ROOT, "apps/api-server"),
  );
  if (mode === "plan") {
    check(
      process.version === NODE_VERSION,
      "Node must match the repository baseline",
    );
    const strategy =
      process.env.O4O_JEST_SHARD_STRATEGY === "hash" ? "hash" : "balanced";
    const cacheMode = options["cache-mode"] ?? "default";
    check(["default", "disabled"].includes(cacheMode), "Invalid cache mode");
    const content = {
      schemaVersion: 1,
      sha: gitSha(),
      node: process.version,
      strategy,
      cacheMode,
      buildCacheDisabled:
        cacheMode === "disabled" ||
        String(process.env.CI_BUILD_CACHE_DISABLED).toLowerCase() === "true",
      full: discover(apiRoot, undefined, strategy, cacheMode),
      bins: Array.from({ length: SHARDS }, (_, i) =>
        discover(apiRoot, i + 1, strategy, cacheMode),
      ),
    };
    const plan = validatePlan({ ...content, digest: hash(content) });
    save(options.output, plan);
    output({
      sha: plan.sha,
      strategy,
      build_cache_disabled: String(plan.buildCacheDisabled),
      cache_mode: cacheMode,
    });
    summary(
      `Discovered ${plan.full.length} suites, exactly once across ${SHARDS} shards. SHA ${plan.sha}; ${plan.node}; ${cacheMode} cache; ${strategy} scheduling.`,
    );
  } else if (mode === "run") {
    const plan = validatePlan(json(options.plan)),
      index = Number(options.shard);
    check(
      Number.isInteger(index) && index >= 1 && index <= SHARDS,
      "Invalid shard index",
    );
    await runShard(plan, index, apiRoot, path.resolve(options.output));
  } else if (mode === "aggregate") {
    try {
      const result = aggregate(
        options.artifacts,
        process.env.PLAN_RESULT,
        process.env.MATRIX_RESULT,
      );
      summary(
        `## Scheduled full Jest: PASS\n\nSHA: ${result.sha}\n\n${result.totalSuites} suites discovered and reported exactly once.\n\n| Shard | Node | Cache | Suites | Peak RSS (KiB) | Seconds |\n|---|---|---|---:|---:|---:|\n` +
          result.rows
            .map(
              (r) =>
                `| ${r.index} | ${r.node} | ${r.cacheMode} | ${r.reportedSuites} | ${r.maxRssKb ?? "unavailable"} | ${(r.elapsedMs / 1000).toFixed(1)} |`,
            )
            .join("\n"),
      );
    } catch (error) {
      summary(`## Scheduled full Jest: FAIL\n\n${error.message}`);
      throw error;
    }
  } else throw new Error("Expected plan, run or aggregate");
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
