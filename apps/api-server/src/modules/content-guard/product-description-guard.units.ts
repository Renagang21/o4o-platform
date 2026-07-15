/**
 * Product Description Guard — 단위 정규화 (PURE)
 *
 * WO-O4O-PRODUCT-DESCRIPTION-GROUNDING-GUARD-AUTOMATION-V1 §8 A-4 · §15 H
 *
 * 숫자 문자열 비교로 처리하지 않고 **의미값(SI 정규화)** 으로 비교한다.
 *   억 CFU / million CFU / billion CFU  → CFU 절대수
 *   mg / g / μg(㎍/mcg)                 → mg
 */

// ─── 수량(CFU 등) ────────────────────────────────────────────────────────────

/**
 * **수치 표기의 단일 정규화 규칙 (SSOT)**
 *
 * ⚠️ 이 상수를 쓰지 않고 정규식에 숫자 패턴을 직접 쓰지 말 것.
 *
 * 근거(30-A 실측): 소수점 억 오독(`1.5억` → `5억`, 3.3배)이 **4개 파싱 경로에 복제**돼 있었다.
 *   ① source-grounding-parser.parseCfu   ② units.extractKoCounts
 *   ③ rules.PER_UNIT_KO                  ④ rules.DAILY_KO
 * 한 곳씩 고치면 다섯 번째가 또 생긴다. 같은 수치를 읽는 모든 경로는 **같은 규칙**을 공유한다.
 *
 * 매칭: `1` `100` `5,000` `1.5` `2.5` — 천단위 콤마와 소수점 모두 허용.
 */
export const NUM_TOKEN = String.raw`[0-9][0-9,]*(?:\.[0-9]+)?`;
/** 한국어 수사 스케일 토큰 */
export const KO_SCALE_TOKEN = String.raw`(?:조|억|만|천)`;

const KO_SCALE: Record<string, number> = {
  '조': 1e12,
  '억': 1e8,
  '만': 1e4,
  '천': 1e3,
};

const EN_SCALE: Record<string, number> = {
  trillion: 1e12,
  billion: 1e9,
  million: 1e6,
  thousand: 1e3,
};

/** "1,000" → 1000 */
function toNum(raw: string): number {
  return Number(raw.replace(/,/g, ''));
}

export interface CountMatch {
  /** 절대 개수 (CFU 등) */
  value: number;
  matchedText: string;
}

/**
 * 한국어 수량 표기 추출: "100억 CFU", "5,000억", "1억 CFU"
 * 주의: "10,000,000,000(100억) CFU" 처럼 괄호 병기면 둘 다 잡히므로 호출부에서 dedupe.
 */
export function extractKoCounts(text: string): CountMatch[] {
  const out: CountMatch[] = [];
  // 공유 규칙(NUM_TOKEN) 사용 — 소수점 억("1.5억")을 5억으로 오독하던 결손을 잠근다.
  const re = new RegExp(String.raw`(${NUM_TOKEN})\s*(${KO_SCALE_TOKEN})\s*(?:CFU|cfu)?`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const scale = KO_SCALE[m[2]];
    if (!scale) continue;
    out.push({ value: toNum(m[1]) * scale, matchedText: m[0].trim() });
  }
  return out;
}

/** 영어 수량 표기 추출: "10 billion CFU", "100 million CFU" */
export function extractEnCounts(text: string): CountMatch[] {
  const out: CountMatch[] = [];
  const re = /([0-9][0-9,.]*)\s*(trillion|billion|million|thousand)\s*(CFU|cfu)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const scale = EN_SCALE[m[2].toLowerCase()];
    if (!scale) continue;
    out.push({ value: toNum(m[1]) * scale, matchedText: m[0].trim() });
  }
  return out;
}

/** 한국어 억 표기를 영어 표기로 (검증·메시지용) */
export function koCountToEn(value: number): string {
  if (value >= 1e12 && value % 1e12 === 0) return `${value / 1e12} trillion`;
  if (value >= 1e9 && value % 1e9 === 0) return `${value / 1e9} billion`;
  if (value >= 1e6 && value % 1e6 === 0) return `${value / 1e6} million`;
  if (value >= 1e3 && value % 1e3 === 0) return `${value / 1e3} thousand`;
  return String(value);
}

// ─── 중량 ────────────────────────────────────────────────────────────────────

const WEIGHT_TO_MG: Record<string, number> = {
  kg: 1e6,
  g: 1e3,
  mg: 1,
  'μg': 1e-3,
  '㎍': 1e-3,
  'mcg': 1e-3,
  'ug': 1e-3,
};

/** 중량을 mg 로 정규화. 단위 미지원이면 null. */
export function toMg(value: number, unit: string): number | null {
  const u = unit.trim();
  const f = WEIGHT_TO_MG[u] ?? WEIGHT_TO_MG[u.toLowerCase()];
  return f === undefined ? null : value * f;
}

export interface WeightMatch {
  mg: number;
  matchedText: string;
}

/** "450mg", "2g", "1,500 mg", "500㎍" */
export function extractWeights(text: string): WeightMatch[] {
  const out: WeightMatch[] = [];
  const re = /([0-9][0-9,.]*)\s*(kg|mg|㎎|g|μg|㎍|mcg|ug)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const unit = m[2] === '㎎' ? 'mg' : m[2];
    const mg = toMg(toNum(m[1]), unit);
    if (mg === null) continue;
    out.push({ mg, matchedText: m[0].trim() });
  }
  return out;
}

// ─── HTML → 텍스트 ───────────────────────────────────────────────────────────

/** 시맨틱 HTML 초안에서 텍스트만 추출(태그·주석 제거, 엔티티 최소 복원). */
export function stripHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 검출 위치 주변 문맥 추출(메시지용) */
export function contextAround(text: string, index: number, span = 40): string {
  const s = Math.max(0, index - span);
  const e = Math.min(text.length, index + span);
  return (s > 0 ? '…' : '') + text.slice(s, e).trim() + (e < text.length ? '…' : '');
}
