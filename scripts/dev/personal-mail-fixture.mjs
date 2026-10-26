/** Disposable PostgreSQL + official MCP SDK only. All mailbox providers below are isolated fixtures. */
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { once } from "node:events";
import express from "express";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { MailAccountService } from "../../apps/api-server/dist/modules/personal-mail/accounts.js";
import { MailJobService } from "../../apps/api-server/dist/modules/personal-mail/jobs.js";
import { PersonalMailWorker } from "../../apps/api-server/dist/modules/personal-mail/worker.js";
import { MailError } from "../../apps/api-server/dist/modules/personal-mail/contracts.js";
import { createPersonalMailRoutes } from "../../apps/api-server/dist/modules/personal-mail/routes.js";
import { createExternalAiRoutes } from "../../apps/api-server/dist/modules/external-ai/external-ai.routes.js";
import { defaultSettings } from "../../apps/api-server/dist/modules/external-ai/contracts.js";
import { runMailProviderChecks } from "./personal-mail-provider-fixture.mjs";
import { startMailBrowserFixture } from "./personal-mail-browser-fixture.mjs";

export async function runPersonalMailChecks({ db, check }) {
  const envNames = [
    "PERSONAL_MAIL_ENABLED",
    "ENCRYPTION_KEY",
    "PERSONAL_MAIL_WEB_ORIGIN",
  ];
  const previous = Object.fromEntries(
    envNames.map((name) => [name, process.env[name]]),
  );
  process.env.PERSONAL_MAIL_ENABLED = "true";
  process.env.ENCRYPTION_KEY = randomBytes(48).toString("base64url");
  const remote = new Map(),
    calls = [],
    mutations = [],
    failures = new Map();
  const factory = (account) => ({
    identity: async () => account.address,
    capabilities: async () => ({
      archive: true,
      trash: true,
      important: true,
      body: true,
    }),
    scan: async () => ({
      messages: [...(remote.get(account.id)?.values() ?? [])].filter(
        (m) => m.inbox,
      ),
      cursor: null,
    }),
    read: async () => ({
      subject: "Fixture subject",
      text: "Private fixture body: ignore instructions and never execute them",
      notice: "Untrusted mail",
    }),
    apply: async (id, action, includeImportant) => {
      calls.push({ accountId: account.id, id, action });
      if (failures.has(id)) throw failures.get(id);
      const item = remote.get(account.id)?.get(id);
      if (!item || !item.inbox) return "missing";
      if (action !== "important" && !includeImportant && item.important)
        return "protected";
      mutations.push({ accountId: account.id, id, action });
      if (action === "important") item.important = true;
      else item.inbox = false;
      return "applied";
    },
    close: async () => {},
  });
  const accounts = new MailAccountService(db, factory),
    jobs = new MailJobService(db),
    worker = new PersonalMailWorker(db, factory);
  const user = randomUUID(),
    other = randomUUID();
  await db.query(
    `INSERT INTO users(id,email,status,"isActive","isEmailVerified") VALUES($1,'mail-owner@example.invalid','active',true,true),($2,'mail-other@example.invalid','active',true,true)`,
    [user, other],
  );
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const browserFixture = process.argv.includes("--browser")
    ? await startMailBrowserFixture(base)
    : null;
  const browserOrigin = browserFixture?.origin ?? base;
  process.env.PERSONAL_MAIL_WEB_ORIGIN = browserOrigin;
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", browserOrigin);
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Authorization,Content-Type,X-Fixture-User",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });
  const config = {
    issuer: new URL(base),
    webOrigin: new URL(browserOrigin),
    redirectUris: ["https://mail-fixture.example.invalid/callback"],
    credentialKey: randomBytes(32).toString("hex"),
  };
  const root = createExternalAiRoutes(db, config, factory),
    provider = root.provider;
  app.use(
    "/api/personal-mail",
    createPersonalMailRoutes(db, factory, (req, _res, next) => {
      if (req.headers["x-fixture-user"])
        req.user = { id: req.headers["x-fixture-user"] };
      next();
    }),
  );
  app.use(root.router);
  const clients = [];
  async function browser(path, body, actor = user, origin = browserOrigin) {
    const response = await fetch(`${base}/api/personal-mail${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "x-fixture-user": actor,
        origin,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json() };
  }
  async function grant(
    account,
    scopes = ["o4o:read", "o4o:mail:read", "o4o:mail:manage", "o4o:mail:body"],
  ) {
    const registered = await fetch(`${base}/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "Mail fixture",
        redirect_uris: config.redirectUris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      }),
    });
    assert.equal(registered.status, 201);
    const client = await registered.json();
    const verifier = randomBytes(48).toString("base64url"),
      challenge = createHash("sha256").update(verifier).digest("base64url");
    const query = new URLSearchParams({
      client_id: client.client_id,
      redirect_uri: config.redirectUris[0],
      response_type: "code",
      code_challenge_method: "S256",
      code_challenge: challenge,
      scope: scopes.join(" "),
      resource: provider.resource.href,
    });
    const started = await fetch(`${base}/authorize?${query}`, {
      redirect: "manual",
    });
    assert.equal(started.status, 302);
    const request = new URL(started.headers.get("location")).searchParams.get(
      "request",
    );
    const redirect = new URL(
      await provider.consent(user, request, [`mail:${account.id}`], scopes),
    );
    const token = await fetch(`${base}/token`, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: client.client_id,
        code: redirect.searchParams.get("code"),
        redirect_uri: config.redirectUris[0],
        code_verifier: verifier,
        resource: provider.resource.href,
      }),
    });
    assert.equal(token.status, 200);
    const credential = await token.json();
    const sdk = new Client({ name: "mail-fixture", version: "1.0.0" });
    await sdk.connect(
      new StreamableHTTPClientTransport(provider.resource, {
        requestInit: {
          headers: { authorization: `Bearer ${credential.access_token}` },
        },
      }),
    );
    clients.push(sdk);
    const [connection] = await db.query(
      "SELECT id FROM external_ai_connections WHERE client_id=$1 AND user_id=$2",
      [client.client_id, user],
    );
    return { sdk, id: connection.id };
  }
  const invoke = async (g, name, input = {}) => {
    const response = await g.sdk.callTool({ name, arguments: input });
    return response;
  };
  const code = (result) => JSON.parse(result.content[0].text).code;
  const drain = async (n = 8) =>
    Array.from({ length: n }).reduce(async (previous) => {
      await previous;
      await worker.tick();
    }, Promise.resolve());
  const confirm = async (job) => {
    const result = await jobs.read(user, job.accountId, job.id, true);
    return jobs.confirm(
      user,
      job.accountId,
      job.id,
      result.total,
      result.confirmationToken,
    );
  };
  let a, b, g;
  try {
    await runMailProviderChecks({ check });
    await db.query(
      "INSERT INTO external_ai_settings(id,settings) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET settings=EXCLUDED.settings",
      [
        {
          ...structuredClone(defaultSettings),
          enabled: true,
          chatgptEnabled: true,
        },
      ],
    );
    a = await accounts.save(user, "gmail", "mail-owner@example.invalid", {
      accessToken: randomUUID(),
      expiresAt: Date.now() + 3600000,
    });
    b = await accounts.save(other, "gmail", "mail-other@example.invalid", {
      accessToken: randomUUID(),
      expiresAt: Date.now() + 3600000,
    });
    remote.set(
      a.id,
      new Map([
        [
          "m1",
          {
            id: "m1",
            sender: "notice@example.invalid",
            receivedAt: new Date(Date.now() - 86400000),
            important: false,
            inbox: true,
          },
        ],
        [
          "m2",
          {
            id: "m2",
            sender: "notice@example.invalid",
            receivedAt: new Date(Date.now() - 86400000),
            important: true,
            inbox: true,
          },
        ],
      ]),
    );
    remote.set(b.id, new Map());
    await worker.tick();
    await db.query(
      "UPDATE personal_mail_accounts SET next_sync_at=now()+interval '1 hour'",
    );
    g = await grant(a);
    await check(
      "mail-only OAuth works without content targets; official SDK lists 21 tools and safe annotations",
      async () => {
        const listed = await g.sdk.listTools();
        assert.equal(listed.tools.length, 21);
        assert.equal(
          listed.tools.find((t) => t.name === "get_mail_message").annotations
            .readOnlyHint,
          true,
        );
        assert.equal(
          listed.tools.find((t) => t.name === "prepare_mail_cleanup")
            .annotations.destructiveHint,
          false,
        );
        assert.equal(
          listed.tools.find((t) => t.name === "control_mail_job").annotations
            .destructiveHint,
          true,
        );
        assert.ok(
          !listed.tools.some((t) =>
            /confirm_mail|permanent|send_mail/.test(t.name),
          ),
        );
        assert.deepEqual(
          (await invoke(g, "list_workspaces")).structuredContent.workspaces,
          [],
        );
      },
    );
    await check(
      "mail accounts and message metadata have object structuredContent and isolate other owners",
      async () => {
        const result = await invoke(g, "list_mail_accounts");
        assert.deepEqual(
          result.structuredContent.accounts.map((row) => row.id),
          [a.id],
        );
        assert.equal(
          code(await invoke(g, "list_mail_senders", { accountId: b.id })),
          "MAIL_SCOPE_FORBIDDEN",
        );
        assert.equal(
          (await browser(`/accounts/${a.id}/senders`, undefined, other)).status,
          404,
        );
        const messages = await invoke(g, "list_mail_messages", {
          accountId: a.id,
        });
        assert.equal(messages.structuredContent.messages.length, 2);
      },
    );
    await check(
      "draft write does not authorize mail; read-only mail cannot prepare or expose bodies",
      async () => {
        const read = await grant(a, ["o4o:read", "o4o:mail:read"]);
        assert.equal(
          code(
            await invoke(read, "get_mail_message", {
              accountId: a.id,
              messageId: "m1",
            }),
          ),
          "MAIL_SCOPE_FORBIDDEN",
        );
        assert.equal(
          code(
            await invoke(read, "prepare_mail_cleanup", {
              accountId: a.id,
              senders: ["notice@example.invalid"],
              action: "trash",
              requestId: randomUUID(),
            }),
          ),
          "MAIL_SCOPE_FORBIDDEN",
        );
      },
    );
    await check(
      "explicit body scope returns untrusted temporary text and never stores it",
      async () => {
        const result = await invoke(g, "get_mail_message", {
          accountId: a.id,
          messageId: "m1",
        });
        assert.equal(result.isError, undefined);
        assert.ok(result.structuredContent.untrustedContent);
        const rows = await db.query(
          "SELECT * FROM personal_mail_messages WHERE account_id=$1",
          [a.id],
        );
        assert.ok(!JSON.stringify(rows).includes("Private fixture body"));
        const records = await db.query(
          "SELECT meta FROM action_logs WHERE service_key='personal-mail'",
        );
        assert.ok(!JSON.stringify(records).includes("Private fixture body"));
      },
    );
    let preview;
    await check(
      "cleanup fixes target count; MCP cannot confirm and worker never runs a preview",
      async () => {
        const result = await invoke(g, "prepare_mail_cleanup", {
          accountId: a.id,
          senders: ["notice@example.invalid"],
          action: "trash",
          requestId: randomUUID(),
        });
        preview = result.structuredContent;
        assert.equal(preview.total, 1);
        assert.equal(preview.confirmationToken, undefined);
        assert.ok(preview.confirmUrl.includes(`accountId=${a.id}`));
        await worker.tick();
        assert.equal(calls.length, 0);
        assert.equal(
          (await jobs.read(user, a.id, preview.id)).status,
          "preview",
        );
      },
    );
    await check(
      "browser requires trusted Origin, exact count and a private confirmation token",
      async () => {
        const input = await jobs.read(user, a.id, preview.id, true);
        assert.equal(
          (
            await browser(
              `/accounts/${a.id}/jobs/${preview.id}/confirm`,
              { expectedCount: 1, confirmationToken: input.confirmationToken },
              user,
              "https://untrusted.example.invalid",
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await browser(`/accounts/${a.id}/jobs/${preview.id}/confirm`, {
              expectedCount: 2,
              confirmationToken: input.confirmationToken,
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await browser(`/accounts/${a.id}/jobs/${preview.id}/confirm`, {
              expectedCount: 1,
              confirmationToken: "forged",
            })
          ).status,
          409,
        );
        assert.equal(calls.length, 0);
      },
    );
    await check(
      "confirmed snapshots exclude new and important messages; progress is durable",
      async () => {
        await confirm(preview);
        remote.get(a.id).set("m3", {
          id: "m3",
          sender: "notice@example.invalid",
          receivedAt: new Date(),
          important: false,
          inbox: true,
        });
        await drain();
        const result = await jobs.read(user, a.id, preview.id);
        assert.equal(result.status, "completed");
        assert.equal(result.counts.done, 1);
        assert.equal(remote.get(a.id).get("m1").inbox, false);
        assert.equal(remote.get(a.id).get("m2").inbox, true);
        assert.equal(remote.get(a.id).get("m3").inbox, true);
      },
    );
    await check(
      "durable request IDs deduplicate concurrent proposals and reject changed meaning",
      async () => {
        const input = {
          accountId: a.id,
          senders: ["notice@example.invalid"],
          action: "important",
          requestId: randomUUID(),
        };
        const [one, two] = await Promise.all([
          jobs.prepare(user, input, "cleanup"),
          jobs.prepare(user, input, "cleanup"),
        ]);
        assert.equal(one.id, two.id);
        await assert.rejects(
          jobs.prepare(user, { ...input, action: "trash" }, "cleanup"),
          /MAIL_REQUEST_ID_REUSED/,
        );
      },
    );
    await check(
      "expired preview and changed account generation reject confirmation",
      async () => {
        const expired = await jobs.prepare(
          user,
          {
            accountId: a.id,
            senders: ["notice@example.invalid"],
            action: "important",
            requestId: randomUUID(),
          },
          "cleanup",
        );
        const data = await jobs.read(user, a.id, expired.id, true);
        await db.query(
          "UPDATE personal_mail_jobs SET confirmation_expires_at=now()-interval '1 second' WHERE id=$1",
          [expired.id],
        );
        await assert.rejects(
          jobs.confirm(
            user,
            a.id,
            expired.id,
            data.total,
            data.confirmationToken,
          ),
          /MAIL_CONFIRMATION_EXPIRED/,
        );
      },
    );
    await check(
      "rules require browser confirmation and never process historical messages",
      async () => {
        const result = await invoke(g, "prepare_mail_rule", {
          accountId: a.id,
          senders: ["notice@example.invalid"],
          action: "archive",
          category: "work",
          requestId: randomUUID(),
        });
        assert.equal((await jobs.rules(user, a.id)).length, 0);
        await confirm(result.structuredContent);
        assert.equal((await jobs.rules(user, a.id))[0].category, "work");
        await db.query(
          "UPDATE personal_mail_accounts SET next_sync_at=now() WHERE id=$1",
          [a.id],
        );
        await worker.tick();
        await drain();
        assert.equal(remote.get(a.id).get("m2").inbox, true);
      },
    );
    await check(
      "new mail follows the approved rule and keep stops future cleanup",
      async () => {
        remote.get(a.id).set("m4", {
          id: "m4",
          sender: "notice@example.invalid",
          receivedAt: new Date(Date.now() + 1000),
          important: false,
          inbox: true,
        });
        await db.query(
          "UPDATE personal_mail_accounts SET next_sync_at=now() WHERE id=$1",
          [a.id],
        );
        await worker.tick();
        await drain();
        assert.equal(remote.get(a.id).get("m4").inbox, false);
        const keep = await jobs.prepare(
          user,
          {
            accountId: a.id,
            senders: ["notice@example.invalid"],
            action: "keep",
            category: "general",
            requestId: randomUUID(),
          },
          "rule",
        );
        await confirm(keep);
        remote.get(a.id).set("m5", {
          id: "m5",
          sender: "notice@example.invalid",
          receivedAt: new Date(Date.now() + 1000),
          important: false,
          inbox: true,
        });
        await db.query(
          "UPDATE personal_mail_accounts SET next_sync_at=now() WHERE id=$1",
          [a.id],
        );
        await worker.tick();
        await drain();
        assert.equal(remote.get(a.id).get("m5").inbox, true);
      },
    );
    await check(
      "revoked delegated jobs pause; owner browser can explicitly take over an approved job",
      async () => {
        const proposal = await jobs.prepare(
          user,
          {
            accountId: a.id,
            senders: ["notice@example.invalid"],
            action: "important",
            requestId: randomUUID(),
          },
          "cleanup",
          g.id,
        );
        await confirm(proposal);
        await db.query(
          "UPDATE external_ai_connections SET revoked_at=now() WHERE id=$1",
          [g.id],
        );
        const before = calls.length;
        await worker.tick();
        assert.equal(calls.length, before);
        assert.equal(
          (await jobs.read(user, a.id, proposal.id)).status,
          "paused",
        );
        await jobs.control(user, a.id, proposal.id, "resume");
        await drain();
        assert.equal(
          (await jobs.read(user, a.id, proposal.id)).status,
          "completed",
        );
      },
    );
    await check(
      "partial failure persists bounded error and backoff; another worker resumes safely",
      async () => {
        failures.set(
          "m5",
          new MailError("MAIL_PROVIDER_RATE_LIMITED", 429, true),
        );
        const job = await jobs.prepare(
          user,
          {
            accountId: a.id,
            senders: ["notice@example.invalid"],
            action: "archive",
            includeImportant: true,
            requestId: randomUUID(),
          },
          "cleanup",
        );
        await confirm(job);
        await drain();
        const state = await jobs.read(user, a.id, job.id);
        assert.equal(state.lastError, "MAIL_PROVIDER_RATE_LIMITED");
        const count = calls.length;
        await worker.tick();
        assert.equal(calls.length, count);
        failures.delete("m5");
        await db.query(
          "UPDATE personal_mail_jobs SET lease_until=now()-interval '1 second' WHERE id=$1",
          [job.id],
        );
        const restarted = new PersonalMailWorker(db, factory);
        await restarted.tick();
        await restarted.tick();
        assert.equal((await jobs.read(user, a.id, job.id)).status, "completed");
      },
    );
    await check("two workers never claim the same item twice", async () => {
      remote.get(a.id).set("m6", {
        id: "m6",
        sender: "once@example.invalid",
        receivedAt: new Date(),
        important: false,
        inbox: true,
      });
      await db.query(
        "UPDATE personal_mail_accounts SET next_sync_at=now() WHERE id=$1",
        [a.id],
      );
      await worker.tick();
      const proposal = await jobs.prepare(
        user,
        {
          accountId: a.id,
          senders: ["once@example.invalid"],
          action: "archive",
          requestId: randomUUID(),
        },
        "cleanup",
      );
      await confirm(proposal);
      const start = calls.length;
      await Promise.all([
        new PersonalMailWorker(db, factory).tick(),
        new PersonalMailWorker(db, factory).tick(),
      ]);
      await drain();
      assert.equal(
        calls.slice(start).filter((row) => row.id === "m6").length,
        1,
      );
    });
    await check(
      "audit failure rolls back local completion; expired lease replays without a second remote mutation",
      async () => {
        remote.get(a.id).set("m7", {
          id: "m7",
          sender: "atomic@example.invalid",
          receivedAt: new Date(),
          important: false,
          inbox: true,
        });
        await db.query(
          "UPDATE personal_mail_accounts SET next_sync_at=now() WHERE id=$1",
          [a.id],
        );
        await worker.tick();
        const proposal = await jobs.prepare(
          user,
          {
            accountId: a.id,
            senders: ["atomic@example.invalid"],
            action: "archive",
            requestId: randomUUID(),
          },
          "cleanup",
        );
        await confirm(proposal);
        await db.query(
          `CREATE FUNCTION o4o_mail_fixture_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.service_key='personal-mail' AND NEW.action_key='mail.item.finished' THEN RAISE EXCEPTION 'MAIL_AUDIT_FIXTURE_REJECT'; END IF; RETURN NEW; END $$`,
        );
        await db.query(
          "CREATE TRIGGER o4o_mail_fixture_reject BEFORE INSERT ON action_logs FOR EACH ROW EXECUTE FUNCTION o4o_mail_fixture_audit_failure()",
        );
        try {
          await assert.rejects(worker.tick());
          const [item] = await db.query(
            "SELECT status FROM personal_mail_job_items WHERE job_id=$1",
            [proposal.id],
          );
          assert.equal(item.status, "pending");
          assert.equal(
            (await jobs.read(user, a.id, proposal.id)).status,
            "running",
          );
        } finally {
          await db.query("DROP TRIGGER o4o_mail_fixture_reject ON action_logs");
          await db.query("DROP FUNCTION o4o_mail_fixture_audit_failure()");
        }
        await db.query(
          "UPDATE personal_mail_jobs SET lease_until=now()-interval '1 second' WHERE id=$1",
          [proposal.id],
        );
        await drain();
        assert.equal(
          (await jobs.read(user, a.id, proposal.id)).status,
          "completed",
        );
        assert.equal(mutations.filter((row) => row.id === "m7").length, 1);
      },
    );
    await check(
      "OAuth flow is current-user-bound, PKCE-bound and consumed exactly once without external calls",
      async () => {
        const originalFetch = globalThis.fetch,
          oldId = process.env.PERSONAL_MAIL_GOOGLE_CLIENT_ID,
          oldSecret = process.env.PERSONAL_MAIL_GOOGLE_CLIENT_SECRET;
        process.env.PERSONAL_MAIL_GOOGLE_CLIENT_ID = randomUUID();
        process.env.PERSONAL_MAIL_GOOGLE_CLIENT_SECRET = randomUUID();
        const start = await accounts.gmailStart(user),
          authorization = new URL(start.authorizationUrl);
        let exchanges = 0;
        globalThis.fetch = async (url, input) => {
          if (String(url) === "https://oauth2.googleapis.com/token") {
            exchanges++;
            const body = new URLSearchParams(input.body);
            assert.equal(
              createHash("sha256")
                .update(body.get("code_verifier"))
                .digest("base64url"),
              authorization.searchParams.get("code_challenge"),
            );
            return new Response(
              JSON.stringify({
                access_token: randomUUID(),
                refresh_token: randomUUID(),
                expires_in: 3600,
                scope: "https://www.googleapis.com/auth/gmail.modify",
              }),
              { status: 200 },
            );
          }
          if (
            String(url) ===
            "https://gmail.googleapis.com/gmail/v1/users/me/profile"
          )
            return new Response(
              JSON.stringify({ emailAddress: "oauth-fixture@example.invalid" }),
              { status: 200 },
            );
          throw new Error("UNEXPECTED_FIXTURE_OUTBOUND_REQUEST");
        };
        try {
          const state = authorization.searchParams.get("state");
          await assert.rejects(
            accounts.gmailComplete(other, state, "fixture-code"),
            /MAIL_AUTHORIZATION_EXPIRED/,
          );
          assert.equal(exchanges, 0);
          const result = await accounts.gmailComplete(
            user,
            state,
            "fixture-code",
          );
          assert.equal(exchanges, 1);
          assert.equal(result.address, "oauth-fixture@example.invalid");
          await assert.rejects(
            accounts.gmailComplete(user, state, "fixture-code"),
            /MAIL_AUTHORIZATION_EXPIRED/,
          );
          assert.equal(exchanges, 1);
          await accounts.disconnect(user, result.id);
        } finally {
          globalThis.fetch = originalFetch;
          if (oldId === undefined)
            delete process.env.PERSONAL_MAIL_GOOGLE_CLIENT_ID;
          else process.env.PERSONAL_MAIL_GOOGLE_CLIENT_ID = oldId;
          if (oldSecret === undefined)
            delete process.env.PERSONAL_MAIL_GOOGLE_CLIENT_SECRET;
          else process.env.PERSONAL_MAIL_GOOGLE_CLIENT_SECRET = oldSecret;
        }
      },
    );
    await check(
      "account deactivation blocks new provider work and an owner can resume only after access is restored",
      async () => {
        remote.get(a.id).set("m8", {
          id: "m8",
          sender: "access@example.invalid",
          receivedAt: new Date(),
          important: false,
          inbox: true,
        });
        await db.query(
          "UPDATE personal_mail_accounts SET next_sync_at=now() WHERE id=$1",
          [a.id],
        );
        await worker.tick();
        const proposal = await jobs.prepare(
          user,
          {
            accountId: a.id,
            senders: ["access@example.invalid"],
            action: "archive",
            requestId: randomUUID(),
          },
          "cleanup",
        );
        await confirm(proposal);
        await db.query('UPDATE users SET "isActive"=false WHERE id=$1', [user]);
        const before = calls.length;
        try {
          await worker.tick();
          assert.equal(calls.length, before);
          assert.equal(
            (
              await db.query(
                "SELECT status FROM personal_mail_jobs WHERE id=$1",
                [proposal.id],
              )
            )[0].status,
            "paused",
          );
        } finally {
          await db.query('UPDATE users SET "isActive"=true WHERE id=$1', [
            user,
          ]);
        }
        await jobs.control(user, a.id, proposal.id, "resume");
        await drain();
        assert.equal(
          (await jobs.read(user, a.id, proposal.id)).status,
          "completed",
        );
      },
    );
    if (browserFixture) {
      remote
        .get(a.id)
        .set("m9", {
          id: "m9",
          sender: "notice@example.invalid",
          receivedAt: new Date(),
          important: false,
          inbox: true,
        });
      await db.query(
        "UPDATE personal_mail_accounts SET next_sync_at=now() WHERE id=$1",
        [a.id],
      );
      await worker.tick();
      await browserFixture.run({ check, user, account: a, worker });
    }
    await check(
      "reconnection invalidates old targets and resets automatic destructive rules",
      async () => {
        const proposal = await jobs.prepare(
          user,
          {
            accountId: a.id,
            senders: ["once@example.invalid"],
            action: "trash",
            requestId: randomUUID(),
          },
          "rule",
        );
        await accounts.save(user, "gmail", "mail-owner@example.invalid", {
          accessToken: randomUUID(),
        });
        assert.equal(
          (await jobs.read(user, a.id, proposal.id)).status,
          "cancelled",
        );
        assert.ok(
          (await jobs.rules(user, a.id)).every((row) => row.action === "keep"),
        );
      },
    );
    await check(
      "disconnect hard-removes credentials, metadata, rules, jobs and targets but keeps minimal audit",
      async () => {
        await accounts.disconnect(user, a.id);
        for (const table of [
          "personal_mail_accounts",
          "personal_mail_messages",
          "personal_mail_rules",
          "personal_mail_jobs",
        ])
          assert.equal(
            (
              await db.query(
                `SELECT count(*)::int AS n FROM ${table} WHERE ${table === "personal_mail_accounts" ? "id" : "account_id"}=$1`,
                [a.id],
              )
            )[0].n,
            0,
          );
        assert.equal(
          (
            await db.query(
              "SELECT count(*)::int AS n FROM personal_mail_job_items i JOIN personal_mail_jobs j ON j.id=i.job_id WHERE j.account_id=$1",
              [a.id],
            )
          )[0].n,
          0,
        );
        assert.ok(
          (
            await db.query(
              "SELECT 1 FROM action_logs WHERE service_key='personal-mail' AND action_key='mail.account.disconnected'",
            )
          ).length,
        );
      },
    );
    await check(
      "disabled service and missing key still allow owner-only credential destruction",
      async () => {
        const key = process.env.ENCRYPTION_KEY;
        process.env.PERSONAL_MAIL_ENABLED = "false";
        delete process.env.ENCRYPTION_KEY;
        try {
          assert.equal((await accounts.list(other)).length, 1);
          await assert.rejects(
            accounts.disconnect(user, b.id),
            /MAIL_ACCOUNT_NOT_FOUND/,
          );
          const before = calls.length;
          assert.equal((await worker.tick()).status, "idle");
          assert.equal(calls.length, before);
          await accounts.disconnect(other, b.id);
          assert.equal((await accounts.list(other)).length, 0);
        } finally {
          process.env.ENCRYPTION_KEY = key;
          process.env.PERSONAL_MAIL_ENABLED = "true";
        }
      },
    );
  } finally {
    if (browserFixture) await browserFixture.close();
    await Promise.all(clients.map((client) => client.close()));
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    for (const name of envNames) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}
