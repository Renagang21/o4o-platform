/**
 * WO-O4O-OTC-EASY-DRUG-READY-OROMUCOSAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1 — 완료율 갱신 근거 census(na)
 *
 * read-only. READY 1,134 V3 트랙 COMPLETE 시점의 authored STORE canonical 실측치를 기록한다.
 * 공식 완료 master 14,442 → 15,576 갱신의 산술 근거(+1,134)를 DB 실측과 함께 남기는 용도.
 *
 * Usage(apps/api-server): npx tsx src/scripts/otc-v3-ready-1134-completion-basis-census.na.ts [--port 5470]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const CWD = process.cwd();
const readPw = (): string => readFileSync(path.resolve(CWD, '.env'), 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const port = (): number => { const a = arg('--port'); return a ? parseInt(a, 10) : 5470; };

async function main(): Promise<void> {
  const ledger = JSON.parse(readFileSync(path.resolve(CWD, 'src/scripts/data/otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json'), 'utf8'));
  const trackIds = [...new Set(ledger.units.flatMap((u: any) => u.masterIds))] as string[];
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: port(), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 } });
  await ds.initialize();
  try {
    const r = (await ds.query(`SELECT
      (SELECT count(DISTINCT master_id)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND deleted_at IS NULL) "authoredKoCanonicalMasters",
      (SELECT count(DISTINCT master_id)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND language='en' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND deleted_at IS NULL) "authoredEnCanonicalMasters",
      (SELECT count(DISTINCT master_id)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND source_type='mfds_easy_drug' AND deleted_at IS NULL) "easyKoCanonicalMasters",
      (SELECT count(DISTINCT master_id)::int FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND deleted_at IS NULL) "trackAuthoredKoMasters"
      `, [trackIds]))[0];
    const out = {
      wo: 'WO-O4O-OTC-EASY-DRUG-READY-OROMUCOSAL-UNIT1-CONTENT-FP-V3-FINAL-PRODUCTION-V1',
      trackMasters: trackIds.length,
      measured: r,
      officialCompletionUpdate: {
        before: 14442, delta: r.trackAuthoredKoMasters, after: 14442 + r.trackAuthoredKoMasters,
        denominator: 19385, rate: `${(((14442 + r.trackAuthoredKoMasters) / 19385) * 100).toFixed(2)}%`,
        basis: 'READY 1,134 V3 트랙 전량이 mfds_easy_drug canonical → authored(mfds_drug_otc) canonical 로 교체 완료(easy 잔존 0). delta = 트랙 authored KO canonical 실측 master 수',
      },
    };
    console.log(JSON.stringify(out, null, 2));
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
