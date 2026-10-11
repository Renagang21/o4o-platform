import { createRequire } from "node:module";
import { readFile, writeFile, readdir, mkdtemp, rm } from "node:fs/promises";
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
// A worktree may reuse installed, built packages only when their source matches byte for byte.
if (root !== wt) {
  const files = (
    await readdir(wt + "/packages/asset-copy-core/src", { recursive: true })
  )
    .filter((f) => f.endsWith(".ts"))
    .map((f) => "packages/asset-copy-core/src/" + f);
  files.push("packages/cms-core/src/entities/CmsContent.entity.ts");
  for (const file of files)
    assert.equal(
      await readFile(root + "/" + file, "utf8"),
      await readFile(wt + "/" + file, "utf8"),
      "Installed dependency source differs: " + file,
    );
}
const { AssetSnapshot } = await import(
  pathToFileURL(
    root + "/packages/asset-copy-core/dist/entities/asset-snapshot.entity.js",
  ).href
);
const { AssetCopyService } = await import(
  pathToFileURL(
    root + "/packages/asset-copy-core/dist/services/asset-copy.service.js",
  ).href
);
const { CmsContent } = await import(
  pathToFileURL(root + "/packages/cms-core/dist/entities/CmsContent.entity.js")
    .href
);
const src = await readFile(
  wt +
    "/apps/api-server/src/modules/asset-snapshot/resolvers/kpa-asset.resolver.ts",
  "utf8",
);
const code = ts
  .transpileModule(src, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  })
  .outputText.replace(
    /from\s+['"]typeorm['"]/g,
    "from " +
      JSON.stringify(
        pathToFileURL(root + "/node_modules/typeorm/index.mjs").href,
      ),
  )
  .replace(
    /from\s+['"]@o4o-apps\/cms-core\/entities['"]/g,
    "from " +
      JSON.stringify(
        pathToFileURL(
          root + "/packages/cms-core/dist/entities/CmsContent.entity.js",
        ).href,
      ),
  );
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
  await writeFile(dir + "/kpa-asset-resolver-current.mjs", code);
  const { KpaAssetResolver } = await import(
    pathToFileURL(dir + "/kpa-asset-resolver-current.mjs").href
  );

  await admin.connect();
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
    synchronize: true,
  });
  await ds.initialize();
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
