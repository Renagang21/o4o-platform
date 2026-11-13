import { z } from 'zod';
export const consultationExpressionSchema = z.object({
  tone: z.enum(['neutral','friendly']).default('neutral'),
  formality: z.enum(['polite','plain']).default('polite'),
  length: z.enum(['short','standard']).default('standard'),
}).strict();
export type ConsultationExpression = z.infer<typeof consultationExpressionSchema>;
