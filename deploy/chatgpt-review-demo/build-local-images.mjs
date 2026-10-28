/** Linux build host, after SETUP.md dependencies/packages; no .env is sent to Docker. */
import { cpSync, mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, "../..");
const temporary = mkdtempSync(join(tmpdir(), "o4o-review-images-"));
const buildx = process.env.BUILDX_CONFIG || join(tmpdir(), "o4o-review-buildx");
mkdirSync(buildx, { recursive: true });
function run(command, args, extra = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, BUILDX_CONFIG: buildx, ...extra },
  });
  if (result.error || result.status !== 0)
    throw new Error("REVIEW_IMAGE_BUILD_FAILED");
}
try {
  run("pnpm", ["--filter", "@o4o/api-server", "run", "build"]);
  cpSync(
    join(root, "apps/api-server/dist/database"),
    join(temporary, "database"),
    { recursive: true },
  );
  run("pnpm", ["--filter", "@o4o/api-server", "run", "build:api"], {
    NODE_ENV: "development",
  });
  cpSync(
    join(temporary, "database"),
    join(root, "apps/api-server/dist/database"),
    { recursive: true },
  );
  const api = join(temporary, "api");
  cpSync(join(root, "apps/api-server/dist"), join(api, "dist"), {
    recursive: true,
  });
  cpSync(
    join(root, "apps/api-server/package.production.json"),
    join(api, "package.production.json"),
  );
  cpSync(join(root, "apps/api-server/src/assets"), join(api, "src/assets"), {
    recursive: true,
  });
  cpSync(
    join(root, "packages/mail-core/templates/email"),
    join(api, "mail-templates"),
    { recursive: true },
  );
  cpSync(join(root, "apps/api-server/Dockerfile"), join(api, "Dockerfile"));
  const certificate = process.env.CODEX_PROXY_CERT;
  const trust =
    certificate && existsSync(certificate)
      ? ["--secret", `id=proxy_ca,src=${certificate}`]
      : [];
  run("docker", [
    "--host=unix:///var/run/docker.sock",
    "build",
    ...trust,
    "-t",
    "o4o-chatgpt-review-api:local",
    api,
  ]);
  for (const [name, service, port] of [
    ["web", "web-neture", "13000"],
    ["store", "web-store", "13001"],
  ]) {
    run(
      "pnpm",
      [
        "--filter",
        name === "web" ? "@o4o/web-neture" : "store-web",
        "run",
        "build",
      ],
      {
        VITE_API_BASE_URL: "http://localhost:13002",
        VITE_API_URL: "http://localhost:13002",
        VITE_SERVICE_URL: `http://localhost:${port}`,
      },
    );
    const context = join(temporary, name);
    cpSync(join(root, `services/${service}/dist`), join(context, "dist"), {
      recursive: true,
    });
    cpSync(join(directory, "Dockerfile.web"), join(context, "Dockerfile"));
    cpSync(join(directory, "nginx.conf"), join(context, "nginx.conf"));
    run("docker", [
      "--host=unix:///var/run/docker.sock",
      "build",
      "-t",
      `o4o-chatgpt-review-${name}:local`,
      context,
    ]);
  }
  console.log(
    "Built local-only review images. These are not public production images.",
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
