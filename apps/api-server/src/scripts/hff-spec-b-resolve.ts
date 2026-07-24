/**
 * Agent B 소유 — **additive** spec resolver. 공용 `hff-source-parse.ts` 는 수정하지 않는다.
 *
 * 공용 `parseSpecs` 의 `SPEC_RE` 는 비율 tail 을 `X~Y%` / `이상` 두 형태만 인정한다.
 * 실측 결과 미해석(`UNKNOWN_SPEC_LABEL`·`noSpec`)의 지배적 원인은 **원료가 아니라 비율 표기 변형**이었다.
 *
 *   공용 인식   : `아연 : 표시량(12 mg/1,000 mg)의 80~150%`
 *   미인식 변형 : `... 의 80%~150%`            (퍼센트 기호가 각 수치에)
 *                `... 의 80% 이상 150% 이하`   (이상/이하 서술형)
 *                `... 의 80～120%`             (전각 물결 U+FF5E · U+301C)
 *
 * 세 변형은 `X~Y%` 와 **의미가 완전히 동일한 표기**이며, 값·단위·기준량은 원문에서 그대로 캡처한다.
 * 수치·단위를 추정하거나 총 내용량을 원료량으로 대체하지 않는다.
 *
 * 라벨 매핑 추가는 1건뿐이다. 공용 `classify` 의 철 정규식은 `철\s*[:：(]` 이라 콜론이 이미 소비된
 * bare `철` 라벨에 매치되지 않는다(명백한 false negative). `철`/`철(Fe)` 만 canonical `철` 로 매핑한다.
 *
 * 안전망은 공용보다 **강화**한다. 기준량 단위가 mL/L 인 라인(액상)도 미해석 라벨로 올려
 * 부분 파싱 상태로 생산에 들어가지 않게 한다.
 */
import { NONFUNC, classify, normalizeSpecText, type Spec, type SpecParse } from './hff-source-parse.js';

const LABEL = '([가-힣A-Za-z0-9()\\-·]{1,20}(?:\\s[가-힣A-Za-z0-9()\\-·]{1,12})?)';
const HEAD = '\\s*[:：]\\s*(?:표시량\\s*)?\\(?\\s*';
const VALUE = '([\\d][\\d,.]*)\\s*(mg|g|μg|mcg|IU)\\s*(?:RAE|RE|α-?TE|NE|DFE)?\\s*';
const BASIS = '\\/\\s*([\\d][\\d,.]*)\\s*(mg|g)\\s*\\)?';
const TILDE = '[~∼～〜－–—\\-]';

/** 공용 tail(`X~Y%` · `이상`) + B 전용 동의 표기 2종(`X%~Y%` · `X% 이상 Y% 이하`). 전각 물결 포함. */
const TAIL =
  '\\s*\\)?\\s*\\(?\\s*(?:의\\s*)?(?:표시량의\\s*)?(?:' +
  `([\\d.]+)\\s*[%％]?\\s*${TILDE}\\s*([\\d.]+)\\s*[%％]` +          // 80~150% · 80%~150% · 80～120%
  '|([\\d.]+)\\s*[%％]\\s*이상\\s*([\\d.]+)\\s*[%％]\\s*이하' +      // 80% 이상 150% 이하
  '|(이상)' +
  ')\\s*\\)?';

const SPEC_RE_B = new RegExp(LABEL + HEAD + VALUE + BASIS + TAIL, 'gi');

/** 안전망 — 값/기준량 규격 라인 탐지(비율 불요). 공용과 달리 mL/L 기준량도 포함해 액상 부분파싱을 차단한다. */
const LOOSE_RE_B = new RegExp(
  LABEL + '\\s*[:：]\\s*(?:표시량\\s*)?\\(?\\s*' +
  '[\\d][\\d,.]*\\s*(?:mg|g|μg|mcg|IU)\\s*(?:RAE|RE|α-?TE|NE|DFE)?\\s*' +
  '\\/\\s*[\\d][\\d,.]*\\s*(?:mg|g|mL|ml|L|㎖)\\b',
  'gi',
);

const uNorm = (u: string): string => { const x = u.replace(/\s/g, ''); if (/^(mcg|μg)$/i.test(x)) return 'μg'; if (/^iu$/i.test(x)) return 'IU'; return x.toLowerCase() === 'g' ? 'g' : 'mg'; };
const numOf = (s: string): number => parseFloat(s.replace(/,/g, ''));

/** B 전용 라벨 보완 — 공용 classify 가 못 잡는 **명백한 동일 표현**만. 신규 원료는 추가하지 않는다. */
const B_LABEL_EXTRA: Array<{ k: string; re: RegExp }> = [
  { k: '철', re: /^철(?:\s*\(\s*Fe\s*\))?$/i },
];
function classifyB(label: string): string | null {
  const k = classify(label);
  if (k) return k;
  const bare = label.replace(/^\d+\s*[).]\s*/, '').replace(/^\(\s*\d+\s*\)\s*/, '').trim();
  for (const c of B_LABEL_EXTRA) if (c.re.test(bare)) return c.k;
  return null;
}

export interface SpecParseB extends SpecParse { recoveredRatios: string[] }

/** 공용 `parseSpecs` 와 동일 계약(byKey + unknownLabels) + 회수된 비율 표기 기록. */
export function parseSpecsB(base: string): SpecParseB {
  const b = normalizeSpecText(base);
  const byKey = new Map<string, Spec>(); const unknownLabels: string[] = []; const recoveredRatios: string[] = [];
  const matchedSpans: Array<[number, number]> = [];
  SPEC_RE_B.lastIndex = 0; let m: RegExpExecArray | null;
  while ((m = SPEC_RE_B.exec(b)) !== null) {
    matchedSpans.push([m.index, m.index + m[0].length]);
    const label = m[1].trim(); if (NONFUNC.test(label)) continue;
    const k = classifyB(label); if (!k) { unknownLabels.push(label); continue; }
    if (byKey.has(k)) continue;
    const lo = m[6] ?? m[8]; const hi = m[7] ?? m[9];
    const ratio = lo && hi ? `${lo}~${hi}%` : '표시량 이상';
    recoveredRatios.push(`${k}:${ratio}`);
    byKey.set(k, { value: numOf(m[2]), unit: uNorm(m[3]), basisAmount: numOf(m[4]), basisUnit: uNorm(m[5]), ratio, evidence: m[0].trim() });
  }
  LOOSE_RE_B.lastIndex = 0; let lm: RegExpExecArray | null;
  while ((lm = LOOSE_RE_B.exec(b)) !== null) {
    const label = lm[1].trim(); if (NONFUNC.test(label)) continue;
    const start = lm.index, end = lm.index + lm[0].length;
    if (matchedSpans.some(([s, e]) => start < e && end > s)) continue;
    unknownLabels.push(label);
  }
  return { byKey, unknownLabels, recoveredRatios };
}
