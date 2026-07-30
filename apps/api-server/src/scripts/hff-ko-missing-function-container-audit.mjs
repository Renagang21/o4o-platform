/**
 * WO-O4O-HFF-KO-MISSING-FUNCTION-CONTAINER-AND-PROBIOTICS-WOMAN-RECOVERY-V1
 * 조사·제안 단계 (DB write 0 · read-only).
 *
 * 산출:
 *  1) `#35 프로바이오틱스우먼` 제안 canonical 2안 (적용하지 않음)
 *  2) 기능성 섹션 부재 canonical 전수 감사 (family 분류)
 *  3) `이런 분께` 정책 불일치 집계
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const OUT_PROPOSAL = `${D}/hff-ko-missing-function-container-35-proposal-v1.json`;
const OUT_FAMILY = `${D}/hff-ko-missing-function-container-family-audit-v1.json`;
const OUT_ABSENT = `${D}/hff-ko-missing-function-container-absent-classification-v1.json`;

const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const nrm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
const dense = (s) => (s ?? '').replace(/&nbsp;/g, '').replace(/[\s 　]/g, '');
const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5492', 10), user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');

/* ─────────────────────────────────────────────────────────────
   1) #35 제안 canonical (2안) — 적용하지 않음
   ───────────────────────────────────────────────────────────── */
const PILOT = JSON.parse(fs.readFileSync(`${D}/hff-ko-function-review-pilot-47-manual-decisions-v1.json`, 'utf8'));
const rec = PILOT.decisions.find((x) => x.pilotIndex === 35);

const cd = (await c.query(`
  SELECT id, raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn,
         raw_payload::jsonb->'source'->>'PRDUCT' name
  FROM product_candidates WHERE id = $1`, [rec.candidateId])).rows[0];
const spd = (await c.query(`SELECT id, content, updated_at FROM shared_product_descriptions WHERE id = $1`, [rec.canonicalId])).rows[0];
const ko = spd.content;

// 공식 기능성 절 추출: `[라벨①절 ②절 ③절` — 라벨은 첫 마커로 유일 확정
const rawFn = cd.fn ?? '';
const line = rawFn.replace(/\r/g, '').split('\n')[0].trim();
const body = line.startsWith('[') ? line.slice(1) : line;
const mk = body.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]/);
const label = mk ? body.slice(0, mk.index).trim() : null;
const clauses = mk
  ? body.slice(mk.index).split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])/).map((x) => x.replace(/^[①-⑮\s]*/, '').trim()).filter((x) => x.length >= 4)
  : [];
const allVerbatim = clauses.every((x) => dense(rawFn).includes(dense(x)));

// 삽입 위치: sd-intro 문단 직후(= 첫 <h2> 앞)
const firstH2 = ko.indexOf('<h2>');
const li = clauses.map((x) => `<li>${esc(x)}</li>`).join('');

/* 안 A(권장) — 이 문서가 속한 왜-family 자체 어휘 `공식 인정 기능성` 로 섹션 신설.
     단일 원료 제품이므로 `원료별 …` 이 아니라 `공식 인정 기능성`.
     삽입 위치는 family 시그니처 순서(왜 이 제품인가 → 기능성 → 섭취방법)에 맞춰
     `왜 이 제품인가` 블록 **직후 / 섭취방법 앞**. 마크업은 문서 내 기존 sd-why 재사용. */
const intakeH2 = ko.indexOf('<h2>섭취방법');
const blockA = `<h2>공식 인정 기능성</h2><ul class="sd-why">${li}</ul>\n  `;
const proposalA = intakeH2 >= 0 ? ko.slice(0, intakeH2) + blockA + ko.slice(intakeH2) : null;

/* 안 B(대안) — driver 표준 어휘 `주요 기능성` 을 sd-intro 직후에 신설.
     플랫폼 표준과는 정렬되지만 이 문서의 family 어휘와 불일치한다. */
const blockB = `<h2>주요 기능성</h2><ul class="sd-why">${li}</ul>\n  `;
const proposalB = ko.slice(0, firstH2) + blockB + ko.slice(firstH2);

