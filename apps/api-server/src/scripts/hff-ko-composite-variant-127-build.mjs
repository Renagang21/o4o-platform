/**
 * WO-O4O-HFF-MULTILINGUAL-AUTHORING-CONTRACT-PARITY-AND-RESIDUAL-CLEANUP-V1
 * Phase 1-B — ko COMPOSITE 변종 127 patch 생성 (read-only, DB write 0).
 *
 * 직전 WO(`hff-ko-why-family-policy-build.mjs`)는 family 를 `왜 이 제품인가` 문자열로
 * 판정해 이 127건을 통째로 누락했다. 여기서는 **h2 시그널 집합**으로 family 를 재판정하고,
 * 동일한 AUD/FOOT patch 계약을 그대로 재사용한다. 기능성 섹션은 127건 전량 이미 존재하므로
 * FN 작업은 없다(공식 근거 없는 기능성 문구를 생성하지 않는다).
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const OUT_T = `${D}/hff-ko-composite-variant-127-targets-v1.json`;
const OUT_RB = `${D}/hff-ko-composite-variant-127-rollback-v1.json`;
const OUT_HR = `${D}/hff-ko-composite-variant-127-human-review-v1.jsonl`;
const TMP = `${D}/tmp-hff-composite127-newcontent.json`;

const sha = (s) => crypto.createHash('sha256').update(s ?? '', 'utf8').digest('hex');
const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why','sd-func','is-solid']);

const KO = `source_type='o4o_hff_generated' AND description_type='STORE' AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL`;
const EXPERT_PHRASE = '매장 내 약사 등 전문가';
// 직전 WO 와 **동일한** 표준 절 (신규 문구를 만들지 않는다)
const STD_CLAUSE = '· 건강기능식품은 질병의 예방·치료를 위한 의약품이 아니며, 궁금한 점은 매장 내 약사 등 전문가와 상담하십시오';
const WHO_RE = /<h2>이런 분께<\/h2><ul class="sd-who">[\s\S]*?<\/ul>/;
const FOOT_END_RE = /<div class="sd-foot"><b>[^<]*<\/b>([\s\S]*?)<\/div><\/div>$/;

// renderer family 판정 = h2 시그널 집합 (공유 class 존재로 판정 금지)
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
if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') { console.error('NOT_READ_ONLY'); process.exit(1); }

const scope = (await c.query(`
  SELECT count(*)::int ko_total,
         count(*) FILTER (WHERE content NOT LIKE '%왜 이 제품인가%')::int non_wae,
         count(*) FILTER (WHERE content LIKE '%<h2>이런 분께</h2>%')::int audience_all,
         count(*) FILTER (WHERE content NOT LIKE '%${EXPERT_PHRASE}%')::int no_expert_all
  FROM shared_product_descriptions WHERE ${KO}`)).rows[0];

const rows = (await c.query(`
  SELECT spd.id canonical_id, spd.master_id, spd.content,
         pc.id candidate_id,
         pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
         pc.raw_payload::jsonb->'source'->>'PRDUCT' name
  FROM shared_product_descriptions spd
  LEFT JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
    AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
  WHERE ${KO.replace(/\b(content|source_type|description_type|status|language|deleted_at)\b/g, 'spd.$1')}
    AND spd.content NOT LIKE '%왜 이 제품인가%'
    AND (spd.content LIKE '%<h2>이런 분께</h2>%' OR spd.content NOT LIKE '%${EXPERT_PHRASE}%')
  ORDER BY spd.id`)).rows;
await c.end();

const targets = [], hr = [], comboTally = {}, famTally = {};
let removedAudience = 0, addedFooter = 0;

for (const r of rows) {
  const ko = r.content;
  const family = familyOf(ko);
  famTally[family] = (famTally[family] ?? 0) + 1;
  if (family !== 'COMPOSITE') {
    hr.push(JSON.stringify({ canonicalId: r.canonical_id, candidateId: r.candidate_id, statementNo: r.stmt,
      productName: r.name, status: 'BLOCKED_FAMILY_NOT_COMPOSITE', reason: `MEASURED_FAMILY=${family}`,
      h2: h2sOf(ko), nextAction: 'RENDERER_FAMILY_HUMAN_REVIEW' }));
    continue;
  }

  const needAud = ko.includes('<h2>이런 분께</h2>');
  const needFoot = !ko.includes(EXPERT_PHRASE);
  let cur = ko; const ops = []; let removedHtml = null;

  if (needAud) {
    const m = cur.match(WHO_RE);
    if (m) { removedHtml = m[0]; cur = cur.replace(WHO_RE, ''); ops.push('AUD'); }
  }
  if (needFoot && FOOT_END_RE.test(cur) && !cur.includes(EXPERT_PHRASE)) {
    cur = cur.replace(/<\/div><\/div>$/, ` ${STD_CLAUSE}</div></div>`);
    ops.push('FOOT');
  }
  if (!ops.length) {
    hr.push(JSON.stringify({ canonicalId: r.canonical_id, statementNo: r.stmt, productName: r.name,
      status: 'BLOCKED_STRUCTURE', reason: 'NO_APPLICABLE_OP', nextAction: 'STRUCTURE_REVIEW' }));
    continue;
  }

  const introRe = /<p class="sd-intro">[\s\S]*?<\/p>/;
  const undefOf = (s) => [...s.matchAll(/class="([^"]+)"/g)].flatMap((m2) => m2[1].split(/\s+/)).filter((x) => x && !DEFINED.has(x));
  const fnCount = (s) => (s.match(/<h2>[^<]*기능성[^<]*<\/h2>/g) ?? []).length;
  const checks = {
    audienceGone: !cur.includes('이런 분께'),
    audienceExpected: needAud ? ops.includes('AUD') : true,
    expertPresent: cur.includes(EXPERT_PHRASE),
    expertNotDuplicated: (cur.match(new RegExp(STD_CLAUSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length <= 1,
    // 기능성 섹션은 이미 존재해야 하며, 이 WO 에서 새로 만들거나 늘리지 않는다
    fnSectionPresent: fnCount(cur) >= 1,
    fnSectionCountUnchanged: fnCount(cur) === fnCount(ko),
    fnSectionTextUnchanged: (ko.match(/<h2>[^<]*기능성[^<]*<\/h2>[\s\S]*?(?=<h2>|<div class="sd-foot">)/)?.[0] ?? null)
      === (cur.match(/<h2>[^<]*기능성[^<]*<\/h2>[\s\S]*?(?=<h2>|<div class="sd-foot">)/)?.[0] ?? null),
    introUnchanged: (ko.match(introRe)?.[0] ?? null) === (cur.match(introRe)?.[0] ?? null),
    // COMPOSITE 시그널 h2 보존 (왜-family 의 waeKept 에 대응)
    compositeSignalsKept: ['섭취방법 (공식 표기 그대로)', '표시 기준'].every((h) => h2sOf(cur).includes(h)),
    footWrapperKept: /<div class="sd-foot">/.test(cur),
    noNewUndefinedClass: undefOf(cur).length <= undefOf(ko).length,
    balanced: ['div','ul','li','span','p','h1','h2','b','small'].every((t) =>
      (cur.match(new RegExp(`<${t}[\\s>]`, 'g')) ?? []).length === (cur.match(new RegExp(`</${t}>`, 'g')) ?? []).length),
    noEmpty: !/<li>\s*<\/li>|<ul[^>]*>\s*<\/ul>|<h2>\s*<\/h2>|<div class="sd-item">\s*<\/div>/.test(cur),
    driverVocabNotIntroduced: !cur.includes('<h2>주요 기능성</h2>'),
    endsWell: /<\/div><\/div>$/.test(cur),
    changed: cur !== ko,
    // patch 는 삽입/삭제 전용 — 그 외 본문 텍스트가 바뀌지 않았음을 역연산으로 증명
    reversible: (() => {
      let back = cur;
      if (ops.includes('FOOT')) back = back.replace(new RegExp(` ${STD_CLAUSE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</div></div>$`), '</div></div>');
      if (ops.includes('AUD')) back = back.replace(/<\/div><div class="sd-foot">/, `${removedHtml}</div><div class="sd-foot">`);
      return sha(back) === sha(ko);
    })(),
  };
  const bad = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  if (bad.length) {
    hr.push(JSON.stringify({ canonicalId: r.canonical_id, statementNo: r.stmt, productName: r.name,
      status: 'BLOCKED_STRUCTURE', reason: 'POST_CHECK_FAIL:' + bad.join(','), nextAction: 'STRUCTURE_REVIEW' }));
    continue;
  }

  const combo = ops.join('+');
  comboTally[combo] = (comboTally[combo] ?? 0) + 1;
  if (ops.includes('AUD')) removedAudience++;
  if (ops.includes('FOOT')) addedFooter++;
  targets.push({
    canonicalId: r.canonical_id, productMasterId: r.master_id, candidateId: r.candidate_id,
    statementNo: r.stmt, productName: r.name, rendererFamily: family, rendererFamilySource: 'MEASURED_H2_SIGNALS',
    ops, combo, oldContentHash: sha(ko), newContentHash: sha(cur),
    oldLength: ko.length, newLength: cur.length,
    audienceRemovedHtml: removedHtml, footerClauseAdded: ops.includes('FOOT') ? STD_CLAUSE : null,
    newContent: cur,
  });
}

const dup = targets.length - new Set(targets.map((t) => t.canonicalId)).size;
const meta = {
  builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  wo: 'WO-O4O-HFF-MULTILINGUAL-AUTHORING-CONTRACT-PARITY-AND-RESIDUAL-CLEANUP-V1',
  phase: '1 — ko COMPOSITE 변종 family 판정 교정 + 정책 patch',
  scopeMeasured: scope, candidateRows: rows.length,
  familyTally: famTally, targets: targets.length, canonicalIdDup: dup, comboTally,
  effects: { audienceSectionsRemoved: removedAudience, footerClausesAdded: addedFooter, functionSectionsInserted: 0, functionClausesRestored: 0 },
  standardExpertClause: STD_CLAUSE,
};
fs.writeFileSync(OUT_T, JSON.stringify({ ...meta, targetsIndex: targets.map(({ newContent, ...x }) => x) }, null, 1));
fs.writeFileSync(OUT_RB, JSON.stringify({ ...meta,
  expectedUpdate: targets.length,
  reversalContract: {
    AUD: 'audienceRemovedHtml 을 sd-body 종료 </div> 앞(sd-foot 직전)에 재삽입',
    FOOT: "footerClauseAdded 를 ' '+clause 형태로 content 말미에서 제거",
    verify: '역연산 후 sha256 == oldContentHash (build 단계 reversible 체크로 전건 증명 완료)',
  },
  targets: targets.map(({ newContent, ...x }) => x) }, null, 1));
fs.writeFileSync(OUT_HR, hr.join('\n') + (hr.length ? '\n' : ''));
fs.writeFileSync(TMP, JSON.stringify(targets.map((t) => ({ canonicalId: t.canonicalId, productMasterId: t.productMasterId, oldContentHash: t.oldContentHash, newContentHash: t.newContentHash, newContent: t.newContent })), null, 0));

console.log(JSON.stringify({ ...meta, humanReviewLines: hr.length }, null, 2));
