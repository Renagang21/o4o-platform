/**
 * WO-O4O-HFF-KO-FINAL-MANUAL-80-RESOLUTION-V1 / 사람 판정 결과의 결정론적 집행 (read-only).
 *
 * 사람이 80건 전량을 원문과 대조해 확정한 규칙:
 *  R1 원문 라벨 형식은 대괄호만이 아니다. `이름 :` `1) 이름 :` `- 이름 :` `이름 - 절` `(이름) 절`
 *     `이름` + 개행 모두 공식 라벨이다. 기존 파서가 이 형식을 몰라 라벨을 잃었다.
 *  R2 원문이 [무라벨 절 나열] + [라벨별 절] 로 이어붙은 경우 라벨부가 정본이다.
 *  R3 원문 라벨이 0개이고 현재 canonical 라벨이 있으면 귀속 근거가 원문에 없다 → 손대지 않는다.
 *  R4 그룹 간 동일 문구는 정상이다(서로 다른 원료가 같은 기능성을 공식 보유). 그룹 내부만 중복 제거.
 *  R5 (영문)/영문 절은 KO canonical 에서 제외한다. 다만 원료명 라벨의 영문은 공식 원료명이므로 보존.
 *  R6 (2) 일일섭취량 이하 블록은 섭취량 정보이지 기능성 절이 아니다.
 *  R7 기존 절은 삭제하지 않는다. 모든 기존 절은 새 절의 부분문자열이거나 다기능 절의 분해형이어야 한다.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import pg from 'pg';

const D = 'apps/api-server/src/scripts/data';
const POP = JSON.parse(fs.readFileSync(`${D}/hff-ko-final-manual-80-population-v1.json`, 'utf8'));
const sha = (s) => crypto.createHash('sha256').update(s ?? '').digest('hex');

const MID = /[･·∙‧・]/g;
const dense = (s) => (s ?? '').replace(/<[^>]+>/g, '').replace(MID, '·')
  .replace(/[\s　 ]/g, '').replace(/[’'`´]/g, "'").replace(/[～]/g, '~').trim();
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── 절 마커 ──────────────────────────────────────────────────────────────
const MARKER = /^(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|\(\s*(?:\d+|[가나다라마바사])\s*\)|\d+\s*[).]|[가나다라마]\)|[-–—•*])\s*/;
const SPLIT = /(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|\(\s*\d+\s*\)\s*[가-힣]|\(\s*[가나다라마바사]\s*\))/;
const ENGLISH = (s) => /^[A-Za-z(]/.test(s.trim()) && /[A-Za-z]{4,}/.test(s) && !/[가-힣]/.test(s);
const GRADE = /\(\s*생리활성기능\s*\d\s*등급\s*\)/g;
const TERMINAL = /(필요|있음|줌|관여|개선|원활|증진|보호|억제)\.?$/;

function cleanClause(t) {
  let v = (t ?? '').replace(/^\s+|\s+$/g, '');
  for (let i = 0; i < 6; i++) {
    const b = v;
    v = v.replace(MARKER, '').replace(/^\((?:국문|한글)\)\s*/, '').replace(GRADE, '')
      .replace(/^[\]\[,、:：·・\s]+/, '').replace(/[\s,、·]+$/, '').replace(/\s*\/\s*$/, '').trim();
    if (v === b) break;
  }
  return v.replace(/\s+/g, ' ').replace(/\.$/, '').trim();
}

function splitClauses(text) {
  // 한 줄 안에 `(국문) … (영문) May help …` 가 함께 오는 형식이 흔하다. 영문 이후는 KO 에서 버린다(R5).
  const t = (text ?? '').split(/\(\s*영문\s*\)/)[0].replace(/\s+/g, ' ').trim();
  if (!t) return [];
  let parts;
  if (SPLIT.test(t)) parts = t.split(SPLIT);
  else if ((t.match(/\d\s*\)\s*[가-힣]/g) ?? []).length >= 2) parts = t.split(/(?=\d\s*\)\s*[가-힣])/);
  else parts = [t];
  return parts.map(cleanClause).filter((v) => v.length >= 4 && !ENGLISH(v));
}

