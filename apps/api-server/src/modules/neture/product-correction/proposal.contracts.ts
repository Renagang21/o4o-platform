import { z } from 'zod';

export const correctionField = z.enum([
  'name',
  'brandName',
  'specification',
  'originCountry',
  'tags',
  'descriptionContent',
]);
export const proposalSchema = z
  .object({
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    evidence: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            kind: z.enum(['product-fact', 'professional-reference']),
            source: z.string().trim().min(1).max(2000),
            checkedOn: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/)
              .refine((v) => {
                const date = new Date(`${v}T00:00:00Z`);
                return (
                  !Number.isNaN(date.getTime()) &&
                  date.toISOString().slice(0, 10) === v &&
                  v <=
                    new Date().toLocaleDateString('en-CA', {
                      timeZone: 'Asia/Seoul',
                    })
                );
              }, '확인일을 확인하세요'),
            fields: z.array(correctionField).min(1).max(6),
            status: z.enum(['confirmed', 'unconfirmed']),
          })
          .strict(),
      )
      .min(1)
      .max(30),
    changes: z
      .array(
        z
          .object({
            field: correctionField,
            after: z.union([
              z.string().max(200000),
              z.array(z.string().trim().min(1).max(100)).max(30),
              z.null(),
            ]),
            reason: z.string().trim().min(1).max(2000),
            evidenceIds: z.array(z.string().uuid()).min(1).max(30),
          })
          .strict(),
      )
      .min(1)
      .max(6),
  })
  .strict();
export const reviewSchema = z
  .object({
    revision: z.number().int().positive(),
    note: z.string().trim().min(1).max(2000),
    decisions: z
      .array(
        z
          .object({
            field: correctionField,
            decision: z.enum(['approved', 'rejected']),
          })
          .strict(),
      )
      .min(1)
      .max(6),
  })
  .strict();
export const applySchema = z
  .object({
    revision: z.number().int().positive(),
    fields: z.array(correctionField).min(1).max(6),
  })
  .strict();
export const PROPOSAL_TYPE = 'product_correction_proposal';
export const PROPOSAL_VERSION_TYPE = 'product_correction_proposal_version';
export const proposalKey = (id: string) => `product-correction:proposal:${id}`;
