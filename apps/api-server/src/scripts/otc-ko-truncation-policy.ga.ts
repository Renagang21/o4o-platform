/**
 * OTC KO 절단 판정 — **언어 무관 SSOT**
 *
 * 책임 경계(중요): 이 판정기가 답하는 질문은 **"이 유닛을 번역해도 되는가"** 하나다.
 *   "이 문서의 KO 내용이 완결됐는가"는 별도 트랙(하드컷 복구·공식 원문 재확보)의 질문이다.
 *   문장이 문법적으로 완결돼 있으면, 그 뒤 문장이 하드컷으로 사라졌더라도 그 유닛 자체를
 *   번역하는 것은 안전하다. 반대로 어절 중간에서 끊긴 조각은 번역하면 절단이 그대로 전파된다.
 *
 * 왜 새로 만들었나 — 구 판정기는 `SENTENCE_KINDS && len>40 && !/[.!?。]$/` 한 줄이었고,
 *   ① 카드·타일의 **명사구 요약 문형**(저작 규약상 종결부호 없음)을 절단으로 오판했고
 *   ② 마침표만 빠진 **한국어 종결어미 완결문**을 절단으로 오판했다.
 *   실측: 732 형식적 절단 중 최소 311 유닛(문서 743)이 이 두 오탐이었다.
 *
 * 설계 원칙
 *   - 슬롯 역할(표시용 요약 / 본문 / 라벨)을 구분해 정책을 달리한다.
 *   - 마침표 유무만으로 한국어 완결성을 판정하지 않는다.
 *   - 태그를 제거한 문자열만 보지 않는다 — 앞뒤 sibling 과 슬롯 사이 태그 구조를 함께 본다.
 *   - 판정에는 항상 reason code 를 남긴다. 이유 없는 generic truncated 판정은 만들지 않는다.
 *   - 애매하면 **차단(보수적)** 이 기본이다. 해제는 근거가 있을 때만 한다.
 *   - zh·ja 등 언어별 선정기는 이 모듈만 import 한다. 규칙을 복제하지 않는다.
 */
import type { Slot } from './otc-zh-slots.ga.js';

export type ReasonCode =
  /* 통과 */
  | 'NOT_APPLICABLE'             // 라벨·제목·코드 슬롯이거나 판정 최소 길이 미만
  | 'TERMINATED'                 // 종결부호로 끝남
  | 'KOREAN_TERMINATOR_COMPLETE' // 마침표는 없으나 한국어 종결어미로 완결
  | 'DISPLAY_SUMMARY_ALLOWED'    // 표시용 요약의 명사구 완결 문형
  | 'DISPLAY_SUMMARY_ELLIPSIS'   // 표시용 요약의 의도된 길이제한 말줄임(같은 문서에 완결본 존재)
  | 'LIST_ITEM_NOUN_PHRASE'      // 형제 항목 다수가 명사구인 열거 목록의 정상 항목
  | 'STRUCTURAL_SPLIT'           // 한 문장이 표시용 <br> 로만 나뉜 구조 분해
  /* 차단 */
  | 'INCOMPLETE_WORD'            // 어절 중간 절단
  | 'OPEN_DELIMITER'             // 괄호가 닫히지 않음
  | 'INCOMPLETE_GRAMMAR'         // 조사·접속어·부사 뒤에서 끝남
  | 'HARD_CUT_RESIDUE';          // 본문 하드컷 잔재(종결 근거 없음)

export const BLOCKING: ReadonlySet<ReasonCode> = new Set<ReasonCode>([
  'INCOMPLETE_WORD', 'OPEN_DELIMITER', 'INCOMPLETE_GRAMMAR', 'HARD_CUT_RESIDUE',
]);

export type Verdict = {
  blocked: boolean;
  reason: ReasonCode;
  /** 표시용 말줄임 요약: 카드 길이·역할을 유지한 채 이 슬롯에서 파생 번역한다. */
  deriveFrom?: { kind: string; text: string };
  /** 구조 분해: 다음 슬롯과 한 문장으로 묶어 번역한다(슬롯 수·태그 골격은 그대로). */
  groupWithNextIndex?: number;
};