const DEFINED = new Set(['sd-badge','sd-badges','sd-body','sd-card','sd-chips','sd-core','sd-cta','sd-cta-k','sd-foot','sd-hero','sd-intake','sd-intro','sd-item','sd-meta','sd-scan','sd-spec','sd-tag','sd-theme-green','sd-theme-red','sd-warn','sd-who','sd-why','is-solid']);
function checkProposal(oldC, newC) {
  if (!newC) return null;
  const classesOk = [...newC.matchAll(/class="([^"]+)"/g)].every((m) => m[1].split(/\s+/).every((x) => !x || DEFINED.has(x)));
  const balanced = ['div','ul','li','span','p','h1','h2','b','small'].every((t) =>
    (newC.match(new RegExp(`<${t}[\\s>]`, 'g')) ?? []).length === (newC.match(new RegExp(`</${t}>`, 'g')) ?? []).length);
  const clausesVisible = clauses.filter((x) => dense(newC).includes(dense(x))).length;
  // 기존 섹션 전량 보존 (헤딩 + sd-foot + spec 항목)
  const keptHeadings = [...oldC.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => m[0]).every((h) => newC.includes(h));
  const footKept = (oldC.match(/<div class="sd-foot">[\s\S]*?<\/div>/)?.[0] ?? '') !== '' &&
                   newC.includes(oldC.match(/<div class="sd-foot">[\s\S]*?<\/div>/)[0]);
  const introKept = newC.includes(oldC.match(/<p class="sd-intro">[\s\S]*?<\/p>/)?.[0] ?? '###');
  const noEmpty = !/<li>\s*<\/li>|<ul[^>]*>\s*<\/ul>|<h2>\s*<\/h2>/.test(newC);
  return {
    classesOk, balanced, clausesVisible, clausesExpected: clauses.length,
    allClausesVerbatim: allVerbatim, keptHeadings, footKept, introKept, noEmpty,
    lenDelta: newC.length - oldC.length, newHash: sha(newC),
    allPass: classesOk && balanced && clausesVisible === clauses.length && allVerbatim && keptHeadings && footKept && introKept && noEmpty,
  };
}

