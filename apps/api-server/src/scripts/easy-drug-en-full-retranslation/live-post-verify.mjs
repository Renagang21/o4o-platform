/**
 * WO-...-LIVE-APPLY-AND-PUBLIC-VERIFY-V1 §15·§16·§22 — 적용 결과 독립 검증 (read-only, DB write 0).
 *
 * **적용 코드(live-apply.mjs)와 다른 경로**로 판정한다. 적용기는 "렌더 → 쓰기 → 되읽기" 였고,
 * 여기서는 DB 에 실제로 들어있는 값을 읽어 **census 가 잠근 plan.productionEnHash 와 대조**한다.
 * 렌더러 재실행은 2차 의견으로만 쓴다(--rerender).
 *
 * 판정:
 *   APPLIED           canonical EN 1건 · 해시 == productionEnHash · KO 해시 불변
 *   NOT_APPLIED       canonical EN 없음 (rollback/dry 후의 정상 상태)
 *   HASH_MISMATCH     canonical EN 은 있는데 내용이 계획과 다름  ← 즉시 조사 대상
 *   MULTI_CANONICAL   canonical EN 2건 이상 (부분 유니크 인덱스 위반 수준)
 *   KO_DRIFT          적용 후 KO 가 바뀜
 * 합계는 언제나 plan 행 수와 같아야 한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import crypto from 'node:crypto';
import pg from 'pg';
import { RESULTS, EN_UNITS_PATH } from './tm-lib.mjs';
import { renderEnHtml, verifyRoundTrip } from './en-render.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', '15471'), 10);
const CHUNK = parseInt(arg('--chunk', '300'), 10);
const TAG = arg('--tag', 'post');
const RERENDER = process.argv.includes('--rerender');
const PLAN = arg('--plan', path.join(RESULTS, 'live-apply-plan.jsonl'));
const md5 = (s) => crypto.createHash('md5').update(s, 'utf8').digest('hex');

function* streamJsonl(file) {
  const fd = fs.openSync(file, 'r');
  const decoder = new StringDecoder('utf8');
  try {
    const buf = Buffer.alloc(1 << 20);
    let tail = '';
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (n === 0) break;
      const lines = (tail + decoder.write(buf.subarray(0, n))).split('\n');
      tail = lines.pop() ?? '';
      for (const l of lines) if (l.trim()) yield JSON.parse(l);
    }
    tail += decoder.end();
    if (tail.trim()) yield JSON.parse(tail);
  } finally { fs.closeSync(fd); }
}

const plan = new Map();
for (const r of streamJsonl(PLAN)) plan.set(r.masterId, r);
const segs = new Map();
if (RERENDER) for (const u of streamJsonl(EN_UNITS_PATH)) segs.set(u.masterId, u.segments);

const client = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: 'o4o_platform' });
await client.connect();
await client.query('SET default_transaction_read_only = on');

const SQL = `
  SELECT master_id::text "masterId", id::text "descId",
         COALESCE(language,'ko') lang, status, md5(content) "md5",
         CASE WHEN COALESCE(language,'ko')='ko' AND status='canonical' THEN content END "koContent"
  FROM shared_product_descriptions
  WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND deleted_at IS NULL`;

const ids = [...plan.keys()].sort();
const verdictTally = {};
const problems = [];
const langTally = {};        // 마스터별 보유 언어 조합 분포 (§17 기대값의 근거)
const expectations = [];     // masterId → 공개 API 가 내놓아야 할 언어 집합
let hiddenEnRemaining = 0;
let rerenderChecked = 0, rerenderFail = 0;

for (let i = 0; i < ids.length; i += CHUNK) {
  const slice = ids.slice(i, i + CHUNK);
  const rows = (await client.query(SQL, [slice])).rows;
  const by = new Map();
  for (const r of rows) { if (!by.has(r.masterId)) by.set(r.masterId, []); by.get(r.masterId).push(r); }

  for (const masterId of slice) {
    const p = plan.get(masterId);
    const rs = by.get(masterId) ?? [];
    const koCanon = rs.filter((r) => r.lang === 'ko' && r.status === 'canonical');
    const enCanon = rs.filter((r) => r.lang === 'en' && r.status === 'canonical');
    hiddenEnRemaining += rs.filter((r) => r.lang === 'en' && r.status === 'hidden').length;

    let verdict;
    if (koCanon.length !== 1 || koCanon[0].md5 !== p.expectedKoHash) verdict = 'KO_DRIFT';
    else if (enCanon.length > 1) verdict = 'MULTI_CANONICAL';
    else if (enCanon.length === 0) verdict = 'NOT_APPLIED';
    else if (enCanon[0].md5 === p.productionEnHash) verdict = 'APPLIED';
    else verdict = 'HASH_MISMATCH';

    verdictTally[verdict] = (verdictTally[verdict] ?? 0) + 1;
    if (verdict !== 'APPLIED' && verdict !== 'NOT_APPLIED' && problems.length < 100) {
      problems.push({ masterId, itemSeq: p.itemSeq, verdict, planAction: p.action, enCanon: enCanon.map((r) => ({ id: r.descId, md5: r.md5 })), expectedEnHash: p.productionEnHash });
    }

    // ProductLandingService 와 **같은 정렬 계약**: ko 를 맨 앞에, 나머지는 localeCompare.
    const langs = [...new Set(rs.filter((r) => r.status === 'canonical').map((r) => r.lang))]
      .sort((a, b) => (a === 'ko' ? -1 : b === 'ko' ? 1 : a.localeCompare(b)));
    const key = langs.join('+') || '(none)';
    langTally[key] = (langTally[key] ?? 0) + 1;
    expectations.push({ masterId, itemSeq: p.itemSeq, expectedLanguages: langs, verdict });

    if (RERENDER && verdict === 'APPLIED' && koCanon[0].koContent) {
      rerenderChecked++;
      try {
        const r = renderEnHtml(koCanon[0].koContent, segs.get(masterId));
        const rt = verifyRoundTrip(r.html, r.nodeTexts);
        if (!rt.ok || md5(r.html) !== enCanon[0].md5) throw new Error(rt.ok ? '해시 불일치' : rt.reason);
      } catch (e) {
        rerenderFail++;
        if (problems.length < 100) problems.push({ masterId, verdict: 'RERENDER_MISMATCH', reason: String(e.message || e) });
      }
    }
  }
  process.stderr.write(`${TAG} ${Math.min(i + CHUNK, ids.length)}/${ids.length}\n`);
}
await client.end();

const total = Object.values(verdictTally).reduce((a, b) => a + b, 0);
fs.writeFileSync(path.join(RESULTS, `live-expectations-${TAG}.jsonl`), expectations.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
const out = {
  wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-LIVE-APPLY-AND-PUBLIC-VERIFY-V1',
  step: `live-post-verify(${TAG})`,
  planRows: plan.size,
  verified: total,
  reconciled: total === plan.size,
  verdictTally,
  hiddenEnRemaining,
  languageCombinations: langTally,
  rerender: RERENDER ? { checked: rerenderChecked, failed: rerenderFail } : 'skipped',
  problems: problems.slice(0, 30),
  dbWrites: 0,
};
fs.writeFileSync(path.join(RESULTS, `live-post-verify-${TAG}-result.json`), JSON.stringify({ ...out, problems }, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(out, null, 2));
