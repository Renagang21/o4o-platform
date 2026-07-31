/**
 * 독립 검증 — 적용 스크립트의 내부 상태를 신뢰하지 않고 DB 를 처음부터 재측정한다. (read-only)
 * 근거 자료: rollback manifest 의 newContentHash / oldContentHash 만 사용.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const HFF = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL`;
const KO = `${HFF} AND coalesce(language,'ko')='ko'`;
const EN = `${HFF} AND language='en'`;
const EN_CLAUSE = '· This health functional food is not a drug for preventing or treating disease; consult a pharmacist or professional in store';

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5463', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', statement_timeout: 900000 });
await c.connect();
await c.query('SET default_transaction_read_only = on');
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const counts = (await c.query(`
  SELECT (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) spd_all,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO}) ko_total,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO} AND content LIKE '%이런 분께%') ko_audience,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO} AND content NOT LIKE '%매장 내 약사 등 전문가%') ko_no_expert,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${KO} AND content !~ '<h2>[^<]*기능성[^<]*</h2>') ko_no_fn,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${EN}) en_total,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${EN} AND content LIKE '%class="sd-who"%') en_who,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${EN} AND position($1 in content) > 0) en_expert_exact,
         (SELECT count(*)::int FROM shared_product_descriptions WHERE ${EN} AND content !~* '<h2>[^<]*function[^<]*</h2>') en_no_fn`, [EN_CLAUSE])).rows[0];

/** 적용 대상 전건 해시 재검증 (DB 실측 vs manifest) */
async function verifyManifest(file, expectLang) {
  const rb = JSON.parse(fs.readFileSync(`${D}/${file}`, 'utf8'));
  const targets = rb.targets;
  let ok = 0, mismatch = 0, missing = 0, stillOld = 0;
  for (let i = 0; i < targets.length; i += 500) {
    const chunk = targets.slice(i, i + 500);
    const got = new Map((await c.query(`SELECT id, content, language FROM shared_product_descriptions WHERE id = ANY($1) AND deleted_at IS NULL`, [chunk.map((t) => t.canonicalId)])).rows.map((r) => [r.id, r]));
    for (const t of chunk) {
      const r = got.get(t.canonicalId);
      if (!r) { missing++; continue; }
      const h = sha(r.content);
      if (h === t.newContentHash) ok++;
      else if (h === t.oldContentHash) { stillOld++; mismatch++; }
      else mismatch++;
    }
  }
  return { file, targets: targets.length, matchesNewHash: ok, stillOldHash: stillOld, mismatch, missing, verdict: ok === targets.length && mismatch === 0 && missing === 0 ? 'PASS' : 'FAIL' };
}

const manifests = [
  await verifyManifest('hff-ko-composite-variant-127-rollback-v1.json', 'ko'),
  await verifyManifest('hff-ko-residual-13-rollback-v1.json', 'ko'),
  await verifyManifest('hff-en-parity-rollback-v1.json', 'en'),
];

/* EN 문서에 한글 기능성 문구가 유입되지 않았는지 — 삽입 블록 대상 2건 실측 */
const fnIds = JSON.parse(fs.readFileSync(`${D}/hff-en-parity-targets-v1.json`, 'utf8')).targetsIndex.filter((t) => t.ops.includes('FN')).map((t) => t.canonicalId);
const fnRows = fnIds.length ? (await c.query(`SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)`, [fnIds])).rows : [];
const fnCheck = fnRows.map((r) => {
  const m = r.content.match(/<h2>Officially recognised functions<\/h2><ul class="sd-why">([\s\S]*?)<\/ul>/);
  return { id: r.id, sectionPresent: !!m, koreanInSection: m ? /[가-힣]/.test(m[1]) : null };
});

/* 최종 큐 v2 무결성 */
const q = fs.readFileSync(`${D}/hff-final-review-queue-v2.jsonl`, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const qIds = q.map((r) => r.canonicalId);
const liveQ = new Set((await c.query(`SELECT id FROM shared_product_descriptions WHERE id = ANY($1) AND deleted_at IS NULL`, [qIds])).rows.map((r) => r.id));
await c.end();

const expected = { spd_all: 120118, ko_total: 40913, ko_audience: 0, ko_no_expert: 0, ko_no_fn: 2,
  en_total: 15498, en_who: 0, en_expert_exact: 15498, en_no_fn: 824 };
const countChecks = Object.fromEntries(Object.entries(expected).map(([k, v]) => [k, { expected: v, actual: counts[k], ok: counts[k] === v }]));
const out = { ranAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  wo: 'WO-O4O-HFF-MULTILINGUAL-AUTHORING-CONTRACT-PARITY-AND-RESIDUAL-CLEANUP-V1',
  countChecks, manifests,
  enFunctionInsertCheck: { docs: fnCheck.length, allPresent: fnCheck.every((x) => x.sectionPresent), koreanLeak: fnCheck.filter((x) => x.koreanInSection).length, detail: fnCheck },
  finalQueue: { rows: q.length, uniqueIds: new Set(qIds).size, allRowsExistInDb: liveQ.size === new Set(qIds).size, missingInDb: new Set(qIds).size - liveQ.size },
  verdict: Object.values(countChecks).every((x) => x.ok) && manifests.every((m) => m.verdict === 'PASS')
    && fnCheck.every((x) => x.sectionPresent && !x.koreanInSection)
    && q.length === new Set(qIds).size && liveQ.size === new Set(qIds).size ? 'PASS' : 'FAIL' };
fs.writeFileSync(`${D}/hff-wo-independent-verification-v1.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 2));
