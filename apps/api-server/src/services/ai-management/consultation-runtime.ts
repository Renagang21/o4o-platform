import { z } from 'zod';

/** Part of the existing model-control document, not a second registry. */
export const consultationRuntimeSchema = z.object({
  recognition: z.enum(['browser', 'google-cloud']).default('browser'),
  translation: z.enum(['policy', 'google-cloud']).default('policy'),
  synthesis: z.enum(['browser', 'google-cloud']).default('browser'),
  detectLanguage: z.boolean().default(true),
  speechLanguages: z.array(z.enum(['ko', 'en', 'zh', 'ja', 'vi', 'th', 'id'])).min(1).max(3)
    .refine(values => new Set(values).size === values.length).default(['ko', 'en', 'zh']),
}).strict();
export type ConsultationRuntime = z.infer<typeof consultationRuntimeSchema>;
