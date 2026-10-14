/** Validate the operator query before passing UUIDs and offsets to PostgreSQL. */
export const isForumFailureId = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);

export function forumFailureFilters(query: Record<string, unknown>) {
  const { trialId, resolved } = query;
  if (trialId !== undefined && !isForumFailureId(trialId)) return null;
  if (resolved !== undefined && resolved !== 'true' && resolved !== 'false') return null;
  if (['limit', 'page'].some(key => query[key] !== undefined && typeof query[key] !== 'string')) return null;
  const limitValue = query.limit === undefined ? 50 : Number(query.limit);
  const page = query.page === undefined ? 1 : Number(query.page);
  if (!Number.isSafeInteger(limitValue) || limitValue < 1 || !Number.isSafeInteger(page) || page < 1) return null;
  const limit = Math.min(100, limitValue);
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) return null;
  return { trialId, resolved, limit, page, offset };
}
