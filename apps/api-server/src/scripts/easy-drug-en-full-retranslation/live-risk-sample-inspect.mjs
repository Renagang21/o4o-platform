/**
 * WO-...-LIVE-APPLY-AND-PUBLIC-VERIFY-V1 §19 대체 검사 (read-only, DB write 0).
 *
 * ⚠️ 이 스크립트는 **브라우저 smoke 가 아니다.** 이번 세션에는 브라우저 자동화 도구가 없어
 * §19 를 명세대로 수행할 수 없다. 대신 위험 범주별 표본의 **실제 공개 API 응답 HTML** 을 받아
 * 구조 무결성을 기계 검사한다. 화면 렌더(폰트·레이아웃·CSS 적용)는 확인하지 못한다.
 *
 * 검사 항목(표본당):
 *   TAG_BALANCE       열고 닫는 태그 수 일치 (직렬화가 마크업을 깨지 않았는가)
 *   SD_CLASSES        sd-* 클래스 보존 (렌더러 디자인 시스템 훅)
 *   EN_HEADINGS       h2 섹션 제목이 en-frame 고정 어휘로 번역되어 있는가
 *   NO_KO_IN_BODY     본문(BODY)에 한글 잔존 없음 — 고정 식별자(제품명·제조사)는 한글이 정상
 *   FOOTER_PRESENT    약사 문의 안내 문장 유지 (콘텐츠 작성 불변 원칙)
 */
import fs from 'node:fs';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import pg from 'pg';
import { RESULTS, EN_UNITS_PATH } from './tm-lib.mjs';
import { SECTION_TITLE, FOOTER } from './en-frame.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const PORT = parseInt(arg('--port', '15501'), 10);
const BASE = arg('--base', 'https://api.neture.co.kr');

function* streamJsonl(file) {
  const fd = fs.openSync(file, 'r');
  const dec = new StringDecoder('utf8');
  try {
    const buf = Buffer.alloc(1 << 20); let tail = '';
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null);
      if (!n) break;
      const ls = (tail + dec.write(buf.subarray(0, n))).split('\n');
      tail = ls.pop() ?? '';
      for (const l of ls) if (l.trim()) yield JSON.parse(l);
    }
    tail += dec.end();
    if (tail.trim()) yield JSON.parse(tail);
  } finally { fs.closeSync(fd); }
}

const plan = new Map();
for (const r of streamJsonl(path.join(RESULTS, 'live-apply-plan.jsonl'))) plan.set(r.masterId, r);

// 위험 범주 선정 — 투여경로·수치밀도·길이·신규삽입 등 서로 다른 실패 양상을 노린다.
const RULES = [
  ['topical_apply', (t) => /\bapply|applied\b/i.test(t)],
  ['inhalation', (t) => /\binhal/i.test(t)],
  ['injection', (t) => /\binject/i.test(t)],
  ['ophthalmic', (t) => /\beye|ophthalmic|conjunctiv/i.test(t)],
  ['vaginal', (t) => /\bvagina/i.test(t)],
  ['oromucosal_gargle', (t) => /\bgargle|mouth|oral cavity|oromucosal/i.test(t)],
  ['rectal', (t) => /\brectal|suppositor/i.test(t)],
  ['math_gt', (t) => t.includes('>')],
];
const picks = new Map();   // category → {masterId, itemSeq}
const chosen = new Set();  // 한 master 가 여러 범주를 채우면 표본 다양성이 사라진다
const byLen = [];
const segsBy = new Map();
for (const u of streamJsonl(EN_UNITS_PATH)) {
  const p = plan.get(u.masterId);
  if (!p) continue;
  const joined = u.segments.map((s) => s.text).join(' ');
  byLen.push({ masterId: u.masterId, itemSeq: u.itemSeq, len: joined.length, action: p.action, digits: (joined.match(/\d/g) || []).length });
  for (const [name, fn] of RULES) {
    if (picks.has(name) || chosen.has(u.masterId) || !fn(joined)) continue;
    picks.set(name, { masterId: u.masterId, itemSeq: u.itemSeq, category: name });
    chosen.add(u.masterId);
  }
}
byLen.sort((a, b) => b.len - a.len);
picks.set('longest_content', { ...byLen[0], category: 'longest_content' });
picks.set('shortest_content', { ...byLen[byLen.length - 1], category: 'shortest_content' });
const numericHeavy = [...byLen].sort((a, b) => b.digits - a.digits)[0];
picks.set('numeric_heavy', { ...numericHeavy, category: 'numeric_heavy' });
const created = byLen.find((x) => x.action === 'CREATE_NEW_EN');
if (created) picks.set('create_new_en', { ...created, category: 'create_new_en' });
const updated = byLen.find((x) => x.action === 'UPDATE_SINGLE_HIDDEN_EN');
if (updated) picks.set('update_hidden_en', { ...updated, category: 'update_hidden_en' });

