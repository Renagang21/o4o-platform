/** Invoked only by the disposable loopback external-ai fixture; no real accounts/provider calls. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createMultilingualProductContentController } from "../../apps/api-server/dist/routes/o4o-store/controllers/multilingual-product-content.controller.js";

export async function runProductContentChecks({
  db,
  check,
  exec,
  resource,
  ownerGrant,
  owner,
  store,
  storeId,
  orgId,
  businessOrg,
  product,
  foreignProduct,
  foreignStore,
}) {
  const [business] = await db.query(
    "SELECT metadata FROM organizations WHERE id=$1",
    [businessOrg],
  );
  const setFeatures = (features) =>
    db.query(
      "UPDATE organizations SET metadata=jsonb_set(COALESCE(metadata,'{}'::jsonb),'{serviceFeatures}',$2::jsonb) WHERE id=$1",
      [businessOrg, JSON.stringify(features)],
    );
  await setFeatures(["multilingual-content"]);
  const input = (patch = {}) => ({
    workspaceId: storeId,
    productId: product,
    productSource: "local",
    language: "ko",
    contentKey: "mcp-consumer-fixture",
    title: "Fixture consumer guidance",
    content: "<p>Verified product facts.</p><script>bad()</script>",
    requestId: randomUUID(),
    ...patch,
  });
  const get = (id) =>
    exec("get_product_content", { workspaceId: storeId, contentId: id });
  const clonedGrants = [];
  // Reuse the already verified OAuth client's fixture grant; do not spend extra DCR/IP registration slots.
  const cloneGrant = async (scopes) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO external_ai_connections(id,user_id,client_id,workspaces,scopes,expires_at)
      SELECT $1,user_id,client_id,workspaces,$2::jsonb,expires_at FROM external_ai_connections WHERE id=$3`,
      [id, JSON.stringify(scopes), ownerGrant.id],
    );
    clonedGrants.push(id);
    return { id };
  };
  const update = (page, patch = {}) =>
    exec("update_product_content_draft", {
      workspaceId: storeId,
      contentId: page.id,
      title: "Reviewed consumer guidance",
      content: "<p>Reviewed replacement.</p>",
      expectedRevision: page.revision,
      requestId: randomUUID(),
      ...patch,
    });
  const mcp = new Client({ name: "product-content-fixture", version: "1.0.0" });
  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1/kpa",
    createMultilingualProductContentController(
      db,
      (req, _res, next) => {
        req.user = { id: owner, roles: [] };
        next();
      },
      "kpa",
    ),
  );
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const web = `http://127.0.0.1:${server.address().port}/api/v1/kpa/pharmacy/multilingual-product-contents`;
  let saved;
  const listingFixtures = [];
  try {
    await mcp.connect(
      new StreamableHTTPClientTransport(resource, {
        requestInit: {
          headers: { authorization: `Bearer ${ownerGrant.token.access_token}` },
        },
      }),
    );
    await check(
      "product content tools preserve legacy tools and expose read/write annotations through official SDK",
      async () => {
        const list = await mcp.listTools();
        assert.equal(list.tools.length, 11);
        const workspaces = await exec("list_workspaces", {});
        const currentStore = workspaces.workspaces.find(
          (w) => w.id === storeId,
        );
        assert.deepEqual(currentStore.destinations, ["store_document"]);
        assert.ok(
          currentStore.productContentTools.includes(
            "save_product_content_draft",
          ),
        );
        for (const name of [
          "list_workspaces",
          "search_products",
          "get_product_context",
          "list_materials",
          "get_material",
          "save_content_draft",
          "update_content_draft",
          "get_content_draft",
        ])
          assert.ok(list.tools.some((tool) => tool.name === name));
        assert.equal(
          list.tools.find((t) => t.name === "save_product_content_draft")
            .annotations.destructiveHint,
          false,
        );
        assert.equal(
          list.tools.find((t) => t.name === "update_product_content_draft")
            .annotations.destructiveHint,
          true,
        );
        assert.equal(
          list.tools.find((t) => t.name === "get_product_content").annotations
            .readOnlyHint,
          true,
        );
      },
    );
    await check(
      "SDK product save returns a private sanitized product-linked page readable by existing web API",
      async () => {
        const result = await mcp.callTool({
          name: "save_product_content_draft",
          arguments: input(),
        });
        assert.ok(!result.isError, JSON.stringify(result));
        saved = result.structuredContent;
        assert.deepEqual(saved, JSON.parse(result.content[0].text));
        assert.notEqual(saved.id, saved.groupId);
        assert.equal(saved.productId, product);
        assert.equal(saved.language, "ko");
        assert.equal(saved.status, "draft");
        assert.equal(saved.groupStatus, "draft");
        assert.equal(saved.editable, true);
        assert.ok(!saved.content.html.includes("<script>"));
        const link = new URL(saved.openUrl);
        assert.equal(link.searchParams.get("organizationId"), store);
        assert.equal(link.searchParams.get("locale"), "ko");
        assert.ok(link.pathname.endsWith(`/local/${product}/${saved.groupId}`));
        const response = await fetch(`${web}/${saved.groupId}`);
        assert.equal(response.status, 200);
        const group = (await response.json()).data;
        assert.equal(group.targetId, product);
        const [storedGroup] = await db.query(
          "SELECT public_key,status FROM store_multilingual_product_content_groups WHERE id=$1",
          [saved.groupId],
        );
        assert.equal(storedGroup.public_key, null);
        assert.equal(storedGroup.status, "draft");
        assert.deepEqual(group.pages[0].content, saved.content);
        assert.equal(group.pages[0].id, saved.id);
        assert.equal((await get(saved.id)).revision, saved.revision);
      },
    );
    await check(
      "same concurrent product request writes one page, one request and one atomic audit",
      async () => {
        const args = input({ contentKey: "concurrent-fixture" });
        const [a, b] = await Promise.all([
          exec("save_product_content_draft", args),
          exec("save_product_content_draft", args),
        ]);
        assert.equal(a.id, b.id);
        const [requests] = await db.query(
          "SELECT count(*)::int AS n FROM external_ai_requests WHERE connection_id=$1 AND request_id=$2",
          [ownerGrant.id, args.requestId],
        );
        const [audit] = await db.query(
          "SELECT count(*)::int AS n FROM action_logs WHERE action_key='store.product_content.external_ai.created' AND meta->>'contentId'=$1",
          [a.id],
        );
        assert.equal(requests.n, 1);
        assert.equal(audit.n, 1);
        await assert.rejects(
          exec("save_product_content_draft", {
            ...args,
            content: "Different content",
          }),
          /REQUEST_ID_REUSED/,
        );
      },
    );
    await check(
      "create never overwrites an existing language; a second language keeps group and Korean content",
      async () => {
        await assert.rejects(
          exec("save_product_content_draft", input()),
          /PRODUCT_CONTENT_ALREADY_EXISTS/,
        );
        const english = await exec(
          "save_product_content_draft",
          input({ language: "en", content: "<p>English reviewed facts.</p>" }),
        );
        assert.equal(english.groupId, saved.groupId);
        assert.notEqual(english.id, saved.id);
        assert.equal((await get(saved.id)).content.html, saved.content.html);
        const context = await exec("get_product_context", {
          workspaceId: storeId,
          productId: product,
        });
        assert.ok(
          context.productContents.some(
            (p) => p.id === english.id && p.language === "en",
          ),
        );
        assert.equal(context.authoring.purpose, "consumer_product_content");
      },
    );
    await check(
      "product update preserves identity, other languages and editor fields; stale revision conflicts",
      async () => {
        await db.query(
          "UPDATE store_multilingual_product_content_pages SET summary='Fixture summary',assets='[{\"kind\":\"image\"}]',metadata='{\"fixture\":true}' WHERE id=$1",
          [saved.id],
        );
        const before = await get(saved.id);
        const result = await update(before);
        assert.equal(result.id, before.id);
        assert.equal(result.groupId, before.groupId);
        assert.equal(result.productId, product);
        assert.equal(result.language, "ko");
        assert.equal(result.summary, "Fixture summary");
        assert.deepEqual(result.assets, [{ kind: "image" }]);
        assert.deepEqual(result.metadata, { fixture: true });
        assert.notEqual(result.revision, before.revision);
        await assert.rejects(update(before), /CONTENT_CONFLICT/);
        saved = result;
      },
    );
    await check(
      "existing web page writer updates the MCP page; MCP revision detects the manual edit",
      async () => {
        const before = await get(saved.id);
        const response = await fetch(`${web}/${saved.groupId}/pages/ko`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: "Manual editor replacement",
            contentFormat: "html",
            content: { html: "<p>Manual change</p>" },
            status: "draft",
          }),
        });
        assert.equal(response.status, 200, await response.clone().text());
        const group = (await response.json()).data;
        assert.equal(
          group.pages.find((p) => p.id === saved.id).title,
          "Manual editor replacement",
        );
        await assert.rejects(update(before), /CONTENT_CONFLICT/);
        saved = await get(saved.id);
      },
    );
    await check(
      "listing products use listing identity and preserve the existing service-key ownership rule",
      async () => {
        const master = randomUUID(),
          listing = randomUUID();
        listingFixtures.push({ master, listing });
        await db.query(
          "INSERT INTO product_masters(id,regulatory_name,name,manufacturer_name) VALUES($1,'Fixture listing','Fixture listing','Fixture maker')",
          [master],
        );
        await db.query(
          "INSERT INTO organization_product_listings(id,organization_id,master_id,service_key,is_active) VALUES($1,$2,$3,'kpa-society',true)",
          [listing, store, master],
        );
        const page = await exec(
          "save_product_content_draft",
          input({
            productId: listing,
            productSource: "listing",
            language: "vi",
          }),
        );
        assert.equal(page.productId, listing);
        assert.equal(page.productSource, "listing");
        assert.equal(page.language, "vi");
        const context = await exec("get_product_context", {
          workspaceId: storeId,
          productId: listing,
        });
        assert.equal(context.product.masterId, master);
        assert.ok(context.productContents.some((p) => p.id === page.id));
        await assert.rejects(
          exec(
            "save_product_content_draft",
            input({ productId: listing, productSource: "local" }),
          ),
          /PRODUCT_NOT_FOUND/,
        );
      },
    );
    await check(
      "product writes reject another product/store/workspace and read-only consent",
      async () => {
        await assert.rejects(
          exec(
            "save_product_content_draft",
            input({ productId: foreignProduct }),
          ),
          /PRODUCT_NOT_FOUND/,
        );
        await assert.rejects(
          exec(
            "save_product_content_draft",
            input({ workspaceId: `store:${foreignStore}` }),
          ),
          /WORKSPACE_FORBIDDEN/,
        );
        await assert.rejects(
          exec("save_product_content_draft", input({ workspaceId: orgId })),
          /DESTINATION_FORBIDDEN/,
        );
        const readOnly = await cloneGrant(["o4o:read"]);
        await assert.rejects(
          exec("save_product_content_draft", input(), readOnly),
          /SCOPE_FORBIDDEN/,
        );
        const [foreign] = await db.query(
          `INSERT INTO store_multilingual_product_content_groups(organization_id,target_kind,target_id,title) VALUES($1,'local',$2,'Foreign fixture') RETURNING id`,
          [foreignStore, foreignProduct],
        );
        const [page] = await db.query(
          `INSERT INTO store_multilingual_product_content_pages(group_id,locale,title) VALUES($1,'ko','Foreign page') RETURNING id`,
          [foreign.id],
        );
        await assert.rejects(get(page.id), /CONTENT_NOT_FOUND/);
      },
    );
    await check(
      "inactive product blocks saved-content reads and writes",
      async () => {
        await db.query(
          "UPDATE store_local_products SET is_active=false WHERE id=$1",
          [product],
        );
        try {
          await assert.rejects(get(saved.id), /PRODUCT_NOT_FOUND/);
          await assert.rejects(update(saved), /PRODUCT_NOT_FOUND/);
        } finally {
          await db.query(
            "UPDATE store_local_products SET is_active=true WHERE id=$1",
            [product],
          );
        }
      },
    );
    await check(
      "existing multilingual feature revocation blocks writes while allowing existing reads",
      async () => {
        await setFeatures([]);
        try {
          await get(saved.id);
          await assert.rejects(update(saved), /SERVICE_FEATURE_REQUIRED/);
        } finally {
          await setFeatures(["multilingual-content"]);
        }
      },
    );
    await check(
      "published, archived, public-key and non-HTML content are never changed by product tools",
      async () => {
        for (const mode of [
          "published-page",
          "archived-group",
          "public-key",
          "non-html",
        ]) {
          const page = await exec(
            "save_product_content_draft",
            input({ contentKey: mode }),
          );
          if (mode === "published-page")
            await db.query(
              "UPDATE store_multilingual_product_content_pages SET status='published' WHERE id=$1",
              [page.id],
            );
          if (mode === "archived-group")
            await db.query(
              "UPDATE store_multilingual_product_content_groups SET status='archived' WHERE id=$1",
              [page.groupId],
            );
          if (mode === "public-key")
            await db.query(
              "UPDATE store_multilingual_product_content_groups SET public_key=$2 WHERE id=$1",
              [page.groupId, randomUUID().replaceAll("-", "")],
            );
          if (mode === "non-html")
            await db.query(
              "UPDATE store_multilingual_product_content_pages SET content_format='blocks' WHERE id=$1",
              [page.id],
            );
          const blocked = await get(page.id);
          assert.equal(blocked.editable, false);
          await assert.rejects(update(blocked), /CONTENT_NOT_EDITABLE/);
          if (mode !== "non-html")
            await assert.rejects(
              exec(
                "save_product_content_draft",
                input({ contentKey: mode, language: "ja" }),
              ),
              /CONTENT_NOT_EDITABLE/,
            );
          assert.equal((await get(page.id)).revision, blocked.revision);
        }
      },
    );
    await check(
      "audit failure rolls back the product page, group and idempotency record together",
      async () => {
        const args = input({ contentKey: "audit-rollback" });
        await db.query(`CREATE FUNCTION fixture_fail_product_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.action_key LIKE 'store.product_content.external_ai.%' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END $$`);
        await db.query(
          "CREATE TRIGGER fixture_fail_product_audit BEFORE INSERT ON action_logs FOR EACH ROW EXECUTE FUNCTION fixture_fail_product_audit()",
        );
        try {
          await assert.rejects(
            exec("save_product_content_draft", args),
            /EXTERNAL_AI_OPERATION_FAILED/,
          );
          const [groups] = await db.query(
            "SELECT count(*)::int AS n FROM store_multilingual_product_content_groups WHERE organization_id=$1 AND content_key=$2",
            [store, args.contentKey],
          );
          const [requests] = await db.query(
            "SELECT count(*)::int AS n FROM external_ai_requests WHERE connection_id=$1 AND request_id=$2",
            [ownerGrant.id, args.requestId],
          );
          assert.equal(groups.n, 0);
          assert.equal(requests.n, 0);
        } finally {
          await db.query(
            "DROP TRIGGER fixture_fail_product_audit ON action_logs",
          );
          await db.query("DROP FUNCTION fixture_fail_product_audit()");
        }
      },
    );
    await check(
      "product audit metadata excludes document bodies and provider credentials",
      async () => {
        const audits = await db.query(
          "SELECT meta FROM action_logs WHERE action_key LIKE 'store.product_content.external_ai.%'",
        );
        assert.ok(audits.length > 0);
        for (const { meta } of audits)
          assert.deepEqual(
            Object.keys(meta).sort((left, right) => left.localeCompare(right)),
            [
              "channel",
              "organizationId",
              "contentId",
              "groupId",
              "productId",
              "language",
            ].sort((left, right) => left.localeCompare(right)),
          );
      },
    );
    await check(
      "revoked product grant cannot read or resume writes",
      async () => {
        const temporary = await cloneGrant(["o4o:read", "o4o:draft:write"]);
        await db.query(
          "UPDATE external_ai_connections SET revoked_at=now() WHERE id=$1",
          [temporary.id],
        );
        await assert.rejects(
          exec(
            "get_product_content",
            { workspaceId: storeId, contentId: saved.id },
            temporary,
          ),
          /CONNECTION_REVOKED/,
        );
        await assert.rejects(
          exec(
            "save_product_content_draft",
            input({ contentKey: "revoked" }),
            temporary,
          ),
          /CONNECTION_REVOKED/,
        );
      },
    );
  } finally {
    await mcp.close();
    server.close();
    await once(server, "close");
    if (clonedGrants.length)
      await db.query(
        "UPDATE external_ai_connections SET revoked_at=now() WHERE id=ANY($1::uuid[])",
        [clonedGrants],
      );
    for (const { master, listing } of listingFixtures) {
      await db.query(
        "DELETE FROM store_multilingual_product_content_groups WHERE organization_id=$1 AND target_kind='listing' AND target_id=$2",
        [store, listing],
      );
      await db.query(
        "DELETE FROM organization_product_listings WHERE id=$1 AND organization_id=$2",
        [listing, store],
      );
      await db.query("DELETE FROM product_masters WHERE id=$1", [master]);
    }
    await db.query("UPDATE organizations SET metadata=$2::jsonb WHERE id=$1", [
      businessOrg,
      JSON.stringify(business.metadata),
    ]);
  }
}
