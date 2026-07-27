/**
 * WO-O4O-HFF-KO-FIRST-10000-INTAKE-HINT-AND-DESIGN-TARGETED-BACKFILL-V1
 *
 * 순번 1~10,000 구간 개별생산 스킴(`hff-ko-agent-01-individual.mjs`)이 생산한
 * HFF STORE/ko canonical 설명서의 **제한적 보정**.
 *
 * 보정 범위(3가지만):
 *   A. 주의사항 소스 필드 오류 교정  — IFTKN_ATNT_MATR_CN(전량 공란) → INTAKE_HINT1(공식 원문)
 *   B. 주의사항 → 매장용 **낮은 강조도 참고사항**("섭취 시 참고사항")으로 반영
 *      + sd-foot 의 주의사항 중복 제거, 전문가 문의는 계약 내 sd-cta 로 정상 스타일링
 *   C. 실제 스타일이 적용되지 않는 sd-card 내부 클래스 정비 (sd-note / sd-func / p.sd-who)
 *      + 완전 동일한 기능성 중복(주요 기능성 ≡ 기능성 상세) 1회 표시로 통합
 *
 * 전면 재작성·신규 생산 아님. 기능성/섭취방법/규격/제품명/연결은 불변.
 *
 * 안전 설계:
 *   - v1 결정적 재현: 저장 content == composeKoV1(원문) 을 **전건 검증**. 불일치 = HOLD (미변경).
 *     → v1↔v2 차이는 전부 본 WO 의 의도된 보정에만 귀속됨이 증명된다.
 *   - UPDATE 는 (id, master_id, source_ref_id, STORE/ko/canonical, content=before) 전체 일치 시에만.
 *     0행 = HOLD_CONCURRENT_DRIFT (해당 제품만 보류, 배치 계속).
 *   - 신규 INSERT 0 / DELETE 0 / canonical 재생성 0.
 *   - rollback: v1 을 원문에서 결정적으로 재생성 → beforeSha256 대조 후 복원(`--rollback`).
 *
 * Usage:
 *   dry-run : PGPW=... node apps/api-server/src/scripts/hff-ko-first-10000-targeted-backfill.mjs
 *   apply   : HFF_BF_APPLY_CONFIRM=YES PGPW=... node ... --apply
 *   rollback: HFF_BF_ROLLBACK_CONFIRM=YES PGPW=... node ... --rollback
 */
import pg from 'pg';
import fs from 'node:fs';
import crypto from 'node:crypto';

const APPLY = process.argv.includes('--apply');
const ROLLBACK = process.argv.includes('--rollback');
/** 표본 선별·렌더 검증용 before/after 전수 풀 덤프(세션 로컬, 비커밋). */
const POOL = process.argv.includes('--pool');
const POOL_OUT = process.env.HFF_BF_POOL ?? 'C:/tmp/hff-bf-pool.json';
const PORT = parseInt(process.env.PROXY_PORT ?? '5471', 10);
const DATA_DIR = 'apps/api-server/src/scripts/data';
const BASE = `${DATA_DIR}/hff-ko-first-10000-targeted-backfill`;
const MANIFEST = `${BASE}-manifest.json`;
const REPORT = `${BASE}-report.json`;
const ROLLBACK_MANIFEST = `${BASE}-rollback-manifest.json`;
const SAMPLES = `${BASE}-samples.json`;
/** 커밋하지 않는 로컬 원본 백업(벨트·브레이스). 결정적 rollback 과 별개 안전망. */
const LOCAL_BEFORE_BACKUP = process.env.HFF_BF_BACKUP ?? 'C:/tmp/hff-bf-before-bodies.jsonl';

/** 개별생산 스킴 격리 시그니처(감사 CHECK §0 과 동일). */
const SIGNATURE = '식약처에 신고된 건강기능식품입니다';
const GENERIC_FALLBACK = '섭취 전 제품 표시사항의 주의사항을 확인하십시오.';
const EXPERT_LINE = '섭취 방법이나 본인 상태에 맞는지 궁금하시면 매장 내 약사 등 전문가에게 문의하십시오.';
const FOOT_LINE = '제품 표시사항을 함께 확인하십시오.';