const proposal = {
  builtAt: new Date().toISOString(),
  applied: false,
  dbWrites: 0,
  note: '제안 전용 산출물 — 어느 안을 적용할지는 family 정책 결정(15,402건) 이후 후속 WO 에서 확정한다.',
  target: {
    pilotIndex: 35, candidateId: rec.candidateId, canonicalId: rec.canonicalId,
    productMasterId: rec.productMasterId, statementNo: rec.statementNo, productName: rec.productName,
    productionBucket: rec.productionBucket, rendererFamilyLabel: rec.rendererFamily,
    authoringFamily: 'WAE_I_JEPUM (왜 이 제품인가)',
    canonicalCreatedAt: '2026-07-17T00:28:12.090Z',
    currentHash: sha(ko), currentLength: ko.length,
    currentHeadings: [...ko.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map((m) => m[1]),
  },
  officialSource: { mainFnctnRaw: rawFn, parsedLabel: label, parsedClauses: clauses, allClausesVerbatimInSource: allVerbatim },
  findings: {
    dedicatedFunctionSectionPresent: false,
    functionsAppearInIntroProse: true,
    introProseExcerpt: (ko.match(/<p class="sd-intro">([\s\S]*?)<\/p>/)?.[1] ?? '').replace(/<[^>]+>/g, '').slice(0, 300),
    introProseIsParaphrased: true,
    paraphraseEvidence: '공식 `장건강` → 본문 `장 건강` · 3절이 쉼표로 병합되어 절 단위 식별 불가',
    correctionToPilotWording: '파일럿의 "기능성 3절 전량 미노출" 은 **전용 컨테이너 기준**이며, 산문 내 언급은 존재한다.',
  },
  proposals: {
    A_FAMILY_NATIVE_HEADING__RECOMMENDED: {
      description: '이 문서가 속한 왜-family 자체 어휘 `공식 인정 기능성` 로 섹션 신설. 단일 원료이므로 `원료별 …` 아님. 위치는 family 시그니처 순서대로 `왜 이 제품인가` 직후·`섭취방법` 앞. 마크업은 문서 내 기존 sd-why 재사용.',
      insertedBlock: blockA.trim(), content: proposalA, checks: checkProposal(ko, proposalA),
      tradeoff: 'family 계약과 완전 정렬. 동일 시그니처 문서로 배치 확장이 가능하다.',
      recommended: true,
    },
    B_DRIVER_STANDARD_HEADING: {
      description: 'driver 표준 어휘 `주요 기능성` 을 sd-intro 직후에 신설.',
      insertedBlock: blockB.trim(), content: proposalB, checks: checkProposal(ko, proposalB),
      tradeoff: '플랫폼 표준 어휘와는 정렬되나 이 문서 family 의 기능성 헤딩 어휘와 불일치한다.',
      recommended: false,
    },
  },
};
fs.writeFileSync(OUT_PROPOSAL, JSON.stringify(proposal, null, 1));

/* ─────────────────────────────────────────────────────────────
   2) 기능성 섹션 부재 canonical 전수 감사
   ───────────────────────────────────────────────────────────── */
/* 기능성 섹션 보유 판정은 **어느 한 family 어휘로 하면 안 된다.**
   driver = `주요 기능성`, 왜-family = `공식 인정 기능성` / `원료별 공식 인정 기능성` /
   `<원료> 영양기능 (공식 인정 기능성)` 등. h2 헤딩에 '기능성' 이 있으면 보유로 본다. */
const HAS_FN = `content ~ '<h2>[^<]*기능성[^<]*</h2>'`;
const agg = (await c.query(`
  WITH hff AS (
    SELECT spd.id, spd.content
    FROM shared_product_descriptions spd
    WHERE spd.source_type='o4o_hff_generated' AND spd.description_type='STORE'
      AND spd.status='canonical' AND coalesce(spd.language,'ko')='ko' AND spd.deleted_at IS NULL
  )
  SELECT
    count(*)::int AS total,
    count(*) FILTER (WHERE ${HAS_FN})::int AS has_function_section_any_vocab,
    count(*) FILTER (WHERE NOT (${HAS_FN}))::int AS missing_function_section,
    count(*) FILTER (WHERE content LIKE '%<h2>주요 기능성</h2>%')::int AS vocab_driver_주요기능성,
    count(*) FILTER (WHERE content LIKE '%공식 인정 기능성%')::int AS vocab_wae_공식인정기능성,
    count(*) FILTER (WHERE content LIKE '%왜 이 제품인가%')::int AS family_wae,
    count(*) FILTER (WHERE content LIKE '%왜 이 제품인가%' AND NOT (${HAS_FN}))::int AS wae_family_missing_function_section,
    count(*) FILTER (WHERE content LIKE '%이런 분께%')::int AS has_iron_bunkke,
    count(*) FILTER (WHERE content LIKE '%매장 내 약사 등 전문가%')::int AS has_expert_footer,
    count(*) FILTER (WHERE content NOT LIKE '%매장 내 약사 등 전문가%')::int AS missing_expert_footer
  FROM hff`)).rows[0];

// 기능성 섹션이 **정말로 없는** 문서의 헤딩 시그니처 분포
const sig = (await c.query(`
  WITH hff AS (
    SELECT spd.id, spd.content
    FROM shared_product_descriptions spd
    WHERE spd.source_type='o4o_hff_generated' AND spd.description_type='STORE'
      AND spd.status='canonical' AND coalesce(spd.language,'ko')='ko' AND spd.deleted_at IS NULL
      AND NOT (${HAS_FN})
  )
  SELECT
    (SELECT string_agg(m[1], ' | ') FROM regexp_matches(content, '<h2>([^<]*)</h2>', 'g') AS m) AS headings,
    count(*)::int AS c
  FROM hff GROUP BY 1 ORDER BY c DESC LIMIT 12`)).rows;

// 왜-family 가 실제로 사용하는 기능성 헤딩 어휘 분포
const fnVocab = (await c.query(`
  WITH hff AS (
    SELECT spd.content
    FROM shared_product_descriptions spd
    WHERE spd.source_type='o4o_hff_generated' AND spd.description_type='STORE'
      AND spd.status='canonical' AND coalesce(spd.language,'ko')='ko' AND spd.deleted_at IS NULL
      AND spd.content LIKE '%왜 이 제품인가%' AND ${HAS_FN}
  )
  SELECT m[1] AS heading, count(*)::int AS c
  FROM hff, regexp_matches(content, '<h2>([^<]*기능성[^<]*)</h2>', 'g') AS m
  GROUP BY 1 ORDER BY c DESC LIMIT 10`)).rows;

const familyAudit = {
  auditedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  scope: 'HFF STORE/ko canonical (source_type=o4o_hff_generated)',
  aggregate: agg,
  headingSignaturesOfTrulyMissingGroup: sig.map((r) => ({ headings: r.headings, count: r.c })),
  waeFamilyFunctionHeadingVocabulary: fnVocab.map((r) => ({ heading: r.heading, count: r.c })),
  correctionNote: {
    initialWrongConclusion: '"왜-family 는 전용 기능성 섹션이 없다 / #35 는 15,402건 family 의 대표 사례" — **오류**',
    cause: '기능성 섹션 보유 판정을 driver 어휘 `주요 기능성` 단독 LIKE 로 수행했다. 왜-family 는 `공식 인정 기능성` / `원료별 공식 인정 기능성` 등 자체 어휘를 쓴다.',
    corrected: '왜-family 도 전용 기능성 섹션을 보유한다. 기능성 섹션이 실제로 없는 문서는 훨씬 적으며, `#35` 는 그 소수 집합에 속한다.',
  },
  interpretation: {
    twoAuthoringFamilies: true,
    driverFamily: { functionHeading: '주요 기능성', count: agg.vocab_driver_주요기능성 },
    waeFamily: { count: agg.family_wae, functionHeadingVocab: '공식 인정 기능성 / 원료별 공식 인정 기능성 / <원료> 영양기능 (공식 인정 기능성)', missingFunctionSection: agg.wae_family_missing_function_section },
    note: '`#35` 복구 시 올바른 헤딩은 **그 family 자체 어휘**(단일 원료이므로 `공식 인정 기능성`)이다. driver 의 `주요 기능성` 을 쓰거나 `왜 이 제품인가` 에 병합하는 것은 family 계약과 불일치한다.',
  },
  policyMismatches: [
    { id: 'PM1-IRON-BUNKKE', description: '`이런 분께` 섹션 — 최근 WO 들이 driver 산출물에 대해 금지 항목으로 명시(구매지원 내러티브 축)', count: agg.has_iron_bunkke, inScopeOfThisWo: false },
    { id: 'PM2-NO-EXPERT-FOOTER', description: '`매장 내 약사 등 전문가` 문의 footer 부재 — CLAUDE.md 콘텐츠 불변 원칙 대비', count: agg.missing_expert_footer, inScopeOfThisWo: false },
    { id: 'PM3-NO-FUNCTION-CONTAINER', description: '어떤 어휘로도 기능성 섹션이 없음 — 공식 기능성이 절 단위로 식별되지 않음', count: agg.missing_function_section, inScopeOfThisWo: true },
  ],
  recommendation: `기능성 섹션이 실제로 없는 ${agg.missing_function_section}건이 대상이다. 복구 어휘는 문서가 속한 family 의 자체 기능성 헤딩을 따른다(왜-family=공식 인정 기능성, driver=주요 기능성). 단건 선행 후 동일 시그니처 배치로 확장할 것.`,
};
fs.writeFileSync(OUT_FAMILY, JSON.stringify(familyAudit, null, 1));

/* ─────────────────────────────────────────────────────────────
   3) 부재 그룹 표본 분류 — 공식 기능성 복구 가능성
   ───────────────────────────────────────────────────────────── */
const sample = (await c.query(`
  SELECT spd.id canonical_id, spd.content, pc.id candidate_id,
         pc.raw_payload::jsonb->'source'->>'STTEMNT_NO' stmt,
         pc.raw_payload::jsonb->'source'->>'PRDUCT' name,
         pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn
  FROM shared_product_descriptions spd
  JOIN product_candidates pc ON pc.matched_product_master_id = spd.master_id
  WHERE spd.source_type='o4o_hff_generated' AND spd.description_type='STORE'
    AND spd.status='canonical' AND coalesce(spd.language,'ko')='ko' AND spd.deleted_at IS NULL
    AND spd.content NOT LIKE '%주요 기능성%'
    AND pc.source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND pc.deleted_at IS NULL
  ORDER BY spd.id
  LIMIT 400`)).rows;

let recoverable = 0, proseOnly = 0, noSource = 0, needsBoundary = 0;
const rows = [];
for (const s of sample) {
  const raw = s.fn ?? '';
  if (!nrm(raw)) { noSource++; rows.push({ canonicalId: s.canonical_id, stmt: s.stmt, name: s.name, klass: 'NO_OFFICIAL_SOURCE' }); continue; }
  const lines = raw.replace(/\r/g, '').split('\n').map((x) => x.trim()).filter(Boolean);
  const cls = [];
  for (const L of lines) {
    const b = L.startsWith('[') ? L.slice(1) : L;
    const m = b.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]/);
    if (m) cls.push(...b.slice(m.index).split(/(?=[①-⑮])/).map((x) => x.replace(/^[①-⑮\s]*/, '').trim()).filter((x) => x.length >= 4));
  }
  const denseDoc = dense(s.content);
  const inProse = cls.filter((x) => denseDoc.includes(dense(x))).length;
  if (!cls.length) { needsBoundary++; rows.push({ canonicalId: s.canonical_id, stmt: s.stmt, name: s.name, klass: 'BOUNDARY_UNRESOLVED' }); continue; }
  recoverable++;
  if (inProse === cls.length) proseOnly++;
  rows.push({ canonicalId: s.canonical_id, stmt: s.stmt, name: s.name,
    klass: inProse === cls.length ? 'RECOVERABLE_ALL_CLAUSES_ALREADY_IN_PROSE' : 'RECOVERABLE_CLAUSES_PARTIALLY_MISSING',
    clauseCount: cls.length, clausesFoundInDoc: inProse });
}

