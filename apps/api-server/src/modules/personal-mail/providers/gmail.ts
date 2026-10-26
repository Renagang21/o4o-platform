import { simpleParser } from "mailparser";
import { gmailConfig } from "../config.js";
import {
  MailError,
  normalizeSender,
  type MailCredentials,
  type MailProvider,
  type MailAction,
  type MessageMeta,
} from "../contracts.js";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.modify";
interface GmailMessage {
  id: string;
  internalDate: string;
  labelIds?: string[];
  payload?: GmailPart;
}
interface GmailPart {
  mimeType?: string;
  headers?: Array<{ name: string; value: string }>;
  body?: { data?: string };
  parts?: GmailPart[];
}
async function boundedJson(response: Response): Promise<Record<string, any>> {
  const reader = response.body?.getReader();
  if (!reader) throw new MailError("MAIL_PROVIDER_RESPONSE_INVALID", 503);
  const chunks: Uint8Array[] = [];
  let size = 0;
  async function next(): Promise<void> {
    const part = await reader!.read();
    if (part.done) return;
    size += part.value.length;
    if (size > 2_000_000) {
      await reader!.cancel();
      throw new MailError("MAIL_MESSAGE_TOO_LARGE", 413);
    }
    chunks.push(part.value);
    return next();
  }
  await next();
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new MailError("MAIL_PROVIDER_RESPONSE_INVALID", 503);
  }
}
export class GmailProvider implements MailProvider {
  constructor(
    private credentials: MailCredentials,
    private readonly persist: (credentials: MailCredentials) => Promise<void>,
    private readonly http: typeof fetch = fetch,
    private readonly endpoints = {
      api: "https://gmail.googleapis.com/gmail/v1/users/me/",
      token: "https://oauth2.googleapis.com/token",
    },
  ) {}
  private async call(url: string, init: RequestInit) {
    const response = await this.http(url, {
      ...init,
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
    if (response.status === 401 || response.status === 403)
      throw new MailError("MAIL_RECONNECT_REQUIRED", 409);
    if (response.status === 429)
      throw new MailError("MAIL_PROVIDER_RATE_LIMITED", 429, true);
    if (response.status === 404)
      throw new MailError("MAIL_MESSAGE_MISSING", 404);
    if (!response.ok)
      throw new MailError(
        "MAIL_PROVIDER_UNAVAILABLE",
        503,
        response.status >= 500,
      );
    return boundedJson(response);
  }
  private async accessToken() {
    if (
      this.credentials.accessToken &&
      (this.credentials.expiresAt ?? 0) > Date.now() + 30_000
    )
      return this.credentials.accessToken;
    if (!this.credentials.refreshToken)
      throw new MailError("MAIL_RECONNECT_REQUIRED", 409);
    const config = gmailConfig();
    const response = await this.http(this.endpoints.token, {
      method: "POST",
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: this.credentials.refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
    if (response.status === 400 || response.status === 401)
      throw new MailError("MAIL_RECONNECT_REQUIRED", 409);
    if (!response.ok)
      throw new MailError("MAIL_PROVIDER_UNAVAILABLE", 503, true);
    const data = await boundedJson(response);
    if (typeof data.access_token !== "string" || !(Number(data.expires_in) > 0))
      throw new MailError("MAIL_RECONNECT_REQUIRED", 409);
    this.credentials = {
      ...this.credentials,
      accessToken: data.access_token,
      expiresAt: Date.now() + Math.min(Number(data.expires_in), 86400) * 1000,
    };
    await this.persist(this.credentials);
    return this.credentials.accessToken!;
  }
  private async request(path: string, body?: unknown) {
    const token = await this.accessToken();
    return this.call(new URL(path, this.endpoints.api).href, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  static async exchange(
    code: string,
    verifier: string,
    http: typeof fetch = fetch,
  ) {
    const config = gmailConfig();
    const response = await http("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
    if (!response.ok) throw new MailError("GMAIL_AUTHORIZATION_FAILED", 409);
    const data = await boundedJson(response);
    if (
      typeof data.scope !== "string" ||
      !data.scope.split(" ").includes(GMAIL_SCOPE) ||
      typeof data.refresh_token !== "string" ||
      typeof data.access_token !== "string" ||
      !(Number(data.expires_in) > 0)
    )
      throw new MailError("GMAIL_PERMISSION_REQUIRED", 409);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + Math.min(Number(data.expires_in), 86400) * 1000,
    };
  }
  async identity() {
    const data = await this.request("profile");
    return normalizeSender(data.emailAddress);
  }
  async capabilities() {
    return { archive: true, trash: true, important: true, body: true };
  }
  private path(id: string, format = "metadata") {
    if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id))
      throw new MailError("MAIL_MESSAGE_INVALID");
    return `messages/${encodeURIComponent(id)}?format=${format}`;
  }
  async scan(cursor: string | null) {
    const query = new URLSearchParams({ maxResults: "50", labelIds: "INBOX" });
    if (cursor) query.set("pageToken", cursor);
    const page = await this.request(`messages?${query}`);
    const ids: Array<{ id: string }> = Array.isArray(page.messages)
      ? page.messages
      : [];
    if (ids.length > 50)
      throw new MailError("MAIL_PROVIDER_RESPONSE_INVALID", 503);
    const messages: MessageMeta[] = [];
    // Five concurrent metadata reads per chunk, with ordered chunks to bound provider load.
    const chunks = Array.from({ length: Math.ceil(ids.length / 5) }, (_, i) =>
      ids.slice(i * 5, i * 5 + 5),
    );
    await chunks.reduce(async (previous, chunk) => {
      await previous;
      const rows = await Promise.all(
        chunk.map(async ({ id }) => {
          try {
            const item = (await this.request(
              this.path(id),
            )) as unknown as GmailMessage;
            const from = item.payload?.headers?.find(
              (h) => h.name.toLowerCase() === "from",
            )?.value;
            if (!from) return null;
            const receivedAt = new Date(Number(item.internalDate));
            if (!Number.isFinite(receivedAt.getTime())) return null;
            return {
              id: item.id,
              sender: normalizeSender(from),
              receivedAt,
              important: !!item.labelIds?.includes("IMPORTANT"),
              inbox: !!item.labelIds?.includes("INBOX"),
            };
          } catch (error) {
            if (
              error instanceof MailError &&
              ["MAIL_MESSAGE_MISSING", "MAIL_SENDER_INVALID"].includes(
                error.code,
              )
            )
              return null;
            throw error;
          }
        }),
      );
      messages.push(...rows.filter((row): row is MessageMeta => row !== null));
    }, Promise.resolve());
    return {
      messages,
      cursor:
        typeof page.nextPageToken === "string" ? page.nextPageToken : null,
    };
  }
  async read(id: string) {
    const item = (await this.request(
      this.path(id, "full"),
    )) as unknown as GmailMessage;
    const subject =
      item.payload?.headers
        ?.find((h) => h.name.toLowerCase() === "subject")
        ?.value?.slice(0, 200) ?? "";
    const leaves = (part: GmailPart): GmailPart[] =>
      part.parts ? part.parts.flatMap(leaves) : [part];
    const parts = item.payload ? leaves(item.payload) : [];
    const part =
      parts.find((p) => p.mimeType === "text/plain" && p.body?.data) ??
      parts.find((p) => p.mimeType === "text/html" && p.body?.data);
    if (!part?.body?.data) return { subject, text: "" };
    const contentType =
      part.headers
        ?.find((h) => h.name.toLowerCase() === "content-type")
        ?.value?.replace(/[\r\n]/g, "") ?? part.mimeType;
    const raw = Buffer.concat([
      Buffer.from(`Content-Type: ${contentType}\r\n\r\n`),
      Buffer.from(part.body.data, "base64url"),
    ]);
    const parsed = await simpleParser(raw, {
      skipTextToHtml: true,
      skipImageLinks: true,
    });
    return { subject, text: (parsed.text ?? "").slice(0, 32000) };
  }
  async apply(
    id: string,
    action: Exclude<MailAction, "keep">,
    includeImportant: boolean,
  ) {
    let item: GmailMessage;
    try {
      item = (await this.request(this.path(id))) as unknown as GmailMessage;
    } catch (error) {
      if (error instanceof MailError && error.code === "MAIL_MESSAGE_MISSING")
        return "missing";
      throw error;
    }
    const labels = item.labelIds ?? [];
    if (action === "trash" && labels.includes("TRASH"))
      return "already_applied";
    if (action === "archive" && !labels.includes("INBOX"))
      return "already_applied";
    if (!labels.includes("INBOX")) return "missing";
    if (action === "important" && labels.includes("IMPORTANT"))
      return "already_applied";
    if (
      action !== "important" &&
      !includeImportant &&
      labels.includes("IMPORTANT")
    )
      return "protected";
    const operation =
      action === "important"
        ? { addLabelIds: ["IMPORTANT"] }
        : action === "trash"
          ? { addLabelIds: ["TRASH"], removeLabelIds: ["INBOX"] }
          : { removeLabelIds: ["INBOX"] };
    await this.request(`messages/${encodeURIComponent(id)}/modify`, operation);
    const verified = (await this.request(
      this.path(id),
    )) as unknown as GmailMessage;
    const after = verified.labelIds ?? [];
    if (
      action === "important"
        ? !after.includes("IMPORTANT")
        : action === "trash"
          ? !after.includes("TRASH")
          : after.includes("INBOX")
    )
      throw new MailError("MAIL_STATE_NOT_CONFIRMED", 503, true);
    return "applied";
  }
  async close() {
    /* HTTP has no persistent mailbox session. */
  }
}
