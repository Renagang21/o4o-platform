import { z } from 'zod';
export const RENEWAL = 'product_description_renewal';
export const BULK = 'product_correction_bulk';
export const POPULATION = 'product_correction_population';
export const SCHEDULE = 'product_correction_schedule';
export const NOTICE = 'product_correction_notice';
export const renewalKey = (id: string) => `product-correction:renewal:${id}`;
export const bulkKey = (id: string) => `product-correction:bulk:${id}`;
export const populationKey = (id: string) => `product-correction:population:${id}`;
export const scheduleKey = (id: string) => `product-correction:schedule:${id}`;
export const noticeKey = (id: string) => `product-correction:notice:${id}`;
export const bulkSchema = z
  .object({
    ruleId: z.string().uuid(),
    revision: z.number().int().positive(),
    search: z.string().trim().max(120).default(''),
  })
  .strict();
export const controlSchema = z
  .object({ revision: z.number().int().positive(), action: z.enum(['pause', 'resume', 'cancel']) })
  .strict();
export const scheduleSchema = z
  .object({
    revision: z.number().int().min(0),
    enabled: z.boolean(),
    intervalDays: z.number().int().min(1).max(365),
    timeZone: z.literal('Asia/Seoul'),
    nextDueAt: z.string().datetime(),
  })
  .strict();
export const renewalSchema = z
  .object({
    revision: z.number().int().positive(),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    state: z.enum(['pending', 'in_progress', 'done', 'excluded']),
    purposes: z
      .array(z.enum(['professional', 'ai-support', 'consumer-qr']))
      .min(1)
      .max(3),
    notes: z.string().trim().min(1).max(8000),
  })
  .strict();
