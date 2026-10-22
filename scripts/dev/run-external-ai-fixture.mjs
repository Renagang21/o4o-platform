/** Build api-server first. Fixed loopback fixture; no runtime DB_* or real account/provider calls. */
import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { once } from "node:events";
import { DataSource } from "typeorm";
import express from "express";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from "../../apps/api-server/dist/database/bootstrap/canonical-schema-baseline.js";
import { CANONICAL_SCHEMA_BASELINE_META } from "../../apps/api-server/dist/database/bootstrap/canonical-schema-baseline.meta.js";
import { INCREMENTAL_MIGRATIONS } from "../../apps/api-server/dist/database/incremental/manifest.js";
import { EXPECTED_SCHEMA_STATES } from "../../apps/api-server/dist/database/incremental/expected-schema-states.js";
import { computeSchemaFingerprint } from "../../apps/api-server/dist/database/bootstrap/schema-fingerprint.js";
import { entities } from "../../apps/api-server/dist/database/entities.js";
import { createExternalAiRoutes } from "../../apps/api-server/dist/modules/external-ai/external-ai.routes.js";
import { ExternalAiToolService } from "../../apps/api-server/dist/modules/external-ai/tools/tool.service.js";
import {
  changeSettings,
  readSettings,
} from "../../apps/api-server/dist/modules/external-ai/settings/settings.service.js";
import { defaultSettings } from "../../apps/api-server/dist/modules/external-ai/contracts.js";

const options = {
  type: "postgres",
  host: "127.0.0.1",
  port: 55449,
  username: "external_ai_fixture",
};
const database = "o4o_external_ai_fixture",
  marker = `external-ai:${randomUUID()}`;
