// Roles and canonical service keys are supplied by the existing server catalog/mapper.
const count = value => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('OPERATOR_CENSUS_RESULT_INVALID');
  return value;
};
export async function collectOperatorCensus(client, identityFingerprint, catalogRoles, serviceKeys) {
  if (!/^[a-f0-9]{64}$/.test(identityFingerprint) || !Array.isArray(catalogRoles) || catalogRoles.length === 0 ||
      catalogRoles.length > 50 || catalogRoles.some(role => !/^[a-z][a-z0-9-]*:(admin|operator)$/.test(role)) ||
      !Array.isArray(serviceKeys) || serviceKeys.length === 0 || serviceKeys.length > 20 ||
      serviceKeys.some(key => !/^[a-z][a-z0-9-]{0,40}$/.test(key))) {
    throw new Error('OPERATOR_CENSUS_INPUT_INVALID');
  }
  const target = `WITH target AS (
    SELECT id,status,"isActive" FROM users
    WHERE encode(sha256(convert_to(lower(btrim(email)), 'UTF8')), 'hex')=$1
  )`;
  const current = `(ra.is_active AND (ra.valid_from IS NULL OR ra.valid_from<=CURRENT_TIMESTAMP) AND
    (ra.valid_until IS NULL OR ra.valid_until>=CURRENT_TIMESTAMP))`;
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  let census, failure;
  try {
    await client.query("SET LOCAL statement_timeout='15s'");
    const accountRow = (await client.query(`${target}
      SELECT count(*)::int AS matched_accounts,
        count(*) FILTER (WHERE "isActive" AND status IN ('active','approved'))::int AS active_accounts,
        (SELECT count(*)::int FROM linked_accounts la JOIN target t ON t.id=la."userId"
          WHERE la.provider='google') AS google_links,
        (SELECT count(*)::int FROM role_assignments ra JOIN target t ON t.id=ra.user_id
          WHERE ra.role='platform:super_admin' AND ${current}) AS platform_admin_assignments
      FROM target`, [identityFingerprint])).rows[0];
    const account = {
      matched_accounts: count(accountRow.matched_accounts),
      active_accounts: count(accountRow.active_accounts),
      google_links: count(accountRow.google_links),
      platform_admin_assignments: count(accountRow.platform_admin_assignments),
    };
    if (account.matched_accounts !== 1) {
      census = { readOnly: true, account, result: account.matched_accounts === 0 ? 'TARGET_NOT_FOUND' : 'TARGET_AMBIGUOUS' };
    } else {
      const roleRows = (await client.query(`${target}
        SELECT ra.role,
          count(*) FILTER (WHERE ra.user_id IN (SELECT id FROM target) AND ${current})::int AS target_current,
          count(*) FILTER (WHERE ra.user_id IN (SELECT id FROM target) AND NOT ra.is_active)::int AS target_inactive,
          count(*) FILTER (WHERE ra.user_id IN (SELECT id FROM target) AND ra.is_active AND ra.valid_from>CURRENT_TIMESTAMP)::int AS target_future,
          count(*) FILTER (WHERE ra.user_id IN (SELECT id FROM target) AND ra.is_active AND ra.valid_until<CURRENT_TIMESTAMP)::int AS target_expired,
          count(DISTINCT ra.user_id) FILTER (WHERE ra.user_id NOT IN (SELECT id FROM target) AND ${current})::int AS other_current_accounts
        FROM role_assignments ra WHERE ra.role=ANY($2) GROUP BY ra.role ORDER BY ra.role`,
        [identityFingerprint, catalogRoles])).rows;
      const roles = roleRows.map(row => {
        if (!catalogRoles.includes(row.role)) throw new Error('OPERATOR_CENSUS_RESULT_INVALID');
        return { role: row.role,
          target_current: count(row.target_current), target_inactive: count(row.target_inactive),
          target_future: count(row.target_future), target_expired: count(row.target_expired),
          other_current_accounts: count(row.other_current_accounts) };
      });
      const membershipRows = (await client.query(`${target}
        SELECT sm.service_key,
          CASE WHEN sm.status IN ('active','pending','suspended','rejected','withdrawn') THEN sm.status ELSE 'unknown' END AS status,
          count(*)::int AS count
        FROM service_memberships sm JOIN target t ON t.id=sm.user_id
        WHERE sm.service_key=ANY($2) GROUP BY sm.service_key,
          CASE WHEN sm.status IN ('active','pending','suspended','rejected','withdrawn') THEN sm.status ELSE 'unknown' END
        ORDER BY sm.service_key,status`, [identityFingerprint, serviceKeys])).rows;
      const memberships = membershipRows.map(row => {
        if (!serviceKeys.includes(row.service_key) || !['active','pending','suspended','rejected','withdrawn','unknown'].includes(row.status)) {
          throw new Error('OPERATOR_CENSUS_RESULT_INVALID');
        }
        return { service_key: row.service_key, status: row.status, count: count(row.count) };
      });
      census = { readOnly: true, account, roles, memberships, result: 'CENSUS_COMPLETE' };
    }
  } catch (error) {
    failure = Object.assign(new Error('OPERATOR_CENSUS_QUERY_FAILED'), {
      code: typeof error?.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code) ? error.code : 'UNKNOWN',
    });
  }
  try { await client.query('ROLLBACK'); } catch { failure ??= new Error('OPERATOR_CENSUS_ROLLBACK_FAILED'); }
  if (failure) throw failure;
  return census;
}
