import { createRequire } from "node:module";
import {
  readFile,
  writeFile,
  readdir,
  mkdtemp,
  rm,
  mkdir,
  realpath,
} from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import os from "node:os";
import { randomBytes, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
// Local-only verification: requires an explicit local PostgreSQL Unix socket.
// Creates and drops only its own randomly named database. Never uses production DB variables.
const wt = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const root = process.env.LOCAL_COPY_INSTALLED_ROOT
  ? path.resolve(process.env.LOCAL_COPY_INSTALLED_ROOT)
  : wt;

const socket = process.env.LOCAL_COPY_PG_SOCKET;
assert.ok(
  socket && path.isAbsolute(socket),
  "Set LOCAL_COPY_PG_SOCKET to the local PostgreSQL Unix socket directory",
);
const req = createRequire(root + "/apps/api-server/package.json");
const { Client } = req("pg");
const { DataSource } = req("typeorm");
const ts = req("typescript");
// Always compile the tested repository's source; installedRoot supplies dependencies only.
async function compileCurrentSource(source, output, replacements = {}) {
  const code = ts.transpileModule(await readFile(source, "utf8"), {
    fileName: source,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
    },
  });
  assert.equal(
    code.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error)
      .length ?? 0,
    0,
    "Current source transpilation failed",
  );
  let js = code.outputText;
  const imports = {
    typeorm: pathToFileURL(
      path.join(path.dirname(req.resolve("typeorm")), "index.mjs"),
    ).href,
    ...replacements,
  };
  js = js.replace(/from\s+(['"])([^'"]+)\1/g, (match, quote, name) =>
    imports[name] ? "from " + JSON.stringify(imports[name]) : match,
  );
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, js);
}

/** Attest the server against on-disk control data and the local backend process before DDL. */
async function verifyLocalPostgres(query) {
  try {
    const [server] =
      await query(`SELECT current_setting('data_directory') AS data_directory,
      pg_backend_pid() AS backend_pid, (SELECT system_identifier::text FROM pg_control_system()) AS cluster_id`);
    const data = await realpath(server.data_directory);
    const control = await readFile(path.join(data, "global/pg_control"));
    const localId =
      os.endianness() === "LE"
        ? control.readBigUInt64LE(0)
        : control.readBigUInt64BE(0);
    assert.equal(server.cluster_id, localId.toString());
    const postmaster = (
      await readFile(path.join(data, "postmaster.pid"), "utf8")
    )
      .trim()
      .split("\n");
    assert.equal(await realpath(postmaster[1]), data);
    assert.ok(/^[0-9]+$/.test(postmaster[0]));
    assert.ok(
      Number.isSafeInteger(server.backend_pid) && server.backend_pid > 0,
    );
    const processStatus = await readFile(
      `/proc/${server.backend_pid}/status`,
      "utf8",
    );
    const processName = await readFile(
      `/proc/${server.backend_pid}/comm`,
      "utf8",
    );
    assert.equal(processName.trim(), "postgres");
    assert.equal(
      Number(processStatus.match(/^PPid:\s+(\d+)$/m)?.[1]),
      Number(postmaster[0]),
    );
    assert.equal(postmaster[3], "5432");
    const allowedSockets = postmaster[4].split(",").map((x) => x.trim());
    assert.ok(
      (await Promise.all(allowedSockets.map((x) => realpath(x)))).includes(
        await realpath(socket),
      ),
    );
    return server.cluster_id;
  } catch {
    throw new Error(
      "Local PostgreSQL identity was not verified; DDL is prohibited",
    );
  }
}
const db = "o4o_copy_independence_" + randomBytes(6).toString("hex");
const username = process.env.LOCAL_COPY_PG_USER || os.userInfo().username;
const local = {
  host: socket,
  port: 5432,
  user: username,
  password: async () => "",
  ssl: false,
};
const admin = new Client({ ...local, database: "postgres" });
let ds,
  dir,
  created = false;
