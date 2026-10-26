import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import {
  GmailProvider,
  GMAIL_SCOPE,
} from "../../apps/api-server/dist/modules/personal-mail/providers/gmail.js";
import { runImapProviderChecks } from "./personal-mail-imap-fixture.mjs";

export async function runMailProviderChecks({ check }) {
  await runImapProviderChecks({ check });
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const mail = new Map([
    ["abc1", new Set(["INBOX"])],
    ["abc2", new Set(["INBOX", "IMPORTANT"])],
  ]);
  let writes = 0,
    refreshes = 0,
    rateLimited = false,
    ignoreWrite = false;
  const oldId = process.env.PERSONAL_MAIL_GOOGLE_CLIENT_ID,
    oldSecret = process.env.PERSONAL_MAIL_GOOGLE_CLIENT_SECRET;
  process.env.PERSONAL_MAIL_GOOGLE_CLIENT_ID = randomUUID();
  process.env.PERSONAL_MAIL_GOOGLE_CLIENT_SECRET = randomUUID();
  app.post("/token", (_req, res) => {
    refreshes++;
    res.json({ access_token: "fixture-access", expires_in: 3600 });
  });
  app.get("/profile", (_req, res) =>
    res.json({ emailAddress: "provider@example.invalid" }),
  );
  app.get("/messages", (req, res) =>
    res.json(
      req.query.pageToken
        ? { messages: [{ id: "abc2" }] }
        : { messages: [{ id: "abc1" }], nextPageToken: "second-page" },
    ),
  );
  app.get("/messages/:id", (req, res) => {
    if (rateLimited) {
      res.status(429).json({ error: { message: "private provider response" } });
      return;
    }
    if (!mail.has(req.params.id)) {
      res.status(404).json({ error: {} });
      return;
    }
    res.json({
      id: req.params.id,
      internalDate: String(Date.now()),
      labelIds: [...mail.get(req.params.id)],
      payload: {
        mimeType: "text/plain",
        headers: [
          { name: "From", value: "Notice <notice@example.invalid>" },
          { name: "Subject", value: "Ephemeral subject" },
        ],
        body: {
          data: Buffer.from("Private fixture body").toString("base64url"),
        },
      },
    });
  });
  app.post("/messages/:id/modify", (req, res) => {
    writes++;
    const labels = mail.get(req.params.id);
    if (!ignoreWrite) {
      for (const value of req.body.removeLabelIds ?? []) labels.delete(value);
      for (const value of req.body.addLabelIds ?? []) labels.add(value);
    }
    res.json({ id: req.params.id, labelIds: [...labels] });
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/`;
  let persisted;
  const provider = new GmailProvider(
    { refreshToken: randomUUID() },
    async (credentials) => {
      persisted = credentials;
    },
    fetch,
    { api: base, token: `${base}token` },
  );
  try {
    await check(
      "Gmail HTTP refresh persists credentials and pages metadata without bodies",
      async () => {
        assert.equal(await provider.identity(), "provider@example.invalid");
        assert.equal(refreshes, 1);
        assert.equal(persisted.accessToken, "fixture-access");
        const first = await provider.scan(null),
          second = await provider.scan(first.cursor);
        assert.equal(first.messages[0].sender, "notice@example.invalid");
        assert.equal(second.messages[0].important, true);
        assert.equal(second.cursor, null);
        assert.equal(first.messages[0].text, undefined);
      },
    );
    await check(
      "Gmail verifies absolute state, preserves important mail and safely retries",
      async () => {
        assert.equal(await provider.apply("abc2", "trash", false), "protected");
        assert.equal(writes, 0);
        assert.equal(await provider.apply("abc1", "archive", false), "applied");
        assert.equal(
          await provider.apply("abc1", "archive", false),
          "already_applied",
        );
        assert.equal(writes, 1);
        assert.equal(await provider.apply("missing", "trash", true), "missing");
      },
    );
    await check(
      "Gmail body is ephemeral MIME text and provider 429 never leaks response text",
      async () => {
        assert.deepEqual(await provider.read("abc1"), {
          subject: "Ephemeral subject",
          text: "Private fixture body",
        });
        rateLimited = true;
        await assert.rejects(
          provider.read("abc1"),
          (error) =>
            error.code === "MAIL_PROVIDER_RATE_LIMITED" &&
            !error.message.includes("private provider response"),
        );
        rateLimited = false;
      },
    );
    await check(
      "Gmail success response without the requested state never claims completion",
      async () => {
        ignoreWrite = true;
        mail.get("abc1").add("INBOX");
        await assert.rejects(
          provider.apply("abc1", "trash", false),
          /MAIL_STATE_NOT_CONFIRMED/,
        );
        ignoreWrite = false;
      },
    );
    await check(
      "Gmail authorization exchange requires explicit modify scope and an offline credential",
      async () => {
        const transport = async () =>
          new Response(
            JSON.stringify({
              scope: GMAIL_SCOPE,
              access_token: randomUUID(),
              refresh_token: randomUUID(),
              expires_in: 3600,
            }),
            { status: 200 },
          );
        const good = await GmailProvider.exchange(
          "code",
          "verifier",
          transport,
        );
        assert.ok(good.refreshToken);
        await assert.rejects(
          GmailProvider.exchange(
            "code",
            "verifier",
            async () =>
              new Response(
                JSON.stringify({
                  scope: "openid",
                  access_token: randomUUID(),
                  expires_in: 3600,
                }),
                { status: 200 },
              ),
          ),
          /GMAIL_PERMISSION_REQUIRED/,
        );
      },
    );
  } finally {
    await provider.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    if (oldId === undefined) delete process.env.PERSONAL_MAIL_GOOGLE_CLIENT_ID;
    else process.env.PERSONAL_MAIL_GOOGLE_CLIENT_ID = oldId;
    if (oldSecret === undefined)
      delete process.env.PERSONAL_MAIL_GOOGLE_CLIENT_SECRET;
    else process.env.PERSONAL_MAIL_GOOGLE_CLIENT_SECRET = oldSecret;
  }
}
