/**
 * HFF 복합형 LIVE — **tag-agnostic 정본 verifier** (read-only, DB write 0).
 *   PROXY_PORT=5433 npx tsx src/scripts/hff-combo-live-verify.ts [--expect 3845]
 *
 * 정본 정의(태그 무관):
 *   description_type='STORE' · status='canonical' · deleted_at IS NULL · language='ko'
 *   · source_type='o4o_hff_generated' · **원료 카드 수 ≥ 2** · distinct master 집계
 *
 * 원료 카드 마커 = `</b><ul class="sd-why">` (combo compose 의 원료별 기능성 카드).
 *   - combo: 원료 수 N(≥2)  · single-nutrient: 0 (single 은 `<ul class="sd-why">` 를 쓰되 `</b>` 선행 없음)
 *   → 카드 수 ≥ 2 로 복합형만 정확히 분리. **tag(batch:*) 에 의존하지 않는다.**
 *
 * 기존 `hff-combo-verify-committed.ts` 의 `combo-%` tag + allowlist 집계는 DEPRECATED(태그 확장 누락 시 과소집계).
 *
 * 부가 전수 검사: canonicalDup(=0 필수) · statementNo 중복 master(=0 필수) · 카드수 분포.
 */
import '../env-loader.js';
import { DataSource } from 'typeorm';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const EXPECT = parseInt(arg('expect', '0'), 10);
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5433', 10);
const MARKER = '</b><ul class="sd-why">';

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 180000 } });
  await ds.initialize();
  try {
    // 카드 수 = 마커 등장 횟수(portable, regexp_count 미의존). 정본 필터 위에서 distinct master.
    const cardExpr = `(length(s.content) - length(replace(s.content, '${MARKER}', ''))) / ${MARKER.length}`;
    const BASE = `FROM shared_product_descriptions s
      WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL
        AND s.language='ko' AND s.source_type='o4o_hff_generated'`;

    const totalCombo = (await ds.query(
      `SELECT count(DISTINCT s.master_id)::int c FROM (SELECT s.master_id, ${cardExpr} AS cards ${BASE}) s WHERE s.cards >= 2`))[0].c;
    const singleLive = (await ds.query(
      `SELECT count(DISTINCT s.master_id)::int c FROM (SELECT s.master_id, ${cardExpr} AS cards ${BASE}) s WHERE s.cards < 2`))[0].c;
    const totalKoMasters = (await ds.query(`SELECT count(DISTINCT s.master_id)::int c ${BASE}`))[0].c;

    // 카드 수 분포(복합형 원료 수 히스토그램)
    const dist: Array<{ cards: number; masters: number }> = await ds.query(
      `SELECT cards, count(DISTINCT master_id)::int masters FROM (SELECT s.master_id, ${cardExpr} AS cards ${BASE}) s GROUP BY cards ORDER BY cards`);

    // canonicalDup 전수 — o4o_hff_generated STORE canonical 전체(ko+en)에서 (master,type,lang) 중복
    const canonicalDup = (await ds.query(
      `SELECT count(*)::int c FROM (
         SELECT master_id, description_type, coalesce(language,'ko') l
         FROM shared_product_descriptions
         WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND source_type='o4o_hff_generated'
         GROUP BY 1,2,3 HAVING count(*)>1) x`))[0].c;

    // statementNo 중복 master — 복합형 LIVE master 중 동일 mfds_permit_number 가 여러 master 에 걸리는지
    const stmtDup: Array<{ permit: string; n: number }> = await ds.query(
      `SELECT m.mfds_permit_number permit, count(*)::int n
       FROM product_masters m
       WHERE m.mfds_permit_number IS NOT NULL AND m.id IN (
         SELECT DISTINCT s.master_id FROM (SELECT s.master_id, ${cardExpr} AS cards ${BASE}) s WHERE s.cards >= 2)
       GROUP BY 1 HAVING count(*)>1 ORDER BY n DESC LIMIT 20`);

    // en 대칭성(복합형 master 가 en canonical 도 보유하는지 — 참고용)
    const enSym = (await ds.query(
      `SELECT count(DISTINCT s.master_id)::int c FROM shared_product_descriptions s
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL
         AND s.language='en' AND s.source_type='o4o_hff_generated'
         AND (length(s.content) - length(replace(s.content, '${MARKER}', ''))) / ${MARKER.length} >= 2`))[0].c;

    const report = {
      verifier: 'hff-combo-live-verify (tag-agnostic canonical)',
      definition: { description_type: 'STORE', status: 'canonical', deleted_at: 'NULL', language: 'ko', source_type: 'o4o_hff_generated', ingredientCards: '>=2', aggregate: 'distinct master' },
      totalComboLive: totalCombo,
      singleNutrientLive: singleLive,
      totalKoCanonicalMasters: totalKoMasters,
      enComboCanonicalMasters: enSym,
      canonicalDup, statementNoDupMasters: stmtDup.length, statementNoDupSample: stmtDup,
      cardDistribution: dist,
      expect: EXPECT || null,
      expectMatch: EXPECT ? totalCombo === EXPECT : null,
      pass: canonicalDup === 0 && stmtDup.length === 0 && (!EXPECT || totalCombo === EXPECT),
    };
    console.log('JSON_VERIFY_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_VERIFY_END');
    if (!report.pass) process.exit(2);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('[combo-live-verify] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
