/** HTTP boundary validation for the existing Core descriptor. Caller authentication and business schema selection stay in each route. */
import type { TargetField, TargetSchema } from './contract.js';

export function validateInjectedTargetSchema(value: unknown): {
  schema: TargetSchema | null;
  code: string | null;
} {
  if (!value || typeof value !== 'object')
    return { schema: null, code: 'TARGET_SCHEMA_REQUIRED' };
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || v.id.trim() === '')
    return { schema: null, code: 'TARGET_SCHEMA_ID_INVALID' };
  if (!Array.isArray(v.fields) || v.fields.length === 0)
    return { schema: null, code: 'TARGET_SCHEMA_FIELDS_INVALID' };
  const fields: TargetField[] = [];
  for (const f of v.fields) {
    if (!f || typeof f !== 'object')
      return { schema: null, code: 'TARGET_SCHEMA_FIELD_INVALID' };
    const fo = f as Record<string, unknown>;
    if (typeof fo.key !== 'string' || fo.key.trim() === '')
      return { schema: null, code: 'TARGET_SCHEMA_FIELD_KEY_INVALID' };
    if (typeof fo.description !== 'string' || fo.description.trim() === '')
      return { schema: null, code: 'TARGET_SCHEMA_FIELD_DESC_INVALID' };
    if (typeof fo.required !== 'boolean')
      return { schema: null, code: 'TARGET_SCHEMA_FIELD_REQUIRED_INVALID' };
    const examples = Array.isArray(fo.examples)
      ? fo.examples.filter((e): e is string => typeof e === 'string')
      : undefined;
    fields.push({
      key: fo.key,
      description: fo.description,
      required: fo.required,
      examples,
    });
  }
  if (!fields.some((f) => f.required))
    return { schema: null, code: 'TARGET_SCHEMA_NO_REQUIRED' };
  return { schema: { id: v.id, fields }, code: null };
}
