/**
 * rollback 역연산 정밀화.
 *
 * 최초 계약은 `이런 분께` section 재삽입 위치를 `</div><div class="sd-foot">` 직전으로 가정했으나,
 * 문서 271건은 해당 section 이 sd-body 의 마지막 요소가 아니어서 복원이 실패했다.
 * → AUD 대상 전량에 대해 **재삽입 offset 을 실측·해시 검증**하여 manifest 에 고정한다.
 * read-only (DB write 0).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const RB = `${D}/hff-ko-why-family-policy-cleanup-rollback-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const rb = JSON.parse(fs.readFileSync(RB, 'utf8'));

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5496', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const ids = rb.targets.map((t) => t.canonicalId);
const now = new Map();
for (let i = 0; i < ids.length; i += 1000) {
  for (const r of (await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)`, [ids.slice(i, i + 1000)])).rows) now.set(r.id, r.content);
}
await c.end();

let ok = 0, fixed = 0, stillFail = 0;
const failList = [];
for (const t of rb.targets) {
  const cur = now.get(t.canonicalId) ?? '';
  // 1) FOOT · FN 역연산
  let base = cur;
  if (t.footerClauseAdded) base = base.replace(' ' + t.footerClauseAdded, '');
  if (t.fnInsertedBlock) base = base.replace(t.fnInsertedBlock, '');
  if (!t.audienceRemovedHtml) {
    if (sha(base) === t.oldContentHash) { ok++; t.reversalVerified = true; }
    else { stillFail++; failList.push(t.canonicalId); t.reversalVerified = false; }
    continue;
  }
  // 2) AUD 재삽입 offset 을 탐색해 해시로 확정
  let found = -1;
  // 후보: `</div>` 경계 + 원래 section 이 있던 자리 추정
  const cands = [];
  { let i = base.indexOf('</div>'); while (i >= 0) { cands.push(i); i = base.indexOf('</div>', i + 1); } }
  cands.push(base.length);
  for (const pos of cands) {
    if (sha(base.slice(0, pos) + t.audienceRemovedHtml + base.slice(pos)) === t.oldContentHash) { found = pos; break; }
  }
  if (found >= 0) {
    t.audienceReinsertOffset = found;
    t.reversalVerified = true;
    if (sha(base.slice(0, found) + t.audienceRemovedHtml + base.slice(found)) === t.oldContentHash) { ok++; if (found !== base.lastIndexOf('</div><div class="sd-foot">')) fixed++; }
  } else { stillFail++; failList.push(t.canonicalId); t.reversalVerified = false; }
}

rb.reversalContract = {
  FN: 'fnInsertedBlock 을 content 에서 제거',
  FOOT: "footerClauseAdded 를 ' '+clause 형태로 제거",
  AUD: 'audienceRemovedHtml 을 audienceReinsertOffset 위치에 삽입 (offset 은 해시 검증으로 확정된 값)',
  order: 'FOOT → FN → AUD',
  verify: '역연산 후 sha256 == oldContentHash',
};
rb.reversalVerification = { total: rb.targets.length, verified: ok, offsetCorrected: fixed, failed: stillFail, failedIds: failList.slice(0, 20) };
fs.writeFileSync(RB, JSON.stringify(rb, null, 1));
console.log(JSON.stringify({ total: rb.targets.length, verified: ok, offsetCorrected: fixed, stillFail, failedSample: failList.slice(0, 5) }, null, 2));
