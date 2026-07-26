/**
 * WO-O4O-OTC-UNPRODUCED-ORAL-UNIT1-EN-CONTINUE-TO-FINAL-GREEN-V1 — 범위 사후검증 (read-only)
 *
 * `--verify` 가 Unit 1 대상 1,850 master 내부 정합을 보는 것과 별개로, 본 스크립트는 **범위 밖 무변경**을
 * 확인한다. DB write 0.
 *
 *   1) Unit 1 write 총량 = KO 7,400 + EN 3,700 = 11,100 (apply run 원장 대조)
 *   2) Unit 2 대상 master 에 본 트랙 authored 행 0 (Unit 2 write 0)
 *   3) 선행 LIVE 트랙(외용 final 199m + split 90m) canonical 상태 무변경
 *
 * Usage(apps/api-server): tsx src/scripts/otc-unproduced-oral-unit1-postverify-scope.ts
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
  const koRun = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-unproduced-oral-unit1-apply-run.ko.json'), 'utf8'));
  const enRun = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-unproduced-oral-unit1-apply-run.en.json'), 'utf8'));

  const u1 = idsOf('otc-unproduced-oral-unit1-approved-ssot-v1.json', (j) => j.groups.flatMap((g: any) => g.masterIds));
  const u2 = idsOf('otc-unproduced-oral-unit2-approved-ssot-v1.json', (j) => j.groups.flatMap((g: any) => g.masterIds));
  const u2Only = u2.filter((x) => !u1.includes(x));
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
  const u2Ko = await count(u2Only, 'ko');
  const u2En = await count(u2Only, 'en');
  const finKo = await count(fin, 'ko'); const finEn = await count(fin, 'en');
  const splKo = await count(spl, 'ko'); const splEn = await count(spl, 'en');
  await ds.destroy();

  const gates: Record<string, boolean> = {
    'S1 KO apply 원장 7,400': koRun.writeActual === 7400 && koRun.writeExpected === 7400,
    'S2 EN apply 원장 3,700': enRun.writeActual === 3700 && enRun.writeExpected === 3700,
    'S3 Unit 1 총 write 11,100': koRun.writeActual + enRun.writeActual === 11100,
    'S4 Unit 2 전용 master KO write 0': u2Ko === 0,
    'S5 Unit 2 전용 master EN write 0': u2En === 0,
    'S6 외용 final 199m KO/EN 무변경': finKo === fin.length && finEn === fin.length,
    'S7 split 90m KO/EN 무변경': splKo === spl.length && splEn === spl.length,
  };
  const out = { wo: 'WO-O4O-OTC-UNPRODUCED-ORAL-UNIT1-EN-CONTINUE-TO-FINAL-GREEN-V1', dbWrite: 0,
    metrics: { unit1: u1.length, unit2Only: u2Only.length, u2Ko, u2En,
      finalMasters: fin.length, finKo, finEn, splitMasters: spl.length, splKo, splEn,
      koWrite: koRun.writeActual, enWrite: enRun.writeActual }, gates };
  const p = path.join(DATA_DIR, 'otc-unproduced-oral-unit1-postverify-scope.json');
  fs.writeFileSync(p, JSON.stringify(out, null, 1) + '\n', 'utf8');
  console.log(`UNIT1 SCOPE POSTVERIFY — ${JSON.stringify(out.metrics)}`);
  for (const [k, v] of Object.entries(gates)) console.log(`  ${v ? 'PASS' : '*** FAIL ***'}  ${k}`);
  console.log(`  → ${p}`);
  if (Object.values(gates).some((v) => !v)) process.exitCode = 1;
}
main().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
