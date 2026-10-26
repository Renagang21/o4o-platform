/** Loopback TLS IMAP protocol fixture. Runtime-generated certificates/credentials are removed on exit. */
import assert from "node:assert/strict";
import tls from "node:tls";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { ImapFlow } from "imapflow";
import { NaverProvider } from "../../apps/api-server/dist/modules/personal-mail/providers/naver.js";

export async function runImapProviderChecks({ check }) {
  const directory = mkdtempSync(join(tmpdir(), "o4o-personal-mail-imap-"));
  const keyPath = join(directory, "key.pem"),
    certPath = join(directory, "cert.pem");
  execFileSync(
    "/usr/bin/openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "1",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
      "-keyout",
      keyPath,
      "-out",
      certPath,
    ],
    { stdio: "ignore" },
  );
  const secret = randomUUID(),
    sockets = new Set(),
    messages = new Map([
      [1, { important: false }],
      [2, { important: true }],
    ]);
  let validity = 41,
    moves = 0,
    encrypted = false;
  const raw = Buffer.from(
    "From: Notice <notice@example.invalid>\r\nSubject: Fixture mail\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nEphemeral IMAP body",
  );
  const server = tls.createServer(
    { key: readFileSync(keyPath), cert: readFileSync(certPath) },
    (socket) => {
      sockets.add(socket);
      socket.on("error", () => {});
      socket.on("close", () => sockets.delete(socket));
      encrypted = socket.encrypted;
      socket.write(
        "* OK [CAPABILITY IMAP4rev1 UIDPLUS MOVE SPECIAL-USE AUTH=PLAIN SASL-IR] Fixture ready\r\n",
      );
      let buffer = "",
        pendingAuthTag = null;
      const write = (text) => socket.write(text + "\r\n");
      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        let boundary;
        while ((boundary = buffer.indexOf("\r\n")) >= 0) {
          const line = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          if (pendingAuthTag) {
            const auth = Buffer.from(line, "base64").toString().split("\0");
            write(
              auth.at(-1) === secret
                ? `${pendingAuthTag} OK authenticated`
                : `${pendingAuthTag} NO [AUTHENTICATIONFAILED] denied`,
            );
            pendingAuthTag = null;
            continue;
          }
          const tag = line.split(" ")[0],
            command = line.slice(tag.length + 1),
            upper = command.toUpperCase();
          if (upper.startsWith("CAPABILITY")) {
            write(
              "* CAPABILITY IMAP4rev1 UIDPLUS MOVE SPECIAL-USE AUTH=PLAIN SASL-IR",
            );
            write(`${tag} OK capability`);
          } else if (upper.startsWith("AUTHENTICATE PLAIN")) {
            if (command.split(" ").length === 2) {
              pendingAuthTag = tag;
              write("+");
              continue;
            }
            const auth = Buffer.from(command.split(" ").at(-1), "base64")
              .toString()
              .split("\0");
            write(
              auth.at(-1) === secret
                ? `${tag} OK authenticated`
                : `${tag} NO [AUTHENTICATIONFAILED] denied`,
            );
          } else if (upper.startsWith("LOGIN ")) {
            write(
              command.includes(secret)
                ? `${tag} OK authenticated`
                : `${tag} NO [AUTHENTICATIONFAILED] denied`,
            );
          } else if (upper.startsWith("LIST ") || upper.startsWith("LSUB ")) {
            write('* LIST (\\HasNoChildren) "/" "INBOX"');
            write('* LIST (\\HasNoChildren \\Archive) "/" "Archive"');
            write('* LIST (\\HasNoChildren \\Trash) "/" "Trash"');
            write(`${tag} OK list`);
          } else if (
            upper.startsWith("SELECT ") ||
            upper.startsWith("EXAMINE ")
          ) {
            write("* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft)");
            write(
              "* OK [PERMANENTFLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft \\*)] flags",
            );
            write(`* ${messages.size} EXISTS`);
            write(`* OK [UIDVALIDITY ${validity}] validity`);
            write("* OK [UIDNEXT 3] next");
            write(`${tag} OK [READ-WRITE] selected`);
          } else if (upper.startsWith("UID SEARCH")) {
            write(`* SEARCH ${[...messages.keys()].join(" ")}`);
            write(`${tag} OK search`);
          } else if (upper.startsWith("UID FETCH")) {
            const range = command.split(" ")[2];
            const ids = [...messages.keys()].filter(
              (id) =>
                range.includes(":") || range.split(",").includes(String(id)),
            );
            for (const id of ids) {
              const flags = messages.get(id).important ? "\\Flagged" : "";
              const fields = [`UID ${id}`];
              if (upper.includes("FLAGS")) fields.push(`FLAGS (${flags})`);
              if (upper.includes("ENVELOPE"))
                fields.push(
                  'ENVELOPE ("26-Oct-2026 00:00:00 +0000" "Fixture mail" ((NIL NIL "notice" "example.invalid")) NIL NIL NIL NIL NIL NIL "<fixture@example.invalid>")',
                );
              if (upper.includes("INTERNALDATE"))
                fields.push('INTERNALDATE "26-Oct-2026 00:00:00 +0000"');
              if (upper.includes("RFC822.SIZE"))
                fields.push(`RFC822.SIZE ${raw.length}`);
              if (upper.includes("BODY.PEEK[") || upper.includes("BODY[")) {
                socket.write(
                  `* ${id} FETCH (${fields.join(" ")} BODY[] {${raw.length}}\r\n`,
                );
                socket.write(raw);
                write(")");
              } else write(`* ${id} FETCH (${fields.join(" ")})`);
            }
            write(`${tag} OK fetched`);
          } else if (upper.startsWith("UID STORE")) {
            const id = Number(command.split(" ")[2]);
            if (messages.has(id)) messages.get(id).important = true;
            write(`${tag} OK stored`);
          } else if (upper.startsWith("UID MOVE")) {
            const id = Number(command.split(" ")[2]);
            if (messages.has(id)) {
              messages.delete(id);
              moves++;
              write(`* ${id} EXPUNGE`);
            }
            write(`${tag} OK [COPYUID ${validity} ${id} 101] moved`);
          } else if (upper.startsWith("LOGOUT")) {
            write("* BYE logout");
            write(`${tag} OK logout`);
            socket.end();
          } else if (upper.startsWith("ID ")) {
            write("* ID NIL");
            write(`${tag} OK id`);
          } else if (
            upper.startsWith("NOOP") ||
            upper.startsWith("CLOSE") ||
            upper.startsWith("UNSELECT")
          )
            write(`${tag} OK done`);
          else write(`${tag} BAD unsupported fixture command`);
        }
      });
    },
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const make = (password) =>
    new NaverProvider(
      "sample@naver.com",
      new ImapFlow({
        host: "127.0.0.1",
        port: server.address().port,
        secure: true,
        auth: { user: "fixture", pass: password },
        logger: false,
        tls: {
          ca: readFileSync(certPath),
          servername: "localhost",
          rejectUnauthorized: true,
        },
        connectionTimeout: 5000,
        socketTimeout: 5000,
      }),
    );
  const provider = make(secret);
  try {
    await check(
      "IMAP uses verified TLS, special-use capabilities and UIDVALIDITY-bound metadata",
      async () => {
        assert.equal(await provider.identity(), "sample@naver.com");
        assert.equal(encrypted, true);
        assert.deepEqual(await provider.capabilities(), {
          archive: true,
          trash: true,
          important: true,
          body: true,
        });
        const result = await provider.scan(null);
        assert.deepEqual(result.messages.map((row) => row.id).sort(), [
          "41:1",
          "41:2",
        ]);
        assert.equal(result.messages[0].sender, "notice@example.invalid");
        assert.equal(result.messages[1].important, true);
      },
    );
    await check(
      "IMAP body is transient parsed text with a size boundary",
      async () => {
        const result = await provider.read("41:1");
        assert.equal(result.subject, "Fixture mail");
        assert.equal(result.text, "Ephemeral IMAP body");
      },
    );
    await check(
      "IMAP preserves important mail and uses MOVE without a copy/delete fallback",
      async () => {
        assert.equal(await provider.apply("41:2", "trash", false), "protected");
        assert.equal(moves, 0);
        assert.equal(await provider.apply("41:1", "archive", false), "applied");
        assert.equal(await provider.apply("41:1", "archive", false), "missing");
        assert.equal(moves, 1);
      },
    );
    await check(
      "IMAP refuses stale UIDVALIDITY and maps invalid credentials without disclosing them",
      async () => {
        await provider.close();
        validity = 42;
        const changed = make(secret);
        try {
          await assert.rejects(
            changed.apply("41:2", "trash", true),
            /MAILBOX_CHANGED/,
          );
        } finally {
          await changed.close();
        }
        const denied = make(randomUUID());
        try {
          await assert.rejects(denied.identity(), /MAIL_RECONNECT_REQUIRED/);
        } finally {
          await denied.close();
        }
      },
    );
  } finally {
    await provider.close();
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  }
}
