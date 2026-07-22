/** READ-ONLY — probiotics 현재 LIVE + producible pure-single 의 stmt-축 shard 균형. DB write 0. */
import '../env-loader.js';
import { DataSource } from 'typeorm';
import { normalizeSpecText, classify } from './hff-source-parse.js';
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5433', 10);
function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;
const PROB = /프로바이오틱|유산균|락토바실|비피더스/i;
async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const produced: Set<string> = new Set((await ds.query(
      `SELECT DISTINCT master_id id FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL AND language='ko' AND source_type='o4o_hff_generated'`)).map((r: { id: string }) => r.id));
    // probiotics 현재 LIVE = produced master 중 단일(cards<2) & 제품이 probiotics
    let probLive = 0, probRemainingBracket = 0; const shardStmt: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; stmt: string; mid: string | null; name: string; sungsang: string; srv: string; fn: string }> = await ds.query(
        `SELECT id, raw_payload->'source'->>'STTEMNT_NO' stmt, matched_product_master_id mid,
           coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang,
           coalesce(raw_payload->'source'->>'SRV_USE','') srv, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 3000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) {
        const t = normalizeSpecText(r.fn); const brackets = [...t.matchAll(/\[([^\]]{1,24})\]/g)].map((m) => m[1].trim());
        if (brackets.length !== 1) continue; const label = brackets[0];
        if (classify(label) || !PROB.test(label)) continue;   // probiotics pure-single 만
        const isProduced = r.mid != null && produced.has(r.mid);
        if (isProduced) { probLive++; continue; }
        if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`)) continue;
        probRemainingBracket++;
        shardStmt[stableHash(String(r.stmt)) % 3]++;           // stmt-축 shard(균형)
      }
      after = rows[rows.length - 1].id;
    }
    console.log('JSON_PROB_BEGIN');
    console.log(JSON.stringify({ probioticsBracketPureSingle_Live: probLive, probioticsRemaining_solidBracket: probRemainingBracket, shardByStmt_balanced: shardStmt }, null, 2));
    console.log('JSON_PROB_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
