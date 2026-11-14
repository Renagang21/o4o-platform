import { z } from "zod";
import { photoInvoiceSchema } from "./photo-invoice.js";
export class LedgerError extends Error {
  constructor(
    readonly code: string,
    readonly status = 400,
  ) {
    super(code);
  }
}
export const ledgerScopes = ["o4o:ledger:read", "o4o:ledger:write"] as const;
const workspaceId = z.string().regex(/^store:[a-f0-9-]{36}$/);
export const prepareInvoiceInput = z
  .object({
    workspaceId,
    invoice: photoInvoiceSchema,
    requestId: z.string().uuid(),
    invoiceId: z.string().uuid().optional(),
    expectedVersion: z.number().int().positive().optional(),
  })
  .strict()
  .refine((v) => Boolean(v.invoiceId) === Boolean(v.expectedVersion), {
    message: "수정에는 현재 버전이 필요합니다.",
  });
// MCP top-level inputs stay ZodObject for .shape; cross-field checks live in the service.
export const ledgerToolSchemas = {
  prepare_transaction_invoice: z
    .object({
      workspaceId,
      invoice: photoInvoiceSchema,
      requestId: z.string().uuid(),
      invoiceId: z.string().uuid().optional(),
      expectedVersion: z.number().int().positive().optional(),
    })
    .strict(),
  get_transaction_invoice: z
    .object({ workspaceId, invoiceId: z.string().uuid() })
    .strict(),
  list_transaction_invoices: z
    .object({
      workspaceId,
      after: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    })
    .strict(),
};
export const imageSchema = z
  .object({
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    base64: z.string().min(1).max(2800000),
  })
  .strict();
export const confirmInvoiceInput = z
  .object({
    expectedVersion: z.number().int().positive(),
    expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
    requestId: z.string().uuid(),
    acknowledgeMissingOriginal: z.boolean().default(false),
    programStatus: z.enum(["unknown", "not_recorded", "recorded_in_program"]),
    duplicateResolution: z.enum(["new", "same_transaction"]).optional(),
    duplicateReason: z.string().trim().min(5).max(500).optional(),
  })
  .strict();
