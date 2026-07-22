/**
 * Agent C — 복합형 LIVE SSOT 재확정 (tag-agnostic, read-only, DB write 0).
 *   PROXY_PORT=5455 npx tsx src/scripts/hff-combo-c-ssot-reconcile.ts --creds <json>
 *
 * 배치 tag allowlist 에 의존하지 않고, HFF STORE canonical ko 설명서의 **원료 카드 수**로 단일/복합을 판정한다.
 * 카드 마커 = `</b><ul class="sd-why">` (composeCombo 원료별 독립 카드). ≥2 = 복합형.
 * 이렇게 하면 batch tag 미포함 배치도 전부 집계되어 tag 기반 verifier 의 과소집계를 교차검증한다.
 */
import '../env-loader.js';
import fs from 'node:fs';
import { DataSource } from 'typeorm';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const creds = JSON.parse(fs.readFileSync(arg('creds'), 'utf8'));

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5455', 10), username: creds.DB_USERNAME, password: creds.DB_PASSWORD, database: creds.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 180000 } });
  await ds.initialize();
  try {
    // HFF 생성 STORE canonical ko SPD 기준, 마스터별 원료 카드 수 분포.
    const rows: Array<{ cards: number; masters: number }> = await ds.query(`
      WITH hff AS (
        SELECT s.master_id,
               (length(s.content) - length(replace(s.content, '</b><ul class="sd-why">', ''))) / length('</b><ul class="sd-why">') AS cards
          FROM shared_product_descriptions s
         WHERE s.source_type='o4o_hff_generated' AND s.language='ko'
           AND s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL
      )
      SELECT cards, count(*)::int AS masters FROM hff GROUP BY cards ORDER BY cards`);
    const total = rows.reduce((a, r) => a + r.masters, 0);
    const combo = rows.filter((r) => r.cards >= 2).reduce((a, r) => a + r.masters, 0);
    const single = rows.filter((r) => r.cards <= 1).reduce((a, r) => a + r.masters, 0);
    console.log(JSON.stringify({ hffStoreCanonicalKoTotal: total, comboLive_cards_ge2: combo, single_cards_le1: single, cardDistribution: rows }, null, 1));
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('RECONCILE_FAIL:', e instanceof Error ? e.message : e); process.exit(1); });