// ── 원문 → 라벨 그룹 ─────────────────────────────────────────────────────
const LABEL_BRACKET = /^\s*[,、]?\s*\[([^\]]{1,80})\]\s*[:：]?\s*(.*)$/;
const LABEL_OPEN = /^\s*[,、]?\s*\[([^\]]{2,80})$/;
const LABEL_CLOSE = /^\s*([^\[\]:：]{2,60})\]\s*[:：]?\s*(.*)$/;
const LABEL_COLON = /^\s*[,、]?\s*(?:\d+\s*[).]|[-–—•*])?\s*([^:：\n]{2,70}?)\s*[:：]\s*(.*)$/;
const LABEL_DASH = /^\s*[,、]?\s*(?:\d+\s*[).])?\s*([^-–—\n]{2,50}?)\s*[-–—]\s+(.*)$/;
const LABEL_PAREN = /^\s*\(([^)]{2,50})\)\s*(.+)$/;
// 제형 구분자는 원료 라벨이 아니다: `정제1 : [밀크씨슬추출물] …`, `액상[나이아신, …]`
const NOT_LABEL = /^(국문|영문|한글|1|2|3|4|5|가|나|다|라|마|기능성\s*내용|일일섭취량|기능성|정제\s*\d*|액상\s*\d*|분말\s*\d*|과립\s*\d*|캡슐\s*\d*)$/;
const FORM_PREFIX = /^\s*(?:정제|액상|분말|과립|캡슐)\s*\d*\s*[:：]?\s*(?=\[)/;

function labelLooksReal(v) {
  const s = (v ?? '').trim();
  if (!s || s.length < 2 || s.length > 70) return false;
  if (NOT_LABEL.test(s)) return false;
  if (TERMINAL.test(s)) return false;                 // 절은 라벨이 아니다
  if (/도움을|필요하다|에 필요/.test(s)) return false;
  if (/^\(?\s*생리활성기능\s*\d\s*등급\s*\)?$/.test(s)) return false;   // 등급 표기는 원료명이 아니다
  if (/^\d+$/.test(s)) return false;
  return /[가-힣A-Za-z]/.test(s);
}

function parseOfficial(raw) {
  const lines = (raw ?? '').replace(/\r/g, '').replace(/"/g, '').split('\n');
  const groups = [];
  let cur = null;
  let skipIntake = false;

  const push = (label, rest) => {
    cur = { label: label.trim().replace(/^[,、\s]+|[,、\s]+$/g, ''), clauses: [] };
    groups.push(cur);
    if (rest && rest.trim()) cur.clauses.push(...splitClauses(rest));
  };

  for (let raw0 of lines) {
    let line = raw0.replace(/　/g, ' ');
    if (!line.trim()) continue;
    if (/^\s*\(\s*2\s*\)\s*일일섭취량/.test(line)) { skipIntake = true; continue; }
    if (skipIntake) {
      // 일일섭취량 블록 안의 `(가) … : 원료로서 N mg` 는 기능성 절이 아니다.
      // 단 그 줄 끝에 라벨부가 이어붙는 경우가 있으므로(`… 4.2~44 g),[난소화성말토덱스트린] 식후 …`)
      // 라벨부만 떼어내 살린다.
      const li = line.search(/[,、]\s*\[[^\]]{2,40}\]/);
      if (li > 0) line = line.slice(li + 1).trim();
      else if (/[:：].*\d/.test(line)) continue;
      else skipIntake = false;
    }
    if (/^\s*\(\s*영문\s*\)/.test(line)) continue;
    line = line.replace(/\(\s*1\s*\)\s*기능성\s*내용\s*[:：]\s*/, '').replace(FORM_PREFIX, '');

    // 라인 중간에서 시작되는 라벨부(R2): `…무라벨 절,[라벨] 절` / `…무라벨 절,1) 라벨 : 절`
    // 라벨부가 등장하면 그 앞의 무라벨 요약부는 정본이 아니므로 폐기한다.
    let inlineIdx = line.search(/[,、]\s*(?:\[|(?:\d+\s*[).]\s*)?[^\s,、:：]{2,40}\s*[-–—:：]\s)/);
    if (inlineIdx < 0) inlineIdx = line.search(/[가-힣]\s*(?=\[[^\]]{2,40}\])/);   // `…흐름에 [홍삼제품]①…`
    // 라벨 목록 안의 쉼표(`[나이아신, 비타민B6, 비타민B1]`)는 경계가 아니다.
    if (inlineIdx > 0) {
      const head = line.slice(0, inlineIdx);
      if ((head.match(/\[/g) ?? []).length > (head.match(/\]/g) ?? []).length) inlineIdx = -1;
    }
    if (inlineIdx > 0) {
      const tail = line.slice(inlineIdx + 1).trim();
      const lm = tail.match(LABEL_BRACKET) ?? tail.match(LABEL_COLON) ?? tail.match(LABEL_DASH);
      if (lm && labelLooksReal(lm[1])) {
        if (!groups.some((g) => g.label)) { groups.length = 0; cur = null; }
        line = tail;
      }
    }

    let m;
    if ((m = line.match(LABEL_BRACKET)) && labelLooksReal(m[1])) { push(m[1], m[2]); continue; }
    if ((m = line.match(LABEL_OPEN)) && labelLooksReal(m[1])) { push(m[1], ''); continue; }
    if ((m = line.match(LABEL_CLOSE)) && labelLooksReal(m[1]) && !cur) { push(m[1], m[2]); continue; }
    if ((m = line.match(LABEL_COLON)) && labelLooksReal(m[1])) { push(m[1], m[2]); continue; }
    if ((m = line.match(LABEL_DASH)) && labelLooksReal(m[1])) { push(m[1], m[2]); continue; }
    if ((m = line.match(LABEL_PAREN)) && labelLooksReal(m[1])) { push(m[1], m[2]); continue; }
    // 라벨이 단독 줄로 오고 절이 다음 줄부터 이어지는 형식: `비타민D\n1. 칼슘과 인이 …`
    if (!MARKER.test(line) && line.trim().length <= 60 && labelLooksReal(line.trim())
        && !/[,、]\s*$/.test(line) && /[가-힣]/.test(line)) { push(line.trim(), ''); continue; }

    const cl = splitClauses(line);
    if (!cl.length) continue;
    if (cur) cur.clauses.push(...cl);
    else groups.push({ label: null, clauses: cl });
  }

  // 그룹 내부 중복만 제거 (R4)
  for (const g of groups) {
    const seen = new Set();
    g.clauses = g.clauses.filter((c) => { const k = dense(c); if (!k || seen.has(k)) return false; seen.add(k); return true; });
  }
  return groups.filter((g) => g.clauses.length > 0 || g.label);
}

