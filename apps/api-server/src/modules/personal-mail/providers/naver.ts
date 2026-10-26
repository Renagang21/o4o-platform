import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import {
  MailError,
  normalizeSender,
  type MailProvider,
  type MailAction,
  type MessageMeta,
} from "../contracts.js";

export class NaverProvider implements MailProvider {
  private connected = false;
  constructor(
    private readonly address: string,
    private readonly client: ImapFlow,
  ) {
    client.on("error", () => {});
  }
  static create(address: string, password: string) {
    if (!/^[a-z0-9._-]+@naver\.com$/i.test(address))
      throw new MailError("NAVER_ADDRESS_REQUIRED");
    return new NaverProvider(
      address,
      new ImapFlow({
        host: "imap.naver.com",
        port: 993,
        secure: true,
        auth: { user: address, pass: password },
        logger: false,
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 20_000,
        tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
      }),
    );
  }
  private async connect() {
    if (!this.connected) {
      try {
        await this.client.connect();
        this.connected = true;
      } catch (error) {
        if ((error as { authenticationFailed?: boolean }).authenticationFailed)
          throw new MailError("MAIL_RECONNECT_REQUIRED", 409);
        throw error;
      }
    }
  }
  async identity() {
    await this.connect();
    return normalizeSender(this.address);
  }
  private async folders() {
    await this.connect();
    return this.client.list();
  }
  async capabilities() {
    const folders = await this.folders();
    return {
      archive:
        this.client.capabilities.has("MOVE") &&
        folders.some((f) => f.specialUse === "\\Archive"),
      trash:
        this.client.capabilities.has("MOVE") &&
        folders.some((f) => f.specialUse === "\\Trash"),
      important: true,
      body: true,
    };
  }
  private async inbox() {
    await this.connect();
    return this.client.getMailboxLock("INBOX");
  }
  private validity() {
    const mailbox = this.client.mailbox;
    if (!mailbox) throw new MailError("MAILBOX_UNAVAILABLE", 503);
    return mailbox.uidValidity.toString();
  }
  private uid(id: string) {
    const [validity, uid] = id.split(":");
    if (
      validity !== this.validity() ||
      !/^\d+$/.test(uid ?? "") ||
      Number(uid) < 1
    )
      throw new MailError("MAILBOX_CHANGED", 409);
    return Number(uid);
  }
  async scan(cursor: string | null) {
    const lock = await this.inbox();
    try {
      const validity = this.validity();
      let last = 0;
      if (cursor) {
        const parsed = JSON.parse(cursor);
        if (parsed.validity !== validity)
          throw new MailError("MAILBOX_CHANGED", 409);
        last = Number(parsed.last);
        if (!Number.isSafeInteger(last) || last < 0)
          throw new MailError("MAIL_CURSOR_INVALID");
      }
      const found = await this.client.search(
        { uid: `${last + 1}:*` },
        { uid: true },
      );
      const ids = (found || [])
        .filter((id) => id > last)
        .sort((a, b) => a - b)
        .slice(0, 100);
      const messages: MessageMeta[] = [];
      if (ids.length) {
        // IMAP async iterator is ordered protocol IO; no message bodies are fetched during sync.
        for await (const item of this.client.fetch(
          ids,
          { uid: true, envelope: true, flags: true, internalDate: true },
          { uid: true },
        )) {
          const address = item.envelope?.from?.[0]?.address;
          if (!address) continue;
          try {
            const receivedAt = new Date(item.internalDate || 0);
            if (!Number.isFinite(receivedAt.getTime())) continue;
            messages.push({
              id: `${validity}:${item.uid}`,
              sender: normalizeSender(address),
              receivedAt,
              important: !!item.flags?.has("\\Flagged"),
              inbox: true,
            });
          } catch (error) {
            if (
              !(error instanceof MailError) ||
              error.code !== "MAIL_SENDER_INVALID"
            )
              throw error;
          }
        }
      }
      return {
        messages,
        cursor:
          ids.length === 100
            ? JSON.stringify({ validity, last: ids[ids.length - 1] })
            : null,
      };
    } finally {
      lock.release();
    }
  }
  async read(id: string) {
    const lock = await this.inbox();
    try {
      const uid = this.uid(id),
        item = await this.client.fetchOne(uid, { size: true }, { uid: true });
      if (!item) throw new MailError("MAIL_MESSAGE_MISSING", 404);
      if ((item.size ?? 0) > 1_000_000)
        throw new MailError("MAIL_MESSAGE_TOO_LARGE", 413);
      const download = await this.client.download(uid, undefined, {
        uid: true,
        maxBytes: 1_000_001,
      });
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of download.content) {
        size += chunk.length;
        if (size > 1_000_000) {
          download.content.destroy();
          throw new MailError("MAIL_MESSAGE_TOO_LARGE", 413);
        }
        chunks.push(Buffer.from(chunk));
      }
      const parsed = await simpleParser(Buffer.concat(chunks), {
        skipTextToHtml: true,
        skipImageLinks: true,
      });
      return {
        subject: (parsed.subject ?? "").slice(0, 200),
        text: (parsed.text ?? "").slice(0, 32000),
      };
    } finally {
      lock.release();
    }
  }
  async apply(
    id: string,
    action: Exclude<MailAction, "keep">,
    includeImportant: boolean,
  ) {
    const folders = await this.folders(),
      lock = await this.inbox();
    try {
      const uid = this.uid(id),
        item = await this.client.fetchOne(uid, { flags: true }, { uid: true });
      if (!item) return "missing";
      if (action === "important") {
        if (item.flags?.has("\\Flagged")) return "already_applied";
        await this.client.messageFlagsAdd(uid, ["\\Flagged"], { uid: true });
        return "applied";
      }
      if (!includeImportant && item.flags?.has("\\Flagged")) return "protected";
      const destination = folders.find(
        (f) =>
          f.specialUse === (action === "archive" ? "\\Archive" : "\\Trash"),
      );
      if (!destination || !this.client.capabilities.has("MOVE"))
        throw new MailError("MAIL_ACTION_UNSUPPORTED", 409);
      const moved = await this.client.messageMove(uid, destination.path, {
        uid: true,
      });
      if (!moved) throw new MailError("MAIL_PROVIDER_UNAVAILABLE", 503, true);
      return "applied";
    } finally {
      lock.release();
    }
  }
  async close() {
    if (this.connected) {
      this.connected = false;
      await this.client.logout().catch(() => this.client.close());
    } else this.client.close();
  }
}
