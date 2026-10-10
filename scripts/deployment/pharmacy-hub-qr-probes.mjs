import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const phOrg = `EXISTS (SELECT 1 FROM platform_store_slugs s WHERE s.store_id = q.organization_id AND s.service_key = 'pharmacy-hub' AND s.is_active = true)`;
export const queries = [
  `SELECT '/qr/' || q.slug AS path FROM store_qr_codes q WHERE q.is_active = true AND ${phOrg} ORDER BY q.id LIMIT 1`,
  `SELECT '/tablet/' || s.slug || '?tabletId=' || t.id || '&language=ko' AS path FROM platform_store_slugs s JOIN store_tablets t ON t.organization_id = s.store_id AND t.is_active = true WHERE s.is_active = true AND s.service_key = 'pharmacy-hub' ORDER BY s.id, t.id LIMIT 1`,
  `SELECT '/multilingual-products/' || q.public_key || '?locale=' || p.locale AS path FROM store_multilingual_product_content_groups q JOIN LATERAL (SELECT locale FROM store_multilingual_product_content_pages WHERE group_id = q.id AND status = 'published' ORDER BY is_default DESC, locale LIMIT 1) p ON true WHERE q.public_key IS NOT NULL AND q.status <> 'archived' AND ${phOrg} ORDER BY q.id LIMIT 1`,
  `SELECT '/foreign-visitor/affiliate/' || q.short_code AS path FROM foreign_visitor_partner_qr_codes q WHERE q.service_key = 'pharmacy-hub' AND q.status = 'ACTIVE' AND q.deleted_at IS NULL AND (q.valid_from IS NULL OR q.valid_from <= now()) AND (q.valid_to IS NULL OR q.valid_to >= now()) ORDER BY q.id LIMIT 1`,
];

export function safeInventoryError(error, stage) {
  const allowed = new Set(['28P01', '28000', '42501', '42P01', '42703', '42883', '57014', '53300', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT']);
  const code = allowed.has(error?.code) ? error.code : 'UNKNOWN';
  return new Error(`Read-only QR inventory failed: stage=${stage}; code=${code}. No credentials or row contents logged.`);
}

export function readPassword(run = execFileSync) {
  try {
    return run('gcloud', ['secrets', 'versions', 'access', 'latest', '--secret=o4o-db-password', '--project=netureyoutube'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    throw safeInventoryError(error, 'read-secret');
  }
}

export async function collectProbes(client) {
  const paths = [];
  await client.query('BEGIN READ ONLY');
  let originalError;
  try {
    await client.query("SET LOCAL statement_timeout = '10s'");
    for (const [index, sql] of queries.entries()) {
      let result;
      try {
        result = await client.query(sql);
      } catch (error) {
        throw safeInventoryError(error, `query-${index + 1}`);
      }
      if (result.rows[0]?.path) paths.push(result.rows[0].path);
    }
    return paths;
  } catch (error) {
    originalError = error;
    throw error;
  } finally {
    try {
      await client.query('ROLLBACK');
    } catch (error) {
      if (!originalError) throw safeInventoryError(error, 'rollback');
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Runtime credentials remain in memory; no values or production row contents are logged.
  const require = createRequire(new URL('../../apps/api-server/package.json', import.meta.url));
  const { Client } = require('pg');
  if (!process.env.DB_USERNAME || !process.env.DB_NAME || !process.env.PROBE_OUTPUT) throw new Error('Database configuration or output path is missing.');
  const password = readPassword();
  const client = new Client({ host: '127.0.0.1', port: 55432, user: process.env.DB_USERNAME, database: process.env.DB_NAME, password, connectionTimeoutMillis: 15000, options: '-c default_transaction_read_only=on' });
  let stage = 'connect';
  try {
    await client.connect();
    stage = 'inventory';
    const paths = await collectProbes(client);
    stage = 'write-private-probe-file';
    await writeFile(process.env.PROBE_OUTPUT, paths.join('\n'), { mode: 0o600 });
    console.log(JSON.stringify({ readOnly: true, foundFamilies: paths.length, requiredFamilies: 4 }));
  } catch (error) {
    if (stage === 'inventory' && error.message.startsWith('Read-only QR inventory failed: stage=query-')) throw error;
    throw safeInventoryError(error, stage);
  } finally {
    await client.end();
  }
}