const esc = (s) => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const norm = (s) => (s ?? '').replace(/\r/g, '').replace(/ /g, ' ').replace(/[\t ]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
const flat = (s) => norm(s).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
const li = (arr) => arr.map((x) => `<li>${esc(x)}</li>`).join('');

/* ────────────────────────────── v1 (기존 LIVE) 재현 ──────────────────────────────
   hff-ko-agent-01-individual.mjs 의 composeKo 를 **의미·바이트 동일**하게 복제.
   목적: 저장 content 를 결정적으로 재현해 원문 drift / 타 스킴 혼입을 배제한다. 수정 금지. */

function extractFunctions(rawFn) {
  const text = norm(rawFn);
  if (!text) return { groups: [], flat: [] };
  const flatText = flat(rawFn);
  const groups = [];
  const bracketRe = /\[([^\]]{1,40})\]/g;
  let hasBracket = bracketRe.test(text);
  bracketRe.lastIndex = 0;
  const splitItems = (chunk) => {
    let parts = chunk.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮])/);
    if (parts.length <= 1) parts = chunk.split(/(?:(?<=[.。])\s+)|(?:\s*\n\s*)|(?=\b\d+\)\s)/);
    return parts
      .map((p) => p.replace(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮\-·•\s]*/, '').replace(/^\d+\)\s*/, '').replace(/\s+/g, ' ').trim())
      .filter((p) => p.length >= 4);
  };
  if (hasBracket) {
    const segs = text.split(/(?=\[[^\]]{1,40}\])/);
    for (const seg of segs) {
      const m = seg.match(/^\[([^\]]{1,40})\]/);
      if (!m) continue;
      const header = m[1].trim();
      const body = seg.slice(m[0].length);
      const items = splitItems(body);
      if (items.length) groups.push({ header, items });
    }
  }
  const flatItems = splitItems(text.replace(/\[[^\]]{1,40}\]/g, ' '));
  return { groups, flat: flatItems, flatText };
}

function intakeChips(rawSrv) {
  const s = flat(rawSrv);
  const chips = [];
  for (const m of s.matchAll(/1일\s*[0-9~〜\-]+\s*회/g)) chips.push(m[0].replace(/\s+/g, ' ').trim());
  const verified = [...new Set(chips)].filter((c) => s.includes(c)).slice(0, 2);
  return { chips: verified, raw: s };
}

function specLines(rawBase) {
  const s = norm(rawBase);
  if (!s) return [];
  return s.split(/\n|(?<=[.。])\s+/).map((x) => x.replace(/\s+/g, ' ').trim()).filter((x) => x.length >= 3).slice(0, 6);
}

/** 공통 조각 — v1/v2 가 동일 데이터를 쓰도록 1회만 계산 */
function buildParts(row) {
  const name = flat(row.name);
  if (!name) return { status: 'HOLD', reason: 'PRODUCT_NAME_MISSING' };
  if (!flat(row.mainfnctn)) return { status: 'HOLD', reason: 'NO_FUNCTIONAL_DATA' };
  if (!flat(row.srvuse)) return { status: 'HOLD', reason: 'NO_INTAKE_DATA' };
  const { groups, flat: flatFns, flatText } = extractFunctions(row.mainfnctn);
  let allFns = groups.length ? groups.flatMap((g) => g.items) : flatFns;
  if (!allFns.length && flatText) allFns = [flatText];
  if (!allFns.length) return { status: 'HOLD', reason: 'NO_FUNCTIONAL_DATA' };
  const fidelityFail = allFns.filter((f) => !flatText.includes(f));
  if (fidelityFail.length) return { status: 'HOLD', reason: 'GROUNDING_FIDELITY_FAIL' };
  const intake = intakeChips(row.srvuse);
  const specs = specLines(row.basestandard);
  const badges = `<span class="sd-badge">건강기능식품</span>` +
    (intake.chips.filter((c) => /1일/.test(c)).map((c) => `<span class="sd-badge">${esc(c)}</span>`).join(''));
  const specHtml = specs.length
    ? specs.map((x) => `<div class="sd-item">${esc(x)}</div>`).join('')
    : `<div class="sd-item">공식 기준·규격은 제품 표시사항을 확인하십시오.</div>`;
  const chipsHtml = (intake.chips.length ? intake.chips : ['제품 표시사항 참고']).map((c) => `<span class="sd-tag">${esc(c)}</span>`).join('');
  return { status: 'OK', name, groups, allFns, flatText, intake, specs, badges, specHtml, chipsHtml };
}

