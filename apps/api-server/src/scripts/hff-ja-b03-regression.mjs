/**
 * WO-O4O-HFF-JA-ALL-CURRENTLY-PRODUCIBLE-7414-DIRECT-BULK-PRODUCTION-V1  §7 공용 엔진·자산 변경 회귀검증
 *
 * 공용 엔진·자산이 바뀌면 **이미 저장된 JA 20,000 건**(Batch 01 + 02)이 영향을 받을 수 있다.
 * 이 WO 는 자산을 동결하고 진행하지만, 동결이 실제로 지켜졌는지도 이 검사로 확인된다.
 * DB read-only 로 다음 셋만 본다.
 *   - 저장된 기존 canonical 수정 0  : 저장 본문 해시 == 각 배치 렌더 통과 본문 해시
 *   - 생산 가능성 악화 0            : 현재 엔진으로 다시 build 했을 때 여전히 전량 생산 가능
 *   - 구조 차이 0                   : 재생산본의 구조 패리티가 KO·저장본과 동일
 *
 * 본문 문구가 달라지는 것은 회귀가 아니다 — 사전이 넓어지면 더 자연스러운 표기로 바뀔 수 있고,
 * 저장된 행은 이 WO 에서 건드리지 않는다. 회귀는 **구조·생산 가능성·저장본 무결성** 으로만 판정한다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { build, parityBreak, PARITY } from './hff-ja-b01-build.mjs';
import { clearMemo } from './hff-ja-b01-translate.mjs';

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
/* 저장된 JA 는 Batch 01 + Batch 02 = 20,000 건이다. 둘 다 대조 기준에 넣는다. */
const B01 = [
  ...JSON.parse(fs.readFileSync(`${D}/hff-ja-b01-safe-targets-v1.json`, 'utf8')).targets,
  ...JSON.parse(fs.readFileSync(`${D}/hff-ja-b02-safe-targets-v1.json`, 'utf8')).targets,
];
const expectHash = new Map(B01.map((t) => [t.productMasterId, t.newContentHash]));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const masters = B01.map((t) => t.productMasterId);
const stored = new Map((await c.query(`
  SELECT master_id, content FROM shared_product_descriptions
   WHERE master_id = ANY($1::uuid[]) AND deleted_at IS NULL AND language='ja'
     AND description_type='STORE' AND status='canonical' AND source_type='o4o_hff_generated'`,
[masters])).rows.map((r) => [r.master_id, r.content]));
const koRows = (await c.query(`
  SELECT master_id, content FROM shared_product_descriptions
   WHERE master_id = ANY($1::uuid[]) AND deleted_at IS NULL AND coalesce(language,'ko')='ko'
     AND description_type='STORE' AND status='canonical' AND source_type='o4o_hff_generated'`,
[masters])).rows;
await c.end();

const cnt = (h, re) => (h.match(re) ?? []).length;
let storedModified = 0, storedMissing = 0, notProducible = 0, structureDiff = 0, parityBroken = 0;
const samples = [];
for (const r of koRows) {
  const s = stored.get(r.master_id);
  if (s === undefined) { storedMissing++; continue; }
  if (sha(s) !== expectHash.get(r.master_id)) {
    storedModified++;
    if (samples.length < 5) samples.push({ m: r.master_id, why: 'STORED_MODIFIED' });
  }
  const b = build(r.content);
  if (b.misses.length || b.hangul || b.simplified) {
    notProducible++;
    if (samples.length < 10) samples.push({ m: r.master_id, why: 'NOT_PRODUCIBLE', miss: b.misses[0]?.text?.slice(0, 60) });
    continue;
  }
  if (parityBreak(r.content, b.html)) { parityBroken++; continue; }
  /* 저장본 대비 구조 차이 — 태그·class 개수는 재생산해도 동일해야 한다. */
  for (const [re, name] of PARITY) {
    if (cnt(s, re) !== cnt(b.html, re)) {
      structureDiff++;
      if (samples.length < 15) samples.push({ m: r.master_id, why: 'STRUCTURE_DIFF', at: name });
      break;
    }
  }
}
clearMemo();

const out = {
  wo: 'WO-O4O-HFF-JA-ALL-CURRENTLY-PRODUCIBLE-7414-DIRECT-BULK-PRODUCTION-V1',
  checkedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  scope: 'batch01+batch02 stored JA canonical', documents: koRows.length, storedFound: stored.size,
  storedModified, storedMissing, notProducible, structureDiff, parityBroken, samples,
  verdict: (!storedModified && !storedMissing && !notProducible && !structureDiff && !parityBroken
    && koRows.length === B01.length) ? 'PASS' : 'FAIL',
};
fs.writeFileSync(`${D}/hff-ja-b03-regression-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
