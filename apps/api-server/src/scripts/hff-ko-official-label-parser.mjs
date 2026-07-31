/**
 * WO-O4O-HFF-KO-NONTRANSLATION-RESIDUAL-AND-AGENT9-HOLD-FULL-CLEANUP-V1  §8
 *
 * 공식 MAIN_FNCTN 의 **원료 귀속 라벨**을 확정하는 전용 파서.
 *
 * 왜 필요한가 (실측):
 *   기존 세그먼터(V2)는 `[원료]` 대괄호 라벨만 region header 로 승격한다.
 *   그러나 공식 원문의 상당수는 `원료 : 절` / `원료:절` / 라벨 단독 줄 형태이고,
 *   이 경우 header 가 null 이 되어 "원료 귀속 불명"으로 전량 HOLD 돼 있었다.
 *   → 콜론·단독줄 라벨은 대괄호와 **동등하게 단일 확정적**이다. 추정이 아니다.
 *
 * 계약:
 *   - 세그먼터는 수정하지 않는다(41,261행 회귀 계약). 여기서 **재귀속만** 한다.
 *   - 절 분할은 세그먼터 결과를 그대로 쓴다. 문구를 새로 만들지 않는다.
 *   - 대괄호 손상 복구는 **대괄호 문자만** 바꾸는 편집으로 제한하고,
 *     복구 결과가 유일하지 않으면 복구하지 않는다(§8 "경계가 둘 이상 가능하면 자동 추정 금지").
 *   - 기능성 절 하나라도 라벨에 귀속되지 않으면 전체를 실패로 돌린다(고아 절 금지).
 */
import { createSegmenter } from './hff-ko-function-clause-segmenter-v2.mjs';
import { norm, flat, cmpText, officialGroupRestartCount } from './hff-ko-function-family-preserving-patch.mjs';

const { analyzeFunctions } = createSegmenter({ norm, flat });

/** 대괄호 균형 손상 판정 (기존 WO 계약과 동일). */
export function sourceDamage(src) {
  const s = String(src ?? '');
  let depth = 0;
  for (const ch of s) {
    if (ch === '[') { if (depth > 0) return 'NESTED_OPEN_BRACKET'; depth++; }
    else if (ch === ']') { if (depth === 0) return 'CLOSE_WITHOUT_OPEN'; depth--; }
  }
  return depth !== 0 ? 'UNCLOSED_LABEL_BRACKET' : null;
}

const ING_LIKE = /(추출물|분말|농축액|복합물|유지|프로바이오틱스|발효물|올리고당|펩타이드|엽산|철|아연|구리|셀렌|셀레늄|망간|요오드|칼슘|마그네슘|나이아신|비오틴|판토텐산|루테인|지아잔틴|홍삼|인삼|콜라겐|칼륨|인)/;
const nameLike = (b) => {
  const t = String(b ?? '').trim();
  if (!t || t.length > 60) return false;
  if (/^비타민\s?[A-K][0-9]*$/.test(t)) return true;
  if (ING_LIKE.test(t)) return true;
  return /^[가-힣A-Za-z0-9()（） ·\-,.]{2,40}$/.test(t) && /[가-힣A-Za-z]/.test(t);
};

/* ── 대괄호 손상 복구 (대괄호 문자만 수정) ───────────────────────────── */
/** 원문에서 `[`,`]` 를 제외한 문자열이 동일한지 — 복구가 본문을 건드리지 않았음을 증명. */
const bodyOnly = (s) => String(s).replace(/[[\]]/g, '');

/**
 * 손상된 원문에 대해 **결정적 규칙**만 적용해 복구 후보를 만든다.
 * 규칙이 하나도 적용되지 않거나, 복구 후에도 균형이 맞지 않거나,
 * 본문(대괄호 제외)이 달라지면 복구 실패로 본다.
 */