/** v1 = 현재 LIVE 마크업(재현 전용). */
function composeKoV1(p) {
  const funcHtml = p.groups.length
    ? p.groups.map((g) => `<li><b>${esc(g.header)}</b><ul class="sd-why">${li(g.items)}</ul></li>`).join('')
    : li(p.allFns);
  const cautionHtml = GENERIC_FALLBACK; // v1 은 IFTKN_ATNT_MATR_CN(전량 공란) → 항상 fallback
  return `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${p.badges}</div>
  <h1>${esc(p.name)}</h1><p class="sd-meta">건강기능식품 · 공식 인정 기능성 기반 매장 설명서</p></div>
  <div class="sd-body"><p class="sd-intro">이 제품은 식약처에 신고된 건강기능식품입니다. 공식적으로 인정된 기능성은 아래와 같습니다.</p>
  <h2>주요 기능성</h2><ul class="${p.groups.length ? 'sd-func' : 'sd-why'}">${funcHtml}</ul>
  <h2>기능성 상세</h2><ul class="sd-why">${li(p.allFns)}</ul>
  <h2>섭취량 및 섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${p.chipsHtml}</span><p class="sd-meta">${esc(p.intake.raw)}</p></div>
  <h2>섭취 시 주의사항</h2><div class="sd-note">${cautionHtml}</div>
  <h2>확인 가능한 기준·규격 정보</h2><div class="sd-spec">${p.specHtml}</div>
  <h2>매장 전문가 문의 안내</h2><p class="sd-who">${EXPERT_LINE}</p></div>
  <div class="sd-foot"><b>섭취 시 주의사항</b> · ${cautionHtml}</div></div>`;
}

/* ────────────────────────────── 보정 A — INTAKE_HINT1 파서 ──────────────────────────────
   공식 원문을 **의미 보존**한 채 가독 단위로만 분리한다. 문구 추가·강화·삭제 없음.
   모든 항목은 flat(INTAKE_HINT1) 의 부분문자열이어야 한다(반날조 불변식). */

const MARKER_LEAD = /^(?:[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽]\s*|\([가-힣]\)\s*|\d+\s*[).]\s*|[-·•‐‑–—]\s*)+/;

function splitHintLine(line) {
  // 한 줄에 마커가 2개 이상이면 마커 앞에서 분리
  const marks = [
    /(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/,
    /(?=[⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽])/,
    /(?=\([가-힣]\)\s)/,
    /(?=(?:^|\s)\d+\s*[).]\s)/,
  ];
  for (const re of marks) {
    const parts = line.split(re).map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 2) return parts;
  }
  return [line];
}

function cleanHintItem(s) {
  return s.replace(MARKER_LEAD, '').replace(/\s+/g, ' ').trim();
}

/**
 * INTAKE_HINT1 → blocks[{header|null, items[]}]
 * 반환 status: 'NONE'(원문 공란/무의미) | 'OK' | 'HOLD'(파싱 결과가 원문을 충실히 담지 못함)
 */
