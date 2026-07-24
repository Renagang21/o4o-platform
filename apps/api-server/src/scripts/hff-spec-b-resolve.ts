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

/**
 * B 전용 라벨 보완.
 *  (a) 공용 classify 의 명백한 false negative (`철`).
 *  (b) **registry 미등록 실재 기능성 원료의 지표성분 라벨** — 원료명은 `hff-b-ingredient-registry.ts`
 *      에서 `원료명 (지표성분)` 으로 표기해 표시량 귀속을 문면에 보존한다.
 *      라벨은 전부 공식 규격 원문에 있는 지표성분명이며 추정하지 않는다.
 */
const B_LABEL_EXTRA: Array<{ k: string; re: RegExp }> = [
  { k: '철', re: /^철(?:\s*\(\s*Fe\s*\))?$/i },
  { k: '바나바잎', re: /^코로솔산/ },
  { k: '쏘팔메토', re: /^(로르산|lauric\s*acid)/i },
  { k: '헤마토코쿠스', re: /^(아스타잔틴|astaxanthin)/i },
  { k: '히알루론산', re: /^히알루론산(나트륨)?/ },
  { k: '홍경천', re: /^(로사빈|rosavin)/i },
  { k: '포스파티딜세린', re: /^(포스파티딜세린|phosphatidylserine)/i },
  { k: '폴리감마글루탐산', re: /^폴리감마글루탐산/ },
  { k: '콜레우스포스콜리', re: /^(포스콜린|forskolin)/i },
  { k: '회화나무열매', re: /^(소포리코사이드|sophoricoside)/i },
  { k: '칼륨', re: /^칼륨(\(K\))?$/i },
];
/** 라벨 정규화 — 선행 번호·`총`·말미 단위수식 괄호 제거. 라벨 내부 공백(`아 연`)은 별도 재시도. */
function bareLabel(label: string): string {
  return label
    .replace(/^\d+\s*[).]\s*/, '')
    .replace(/^\(\s*\d+\s*\)\s*/, '')
    .replace(/^총\s*/, '')
    .replace(/\s*\((?:mg|g|μg|mcg|IU|%|％)(?:\s*\/\s*(?:mg|g|mL|ml|L|㎖))?\)\s*$/i, '')
    .trim();
}
function classifyB(label: string): string | null {
  const k = classify(label);
  if (k) return k;
  const bare = bareLabel(label);
  const k2 = classify(bare) ?? classify(bare.replace(/\s+/g, '')); // `아 연`·`셀 렌` 등 라벨 내부 공백
  if (k2) return k2;
  for (const c of B_LABEL_EXTRA) if (c.re.test(bare) || c.re.test(bare.replace(/\s+/g, ''))) return c.k;
  return null;
}

/**
 * 열거형 장문 라벨 전용 pre-pass — `진세노사이드 Rg1, Rb1 및 Rg3의 합`.
 * 콤마·다중 공백 때문에 `LABEL` 이 캡처하지 못하고 `Rg3의 합` 으로 백오프하며,
 * 콜론이 없는 변형(`… 의 합 표시량 (24mg/20 g)의 80% 이상`)도 실재한다.
 * 지표성분 집합(Rg3 포함 여부) 자체가 홍삼/인삼의 공식 판별자이므로 추정이 아니다.
 */
const GINSENO_RE = new RegExp(
  '(진세노사이드\\s*(?:Rg1|Rb1)[^:：]{0,60}?의\\s*합)' +
  '\\s*[:：]?\\s*(?:표시량\\s*)?\\(?\\s*' + VALUE + BASIS + TAIL,
  'gi',
);

export interface SpecParseB extends SpecParse { recoveredRatios: string[] }

/** 공용 `parseSpecs` 와 동일 계약(byKey + unknownLabels) + 회수된 비율 표기 기록. */
export function parseSpecsB(base: string): SpecParseB {
  const b = normalizeSpecText(base);
  const byKey = new Map<string, Spec>(); const unknownLabels: string[] = []; const recoveredRatios: string[] = [];
  const matchedSpans: Array<[number, number]> = [];
  const put = (k: string, m: RegExpExecArray): void => {
    if (byKey.has(k)) return;
    const lo = m[6] ?? m[8]; const hi = m[7] ?? m[9];
    const ratio = lo && hi ? `${lo}~${hi}%` : '표시량 이상';
    recoveredRatios.push(`${k}:${ratio}`);
    byKey.set(k, { value: numOf(m[2]), unit: uNorm(m[3]), basisAmount: numOf(m[4]), basisUnit: uNorm(m[5]), ratio, evidence: m[0].trim() });
  };
  // pre-pass: 열거형 장문 라벨(진세노사이드 …의 합). 스팬을 선점해 본 pass 의 백오프 매치를 막는다.
  GINSENO_RE.lastIndex = 0; let gm: RegExpExecArray | null;
  while ((gm = GINSENO_RE.exec(b)) !== null) {
    matchedSpans.push([gm.index, gm.index + gm[0].length]);
    put(/Rg3/i.test(gm[1]) ? '홍삼' : '인삼', gm);
  }
  SPEC_RE_B.lastIndex = 0; let m: RegExpExecArray | null;
  while ((m = SPEC_RE_B.exec(b)) !== null) {
    const s = m.index, e = m.index + m[0].length;
    if (matchedSpans.some(([ps, pe]) => s < pe && e > ps)) continue; // pre-pass 선점 구간
    matchedSpans.push([s, e]);
    const label = m[1].trim(); if (NONFUNC.test(label)) continue;
    const k = classifyB(label); if (!k) { unknownLabels.push(label); continue; }
    put(k, m);
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