export function repairBrackets(src) {
  const original = String(src ?? '');
  if (!sourceDamage(original)) return { ok: true, repaired: original, rules: [] };
  const rules = [];
  let s = original;

  /* R1  `[X[`  → `[X]`   (닫는 대괄호를 여는 대괄호로 오타) */
  s = s.replace(/\[([^[\]\n]{1,40})\[/g, (m, body) => {
    if (!nameLike(body)) return m;
    rules.push(`R1_CLOSE_TYPED_AS_OPEN:${body.trim()}`);
    return `[${body}]`;
  });

  /* R2  줄 끝 또는 절 끝의 고아 `[`  → 삭제 */
  s = s.replace(/\[(?=\s*(?:\n|$))/g, () => { rules.push('R2_TRAILING_ORPHAN_OPEN'); return ''; });

  /* R3  `[X][`  → `[X]`   (여는 대괄호 중복) */
  s = s.replace(/(\[[^[\]\n]{1,40}\])\[(?=\s*\S)/g, (m, keep) => {
    rules.push('R3_DUPLICATE_OPEN'); return keep;
  });

  /* R4  줄머리 `X]`  → `[X]`   (여는 대괄호 유실) */
  s = s.split('\n').map((ln) => ln.replace(/^(\s*)([^[\]\n]{1,40})\]/, (m, sp, body) => {
    if (!nameLike(body)) return m;
    rules.push(`R4_MISSING_OPEN:${body.trim()}`);
    return `${sp}[${body}]`;
  })).join('\n');

  /* R5  `[X` + 줄바꿈/다음 라벨 전까지 닫힘 없음  → `[X]` (닫는 대괄호 유실) */
  s = s.replace(/\[([^[\]\n]{1,40})(?=\n)/g, (m, body) => {
    if (!nameLike(body)) return m;
    rules.push(`R5_MISSING_CLOSE_EOL:${body.trim()}`);
    return `[${body}]`;
  });

  /* R6  `[X` + 같은 줄에 절 마커가 뒤따름 → `[X]` */
  s = s.replace(/\[([^[\]\n]{1,40}?)(?=\s*(?:[①-⑳]|\(\s?\d{1,2}\s?\)|\d{1,2}\s?\)))/g, (m, body) => {
    if (!nameLike(body)) return m;
    rules.push(`R6_MISSING_CLOSE_MARKER:${body.trim()}`);
    return `[${body}]`;
  });

  if (!rules.length) return { ok: false, reason: 'NO_APPLICABLE_REPAIR_RULE' };
  if (bodyOnly(s) !== bodyOnly(original)) return { ok: false, reason: 'REPAIR_ALTERED_BODY' };
  const still = sourceDamage(s);
  if (still) return { ok: false, reason: `REPAIR_INCOMPLETE_${still}` };
  return { ok: true, repaired: s, rules };
}

/* ── 콜론 라벨 정규화 ────────────────────────────────────────────────── */
/**
 * `원료 :절` → `원료 : 절` (콜론 뒤 공백 보정).
 * 세그먼터의 콜론 표제 인식 정규식이 `[:：]\s+` 를 요구하기 때문이다.
 * 라벨부만 보고 판정하며 절 본문 문자는 건드리지 않는다.
 */
export function normalizeColonLabels(src) {
  let hits = 0;
  const out = String(src ?? '').split('\n').map((ln) => ln.replace(
    /^(\s*)([^:：\n[\]]{1,40}?)\s*[:：](?=\S)/,
    (m, sp, head) => { if (!nameLike(head)) return m; hits++; return `${sp}${head.trim()} : `; },
  )).join('\n');
  return { text: out, hits };
}

/* ── 열거 마커 정규화 ────────────────────────────────────────────────── */
/**
 * 절·라벨 선두의 **열거 마커**를 제거한다. `2) 피부와 점막을…` → `피부와 점막을…`.
 *
 * 마커는 목록 구조 표기이지 기능성 문구가 아니며, canonical 은 이미 `<li>` 로 열거를
 * 표현한다. 마커를 남기면 (a) 기존 절과 커버리지 대조가 어긋나 **중복 삽입**이 생기고
 * (b) 화면에 `2) 2.` 처럼 이중 열거가 찍힌다. 기능성 문구 자체는 한 글자도 바꾸지 않는다.
 */
export function stripMarker(s) {
  let t = String(s ?? '').trim();
  for (;;) {
    const n = t
      .replace(/^[①-⑳]\s*/, '')
      .replace(/^\(\s*\d{1,2}\s*\)\s*/, '')
      .replace(/^\d{1,2}\s*[).]\s*/, '')
      .replace(/^[-–—·•*]\s*/, '')
      .trim();
    if (n === t) break;
    t = n;
  }
  return t.replace(/[.。]\s*$/, '').trim();
}

/* ── 쉼표 열거 절 분리 ───────────────────────────────────────────────── */
const FUNC_END = /(필요|있음|있습니다|줌|준다|관여|도움|개선)[.。\s]*$/;
/**
 * `A에 필요, B에 필요, C에 도움을 줌` → 3절.
 *
 * **모든** 조각이 기능성 서술어로 끝날 때만 분리한다. `A, B 및 C에 필요` 처럼
 * 후행 표현이 여러 항목에 걸리는 형태는 앞 조각에 서술어가 없으므로 발화하지 않는다
 * (§8 "여러 절에 적용되는 후행 표현" 자동 추정 금지). 각 조각은 원문의 부분 문자열이다.
 */
export function splitEnumeratedClause(clause) {
  const raw = String(clause).trim();
  if (!FUNC_END.test(raw)) return [raw];
  const parts = raw.split(/\s*[,，]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return [raw];
  if (!parts.every((p) => p.length >= 8 && FUNC_END.test(p))) return [raw];
  /* 분리 결과가 원문 문자를 잃지 않았는지 — 구분자(쉼표·공백) 외 손실 0 */
  const strip = (s) => s.replace(/[\s,，]/g, '');
  if (strip(parts.join('')) !== strip(raw)) return [raw];
  return parts;
}

/* ── 라벨 귀속 ───────────────────────────────────────────────────────── */
const HEADER_NOTES = new Set(['원료 표제(콜론 구조)', '원료명·제형명 단독(라벨 없는 헤더 추정)']);

/**
 * 공식 원문 → `[{label, clauses:[…]}]`. 모든 기능성 절이 라벨에 귀속돼야 성공한다.
 * @returns {{ok:true, groups, labelForm, repair, colonHits} | {ok:false, reason:string, detail?:object}}
 */
export function parseOfficialGroups(mainFnctn) {
  const raw = String(mainFnctn ?? '');
  if (!flat(raw)) return { ok: false, reason: 'EMPTY_OFFICIAL_SOURCE' };

  let working = raw, repair = null;
  if (sourceDamage(raw)) {
    repair = repairBrackets(raw);
    if (!repair.ok) return { ok: false, reason: `SOURCE_DAMAGE_${repair.reason}` };
    working = repair.repaired;
  }
  const col = normalizeColonLabels(working);
  working = col.text;

  const a = analyzeFunctions(working);
  /* 세그먼터가 **한국어 절**을 분류하지 못했으면 경계가 확정되지 않은 것이다.
     `unresolvedCount` 는 EN 전용 검토 항목(ENGLISH_ONLY_REVIEW)까지 합산하는데,
     EN 은 이번 WO 범위 밖이며 KO 귀속 판정과 무관하므로 UNRESOLVED 만 본다. */
  const koUnresolved = a.segments.filter((s) => s.kind === 'UNRESOLVED').length;
  if (koUnresolved) return { ok: false, reason: 'SEGMENTER_UNRESOLVED_CLAUSE', detail: { unresolved: koUnresolved } };

  /* 귀속 경로 2가지.
     세그먼터는 대괄호 라벨을 **region 단위로 선행 push** 하므로 세그먼트 순서로 대괄호
     라벨을 따라가면 첫 원료의 절이 마지막 원료에 붙는다. 대괄호가 있으면 반드시
     `blocks`(header ↔ items 쌍)를 쓴다. 콜론·단독줄 라벨만 있을 때는 세그먼트가
     region 내부에서 순서대로 push 되므로 순차 walk 가 정확하다. */
  const groups = [];
  const orphans = [];
  const bracketLabeled = a.blocks.some((b) => b.header != null);
  if (bracketLabeled) {
    if (a.blocks.some((b) => b.header == null && b.items.length)) {
      return { ok: false, reason: 'MIXED_LABELED_AND_UNLABELED' };
    }
    for (const b of a.blocks) {
      const label = String(b.header).trim();
      if (!label) return { ok: false, reason: 'EMPTY_LABEL' };
      const key = cmpText(label);
      const found = groups.find((g) => cmpText(g.label) === key);
      if (found) found.clauses.push(...b.items);
      else groups.push({ label, clauses: [...b.items] });
    }
  } else {
    let cur = null;
    for (const seg of a.segments) {
      if (seg.kind === 'LABEL' || (seg.kind === 'FORM_OR_INGREDIENT' && HEADER_NOTES.has(seg.note))) {
        const label = String(seg.text).trim();
        if (!label) return { ok: false, reason: 'EMPTY_LABEL' };
        const key = cmpText(label);
        const found = groups.find((g) => cmpText(g.label) === key);
        cur = found ?? { label, clauses: [] };
        if (!found) groups.push(cur);
        continue;
      }
      if (seg.kind !== 'FUNCTION_KO') continue;
      if (!cur) { orphans.push(seg.text); continue; }
      cur.clauses.push(seg.text);
    }
  }
  if (orphans.length) {
    /* 라벨이 원문에 **하나도 없는** 경우는 귀속 모호가 아니라 단일 그룹 원문이다.
       단 열거 재시작(①…①, (1)…(1))이 2회 이상이면 라벨 없는 다중 원료이므로 확정할 수 없다. */
    if (groups.length || officialGroupRestartCount(working) > 1) {
      return { ok: false, reason: 'UNATTRIBUTED_CLAUSE', detail: { orphans: orphans.slice(0, 3), labeledGroups: groups.length } };
    }
    return {
      ok: true, groups: [{ label: null, clauses: orphans.flatMap(splitEnumeratedClause).map(stripMarker).filter(Boolean) }],
      labelForm: 'UNLABELED_SINGLE_GROUP', repair: repair ? { rules: repair.rules } : null, colonHits: col.hits,
    };
  }
  const nonEmpty = groups.filter((g) => g.clauses.length);
  if (!nonEmpty.length) return { ok: false, reason: 'NO_LABELED_CLAUSE' };

  /* 절 총수가 세그먼터의 저장 대상 총수와 일치해야 한다 — 재귀속 과정의 누락·중복 0 증명 */
  const total = nonEmpty.reduce((n, g) => n + g.clauses.length, 0);
  if (total !== a.storeItems.length) return { ok: false, reason: 'CLAUSE_COUNT_MISMATCH', detail: { regrouped: total, segmenter: a.storeItems.length } };

  /* 쉼표 열거는 재귀속 검증(절 총수 일치)을 통과한 **뒤에** 분리하고 마커를 정규화한다. */
  for (const g of nonEmpty) {
    g.label = stripMarker(g.label);
    g.clauses = g.clauses.flatMap(splitEnumeratedClause).map(stripMarker).filter(Boolean);
    if (!g.label) return { ok: false, reason: 'EMPTY_LABEL' };
  }

  /* 라벨 간 포함 관계가 있으면 카드 대응이 유일하지 않다 (마커 제거 후 기준) */
  const keys = nonEmpty.map((g) => cmpText(g.label));
  for (let i = 0; i < keys.length; i++) {
    for (let j = 0; j < keys.length; j++) {
      if (i !== j && (keys[i] === keys[j] || keys[i].includes(keys[j]))) {
        return { ok: false, reason: 'LABEL_CONTAINMENT_AMBIGUOUS', detail: { a: nonEmpty[i].label, b: nonEmpty[j].label } };
      }
    }
  }

  return {
    ok: true, groups: nonEmpty,
    labelForm: repair ? 'REPAIRED_BRACKET' : col.hits ? 'COLON' : 'BRACKET',
    repair: repair ? { rules: repair.rules } : null,
    colonHits: col.hits,
  };
}