function parseIntakeHint(raw) {
  const text = norm(raw);
  const meaningful = text.replace(/[\s\-·•‐‑–—.,:;()\u3000]/g, '');
  if (!text || meaningful.length < 4 || /^(?:없음|해당\s*없음|해당사항\s*없음)$/.test(text.trim())) {
    return { status: 'NONE', blocks: [], flatText: flat(raw) };
  }
  const flatText = flat(raw);

  const bodyToItems = (body) => {
    const out = [];
    for (const line of body.split(/\n+/)) {
      const t = line.trim();
      if (!t) continue;
      for (const piece of splitHintLine(t)) {
        const c = cleanHintItem(piece);
        // 임계 1자 — 원료명이 1자인 항목(예: "5.철")까지 보존한다. 마커만 남은 조각은 여기서 걸러진다.
        if (c.replace(/[\s.,:;()]/g, '').length >= 1) out.push(c);
      }
    }
    // 원문에 동일 문장이 원료별로 반복되는 경우가 많다(예: "이상사례 발생 시 …" ×3).
    // 완전 동일 문장만 1회로 정리 — 의미 손실 0. 과소추출 가드는 dedupe 이전 기준(rawAll)으로 판정한다.
    rawAll.push(...out);
    return [...new Set(out)];
  };

  const rawAll = [];
  const blocks = [];
  if (/\[[^\]]{1,40}\]/.test(text)) {
    const segs = text.split(/(?=\[[^\]]{1,40}\])/);
    for (const seg of segs) {
      const m = seg.match(/^\[([^\]]{1,40})\]/);
      const header = m ? m[1].trim() : null;
      const body = m ? seg.slice(m[0].length) : seg;
      const items = bodyToItems(body);
      if (items.length) blocks.push({ header, items });
    }
  } else {
    const items = bodyToItems(text);
    if (items.length) blocks.push({ header: null, items });
  }
  if (!blocks.length) return { status: 'NONE', blocks: [], flatText };

  // 반날조 불변식: 모든 항목 ⊆ flat(원문)
  const bad = blocks.flatMap((b) => b.items).filter((i) => !flatText.includes(i));
  if (bad.length) {
    // 마커 분리가 원문 표기와 어긋난 경우 → 줄 단위 원문만 사용(무손실 fallback)
    const lines = text.split(/\n+/).map((x) => x.trim()).filter((x) => x.replace(/[\s.,:;()]/g, '').length >= 2);
    const safe = [...new Set(lines)].filter((l) => flatText.includes(l));
    if (!safe.length || safe.length !== new Set(lines).size) return { status: 'HOLD', blocks: [], flatText, reason: 'HINT_GROUNDING_FAIL' };
    return { status: 'OK', blocks: [{ header: null, items: safe }], flatText, fallback: true };
  }

  // 과소추출 가드(파서가 원문 일부를 흘리지 않았는가) — 문자 커버리지 ≥ 0.9
  const strip = (s) => s.replace(/[\s\[\]()①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽.,:;·•\-]/g, '');
  const covered = strip(blocks.map((b) => b.header ?? '').join('') + rawAll.join('')).length;
  const total = strip(flatText).length;
  if (total > 0 && covered / total < 0.9) return { status: 'HOLD', blocks: [], flatText, reason: 'HINT_UNDER_EXTRACTION', coverage: +(covered / total).toFixed(3) };

  return { status: 'OK', blocks, flatText };
}

/* ────────────────────────────── v2 = 보정본 ────────────────────────────── */

/** blocks → 계약 내 보조 정보 카드(sd-core > sd-item). 1개면 그리드 빈 칸을 피해 단독 카드. */
function blocksToCards(blocks) {
  const card = (b) =>
    `<div class="sd-item">${b.header ? `<span class="sd-tag">${esc(b.header)}</span>` : ''}<ul>${li(b.items)}</ul></div>`;
  if (blocks.length >= 2) return `<div class="sd-core">${blocks.map(card).join('')}</div>`;
  return card(blocks[0]);
}

function composeKoV2(p, hint) {
  // C: sd-func(무스타일) → 계약 내 sd-core>sd-item. 그룹 없으면 기존 sd-why 유지(이미 정상).
  const funcSection = p.groups.length
    ? blocksToCards(p.groups.map((g) => ({ header: g.header, items: g.items })))
    : `<ul class="sd-why">${li(p.allFns)}</ul>`;

  // C: "주요 기능성" ≡ "기능성 상세"(문장 집합 동일) → 1회만 표시
  // B: 공식 참고사항. 원문 공란이면 섹션 자체를 렌더하지 않는다(빈 카드 0 / 일괄 경고 삽입 0).
  const hintSection = hint.status === 'OK'
    ? `\n  <h2>섭취 시 참고사항</h2>${blocksToCards(hint.blocks)}`
    : '';

  return `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${p.badges}</div>
  <h1>${esc(p.name)}</h1><p class="sd-meta">건강기능식품 · 공식 인정 기능성 기반 매장 설명서</p></div>
  <div class="sd-body"><p class="sd-intro">이 제품은 식약처에 신고된 건강기능식품입니다. 공식적으로 인정된 기능성은 아래와 같습니다.</p>
  <h2>주요 기능성</h2>${funcSection}
  <h2>섭취량 및 섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${p.chipsHtml}</span><p class="sd-meta">${esc(p.intake.raw)}</p></div>${hintSection}
  <h2>확인 가능한 기준·규격 정보</h2><div class="sd-spec">${p.specHtml}</div>
  <h2>매장 전문가 문의 안내</h2><div class="sd-cta"><p>${EXPERT_LINE}</p></div></div>
  <div class="sd-foot">${FOOT_LINE}</div></div>`;
}

