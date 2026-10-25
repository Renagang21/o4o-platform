import { z } from "zod";

const id = z.string().uuid();
const short = z.string().trim().min(1).max(250);
const content = z.string().trim().min(1).max(20000);
const url = z
  .string()
  .max(4000)
  .refine((value) => {
    if (!value) return true;
    try {
      const u = new URL(value);
      return (
        ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
      );
    } catch {
      return false;
    }
  });
const requiredUrl = url.refine((value) => value.length > 0);
const channel = z.enum([
  "인스타그램",
  "유튜브",
  "틱톡",
  "페이스북",
  "카카오톡",
  "왓츠앱",
  "라인",
  "기타",
]);
const record = { id, createdAt: z.string().datetime({ offset: true }) };
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const d = new Date(`${value}T00:00:00Z`);
    return (
      Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value
    );
  });
export const workspaceSchema = z
  .object({
    version: z.literal(1),
    proposals: z
      .array(
        z
          .object({
            ...record,
            title: short,
            business: short,
            category: short,
            channel,
            description: content,
            destination: requiredUrl,
            contact: url,
          })
          .strict(),
      )
      .max(5000),
    creators: z
      .array(
        z
          .object({
            ...record,
            name: short,
            channel,
            topic: content,
            portfolio: url,
            channelProfiles: z
              .array(z.object({ channel, url: requiredUrl }).strict())
              .max(12)
              .optional(),
            language: z.string().max(100).optional(),
            region: z.string().max(100).optional(),
          })
          .strict(),
      )
      .max(5000),
    assets: z
      .array(
        z
          .object({
            ...record,
            title: short,
            business: short,
            channel,
            content,
            url,
            usage: content,
            folder: z.string().max(100).optional(),
            tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
            isTemplate: z.boolean().optional(),
          })
          .strict(),
      )
      .max(5000),
    activities: z
      .array(
        z
          .object({
            ...record,
            proposalId: id,
            creatorId: id,
            url: requiredUrl,
            publishedAt: date,
            assetId: id.nullable().optional(),
            metrics: z
              .object({
                likes: z
                  .number()
                  .int()
                  .min(0)
                  .max(Number.MAX_SAFE_INTEGER)
                  .nullable(),
                comments: z
                  .number()
                  .int()
                  .min(0)
                  .max(Number.MAX_SAFE_INTEGER)
                  .nullable(),
                shares: z
                  .number()
                  .int()
                  .min(0)
                  .max(Number.MAX_SAFE_INTEGER)
                  .nullable(),
                source: z.enum(["manual", "import"]),
              })
              .strict()
              .optional(),
            views: z
              .number()
              .int()
              .min(0)
              .max(Number.MAX_SAFE_INTEGER)
              .nullable(),
          })
          .strict(),
      )
      .max(5000),
    settlements: z
      .array(
        z
          .object({
            ...record,
            proposalId: id,
            creatorId: id,
            memo: short,
            amount: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
            status: z.enum(["recorded", "paid"]),
            paidAt: z.string().datetime({ offset: true }).nullable(),
            dueDate: date.nullable().optional(),
            externalReference: z.string().max(250).optional(),
          })
          .strict(),
      )
      .max(5000),
  })
  .strict()
  .superRefine((w, ctx) => {
    for (const rows of [
      w.proposals,
      w.creators,
      w.assets,
      w.activities,
      w.settlements,
    ]) {
      if (new Set(rows.map((row) => row.id)).size !== rows.length)
        ctx.addIssue({ code: "custom", message: "DUPLICATE_ID" });
    }
    const proposals = new Set(w.proposals.map((p) => p.id)),
      creators = new Set(w.creators.map((c) => c.id));
    for (const row of [...w.activities, ...w.settlements]) {
      if (!proposals.has(row.proposalId) || !creators.has(row.creatorId))
        ctx.addIssue({ code: "custom", message: "INVALID_REFERENCE" });
    }
    for (const s of w.settlements) {
      if ((s.status === "paid") !== (s.paidAt !== null))
        ctx.addIssue({ code: "custom", message: "INVALID_PAYMENT_RECORD" });
    }
    const assets = new Set(w.assets.map((a) => a.id));
    for (const a of w.activities)
      if (a.assetId && !assets.has(a.assetId))
        ctx.addIssue({ code: "custom", message: "INVALID_ASSET_REFERENCE" });
  });
export type PartnerWorkspace = z.infer<typeof workspaceSchema>;
export const emptyPartnerWorkspace = (): PartnerWorkspace => ({
  version: 1,
  proposals: [],
  creators: [],
  assets: [],
  activities: [],
  settlements: [],
});
export const saveSchema = z
  .object({
    revision: z.number().int().min(0).max(2147483646),
    workspace: workspaceSchema,
  })
  .strict();
export const createSpaceSchema = z.object({ name: short }).strict();
export const inviteSchema = z
  .object({ role: z.enum(["editor", "viewer"]) })
  .strict();
export const joinSchema = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
export const uuidSchema = id;
