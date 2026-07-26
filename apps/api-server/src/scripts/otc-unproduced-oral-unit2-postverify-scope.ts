/**
 * WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-FINAL-PRODUCTION-V1 — 범위 사후검증 (read-only)
 *
 * `--verify` 가 Unit 2 대상 1,849 master 내부 정합을 보는 것과 별개로, 본 스크립트는 **범위 밖 무변경**을
 * 확인한다. DB write 0.
 *
 *   1) Unit 2 write 총량 = KO 7,396 + EN 3,698 = 11,094 (apply run 원장 대조)
 *   2) Unit 1 대상 1,850 master 무변경 (KO/EN canonical 1,850 유지 · easy canonical 잔존 0)
 *   3) 선행 외용 LIVE 트랙(final 199m + split 90m) 무변경
 *   4) 빅콘에스600정 HOLD 및 비경구(라 회수 대상 포함) write 0 — authored 행 부재 확인
 *
 * Usage(apps/api-server): tsx src/scripts/otc-unproduced-oral-unit2-postverify-scope.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];
const AUTHORED_SOURCE = 'mfds_drug_otc';

async function connect(): Promise<any> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'],
  });
  await ds.initialize();
  return ds;
}

function idsOf(file: string, pick: (j: any) => string[]): string[] {
  const j = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  return [...new Set(pick(j))].sort();
}

async function main(): Promise<void> {
  const koRun = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-unproduced-oral-unit2-apply-run.ko.json'), 'utf8'));
  const enRun = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-unproduced-oral-unit2-apply-run.en.json'), 'utf8'));

  const u2 = idsOf('otc-unproduced-oral-unit2-approved-ssot-v1.json', (j) => j.groups.flatMap((g: any) => g.masterIds));
  const u1 = idsOf('otc-unproduced-oral-unit1-approved-ssot-v1.json', (j) => j.groups.flatMap((g: any) => g.masterIds));
  const fin = idsOf('otc-external-site-final-approved-ssot-v1.json', (j) => j.masters.map((m: any) => m.masterId));
  const spl = idsOf('otc-external-site-split-final-approved-ssot-v1.json', (j) => j.groups.flatMap((g: any) => g.masterIds));

  const ds = await connect();
  const count = async (ids: string[], lang: 'ko' | 'en'): Promise<number> => {
    if (!ids.length) return 0;
    const r = retRows<{ n: string }>(await ds.query(
      `SELECT count(DISTINCT master_id)::text n FROM shared_product_descriptions
       WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
         AND source_type=$2 AND deleted_at IS NULL
         AND ${lang === 'ko' ? `COALESCE(language,'ko')='ko'` : `language='en'`}`, [ids, AUTHORED_SOURCE]));
    return +r[0].n;
  };
  const u1Ko = await count(u1, 'ko'); const u1En = await count(u1, 'en');
  const u1Easy = retRows<{ n: string }>(await ds.query(
    `SELECT count(*)::text n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[])
       AND description_type='STORE' AND status='canonical' AND source_type='mfds_easy_drug'
       AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`, [u1]));
  const finKo = await count(fin, 'ko'); const finEn = await count(fin, 'en');
  const splKo = await count(spl, 'ko'); const splEn = await count(spl, 'en');

  // 빅콘에스600정 — HOLD 유지 대상. authored 행이 단 1건도 없어야 한다.
  const hold = retRows<{ n: string; a: string }>(await ds.query(
    `SELECT count(*)::text n,
            count(*) FILTER (WHERE s.source_type=$1)::text a
     FROM product_masters pm
     JOIN shared_product_descriptions s ON s.master_id=pm.id AND s.deleted_at IS NULL
     WHERE pm.name LIKE '%빅콘에스600%'`, [AUTHORED_SOURCE]));

  // 경구 외 경로에 본 트랙 앵커가 새로 생겼는지 — Unit1+Unit2 대상 밖 authored 행 총량(선행 LIVE 포함) 고정 확인
  const oralAll = [...new Set([...u1, ...u2])];
  const outside = retRows<{ n: string }>(await ds.query(
    `SELECT count(DISTINCT master_id)::text n FROM shared_product_descriptions
     WHERE description_type='STORE' AND status='canonical' AND source_type=$1 AND deleted_at IS NULL
       AND NOT (master_id=ANY($2::uuid[]))`, [AUTHORED_SOURCE, oralAll]));
  await ds.destroy();

  const gates: Record<string, boolean> = {
    'S1 KO apply 원장 7,396': koRun.writeActual === 7396 && koRun.writeExpected === 7396,
    'S2 EN apply 원장 3,698': enRun.writeActual === 3698 && enRun.writeExpected === 3698,
    'S3 Unit 2 총 write 11,094': koRun.writeActual + enRun.writeActual === 11094,
    'S4 Unit 1 KO/EN canonical 1,850 유지': u1Ko === 1850 && u1En === 1850,
    'S5 Unit 1 easy canonical 잔존 0': +u1Easy[0].n === 0,
    'S6 외용 final 199m 무변경': finKo === fin.length && finEn === fin.length,
    'S7 split 90m 무변경': splKo === spl.length && splEn === spl.length,
    'S8 빅콘에스600정 authored write 0': +hold[0].a === 0,
  };
  const out = { wo: 'WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-FINAL-PRODUCTION-V1', dbWrite: 0,
    metrics: { unit2: u2.length, unit1: u1.length, u1Ko, u1En, u1EasyCanonicalLeft: +u1Easy[0].n,
      finalMasters: fin.length, finKo, finEn, splitMasters: spl.length, splKo, splEn,
      bigconRows: +hold[0].n, bigconAuthored: +hold[0].a,
      authoredOutsideOralUnits: +outside[0].n,
      koWrite: koRun.writeActual, enWrite: enRun.writeActual }, gates };
  const p = path.join(DATA_DIR, 'otc-unproduced-oral-unit2-postverify-scope.json');
  fs.writeFileSync(p, JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log(`UNIT2 SCOPE POSTVERIFY — ${JSON.stringify(out.metrics)}`);
  for (const [k, v] of Object.entries(gates)) console.log(`  ${v ? 'PASS' : '*** FAIL ***'}  ${k}`);
  console.log(`  → ${p}`);
  if (Object.values(gates).some((v) => !v)) process.exitCode = 1;
}
main().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
