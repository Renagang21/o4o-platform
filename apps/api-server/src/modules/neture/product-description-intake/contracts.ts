import { createHash } from 'node:crypto';
import { z } from 'zod';
import { hasProductDescriptionText, sanitizeDescriptionHtml } from '../utils/sanitize-description-html.util.js';

export class DescriptionIntakeError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}

/** Preserve the UTF-16 binary ordering used by existing fingerprints, independently of server locale. */
export function compareDescriptionKeys(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
function isRawGs1(value: string): boolean {
  // ASCII 29 is the GS1 group separator; keep it out of the regex character set.
  return /^01\d{14}/u.test(value) && (value.length === 16 || /^(17|15|10|21)/u.test(value.slice(16)) || value.charCodeAt(16) === 29);
}

/** GTIN filler zero is removable; a real GTIN-14 packaging indicator is not. */
export function normalizeProductBarcode(raw: string): string | null {
  let value = raw.trim().replace(/^\]d2/, '');
  const bracketed = /^\(01\)(\d{14})(?:$|\()/u.exec(value);
  if (bracketed) value = bracketed[1];
  else if (isRawGs1(value)) value = value.slice(2, 16);
  if (!/^\d+$/.test(value) || ![8, 12, 13, 14].includes(value.length)) return null;
  const digits = [...value].map(Number);
  let sum = digits.pop()!;
  digits.reverse();
  digits.forEach((digit, i) => { sum += digit * (i % 2 === 0 ? 3 : 1); });
  if (sum % 10) return null;
  return value.length === 14 && value.startsWith('0') ? value.slice(1) : value;
}
export function barcodeForms(barcode: string): string[] {
  const key = barcode.padStart(14, '0');
  return [8, 12, 13, 14].map(length => key.slice(-length))
    .filter(value => value.padStart(14, '0') === key && !!normalizeProductBarcode(value));
}
export const descriptionNameKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '');

const reference = z.object({
  url: z.string().max(2048).url().refine(value => {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password;
  }),
  label: z.string().max(400).optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
}).strict();
export const descriptionSourceSchema = z.object({
  kind: z.enum(['government', 'manufacturer', 'user_contribution']),
  currentness: z.enum(['retrieved', 'archived', 'user']),
  checkedOn: z.string().max(40).refine(v => Number.isFinite(Date.parse(v))).nullable().default(null),
  references: z.array(reference).max(20),
}).strict().superRefine((source, ctx) => {
  if (source.kind !== 'user_contribution' && !source.references.length)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'PUBLIC_SOURCE_REQUIRED' });
  if (source.kind === 'government' && source.references.some(r => !new URL(r.url).hostname.endsWith('.go.kr')))
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'GOVERNMENT_SOURCE_REQUIRED' });
});
export const descriptionEntrySchema = z.object({
  key: z.string().trim().min(1).max(240),
  name: z.string().trim().min(1).max(1000),
  manufacturer: z.string().trim().max(255).nullable().default(null),
  category: z.string().trim().max(255).nullable().default(null),
  content: z.string().max(200000),
  summary: z.string().max(4000).nullable().default(null),
  descriptionType: z.enum(['B2B', 'B2C', 'STORE', 'SUPPLIER_STORE']).default('B2B'),
  language: z.enum(['ko', 'en', 'ja', 'zh']).default('ko'),
  barcodes: z.array(z.string().max(128)).max(200).default([]),
  identifiers: z.object({
    mfdsItemSeq: z.string().regex(/^\d{8,20}$/).optional(),
    statementNo: z.string().regex(/^\d{8,20}$/).optional(),
  }).strict().default({}),
  source: descriptionSourceSchema,
}).strict();
export type DescriptionEntry = z.infer<typeof descriptionEntrySchema>;
export const intakeBatchSchema = z.object({ entries: z.array(descriptionEntrySchema).max(20) }).strict();

export function descriptionFingerprint(value: unknown): string {
  function ordered(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(ordered);
    if (input && typeof input === 'object') return Object.fromEntries(Object.keys(input).sort(compareDescriptionKeys).map(key => [key, ordered((input as Record<string, unknown>)[key])]));
    return input;
  }
  return createHash('sha256').update(JSON.stringify(ordered(value))).digest('hex');
}

export function prepareDescriptionEntries(raw: unknown): { entries: DescriptionEntry[]; excludedEmpty: number } {
  const parsed = intakeBatchSchema.safeParse(raw);
  if (!parsed.success) throw new DescriptionIntakeError('INVALID_DESCRIPTION_BATCH');
  let excludedEmpty = 0;
  const entries: DescriptionEntry[] = [];
  for (const input of parsed.data.entries) {
    const content = sanitizeDescriptionHtml(input.content);
    if (!hasProductDescriptionText(content)) { excludedEmpty++; continue; }
    const codes = input.barcodes.map(normalizeProductBarcode);
    if (codes.some(code => !code)) throw new DescriptionIntakeError('INVALID_BARCODE');
    entries.push({ ...input, content, summary: input.summary ? sanitizeDescriptionHtml(input.summary) || null : null,
      barcodes: [...new Set(codes as string[])].sort(compareDescriptionKeys),
      source: { ...input.source, references: [...input.source.references].sort((a, b) => a.url.localeCompare(b.url)) },
    });
  }
  return { entries, excludedEmpty };
}

export type CanonicalView = { id: string; content: string; summary: string | null; updatedAt: string | Date };
export const canonicalRevision = (value: CanonicalView | null) => value ? descriptionFingerprint({
  id: value.id, content: value.content, summary: value.summary ?? null, updatedAt: new Date(value.updatedAt).toISOString(),
}) : null;
