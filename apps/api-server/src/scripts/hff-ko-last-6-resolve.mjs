/**
 * WO-O4O-HFF-KO-LAST-6-AUTHORITY-DECISION-AND-CLOSURE-V1 / 사람 권한 판정의 결정론적 집행 (read-only).
 *
 * Track A — 원료 귀속 5건
 *   공식 MAIN_FNCTN 에는 원료 라벨이 없다. 그러나 같은 공식 원천의 BASE_STANDARD(기준·규격)에는
 *   그 제품에 실제 배합된 기능성 원료가 **순서대로** 명시되어 있다. 이것이 WO §6 이 요구한 "공식 원료 순서"다.
 *
 *   귀속은 다음 두 게이트를 **모두** 통과할 때만 확정한다.
 *     G1 순서 : BASE_STANDARD 기능성 원료 수 == MAIN_FNCTN 블록 수, 그리고 순서가 1:1
 *     G2 문구 : 각 원료의 「건강기능식품의 기준 및 규격」 고시 기능성 문구가 대응 블록과 일치
 *   G2 의 문구표는 귀속의 근거가 아니라 **G1 순서 귀속에 대한 독립 검증**으로만 쓴다.
 *   두 필드(BASE_STANDARD / MAIN_FNCTN)는 서로 다른 공식 필드이며, 제품마다 원료 순서가 다른데도
 *   블록 순서가 그에 맞춰 함께 달라진다는 점이 대응의 결정적 근거다.
 *
 * Track B — 구조 전환 1건
 *   sd-fn 은 평면 전용이라 원료 라벨을 담을 수 없다. WO §7 이 이 1건에 한해 전환을 명시 허용했다.
 *   기존 HFF 지원 구조(sd-func/sd-why)로만 전환하며 공용 renderer·CSS 는 건드리지 않는다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const POP = JSON.parse(fs.readFileSync(`${D}/hff-ko-last-6-population-v1.json`, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');
const MID = /[･·∙‧・•]/g;
const dense = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(MID, '·').replace(/[\s　 ]/g, '').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const leafLis = (h) => [...(h ?? '').matchAll(/<li>((?:(?!<li>|<\/li>)[\s\S])*?)<\/li>/g)]
  .map((x) => x[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
const fnBlockOf = (c) => {
  const m = c.match(/(<h2>[^<]*기능성[^<]*<\/h2>)([\s\S]*?)(?=<h2>|<div class="sd-foot")/);
  return m ? { heading: m[1], body: m[2], start: m.index, end: m.index + m[0].length } : null;
};

// ── 「건강기능식품의 기준 및 규격」 고시 기능성 문구 (검증 전용) ──────────────
const NOTIFIED = {
  '비타민D': ['칼슘과 인이 흡수되고 이용되는데 필요', '뼈의 형성과 유지에 필요', '골다공증발생 위험 감소에 도움을 줌'],
  '망간': ['뼈 형성에 필요', '에너지 이용에 필요', '유해산소로부터 세포를 보호하는데 필요'],
  '비타민K': ['정상적인 혈액응고에 필요', '뼈의 구성에 필요'],
  '셀레늄': ['유해산소로부터 세포를 보호하는데 필요'],
  '아연': ['정상적인 면역기능에 필요', '정상적인 세포분열에 필요'],
  '뮤코다당·단백': ['관절 및 연골건강에 도움을 줄 수 있음'],
};
const ALIAS = { '셀렌': '셀레늄', '뮤코다당.단백': '뮤코다당·단백', '뮤코다당•단백': '뮤코다당·단백' };
const canonIngredient = (s) => {
  const k = s.replace(/\s/g, '').replace(MID, '·');
  return ALIAS[k] ?? k;
};
// BASE_STANDARD 에서 기능성 원료가 아닌 항목(시험·규격·오염물질)
const NON_INGREDIENT = /^(성상|붕해|붕해시험|살모넬라|대장균군|납|비소|카드뮴|수은|총아플라톡신|오크라톡신|초산에틸|단백질과콘드로이친황산비율|황색포도상구균|중금속|산가|과산화물가|타르색소|이물)/;

function baseIngredients(base) {
  const t = (base ?? '').replace(/\s+/g, ' ');
  // `1.0 이상 9.0 이하` 의 소수점을 항목 번호로 오인하면 안 된다 → 번호 뒤에 숫자가 오면 제외.
  const items = [...t.matchAll(/(?:^|\s)(?:\d{1,2}\s*[).](?!\d)|\(\s*\d{1,2}\s*\))\s*([^:：]{1,40}?)\s*[:：]/g)].map((m) => m[1].trim());
  return items.map((v) => v.replace(/\(.*?\)/g, '').replace(/함량$/, '').trim())
    .filter((v) => v && !NON_INGREDIENT.test(v.replace(/\s/g, '')))
    .map(canonIngredient)
    .filter((v) => NOTIFIED[v] !== undefined || v.length >= 2);
}

const MARKER = /^(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|\(\s*\d+\s*\)|\d+\s*[).])\s*/;
const SPLIT = /(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|\(\s*\d+\s*\)\s*[가-힣])/;
const splitBlock = (b) => {
  const t = b.replace(/\r/g, '').split('\n').map((x) => x.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ');
  if (/^\(\s*영문\s*\)/.test(t)) return [];
  const parts = SPLIT.test(t) ? t.split(SPLIT) : [t];
  return parts.map((v) => v.replace(MARKER, '').replace(/^\(\s*국문\s*\)\s*/, '').trim())
    .filter((v) => v.length >= 4 && /[가-힣]/.test(v) && !/^[A-Za-z]/.test(v));
};

const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5503', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const cand = new Map(), canon = new Map();
for (const r of (await c.query(`SELECT id, raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn, raw_payload::jsonb->'source'->>'BASE_STANDARD' base FROM product_candidates WHERE id = ANY($1)`, [POP.rows.map((r) => r.candidateId)])).rows) cand.set(r.id, r);
for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [POP.rows.map((r) => r.canonicalId)])).rows) canon.set(r.id, r.content);
await c.end();

