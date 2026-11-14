import { createHash } from "node:crypto";
import { z } from "zod";

/** Pure preparation only. No database, provider, product promotion or authorization. */
const text = z
  .string()
  .min(1)
  .max(500)
  .refine((v) => v.trim().length > 0);
const decimal = z.string().regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/);
const signedDecimal = z.string().regex(/^-?(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const parsed = new Date(v + "T00:00:00Z");
    return (
      Number.isFinite(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === v
    );
  });
const rowSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
    rawText: text,
    productName: text.nullable(),
    supplierProductCode: text.nullable(),
    barcode: text.nullable(),
    manufacturer: text.nullable(),
    packageText: text.nullable(),
    quantity: decimal.nullable(),
    unit: text.nullable(),
    unitPrice: decimal.nullable(),
    amount: decimal.nullable(),
    amountAdjustment: signedDecimal.default("0"),
    adjustmentReason: text.nullable().default(null),
    lotNumber: text.nullable(),
    expiresOn: date.nullable(),
  })
  .strict();
export const photoInvoiceSchema = z
  .object({
    documentType: z.enum(["purchase", "return"]),
    sellerName: text.nullable(),
    sellerBusinessNumber: z
      .string()
      .regex(/^\d{10}$/)
      .nullable(),
    buyerBusinessNumber: z
      .string()
      .regex(/^\d{10}$/)
      .nullable(),
    documentNumber: text.nullable(),
    issuedOn: date.nullable(),
    currency: z.literal("KRW"),
    taxTreatment: z.enum(["included", "excluded", "exempt", "unknown"]),
    statedLineTotal: decimal.nullable(),
    rows: z.array(rowSchema).min(1).max(500),
    // Exact paths requiring clarification. Optional values may remain null.
    unresolved: z.array(z.string().min(1).max(150)).max(3000),
  })
  .strict()
  .superRefine((doc, ctx) => {
    const ids = new Set<string>();
    doc.rows.forEach((row, index) => {
      if (ids.has(row.id))
        ctx.addIssue({
          code: "custom",
          path: ["rows", index, "id"],
          message: "DUPLICATE_ROW_ID",
        });
      ids.add(row.id);
    });
    const paths = new Set([
      "sellerName",
      "sellerBusinessNumber",
      "buyerBusinessNumber",
      "documentNumber",
      "issuedOn",
      "statedLineTotal",
      "taxTreatment",
    ]);
    doc.rows.forEach((row) =>
      Object.keys(row)
        .filter((key) => key !== "id")
        .forEach((key) => paths.add(`rows.${row.id}.${key}`)),
    );
    for (const path of doc.unresolved)
      if (!paths.has(path))
        ctx.addIssue({
          code: "custom",
          path: ["unresolved"],
          message: "INVALID_FIELD_PATH",
        });
  });
export type PhotoInvoice = z.infer<typeof photoInvoiceSchema>;
export const photoSourcesSchema = z
  .array(
    z
      .object({
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        page: z.number().int().min(1).max(500),
      })
      .strict(),
  )
  .min(0)
  .max(500)
  .superRefine((sources, ctx) => {
    if (new Set(sources.map((s) => s.page)).size !== sources.length)
      ctx.addIssue({ code: "custom", message: "DUPLICATE_PAGE" });
  });
export type PhotoSources = z.infer<typeof photoSourcesSchema>;
export interface InvoiceIssue {
  path: string;
  code:
    | "REQUIRED"
    | "UNRESOLVED"
    | "ZERO_QUANTITY"
    | "LINE_AMOUNT_MISMATCH"
    | "TOTAL_MISMATCH";
}
const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const scale = 1000000n;
function units(value: string): bigint {
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = (negative ? value.slice(1) : value).split(".");
  return (
    (BigInt(whole) * scale + BigInt(fraction.padEnd(6, "0"))) *
    (negative ? -1n : 1n)
  );
}
function render(value: bigint): string {
  const fraction = String(value % scale)
    .padStart(6, "0")
    .replace(/0+$/, "");
  return String(value / scale) + (fraction ? "." + fraction : "");
}
function sortedSources(raw: unknown): PhotoSources {
  return photoSourcesSchema.parse(raw).sort((a, b) => a.page - b.page);
}

