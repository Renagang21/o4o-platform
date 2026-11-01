import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Explicit legacy-to-current identity map; preserve UUIDs, decisions and audit history. */
export function drugstoreIdentity(value: string): string {
  return value
    .replace(/https:\/\/(?:megapharm|magapharm)\.neture\.co\.kr/g, 'https://drugstore.neture.co.kr')
    .replace(/megapharm\.neture\.co\.kr/g, 'drugstore.neture.co.kr')
    .replace(/^megapharm$/, 'drugstore')
    .replace(/^business:megapharm$/, 'business:drugstore')
    .replace(/^neture:megapharm_(admin|operator)$/, 'neture:drugstore_$1')
    .replace(/(\/business(?:es)?\/|\/semi-franchises\/|\/service-contact\/)megapharm(?=[/?#]|$)/g, '$1drugstore')
    .replace(/(?:MegaPharm|(?<!오)메가팜(?:약국)?)(?:\s*[·/]\s*창고형\s*약국)?/g, '드럭스토어형 약국')
    .replace(/창고형\s*약국/g, '드럭스토어형 약국');
}
export function drugstoreJson(value: unknown): unknown {
  if (typeof value === 'string') return drugstoreIdentity(value);
  if (Array.isArray(value)) return value.map(drugstoreJson);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([k,v]) => [drugstoreIdentity(k), drugstoreJson(v)] as const);
    if (new Set(entries.map(([k]) => k)).size !== entries.length) throw new Error('Drugstore JSON identity collision; reviewed reconciliation required');
    return Object.fromEntries(entries);
  }
  return value;
}

// Live routing/configuration only. Financial, consent, security and operation logs remain historical.
const TABLES = [
  'semi_franchises', 'organizations', 'role_assignments', 'roles', 'service_operator_invitations',
  'service_contact_settings', 'contact_inquiries', 'contact_requests', 'notifications', 'forum_notifications',
  'cms_contents', 'forum_category', 'forum_post', 'media_assets', 'platform_services',
  'service_audience_policies', 'service_legal_profiles', 'service_policy_documents',
  'service_memberships', 'organization_service_enrollments', 'organization_channels',
  'signage_media', 'signage_playlists', 'signage_schedules',
];
const SCALARS = ['service_key','serviceKey','business_key','businessKey','community_key','communityKey','scope_key','role','source_path'];
const JSON_COLUMNS = ['metadata','config','permissions','service_keys'];
const quote = (value: string) => '"' + value.replaceAll('"','""') + '"';

export class RenameDrugstoreCooperation1793457683032 implements MigrationInterface {
  name = 'RenameDrugstoreCooperation1793457683032';
  async up(q: QueryRunner): Promise<void> {
    if (!q.isTransactionActive) throw new Error('Drugstore identity transition requires a transaction');
    await q.query('LOCK TABLE semi_franchises IN EXCLUSIVE MODE');
    const existing = await q.query("SELECT id,key FROM semi_franchises WHERE key IN ('megapharm','drugstore') FOR UPDATE");
    if (existing.length > 1) throw new Error('Both legacy and Drugstore businesses exist; reviewed reconciliation required');
    const legacy = existing[0];
    if (legacy) {
      // Organization UUID and all membership/policy/workflow foreign keys remain intact.
      await q.query(`UPDATE organizations SET name=$1,
        code=CASE WHEN code IN ('semi-franchise-megapharm','semi-franchise:megapharm','sf:megapharm') THEN replace(code,'megapharm','drugstore') ELSE code END
        WHERE id=(SELECT organization_id FROM semi_franchises WHERE id=$2)`, ['드럭스토어형 약국',legacy.id]);
      await q.query("UPDATE semi_franchises SET key='drugstore',name=$1,community_key=CASE WHEN community_key='business:megapharm' THEN 'business:drugstore' ELSE community_key END WHERE id=$2", ['드럭스토어형 약국',legacy.id]);
    }
    await q.query("COMMENT ON COLUMN semi_franchises.key IS 'Business identity; drugstore is the drugstore-style pharmacy cooperation key. UUID links and membership decisions are preserved.'");
    const columns: Array<{table_name:string;column_name:string;data_type:string}> = await q.query(
      `SELECT table_name,column_name,data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name=ANY($1) ORDER BY table_name,column_name`, [TABLES]);
    for (const col of columns) {
      const table = 'public.' + quote(col.table_name), field = quote(col.column_name);
      const scalar = SCALARS.includes(col.column_name) ||
        (col.table_name === 'roles' && col.column_name === 'name');
      const json = JSON_COLUMNS.includes(col.column_name) && ['json','jsonb'].includes(col.data_type);
      if (!scalar && !json) continue;
      // Existing schema tables use UUID id. Missing optional tables/columns are deliberately not invented.
      const rows = await q.query(`SELECT id, ${field} AS value FROM ${table} WHERE ${field}::text ~ $1 FOR UPDATE`, ['megapharm|magapharm|MegaPharm|메가팜|창고형']);
      for (const row of rows) {
        const next = json ? drugstoreJson(row.value) : drugstoreIdentity(row.value);
        if (JSON.stringify(next) === JSON.stringify(row.value)) continue;
        await q.query(`UPDATE ${table} SET ${field}=$1${json ? '::'+col.data_type : ''} WHERE id=$2`, [json ? JSON.stringify(next) : next, row.id]);
      }
    }
  }
  async down(): Promise<void> {
    throw new Error('Drugstore identity transition is forward-only; restore requires a reviewed migration');
  }
}
