/**
 * HFF 복합형 — apply 후 독립 사후검증 (새 DB 연결, read-only, DB write 0).
 *   PROXY_PORT=5442 npx tsx src/scripts/hff-combo-verify-committed.ts --slug combo-vd-ca --expect 45
 *
 * apply 의 in-transaction postVerify 와 **독립**된 새 연결에서 tag 기준 재검증.
 * 대상 tag = batch:single-nutrient-${slug}. 기존 복합형 193 무변경 확인 포함.
 */
import '../env-loader.js';
import { DataSource } from 'typeorm';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const SLUG = arg('slug'); const EXPECT = parseInt(arg('expect', '0'), 10);
if (!SLUG || !EXPECT) throw new Error('--slug --expect 필요');
const TAG = `batch:single-nutrient-${SLUG}`;
const PORT = parseInt(process.env.PROXY_PORT ?? process.env.DB_PORT ?? '5442', 10);

// 복합형 baseline 식별.
// 원래 combo 배치는 slug 이 `combo-*` 접두(batch:single-nutrient-combo-*)라 패턴으로 잡혔으나,
// higher-N 배치들은 `combo-` 접두 없는 slug(b-complex-n8 / mg-mn-vd-zn-ca 등)로 적재되어
// `combo-%` 패턴에서 누락(집계 과소). 단일영양소 배치도 batch:single-nutrient-{nutrient} 형식이라
// 패턴을 batch:single-nutrient-% 로 넓히면 단일이 오집계됨 → 비-`combo-` 복합형 slug 을 명시 allowlist 로 포함.
// ⚠️ 향후 신규 복합형 배치는 slug 에 `combo-` 접두 사용 권장(그러면 자동 포함, 이 목록 확장 불요).
const COMBO_NONPREFIXED_TAGS = [
  'batch:single-nutrient-mg-mn-vd-zn-ca',
  'batch:single-nutrient-b-complex-n8',
  'batch:single-nutrient-ms-niacin-b126-panto',
  'batch:single-nutrient-mg-mn-vd-vk-ca',
  'batch:single-nutrient-mg-vd-vk-zn-ca',
  'batch:single-nutrient-g13-6mineral',
  'batch:single-nutrient-g10-b126-vc-zn',
  'batch:single-nutrient-h4-ms-na-b126-zn-panto',
  'batch:single-nutrient-vd-ve',
];

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: process.env.PROXY_HOST ?? '127.0.0.1', port: PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 60000 } });
  await ds.initialize();
  try {
    const q = (sql: string, p: unknown[] = []) => ds.query(sql, p);
    const tagJson = JSON.stringify([TAG]);
    const masters = (await q(`SELECT count(*)::int c FROM product_masters WHERE tags::jsonb @> $1::jsonb`, [tagJson]))[0].c;
    const ids: string[] = (await q(`SELECT id FROM product_masters WHERE tags::jsonb @> $1::jsonb`, [tagJson])).map((r: { id: string }) => r.id);
    const spdKo = ids.length ? (await q(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='ko' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, [ids]))[0].c : 0;
    const spdEn = ids.length ? (await q(`SELECT count(*)::int c FROM shared_product_descriptions WHERE master_id = ANY($1) AND language='en' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`, [ids]))[0].c : 0;
    const canonicalDup = ids.length ? (await q(`SELECT count(*)::int c FROM (SELECT master_id, description_type, coalesce(language,'ko') l FROM shared_product_descriptions WHERE master_id = ANY($1) AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2,3 HAVING count(*)>1) x`, [ids]))[0].c : 0;
    const candidateLinks = ids.length ? (await q(`SELECT count(*)::int c FROM product_candidates WHERE matched_product_master_id = ANY($1) AND candidate_status='approved_new_master'`, [ids]))[0].c : 0;
    const spdRefLinks = ids.length ? (await q(`SELECT count(*)::int c FROM shared_product_descriptions s JOIN product_candidates pc ON pc.id=s.source_ref_id WHERE s.master_id = ANY($1) AND s.description_type='STORE' AND s.status='canonical'`, [ids]))[0].c : 0;

    // 기존 복합형 baseline 동적 조회(combo-* 접두 + 비접두 복합형 allowlist, 현재 slug 제외) + 전체 누적
    const allComboTags: Array<{ tag: string; c: number }> = await q(
      `SELECT t AS tag, count(*)::int c FROM product_masters m, jsonb_array_elements_text(m.tags::jsonb) t
       WHERE m.tags::jsonb @> '["import:mfds-hff"]'::jsonb
         AND (t LIKE 'batch:single-nutrient-combo-%' OR t = ANY($1::text[])) GROUP BY t ORDER BY c DESC`, [COMBO_NONPREFIXED_TAGS]);
    const baselineNow: Record<string, number> = {};
    let existingTotal = 0;
    for (const r of allComboTags) { baselineNow[r.tag] = r.c; if (r.tag !== TAG) existingTotal += r.c; }
    const totalComboLive = existingTotal + masters;

    const pass = masters === EXPECT && spdKo === EXPECT && spdEn === EXPECT && canonicalDup === 0 && candidateLinks === EXPECT && spdRefLinks === EXPECT * 2;
    const report = {
      slug: SLUG, tag: TAG, expect: EXPECT,
      appliedProducts: masters, masterInserted: masters, candidateUpdated: candidateLinks,
      spdKoInserted: spdKo, spdEnInserted: spdEn, totalWrites: masters + candidateLinks + spdKo + spdEn,
      canonicalDup, candidateLinks, spdSourceRefLinks: spdRefLinks,
      existingComboBaseline: baselineNow, existingTotal, totalComboLive,
      independentVerifyPass: pass, dbWrite: 0,
    };
    console.log('JSON_VERIFY_BEGIN'); console.log(JSON.stringify(report, null, 2)); console.log('JSON_VERIFY_END');
    if (!pass) process.exit(2);
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('[combo-verify] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
