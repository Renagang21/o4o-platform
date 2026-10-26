import { z } from "zod";

export class MailError extends Error {
  constructor(
    readonly code: string,
    readonly status = 400,
    readonly retryable = false,
  ) {
    super(code);
  }
}
export const providers = ["gmail", "naver"] as const;
export const actions = ["keep", "archive", "trash", "important"] as const;
export type MailAction = (typeof actions)[number];
export const categories = [
  "general",
  "work",
  "receipt",
  "promotion",
  "personal",
  "other",
] as const;
export const mailScopes = [
  "o4o:mail:read",
  "o4o:mail:manage",
  "o4o:mail:body",
] as const;
export const uuid = z.string().uuid();
export const senderSchema = z
  .string()
  .trim()
  .email()
  .max(320)
  .transform((v) => v.toLowerCase());
export const selectionSchema = z
  .object({
    accountId: uuid,
    senders: z.array(senderSchema).min(1).max(100),
    action: z.enum(actions).exclude(["keep"]),
    includeImportant: z.boolean().default(false),
    requestId: uuid,
  })
  .strict();
export const ruleSchema = z
  .object({
    accountId: uuid,
    senders: z.array(senderSchema).min(1).max(100),
    action: z.enum(actions),
    category: z.enum(categories).default("general"),
    requestId: uuid,
  })
  .strict();
export const mailToolSchemas = {
  list_mail_accounts: z.object({}).strict(),
  list_mail_senders: z
    .object({
      accountId: uuid,
      page: z.number().int().min(1).max(10000).default(1),
    })
    .strict(),
  list_mail_rules: z.object({ accountId: uuid }).strict(),
  list_mail_messages: z
    .object({
      accountId: uuid,
      sender: senderSchema.optional(),
      page: z.number().int().min(1).max(10000).default(1),
    })
    .strict(),
  get_mail_message: z
    .object({ accountId: uuid, messageId: z.string().min(1).max(500) })
    .strict(),
  prepare_mail_cleanup: selectionSchema,
  prepare_mail_rule: ruleSchema,
  list_mail_jobs: z.object({ accountId: uuid }).strict(),
  get_mail_job: z.object({ accountId: uuid, jobId: uuid }).strict(),
  control_mail_job: z
    .object({
      accountId: uuid,
      jobId: uuid,
      command: z.enum(["pause", "resume", "cancel"]),
    })
    .strict(),
};
export type MailToolName = keyof typeof mailToolSchemas;
export const mailWriteTools = new Set<MailToolName>([
  "prepare_mail_cleanup",
  "prepare_mail_rule",
  "control_mail_job",
]);
export interface MailCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  password?: string;
}
export interface MailAccount {
  id: string;
  user_id: string;
  provider: (typeof providers)[number];
  address: string;
  credential_cipher: string | null;
  state: "active" | "reconnect";
  generation: number;
  sync_cursor: string | null;
  sync_completed_at: Date | null;
  next_sync_at: Date;
}
export interface MessageMeta {
  id: string;
  sender: string;
  receivedAt: Date;
  important: boolean;
  inbox: boolean;
}
export interface ProviderCapabilities {
  archive: boolean;
  trash: boolean;
  important: boolean;
  body: boolean;
}
export interface MailProvider {
  identity(): Promise<string>;
  capabilities(): Promise<ProviderCapabilities>;
  scan(
    cursor: string | null,
  ): Promise<{ messages: MessageMeta[]; cursor: string | null }>;
  read(id: string): Promise<{ subject: string; text: string }>;
  apply(
    id: string,
    action: Exclude<MailAction, "keep">,
    includeImportant: boolean,
  ): Promise<"applied" | "already_applied" | "missing" | "protected">;
  close(): Promise<void>;
}
export const publicMailError = (error: unknown) =>
  error instanceof MailError
    ? error
    : new MailError("MAIL_PROVIDER_UNAVAILABLE", 503, true);
export function normalizeSender(raw: string): string {
  if (typeof raw !== "string") throw new MailError("MAIL_SENDER_INVALID");
  const match = raw.match(/<([^<>]+)>/);
  const parsed = senderSchema.safeParse(match?.[1] ?? raw);
  if (!parsed.success) throw new MailError("MAIL_SENDER_INVALID");
  return parsed.data;
}