/* ────────────────────────────── 검증 ────────────────────────────── */

const textOf = (html) => html.replace(/<[^>]+>/g, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const liSet = (html) => new Set((html.match(/<li>([\s\S]*?)<\/li>/g) || []).map((x) => unesc(x.replace(/<\/?li>/g, '').replace(/<[^>]+>/g, '')).trim()).filter(Boolean));

/** v1 → v2 차이가 의도된 보정에만 귀속되는지 확인. 위반 1건이라도 있으면 그 제품 HOLD. */
function verifyTransform(p, hint, v1, v2) {
  const errs = [];
  // 1) 제품명·hero·intro·섭취·규격 불변
  const heroRe = /<div class="sd-hero">[\s\S]*?<\/div>/;
  if ((v1.match(heroRe) || [])[0] !== (v2.match(heroRe) || [])[0]) errs.push('HERO_CHANGED');
  const introRe = /<p class="sd-intro">[\s\S]*?<\/p>/;
  if ((v1.match(introRe) || [])[0] !== (v2.match(introRe) || [])[0]) errs.push('INTRO_CHANGED');
  const intakeRe = /<div class="sd-intake">[\s\S]*?<\/div>/;
  if ((v1.match(intakeRe) || [])[0] !== (v2.match(intakeRe) || [])[0]) errs.push('INTAKE_CHANGED');
  const specRe = /<div class="sd-spec">[\s\S]*?(?=\n  <h2>매장 전문가)/;
  if ((v1.match(specRe) || [])[0] !== (v2.match(specRe) || [])[0]) errs.push('SPEC_CHANGED');
  if (!v2.includes(`<h1>${esc(p.name)}</h1>`)) errs.push('NAME_MISSING');

  // 2) 기능성 문장 집합 동일(중복 제거는 표시 횟수만 줄인다 — 문장 손실 0)
  const fnV2 = new Set(p.allFns);
  const v2Items = liSet(v2);
  for (const f of fnV2) if (!v2Items.has(f)) errs.push('FUNCTION_SENTENCE_LOST');
  // 3) 기능성 문장이 원문 MAIN_FNCTN 부분문자열
  for (const f of fnV2) if (!p.flatText.includes(f)) errs.push('FUNCTION_NOT_GROUNDED');
  // 4) 참고사항 항목 ⊆ 원문 INTAKE_HINT1
  if (hint.status === 'OK') {
    for (const b of hint.blocks) for (const i of b.items) if (!hint.flatText.includes(i)) errs.push('HINT_NOT_GROUNDED');
    if (!v2.includes('<h2>섭취 시 참고사항</h2>')) errs.push('HINT_SECTION_MISSING');
  } else if (v2.includes('섭취 시 참고사항')) errs.push('EMPTY_HINT_SECTION_RENDERED');

  // 5) 원문보다 강한 표현/새 경고 어휘 추가 0 — 참고사항 텍스트가 원문 밖 강조어를 도입하지 않았는가
  const addedText = textOf(v2).split('\n').map((x) => x.trim()).filter(Boolean)
    .filter((line) => !textOf(v1).includes(line));
  const STRONG = /(위험|절대|반드시 중단|금지|경고|치명|사망|즉시 중단)/;
  for (const line of addedText) {
    if (STRONG.test(line) && !hint.flatText.includes(line)) errs.push(`STRONGER_THAN_SOURCE:${line.slice(0, 30)}`);
  }
  // 6) 무스타일 클래스 잔존 0 / generic fallback 잔존 0 / 빈 카드 0
  if (/class="sd-note"|class="sd-func"/.test(v2)) errs.push('UNSTYLED_CLASS_REMAINS');
  if (v2.includes(GENERIC_FALLBACK)) errs.push('GENERIC_FALLBACK_REMAINS');
  if (/<p class="sd-who">/.test(v2)) errs.push('SD_WHO_ON_P_REMAINS');
  if (/<ul>\s*<\/ul>|<div class="sd-item">\s*<\/div>|<h2>[^<]*<\/h2>\s*(?=<h2>)/.test(v2)) errs.push('EMPTY_BLOCK');
  // 7) 구조 온전성
  if ((v2.match(/<div/g) || []).length !== (v2.match(/<\/div>/g) || []).length) errs.push('DIV_UNBALANCED');
  if ((v2.match(/<ul/g) || []).length !== (v2.match(/<\/ul>/g) || []).length) errs.push('UL_UNBALANCED');
  if (/<style|style=/.test(v2)) errs.push('STYLE_FORBIDDEN');
  const plain = v2.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (plain.length < 60) errs.push('BODY_TOO_SHORT');
  for (const h of ['주요 기능성', '섭취량 및 섭취방법', '확인 가능한 기준', '매장 전문가 문의']) {
    if (!v2.includes(h)) errs.push(`SECTION_MISSING:${h}`);
  }
  return [...new Set(errs)];
}

/* ────────────────────────────── 실행 ────────────────────────────── */

const SELECT_TARGETS = `
  SELECT d.id AS description_id, d.master_id, d.content, d.source_ref_id AS candidate_id,
    pc.raw_payload::jsonb->'source'->>'STTEMNT_NO'   AS stmt,
    pc.raw_payload::jsonb->'source'->>'PRDUCT'       AS name,
    pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN'   AS mainfnctn,
    pc.raw_payload::jsonb->'source'->>'SRV_USE'      AS srvuse,
    pc.raw_payload::jsonb->'source'->>'BASE_STANDARD' AS basestandard,
    pc.raw_payload::jsonb->'source'->>'INTAKE_HINT1' AS intakehint1,
    pc.raw_payload::jsonb->'source'->>'IFTKN_ATNT_MATR_CN' AS legacyattn
  FROM shared_product_descriptions d
  JOIN product_candidates pc ON pc.id = d.source_ref_id AND pc.deleted_at IS NULL
  WHERE d.source_type='o4o_hff_generated' AND d.description_type='STORE' AND d.status='canonical'
    AND coalesce(d.language,'ko')='ko' AND d.deleted_at IS NULL
    AND d.content LIKE '%' || $1 || '%'
  ORDER BY d.created_at, d.id`;

/**
 * 결정적 rollback — 원문에서 v1 을 재생성해 beforeBodyHash 와 대조한 뒤에만 복원한다.
 * 현재 DB 본문이 afterBodyHash 와 다르면(제3자 변경) 그 제품은 건너뛴다.
 */
async function rollbackRun(client) {
  const rb = JSON.parse(fs.readFileSync(ROLLBACK_MANIFEST, 'utf8'));
  const counts = { total: rb.items.length, restored: 0, skippedDrift: 0, hashMismatch: 0 };
  for (const it of rb.items) {
    const q = await client.query(`
      SELECT d.content, pc.raw_payload::jsonb->'source'->>'PRDUCT' AS name,
        pc.raw_payload::jsonb->'source'->>'MAIN_FNCTN' AS mainfnctn,
        pc.raw_payload::jsonb->'source'->>'SRV_USE' AS srvuse,
        pc.raw_payload::jsonb->'source'->>'BASE_STANDARD' AS basestandard
      FROM shared_product_descriptions d JOIN product_candidates pc ON pc.id=d.source_ref_id
      WHERE d.id=$1 AND d.deleted_at IS NULL`, [it.descriptionId]);
    if (!q.rowCount) { counts.skippedDrift++; continue; }
    const cur = q.rows[0].content;
    if (sha(cur) !== it.afterBodyHash) { counts.skippedDrift++; continue; }
    const parts = buildParts(q.rows[0]);
    if (parts.status !== 'OK') { counts.hashMismatch++; continue; }
    const v1 = composeKoV1(parts);
    if (sha(v1) !== it.beforeBodyHash) { counts.hashMismatch++; continue; }
    const up = await client.query(
      `UPDATE shared_product_descriptions SET content=$2, updated_at=now() WHERE id=$1 AND content=$3`,
      [it.descriptionId, v1, cur]);
    if (up.rowCount === 1) counts.restored++; else counts.skippedDrift++;
  }
  console.log('JSON_REPORT_BEGIN');
  console.log(JSON.stringify({ mode: 'rollback', counts }, null, 2));
  console.log('JSON_REPORT_END');
}

async function main() {
  if (APPLY && process.env.HFF_BF_APPLY_CONFIRM !== 'YES') throw new Error('APPLY_BLOCKED: --apply 는 HFF_BF_APPLY_CONFIRM=YES 필요');
  if (ROLLBACK && process.env.HFF_BF_ROLLBACK_CONFIRM !== 'YES') throw new Error('ROLLBACK_BLOCKED: HFF_BF_ROLLBACK_CONFIRM=YES 필요');
  if (APPLY && ROLLBACK) throw new Error('--apply 와 --rollback 동시 사용 금지');

  const client = new pg.Client({ host: '127.0.0.1', port: PORT, user: 'o4o_api', password: process.env.PGPW, database: 'o4o_platform', ssl: false });
  await client.connect();

  if (ROLLBACK) { await rollbackRun(client); await client.end(); return; }

  const rows = (await client.query(SELECT_TARGETS, [SIGNATURE])).rows;

  // manifest 고정: 최초 dry-run 에서 생성, 이후 재파생 mismatch 를 검사한다.
  const frozen = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : null;

  const manifest = [];
  const backup = [];
  const results = [];
  const samples = [];
  const pool = [];
  const counts = {
    target: rows.length, ok: 0, hold: 0, applied: 0, driftHold: 0,
    hintPresent: 0, hintAbsent: 0, hintFallbackParse: 0,
    duplicateFunctionSectionRemoved: 0, sdNoteFixed: 0, sdFuncFixed: 0, sdWhoOnPFixed: 0,
    footDedup: 0, genericFallbackRemoved: 0, unchanged: 0,
  };
  const holdByReason = {};
  const t0 = Date.now();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const before = r.content;
    const parts = buildParts(r);
    let hold = null;
    let v1 = null, v2 = null, hint = null;

    if (parts.status !== 'OK') hold = parts.reason;
    else {
      v1 = composeKoV1(parts);
      if (v1 !== before) hold = 'V1_REPRODUCE_MISMATCH';
      else {
        hint = parseIntakeHint(r.intakehint1);
        if (hint.status === 'HOLD') hold = hint.reason;
        else {
          v2 = composeKoV2(parts, hint);
          const errs = verifyTransform(parts, hint, v1, v2);
          if (errs.length) hold = `VERIFY:${errs[0]}`;
        }
      }
    }

    if (hold) {
      counts.hold++; holdByReason[hold] = (holdByReason[hold] || 0) + 1;
      results.push({ i, descriptionId: r.description_id, statementNo: r.stmt, productName: r.name, status: 'HOLD', reason: hold });
      continue;
    }

    counts.ok++;
    if (hint.status === 'OK') counts.hintPresent++; else counts.hintAbsent++;
    if (hint.fallback) counts.hintFallbackParse++;
    if (v1.includes('<h2>기능성 상세</h2>')) counts.duplicateFunctionSectionRemoved++;
    if (v1.includes('class="sd-note"')) counts.sdNoteFixed++;
    if (v1.includes('class="sd-func"')) counts.sdFuncFixed++;
    if (v1.includes('<p class="sd-who">')) counts.sdWhoOnPFixed++;
    if (v1.includes(`<div class="sd-foot"><b>섭취 시 주의사항</b>`)) counts.footDedup++;
    if (v1.includes(GENERIC_FALLBACK)) counts.genericFallbackRemoved++;
    if (v2 === before) counts.unchanged++;

    const entry = {
      candidateId: r.candidate_id, statementNo: r.stmt, productMasterId: r.master_id,
      descriptionId: r.description_id, productName: r.name,
      mainFnctn: flat(r.mainfnctn), srvUse: flat(r.srvuse), intakeHint1: flat(r.intakehint1),
      beforeBodyHash: sha(before), afterBodyHash: sha(v2),
      hintStatus: hint.status, hintBlocks: hint.blocks.length,
      hintItems: hint.blocks.reduce((n, b) => n + b.items.length, 0),
    };
    manifest.push(entry);
    backup.push(JSON.stringify({ descriptionId: r.description_id, beforeBodyHash: entry.beforeBodyHash, before }));
    results.push({ i, descriptionId: r.description_id, statementNo: r.stmt, productName: r.name, status: 'READY' });

    if (POOL) {
      pool.push({
        descriptionId: r.description_id, statementNo: r.stmt, productName: r.name,
        hint: flat(r.intakehint1), hintStatus: hint.status,
        mainFnctn: flat(r.mainfnctn), srvUse: flat(r.srvuse), before, after: v2,
      });
    }

    if (samples.length < 40 && (i % 97 === 0 || hint.status !== 'OK' || hint.blocks.length >= 2)) {
      samples.push({ i, productName: r.name, statementNo: r.stmt, hintStatus: hint.status, intakeHint1: flat(r.intakehint1), before, after: v2 });
    }

    if (APPLY) {
      const up = await client.query(
        `UPDATE shared_product_descriptions SET content=$2, updated_at=now()
         WHERE id=$1 AND master_id=$3 AND source_ref_id=$4 AND description_type='STORE'
           AND status='canonical' AND coalesce(language,'ko')='ko' AND deleted_at IS NULL AND content=$5`,
        [r.description_id, v2, r.master_id, r.candidate_id, before]);
      if (up.rowCount === 1) { counts.applied++; results[results.length - 1].status = 'UPDATED'; }
      else { counts.driftHold++; results[results.length - 1].status = 'HOLD_CONCURRENT_DRIFT'; manifest.pop(); backup.pop(); counts.ok--; }
    }

  }

  // manifest 재파생 mismatch 검사
  let manifestMismatch = null;
  if (frozen && !APPLY && !ROLLBACK) {
    const a = new Set(frozen.map((x) => x.descriptionId));
    const b = new Set(manifest.map((x) => x.descriptionId));
    const onlyFrozen = [...a].filter((x) => !b.has(x));
    const onlyNow = [...b].filter((x) => !a.has(x));
    const hashDiff = manifest.filter((x) => {
      const f = frozen.find((y) => y.descriptionId === x.descriptionId);
      return f && f.beforeBodyHash !== x.beforeBodyHash;
    }).length;
    manifestMismatch = { onlyFrozen: onlyFrozen.length, onlyNow: onlyNow.length, beforeHashDiff: hashDiff };
  }

  if (!ROLLBACK) {
    // manifest 는 최초 dry-run 에서 1회만 고정한다(이후 실행은 재파생 대조만).
    if (!frozen) fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
    fs.writeFileSync(SAMPLES, JSON.stringify(samples, null, 1));
    fs.writeFileSync(REPORT, JSON.stringify({
      wo: 'WO-O4O-HFF-KO-FIRST-10000-INTAKE-HINT-AND-DESIGN-TARGETED-BACKFILL-V1',
      mode: APPLY ? 'apply' : 'dry-run', finishedAt: new Date().toISOString(),
      elapsedMs: Date.now() - t0, counts, holdByReason, manifestMismatch, results,
    }, null, 1));
    if (APPLY) {
      fs.writeFileSync(ROLLBACK_MANIFEST, JSON.stringify({
        note: 'v1(보정 전) 본문은 원문에서 결정적으로 재생성된다(composeKoV1). --rollback 은 재생성본의 sha256 이 beforeBodyHash 와 일치할 때만 복원한다.',
        appliedAt: new Date().toISOString(), count: manifest.length,
        items: manifest.map((m) => ({ descriptionId: m.descriptionId, candidateId: m.candidateId, productMasterId: m.productMasterId, beforeBodyHash: m.beforeBodyHash, afterBodyHash: m.afterBodyHash })),
      }, null, 1));
    }
    try { fs.writeFileSync(LOCAL_BEFORE_BACKUP, backup.join('\n') + '\n'); } catch (e) { console.error('backup write skipped:', e.message); }
    if (POOL) fs.writeFileSync(POOL_OUT, JSON.stringify(pool));
  }

  console.log('JSON_REPORT_BEGIN');
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : ROLLBACK ? 'rollback' : 'dry-run', counts, holdByReason, manifestMismatch, elapsedMs: Date.now() - t0 }, null, 2));
  console.log('JSON_REPORT_END');
  await client.end();
}

main().catch((e) => { console.error('[hff-bf] FAILED:', e?.message || e); process.exit(1); });