/* ── 슬롯 역할 ────────────────────────────────────────────────────────────────
   실제 저작 스키마에서 확인된 것만 넣는다. 이름을 추측해 넓게 제외하지 않는다.
   DISPLAY : sd-badge / sd-item 카드 / sd-meta — 길이 제한이 있는 표시용 요약 슬롯
   BODY    : 문장으로 저작되는 본문·안전정보 슬롯
   그 외   : h1·h2·h3·tag·small·th·td·strong·em·b·span — 원래 종결부호가 없는 라벨 */
const DISPLAY_KINDS: ReadonlySet<string> = new Set(['badge', 'tile', 'meta']);
const BODY_KINDS: ReadonlySet<string> = new Set(['intro', 'intake', 'warn', 'foot', 'para', 'li']);
export type SlotRole = 'display' | 'body' | 'label';
export const roleOf = (kind: string): SlotRole =>
  DISPLAY_KINDS.has(kind) ? 'display' : BODY_KINDS.has(kind) ? 'body' : 'label';

/** 이 길이 이하는 라벨성 짧은 표현이므로 절단 판정 대상이 아니다(구 판정기와 동일 기준). */
export const MIN_JUDGE_LEN = 40;

/* ── 한국어 완결형 ────────────────────────────────────────────────────────────
   조사 원장과 실제 KO canonical 에서 확인된 종결형만 넣는다. suffix 목록을 무제한
   확장하지 않는다. 부정·금기 강도는 훼손하지 않는다 —
   `복용하지 마십시오` 는 `십시오` 로 완결이지만, 그 절단본 `복용하지 마` 는 아래 어절중간
   패턴으로 계속 차단된다. */
const KO_TERMINATOR = /(습니다|십시오|하세요|마세요|입니다|합니다|됩니다|바랍니다|드립니다|주십시오)$/;
/** 종결형의 앞부분에서 끊긴 조각 — 어절 중간 절단의 대표 패턴. */
const MID_WORD = /(습니|합니|됩니|입니|있습|없습|않습|십시|하십|하세|마세|바랍|드립|하지 마|지 마|하십시|하세|되십)$/;
/** 조사·접속어·부사·쉼표로 끝나 문장이 이어져야 하는 상태. */
const OPEN_GRAMMAR = /([,，、]|및|또는|그리고|하여|하고|하며|이며|되어|되며|이나|거나|해야|하여야|되어야|으로|로서|로써|처럼|보다|부터|까지|에서|에게|한테|와|과|의|히|게|도록)$/;
const ELLIPSIS = /(…|\.\.\.)$/;
const HARD_TERMINATOR = /[.!?。！？]$/;

const PAIRS: ReadonlyArray<[string, string]> = [['(', ')'], ['（', '）'], ['[', ']'], ['［', '］'], ['{', '}'], ['〔', '〕']];
/** 괄호 균형. 열린 채 끝나면 절단 신호다. */
export function balancedDelimiters(s: string): boolean {
  for (const [o, c] of PAIRS) {
    let d = 0;
    for (const ch of s) { if (ch === o) d++; else if (ch === c) d--; if (d < 0) return false; }
    if (d !== 0) return false;
  }
  return true;
}

/**
 * 끝에 붙은 **균형 잡힌 괄호 주석**을 벗겨 종결 판정을 한다.
 *   `…수유를 중단하십시오. (야간용)`            → `…중단하십시오.`   (완결)
 *   `…투여하지 마세요(비타민 A결핍증 환자는 제외)` → `…마세요`         (완결)
 *   `…베타차단제(아테놀올,메토프로롤,프로프라놀롤)` → `…베타차단제`     (명사 — 완결 아님)
 * 문자열 전체가 하나의 괄호면 그 내용을 펼쳐서 판정한다(`(…5-10배입니다)`).
 */
