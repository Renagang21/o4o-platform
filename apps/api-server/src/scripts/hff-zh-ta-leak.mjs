/**
 * WO-O4O-HFF-ZH-TRANSLATION-AMBIGUOUS-319-REPAIR-AND-APPLY-V1  누수(leak) 조각 추출
 *
 * `HANGUL_ONLY` 문서는 miss 가 0인데도 한국어가 남는다. 즉 `zh()` 가 **null 이 아닌**
 * 결과를 돌려주면서 그 안에 한국어를 남긴 조각이 있다는 뜻이다.
 * build 와 같은 슬롯 규칙으로 조각을 훑어 그 조각을 그대로 뽑는다. read-only.
 */
import fs from 'node:fs';
import pg from 'pg';
import { ZH_SLOTS, HANGUL, stripKeep } from './hff-zh-b01-build.mjs';
import { norm, zh } from './hff-zh-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const SCAN = JSON.parse(fs.readFileSync(`${D}/hff-zh-ta-scan-v1.json`, 'utf8'));
const IDS = SCAN.cases.map((x) => x.masterId);

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const rows = (await c.query(`
  SELECT master_id, content FROM shared_product_descriptions
   WHERE deleted_at IS NULL AND description_type='STORE' AND status='canonical'
     AND coalesce(language,'ko')='ko' AND source_type='o4o_hff_generated'
     AND master_id = ANY($1::uuid[])`, [IDS])).rows;

const leaks = new Map();   // `kind|ko` -> { kind, ko, zh, how, docs:Set }
const outside = new Map(); // 슬롯 밖 잔존 한글
for (const r of rows) {
  const seen = new Set();
  const probe = (kind, core) => {
    const t = norm(core);
    if (!t || !HANGUL.test(t)) return;
    const res = zh(kind, core);
    if (!res) return;                       // miss 는 이미 scan 이 잡는다
    if (!HANGUL.test(stripKeep(res.zh))) return;
    const k = `${kind}|${t}`;
    seen.add(k);
    if (!leaks.has(k)) leaks.set(k, { kind, ko: t, zh: res.zh, how: res.how, docs: new Set() });
    leaks.get(k).docs.add(r.master_id);
  };
  for (const { kind, re } of ZH_SLOTS) {
    for (const m of r.content.matchAll(re)) {
      const inner = m[2];
      if (/<[a-z]/i.test(inner)) { for (const seg of inner.split(/(<[^>]+>)/)) if (!seg.startsWith('<')) probe(kind, seg); }
      else probe(kind, inner);
    }
  }
  /* 슬롯 밖 한글 — 슬롯 집합이 닿지 않는 영역. */
  let bare = r.content;
  for (const { re } of ZH_SLOTS) bare = bare.replace(re, ' ');
  const rest = stripKeep(bare.replace(/<h1[^>]*>[\s\S]*?(?=<small|<\/h1>)/g, ' ').replace(/<[^>]+>/g, ' '));
  if (HANGUL.test(rest)) {
    for (const w of rest.match(/[^\s]*[가-힣][^\s]*/g) ?? []) {
      if (!outside.has(w)) outside.set(w, new Set());
      outside.get(w).add(r.master_id);
    }
  }
}

const list = [...leaks.values()].map((x) => ({ kind: x.kind, docs: x.docs.size, how: x.how, ko: x.ko, zh: x.zh }))
  .sort((a, b) => b.docs - a.docs || a.ko.localeCompare(b.ko));
const out = {
  wo: SCAN.wo, generatedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  documents: rows.length, leakAtoms: list.length,
  byHow: list.reduce((a, b) => { a[b.how] = (a[b.how] ?? 0) + 1; return a; }, {}),
  outsideSlotTokens: [...outside.entries()].map(([w, s]) => ({ token: w, docs: s.size })).sort((a, b) => b.docs - a.docs),
  leaks: list,
};
fs.writeFileSync(`${D}/hff-zh-ta-leak-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, leaks: list.slice(0, 50), outsideSlotTokens: out.outsideSlotTokens.slice(0, 20) }, null, 1));
await c.end();