/** Sources must come from verified uploaded bytes, never a model-supplied claim. */
export function inspectPhotoInvoice(raw: unknown, sourceInput: unknown) {
  const invoice = photoInvoiceSchema.parse(raw);
  const sources = sortedSources(sourceInput);
  const requiredPaths = new Set([
    ...invoice.rows.map((row) => `rows.${row.id}.amountAdjustment`),
    "sellerName",
    "issuedOn",
    ...invoice.rows.flatMap((row) =>
      ["productName", "quantity", "unit", "amount"].map(
        (key) => `rows.${row.id}.${key}`,
      ),
    ),
  ]);
  const issues: InvoiceIssue[] = invoice.unresolved
    .filter((path) => requiredPaths.has(path))
    .map((path) => ({ path, code: "UNRESOLVED" }));
  const warnings = invoice.unresolved
    .filter((path) => !requiredPaths.has(path))
    .map((path) => ({ path, code: "UNRESOLVED" as const }));
  for (const key of ["sellerName", "issuedOn"] as const)
    if (invoice[key] === null) issues.push({ path: key, code: "REQUIRED" });
  let sum = 0n;
  let complete = true;
  for (const row of invoice.rows) {
    if (units(row.amountAdjustment) !== 0n && !row.adjustmentReason)
      issues.push({
        path: `rows.${row.id}.adjustmentReason`,
        code: "REQUIRED",
      });
    for (const key of ["productName", "quantity", "unit", "amount"] as const)
      if (row[key] === null)
        issues.push({ path: `rows.${row.id}.${key}`, code: "REQUIRED" });
    if (row.quantity !== null && units(row.quantity) === 0n)
      issues.push({ path: `rows.${row.id}.quantity`, code: "ZERO_QUANTITY" });
    if (
      row.quantity !== null &&
      row.unitPrice !== null &&
      !invoice.unresolved.includes(`rows.${row.id}.unitPrice`) &&
      row.amount !== null &&
      units(row.quantity) * units(row.unitPrice) +
        units(row.amountAdjustment) * scale !==
        units(row.amount) * scale
    ) {
      issues.push({
        path: `rows.${row.id}.amount`,
        code: "LINE_AMOUNT_MISMATCH",
      });
    }
    if (
      row.amount === null ||
      invoice.unresolved.includes(`rows.${row.id}.amount`)
    )
      complete = false;
    else sum += units(row.amount);
  }
  const lineTotal = complete ? render(sum) : null;
  if (
    lineTotal !== null &&
    invoice.statedLineTotal !== null &&
    !invoice.unresolved.includes("statedLineTotal") &&
    units(lineTotal) !== units(invoice.statedLineTotal)
  )
    issues.push({ path: "statedLineTotal", code: "TOTAL_MISMATCH" });
  return {
    invoice,
    sources,
    revision: hash({ invoice, sources }),
    issues,
    warnings,
    lineTotal,
    knownLineSubtotal: render(sum),
    readyForConfirmation: issues.length === 0,
  };
}

/** Hints for a repository duplicate query; never grounds for automatic deletion/merging.
 * ownerKey is resolved by the authenticated adapter. Images and external program
 * exports still need reconciliation even if they have different fingerprints.
 */
export function invoiceDuplicateHints(
  ownerKey: string,
  raw: unknown,
  sourceInput: unknown,
) {
  if (!ownerKey.trim()) throw new Error("INVOICE_OWNER_REQUIRED");
  const { invoice, sources } = inspectPhotoInvoice(raw, sourceInput);
  return {
    photoFingerprint: sources.length
      ? hash([ownerKey, [...new Set(sources.map((s) => s.sha256))].sort()])
      : null,
    documentFingerprint:
      invoice.sellerBusinessNumber &&
      invoice.buyerBusinessNumber &&
      invoice.documentNumber &&
      invoice.issuedOn &&
      !invoice.unresolved.some((path) =>
        [
          "sellerBusinessNumber",
          "buyerBusinessNumber",
          "documentNumber",
          "issuedOn",
        ].includes(path),
      )
        ? hash([
            ownerKey,
            invoice.documentType,
            invoice.sellerBusinessNumber,
            invoice.buyerBusinessNumber,
            invoice.documentNumber,
            invoice.issuedOn,
          ])
        : null,
    contentFingerprint: hash([
      ownerKey,
      invoice.documentType,
      invoice.sellerName?.trim().replace(/\s+/g, " "),
      invoice.sellerBusinessNumber,
      invoice.buyerBusinessNumber,
      invoice.documentNumber,
      invoice.issuedOn,
      invoice.rows
        .map((row) => [
          row.productName?.trim(),
          row.supplierProductCode,
          row.packageText,
          row.unit,
          row.quantity === null ? null : render(units(row.quantity)),
          row.amount === null ? null : render(units(row.amount)),
        ])
        .sort((a, b) =>
          JSON.stringify(a) < JSON.stringify(b)
            ? -1
            : JSON.stringify(a) > JSON.stringify(b)
              ? 1
              : 0,
        ),
    ]),
    needsDuplicateReview: true as const,
  };
}

/** Server-facing preparation, NOT an approval endpoint or persistent transaction.
 * The future adapter must load the current draft, authenticate actor/owner, verify
 * the user's confirmation and atomically store the receipt plus review candidates.
 */
export function preparePhotoInvoiceConfirmation(
  raw: unknown,
  sourceInput: unknown,
  expectedRevision: string,
) {
  const result = inspectPhotoInvoice(raw, sourceInput);
  if (expectedRevision !== result.revision)
    throw new Error("INVOICE_REVISION_CONFLICT");
  if (!result.readyForConfirmation) throw new Error("INVOICE_REVIEW_REQUIRED");
  return {
    ...result,
    productReviewCandidates: result.invoice.rows.map((row) => ({
      source: "invoice_photo" as const,
      sourceRevision: result.revision,
      rowId: row.id,
      rawProductName: row.productName!,
      rawSupplierProductCode: row.supplierProductCode,
      rawBarcode: row.barcode,
      rawPackageText: row.packageText,
      rawManufacturer: row.manufacturer,
      unresolvedFields: result.invoice.unresolved
        .filter((path) => path.startsWith(`rows.${row.id}.`))
        .map((path) => path.slice(`rows.${row.id}.`.length)),
      reviewStatus: "pending" as const,
    })),
  };
}