export function stripTrailingParenthetical(s: string): string {
  let t = s.trim();
  for (let guard = 0; guard < 6; guard++) {
    const last = t[t.length - 1];
    const pair = PAIRS.find(([, c]) => c === last);
    if (!pair) break;
    const [o, c] = pair;
    let d = 0, i = t.length - 1;
    for (; i >= 0; i--) { if (t[i] === c) d++; else if (t[i] === o) d--; if (d === 0) break; }
    if (i < 0) break;
    const inner = t.slice(i + 1, t.length - 1).trim();
    const head = t.slice(0, i).trim();
    t = head === '' ? inner : head;   // 전체가 괄호면 내용을 펼친다
    if (t === '') return '';
  }
  return t;
}

const norm = (s: string): string => s.replace(/\s+/g, '');
const digits = (s: string): string[] => s.match(/\d+/g) || [];

/** 같은 문서 안에서 이 말줄임 요약의 완결본(보통 intro)을 찾는다. */
export function findSameDocFull(base: string, index: number, all: Slot[]): Slot | null {
  const nb = norm(base.replace(ELLIPSIS, ''));
  if (nb.length < 20) return null;
  const bd = digits(base);
  let best: Slot | null = null;
  for (let i = 0; i < all.length; i++) {
    if (i === index) continue;
    const cand = all[i];
    if (ELLIPSIS.test(cand.text) || MID_WORD.test(cand.text)) continue; // 자기 자신·다른 절단본 배제
    const nc = norm(cand.text);
    if (nc.length < nb.length + 5) continue;
    if (!nc.startsWith(nb)) continue;
    const cd = digits(cand.text);
    if (!bd.every((d) => cd.includes(d))) continue;                     // 수치 지문 보존
    if (!best || norm(cand.text).length > norm(best.text).length) best = cand;
  }
  return best;
}

/** 슬롯 i 와 i+1 사이의 원본 HTML — 태그 구조로 sibling 관계를 판정한다. */
const gap = (html: string, a: Slot, b: Slot): string => html.slice(a.end, b.start);
const isBrOnly = (g: string): boolean => /<br\b/i.test(g) && !/<\/(li|p|ul|ol|td|tr|div|h[1-6])\b/i.test(g);
const isListBoundary = (g: string): boolean => /<\/li\s*>/i.test(g) && /<li\b/i.test(g) && !/<\/(ul|ol)\s*>/i.test(g);

/** 같은 목록에 속한 형제 항목들(자기 포함). */
export function listSiblings(index: number, all: Slot[], html: string): Slot[] {
  const me = all[index];
  const run: Slot[] = [me];
  for (let i = index - 1; i >= 0; i--) {
    if (all[i].kind !== me.kind || !isListBoundary(gap(html, all[i], all[i + 1]))) break;
    run.unshift(all[i]);
  }
  for (let i = index + 1; i < all.length; i++) {
    if (all[i].kind !== me.kind || !isListBoundary(gap(html, all[i - 1], all[i]))) break;
    run.push(all[i]);
  }
  return run;
}

const isComplete = (core: string): boolean => HARD_TERMINATOR.test(core) || KO_TERMINATOR.test(core);

export type JudgeCtx = { index: number; all: Slot[]; html: string };

/**
 * 슬롯 하나의 절단 판정. ctx 가 없으면 문맥 규칙(파생·구조분해·형제목록)은 적용하지 않고
 * 텍스트 단독 규칙만 적용한다(보수적).
 */