const decisions = [], safe = [], rollback = [];
for (const p of POP.rows) {
  const cd = cand.get(p.candidateId);
  const content = canon.get(p.canonicalId) ?? '';
  const fb = fnBlockOf(content);
  const raw = (cd?.fn ?? '').replace(/\r/g, '');
  const rawDense = dense(raw);
  const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const d = {
    candidateId: p.candidateId, canonicalId: p.canonicalId, productMasterId: p.productMasterId,
    statementNo: p.statementNo, productName: p.productName, queueReason: p.queueReason,
    rendererFamily: p.rendererFamily, track: p.queueReason === 'CANONICAL_REDESIGN_UNRESOLVED' ? 'B' : (p.rendererFamily === 'fn' ? 'B' : 'A'),
    currentLabels: p.currentLabels, currentClauseCount: p.currentClauses.length,
  };
  const fail = (status, why, extra = {}) => { Object.assign(d, extra); d.status = status; d.why = why; decisions.push(d); };

  let groups = null;

  if (d.track === 'B') {
    // 원문에 `홍삼 - …` / `나이아신 - …` 라벨이 명시되어 있다.
    const labelled = [];
    for (const line of raw.split('\n')) {
      const m = line.match(/(?:^|,)\s*([^,\n]{2,30}?)\s+[-–—]\s+(.+)$/);
      if (m && !/도움을|필요$/.test(m[1])) labelled.push({ label: m[1].trim(), clauses: splitBlock(m[2]) });
    }
    d.officialLabels = labelled.map((g) => g.label);
    if (labelled.length < 2) { fail('FINAL_PERMANENT_HOLD_STRUCTURE_NOT_APPROVABLE', 'NO_SOURCE_LABELS_FOR_TRANSITION'); continue; }
    // 기존 절(다기능 분해형)은 보존한다. 원문 통합 절로 되돌리지 않는다.
    const cur = leafLis(fb?.body ?? '');
    groups = labelled.map((g, i) => {
      if (i !== 0) return g;
      const expanded = g.clauses.flatMap((v) => {
        const m = v.match(/^(.+?)(에 도움을 줄 수 있음|에 필요)$/);
        return m && MID.test(dense(m[1])) ? m[1].split(MID).map((x) => (x.trim() + m[2]).replace(/\s+/g, ' ')) : [v];
      });
      const covered = cur.length > 0 && cur.every((v) => expanded.some((e) => dense(e) === dense(v) || dense(e).includes(dense(v))));
      return { label: g.label, clauses: covered ? cur : g.clauses };
    });
    d.structureTransition = { from: 'sd-fn', to: 'sd-func/sd-why', approvedBy: 'WO §7 (이 1건 한정)' };
  } else {
    // Track A — G1 순서 게이트
    const ings = baseIngredients(cd?.base);
    d.baseIngredients = ings;
    d.officialBlocks = blocks.length;
    if (!ings.length) { fail('FINAL_PERMANENT_HOLD_INGREDIENT_OWNERSHIP', 'NO_INGREDIENT_ORDER_IN_BASE_STANDARD'); continue; }
    if (ings.length !== blocks.length) {
      fail('FINAL_PERMANENT_HOLD_INGREDIENT_OWNERSHIP', `ORDER_COUNT_MISMATCH:${ings.length}vs${blocks.length}`);
      continue;
    }
    const g1 = ings.map((ing, i) => ({ label: ing, clauses: splitBlock(blocks[i]) }));
    // G2 문구 게이트 — 전 원료가 고시 문구표에 있고 절 집합이 정확히 일치해야 한다
    const unknown = g1.filter((g) => !NOTIFIED[g.label]).map((g) => g.label);
    if (unknown.length) { fail('FINAL_PERMANENT_HOLD_INGREDIENT_OWNERSHIP', `NOT_NOTIFIED_INGREDIENT:${unknown.join('/')}`, { g1Passed: true }); continue; }
    const bad = g1.filter((g) => {
      const want = NOTIFIED[g.label].map(dense).sort().join('|');
      const got = g.clauses.map(dense).sort().join('|');
      return want !== got;
    });
    if (bad.length) { fail('FINAL_PERMANENT_HOLD_INGREDIENT_OWNERSHIP', `NOTIFIED_TEXT_MISMATCH:${bad.map((b) => b.label).join('/')}`, { g1Passed: true }); continue; }
    d.g1Passed = true; d.g2Passed = true;
    groups = g1;
  }

  // 기존 canonical 라벨이 더 구체적이면(`뮤코다당·단백(콘드로이친)`) 그것을 유지한다.
  // BASE_STANDARD 표기로 덮어쓰면 라벨 정보가 축소된다.
  const curLabels = p.currentLabels ?? [];
  for (const g of groups) {
    const keep = curLabels.find((L) => dense(L).includes(dense(g.label)) && dense(L).length >= dense(g.label).length);
    if (keep) g.label = keep;
  }

  // 공통 안전 게이트
  const allNew = groups.flatMap((g) => g.clauses);
  if (!allNew.length) { fail('FAILED_SYSTEM', 'NO_CLAUSE'); continue; }
  // 다기능 절(`A·B·C에 도움을 줄 수 있음`)을 개별 절로 펼친 형태는 원문에서 결정적으로 유도된다.
  const derivable = (v) => {
    const m = dense(v).match(/^(.+?)(에도움을줄수있음|에필요)$/);
    if (!m) return false;
    return rawDense.split(MID).some((seg) => seg.includes(m[1])) && rawDense.includes(m[2]);
  };
  const notVerbatim = allNew.find((v) => !rawDense.includes(dense(v)) && !derivable(v));
  if (notVerbatim) { fail('FINAL_PERMANENT_HOLD_SOURCE_CONFLICT', `CLAUSE_NOT_VERBATIM:${notVerbatim.slice(0, 30)}`); continue; }
  // 라벨은 공식 원문(MAIN_FNCTN / BASE_STANDARD) 또는 기존 canonical 라벨이어야 한다.
  // BASE 는 `뮤코다당.단백` 처럼 구분자를 마침표로 쓰기도 하므로 비교 시 함께 정규화한다.
  const sep = (s) => dense(s).replace(/[.]/g, '·');
  const labelNotVerbatim = groups.map((g) => g.label).find((v) =>
    !sep(raw).includes(sep(v)) && !sep(cd?.base ?? '').includes(sep(v)) && !curLabels.some((L) => dense(L) === dense(v)));
  if (labelNotVerbatim) { fail('FINAL_PERMANENT_HOLD_INGREDIENT_OWNERSHIP', `LABEL_NOT_VERBATIM:${labelNotVerbatim}`); continue; }
  const dirty = allNew.find((v) => /[\[\]]/.test(v) || /[①②③④⑤⑥⑦⑧⑨⑩]/.test(v) || /[A-Za-z]{6,}/.test(v) || /[:：]\s*\S*\s*(mg|g|ug|㎍)/.test(v));
  if (dirty) { fail('FINAL_PERMANENT_HOLD_SOURCE_CONFLICT', `CLAUSE_DIRTY:${dirty.slice(0, 30)}`); continue; }
  // 기존 절 보존 (표기 차이는 허용)
  const cur = leafLis(fb?.body ?? '');
  const lcs = (a, b) => {
    const x = dense(a), y = dense(b), max = Math.max(x.length, y.length, 1);
    let pp = 0; while (pp < x.length && pp < y.length && x[pp] === y[pp]) pp++;
    let ss = 0; while (ss < x.length - pp && ss < y.length - pp && x[x.length - 1 - ss] === y[y.length - 1 - ss]) ss++;
    return (pp + ss) / max;
  };
  const lost = cur.filter((v) => !allNew.some((n) => dense(n).includes(dense(v)) || dense(v).includes(dense(n)) || lcs(v, n) >= 0.6));
  if (lost.length) { fail('FINAL_PERMANENT_HOLD_INGREDIENT_OWNERSHIP', `WOULD_LOSE:${lost[0].slice(0, 30)}`); continue; }
  if (!fb) { fail('FINAL_PERMANENT_HOLD_STRUCTURE_NOT_APPROVABLE', 'NO_FN_SECTION'); continue; }

  // 렌더 — 라벨 구조는 기존 HFF 지원 구조로만
  const newBody = `<ul class="sd-func">${groups.map((g) =>
    `<li><b>${esc(g.label)}</b><ul class="sd-why">${g.clauses.map((v) => `<li>${esc(v)}</li>`).join('')}</ul></li>`).join('')}</ul>`;
  // 헤딩: 원료가 늘어나 기존 헤딩이 내용과 어긋나면 기존 표준 표현으로 정정
  const heading = (d.track === 'B' || /홍삼|이 제품/.test(fb.heading)) && groups.length > 1
    ? '<h2>원료별 공식 인정 기능성</h2>' : fb.heading;
  d.headingChanged = heading !== fb.heading;
  if (dense(newBody) === dense(fb.body) && !d.headingChanged) { d.status = 'RESOLVED_NO_CHANGE'; d.why = 'IDENTICAL'; decisions.push(d); continue; }

  const newContent = content.slice(0, fb.start) + heading + newBody + content.slice(fb.end);
  d.status = 'RESOLVED_UPDATED';
  d.why = d.track === 'B' ? 'FAMILY_TRANSITION_AND_LABEL_RESTORED' : 'OWNERSHIP_CONFIRMED_BY_BASE_STANDARD_ORDER';
  d.restoredClauses = allNew.length - cur.length;
  d.groups = groups;
  decisions.push(d);
  safe.push({ ...d, oldContentHash: sha(content), newContentHash: sha(newContent), newContent });
  rollback.push({ canonicalId: p.canonicalId, candidateId: p.candidateId, productName: p.productName, oldContentHash: sha(content), newContentHash: sha(newContent), oldBlock: fb.heading + fb.body, newBlock: heading + newBody });
}

const checks = {
  total: decisions.length, sum6: decisions.length === 6,
  byStatus: decisions.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {}),
  byTrack: decisions.reduce((a, r) => { a[r.track] = (a[r.track] ?? 0) + 1; return a; }, {}),
  holdReasons: decisions.filter((r) => r.status.startsWith('FINAL_PERMANENT')).map((r) => `${r.productName}: ${r.why}`),
  safeTargets: safe.length,
  safeCanonicalDup: safe.length - new Set(safe.map((r) => r.canonicalId)).size,
  restoredClauses: safe.reduce((a, r) => a + Math.max(0, r.restoredClauses ?? 0), 0),
  failedSystem: decisions.filter((r) => r.status === 'FAILED_SYSTEM').length,
};
fs.writeFileSync(`${D}/hff-ko-last-6-authority-decisions-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0, checks, decisions }, null, 1));
fs.writeFileSync(`${D}/hff-ko-last-6-safe-targets-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), count: safe.length, targets: safe }, null, 1));
fs.writeFileSync(`${D}/hff-ko-last-6-rollback-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), count: rollback.length, rollback }, null, 1));
console.log(JSON.stringify(checks, null, 2));
