/**
 * #11 mg+vd+vk+zn+ca — stmt 2020000997275 칼슘 basis 오기 단건 normalization (source-level, DB write 0).
 *
 * 목적: 원문 BASE_STANDARD 칼슘 spec `1,1500mg` → `1,500mg` 단일 교정 후 corrected source JSONL 산출.
 *       select/generate/apply 는 이 corrected source 를 소비 → 원료값·타제품 불변.
 * 가드(중지 조건):
 *   - stmt row 정확히 1건
 *   - `1,1500` 은 BASE_STANDARD 전체에서 정확히 1회, 칼슘 라인 안에서만
 *   - 교정 후 칼슘 basis=1,500 · mg/zn/D/K basis 불변(각 1,500)
 *   - BASE_STANDARD 외 필드 불변
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import { DataSource } from 'typeorm';

const STMT = '2020000997275';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5433', 10);
const OUT = process.argv[process.argv.indexOf('--out') + 1];
if (!OUT || OUT.startsWith('--')) throw new Error('--out <path> 필요');

function assert(cond: boolean, msg: string): void { if (!cond) throw new Error(`ASSERT_FAIL: ${msg}`); }

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 1, statement_timeout: 60000 } });
  await ds.initialize();
  try {
    const rows: Array<{ id: string; status: string; matched: string | null; source: Record<string, unknown> }> = await ds.query(
      `SELECT id, candidate_status AS status, matched_product_master_id AS matched, raw_payload->'source' AS source
       FROM product_candidates
       WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
         AND raw_payload->'source'->>'STTEMNT_NO' = $1`, [STMT]);
    assert(rows.length === 1, `stmt row 는 정확히 1건 (실제 ${rows.length})`);
    const row = rows[0];
    assert(row.matched == null, `candidate 미승격이어야(matched=${row.matched})`);
    const source = { ...row.source } as Record<string, string>;
    const base = String(source.BASE_STANDARD ?? '');

    // '1,1500' 유일성 + 칼슘 라인 귀속 검증
    const occ = (s: string, p: string): number[] => { const a: number[] = []; let i = s.indexOf(p); while (i >= 0) { a.push(i); i = s.indexOf(p, i + 1); } return a; };
    const typoPos = occ(base, '1,1500');
    assert(typoPos.length === 1, `'1,1500' 은 전체 1회여야 (실제 ${typoPos.length})`);
    // 칼슘 라인: '칼슘' 부터 다음 개행까지
    const caStart = base.indexOf('칼슘');
    assert(caStart >= 0, '칼슘 라벨 존재');
    const caLineEnd = base.indexOf('\n', caStart); const caLine = base.slice(caStart, caLineEnd < 0 ? base.length : caLineEnd);
    assert(caLine.includes('1,1500'), `오기는 칼슘 라인 안(칼슘 라인="${caLine}")`);

    // 교정: 칼슘 라인 내 '1,1500' → '1,500' (전역 아님 — 칼슘 라인만 치환)
    const fixedCaLine = caLine.replace('1,1500', '1,500');
    const fixedBase = base.slice(0, caStart) + fixedCaLine + (caLineEnd < 0 ? '' : base.slice(caLineEnd));

    // 사후 검증
    assert(occ(fixedBase, '1,1500').length === 0, '교정 후 1,1500 0회');
    // 각 원료 basis=1,500 (5회) — 칼슘 포함
    const basis1500 = occ(fixedBase, '/1,500mg').length + occ(fixedBase, '/1,500 mg').length + occ(fixedBase.replace(/1,500 mg/g, '1,500mg'), '/1,500mg').length;
    // 단순·명시 카운트: 정규화 후 '1,500mg' 총 등장(공백 변이 통합)
    const norm = fixedBase.replace(/1,500\s*mg/g, '1,500mg');
    assert(occ(norm, '1,500mg').length === 5, `교정 후 1,500mg 5회(원료 5) — 실제 ${occ(norm, '1,500mg').length}`);
    // BASE 외 필드 불변 확인용 diff 로그
    const changedKeys = Object.keys(source).filter((k) => k !== 'BASE_STANDARD' && String(source[k]) !== String((row.source as Record<string, unknown>)[k]));
    assert(changedKeys.length === 0, `BASE_STANDARD 외 불변(변경 키 ${changedKeys.join(',')})`);

    source.BASE_STANDARD = fixedBase;
    // corrected source 를 flatten 단일 라인 JSONL 로 (fileJsonlSource: obj.item ?? obj)
    fs.writeFileSync(OUT, JSON.stringify(source) + '\n', 'utf8');

    console.log('JSON_REPORT_BEGIN');
    console.log(JSON.stringify({
      stmt: STMT, candidateId: row.id, candidateStatus: row.status, matched: row.matched,
      typo: { before: '칼슘 …/1,1500mg', after: '칼슘 …/1,500mg', typoOccurrences: 1, scope: 'calcium-line-only' },
      caLineBefore: caLine, caLineAfter: fixedCaLine,
      basis1500CountAfter: occ(norm, '1,500mg').length,
      nonBaseFieldsChanged: changedKeys.length,
      out: OUT,
    }, null, 2));
    console.log('JSON_REPORT_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
