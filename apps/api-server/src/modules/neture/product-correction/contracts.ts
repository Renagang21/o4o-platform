import { z } from 'zod';
import type { ProductCorrectionRuleInput } from '@o4o/types';

export class CorrectionError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export const ruleSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    instructions: z.string().trim().min(1).max(8000),
    purpose: z.enum(['professional', 'ai-support', 'consumer-qr']),
    regulatoryTypes: z
      .array(
        z
          .string()
          .trim()
          .regex(/^[A-Za-z0-9_-]{1,50}$/),
      )
      .max(12),
    descriptionType: z.enum(['STORE', 'B2B', 'B2C', 'SUPPLIER_STORE']),
    language: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
    cadenceDays: z.number().int().min(1).max(3650),
    enabled: z.boolean(),
    check: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('missing_field'),
          field: z.enum(['manufacturer_name', 'specification', 'barcode']),
        })
        .strict(),
      z.object({ kind: z.literal('missing_description') }).strict(),
      z.object({ kind: z.literal('stale_description'), days: z.number().int().min(1).max(3650) }).strict(),
      z
        .object({
          kind: z.literal('text'),
          terms: z.array(z.string().trim().min(1).max(100)).min(1).max(8),
          match: z.enum(['any', 'all']),
        })
        .strict(),
      z.object({ kind: z.literal('copied_b2b') }).strict(),
      z.object({ kind: z.literal('manual') }).strict(),
    ]),
  })
  .strict();
export const previewSchema = z
  .object({
    search: z.string().trim().max(120).default(''),
    page: z.number().int().min(1).max(10000).default(1),
  })
  .strict();
export const batchSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    ruleId: z.string().uuid(),
    ruleRevision: z.number().int().positive(),
    scope: previewSchema,
    selected: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
            runId: z.string().uuid().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();
export const taskSchema = z
  .object({
    revision: z.number().int().positive(),
    state: z.enum([
      'pending',
      'in_progress',
      'needs_source',
      'review_ready',
      'deferred',
      'no_change',
      'reviewed',
      'excluded',
    ]),
    followUpAt: z.string().datetime().nullable().optional(),
    draft: z.string().max(30000),
    notes: z.string().max(8000),
    sources: z.string().max(8000),
  })
  .strict()
  .refine(
    (v) =>
      !['review_ready', 'reviewed'].includes(v.state) ||
      Boolean(v.draft.trim() && v.notes.trim() && v.sources.trim()),
    {
      message: '검토 대기는 초안·검토 메모·근거가 필요합니다',
    },
  )
  .refine(
    (v) => !['no_change', 'excluded'].includes(v.state) || Boolean(v.notes.trim() && v.sources.trim()),
    { message: '종료에는 검토 메모와 근거가 필요합니다' },
  )
  .refine((v) => !['needs_source', 'deferred'].includes(v.state) || Boolean(v.notes.trim() && v.followUpAt), {
    message: '대기·보류에는 사유와 재확인일이 필요합니다',
  });
export function parseRule(input: unknown): ProductCorrectionRuleInput {
  return ruleSchema.parse(input) as ProductCorrectionRuleInput;
}
export const RULE_TYPE = 'product_correction_rule';
export const VERSION_TYPE = 'product_correction_version';
export const BATCH_TYPE = 'product_correction_batch';
export const ruleKey = (id: string) => `product-correction:rule:${id}`;
export const batchKey = (id: string) => `product-correction:batch:${id}`;
export const versionKey = (id: string, revision: number) => `product-correction:version:${id}:${revision}`;

export const RUN_TYPE = 'product_correction_run';
export const TASK_VERSION_TYPE = 'product_correction_task_version';
export const runKey = (id: string) => `product-correction:run:${id}`;
export const taskVersionKey = (id: string, revision: number) =>
  `product-correction:task-version:${id}:${revision}`;
export const CLOSED_STATES = ['no_change', 'reviewed', 'excluded'];