export function judgeSlot(kind: string, text: string, ctx?: JudgeCtx): Verdict {
  const role = roleOf(kind);
  if (role === 'label') return { blocked: false, reason: 'NOT_APPLICABLE' };
  const s = text.trim();
  if (s.length <= MIN_JUDGE_LEN) return { blocked: false, reason: 'NOT_APPLICABLE' };

  /* ── 표시용 요약 ───────────────────────────────────────────────────────── */
  if (role === 'display') {
    if (ELLIPSIS.test(s)) {
      const full = ctx ? findSameDocFull(s, ctx.index, ctx.all) : null;
      /* 같은 문서에 완결본이 있으면 이 말줄임은 저작기의 의도된 길이 제한이다.
         KO 는 바꾸지 않고, 번역만 완결본에서 파생시켜 카드 길이·역할을 유지한다. */
      if (full) return { blocked: false, reason: 'DISPLAY_SUMMARY_ELLIPSIS', deriveFrom: { kind: full.kind, text: full.text } };
      return { blocked: true, reason: 'INCOMPLETE_WORD' };   // 근거 없는 말줄임 = 번역 원문 부적합
    }
    if (isComplete(s)) return { blocked: false, reason: HARD_TERMINATOR.test(s) ? 'TERMINATED' : 'KOREAN_TERMINATOR_COMPLETE' };
    if (MID_WORD.test(s)) return { blocked: true, reason: 'INCOMPLETE_WORD' };
    if (!balancedDelimiters(s)) return { blocked: true, reason: 'OPEN_DELIMITER' };
    if (OPEN_GRAMMAR.test(s)) return { blocked: true, reason: 'INCOMPLETE_GRAMMAR' };
    /* 효능·증상 열거로 끝나는 카드 요약은 마침표가 없는 것이 정상 문형이다. */
    return { blocked: false, reason: 'DISPLAY_SUMMARY_ALLOWED' };
  }

  /* ── 본문 ──────────────────────────────────────────────────────────────── */
  const core = stripTrailingParenthetical(s);
  if (HARD_TERMINATOR.test(core)) return { blocked: false, reason: 'TERMINATED' };
  if (KO_TERMINATOR.test(core)) return { blocked: false, reason: 'KOREAN_TERMINATOR_COMPLETE' };
  if (ELLIPSIS.test(s)) return { blocked: true, reason: 'INCOMPLETE_WORD' };
  if (!balancedDelimiters(s)) return { blocked: true, reason: 'OPEN_DELIMITER' };
  if (MID_WORD.test(core)) return { blocked: true, reason: 'INCOMPLETE_WORD' };
  if (OPEN_GRAMMAR.test(core)) {
    /* 한 문장이 표시용 <br> 로만 갈린 경우에 한해 다음 슬롯과 묶는다.
       </li><li> 같은 목록 항목 경계는 병합하지 않는다(독립 용법·주의·금기 항목 보호). */
    if (ctx) {
      const nx = ctx.all[ctx.index + 1];
      if (nx && nx.kind === kind && isBrOnly(gap(ctx.html, ctx.all[ctx.index], nx)))
        return { blocked: false, reason: 'STRUCTURAL_SPLIT', groupWithNextIndex: ctx.index + 1 };
    }
    return { blocked: true, reason: 'INCOMPLETE_GRAMMAR' };
  }
  if (ctx && s.length < 200) {
    /* 형제 항목 다수가 명사구로 끝나는 열거 목록이면 그것이 그 목록의 정상 문형이다.
       하드컷 잔재는 보통 형제 없이 홀로 250자 이상으로 남으므로 이 규칙에 걸리지 않는다. */
    const sib = listSiblings(ctx.index, ctx.all, ctx.html);
    if (sib.length >= 3 && sib.every((x) => x.text.length < 200)) {
      const open = sib.filter((x) => !isComplete(stripTrailingParenthetical(x.text))).length;
      if (open / sib.length >= 0.6) return { blocked: false, reason: 'LIST_ITEM_NOUN_PHRASE' };
    }
  }
  return { blocked: true, reason: 'HARD_CUT_RESIDUE' };
}

/** 문서 단위 판정 — 선정기·조립기·조사기가 모두 이 함수를 쓴다. */
export function judgeDoc(html: string, all: Slot[]): Verdict[] {
  return all.map((s, index) => judgeSlot(s.kind, s.text, { index, all, html }));
}
