import type { RequestHandler } from 'express';

const retiredKeys = new Set(['pharmacy-hub', 'pharmacy-hub-event-offer']);
const scopeFields = ['serviceKey', 'service_key', 'serviceCode', 'service_code', 'sourceService'] as const;
const isRetired = (value: unknown): boolean =>
  typeof value === 'string' ? retiredKeys.has(value) : Array.isArray(value) && value.some(isRetired);

/** Fail closed before removed keys can become a service-neutral API request. */
export const rejectRetiredService: RequestHandler = (req, res, next) => {
  const pathHasRetiredKey = req.path.split('/').some(part => {
    try { return retiredKeys.has(decodeURIComponent(part)); } catch { return false; }
  });
  if (pathHasRetiredKey || scopeFields.some(key => isRetired(req.query[key]) || isRetired(req.body?.[key]))) {
    res.status(410).json({ success: false, code: 'SERVICE_RETIRED' });
    return;
  }
  next();
};
