/** Build api-server first. Fixed loopback fixture; no runtime DB_* or real account/provider calls. */
import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { once } from "node:events";
import { runProductContentChecks } from "./external-ai-product-content-fixture.mjs";
import { runPersonalMailChecks } from './personal-mail-fixture.mjs';
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
import {
  ExternalAiToolService,
  writeLimits,
} from "../../apps/api-server/dist/modules/external-ai/tools/tool.service.js";
import {
  changeSettings,
  readSettings,
} from "../../apps/api-server/dist/modules/external-ai/settings/settings.service.js";
import { ForumPostController } from "../../apps/api-server/dist/controllers/forum/ForumPostController.js";
import { defaultSettings } from "../../apps/api-server/dist/modules/external-ai/contracts.js";
import {
  registrationLimits,
  authorizationLimits,
} from "../../apps/api-server/dist/modules/external-ai/auth/oauth-provider.js";

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
  app.disable("x-powered-by");
  // Loopback-only proxy fixture for the SDK IPv6 subnet rate-limit regression.
  app.set("trust proxy", 1);
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
  /** /authorize 를 시작해 PKCE verifier 와 동의 요청 값을 돌려준다 (등록 · 재연결 공용). */
  async function startAuthorization(target, scopes) {
    const verifier = randomBytes(48).toString("base64url"),
      challenge = createHash("sha256").update(verifier).digest("base64url");
    const url = new URL("/authorize", base);
    Object.entries({
      client_id: target.client_id,
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
    return { verifier, request };
  }
  async function registerAndAuthorize(
    scopes = ["o4o:read", "o4o:draft:write"],
    workspaces = [supplierA],
    actor = userA,
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
    const { verifier, request } = await startAuthorization(client, scopes);
    const redirect = new URL(
      await provider.consent(actor, request, workspaces, scopes),
    );
    assert.equal(redirect.searchParams.get("state"), "fixture-state");
    const code = redirect.searchParams.get("code");
    return { code, verifier, client };
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
      "settings reject stale revision and write without read",
      async () => {
        await assert.rejects(
          changeSettings(db, 0, settings),
          /SETTINGS_CONFLICT/,
        );
        const invalid = structuredClone(settings);
        invalid.targets.community.write = true;
        await assert.rejects(
          changeSettings(db, 1, invalid),
          /READ_REQUIRED_FOR_WRITE/,
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
          assert.equal(list.tools.length, 11);
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
    // ── 후속(외부 AI 연결 후속): 권한 변경 · 해제 응답 · 재연결 ──
    async function connectWith(
      existingClient,
      scopes,
      replaceExisting = false,
      workspaces = [supplierA],
      actor = userA,
    ) {
      const { verifier, request } = await startAuthorization(existingClient, scopes);
      const code = new URL(
        await provider.consent(actor, request, workspaces, scopes, replaceExisting),
      ).searchParams.get("code");
      const response = await post("/token", {
        grant_type: "authorization_code",
        client_id: existingClient.client_id,
        code,
        code_verifier: verifier,
        redirect_uri: config.redirectUris[0],
        resource: provider.resource.href,
      });
      assert.equal(response.status, 200);
      const issued = await response.json();
      const id = (await provider.verifyAccessToken(issued.access_token)).extra
        .connectionId;
      return { tokens: issued, id };
    }
    const active = async (id) =>
      (
        await db.query(
          "SELECT count(*)::int AS n FROM external_ai_connections WHERE id=$1 AND revoked_at IS NULL",
          [id],
        )
      )[0].n === 1;
    const revokeClient = (c) =>
      db.query(
        "UPDATE external_ai_connections SET revoked_at=now() WHERE client_id=$1 AND revoked_at IS NULL",
        [c.client_id],
      );
    const draftArgs = () => ({
      workspaceId: supplierA,
      destination: "library_document",
      requestId: randomUUID(),
      title: "Fixture denied",
      content: "<p>Fixture denied</p>",
    });
    await check(
      "read-only connection still lists write tools and gets SCOPE_FORBIDDEN on call",
      async () => {
        const { client: readClient } = await registerAndAuthorize(["o4o:read"]);
        const { tokens: readTokens, id } = await connectWith(readClient, ["o4o:read"]);
        const mcp = new Client({ name: "o4o-fixture-client", version: "1.0.0" });
        try {
          await mcp.connect(
            new StreamableHTTPClientTransport(provider.resource, {
              requestInit: {
                headers: { authorization: `Bearer ${readTokens.access_token}` },
              },
            }),
          );
          const list = await mcp.listTools();
          assert.equal(list.tools.length, 11);
          assert.ok(list.tools.some((t) => t.name === "save_content_draft"));
          const denied = await mcp.callTool({
            name: "save_content_draft",
            arguments: draftArgs(),
          });
          assert.ok(denied.isError);
          const body = JSON.parse(denied.content[0].text);
          assert.equal(body.code, "SCOPE_FORBIDDEN", JSON.stringify(body));
          assert.match(body.message, /초안 저장·수정/);
        } finally {
          await mcp.close();
        }
        assert.ok(await active(id));
        await revokeClient(readClient);
      },
    );
    await check(
      "revoked connection: refresh answers invalid_grant (400), MCP 401 invalid_token, tools CONNECTION_REVOKED",
      async () => {
        const { client: c } = await registerAndAuthorize(["o4o:read"]);
        const { tokens: t, id } = await connectWith(c, ["o4o:read"]);
        await db.query("UPDATE external_ai_connections SET revoked_at=now() WHERE id=$1", [id]);
        const refreshed = await post("/token", {
          grant_type: "refresh_token",
          client_id: c.client_id,
          refresh_token: t.refresh_token,
          resource: provider.resource.href,
        });
        assert.equal(refreshed.status, 400);
        assert.equal((await refreshed.json()).error, "invalid_grant");
        await assert.rejects(
          tools.execute("list_workspaces", {}, id),
          (e) => e.code === "CONNECTION_REVOKED" && e.status === 401,
        );
        const mcpCall = await fetch(provider.resource, {
          method: "POST",
          headers: {
            authorization: `Bearer ${t.access_token}`,
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
          },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
        });
        assert.equal(mcpCall.status, 401);
        assert.match(mcpCall.headers.get("www-authenticate") ?? "", /invalid_token/);
        await revokeClient(c);
      },
    );
    await check("expired connection refresh answers invalid_grant", async () => {
      const { client: c } = await registerAndAuthorize(["o4o:read"]);
      const { tokens: t, id } = await connectWith(c, ["o4o:read"]);
      await db.query(
        "UPDATE external_ai_connections SET expires_at=now()-interval '1 second' WHERE id=$1",
        [id],
      );
      await db.query(
        "UPDATE external_ai_credentials SET expires_at=now()+interval '1 hour' WHERE connection_id=$1 AND kind='refresh'",
        [id],
      );
      const refreshed = await post("/token", {
        grant_type: "refresh_token",
        client_id: c.client_id,
        refresh_token: t.refresh_token,
        resource: provider.resource.href,
      });
      assert.equal(refreshed.status, 400);
      assert.equal((await refreshed.json()).error, "invalid_grant");
      await revokeClient(c);
    });
    await check(
      "reconnect with the same client replaces only when asked; other clients and users are untouched",
      async () => {
        const { client: same } = await registerAndAuthorize(["o4o:read"]);
        const { client: other } = await registerAndAuthorize(["o4o:read"]);
        const first = await connectWith(same, ["o4o:read"]);
        const otherConn = await connectWith(other, ["o4o:read"]);
        const kept = await connectWith(same, ["o4o:read"], false);
        assert.ok(await active(first.id));
        assert.ok(await active(kept.id));
        const replaced = await connectWith(same, ["o4o:read", "o4o:draft:write"], true);
        assert.ok(!(await active(first.id)));
        assert.ok(!(await active(kept.id)));
        assert.ok(await active(replaced.id));
        assert.ok(await active(otherConn.id));
        const foreign = await connectWith(same, ["o4o:read"], false, [supplierB], userB);
        await connectWith(same, ["o4o:read"], true);
        assert.ok(await active(foreign.id));
        await db.query(
          "UPDATE external_ai_connections SET revoked_at=now() WHERE client_id IN ($1,$2) AND revoked_at IS NULL",
          [same.client_id, other.client_id],
        );
      },
    );
    await check(
      "cleanup removes delegated credentials and retains recent quota parents",
      async () => {
        await provider.cleanup();
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int AS n FROM external_ai_connections WHERE revoked_at IS NULL AND expires_at>now()",
            )
          )[0].n,
          0,
        );
      },
    );
    await expandedTests(db, tools, provider, registerAndAuthorize, base, post);
    await check(
      "SDK registration groups trusted IPv6 addresses by subnet and keeps other subnets independent",
      async () => {
        // Each response must precede the next attempt to verify the exact rate-limit boundary.
        await Array.from({ length: 21 }, (_, index) => index + 1).reduce(
          (previous, i) =>
            previous.then(async () => {
              const response = await fetch(new URL("/register", base), {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  "x-forwarded-for": `2001:db8:abcd:1200::${i.toString(16)}`,
                },
                body: JSON.stringify({
                  client_name: "Fixture IPv6",
                  redirect_uris: [config.redirectUris[0]],
                  token_endpoint_auth_method: "none",
                }),
              });
              assert.equal(response.status, i <= 20 ? 201 : 429);
            }),
          Promise.resolve(),
        );
        const otherSubnet = await fetch(new URL("/register", base), {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-forwarded-for": "2001:db8:abcd:1300::1",
          },
          body: JSON.stringify({
            client_name: "Fixture separate IPv6",
            redirect_uris: [config.redirectUris[0]],
            token_endpoint_auth_method: "none",
          }),
        });
        assert.equal(otherSubnet.status, 201);
      },
    );
    await check(
      "SDK rejects repeated public registration before more rows are stored",
      async () => {
        let limited = false;
        for (let i = 0; i <= 20; i++) {
          const before = (
            await db.query("SELECT count(*)::int AS n FROM external_ai_clients")
          )[0].n;
          const response = await fetch(base + "/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              redirect_uris: config.redirectUris,
              token_endpoint_auth_method: "none",
            }),
          });
          if (response.status === 429) {
            limited = true;
            assert.ok(response.headers.get("retry-after"));
            assert.equal(
              (
                await db.query(
                  "SELECT count(*)::int AS n FROM external_ai_clients",
                )
              )[0].n,
              before,
            );
            break;
          }
          assert.equal(response.status, 201);
        }
        assert.ok(limited);
      },
    );
    const registration = {
      redirect_uris: config.redirectUris,
      token_endpoint_auth_method: "none",
    };
    await check(
      "global registration capacity is atomic across provider instances",
      async () => {
        const prefix = `fixture-capacity-${randomUUID()}-`;
        const before = (
          await db.query("SELECT count(*)::int AS n FROM external_ai_clients")
        )[0].n;
        await db.query(
          `INSERT INTO external_ai_clients(id,metadata,created_at)
        SELECT $1||n,'{}'::jsonb,now()-interval '2 hours' FROM generate_series(1,$2::int) n`,
          [prefix, registrationLimits.storedClients - before - 1],
        );
        const otherProvider = new provider.constructor(
          db,
          config,
          provider.authorizeWorkspaces,
        );
        const results = await Promise.allSettled([
          provider.clientsStore.registerClient(registration),
          otherProvider.clientsStore.registerClient(registration),
        ]);
        try {
          assert.equal(
            results.filter((r) => r.status === "fulfilled").length,
            1,
          );
          const rejected = results.find((r) => r.status === "rejected");
          assert.equal(rejected.reason.errorCode, "too_many_requests");
          assert.equal(
            (
              await db.query(
                "SELECT count(*)::int AS n FROM external_ai_clients",
              )
            )[0].n,
            registrationLimits.storedClients,
          );
        } finally {
          await db.query(
            "DELETE FROM external_ai_clients WHERE id LIKE $1 OR id=ANY($2::text[])",
            [
              `${prefix}%`,
              results
                .filter((r) => r.status === "fulfilled")
                .map((r) => r.value.client_id),
            ],
          );
        }
      },
    );
    await check(
      "global hourly registration quota rejects without a database write",
      async () => {
        const prefix = `fixture-hourly-${randomUUID()}-`;
        await db.query(
          `INSERT INTO external_ai_clients(id,metadata)
        SELECT $1||n,'{}'::jsonb FROM generate_series(1,$2::int) n`,
          [prefix, registrationLimits.newClientsPerHour],
        );
        try {
          const before = (
            await db.query("SELECT count(*)::int AS n FROM external_ai_clients")
          )[0].n;
          await assert.rejects(
            provider.clientsStore.registerClient(registration),
            { errorCode: "too_many_requests" },
          );
          assert.equal(
            (
              await db.query(
                "SELECT count(*)::int AS n FROM external_ai_clients",
              )
            )[0].n,
            before,
          );
        } finally {
          await db.query("DELETE FROM external_ai_clients WHERE id LIKE $1", [
            `${prefix}%`,
          ]);
        }
      },
    );
    const authorizationParams = {
      redirectUri: config.redirectUris[0],
      codeChallenge: randomBytes(32).toString("base64url"),
      scopes: ["o4o:read"],
    };
    const responseSink = () => ({ setHeader() {}, redirect() {} });
    await check(
      "pending authorizations are bounded per client before persistence",
      async () => {
        const prefix = `fixture-pending-client-${randomUUID()}-`;
        const before = (
          await db.query(
            "SELECT count(*)::int AS n FROM external_ai_credentials WHERE kind='pending' AND client_id=$1",
            [client.client_id],
          )
        )[0].n;
        await db.query(
          `INSERT INTO external_ai_credentials(hash,kind,client_id,expires_at)
        SELECT $1||n,'pending',$2,now()+interval '10 minutes' FROM generate_series(1,$3::int) n`,
          [
            prefix,
            client.client_id,
            authorizationLimits.pendingPerClient - before,
          ],
        );
        try {
          await assert.rejects(
            provider.authorize(client, authorizationParams, responseSink()),
            { errorCode: "too_many_requests" },
          );
          assert.equal(
            (
              await db.query(
                "SELECT count(*)::int AS n FROM external_ai_credentials WHERE kind='pending' AND client_id=$1",
                [client.client_id],
              )
            )[0].n,
            authorizationLimits.pendingPerClient,
          );
          await db.query(
            "UPDATE external_ai_credentials SET expires_at=now()-interval '1 second' WHERE hash LIKE $1",
            [`${prefix}%`],
          );
          await provider.authorize(client, authorizationParams, responseSink());
          assert.equal(
            (
              await db.query(
                "SELECT count(*)::int AS n FROM external_ai_credentials WHERE hash LIKE $1",
                [`${prefix}%`],
              )
            )[0].n,
            0,
          );
        } finally {
          await db.query(
            "DELETE FROM external_ai_credentials WHERE hash LIKE $1",
            [`${prefix}%`],
          );
        }
      },
    );
    await check(
      "pending authorization global bound survives concurrent provider requests",
      async () => {
        const prefix = `fixture-pending-global-${randomUUID()}-`;
        const otherClient = (
          await db.query(
            "SELECT id FROM external_ai_clients WHERE id<>$1 LIMIT 1",
            [client.client_id],
          )
        )[0].id;
        const before = (
          await db.query(
            "SELECT count(*)::int AS n FROM external_ai_credentials WHERE kind='pending'",
          )
        )[0].n;
        await db.query(
          `INSERT INTO external_ai_credentials(hash,kind,client_id,expires_at)
        SELECT $1||n,'pending',$2,now()+interval '10 minutes' FROM generate_series(1,$3::int) n`,
          [prefix, otherClient, authorizationLimits.pendingTotal - before - 1],
        );
        try {
          const otherProvider = new provider.constructor(
            db,
            config,
            provider.authorizeWorkspaces,
          );
          const results = await Promise.allSettled([
            provider.authorize(client, authorizationParams, responseSink()),
            otherProvider.authorize(
              client,
              authorizationParams,
              responseSink(),
            ),
          ]);
          assert.equal(
            results.filter((r) => r.status === "fulfilled").length,
            1,
          );
          assert.equal(
            results.find((r) => r.status === "rejected").reason.errorCode,
            "too_many_requests",
          );
          assert.equal(
            (
              await db.query(
                "SELECT count(*)::int AS n FROM external_ai_credentials WHERE kind='pending'",
              )
            )[0].n,
            authorizationLimits.pendingTotal,
          );
        } finally {
          await db.query(
            "DELETE FROM external_ai_credentials WHERE hash LIKE $1",
            [`${prefix}%`],
          );
        }
      },
    );
    await check(
      "SDK limits repeated authorization HTTP requests before pending persistence",
      async () => {
        const url = new URL("/authorize", base);
        for (const [key, value] of Object.entries({
          client_id: client.client_id,
          redirect_uri: config.redirectUris[0],
          response_type: "code",
          code_challenge_method: "S256",
          code_challenge: authorizationParams.codeChallenge,
          scope: "o4o:read",
        }))
          url.searchParams.set(key, value);
        let limited = false;
        for (let i = 0; i <= 100; i++) {
          const before = (
            await db.query(
              "SELECT count(*)::int AS n FROM external_ai_credentials WHERE kind='pending'",
            )
          )[0].n;
          const response = await fetch(url, { redirect: "manual" });
          if (response.status === 429) {
            limited = true;
            assert.ok(response.headers.get("retry-after"));
            assert.equal(
              (
                await db.query(
                  "SELECT count(*)::int AS n FROM external_ai_credentials WHERE kind='pending'",
                )
              )[0].n,
              before,
            );
            break;
          }
          assert.equal(response.status, 302);
        }
        assert.ok(limited);
      },
    );
    console.log(`External AI integration PASS: ${count} cases`);
  } finally {
    server.close();
    await once(server, "close");
  }
}
async function expandedTests(db, tools, provider, register, base, post) {
  const [
    owner,
    staff,
    member,
    other,
    coopUser,
    store,
    foreignStore,
    businessOrg,
    foreignOrg,
    coopOrg,
    business,
    foreignBusiness,
    coopBusiness,
    cooperative,
    board,
    closedBoard,
    businessBoard,
    coopBoard,
    product,
    foreignProduct,
  ] = Array.from({ length: 20 }, () => randomUUID());
  for (const [id, label] of [
    [owner, "owner"],
    [staff, "staff"],
    [member, "member"],
    [other, "other"],
    [coopUser, "coop"],
  ])
    await db.query(
      `INSERT INTO users(id,email,status,"isActive","isEmailVerified") VALUES($1,$2,'active',true,true)`,
      [id, `fixture-${label}@example.invalid`],
    );
  for (const [id, label] of [
    [store, "store"],
    [foreignStore, "other-store"],
    [businessOrg, "business"],
    [foreignOrg, "foreign-business"],
    [coopOrg, "cooperative"],
  ])
    await db.query(
      `INSERT INTO organizations(id,name,code,type) VALUES($1,$2,$2,'pharmacy')`,
      [id, `external-fixture-${label}`],
    );
  for (const [org, user, role] of [
    [store, owner, "owner"],
    [store, staff, "staff"],
    [foreignStore, other, "owner"],
  ])
    await db.query(
      `INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,$3)`,
      [org, user, role],
    );
  for (const [org, user, bizNo] of [
    [store, owner, "fixture-business-1"],
    [foreignStore, other, "fixture-business-2"],
  ])
    await db.query(
      `INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,pharmacy_name,business_number,pharmacist_license_number) VALUES($1,$2,'active','Fixture pharmacy',$3,'fixture-license')`,
      [org, user, bizNo],
    );
  for (const [id, key, org] of [
    [business, "fixture-ai-business", businessOrg],
    [foreignBusiness, "fixture-ai-other", foreignOrg],
    [coopBusiness, "fixture-ai-coop", coopOrg],
  ])
    await db.query(
      `INSERT INTO semi_franchises(id,key,name,organization_id,status) VALUES($1,$2,$2,$3,'active')`,
      [id, key, org],
    );
  await db.query(
    `INSERT INTO cooperatives(id,slug,name,semi_franchise_id,status) VALUES($1,'fixture-ai-coop','Fixture cooperative',$2,'active')`,
    [cooperative, coopBusiness],
  );
  await db.query(
    `INSERT INTO cooperative_roles(cooperative_id,user_id,role) VALUES($1,$2,'operator')`,
    [cooperative, coopUser],
  );
  await db.query(
    `INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'neture:operator',true),($2,'kpa:store_member',true)`,
    [owner, staff],
  );
  await db.query(
    `INSERT INTO semi_franchise_operators(semi_franchise_id,user_id) VALUES($1,$2)`,
    [business, owner],
  );
  await db.query(
    `INSERT INTO semi_franchise_memberships(semi_franchise_id,organization_id,status) VALUES($1,$2,'active')`,
    [business, store],
  );
  await db.query(
    `INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'community','member','active'),($1,'neture','member','suspended'),($2,'neture','member','suspended'),($3,'neture','member','suspended')`,
    [member, staff, coopUser],
  );
  for (const [id, org, name] of [
    [product, store, "Fixture local product"],
    [foreignProduct, foreignStore, "Foreign product"],
  ])
    await db.query(
      `INSERT INTO store_local_products(id,organization_id,name,barcode) VALUES($1,$2,$3,NULL)`,
      [id, org, name],
    );
  for (const [id, name, service, type] of [
    [board, "Fixture shared board", "community", "open"],
    [closedBoard, "Fixture closed board", "community", "closed"],
    [businessBoard, "Fixture business board", `sf:${business}`, "open"],
    [coopBoard, "Fixture cooperative board", `sf:${coopBusiness}`, "open"],
  ])
    await db.query(
      `INSERT INTO forum_category_requests(id,name,description,status,service_code,requester_id,requester_name,forum_type,slug) VALUES($1,$2,'Fixture board','completed',$3,$4,'Fixture author',$5,$1::uuid::text)`,
      [id, name, service, owner, type],
    );
  const snapshot = await readSettings(db),
    settings = structuredClone(snapshot.settings);
  for (const target of Object.values(settings.targets)) {
    target.read = true;
    target.write = true;
  }
  await changeSettings(db, snapshot.revision, settings);
  const grantIds = [];
  async function grant(
    user,
    workspaces,
    scopes = ["o4o:read", "o4o:draft:write"],
  ) {
    const g = await register(scopes, workspaces, user);
    const response = await post("/token", {
      client_id: g.client.client_id,
      grant_type: "authorization_code",
      code: g.code,
      code_verifier: g.verifier,
      redirect_uri: provider.config.redirectUris[0],
      resource: provider.resource.href,
    });
    assert.equal(response.status, 200);
    const token = await response.json(),
      info = await provider.verifyAccessToken(token.access_token);
    const id = info.extra.connectionId;
    grantIds.push(id);
    return { id, token };
  }
  const storeId = `store:${store}`,
    orgId = `organization:${business}`,
    communityId = `community:${board}`,
    businessCommunityId = `community:${businessBoard}`,
    coopId = `organization:${coopBusiness}`,
    coopCommunityId = `community:${coopBoard}`;
  const ownerGrant = await grant(owner, [storeId, orgId, businessCommunityId]);
  const memberGrant = await grant(member, [communityId]);
  const coopGrant = await grant(coopUser, [coopId, coopCommunityId]);
  const exec = (name, input, g = ownerGrant) =>
    tools.execute(name, input, g.id);
  const draft = (workspaceId, destination, title = "Fixture content") => ({
    workspaceId,
    destination,
    title,
    content:
      "<h2>Fixture content</h2><p>Verified source only.</p><script>bad()</script>",
    requestId: randomUUID(),
  });
  let storeDraft, orgDraft, communityDraft, coopDraft;
  await runProductContentChecks({
    db,
    check,
    exec,
    resource: provider.resource,
    ownerGrant,
    owner,
    store,
    storeId,
    orgId,
    businessOrg,
    product,
    foreignProduct,
    foreignStore,
  });
  await check(
    "all workspace kinds use live permissions; selected grants never expand",
    async () => {
      const a = await exec("list_workspaces", {});
      assert.deepEqual(
        a.workspaces.map((w) => w.id).sort(),
        [storeId, orgId, businessCommunityId].sort(),
      );
      assert.ok(a.workspaces.every((w) => w.destinations.length && w.writable));
      assert.equal(
        (await exec("list_workspaces", {}, memberGrant)).workspaces[0].kind,
        "community",
      );
      await assert.rejects(
        grant(member, [`community:${closedBoard}`]),
        /WORKSPACE_FORBIDDEN/,
      );
      await assert.rejects(
        grant(owner, [`organization:${foreignBusiness}`]),
        /WORKSPACE_FORBIDDEN/,
      );
    },
  );
  await check(
    "store local product without barcode and foreign product isolation",
    async () => {
      const products = await exec("search_products", { workspaceId: storeId });
      assert.equal(products.items.length, 1);
      assert.equal(products.items[0].productId, product);
      assert.equal(
        (
          await exec("get_product_context", {
            workspaceId: storeId,
            productId: product,
          })
        ).product.barcode,
        null,
      );
      await assert.rejects(
        exec("get_product_context", {
          workspaceId: storeId,
          productId: foreignProduct,
        }),
        /PRODUCT_NOT_FOUND/,
      );
    },
  );
  await check(
    "store draft uses existing execution asset and material reader, no publication",
    async () => {
      const input = draft(storeId, "store_document");
      storeDraft = await exec("save_content_draft", input);
      assert.equal(storeDraft.status, "private_material");
      assert.ok(!storeDraft.content.includes("<script>"));
      assert.equal(storeDraft.id, (await exec("save_content_draft", input)).id);
      const [asset] = await db.query(
        `SELECT organization_id,source_type,usage_type FROM store_execution_assets WHERE id=$1`,
        [storeDraft.id],
      );
      assert.equal(asset.organization_id, store);
      assert.equal(asset.source_type, "generated");
      assert.equal(asset.usage_type, null);
      assert.equal(
        (
          await exec("get_material", {
            workspaceId: storeId,
            materialId: storeDraft.id,
          })
        ).id,
        storeDraft.id,
      );
      assert.equal(
        new URL(storeDraft.openUrl).searchParams.get("organizationId"),
        store,
      );
      const update = {
        ...draft(storeId, "store_document"),
        content: "<p>Changed store text</p>",
        contentId: storeDraft.id,
        expectedRevision: storeDraft.revision,
      };
      storeDraft = await exec("update_content_draft", update);
      await assert.rejects(
        exec("update_content_draft", { ...update, requestId: randomUUID() }),
        /CONTENT_CONFLICT/,
      );
    },
  );
  await check(
    "store in-use QR and cross-destination writes cannot be silently changed",
    async () => {
      await db.query(
        `INSERT INTO store_qr_codes(organization_id,title,library_item_id,slug) VALUES($1,'Fixture QR',$2,'fixture-external-qr')`,
        [store, storeDraft.id],
      );
      const current = await exec("get_content_draft", {
        workspaceId: storeId,
        destination: "store_document",
        contentId: storeDraft.id,
      });
      assert.equal(current.editable, false);
      await assert.rejects(
        exec("update_content_draft", {
          ...draft(storeId, "store_document"),
          contentId: current.id,
          expectedRevision: current.revision,
        }),
        /CONTENT_NOT_EDITABLE/,
      );
      await assert.rejects(
        exec("save_content_draft", draft(storeId, "business_content")),
        /DESTINATION_FORBIDDEN/,
      );
    },
  );
  await check(
    "business draft uses existing content service; published and review-source rows protected",
    async () => {
      orgDraft = await exec(
        "save_content_draft",
        draft(orgId, "business_content"),
      );
      const [row] = await db.query(
        "SELECT semi_franchise_id,status,created_by,published_at FROM semi_franchise_contents WHERE id=$1",
        [orgDraft.id],
      );
      assert.equal(row.semi_franchise_id, business);
      assert.equal(row.created_by, owner);
      assert.equal(row.status, "draft");
      assert.equal(row.published_at, null);
      const modified = await exec("update_content_draft", {
        ...draft(orgId, "business_content"),
        contentId: row.id ?? orgDraft.id,
        expectedRevision: orgDraft.revision,
      });
      await db.query(
        "UPDATE semi_franchise_contents SET status='published' WHERE id=$1",
        [orgDraft.id],
      );
      await assert.rejects(
        exec("update_content_draft", {
          ...draft(orgId, "business_content"),
          contentId: orgDraft.id,
          expectedRevision: modified.revision,
        }),
        /CONTENT_NOT_EDITABLE/,
      );
      await assert.rejects(
        exec("get_material", { workspaceId: orgId, materialId: storeDraft.id }),
        /MATERIAL_NOT_FOUND/,
      );
      const [supplier] = await db.query(
        "SELECT id FROM neture_suppliers ORDER BY slug LIMIT 1",
      );
      await db.query(
        "UPDATE semi_franchise_contents SET status='draft', source_supplier_id=$2 WHERE id=$1",
        [orgDraft.id, supplier.id],
      );
      const received = await exec("get_content_draft", {
        workspaceId: orgId,
        destination: "business_content",
        contentId: orgDraft.id,
      });
      assert.equal(received.editable, false);
      await assert.rejects(
        exec("update_content_draft", {
          ...draft(orgId, "business_content"),
          contentId: orgDraft.id,
          expectedRevision: received.revision,
        }),
        /CONTENT_NOT_EDITABLE/,
      );
      assert.equal(
        (await exec("search_products", { workspaceId: orgId })).items.length,
        0,
      );
    },
  );
  await check(
    "community MCP HTTP draft is private, attributable, sanitized and idempotent",
    async () => {
      const mcp = new Client({ name: "Workspace Fixture", version: "1" });
      await mcp.connect(
        new StreamableHTTPClientTransport(
          new URL("/api/external-ai/mcp", base),
          {
            requestInit: {
              headers: {
                Authorization: `Bearer ${memberGrant.token.access_token}`,
              },
            },
          },
        ),
      );
      try {
        const input = draft(communityId, "community_post");
        const result = await mcp.callTool({
          name: "save_content_draft",
          arguments: input,
        });
        assert.ok(!result.isError, JSON.stringify(result));
        communityDraft = JSON.parse(result.content[0].text);
        assert.equal(communityDraft.status, "draft");
        assert.ok(!JSON.stringify(communityDraft.content).includes("<script>"));
        const [saved] = await db.query(
          "SELECT author_id,forum_id,published_at FROM forum_post WHERE id=$1",
          [communityDraft.id],
        );
        assert.equal(saved.author_id, member);
        assert.equal(saved.forum_id, board);
        assert.equal(saved.published_at, null);
        assert.equal(
          (await exec("save_content_draft", input, memberGrant)).id,
          communityDraft.id,
        );
      } finally {
        await mcp.close();
      }
    },
  );
  class FixturePosts extends ForumPostController {
    get postRepository() {
      return db.getRepository("ForumPost");
    }
    get likeRepository() {
      return db.getRepository("ForumPostLike");
    }
    async resolveForumPostInServiceScope(id, context) {
      const q = this.postRepository
        .createQueryBuilder("post")
        .where("post.id = :id", { id });
      this.applyContextFilter(q, "post", context);
      return q.getOne();
    }
    async checkClosedForumAccess() {
      return { allowed: true };
    }
  }
  await check(
    "existing forum API keeps private drafts out of foreign lists and detail URLs",
    async () => {
      const controller = new FixturePosts(),
        context = {
          scope: "community",
          serviceCode: "community",
          communityKey: "community",
          forumStorageCodes: ["community"],
        };
      const response = () => {
        const r = {
          statusCode: 200,
          body: null,
          json(value) {
            this.body = value;
            return this;
          },
          status(value) {
            this.statusCode = value;
            return this;
          },
        };
        return r;
      };
      for (const userId of [other, undefined]) {
        const res = response();
        await controller.getPost(
          {
            params: { id: communityDraft.id },
            query: {},
            user: userId ? { id: userId, roles: [] } : undefined,
            forumContext: context,
          },
          res,
        );
        assert.equal(res.statusCode, 404);
        const list = response();
        await controller.listPosts(
          {
            query: { status: "draft" },
            user: userId ? { id: userId, roles: [] } : undefined,
            forumContext: context,
          },
          list,
        );
        assert.equal(list.statusCode, 200);
        assert.ok(!list.body.data.some((p) => p.id === communityDraft.id));
      }
      const own = response();
      await controller.getPost(
        {
          params: { id: communityDraft.id },
          query: {},
          user: { id: member, roles: [] },
          forumContext: context,
        },
        own,
      );
      assert.equal(own.statusCode, 200);
      assert.equal(own.body.data.id, communityDraft.id);
      const mine = response();
      await controller.listPosts(
        {
          query: { author: "me" },
          user: { id: member, roles: [] },
          forumContext: context,
        },
        mine,
      );
      assert.ok(mine.body.data.some((p) => p.id === communityDraft.id));
    },
  );
  await check(
    "another member cannot read or replace another author draft",
    async () => {
      await db.query(
        `INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'community','member','active')`,
        [other],
      );
      const otherGrant = await grant(other, [communityId]);
      assert.equal(
        (await exec("list_materials", { workspaceId: communityId }, otherGrant))
          .items.length,
        0,
      );
      await assert.rejects(
        exec(
          "get_material",
          { workspaceId: communityId, materialId: communityDraft.id },
          otherGrant,
        ),
        /MATERIAL_NOT_FOUND/,
      );
      await assert.rejects(
        exec(
          "update_content_draft",
          {
            ...draft(communityId, "community_post"),
            contentId: communityDraft.id,
            expectedRevision: communityDraft.revision,
          },
          otherGrant,
        ),
        /CONTENT_NOT_FOUND/,
      );
      const update = {
        ...draft(communityId, "community_post"),
        content: "<p>Changed community text</p>",
        contentId: communityDraft.id,
        expectedRevision: communityDraft.revision,
      };
      communityDraft = await exec("update_content_draft", update, memberGrant);
      await assert.rejects(
        exec(
          "update_content_draft",
          { ...update, requestId: randomUUID() },
          memberGrant,
        ),
        /CONTENT_CONFLICT/,
      );
    },
  );
  await check(
    "user publishes the delegated draft through the existing forum API; external edits then stop",
    async () => {
      const controller = new FixturePosts(),
        res = {
          statusCode: 200,
          body: null,
          json(value) {
            this.body = value;
            return this;
          },
          status(value) {
            this.statusCode = value;
            return this;
          },
        };
      await controller.updatePost(
        {
          params: { id: communityDraft.id },
          user: { id: member, roles: [] },
          body: {
            title: "User reviewed title",
            content: "<p>User reviewed body</p>",
            status: "publish",
          },
          forumContext: {
            scope: "community",
            serviceCode: "community",
            communityKey: "community",
            forumStorageCodes: ["community"],
          },
        },
        res,
      );
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      const [published] = await db.query(
        "SELECT status,published_at FROM forum_post WHERE id=$1",
        [communityDraft.id],
      );
      assert.equal(published.status, "publish");
      assert.ok(published.published_at);
      await assert.rejects(
        exec(
          "update_content_draft",
          {
            ...draft(communityId, "community_post"),
            contentId: communityDraft.id,
            expectedRevision: communityDraft.revision,
          },
          memberGrant,
        ),
        /CONTENT_NOT_EDITABLE/,
      );
      assert.ok(
        (
          await exec(
            "list_materials",
            { workspaceId: communityId },
            memberGrant,
          )
        ).items.some((p) => p.id === communityDraft.id),
      );
    },
  );
  await check(
    "closed board membership and own service suspension are rechecked",
    async () => {
      await db.query(
        `INSERT INTO forum_category_members(forum_category_id,user_id,role) VALUES($1,$2,'member')`,
        [closedBoard, member],
      );
      const closedGrant = await grant(member, [`community:${closedBoard}`]);
      await exec(
        "save_content_draft",
        draft(`community:${closedBoard}`, "community_post"),
        closedGrant,
      );
      await db.query(
        "DELETE FROM forum_category_members WHERE forum_category_id=$1 AND user_id=$2",
        [closedBoard, member],
      );
      await assert.rejects(
        exec(
          "list_materials",
          { workspaceId: `community:${closedBoard}` },
          closedGrant,
        ),
        /WORKSPACE_FORBIDDEN/,
      );
      await db.query(
        "UPDATE service_memberships SET status='suspended' WHERE user_id=$1 AND service_key='community'",
        [member],
      );
      await assert.rejects(
        exec("list_materials", { workspaceId: communityId }, memberGrant),
        /WORKSPACE_FORBIDDEN/,
      );
      await db.query(
        "UPDATE service_memberships SET status='active' WHERE user_id=$1 AND service_key='community'",
        [member],
      );
    },
  );
  await check(
    "business community member and operator cannot cross another business board",
    async () => {
      const row = await exec(
        "save_content_draft",
        draft(businessCommunityId, "community_post"),
      );
      assert.equal(row.status, "draft");
      const [originalBusiness] = await db.query(
        "SELECT key FROM semi_franchises WHERE id=$1",
        [business],
      );
      for (const key of ["pharmacy", "drugstore"]) {
        const [collision] = await db.query(
          "SELECT id FROM semi_franchises WHERE key=$1",
          [key],
        );
        if (collision)
          await db.query("UPDATE semi_franchises SET key=$1 WHERE id=$2", [
            `fixture-moved-${randomUUID()}`,
            collision.id,
          ]);
        try {
          await db.query("UPDATE semi_franchises SET key=$1 WHERE id=$2", [
            key,
            business,
          ]);
          const opened = await exec("get_content_draft", {
            workspaceId: businessCommunityId,
            destination: "community_post",
            contentId: row.id,
          });
          assert.equal(
            opened.openUrl,
            `https://${key}.neture.co.kr/community/write?edit=${row.id}`,
          );
          const businessContent = await exec("get_content_draft", {
            workspaceId: orgId,
            destination: "business_content",
            contentId: orgDraft.id,
          });
          assert.equal(
            businessContent.openUrl,
            `https://${key}.neture.co.kr/operator/semi-franchises/${key}/contents/${orgDraft.id}/edit`,
          );
        } finally {
          await db.query("UPDATE semi_franchises SET key=$1 WHERE id=$2", [
            originalBusiness.key,
            business,
          ]);
          if (collision)
            await db.query("UPDATE semi_franchises SET key=$1 WHERE id=$2", [
              key,
              collision.id,
            ]);
        }
      }
      await assert.rejects(
        grant(member, [businessCommunityId]),
        /WORKSPACE_FORBIDDEN/,
      );
      await db.query(
        "UPDATE semi_franchise_memberships SET status='suspended' WHERE semi_franchise_id=$1 AND organization_id=$2",
        [business, store],
      );
      // Its assigned operator remains allowed; a member's enrollment cannot grant operator rights.
      assert.equal(
        (await exec("list_materials", { workspaceId: businessCommunityId }))
          .items[0].id,
        row.id,
      );
    },
  );
  await check(
    "approved staff use own store without a personal Neture membership; revocation immediate",
    async () => {
      const staffGrant = await grant(staff, [storeId]);
      const item = await exec(
        "save_content_draft",
        draft(storeId, "store_document"),
        staffGrant,
      );
      assert.equal(item.status, "private_material");
      await db.query(
        "UPDATE role_assignments SET is_active=false WHERE user_id=$1 AND role='kpa:store_member'",
        [staff],
      );
      await assert.rejects(
        exec("list_materials", { workspaceId: storeId }, staffGrant),
        /WORKSPACE_FORBIDDEN/,
      );
    },
  );
  await check(
    "cooperative operator and its forum use scoped roles without unrelated main membership",
    async () => {
      coopDraft = await exec(
        "save_content_draft",
        draft(coopId, "business_content"),
        coopGrant,
      );
      assert.equal(coopDraft.status, "draft");
      assert.ok(
        coopDraft.openUrl.includes("/fixture-ai-coop/operator/contents/"),
      );
      const item = await exec(
        "save_content_draft",
        draft(coopCommunityId, "community_post"),
        coopGrant,
      );
      assert.ok(item.openUrl.includes("/fixture-ai-coop/community?edit="));
      await db.query(
        "UPDATE cooperative_roles SET revoked_at=now() WHERE cooperative_id=$1 AND user_id=$2",
        [cooperative, coopUser],
      );
      await assert.rejects(
        exec("list_materials", { workspaceId: coopId }, coopGrant),
        /WORKSPACE_FORBIDDEN/,
      );
      await assert.rejects(
        exec("list_materials", { workspaceId: coopCommunityId }, coopGrant),
        /WORKSPACE_FORBIDDEN/,
      );
    },
  );
  await check(
    "per-kind admin stop affects old grants without stopping other kinds",
    async () => {
      const snapshot = await readSettings(db),
        changed = structuredClone(snapshot.settings);
      changed.targets.community = { read: false, write: false };
      await changeSettings(db, snapshot.revision, changed);
      await assert.rejects(
        exec("list_materials", { workspaceId: communityId }, memberGrant),
        /EXTERNAL_AI_DISABLED/,
      );
      await exec("list_materials", { workspaceId: storeId });
      assert.equal(
        (await exec("list_workspaces", {}, memberGrant)).workspaces.length,
        0,
      );
      await changeSettings(db, snapshot.revision + 1, settings);
    },
  );
  await check(
    "store suspension and business operator expiration stop existing grants",
    async () => {
      await db.query(
        "UPDATE neture_pharmacy_memberships SET status='suspended' WHERE organization_id=$1",
        [store],
      );
      await assert.rejects(
        exec("list_materials", { workspaceId: storeId }),
        /WORKSPACE_FORBIDDEN/,
      );
      await db.query(
        "UPDATE role_assignments SET valid_until=now()-interval '1 second' WHERE user_id=$1 AND role='neture:operator'",
        [owner],
      );
      await assert.rejects(
        exec("list_materials", { workspaceId: orgId }),
        /WORKSPACE_FORBIDDEN/,
      );
    },
  );
  await check(
    "write quota serializes the last slot and allows an idempotent retry",
    async () => {
      const fingerprint = `fixture-write-quota-${randomUUID()}`;
      const before = (
        await db.query(
          "SELECT count(*)::int AS n FROM external_ai_requests WHERE connection_id=$1 AND expires_at>now()",
          [memberGrant.id],
        )
      )[0].n;
      await db.query(
        `INSERT INTO external_ai_requests(connection_id,request_id,fingerprint,result,expires_at)
      SELECT $1,gen_random_uuid(),$2,$3,now()+interval '24 hours' FROM generate_series(1,$4::int)`,
        [
          memberGrant.id,
          fingerprint,
          { id: communityDraft.id },
          writeLimits.perConnectionDay - before - 1,
        ],
      );
      try {
        const inputs = [
          draft(communityId, "community_post"),
          draft(communityId, "community_post"),
        ];
        const results = await Promise.allSettled(
          inputs.map((input) => exec("save_content_draft", input, memberGrant)),
        );
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        assert.equal(
          results.find((r) => r.status === "rejected").reason.code,
          "WRITE_QUOTA_EXCEEDED",
        );
        const index = results.findIndex((r) => r.status === "fulfilled");
        assert.equal(
          (await exec("save_content_draft", inputs[index], memberGrant)).id,
          results[index].value.id,
        );
        await assert.rejects(
          exec(
            "save_content_draft",
            draft(communityId, "community_post"),
            memberGrant,
          ),
          { code: "WRITE_QUOTA_EXCEEDED", status: 429 },
        );
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int AS n FROM external_ai_requests WHERE connection_id=$1 AND expires_at>now()",
              [memberGrant.id],
            )
          )[0].n,
          writeLimits.perConnectionDay,
        );
      } finally {
        await db.query(
          "DELETE FROM external_ai_requests WHERE fingerprint=$1",
          [fingerprint],
        );
      }
    },
  );
  await check(
    "per-user quota survives revocation and cleanup until the write history expires",
    async () => {
      const copies = Array.from({ length: 4 }, () => randomUUID());
      for (const id of copies)
        await db.query(
          `INSERT INTO external_ai_connections(id,user_id,client_id,workspaces,scopes,expires_at)
      SELECT $1,user_id,client_id,workspaces,scopes,expires_at FROM external_ai_connections WHERE id=$2`,
          [id, memberGrant.id],
        );
      try {
        for (const id of copies.slice(0, 3))
          await db.query(
            `INSERT INTO external_ai_requests(connection_id,request_id,fingerprint,result,expires_at)
        SELECT $1,gen_random_uuid(),'fixture-user-quota',$2,now()+interval '24 hours' FROM generate_series(1,100)`,
            [id, { id: communityDraft.id }],
          );
        const before = (
          await db.query("SELECT count(*)::int AS n FROM forum_post")
        )[0].n;
        await assert.rejects(
          tools.execute(
            "save_content_draft",
            draft(communityId, "community_post"),
            copies[3],
          ),
          { code: "WRITE_QUOTA_EXCEEDED", status: 429 },
        );
        assert.equal(
          (await db.query("SELECT count(*)::int AS n FROM forum_post"))[0].n,
          before,
        );
        await db.query(
          "UPDATE external_ai_connections SET revoked_at=now() WHERE id=ANY($1::uuid[])",
          [copies.slice(0, 3)],
        );
        await provider.cleanup();
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int AS n FROM external_ai_connections WHERE id=ANY($1::uuid[])",
              [copies.slice(0, 3)],
            )
          )[0].n,
          3,
        );
        await assert.rejects(
          tools.execute(
            "save_content_draft",
            draft(communityId, "community_post"),
            copies[3],
          ),
          { code: "WRITE_QUOTA_EXCEEDED", status: 429 },
        );
        await db.query(
          "UPDATE external_ai_requests SET expires_at=now()-interval '1 second' WHERE connection_id=ANY($1::uuid[])",
          [copies.slice(0, 3)],
        );
        await provider.cleanup();
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int AS n FROM external_ai_connections WHERE id=ANY($1::uuid[])",
              [copies.slice(0, 3)],
            )
          )[0].n,
          0,
        );
        assert.equal(
          (
            await tools.execute(
              "save_content_draft",
              draft(communityId, "community_post"),
              copies[3],
            )
          ).status,
          "draft",
        );
      } finally {
        await db.query(
          "DELETE FROM external_ai_connections WHERE id=ANY($1::uuid[])",
          [copies],
        );
      }
    },
  );
  await check("error metadata storage is globally bounded", async () => {
    const before = (
      await db.query("SELECT count(*)::int AS n FROM external_ai_errors")
    )[0].n;
    await db.query(
      `INSERT INTO external_ai_errors(id,tool,code)
      SELECT gen_random_uuid(),'list_materials','FIXTURE_ERROR_CAP' FROM generate_series(1,$1::int)`,
      [writeLimits.storedErrors - before],
    );
    try {
      const priorIds = new Set(
        (await db.query("SELECT id FROM external_ai_errors")).map(
          (row) => row.id,
        ),
      );
      await assert.rejects(
        exec("list_materials", { workspaceId: communityId }),
        /WORKSPACE_FORBIDDEN/,
      );
      assert.equal(
        (await db.query("SELECT count(*)::int AS n FROM external_ai_errors"))[0]
          .n,
        writeLimits.storedErrors,
      );
      assert.ok(
        (await db.query("SELECT id FROM external_ai_errors")).some(
          (row) => !priorIds.has(row.id),
        ),
      );
    } finally {
      await db.query(
        "DELETE FROM external_ai_errors WHERE code='FIXTURE_ERROR_CAP'",
      );
    }
  });
  await check(
    "MCP enforces connection and IP execution limits before dispatch",
    async () => {
      const ping = (token, id) =>
        fetch(base + "/api/external-ai/mcp", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
          },
          body: JSON.stringify({ jsonrpc: "2.0", id, method: "ping" }),
        });
      let connectionLimited = false;
      for (let i = 0; i <= 60; i++) {
        const response = await ping(memberGrant.token.access_token, i);
        if (response.status === 429) {
          assert.equal(
            (await response.json()).code,
            "EXTERNAL_AI_CONNECTION_RATE_LIMITED",
          );
          connectionLimited = true;
          break;
        }
        assert.equal(response.status, 200);
      }
      assert.ok(connectionLimited);
      let ipLimited = false;
      for (let i = 0; i <= 120; i++) {
        const response = await ping("fixture-invalid-token", i);
        if (response.status === 429) {
          assert.equal(
            (await response.json()).code,
            "EXTERNAL_AI_IP_RATE_LIMITED",
          );
          ipLimited = true;
          break;
        }
        assert.equal(response.status, 401);
        assert.match(
          response.headers.get("www-authenticate"),
          /^[\x20-\x7e]+$/,
        );
        assert.equal((await response.json()).error, "invalid_token");
      }
      assert.ok(ipLimited);
    },
  );
  await check(
    "expanded cleanup removes only expired/revoked connection data and retains authored content",
    async () => {
      await db.query(
        "UPDATE external_ai_connections SET revoked_at=now() WHERE id=ANY($1::uuid[])",
        [grantIds],
      );
      await provider.cleanup();
      assert.equal(
        (
          await db.query(`SELECT count(*)::int AS n FROM external_ai_credentials t
        JOIN external_ai_connections c ON c.id=t.connection_id WHERE c.revoked_at IS NOT NULL OR c.expires_at<=now()`)
        )[0].n,
        0,
      );
      assert.equal(
        (
          await db.query(
            "SELECT count(*)::int AS n FROM external_ai_connections WHERE revoked_at IS NULL AND expires_at>now()",
          )
        )[0].n,
        0,
      );
      for (const [table, id] of [
        ["store_execution_assets", storeDraft.id],
        ["semi_franchise_contents", coopDraft.id],
        ["forum_post", communityDraft.id],
      ])
        assert.equal(
          (
            await db.query(
              `SELECT count(*)::int AS n FROM ${table} WHERE id=$1`,
              [id],
            )
          )[0].n,
          1,
        );
    },
  );
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
      if (!process.argv.includes("--inspect-new-state")) {
        if(!process.argv.includes('--personal-mail-only'))await tests(db);
        await runPersonalMailChecks({db,check});
      }
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
