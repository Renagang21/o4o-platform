/** Real HTTP login + PKCE + MCP against the isolated local review API. Never production. */
import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { DataSource } from "typeorm";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { assertReviewDatabase, reviewDatabaseOptions } from "./environment.js";
import { reviewIds } from "./provision.js";

const base = new URL(process.env.REVIEW_DEMO_API_ORIGIN || "");
if (
  base.protocol !== "http:" ||
  !["localhost", "127.0.0.1"].includes(base.hostname) ||
  base.port !== "13002"
)
  throw new Error("LOCAL_REVIEW_API_REQUIRED");
const origin = process.env.REVIEW_DEMO_WEB_ORIGIN!;
const callback = process.env.REVIEW_DEMO_REDIRECT_URIS!;
const db = new DataSource(reviewDatabaseOptions(process.env));
const clients: Client[] = [],
  registrations: string[] = [],
  drafts: string[] = [];
const requestIds = [randomUUID(), randomUUID(), randomUUID()];
const productContentKey = `review-smoke-${randomUUID()}`;
let jwt = "",
  passed = 0;
let browser:
  | Awaited<ReturnType<typeof import("./browser-smoke.js").createReviewBrowser>>
  | undefined;
const workspaceId = `store:${reviewIds.store}`;
async function json(path: string, method = "GET", body?: unknown) {
  const response = await fetch(new URL(path, base), {
    method,
    headers: {
      "content-type": "application/json",
      origin,
      ...(jwt ? { authorization: `Bearer ${jwt}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.equal(response.status, 200, `${method} ${path.split("?")[0]} failed`);
  return response.json();
}
async function grant(scopes: string[], useBrowser = false) {
  const register = await fetch(new URL("/register", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "Isolated review smoke",
      redirect_uris: [callback],
      token_endpoint_auth_method: "none",
    }),
  });
  assert.equal(register.status, 201);
  const { client_id } = await register.json();
  registrations.push(client_id);
  const verifier = randomBytes(48).toString("base64url");
  const authorize = new URL("/authorize", base);
  Object.entries({
    client_id,
    redirect_uri: callback,
    response_type: "code",
    scope: scopes.join(" "),
    state: "review-smoke",
    resource: new URL("/api/external-ai/mcp", base).href,
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  }).forEach(([key, value]) => authorize.searchParams.set(key, value));
  const pending = await fetch(authorize, { redirect: "manual" });
  assert.equal(pending.status, 302);
  const request = new URL(pending.headers.get("location")!).searchParams.get(
    "request",
  )!;
  const consent = await json(
    `/api/external-ai/consent?request=${encodeURIComponent(request)}`,
  );
  assert.deepEqual(
    consent.data.workspaces.map((w: { id: string }) => w.id),
    [workspaceId],
  );
  const approved = useBrowser
    ? undefined
    : await json("/api/external-ai/consent", "POST", {
        request,
        workspaces: [workspaceId],
        scopes,
        replaceExisting: false,
      });
  const redirect = useBrowser
    ? await browser!.approve(
        pending.headers.get("location")!,
        callback,
        scopes.includes("o4o:draft:write"),
      )
    : new URL(approved.data.redirectUrl);
  assert.equal(redirect.searchParams.get("state"), "review-smoke");
  const tokenResponse = await fetch(new URL("/token", base), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id,
      redirect_uri: callback,
      code: redirect.searchParams.get("code")!,
      code_verifier: verifier,
    }),
  });
  assert.equal(tokenResponse.status, 200);
  const token = await tokenResponse.json();
  const client = new Client({
    name: "isolated-review-smoke",
    version: "1.0.0",
  });
  clients.push(client);
  await client.connect(
    new StreamableHTTPClientTransport(new URL("/api/external-ai/mcp", base), {
      requestInit: {
        headers: { authorization: `Bearer ${token.access_token}` },
      },
    }),
  );
  return client;
}
async function call(
  client: Client,
  name: string,
  args: Record<string, unknown>,
) {
  const result = await client.callTool({ name, arguments: args });
  const text =
    (result.content as Array<{ type: string; text?: string }>).find(
      (c) => c.type === "text",
    )?.text ?? "{}";
  return {
    error: result.isError === true,
    data: (result.structuredContent ?? JSON.parse(text)) as Record<string, any>,
  };
}
function pass(label: string) {
  passed++;
  console.log(`PASS ${label}`);
}

try {
  await db.initialize();
  await assertReviewDatabase(db);
  const login = await json("/api/v1/auth/email/login", "POST", {
    email: "reviewer@example.invalid",
    password: process.env.REVIEW_DEMO_PASSWORD,
    includeLegacyTokens: true,
  });
  jwt = login.data.tokens.accessToken;
  assert.ok(jwt);
  pass("dedicated reviewer uses normal email/password login");
  if (process.env.REVIEW_DEMO_BROWSER_SMOKE === "1") {
    browser = await (await import("./browser-smoke.js")).createReviewBrowser();
    await browser.loginAndCheckQualification(origin);
  }
  const client = await grant(["o4o:read", "o4o:draft:write"], Boolean(browser));
  const discovery = await client.listTools();
  assert.equal(discovery.tools.length, 11);
  pass("normal DCR/PKCE/consent/token exchange and 11-tool discovery");
  const spaces = await call(client, "list_workspaces", {});
  assert.equal(spaces.error, false);
  assert.deepEqual(
    spaces.data.workspaces.map((w: any) => w.id),
    [workspaceId],
  );
  assert.equal(spaces.data.workspaces[0].writable, true);
  pass("P1 workspace and actual write permission");
  const products = await call(client, "search_products", {
    workspaceId,
    query: "안내판",
  });
  assert.equal(products.error, false);
  assert.ok(JSON.stringify(products.data).includes(reviewIds.product));
  const facts = await call(client, "get_product_context", {
    workspaceId,
    productId: reviewIds.product,
  });
  assert.equal(facts.error, false);
  assert.ok(JSON.stringify(facts.data).includes("심사용 매장 안내판"));
  pass("P2 synthetic nonmedical product and source facts");
  const materials = await call(client, "list_materials", {
    workspaceId,
    query: "심사용",
  });
  assert.equal(materials.error, false);
  assert.ok(JSON.stringify(materials.data).includes(reviewIds.material));
  const material = await call(client, "get_material", {
    workspaceId,
    materialId: reviewIds.material,
  });
  assert.equal(material.error, false);
  assert.ok(JSON.stringify(material.data).includes("개인정보"));
  pass("P3 reference material lookup and read");
  const input = {
    workspaceId,
    destination: "store_document",
    title: `심사용 안내 초안 ${requestIds[0]}`,
    language: "ko",
    content: "<p>합성 안내문. 게시 전 검토합니다.</p>",
    requestId: requestIds[0],
  };
  const saved = await call(client, "save_content_draft", input);
  assert.equal(saved.error, false);
  drafts.push(saved.data.id);
  assert.equal(saved.data.status, "private_material");
  assert.equal(
    new URL(saved.data.openUrl).origin,
    process.env.REVIEW_DEMO_STORE_ORIGIN,
  );
  assert.notEqual(new URL(saved.data.openUrl).hostname, "store.neture.co.kr");
  const retry = await call(client, "save_content_draft", input);
  assert.equal(retry.data.id, saved.data.id);
  pass("P4 private save, idempotent retry and review editor URL");
  if (browser) await browser.openDraft(saved.data.openUrl, input.title);
  const retrieved = await call(client, "get_content_draft", {
    workspaceId,
    destination: "store_document",
    contentId: saved.data.id,
  });
  const updated = await call(client, "update_content_draft", {
    workspaceId,
    destination: "store_document",
    contentId: saved.data.id,
    expectedRevision: retrieved.data.revision,
    content: "<p>수정된 합성 안내문.</p>",
    requestId: requestIds[1],
  });
  assert.equal(updated.error, false);
  assert.notEqual(updated.data.revision, retrieved.data.revision);
  assert.equal(updated.data.status, "private_material");
  pass("P5 retrieve and update using latest revision");
  const productInput = {
    workspaceId,
    productId: reviewIds.product,
    productSource: "local",
    contentKey: productContentKey,
    language: "ko",
    title: "심사용 합성 안내판 설명",
    content: "<p>비의약품 합성 안내판의 소비자 안내 초안입니다.</p>",
    requestId: randomUUID(),
  };
  const productSaved = await call(
    client,
    "save_product_content_draft",
    productInput,
  );
  assert.equal(
    productSaved.error,
    false,
    `product save: ${productSaved.data.code}`,
  );
  assert.equal(productSaved.data.status, "draft");
  assert.equal(productSaved.data.groupStatus, "draft");
  assert.equal(productSaved.data.editable, true);
  assert.equal(
    new URL(productSaved.data.openUrl).origin,
    process.env.REVIEW_DEMO_STORE_ORIGIN,
  );
  const productRetry = await call(
    client,
    "save_product_content_draft",
    productInput,
  );
  assert.equal(productRetry.error, false);
  assert.equal(productRetry.data.id, productSaved.data.id);
  pass("product content: private save and idempotent retry");
  const productRead = await call(client, "get_product_content", {
    workspaceId,
    contentId: productSaved.data.id,
  });
  assert.equal(productRead.error, false);
  assert.equal(productRead.data.id, productSaved.data.id);
  assert.equal(productRead.data.content.html, productInput.content);
  pass("product content: retrieve exact synthetic product page");
  const productUpdated = await call(client, "update_product_content_draft", {
    workspaceId,
    contentId: productSaved.data.id,
    title: "심사용 합성 안내판 설명 수정",
    content: "<p>검토 전 비공개 상태로 수정한 안내문입니다.</p>",
    expectedRevision: productRead.data.revision,
    requestId: randomUUID(),
  });
  assert.equal(productUpdated.error, false);
  assert.equal(productUpdated.data.status, "draft");
  assert.notEqual(productUpdated.data.revision, productRead.data.revision);
  pass("product content: update using latest revision without publishing");
  const readonly = await grant(["o4o:read"]);
  const denied = await call(readonly, "save_content_draft", {
    ...input,
    requestId: requestIds[2],
  });
  assert.equal(denied.error, true);
  assert.equal(denied.data.code, "SCOPE_FORBIDDEN");
  pass("security: read-only grant rejects saving");
  const foreign = await call(client, "list_materials", {
    workspaceId: `store:${randomUUID()}`,
  });
  assert.equal(foreign.error, true);
  assert.equal(foreign.data.code, "WORKSPACE_FORBIDDEN");
  pass("security: ungranted workspace denied");
  const stale = await call(client, "update_content_draft", {
    workspaceId,
    destination: "store_document",
    contentId: saved.data.id,
    expectedRevision: retrieved.data.revision,
    content: "<p>이전 revision.</p>",
    requestId: randomUUID(),
  });
  assert.equal(stale.error, true);
  assert.equal(stale.data.code, "CONTENT_CONFLICT");
  pass("security: stale revision denied");
} finally {
  await browser?.close();
  await Promise.all(clients.map((client) => client.close().catch(() => {})));
  if (db.isInitialized) {
    await assertReviewDatabase(db);
    await db.transaction(async (manager) => {
      await manager.query(
        "DELETE FROM external_ai_connections WHERE client_id=ANY($1::text[])",
        [registrations],
      );
      await manager.query(
        "DELETE FROM external_ai_credentials WHERE client_id=ANY($1::text[])",
        [registrations],
      );
      await manager.query(
        "DELETE FROM external_ai_clients WHERE id=ANY($1::text[])",
        [registrations],
      );
      await manager.query(
        "DELETE FROM store_execution_assets WHERE id=ANY($1::uuid[]) AND organization_id=$2",
        [drafts, reviewIds.store],
      );
      await manager.query(
        `DELETE FROM store_multilingual_product_content_pages WHERE group_id IN
         (SELECT id FROM store_multilingual_product_content_groups WHERE organization_id=$1 AND content_key=$2)`,
        [reviewIds.store, productContentKey],
      );
      await manager.query(
        "DELETE FROM store_multilingual_product_content_groups WHERE organization_id=$1 AND content_key=$2",
        [reviewIds.store, productContentKey],
      );
      const [remainingProducts] = await manager.query(
        "SELECT count(*)::int AS n FROM store_multilingual_product_content_groups WHERE organization_id=$1 AND content_key=$2",
        [reviewIds.store, productContentKey],
      );
      assert.equal(remainingProducts.n, 0);
      const [remaining] = await manager.query(
        "SELECT count(*)::int AS n FROM store_execution_assets WHERE id=ANY($1::uuid[])",
        [drafts],
      );
      assert.equal(remaining.n, 0);
    });
    console.log(
      "CLEANUP temporary drafts and OAuth test registrations removed; baseline fixtures and security logs retained.",
    );
    await db.destroy();
  }
}
console.log(
  `REVIEW_LOCAL_SMOKE_PASS ${passed} checks; ChatGPT model routing and the 3 submission negative prompts are not covered by this API smoke.`,
);
