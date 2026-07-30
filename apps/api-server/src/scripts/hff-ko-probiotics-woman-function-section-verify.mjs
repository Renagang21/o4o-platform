/**
 * 독립검증 (별도 read-only 세션) + 렌더 확인 + corpus 보호 감사.
 * rollback manifest 의 해시만 신뢰하고 DB 를 다시 읽어 판정한다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';
import { chromium } from 'playwright';

const D = 'apps/api-server/src/scripts/data';
const RB = JSON.parse(fs.readFileSync(`${D}/hff-ko-probiotics-woman-function-section-rollback-manifest-v1.json`, 'utf8'));
const OUT = `${D}/hff-ko-probiotics-woman-function-section-independent-verification-v1.json`;
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const dense = (s) => (s ?? '').replace(/&nbsp;/g, '').replace(/[\s 　]/g, '');
const t = RB.targets[0];

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5493', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

const now = (await c.query(`
  SELECT id, master_id, content, source_type, status, language, description_type, updated_at, deleted_at
  FROM shared_product_descriptions WHERE id = $1`, [t.canonicalId])).rows[0];
const cand = (await c.query(`
  SELECT id, matched_product_master_id, candidate_status, raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
  FROM product_candidates WHERE id = $1`, [t.candidateId])).rows[0];
const cur = now?.content ?? '';

const storage = {
  newHashMatch: sha(cur) === t.newContentHash,
  oldHashRemains: sha(cur) === t.oldContentHash,
  attrsOk: !!now && !now.deleted_at && now.master_id === t.productMasterId && now.status === 'canonical'
    && now.description_type === 'STORE' && (now.language ?? 'ko') === 'ko' && now.source_type === 'o4o_hff_generated',
  candidateLinkOk: cand?.matched_product_master_id === t.productMasterId,
  candidateSourceUnchanged: dense(cand?.fn ?? '') === dense(RB.targets[0].oldContent ? cand.fn : ''),
};

// 내용 검증 — 삽입 절이 목록 항목으로 존재하고 원문 verbatim, sd-intro 무변경
const introOld = t.oldContent.match(/<p class="sd-intro">[\s\S]*?<\/p>/)?.[0] ?? null;
const introNew = cur.match(/<p class="sd-intro">[\s\S]*?<\/p>/)?.[0] ?? null;
const fnBlock = cur.match(/<h2>공식 인정 기능성<\/h2><ul class="sd-why">([\s\S]*?)<\/ul>/);
const items = fnBlock ? [...fnBlock[1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => m[1].trim()) : [];
const content = {
  functionSectionPresent: !!fnBlock,
  headingIsFamilyVocab: cur.includes('<h2>공식 인정 기능성</h2>'),
  driverVocabNotIntroduced: !cur.includes('<h2>주요 기능성</h2>'),
  clauseItems: items,
  clauseCount: items.length,
  clauseExpected: t.insertedClauses.length,
  allClausesVerbatimInSource: t.insertedClauses.every((x) => dense(cand?.fn ?? '').includes(dense(x))),
  sdIntroUnchanged: introOld === introNew,
  footUnchanged: (t.oldContent.match(/<div class="sd-foot">[\s\S]*?<\/div>/)?.[0] ?? '#A') === (cur.match(/<div class="sd-foot">[\s\S]*?<\/div>/)?.[0] ?? '#B'),
  headingOrder: [...cur.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => m[1]),
  oldHeadingsAllKept: [...t.oldContent.matchAll(/<h2>[\s\S]*?<\/h2>/g)].map((m) => m[0]).every((h) => cur.includes(h)),
  outsideBlockIdentical: (() => {
    const at = t.oldContent.indexOf('<h2>섭취방법');
    const blk = t.insertedBlock;
    const i = cur.indexOf(blk);
    if (i < 0) return false;
    return cur.slice(0, i) === t.oldContent.slice(0, at) && cur.slice(i + blk.length).replace(/^\s*/, '') === t.oldContent.slice(at);
  })(),
};

