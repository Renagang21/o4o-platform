/**
 * WO-O4O-OTC-EN-SUMMARY-HARDCUT-REMOVAL-AND-2522-CARD-REBUILD-V1
 *   — 매장용 설명서 요약(summary) 파생 규칙 · **언어 중립 단일 공용 함수**
 *
 * 배경(실측 결함):
 *   V4 저작기 7종이 모두 `efficacy.split('\n')[0].slice(0, 120)` 으로 요약을 만들었다.
 *   EN canonical 3,476 중 **2,522** 이 정확히 120자에서 잘렸고, 그중 1,931 은 단어 중간에서 끊겼다.
 *   잘린 문자열은 저장 summary 컬럼과 본문 HTML(sd-hero 배지 · At a glance 타일)에 그대로 노출된다.
 *
 * 규칙(우선순위 — 언어 무관):
 *   1. 효능·효과의 **첫 완결 문장**을 요약으로 쓴다.
 *   2. 축약은 **문장 경계에서만** 허용한다. 고정 길이 절단은 하지 않는다.
 *   3. 의미 단위·의학적 조건(질환명·수치·연령·기간·조건절)을 보존한다.
 *   4. 단어 중간 절단 금지.
 *   5. 괄호·목록·콜론 내부에서 끊지 않는다.
 *   6. 경고·제한 조건을 제거하지 않는다.
 *   7. 문장 종결 부호가 없으면 첫 줄 전체를 그대로 쓴다(임의 절단 금지).
 *
 * 표시 길이는 저장이 아니라 **CSS 로만** 다룬다(줄바꿈). 이미지 텍스트화 금지.
 *
 * 신규 언어(zh·ja·vi·th·id) 파이프라인은 이 함수를 **재사용**한다. slice(n) 복제 금지.
 */

/** 문장 종결 부호 — 라틴/한중일 공통 */
const TERMINATOR = /[.!?。！？]/;
/** 여는 괄호 — 라틴/전각 */
const OPEN = new Set(['(', '[', '（', '［', '「', '『', '{']);
/** 닫는 괄호 */
const CLOSE = new Set([')', ']', '）', '］', '」', '』', '}']);
/** 마침표를 문장 끝으로 보지 않는 약어 꼬리 (영문) */
const ABBR_TAIL = /(\b[A-Z]|\bNo|\betc|\bvs|\bapprox|\bDr|\bMr|\bMs|\bSt|\bFig)$/;

/** 원문에서 첫 비어있지 않은 줄을 얻는다. 줄 구분은 개행만(문단 분리 규칙과 동일). */
export function firstNonEmptyLine(text: string): string {
  if (!text) return '';
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const t = line.trim();
    if (t) return t;
  }
  return '';
}

/**
 * 한 줄에서 **첫 완결 문장**을 잘라낸다.
 * 종결 부호가 없거나 문장이 하나뿐이면 줄 전체를 돌려준다(절단하지 않는다).
 */
export function firstCompleteSentence(line: string): string {
  const s = line.trim();
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (OPEN.has(ch)) { depth++; continue; }
    if (CLOSE.has(ch)) { depth = Math.max(0, depth - 1); continue; }
    if (!TERMINATOR.test(ch) || depth > 0) continue;
    if (ch === '.') {
      const prev = s[i - 1] || '', next = s[i + 1] || '';
      if (/\d/.test(prev) && /\d/.test(next)) continue;          // 소수점 3.5
      if (ABBR_TAIL.test(s.slice(0, i))) continue;               // 약어 E. coli / etc.
      if (next && !/\s/.test(next)) continue;                    // 3.5mg · www.x
    }
    return s.slice(0, i + 1).trim();
  }
  return s;
}

/** 한 줄을 완결 문장 단위로 분해한다(경계 판정은 firstCompleteSentence 와 동일 규칙). */
export function splitCompleteSentences(line: string): string[] {
  const out: string[] = [];
  let rest = line.trim();
  while (rest) {
    const s = firstCompleteSentence(rest);
    out.push(s);
    rest = rest.slice(s.length).trim();
    if (!s) break;
  }
  return out;
}

/**
 * 요약 길이 예산 기본값.
 * 첫 완결 문장은 예산을 넘더라도 **항상 포함**한다(문장 중간 절단 금지가 예산보다 우선).
 * 예산은 두 번째 이후 문장을 더 붙일지만 결정한다.
 */
export const DEFAULT_SUMMARY_BUDGET = 300;

/**
 * 설명서 요약 파생 — **언어 중립 단일 진입점**.
 *
 * @param efficacy 효능·효과 원문(번역본 포함). 문단은 개행으로 구분된다.
 * @param opts.maxChars 요약 길이 예산(기본 300). 문장 경계에서만 적용된다.
 * @returns 첫 줄의 첫 완결 문장 + 예산 안에서 이어지는 완결 문장들. 고정 길이 절단 없음.
 */
export function deriveLeafletSummary(efficacy: string, opts: { maxChars?: number } = {}): string {
  const budget = opts.maxChars ?? DEFAULT_SUMMARY_BUDGET;
  const sentences = splitCompleteSentences(firstNonEmptyLine(efficacy));
  if (sentences.length === 0) return '';
  let out = sentences[0];                                  // 첫 완결 문장은 무조건 포함
  for (let i = 1; i < sentences.length; i++) {
    const next = `${out} ${sentences[i]}`;
    if (next.length > budget) break;                       // 축약은 문장 경계에서만
    out = next;
  }
  return out;
}