const absent = {
  auditedAt: new Date().toISOString(), readOnly: true, dbWrites: 0,
  sampleSize: sample.length,
  sampling: 'ORDER BY canonical id LIMIT 400 — 결정적 표본(무작위 아님). 전수 아님을 명시.',
  tally: { recoverableFromOfficialSource: recoverable, allClausesAlreadyInProse: proseOnly,
    clausesPartiallyMissing: recoverable - proseOnly, boundaryUnresolved: needsBoundary, noOfficialSource: noSource },
  note: '`RECOVERABLE_*` 는 공식 MAIN_FNCTN 에서 절 경계를 마커로 확정할 수 있다는 의미이며, 어느 어휘/구조로 렌더할지는 family 정책 결정 사항이다.',
  rows: rows.slice(0, 200),
};
fs.writeFileSync(OUT_ABSENT, JSON.stringify(absent, null, 1));

await c.end();
console.log(JSON.stringify({
  dbWrites: 0, applied: false,
  proposal: { out: OUT_PROPOSAL, label, clauses, allVerbatim,
    A: proposal.proposals.A_FAMILY_NATIVE_HEADING__RECOMMENDED.checks,
    B: proposal.proposals.B_DRIVER_STANDARD_HEADING.checks },
  family: { out: OUT_FAMILY, aggregate: agg, topSignatures: sig.slice(0, 4).map((r) => ({ h: r.headings, c: r.c })) },
  absent: { out: OUT_ABSENT, tally: absent.tally },
}, null, 2));