// corpus 보호
const g = (await c.query(`
  SELECT
    (SELECT count(*)::int FROM shared_product_descriptions WHERE deleted_at IS NULL) AS spd_all,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL) AS spd_store_ko,
    (SELECT count(*)::int FROM shared_product_descriptions WHERE source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL AND NOT (content ~ '<h2>[^<]*기능성[^<]*</h2>')) AS without_fn_section,
    (SELECT count(DISTINCT pc.id)::int FROM product_candidates pc
      JOIN shared_product_descriptions s ON s.master_id = pc.matched_product_master_id
      WHERE pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
        AND s.description_type='STORE' AND s.status='canonical' AND coalesce(s.language,'ko')='ko' AND s.deleted_at IS NULL) AS hff_canonical`)).rows[0];
const other = (await c.query(`
  SELECT count(*)::int c FROM shared_product_descriptions
  WHERE updated_at >= $1 AND id <> $2`, [RB.builtAt, t.canonicalId])).rows[0].c;
await c.end();

// 렌더
const css = fs.readFileSync('packages/content-editor/src/components/ContentRenderer.tsx', 'utf8').match(/const storeDescriptionCss = `([\s\S]*?)`;/)?.[1] ?? '';
const browser = await chromium.launch();
const widths = [];
for (const w of [430, 820, 1280]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.setContent(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;font-family:system-ui,sans-serif}${css}</style></head><body><div class="store-desc-content">${cur}</div></body></html>`, { waitUntil: 'load' });
  widths.push({ width: w, ...(await page.evaluate((cls) => {
    const de = document.documentElement, vw = de.clientWidth;
    let clipped = 0, elemOverflow = 0;
    for (const el of document.querySelectorAll('.sd-card *')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.right > vw + 1 || r.left < -1) elemOverflow++;
      const s = getComputedStyle(el);
      if ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && s.overflow === 'hidden') clipped++;
    }
    const text = document.body.innerText;
    return { pageOverflow: de.scrollWidth > de.clientWidth + 1, elemOverflow, clipped,
      headings: [...document.querySelectorAll('h2')].map((h) => h.textContent.trim()),
      clausesAsItems: [...document.querySelectorAll('li')].map((n) => n.textContent.trim()).filter((x) => cls.includes(x)).length,
      rawBracketVisible: /[\[\]]/.test(text), emptyItem: [...document.querySelectorAll('li')].some((n) => !n.textContent.trim()) };
  }, t.insertedClauses)) });
  await page.close();
}
await browser.close();
const render = { widths, allOk: widths.every((x) => !x.pageOverflow && x.elemOverflow === 0 && x.clipped === 0 && !x.emptyItem && !x.rawBracketVisible && x.clausesAsItems === t.insertedClauses.length) };

const fail = [];
if (!storage.newHashMatch) fail.push('newHashMismatch');
if (storage.oldHashRemains) fail.push('oldHashRemains');
if (!storage.attrsOk) fail.push('attrDrift');
if (!storage.candidateLinkOk) fail.push('candidateDrift');
for (const k of ['functionSectionPresent','headingIsFamilyVocab','driverVocabNotIntroduced','allClausesVerbatimInSource','sdIntroUnchanged','footUnchanged','oldHeadingsAllKept','outsideBlockIdentical']) if (!content[k]) fail.push(`content.${k}`);
if (content.clauseCount !== content.clauseExpected) fail.push('clauseCountMismatch');
if (!render.allOk) fail.push('renderFail');
if (g.without_fn_section !== 825) fail.push(`withoutFnSectionExpected825got${g.without_fn_section}`);
if (g.hff_canonical !== 40913) fail.push(`hffCanonicalExpected40913got${g.hff_canonical}`);
if (other !== 0) fail.push(`otherRowsUpdatedInWindow=${other}`);

const out = { verifiedAt: new Date().toISOString(), readOnlySession: true, storage, content, render,
  corpus: { ...g, otherRowsUpdatedSinceManifest: other, expectedWithoutFnSection: 825, expectedHffCanonical: 40913 },
  verdict: fail.length ? 'FAIL' : 'PASS', failedChecks: fail };
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, content: { ...out.content, clauseItems: out.content.clauseItems } }, null, 2));