const results = [];
async function test(name, fn) {
  await fn();
  results.push({ step: name, pass: true });
  console.log("PASS", name);
}
try {
  dir = await mkdtemp(path.join(os.tmpdir(), "o4o-copy-independence-"));
  await writeFile(
    path.join(dir, "package.json"),
    JSON.stringify({ type: "module" }),
  );
  const core = path.join(wt, "packages/asset-copy-core/src");
  const files = (await readdir(core, { recursive: true })).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".d.ts"),
  );
  for (const file of files)
    await compileCurrentSource(
      path.join(core, file),
      path.join(dir, "core", file.replace(/\.ts$/, ".js")),
    );
  const cmsModule = path.join(dir, "cms/CmsContent.entity.js");
  await compileCurrentSource(
    path.join(wt, "packages/cms-core/src/entities/CmsContent.entity.ts"),
    cmsModule,
  );
  const resolverModule = path.join(dir, "kpa-asset-resolver.js");
  await compileCurrentSource(
    path.join(
      wt,
      "apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts",
    ),
    resolverModule,
    {
      "@o4o-apps/cms-core/entities": pathToFileURL(cmsModule).href,
    },
  );
  const { AssetSnapshot } = await import(
    pathToFileURL(path.join(dir, "core/entities/asset-snapshot.entity.js")).href
  );
  const { AssetCopyService } = await import(
    pathToFileURL(path.join(dir, "core/services/asset-copy.service.js")).href
  );
  const { CmsContent } = await import(pathToFileURL(cmsModule).href);
  const { KpaAssetResolver } = await import(pathToFileURL(resolverModule).href);

  await admin.connect();
  const localCluster = await verifyLocalPostgres(
    async (sql) => (await admin.query(sql)).rows,
  );
  await admin.query("CREATE DATABASE " + db);
  created = true;
  ds = new DataSource({
    type: "postgres",
    host: socket,
    port: 5432,
    username,
    password: async () => "",
    ssl: false,
    database: db,
    entities: [AssetSnapshot, CmsContent],
    synchronize: false,
    installExtensions: false,
  });
  await ds.initialize();
  assert.equal(
    await verifyLocalPostgres((sql) => ds.query(sql)),
    localCluster,
    "Fixture connection changed server",
  );
  await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await ds.synchronize();
  const sourceRepo = ds.getRepository(CmsContent);
  const owner = randomUUID(),
    orgA = randomUUID(),
    orgB = randomUUID();
  const original = await sourceRepo.save(
    sourceRepo.create({
      serviceKey: "kpa-society",
      type: "guide",
      title: "Source v1",
      body: "<p>Original v1</p>",
      metadata: { version: 1 },
      status: "published",
      createdBy: owner,
    }),
  );
  const service = new AssetCopyService(ds);
  const resolver = new KpaAssetResolver(ds);
  let a, b;
  const readCopy = (id, organizationId) =>
    ds.getRepository(AssetSnapshot).findOneBy({ id, organizationId });
  await test("current-KPA-resolver-copies-source-to-A-and-B", async () => {
    a = (
      await service.copyWithResolver(
        {
          sourceService: "kpa",
          sourceAssetId: original.id,
          assetType: "cms",
          targetOrganizationId: orgA,
          createdBy: owner,
        },
        resolver,
      )
    ).snapshot;
    b = (
      await service.copyWithResolver(
        {
          sourceService: "kpa",
          sourceAssetId: original.id,
          assetType: "cms",
          targetOrganizationId: orgB,
          createdBy: owner,
        },
        resolver,
      )
    ).snapshot;
    assert.notEqual(a.id, b.id);
    assert.equal(a.contentJson.body, original.body);
    assert.equal(b.contentJson.body, original.body);
  });
  await test("original-update-does-not-change-existing-copies", async () => {
    const beforeA = await readCopy(a.id, orgA),
      beforeB = await readCopy(b.id, orgB);
    await sourceRepo.update(original.id, {
      title: "Source v2",
      body: "<p>Original v2</p>",
      metadata: { version: 2 },
    });
    assert.deepEqual(await readCopy(a.id, orgA), beforeA);
    assert.deepEqual(await readCopy(b.id, orgB), beforeB);
  });
  await test("copy-edit-A-preserves-original-and-copy-B", async () => {
    const before = await readCopy(b.id, orgB);
    await service.updateById(a.id, orgA, {
      title: "A edited",
      contentJsonPatch: { body: "<p>A edited</p>" },
    });
    assert.deepEqual(await readCopy(b.id, orgB), before);
    assert.equal(
      (await sourceRepo.findOneByOrFail({ id: original.id })).body,
      "<p>Original v2</p>",
    );
  });
  await test("Core-organization-lists-and-cross-update-remain-isolated", async () => {
    const options = { assetType: "cms", page: 1, limit: 20 };
    assert.deepEqual(
      (await service.listByOrganization(orgA, options)).items.map((x) => x.id),
      [a.id],
    );
    assert.deepEqual(
      (await service.listByOrganization(orgB, options)).items.map((x) => x.id),
      [b.id],
    );
    await assert.rejects(
      service.updateById(a.id, orgB, { title: "Forbidden" }),
      /NOT_FOUND/,
    );
    assert.equal((await readCopy(a.id, orgA)).title, "A edited");
  });
  await test("new-copy-captures-new-version-existing-copies-stay-independent", async () => {
    const fresh = (
      await service.copyWithResolver(
        {
          sourceService: "kpa",
          sourceAssetId: original.id,
          assetType: "cms",
          targetOrganizationId: orgA,
          createdBy: owner,
        },
        resolver,
      )
    ).snapshot;
    assert.equal(fresh.title, "Source v2");
    assert.equal(fresh.contentJson.body, "<p>Original v2</p>");
    assert.equal(fresh.contentJson.metadata.version, 2);
    assert.equal(
      (await readCopy(b.id, orgB)).contentJson.body,
      "<p>Original v1</p>",
    );
  });
  await test("archived-original-blocks-new-copy-but-retains-existing-copy", async () => {
    await sourceRepo.update(original.id, { status: "archived" });
    await assert.rejects(
      service.copyWithResolver(
        {
          sourceService: "kpa",
          sourceAssetId: original.id,
          assetType: "cms",
          targetOrganizationId: orgA,
          createdBy: owner,
        },
        resolver,
      ),
      /SOURCE_NOT_FOUND/,
    );
    assert.equal((await readCopy(a.id, orgA)).title, "A edited");
  });
  if (process.env.LOCAL_COPY_RESULT_FILE)
    await writeFile(
      process.env.LOCAL_COPY_RESULT_FILE,
      JSON.stringify(
        {
          environment: "isolated-local-postgresql",
          production: false,
          tests: results,
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );
  console.log("Local PostgreSQL verification: " + results.length + " PASS");
} finally {
  try {
    if (ds?.isInitialized) await ds.destroy();
  } finally {
    try {
      if (created) await admin.query("DROP DATABASE " + db + " WITH (FORCE)");
    } finally {
      await admin.end();
      if (dir) await rm(dir, { recursive: true });
    }
  }
}
