/**
 * OTC 다국어 — **번역 슬롯 SSOT** (언어 무관 · 선정기/조립기 공용)
 *
 * 설계: 저작기 레이아웃이 하나가 아니다(sd-* 카드형 · 표+섹션 문단형 등). 레이아웃별 정규식으로
 *   슬롯을 열거하면 **모르는 레이아웃의 본문이 통째로 누락**된다(실측: 표형 문서에서 한글 잔존).
 *   따라서 슬롯은 레이아웃이 아니라 **HTML 텍스트 노드 전수**로 정의한다.
 *   → 모든 텍스트 노드가 해소되면 산출물에 원문 언어가 남을 수 없다(구조적 보장).
 *
 * kind 는 텍스트 노드를 감싸는 **최내곽 요소(tag+class)** 로 결정한다. 기존 sd-* kind 이름을
 *   그대로 쓰므로 이미 확정된 유닛 대응표(uid = kind+sha1(text))는 그대로 유효하다.
 */
import crypto from 'node:crypto';

export const unesc = (s: string): string => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
export const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const T = (h: string): string => unesc(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
export const uid = (kind: string, text: string): string =>
  `${kind}:${crypto.createHash('sha1').update(text).digest('hex').slice(0, 12)}`;

/**
 * KO 원문 절단 감지 — 본문 하드컷 잔재(문장이 종결부호 없이 끊긴 슬롯).
 * 절단된 원문을 번역하면 절단이 그대로 번역문에 전파되므로 번역 대상에서 제외(HOLD)한다.
 * 제목·라벨·코드(h1/h2/tag/th/td/small/meta)는 원래 종결부호가 없으므로 대상이 아니다.
 */
const SENTENCE_KINDS = new Set(['intro', 'tile', 'intake', 'warn', 'foot', 'para', 'badge', 'li']);
export const isTruncatedKo = (kind: string, text: string): boolean =>
  SENTENCE_KINDS.has(kind) && text.length > 40 && !/[.!?。]$/.test(text);
/* 닫는 괄호는 종결부호로 인정하지 않는다 — `…베타차단제(아테놀올,메토프로롤,프로프라놀롤)` 처럼
   열거 괄호에서 잘린 하드컷이 종결로 오인돼 통과하던 사례가 실재한다. */

type El = { tag: string; cls: string };
const VOID = /^(br|hr|img|input|meta|link|source|col)$/;

function kindOf(stack: El[]): string {
  const top = stack[stack.length - 1];
  if (!top) return 'text';
  const c = top.cls, tag = top.tag;
  if (tag === 'span') { if (/sd-badge/.test(c)) return 'badge'; if (/sd-tag/.test(c)) return 'tag'; return 'span'; }
  if (tag === 'p') {
    if (/sd-intro/.test(c)) return 'intro';
    if (/sd-meta/.test(c)) return 'meta';
    if (/sd-intake/.test(c)) return 'intake';
    if (/sd-foot/.test(c)) return 'foot';
    if (stack.some((s) => /sd-item/.test(s.cls))) return 'tile';
    return 'para';
  }
  if (tag === 'li') return stack.some((s) => /sd-warn/.test(s.cls)) ? 'warn' : 'li';
  return tag; // h1·h2·h3·small·strong·th·td·em·b …
}

export type Slot = { kind: string; text: string; start: number; end: number; lead: string; trail: string };

/** 텍스트 노드 전수. start/end 는 원본 문자열 오프셋이므로 그대로 치환에 쓴다. */
export function slots(html: string): Slot[] {
  const out: Slot[] = [];
  const stack: El[] = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*)>/g;
  let last = 0, m: RegExpExecArray | null;
  const take = (s: number, e: number): void => {
    const raw = html.slice(s, e);
    const t = T(raw);
    if (!t) return;
    out.push({ kind: kindOf(stack), text: t, start: s, end: e,
      lead: (raw.match(/^\s*/) || [''])[0], trail: (raw.match(/\s*$/) || [''])[0] });
  };
  while ((m = re.exec(html))) {
    if (m.index > last) take(last, m.index);
    const tag = m[1].toLowerCase(), attrs = m[2] || '';
    if (m[0].startsWith('</')) {
      for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === tag) { stack.length = i; break; }
    } else if (!VOID.test(tag) && !/\/\s*$/.test(attrs)) {
      stack.push({ tag, cls: (attrs.match(/class\s*=\s*"([^"]*)"/) || ['', ''])[1] });
    }
    last = re.lastIndex;
  }
  if (last < html.length) take(last, html.length);
  return out;
}

/** 슬롯별 번역문을 받아 원본 HTML 의 텍스트 노드만 치환한다(태그·class·순서 무변경). */
export function substitute(html: string, resolve: (s: Slot) => string | null): { out: string; missing: Slot[] } {
  const list = slots(html), missing: Slot[] = [];
  let out = '', cur = 0;
  for (const s of list) {
    const z = resolve(s);
    out += html.slice(cur, s.start);
    if (z == null || !z.trim()) { missing.push(s); out += html.slice(s.start, s.end); }
    else out += s.lead + esc(z) + s.trail;
    cur = s.end;
  }
  out += html.slice(cur);
  return { out, missing };
}
