/**
 * WO-O4O-OTC-SAFETY-MISMATCH-MAIN-BATCH-APPLY-NA-V4 — read-only 독립검증 (에이전트 나).
 * 명령: npx tsx src/scripts/otc-safety-subgroup-verify-na.ts [--group <unit slug>] [--port <n>] (기본 --all)
 * SELECT 전용. write 0. 포트: --port 우선, 없으면 src/scripts/data/otc-apply-proxy-port.txt (기본 5447).
 * 검증축(unit별): authoredKoCanonical=T · easyDeprecated=T · easyCanonicalLeft=0 · koCanonicalDup=0
 *   · enCanonical=T · enDup=0 · audit(canonical_replaced, source_ref)=T · sourceRef 밖 master write=0.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ENV_CANDIDATES = ['C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env', path.resolve(process.cwd(), '.env')];
const ENV_PATH = ENV_CANDIDATES.find((p) => existsSync(p)) ?? ENV_CANDIDATES[0];
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const AUTHOR_DIR = path.resolve(DATA_DIR, 'otc-safety-subgroup-authoring');
const PORT_FILE = path.resolve(DATA_DIR, 'otc-apply-proxy-port.txt');
const arg = (name: string): string | undefined => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => { const a = arg('--port'); if (a) return parseInt(a, 10); try { return parseInt(readFileSync(PORT_FILE, 'utf8').trim(), 10) || 5447; } catch { return 5447; } }; // --port 우선(공유 port 파일 미변경)

async function main(): Promise<void> {
  const groupSel = arg('--group');
  let units = readdirSync(AUTHOR_DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(path.join(AUTHOR_DIR, f), 'utf8')));
  if (groupSel) units = units.filter((u) => u.slug === groupSel);
  if (!units.length) { console.error('대상 unit 없음'); process.exit(2); }
  units.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.slug < b.slug ? -1 : 1));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: port(), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'] });
  await ds.initialize();
  const agg = { units: 0, masters: 0, pass: 0, fail: 0, pending: 0, failures: [] as string[] };
  try {
    for (const u of units) {
      const M = u.masterIds; const T = M.length; const REF = u.sourceRef;
      const row = (await ds.query(`SELECT
        (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL)) authored_ko,
        (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL)) easy_dep,
        (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.status='canonical' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) easy_left,
        (SELECT count(*)::int FROM (SELECT mid FROM unnest($1::uuid[]) mid WHERE (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)>1) t) ko_dup,
        (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL)=1) en_ok,
        (SELECT count(*)::int FROM unnest($1::uuid[]) mid WHERE (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL)>1) en_dup,
        (SELECT count(*)::int FROM shared_product_description_audit_logs a WHERE a.master_id=ANY($1::uuid[]) AND a.event_type='canonical_replaced' AND (a.metadata->>'source_ref_id')=$2) audit_n,
        (SELECT count(*)::int FROM shared_product_descriptions s WHERE s.source_ref_id=$2::uuid AND s.deleted_at IS NULL AND NOT s.master_id=ANY($1::uuid[])) outside_n
      `, [M, REF]))[0];
      const applied = Number(row.authored_ko) > 0 || Number(row.easy_dep) > 0;
      const ok = Number(row.authored_ko) === T && Number(row.easy_dep) === T && Number(row.easy_left) === 0 && Number(row.ko_dup) === 0 && Number(row.en_ok) === T && Number(row.en_dup) === 0 && Number(row.audit_n) === T && Number(row.outside_n) === 0;
      agg.units += 1; agg.masters += T;
      if (!applied && Number(row.authored_ko) === 0) { agg.pending += 1; console.log(`${u.slug}: PENDING (미반영, T=${T})`); continue; }
      if (ok) { agg.pass += 1; console.log(`${u.slug}: PASS (T=${T} authored=${row.authored_ko} easyDep=${row.easy_dep} en=${row.en_ok} audit=${row.audit_n} dup=${row.ko_dup}/${row.en_dup} outside=${row.outside_n})`); }
      else { agg.fail += 1; agg.failures.push(u.slug); console.log(`${u.slug}: FAIL ${JSON.stringify(row)} (T=${T})`); }
    }
  } finally { await ds.destroy(); }
  console.log('\n=== VERIFY SUMMARY ===\n' + JSON.stringify(agg, null, 2));
  process.exit(agg.fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error('FATAL', e?.message ?? e); process.exit(1); });
