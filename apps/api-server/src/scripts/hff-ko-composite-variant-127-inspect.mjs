/**
 * WO-O4O-HFF-MULTILINGUAL-AUTHORING-CONTRACT-PARITY-AND-RESIDUAL-CLEANUP-V1
 * Phase 1-A — ko COMPOSITE 변종 127 구조 실측 (read-only, DB write 0).
 *
 * `왜 이 제품인가` 헤딩 부재로 직전 WO 의 family predicate 에서 누락된 모집단을
 * h2 시그널 집합으로 재판정하고, AUD/FOOT patch 적용 가능성을 사전 측정한다.
 */
import fs from 'node:fs';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const KO = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`;
const EXPERT_PHRASE = '매장 내 약사 등 전문가';

// renderer family 판정 = h2 시그널 집합 (클래스 존재로 판정하지 않는다)
const DRIVER_H2 = ['주요 기능성', '섭취량 및 섭취방법 (공식 표기 그대로)', '섭취 시 참고사항', '확인 가능한 기준·규격 정보', '매장 전문가 문의 안내'];
const COMPOSITE_H2 = ['왜 이 제품인가', '섭취방법 (공식 표기 그대로)', '표시 기준', '이런 분께'];
const h2sOf = (s) => [...String(s ?? '').matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
const familyOf = (content) => {
  const h2 = h2sOf(content);
  const d = DRIVER_H2.filter((x) => h2.includes(x)).length;
  const c = COMPOSITE_H2.filter((x) => h2.includes(x)).length + (h2.some((x) => /기능성/.test(x)) ? 1 : 0);
  if (d > c) return 'DRIVER';
  if (c > d) return 'COMPOSITE';
  return 'OTHER_OR_UNKNOWN';
};

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const ro = (await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only;
if (ro !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const rows = (await c.query(`
  SELECT spd.id canonical_id, spd.master_id, spd.content
  FROM shared_product_descriptions spd
  WHERE ${KO.replace(/\b(content|source_type|description_type|status|language|deleted_at)\b/g, 'spd.$1')}
    AND spd.content NOT LIKE '%왜 이 제품인가%'
    AND (spd.content LIKE '%<h2>이런 분께</h2>%' OR spd.content NOT LIKE '%${EXPERT_PHRASE}%')
  ORDER BY spd.id`)).rows;
await c.end();

const famTally = {}, h2Tally = {}, shapeTally = {};
const WHO_RE = /<h2>이런 분께<\/h2><ul class="sd-who">[\s\S]*?<\/ul>/;
const FOOT_END_RE = /<div class="sd-foot"><b>[^<]*<\/b>([\s\S]*?)<\/div><\/div>$/;
for (const r of rows) {
  const f = familyOf(r.content);
  famTally[f] = (famTally[f] ?? 0) + 1;
  for (const h of h2sOf(r.content)) h2Tally[h] = (h2Tally[h] ?? 0) + 1;
  const shape = [
    r.content.includes('<h2>이런 분께</h2>') ? 'AUD' : '-',
    WHO_RE.test(r.content) ? 'AUD_RE_OK' : 'AUD_RE_MISS',
    r.content.includes(EXPERT_PHRASE) ? 'EXPERT_OK' : 'EXPERT_MISSING',
    FOOT_END_RE.test(r.content) ? 'FOOT_RE_OK' : 'FOOT_RE_MISS',
    /<h2>[^<]*기능성[^<]*<\/h2>/.test(r.content) ? 'FN_OK' : 'FN_MISSING',
  ].join('|');
  shapeTally[shape] = (shapeTally[shape] ?? 0) + 1;
}

const out = {
  ranAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  population: rows.length, familyTally: famTally, shapeTally,
  h2Tally: Object.fromEntries(Object.entries(h2Tally).sort((a, b) => b[1] - a[1])),
  sampleH2: rows.slice(0, 3).map((r) => ({ canonicalId: r.canonical_id, family: familyOf(r.content), h2: h2sOf(r.content) })),
  sampleTail: rows[0] ? rows[0].content.slice(-420) : null,
};
fs.writeFileSync(`${D}/hff-ko-composite-variant-127-inspect-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