// ── 현재 canonical → 그룹 ────────────────────────────────────────────────
function fnBlockOf(content) {
  const m = content.match(/(<h2>[^<]*기능성[^<]*<\/h2>)([\s\S]*?)(?=<h2>|<div class="sd-foot")/);
  return m ? { heading: m[1], body: m[2], start: m.index, end: m.index + m[0].length } : null;
}
const leafLis = (html) => [...(html ?? '').matchAll(/<li>((?:(?!<li>|<\/li>)[\s\S])*?)<\/li>/g)]
  .map((x) => x[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);

// 이 코퍼스에는 두 renderer family 가 공존한다. family 를 바꾸는 것은 WO 금지사항이므로
// 읽을 때도 쓸 때도 현재 문서의 family 를 그대로 따른다.
//   DRIVER: <div class="sd-core"><div class="sd-item"><span class="sd-tag">라벨</span><ul><li>절
//   WAE   : <ul class="sd-func"><li><b>라벨</b><ul class="sd-why"><li>절
//   FN    : <ul class="sd-fn"><li>절   ← 라벨 구조를 지원하지 않는 평면 전용(홍삼 계열)
// sd-core 래퍼 없이 sd-item 만 직접 놓는 변형도 있다. 래퍼 유무까지 그대로 보존한다.
const familyOf = (body) => /class="sd-fn"/.test(body ?? '') ? 'fn'
  : /class="sd-core"|class="sd-item"|class="sd-tag"/.test(body ?? '') ? 'core'
  : /class="sd-func"|class="sd-why"/.test(body ?? '') ? 'why' : null;

function parseCurrent(body) {
  if (!body) return [];
  if (/class="sd-core"/.test(body)) {
    return [...body.matchAll(/<div class="sd-item">([\s\S]*?)<\/div>/g)].map((m) => ({
      label: (m[1].match(/<span class="sd-tag">([\s\S]*?)<\/span>/) ?? [])[1]?.replace(/<[^>]+>/g, '').trim() ?? null,
      clauses: leafLis(m[1]),
    })).filter((g) => g.label || g.clauses.length);
  }
  if (/class="sd-func"/.test(body)) {
    // 중첩 li 를 정규식 하나로 자르면 그룹의 마지막 절을 잃는다(이 세션 5회 재발).
    // 그룹 경계로 split 한 뒤 라벨을 제거하고 최말단 li 만 절로 삼는다.
    return body.split(/(?=<li>\s*<b>)/).filter((p) => /<li>\s*<b>/.test(p)).map((p) => {
      const label = (p.match(/<b>([\s\S]*?)<\/b>/) ?? [])[1]?.replace(/<[^>]+>/g, '').trim() ?? null;
      return { label, clauses: leafLis(p.slice(p.indexOf('</b>') + 4)) };
    });
  }
  const cl = leafLis(body);
  return cl.length ? [{ label: null, clauses: cl }] : [];
}

// 다기능 절 분해형 (기존 절 보존 판정용)
function expandMulti(c) {
  const m = c.match(/^(.+?)(에 도움을 줄 수 있음|에 필요)$/);
  if (!m || !/[·]/.test(dense(m[1]))) return [];
  return m[1].split(MID).map((p) => (p.trim() + m[2]).replace(/\s+/g, ' ').trim()).filter((v) => v.length > 5);
}

// ── 새 블록 렌더 ─────────────────────────────────────────────────────────
function render(groups, family, wrapCore = true) {
  const li = (cs) => cs.map((c) => `<li>${esc(c)}</li>`).join('');
  const multi = groups.length > 1 && groups.every((g) => g.label);
  const flat = () => {
    const seen = new Set(), out = [];
    for (const g of groups) for (const c of g.clauses) { const k = dense(c); if (k && !seen.has(k)) { seen.add(k); out.push(c); } }
    return out;
  };
  if (family === 'fn') return `<ul class="sd-fn">${li(flat())}</ul>`;
  if (family === 'core') {
    const items = multi
      ? groups.map((g) => `<div class="sd-item"><span class="sd-tag">${esc(g.label)}</span><ul>${li(g.clauses)}</ul></div>`).join('')
      : `<div class="sd-item">${groups[0]?.label ? `<span class="sd-tag">${esc(groups[0].label)}</span>` : ''}<ul>${li(flat())}</ul></div>`;
    return wrapCore ? `<div class="sd-core">${items}</div>` : items;
  }
  return multi
    ? `<ul class="sd-func">${groups.map((g) => `<li><b>${esc(g.label)}</b><ul class="sd-why">${li(g.clauses)}</ul></li>`).join('')}</ul>`
    : `<ul class="sd-why">${li(flat())}</ul>`;
}

// ── 판정 ─────────────────────────────────────────────────────────────────
const c = new pg.Client({ host: '127.0.0.1', port: parseInt(process.env.PROXY_PORT ?? '5501', 10), user: process.env.PGUSER, password: process.env.PGPW, database: 'o4o_platform', ssl: false });
await c.connect();
await c.query('SET default_transaction_read_only = on');
const cmap = new Map(), rawmap = new Map();
for (const r of (await c.query('SELECT id, content FROM shared_product_descriptions WHERE id = ANY($1)', [POP.rows.map((r) => r.canonicalId)])).rows) cmap.set(r.id, r.content);
for (const r of (await c.query(`SELECT id, raw_payload::jsonb->'source'->>'MAIN_FNCTN' fn FROM product_candidates WHERE id = ANY($1)`, [POP.rows.map((r) => r.candidateId)])).rows) rawmap.set(r.id, r.fn ?? '');
await c.end();

const decisions = [], safe = [], rollback = [];
for (const r of POP.rows) {
  const content = cmap.get(r.canonicalId) ?? '';
  const raw = rawmap.get(r.candidateId) ?? '';
  const rawDense = dense(raw);
  const fb = fnBlockOf(content);
  const official = parseOfficial(raw);
  const current = fb ? parseCurrent(fb.body) : [];
  const d = {
    candidateId: r.candidateId, canonicalId: r.canonicalId, productMasterId: r.productMasterId,
    statementNo: r.statementNo, productName: r.productName, track: r.track, queueReason: r.queueReason,
    officialGroups: official.length,
    officialLabels: official.filter((g) => g.label).length,
    officialClauses: official.reduce((a, g) => a + g.clauses.length, 0),
    currentGroups: current.length, currentLabels: current.filter((g) => g.label).length,
    currentClauses: current.reduce((a, g) => a + g.clauses.length, 0),
    hasFnSection: !!fb,
  };

  const fail = (status, why) => { d.status = status; d.why = why; decisions.push(d); };
  if (!official.length) { fail('FINAL_HOLD_SOURCE_REPAIR_NOT_DETERMINISTIC', 'OFFICIAL_PARSE_EMPTY'); continue; }

  const labelled = official.filter((g) => g.label && g.clauses.length);
  const useLabels = labelled.length >= 2;
  const groups = useLabels ? labelled : official;
  const allNew = groups.flatMap((g) => g.clauses);
  if (!allNew.length) { fail('FINAL_HOLD_SOURCE_REPAIR_NOT_DETERMINISTIC', 'NO_CLAUSE_PARSED'); continue; }

  // 게이트 1 — 모든 절·라벨은 원문 verbatim
  const badClause = allNew.find((v) => !rawDense.includes(dense(v)));
  if (badClause) { fail('FINAL_HOLD_SOURCE_REPAIR_NOT_DETERMINISTIC', `CLAUSE_NOT_VERBATIM:${badClause.slice(0, 30)}`); continue; }
  const badLabel = useLabels && groups.map((g) => g.label).find((v) => !rawDense.includes(dense(v)));
  if (badLabel) { fail('FINAL_HOLD_SOURCE_REPAIR_NOT_DETERMINISTIC', `LABEL_NOT_VERBATIM:${badLabel.slice(0, 30)}`); continue; }
  // 게이트 2 — 절에 영문·마커·대괄호·콜론 잔존 금지
  const dirty = allNew.find((v) => /[\[\]]/.test(v) || /[①②③④⑤⑥⑦⑧⑨⑩]/.test(v) || /[A-Za-z]{6,}/.test(v) || /^기능성/.test(v) || /[:：]\s*\S+\s*(mg|g|㎎)/.test(v));
  if (dirty) { fail('FINAL_HOLD_SOURCE_REPAIR_NOT_DETERMINISTIC', `CLAUSE_DIRTY:${dirty.slice(0, 30)}`); continue; }

  // 게이트 3 (R7) — 기존 절 보존
  const curAll = current.flatMap((g) => g.clauses);
  const newDense = allNew.map(dense);
  const newExpanded = new Set(allNew.flatMap((v) => expandMulti(v)).map(dense));
  // 사라지는 기존 절 중 "원문에 없고 구조가 깨진 것"은 손상이므로 보존 의무가 없다.
  // (예: `EPA 및 DHA 함유유지 : (`, `… : 난소화성말토덱스트린 식이섬유로서`)
  // 구조가 깨진 절은 원문 안에 그 조각이 존재하더라도 손상이다(잘린 라벨·마커·수치 꼬리).
  const corrupted = (v) => /[(:：\[]\s*$/.test(v) || /[:：][^:：]{0,40}(?:으로서|로서)$/.test(v)
    || /[\[\]]/.test(v) || /[A-Za-z]{6,}/.test(v) || /^기능성\s*내용/.test(v) || dense(v).length < 8
    || (!rawDense.includes(dense(v)) && /[①②③④⑤⑥⑦⑧⑨⑩]/.test(v));
  // 같은 기능을 다른 표기로 적은 기존 절은 원문 표현으로 되돌리는 것이 정정이다(삭제가 아니다).
  // 같은 기능의 표기 차이는 문장 앞뒤가 함께 일치한다.
  // `…피부손상으로부터 피부건강을 유지하는데 도움을 줄 수 있음` ↔ `…피부손상으로부터 피부 건강 유지에 도움을 줄 수 있음`
  const lcsRatio = (a, b) => {
    const x = dense(a), y = dense(b), max = Math.max(x.length, y.length, 1);
    let p = 0;
    while (p < x.length && p < y.length && x[p] === y[p]) p++;
    let s = 0;
    while (s < x.length - p && s < y.length - p && x[x.length - 1 - s] === y[y.length - 1 - s]) s++;
    return (p + s) / max;
  };
  const lost = curAll.filter((v) => {
    const k = dense(v);
    if (!k) return false;
    if (newDense.some((n) => n.includes(k) || k.includes(n))) return false;
    if (newExpanded.has(k)) return false;
    if (corrupted(v)) return false;
    return !allNew.some((n) => lcsRatio(v, n) >= 0.6);   // 표기 정정
  });
  d.droppedCorruptClauses = curAll.filter(corrupted).length;
  if (lost.length) {
    // R3: 원문 라벨이 없고 현재 라벨이 있으면 귀속 근거가 없다 → 손대지 않는다
    fail(useLabels ? 'FINAL_HOLD_INGREDIENT_OWNERSHIP_UNRESOLVED' : 'FINAL_HOLD_INGREDIENT_OWNERSHIP_UNRESOLVED',
      `WOULD_LOSE_${lost.length}:${lost[0].slice(0, 28)}`);
    continue;
  }
  // R3 보강 — 원문 라벨 0 이고 현재 라벨 ≥1 이면 라벨을 잃게 되므로 무변경 대상
  if (!useLabels && current.some((g) => g.label)) {
    const curDense = new Set(curAll.map(dense));
    const missing = allNew.filter((v) => ![...curDense].some((k) => k.includes(dense(v)) || dense(v).includes(k)));
    if (!missing.length) { d.status = 'RESOLVED_NO_CHANGE'; d.why = 'CURRENT_MATCHES_OFFICIAL_LABELS_NOT_IN_SOURCE'; decisions.push(d); continue; }
    fail('FINAL_HOLD_INGREDIENT_OWNERSHIP_UNRESOLVED', `NO_SOURCE_LABEL_BUT_${missing.length}_MISSING`);
    continue;
  }

  const family = familyOf(fb?.body) ?? familyOf(content);
  if (!family) { fail('FINAL_HOLD_CANONICAL_REDESIGN_REQUIRED', 'RENDERER_FAMILY_UNKNOWN'); continue; }
  d.rendererFamily = family;
  // sd-fn 은 평면 전용이다. 라벨 그룹이 필요한 문서를 이 family 로 표현하면
  // 서로 다른 원료의 기능성이 한 목록에 섞여 헤딩과 어긋난다 → 구조 재설계 대상.
  if (family === 'fn' && useLabels) { fail('FINAL_HOLD_CANONICAL_REDESIGN_REQUIRED', 'FLAT_FAMILY_CANNOT_HOLD_LABELS'); continue; }

  let newContent, newBody, oldBody, heading;
  if (fb) {
    heading = fb.heading;
    oldBody = fb.body;
    newBody = render(groups, family, /class="sd-core"/.test(fb.body));
    if (dense(newBody) === dense(oldBody)) { d.status = 'RESOLVED_NO_CHANGE'; d.why = 'IDENTICAL'; decisions.push(d); continue; }
    // 기존이 다기능 절을 이미 개별 절로 펼쳐 둔 상태라면 통합 절로 되돌리는 것은 후퇴다.
    const curDense = new Set(curAll.map(dense));
    const covered = allNew.every((v) => curDense.has(dense(v))
      || (expandMulti(v).length > 0 && expandMulti(v).every((p) => curDense.has(dense(p)))));
    if (covered && current.filter((g) => g.label).length === groups.filter((g) => g.label).length) {
      d.status = 'RESOLVED_NO_CHANGE'; d.why = 'ALREADY_EXPANDED_EQUIVALENT'; decisions.push(d); continue;
    }
    newContent = content.slice(0, fb.start) + heading + newBody + content.slice(fb.end);
  } else {
    // 기능성 섹션 자체가 없다. 직전 WO 에서 확정한 헤딩(`공식 인정 기능성`)으로 섹션만 신설하고
    // 다른 섹션은 건드리지 않는다. 삽입 지점은 두 번째 <h2> 앞(없으면 sd-foot 앞).
    const h2s = [...content.matchAll(/<h2>/g)].map((m) => m.index);
    const at = h2s.length >= 2 ? h2s[1] : content.indexOf('<div class="sd-foot"');
    if (at < 0) { fail('FINAL_HOLD_CANONICAL_REDESIGN_REQUIRED', 'NO_INSERT_POINT'); continue; }
    heading = '<h2>공식 인정 기능성</h2>';
    oldBody = '';
    newBody = render(groups, family, true);
    newContent = content.slice(0, at) + heading + newBody + content.slice(at);
    d.sectionCreated = true;
  }
  if (newContent.length < content.length - oldBody.length + newBody.length - 2) { fail('FAILED_SYSTEM', 'SPLICE_LENGTH'); continue; }

  d.status = 'RESOLVED_UPDATED';
  d.why = d.sectionCreated ? 'FUNCTION_SECTION_CREATED' : useLabels ? 'SOURCE_LABEL_GROUPS_RESTORED' : 'FLAT_CLAUSES_RESTORED';
  d.restoredClauses = allNew.length - curAll.length;
  d.groups = groups.map((g) => ({ label: g.label, clauses: g.clauses }));
  decisions.push(d);
  safe.push({ ...d, oldContentHash: sha(content), newContentHash: sha(newContent), newContent });
  rollback.push({ canonicalId: r.canonicalId, candidateId: r.candidateId, productName: r.productName, oldContentHash: sha(content), newContentHash: sha(newContent), oldBlock: oldBody ? fb.heading + oldBody : "", newBlock: heading + newBody, blockOffset: fb ? fb.start : -1, sectionCreated: !!d.sectionCreated });
}

const byStatus = decisions.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {});
const byWhy = decisions.filter((r) => r.status.startsWith('FINAL_HOLD')).reduce((a, r) => { const k = r.why.split(':')[0]; a[k] = (a[k] ?? 0) + 1; return a; }, {});
const checks = {
  total: decisions.length, sum80: decisions.length === 80,
  byStatus, holdReasons: byWhy,
  safeTargets: safe.length,
  safeCanonicalDup: safe.length - new Set(safe.map((r) => r.canonicalId)).size,
  restoredClauses: safe.reduce((a, r) => a + Math.max(0, r.restoredClauses ?? 0), 0),
  failedSystem: decisions.filter((r) => r.status === 'FAILED_SYSTEM').length,
};
fs.writeFileSync(`${D}/hff-ko-final-manual-80-decisions-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), readOnly: true, dbWrites: 0, checks, decisions }, null, 1));
fs.writeFileSync(`${D}/hff-ko-final-manual-80-safe-targets-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), count: safe.length, targets: safe }, null, 1));
fs.writeFileSync(`${D}/hff-ko-final-manual-80-rollback-v1.json`, JSON.stringify({ builtAt: new Date().toISOString(), count: rollback.length, rollback }, null, 1));
console.log(JSON.stringify(checks, null, 2));
