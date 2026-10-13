/** Internal SQL fragment; parameter positions are fixed by the calling query, never request input. */
export function reservedQuotaUsageSql(daily: number, monthly: number): string {
  if (![daily, monthly].every((n) => Number.isInteger(n) && n > 0))
    throw new Error('INVALID_SQL_PARAMETER');
  return `COALESCE((SELECT SUM(CASE q.limit_type
    WHEN 'requests' THEN r.reserved_requests WHEN 'tokens' THEN r.reserved_tokens WHEN 'cost' THEN r.reserved_cost END)
    FROM ai_usage_reservations r WHERE r.status IN ('reserved', 'pending')
    AND (CASE q.period WHEN 'daily' THEN r.daily_key ELSE r.monthly_key END) = (CASE q.period WHEN 'daily' THEN $${daily} ELSE $${monthly} END)
    AND (q.layer = 'global' OR (q.layer = 'service' AND r.service_key = q.layer_key)
      OR (q.layer = 'scope' AND r.scope = q.layer_key) OR (q.layer = 'user' AND r.user_id = q.layer_key))), 0)`;
}