let count = 0;
async function check(name, fn) {
  await fn();
  count++;
  console.log(`PASS ${name}`);
}
async function bootstrap(db) {
  const q = db.createQueryRunner();
  await q.connect();
  await q.startTransaction();
  try {
    for (const ext of CANONICAL_SCHEMA_BASELINE_META.requiredExtensions)
      await q.query(
        `CREATE EXTENSION "${ext.name}" WITH SCHEMA "${ext.schema}"`,
      );
    for (const sql of CANONICAL_SCHEMA_BASELINE_STATEMENTS) await q.query(sql);
    for (let i = 0; i <= INCREMENTAL_MIGRATIONS.length; i++) {
      const fp = await computeSchemaFingerprint(q),
        expected = EXPECTED_SCHEMA_STATES[i];
      if (
        i === INCREMENTAL_MIGRATIONS.length &&
        process.argv.includes("--inspect-new-state")
      )
        console.log(`NEW_SCHEMA ${fp.hash} ${fp.lineCount}`);
      else {
        assert.equal(fp.hash, expected?.fingerprint, `schema prefix ${i}`);
        assert.equal(fp.lineCount, expected.fingerprintLineCount);
      }
      if (i < INCREMENTAL_MIGRATIONS.length) {
        await q.query("SET LOCAL search_path TO public");
        await new INCREMENTAL_MIGRATIONS[i]().up(q);
      }
    }
    await q.commitTransaction();
  } catch (e) {
    await q.rollbackTransaction();
    throw e;
  } finally {
    await q.release();
  }
  const q2 = db.createQueryRunner();
  await q2.connect();
  await q2.startTransaction();
  try {
    const migration = new (INCREMENTAL_MIGRATIONS.at(-1))();
    await migration.down(q2);
    const prior = await computeSchemaFingerprint(q2);
    assert.equal(
      prior.hash,
      EXPECTED_SCHEMA_STATES[INCREMENTAL_MIGRATIONS.length - 1].fingerprint,
    );
    await q2.query("SET LOCAL search_path TO public");
    await migration.up(q2);
    await q2.commitTransaction();
  } catch (e) {
    await q2.rollbackTransaction();
    throw e;
  } finally {
    await q2.release();
  }
  console.log("Schema prefixes and empty down/up PASS");
}
async function tests(db) {
  const [
    userA,
    userB,
    orgA,
    orgB,
    supplierA,
    supplierB,
    masterA,
    masterB,
    offerA,
    offerB,
  ] = Array.from({ length: 10 }, () => randomUUID());
  await db.query(
    `INSERT INTO users(id,email,status,"isActive","isEmailVerified") VALUES($1,'creator-a@example.invalid','active',true,true),($2,'creator-b@example.invalid','active',true,true)`,
    [userA, userB],
  );
  await db.query(
    `INSERT INTO organizations(id,name,code,type) VALUES($1,'Fixture Supplier A','fixture-a','supplier'),($2,'Fixture Supplier B','fixture-b','supplier')`,
    [orgA, orgB],
  );
  await db.query(
    `INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner'),($3,$4,'owner')`,
    [orgA, userA, orgB, userB],
  );
  await db.query(
    `INSERT INTO neture_suppliers(id,slug,organization_id,status) VALUES($1,'fixture-a',$2,'ACTIVE'),($3,'fixture-b',$4,'ACTIVE')`,
    [supplierA, orgA, supplierB, orgB],
  );
  await db.query(
    `INSERT INTO product_masters(id,regulatory_name,name,manufacturer_name) VALUES($1,'Fixture Product A','Fixture Product A','Fixture Maker'),($2,'Fixture Product B','Fixture Product B','Fixture Maker')`,
    [masterA, masterB],
  );
  await db.query(
    `INSERT INTO supplier_product_offers(id,master_id,supplier_id,slug) VALUES($1,$2,$3,'fixture-a'),($4,$5,$6,'fixture-b')`,
    [offerA, masterA, supplierA, offerB, masterB, supplierB],
  );
  const settings = structuredClone(defaultSettings);
  settings.enabled = true;
  settings.chatgptEnabled = true;
  settings.targets.supplier = { read: true, write: true };
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const config = {
    issuer: new URL(base),
    webOrigin: new URL("http://localhost:5173"),
    redirectUris: ["https://client.example.invalid/callback"],
    credentialKey: randomBytes(32).toString("hex"),
  };
  const module = createExternalAiRoutes(db, config);
  app.use(module.router);
  const provider = module.provider;
  const tools = new ExternalAiToolService(db, config.webOrigin);
  let client, token, connectionId, saved;
  const post = async (path, body) =>
    fetch(base + path, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });
  async function registerAndAuthorize(
    scopes = ["o4o:read", "o4o:draft:write"],
    workspaces = [supplierA],
  ) {
    const registration = await fetch(base + "/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "Fixture AI",
        redirect_uris: config.redirectUris,
        token_endpoint_auth_method: "none",
      }),
    });
    assert.equal(registration.status, 201);
    client = await registration.json();
    const verifier = randomBytes(48).toString("base64url"),
      challenge = createHash("sha256").update(verifier).digest("base64url");
    const url = new URL("/authorize", base);
    Object.entries({
      client_id: client.client_id,
      redirect_uri: config.redirectUris[0],
      response_type: "code",
      code_challenge_method: "S256",
      code_challenge: challenge,
      scope: scopes.join(" "),
      state: "fixture-state",
      resource: provider.resource.href,
    }).forEach(([k, v]) => url.searchParams.set(k, v));
    const started = await fetch(url, { redirect: "manual" });
    assert.equal(started.status, 302);
    const request = new URL(started.headers.get("location")).searchParams.get(
      "request",
    );
    const redirect = new URL(
      await provider.consent(userA, request, workspaces, scopes),
    );
    assert.equal(redirect.searchParams.get("state"), "fixture-state");
    const code = redirect.searchParams.get("code");
    return { code, verifier };
  }
  try {
    await check("default OFF rejects MCP", async () => {
      assert.equal(
        (await fetch(base + "/api/external-ai/mcp", { method: "POST" })).status,
        403,
      );
    });
    await changeSettings(db, 0, settings);
    await check(
      "settings reject stale revision and unimplemented adapter",
      async () => {
        await assert.rejects(
          changeSettings(db, 0, settings),
          /SETTINGS_CONFLICT/,
        );
        const invalid = structuredClone(settings);
        invalid.targets.community.read = true;
        await assert.rejects(
          changeSettings(db, 1, invalid),
          /WORKSPACE_ADAPTER_NOT_READY/,
        );
      },
    );
    await check("unregistered callback rejected", async () => {
      const r = await fetch(base + "/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          redirect_uris: ["https://wrong.example.invalid/callback"],
          token_endpoint_auth_method: "none",
        }),
      });
      assert.equal(r.status, 400);
    });
    const { code, verifier } = await registerAndAuthorize();
    await check("wrong PKCE and wrong resource rejected", async () => {
      assert.equal(
        (
          await post("/token", {
            grant_type: "authorization_code",
            client_id: client.client_id,
            code,
            code_verifier: "wrong",
            redirect_uri: config.redirectUris[0],
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await post("/token", {
            grant_type: "authorization_code",
            client_id: client.client_id,
            code,
            code_verifier: verifier,
            redirect_uri: config.redirectUris[0],
            resource: "https://wrong.example.invalid/mcp",
          })
        ).status,
        400,
      );
    });
    await check(
      "authorization code exchange and replay rejection",
      async () => {
        const response = await post("/token", {
          grant_type: "authorization_code",
          client_id: client.client_id,
          code,
          code_verifier: verifier,
          redirect_uri: config.redirectUris[0],
          resource: provider.resource.href,
        });
        assert.equal(response.status, 200);
        token = await response.json();
        assert.ok(token.access_token);
        connectionId = (await provider.verifyAccessToken(token.access_token))
          .extra.connectionId;
        assert.equal(
          (
            await post("/token", {
              grant_type: "authorization_code",
              client_id: client.client_id,
              code,
              code_verifier: verifier,
              redirect_uri: config.redirectUris[0],
            })
          ).status,
          400,
        );
      },
    );
    await check(
      "OAuth consent itself rejects a foreign workspace",
      async () => {
        const original = client;
        try {
          await assert.rejects(
            registerAndAuthorize(["o4o:read"], [supplierB]),
            /WORKSPACE_FORBIDDEN/,
          );
        } finally {
          client = original;
        }
      },
    );
    await check(
      "confidential client secret is encrypted in storage",
      async () => {
        const response = await fetch(base + "/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            client_name: "Fixture confidential client",
            redirect_uris: config.redirectUris,
            token_endpoint_auth_method: "client_secret_post",
          }),
        });
        assert.equal(response.status, 201);
        const confidential = await response.json();
        assert.ok(confidential.client_secret);
        const [row] = await db.query(
          "SELECT metadata,secret_cipher FROM external_ai_clients WHERE id=$1",
          [confidential.client_id],
        );
        assert.ok(!JSON.stringify(row).includes(confidential.client_secret));
        assert.equal(
          (await provider.clientsStore.getClient(confidential.client_id))
            .client_secret,
          confidential.client_secret,
        );
      },
    );
    await check(
      "official MCP client initialization, tool discovery and own products",
      async () => {
        const mcp = new Client({
          name: "o4o-fixture-client",
          version: "1.0.0",
        });
        try {
          await mcp.connect(
            new StreamableHTTPClientTransport(provider.resource, {
              requestInit: {
                headers: { authorization: `Bearer ${token.access_token}` },
              },
            }),
          );
          const list = await mcp.listTools();
          assert.equal(list.tools.length, 8);
          const result = await mcp.callTool({
            name: "search_products",
            arguments: { workspaceId: supplierA },
          });
          assert.ok(!result.isError, JSON.stringify(result));
          const data = JSON.parse(result.content[0].text);
          assert.equal(data.items.length, 1);
          assert.equal(data.items[0].productId, offerA);
          assert.equal(data.items[0].barcode, null);
        } finally {
          await mcp.close();
        }
      },
    );
    await check(
      "concurrent workspace reads reuse their transaction connection",
      async () => {
        const results = await Promise.all(
          Array.from({ length: 8 }, () =>
            tools.execute("list_workspaces", {}, connectionId),
          ),
        );
        for (const result of results) {
          assert.equal(result.workspaces.length, 1);
          assert.equal(result.workspaces[0].id, supplierA);
        }
      },
    );
    await check("foreign workspace and foreign product denied", async () => {
      await assert.rejects(
        tools.execute(
          "search_products",
          { workspaceId: supplierB },
          connectionId,
        ),
        /WORKSPACE_FORBIDDEN/,
      );
      await assert.rejects(
        tools.execute(
          "get_product_context",
          { workspaceId: supplierA, productId: offerB },
          connectionId,
        ),
        /PRODUCT_NOT_FOUND/,
      );
    });
    const input = {
      workspaceId: supplierA,
      destination: "library_document",
      title: "Fixture draft",
      content: "<p>Fixture content</p><script>bad()</script>",
      requestId: randomUUID(),
    };
    await check(
      "existing library private save, sanitizer and concurrent idempotency",
      async () => {
        const results = await Promise.all([
          tools.execute("save_content_draft", input, connectionId),
          tools.execute("save_content_draft", input, connectionId),
        ]);
        assert.equal(results[0].id, results[1].id);
        saved = results[0];
        assert.ok(!saved.isPublic);
        assert.equal(saved.type, "document");
        assert.ok(!JSON.stringify(saved.blocks).includes("<script>"));
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int AS n FROM neture_supplier_library_items WHERE supplier_id=$1",
              [supplierA],
            )
          )[0].n,
          1,
        );
        await assert.rejects(
          tools.execute(
            "save_content_draft",
            { ...input, content: "changed" },
            connectionId,
          ),
          /REQUEST_ID_REUSED/,
        );
      },
    );
    await check("draft update and stale revision conflict", async () => {
      const update = {
        workspaceId: supplierA,
        destination: "library_document",
        contentId: saved.id,
        content: "<p>Updated</p>",
        expectedRevision: saved.revision,
        requestId: randomUUID(),
      };
      const result = await tools.execute(
        "update_content_draft",
        update,
        connectionId,
      );
      assert.notEqual(result.revision, saved.revision);
      await assert.rejects(
        tools.execute(
          "update_content_draft",
          { ...update, requestId: randomUUID() },
          connectionId,
        ),
        /CONTENT_CONFLICT/,
      );
    });
    await check(
      "published document cannot be modified by external tool",
      async () => {
        await db.query(
          "UPDATE neture_supplier_library_items SET is_public=true WHERE id=$1",
          [saved.id],
        );
        const current = await tools.execute(
          "get_content_draft",
          {
            workspaceId: supplierA,
            destination: "library_document",
            contentId: saved.id,
          },
          connectionId,
        );
        await assert.rejects(
          tools.execute(
            "update_content_draft",
            {
              workspaceId: supplierA,
              destination: "library_document",
              contentId: saved.id,
              expectedRevision: current.revision,
              content: "overwrite",
              requestId: randomUUID(),
            },
            connectionId,
          ),
          /CONTENT_NOT_EDITABLE/,
        );
      },
    );
    await check(
      "existing STORE draft save and no review submission or overwrite",
      async () => {
        const draft = await tools.execute(
          "save_content_draft",
          {
            workspaceId: supplierA,
            destination: "store_description",
            productId: offerA,
            content: "<p>Store description</p>",
            requestId: randomUUID(),
          },
          connectionId,
        );
        assert.equal(draft.status, "draft");
        await assert.rejects(
          tools.execute(
            "save_content_draft",
            {
              workspaceId: supplierA,
              destination: "store_description",
              productId: offerA,
              content: "overwrite",
              requestId: randomUUID(),
            },
            connectionId,
          ),
          /DESCRIPTION_ALREADY_EXISTS_USE_UPDATE/,
        );
      },
    );
    await check("strict input rejects public/owner injection", async () => {
      await assert.rejects(
        tools.execute(
          "save_content_draft",
          { ...input, requestId: randomUUID(), isPublic: true },
          connectionId,
        ),
        /INVALID_TOOL_INPUT/,
      );
    });
    await check("administrator stop affects existing connection", async () => {
      const snapshot = await readSettings(db);
      await changeSettings(db, snapshot.revision, {
        ...settings,
        enabled: false,
      });
      await assert.rejects(
        tools.execute("list_workspaces", {}, connectionId),
        /EXTERNAL_AI_DISABLED/,
      );
      await changeSettings(db, snapshot.revision + 1, settings);
    });
    await check(
      "write stop preserves reads and denies existing delegated writes",
      async () => {
        const snapshot = await readSettings(db),
          readOnly = structuredClone(settings);
        readOnly.targets.supplier.write = false;
        await changeSettings(db, snapshot.revision, readOnly);
        await tools.execute(
          "search_products",
          { workspaceId: supplierA },
          connectionId,
        );
        await assert.rejects(
          tools.execute(
            "save_content_draft",
            { ...input, requestId: randomUUID() },
            connectionId,
          ),
          /EXTERNAL_AI_DISABLED/,
        );
        await changeSettings(db, snapshot.revision + 1, settings);
      },
    );
    await check(
      "read-only grant cannot write and explicit revoke is immediate",
      async () => {
        const original = client;
        try {
          const granted = await registerAndAuthorize(["o4o:read"]);
          const next = await provider.exchangeAuthorizationCode(
            client,
            granted.code,
            undefined,
            config.redirectUris[0],
            provider.resource,
          );
          const id = (await provider.verifyAccessToken(next.access_token)).extra
            .connectionId;
          await assert.rejects(
            tools.execute(
              "save_content_draft",
              { ...input, requestId: randomUUID() },
              id,
            ),
            /SCOPE_FORBIDDEN/,
          );
          await provider.revokeToken(client, { token: next.access_token });
          await assert.rejects(provider.verifyAccessToken(next.access_token));
        } finally {
          client = original;
        }
      },
    );
    await check(
      "required terms gate is enforced for an existing connection",
      async () => {
        const id = randomUUID();
        await db.query(
          `INSERT INTO service_policy_documents(id,service_key,document_type,title,slug,content,status,version) VALUES($1,'neture','terms','Fixture terms','neture-account-terms','Fixture terms','published',2)`,
          [id],
        );
        try {
          await assert.rejects(
            tools.execute(
              "search_products",
              { workspaceId: supplierA },
              connectionId,
            ),
            /TERMS_ACCEPTANCE_REQUIRED/,
          );
        } finally {
          await db.query("DELETE FROM service_policy_documents WHERE id=$1", [
            id,
          ]);
        }
      },
    );
    await check(
      "removed organization membership stops existing connection",
      async () => {
        await db.query(
          "UPDATE organization_members SET left_at=now() WHERE user_id=$1",
          [userA],
        );
        await assert.rejects(
          tools.execute(
            "search_products",
            { workspaceId: supplierA },
            connectionId,
          ),
          /WORKSPACE_FORBIDDEN/,
        );
        await db.query(
          "UPDATE organization_members SET left_at=NULL WHERE user_id=$1",
          [userA],
        );
      },
    );
    await check("inactive account blocks token and current tools", async () => {
      await db.query('UPDATE users SET "isActive"=false WHERE id=$1', [userA]);
      await assert.rejects(provider.verifyAccessToken(token.access_token));
      await db.query('UPDATE users SET "isActive"=true WHERE id=$1', [userA]);
    });
    await check(
      "refresh rotation and reused refresh revokes connection",
      async () => {
        const next = await provider.exchangeRefreshToken(
          client,
          token.refresh_token,
        );
        assert.ok(next.access_token !== token.access_token);
        await assert.rejects(
          provider.exchangeRefreshToken(client, token.refresh_token),
        );
        await assert.rejects(provider.verifyAccessToken(next.access_token));
      },
    );
    await check(
      "credentials and idempotency records contain no raw token/content",
      async () => {
        const raw = JSON.stringify(
          await db.query("SELECT * FROM external_ai_credentials"),
        );
        assert.ok(!raw.includes(token.access_token));
        assert.ok(!raw.includes(token.refresh_token));
        assert.ok(
          !JSON.stringify(
            await db.query("SELECT * FROM external_ai_requests"),
          ).includes("Fixture content"),
        );
      },
    );
    await check(
      "cleanup removes revoked grants and delegated credentials",
      async () => {
        await provider.cleanup();
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int AS n FROM external_ai_connections",
            )
          )[0].n,
          0,
        );
      },
    );
    console.log(`External AI integration PASS: ${count} cases`);
  } finally {
    server.close();
    await once(server, "close");
  }
}
async function main() {
  const control = new DataSource({ ...options, database: "postgres" });
  await control.initialize();
  let created = false;
  try {
    assert.equal(
      (
        await control.query("SELECT 1 FROM pg_database WHERE datname=$1", [
          database,
        ])
      ).length,
      0,
      "Refusing existing fixture database",
    );
    await control.query(`CREATE DATABASE ${database}`);
    created = true;
    await control.query(`COMMENT ON DATABASE ${database} IS '${marker}'`);
    const db = new DataSource({
      ...options,
      database,
      entities,
      extra: {
        max: 4,
        connectionTimeoutMillis: 5000,
        statement_timeout: 10000,
      },
      synchronize: false,
      installExtensions: false,
    });
    await db.initialize();
    try {
      await bootstrap(db);
      if (!process.argv.includes("--inspect-new-state")) await tests(db);
    } finally {
      await db.destroy();
    }
  } finally {
    try {
      if (created) {
        const [row] = await control.query(
          "SELECT shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=$1",
          [database],
        );
        assert.equal(row?.marker, marker, "Refusing changed fixture ownership");
        await control.query(`DROP DATABASE ${database}`);
        assert.equal(
          (
            await control.query("SELECT 1 FROM pg_database WHERE datname=$1", [
              database,
            ])
          ).length,
          0,
        );
        console.log("Fixture cleanup PASS: database count 0");
      }
    } finally {
      await control.destroy();
    }
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
