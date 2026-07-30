/** Phase A — 모집단·교집합 실측 + `이런 분께` section 경계 / 표준 footer 계약 조사 (read-only). */
import pg from 'pg';

const HAS_FN = `content ~ '<h2>[^<]*기능성[^<]*</h2>'`;
const KO = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`;
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5496', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const m = (await c.query(`
  SELECT
    count(*)::int AS ko_total,
    count(*) FILTER (WHERE NOT (${HAS_FN}))::int AS A_no_fn,
    count(*) FILTER (WHERE content LIKE '%<h2>이런 분께</h2>%')::int AS B_audience_h2,
    count(*) FILTER (WHERE content LIKE '%이런 분께%')::int AS B_audience_anywhere,
    count(*) FILTER (WHERE content NOT LIKE '%매장 내 약사 등 전문가%')::int AS C_no_expert_phrase,
    count(*) FILTER (WHERE content NOT LIKE '%전문가%')::int AS C_no_expert_word,
    count(*) FILTER (WHERE NOT (${HAS_FN}) AND content LIKE '%<h2>이런 분께</h2>%')::int AS AB,
    count(*) FILTER (WHERE NOT (${HAS_FN}) AND content NOT LIKE '%매장 내 약사 등 전문가%')::int AS AC,
    count(*) FILTER (WHERE content LIKE '%<h2>이런 분께</h2>%' AND content NOT LIKE '%매장 내 약사 등 전문가%')::int AS BC,
    count(*) FILTER (WHERE NOT (${HAS_FN}) AND content LIKE '%<h2>이런 분께</h2>%' AND content NOT LIKE '%매장 내 약사 등 전문가%')::int AS ABC,
    count(*) FILTER (WHERE content LIKE '%왜 이 제품인가%')::int AS wae_family
  FROM shared_product_descriptions WHERE ${KO}`)).rows[0];
console.log('=== KO 모집단 실측 ===');
console.log(JSON.stringify(m, null, 1));

// 전체(en 포함) 대조 — 직전 보고 15,435 / 13,955 의 출처 확인
const all = (await c.query(`
  SELECT
    count(*) FILTER (WHERE content LIKE '%이런 분께%')::int AS audience_all_lang,
    count(*) FILTER (WHERE content NOT LIKE '%매장 내 약사 등 전문가%')::int AS no_expert_all_lang
  FROM shared_product_descriptions
  WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`)).rows[0];
console.log('=== 전체 언어 대조 ===');
console.log(JSON.stringify(all, null, 1));

// `이런 분께` section 구조 패턴
const aud = (await c.query(`
  SELECT
    count(*) FILTER (WHERE content ~ '<h2>이런 분께</h2><ul class="sd-who">[^<]*(<li>[^<]*</li>)+</ul>')::int AS h2_ulwho_lis,
    count(*) FILTER (WHERE content ~ '<h2>이런 분께</h2><ul class="sd-who">')::int AS h2_then_ulwho,
    count(*) FILTER (WHERE content LIKE '%<h2>이런 분께</h2>%' AND content NOT LIKE '%<h2>이런 분께</h2><ul class="sd-who">%')::int AS h2_other_shape,
    count(*) FILTER (WHERE content LIKE '%이런 분께%' AND content NOT LIKE '%<h2>이런 분께</h2>%')::int AS phrase_without_h2
  FROM shared_product_descriptions WHERE ${KO}`)).rows[0];
console.log('=== 이런 분께 구조 ===');
console.log(JSON.stringify(aud, null, 1));

// h2 이후 다음 요소 (제거 경계 확인)
const after = (await c.query(`
  SELECT m[1] AS next_after_who_section, count(*)::int AS c
  FROM shared_product_descriptions spd,
       regexp_matches(spd.content, '<h2>이런 분께</h2><ul class="sd-who">.*?</ul>([\\s]*<[^>]+>)', 'g') AS m
  WHERE ${KO} GROUP BY 1 ORDER BY c DESC LIMIT 6`)).rows;
console.log('=== 이런 분께 section 직후 요소 ===');
console.log(JSON.stringify(after, null, 1));

// footer 계약 조사
const foot = (await c.query(`
  SELECT
    count(*) FILTER (WHERE content ~ '<div class="sd-foot">')::int AS has_sdfoot,
    count(*) FILTER (WHERE content LIKE '%매장 내 약사 등 전문가%')::int AS has_expert_phrase,
    count(*) FILTER (WHERE content ~ '<div class="sd-foot">' AND content LIKE '%매장 내 약사 등 전문가%')::int AS foot_and_phrase,
    count(*) FILTER (WHERE content ~ '<div class="sd-foot">' AND content NOT LIKE '%매장 내 약사 등 전문가%')::int AS foot_without_phrase,
    count(*) FILTER (WHERE content !~ '<div class="sd-foot">')::int AS no_sdfoot
  FROM shared_product_descriptions WHERE ${KO}`)).rows[0];
console.log('=== footer 현황 ===');
console.log(JSON.stringify(foot, null, 1));

// 표준 전문가 안내 문구 분포 (sd-cta / sd-foot 내부)
const phrases = (await c.query(`
  SELECT m[1] AS block, count(*)::int AS c
  FROM shared_product_descriptions spd,
       regexp_matches(spd.content, '(<h2>[^<]*전문가[^<]*</h2><div class="sd-cta">.*?</div>|<div class="sd-foot">[^<]*<b>[^<]*</b>[^<]*</div>)', 'g') AS m
  WHERE ${KO} GROUP BY 1 ORDER BY c DESC LIMIT 6`)).rows;
console.log('=== 전문가 안내 블록 상위 ===');
for (const p of phrases) console.log(`  (${p.c}) ${p.block.slice(0, 220)}`);

// 왜-family footer 표본
const waeFoot = (await c.query(`
  SELECT content FROM shared_product_descriptions
  WHERE ${KO} AND content LIKE '%왜 이 제품인가%' AND content LIKE '%매장 내 약사 등 전문가%' LIMIT 2`)).rows;
console.log('=== 왜-family + 전문가 문구 표본 footer ===');
for (const r of waeFoot) console.log('  ' + (r.content.match(/<div class="sd-foot">[\s\S]*?<\/div>|<h2>[^<]*전문가[^<]*<\/h2>[\s\S]{0,300}/)?.[0] ?? '').slice(0, 300));

// 왜-family footer 없는 표본의 문서 끝 구조
const tail = (await c.query(`
  SELECT content FROM shared_product_descriptions
  WHERE ${KO} AND content LIKE '%왜 이 제품인가%' AND content NOT LIKE '%매장 내 약사 등 전문가%' LIMIT 2`)).rows;
console.log('=== footer 부재 왜-family 문서 끝 ===');
for (const r of tail) console.log('  …' + r.content.slice(-320));

await c.end();
