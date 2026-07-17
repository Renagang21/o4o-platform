/**
 * HFF raw 소스 동치 검증 — 파일 raw(committed JSON에 임베드된 source) vs DB product_candidates.raw_payload
 *   PROXY_PORT=5446 npx tsx src/scripts/hff-rawpayload-equivalence.ts
 *
 * WO-...-LARGE-FUNCTION-GROUPS PART B 소스 전환 준비. **read-only, DB write 0.**
 * 완료 그룹의 생산 JSON(=파일 raw 파생)의 source 필드를, 동일 STTEMNT_NO 의 DB raw_payload.source 와 의미 비교.
 * 의미 차이 0 이면 DB raw_payload 로 전환해도 동일 생산 결과 → 전환 게이트 통과.
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';

const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5446', 10);
const DATA = 'C:/Users/sohae/o4o-platform/docs/checks/data/product-description-guard';
const SAMPLES = [
  { label: '단일:아연', file: 'hff-zinc.json' },
  { label: '기능성:MSM', file: 'hff-func-msm.json' },
  { label: '기능성:오메가3', file: 'hff-func-omega-3.json' },
  { label: '기능성:프로폴리스', file: 'hff-func-propolis.json' },
  { label: '복합:비타민D+아연', file: 'hff-combo-vd-zn.json' },
  { label: '복합:셀레늄+아연', file: 'hff-combo-se-zn.json' },
  { label: '복합:마그네슘+칼슘', file: 'hff-combo-mg-ca.json' },
];
// 생산 JSON source 필드 → DB raw_payload.source 필드
const FIELDMAP: Array<[string, string]> = [
  ['mainFunction', 'MAIN_FNCTN'], ['baseStandard', 'BASE_STANDARD'], ['intake', 'SRV_USE'],
  ['caution', 'INTAKE_HINT1'], ['dosageForm', 'SUNGSANG'], ['storage', 'PRSRV_PD'], ['shelfLife', 'DISTB_PD'],
];
const norm = (s: unknown): string => String(s ?? '').replace(/\s+/g, ' ').trim();

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 3 } });
  await ds.initialize();
  console.log('═══ raw 소스 동치 검증 (파일 raw 파생 JSON vs DB raw_payload) ═══\n');
  let grandProducts = 0, grandMissing = 0, grandDiff = 0;
  const diffManifest: Array<{ group: string; statementNo: string; field: string; jsonLen: number; dbLen: number }> = [];
  for (const { label, file } of SAMPLES) {
    const path = `${DATA}/${file}`;
    if (!fs.existsSync(path)) { console.log(`${label.padEnd(18)} (파일 없음: ${file})`); continue; }
    const items: Array<{ statementNo: string; source: Record<string, string> }> = JSON.parse(fs.readFileSync(path, 'utf8'));
    const stmts = items.map((x) => String(x.statementNo).trim());
    // DB candidate source 조회
    const rows: Array<{ stmt: string; src: Record<string, string> }> = await ds.query(
      `SELECT raw_payload->'source'->>'STTEMNT_NO' AS stmt, raw_payload->'source' AS src FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND raw_payload->'source'->>'STTEMNT_NO' = ANY($1)`, [stmts]);
    const byStmt = new Map<string, Record<string, string>>();
    for (const r of rows) if (!byStmt.has(r.stmt)) byStmt.set(r.stmt, r.src);
    let missing = 0, diff = 0;
    for (const it of items) {
      const st = String(it.statementNo).trim();
      const src = byStmt.get(st);
      if (!src) { missing++; continue; }
      for (const [jf, df] of FIELDMAP) {
        const jv = norm((it.source as Record<string, string>)[jf]); const dv = norm(src[df]);
        if (jv !== dv) { diff++; diffManifest.push({ group: label, statementNo: st, field: jf, jsonLen: jv.length, dbLen: dv.length }); }
      }
    }
    grandProducts += items.length; grandMissing += missing; grandDiff += diff;
    const ok = missing === 0 && diff === 0 ? '✅' : '❌';
    console.log(`${ok} ${label.padEnd(18)} 대상 ${String(items.length).padStart(4)} · DB 매칭 ${items.length - missing} · 신고번호 결손 ${missing} · 필드 의미차이 ${diff}`);
  }
  console.log(`\n총 대상 ${grandProducts} · 신고번호 결손 ${grandMissing} · 필드 의미차이 ${grandDiff}`);
  console.log(grandMissing === 0 && grandDiff === 0
    ? '✅ 동치 PASS — DB raw_payload 로 전환해도 완료 그룹 생산 결과 동일(의미 필드 차이 0). 전체 count 동치는 G: 복구 후 별도 확인.'
    : '❌ 동치 FAIL — 차이 매니페스트 저장. 원인 확정 전 신규 apply 금지.');
  if (diffManifest.length) fs.writeFileSync('C:/Users/sohae/AppData/Local/Temp/claude/c--Users-sohae-o4o-platform/2b5935f9-9c75-483f-8206-e3385235d4d4/scratchpad/rawpayload-diff-manifest.json', JSON.stringify(diffManifest.slice(0, 500), null, 1));
  await ds.destroy();
}
main().catch((e) => { console.error('[equivalence] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