// 선정된 표본의 세그먼트만 2차 스트림으로 모은다(전량 보관은 100MB 급이라 불필요).
const wanted = new Set([...picks.values()].map((p) => p.masterId));
for (const u of streamJsonl(EN_UNITS_PATH)) if (wanted.has(u.masterId)) segsBy.set(u.masterId, u.segments);

/* publicKey */
const client = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.PGUSER, password: process.env.PGPASSWORD, database: 'o4o_platform' });
await client.connect();
await client.query('SET default_transaction_read_only = on');
const keyBy = new Map((await client.query(
  `SELECT product_master_id::text "masterId", public_key "publicKey" FROM product_landings WHERE product_master_id = ANY($1::uuid[])`,
  [[...picks.values()].map((p) => p.masterId)])).rows.map((r) => [r.masterId, r.publicKey]));
await client.end();

const email = process.env.O4O_EMAIL, password = process.env.O4O_PASSWORD;
const loginRes = await fetch(`${BASE}/api/v1/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
if (!loginRes.ok) throw new Error(`login 실패 ${loginRes.status}`);
const cookie = (loginRes.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');

const EN_TITLES = new Set(Object.values(SECTION_TITLE));
const FOOTER_SENTENCES = Object.values(FOOTER);
const results = [];
for (const p of picks.values()) {
  const pk = keyBy.get(p.masterId);
  const res = await fetch(`${BASE}/api/v1/public/product-landings/${encodeURIComponent(pk)}?locale=en`, { headers: { cookie } });
  const html = (await res.json())?.data?.description?.content ?? '';

  const opens = [...html.matchAll(/<([a-z0-9]+)(?:\s[^>]*)?>/gi)].map((m) => m[1].toLowerCase()).filter((t) => !['br', 'hr', 'img'].includes(t));
  const closes = [...html.matchAll(/<\/([a-z0-9]+)>/gi)].map((m) => m[1].toLowerCase());
  const tally = (a) => a.reduce((m, t) => (m[t] = (m[t] ?? 0) + 1, m), {});
  const to = tally(opens), tc = tally(closes);
  const tagBalance = Object.keys({ ...to, ...tc }).every((t) => (to[t] ?? 0) === (tc[t] ?? 0));

  const h2s = [...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/gi)].map((m) => m[1].replace(/&nbsp;/g, ' ').trim());
  const enHeadings = h2s.length > 0 && h2s.every((t) => EN_TITLES.has(t));

  // 고정 식별자(제품명·제조사·품목기준코드 등)는 한글 유지가 계약이다. 마크업을 추측해 걷어내지 말고
  // **artifact 가 FIXED_IDENTITY 로 선언한 텍스트 자체**를 제거한 뒤 한글이 남는지 본다.
  const fixed = (segsBy.get(p.masterId) ?? []).filter((s) => s.kind === 'FIXED_IDENTITY').map((s) => s.text);
  let bodyOnly = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  for (const f of [...fixed].sort((a, b) => b.length - a.length)) bodyOnly = bodyOnly.split(f).join(' ');
  const koLeft = (bodyOnly.match(/[가-힣]+/g) || []);

  results.push({
    category: p.category, masterId: p.masterId, itemSeq: p.itemSeq,
    action: plan.get(p.masterId).action, htmlLength: html.length,
    TAG_BALANCE: tagBalance,
    SD_CLASSES: /class="sd-/.test(html),
    EN_HEADINGS: enHeadings,
    NO_KO_IN_BODY: koLeft.length === 0,
    koLeftoverSample: koLeft.slice(0, 6),
    FOOTER_PRESENT: FOOTER_SENTENCES.some((s) => html.includes(s)),
    h2Sample: h2s.slice(0, 4),
  });
}

const keys = ['TAG_BALANCE', 'SD_CLASSES', 'EN_HEADINGS', 'NO_KO_IN_BODY', 'FOOTER_PRESENT'];
const out = {
  wo: 'WO-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-LIVE-APPLY-AND-PUBLIC-VERIFY-V1',
  step: 'live-risk-sample-inspect',
  note: '브라우저 smoke 아님 — 브라우저 자동화 도구 부재로 §19 미수행. 공개 API 응답 HTML 의 구조 검사만 수행.',
  samples: results.length,
  passedAll: results.filter((r) => keys.every((k) => r[k])).length,
  failures: results.filter((r) => !keys.every((k) => r[k])),
  results,
  dbWrites: 0,
};
fs.writeFileSync(path.join(RESULTS, 'live-risk-sample-inspect-result.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(out, null, 2));
