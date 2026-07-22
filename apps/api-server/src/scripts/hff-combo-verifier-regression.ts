/** READ-ONLY — tag-agnostic 정본 verifier vs 기존 tag 기반 집계 회귀 대조. DB write 0. */
import '../env-loader.js';
import { DataSource } from 'typeorm';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5433', 10);
const MARKER = '</b><ul class="sd-why">';
async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 180000 } });
  await ds.initialize();
  try {
    const cardExpr = `(length(s.content) - length(replace(s.content, '${MARKER}', ''))) / ${MARKER.length}`;
    const canonKo = `s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.language='ko' AND s.source_type='o4o_hff_generated'`;
    // tag-agnostic 복합형 master 집합
    const agnostic = (await ds.query(`SELECT count(DISTINCT s.master_id)::int c FROM (SELECT s.master_id, ${cardExpr} cards FROM shared_product_descriptions s WHERE ${canonKo}) s WHERE s.cards>=2`))[0].c;
    // tag 기반: combo-% 접두 OR batch:single-nutrient-% 인 master 중 복합형(카드>=2)
    const tagCombo = (await ds.query(
      `SELECT count(DISTINCT s.master_id)::int c FROM (SELECT s.master_id, ${cardExpr} cards FROM shared_product_descriptions s WHERE ${canonKo}) s
       JOIN product_masters m ON m.id=s.master_id
       WHERE s.cards>=2 AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(m.tags::jsonb) t WHERE t LIKE 'batch:single-nutrient-combo-%')`))[0].c;
    // 복합형인데 batch tag 자체가 없는 master(태그 미부여) 수
    const noBatchTag = (await ds.query(
      `SELECT count(DISTINCT s.master_id)::int c FROM (SELECT s.master_id, ${cardExpr} cards FROM shared_product_descriptions s WHERE ${canonKo}) s
       JOIN product_masters m ON m.id=s.master_id
       WHERE s.cards>=2 AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(m.tags::jsonb) t WHERE t LIKE 'batch:%')`))[0].c;
    // 전체 batch tag 별 복합형 master 분포(상위)
    const byTag: Array<{ tag: string; c: number }> = await ds.query(
      `SELECT t tag, count(DISTINCT s.master_id)::int c FROM (SELECT s.master_id, ${cardExpr} cards FROM shared_product_descriptions s WHERE ${canonKo}) s
       JOIN product_masters m ON m.id=s.master_id, jsonb_array_elements_text(m.tags::jsonb) t
       WHERE s.cards>=2 AND t LIKE 'batch:%' GROUP BY t ORDER BY c DESC`);
    // 최근 A/B/C 배치 대표 태그 커버리지(존재 시 카운트)
    const probeTags = ['batch:single-nutrient-vd-ve', 'batch:single-nutrient-vd-se-zn', 'batch:single-nutrient-combo-vd-ca', 'batch:single-nutrient-g13-6mineral'];
    const coverage: Record<string, number> = {};
    for (const pt of probeTags) coverage[pt] = (await ds.query(`SELECT count(DISTINCT s.master_id)::int c FROM (SELECT s.master_id, ${cardExpr} cards FROM shared_product_descriptions s WHERE ${canonKo}) s JOIN product_masters m ON m.id=s.master_id WHERE s.cards>=2 AND m.tags::jsonb @> $1::jsonb`, [JSON.stringify([pt])]))[0].c;
    console.log('JSON_REG_BEGIN');
    console.log(JSON.stringify({
      tagAgnosticCombo: agnostic,
      tagBased_comboPrefixOnly: tagCombo,
      undercountByComboPrefix: agnostic - tagCombo,
      comboMastersWithNoBatchTag: noBatchTag,
      distinctBatchTags: byTag.length,
      topBatchTags: byTag.slice(0, 12),
      recentBatchCoverage: coverage,
    }, null, 2));
    console.log('JSON_REG_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
