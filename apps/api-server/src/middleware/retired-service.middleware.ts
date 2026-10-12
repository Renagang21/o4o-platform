import type { RequestHandler } from 'express';

const retiredKeys = new Set(['pharmacy-hub', 'pharmacy-hub-event-offer']);
const scopeFields = ['serviceKey', 'service_key', 'serviceCode', 'service_code', 'sourceService',
  'targetServiceKey', 'sourceServiceKey', 'serviceKeys', 'service_keys', 'role', 'roles'] as const;
export function isRetiredServiceValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(isRetiredServiceValue);
  if (typeof value !== 'string') return false;
  const key = value.trim();
  return retiredKeys.has(key) || key.startsWith('pharmacy-hub:');
}

/** Fail closed before removed keys can become a service-neutral API request. */
export const rejectRetiredService: RequestHandler = (req, res, next) => {
  const pathHasRetiredKey = req.path.split('/').some(part => {
    try { return isRetiredServiceValue(decodeURIComponent(part)); } catch { return false; }
  });
  if (pathHasRetiredKey || scopeFields.some(key => isRetiredServiceValue(req.query[key]) || isRetiredServiceValue(req.body?.[key]))) {
    res.status(410).json({ success: false, code: 'SERVICE_RETIRED' });
    return;
  }
  next();
};
