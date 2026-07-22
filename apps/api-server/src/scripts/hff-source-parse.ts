/**
 * HFF 원문 파서 — **생산(select) · 감사(audit) 공용 단일 정규화 모듈**.
 *
 * WO: single-lutein RETIRE+REPLACE 파일럿 선행조건(파서 하드닝).
 * 배경: 단위 수식어·라벨 공백·MAIN_FNCTN 포맷 변이로 BASE spec / 기능성 귀속이 **과소추출**되어
 *       복합 제품이 단일형으로 흡수되는 결함이 발생했다(CHECK-...-PILOT-BLOCKER-B-V1 §3).
 *       생산 select 와 감사 파서가 서로 다른 정규식을 쓰면 결과가 갈리므로 **본 모듈로 일원화**한다.
 *
 * 하드닝 항목
 *  - 단위: `ug`/`µg`/`㎍` → `μg` · `㎎` → `mg` · 전각숫자 → 반각
 *  - 수식어: `RAE`/`RE`/`NE`/`DFE`/`α-TE` + **깨진 변형** `a-TE`/`mga-TE`/`mgα-TE`
 *  - 라벨: 원료명 내부 공백 허용(`비타민 E`), 콜론·단위 주변 공백 허용
 *  - 표시량 접두 누락 + 선행 괄호 허용 (`셀렌 : (55 ㎍/7,500 mg)의 80~150%`)
 *  - 기능성 귀속: `[원료]` 브래킷 · `1) 원료 : 기능성` 번호목록 · 인라인(registry 폴백)
 *    → 명시 구조가 있으면 **그 구조만** 사용(한 기능성을 여러 원료에 임의 귀속하지 않음)
 */
import { normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { fnBelongsTo } from './hff-nutrient-registry.js';

export interface Spec { value: number; unit: string; basisAmount: number; basisUnit: string; ratio: string; evidence: string }

/** 기능성 원료가 아닌 규격 라벨(성상/중금속/미생물 등) */
export const NONFUNC = /성상|대장균군|대장균|붕해|납|카드뮴|비소|수은|헥산|아플라톡신|세균수|산가|과산화물|타르색소|보존료|수분|회분|중금속|미생물|이산화황|벤조피렌|엽록소|총균|여시니아|살모넬라/;

/** 원료 분류기 — 생산·감사 공용 단일 정의 */
export const CLS: Array<{ k: string; re: RegExp }> = [
  { k: '비타민C', re: /비타민\s?C\b/i }, { k: '비타민D', re: /비타민\s?D\b/i }, { k: '비타민B12', re: /비타민\s?B\s?12|코발라민/i },
  { k: '비타민B6', re: /비타민\s?B\s?6|피리독/i }, { k: '비타민B2', re: /비타민\s?B\s?2|리보플라빈/i }, { k: '비타민B1', re: /비타민\s?B\s?1\b|티아민/i },
  { k: '비타민A', re: /비타민\s?A\b|레티놀|베타카로/i }, { k: '비타민E', re: /비타민\s?E\b|토코페롤/i }, { k: '비타민K', re: /비타민\s?K\b|메나퀴논/i },
  { k: '엽산', re: /엽산|폴[레리]?산/i }, { k: '나이아신', re: /나이아신|니아신|니코틴산|니코틴아미드/i }, { k: '판토텐산', re: /판토텐/i }, { k: '비오틴', re: /비오틴|바이오틴/i },
  { k: '아연', re: /아연/i }, { k: '마그네슘', re: /마그네슘/i }, { k: '철', re: /철분|헴철|철\s*[:：(]|피로인산철|푸마르산철/i }, { k: '칼슘', re: /칼슘/i },
  { k: '셀레늄', re: /셀레늄|셀렌/i }, { k: '구리', re: /구리/i }, { k: '망간', re: /망간/i }, { k: '크롬', re: /크[로롬]/i }, { k: '몰리브덴', re: /몰리브/i }, { k: '요오드', re: /요오드|아이오딘/i },
  { k: '오메가3', re: /EPA|DHA|정제어유/i }, { k: '루테인', re: /루테인|지아잔틴|마리골드|황반/i }, { k: '밀크씨슬', re: /밀크씨슬|실리마린|카르두스/i },
  { k: 'MSM', re: /MSM|엠에스엠|메틸설포닐|디메틸설폰/i }, { k: '코엔자임Q10', re: /코엔자임|코큐텐|Q10|유비퀴논/i }, { k: '가르시니아', re: /가르시니아|hydroxycitric|HCA/i },
  { k: '글루코사민', re: /글루코사민/i }, { k: '식이섬유', re: /식이섬유|차전자|난소화성말토덱스트린|귀리|이눌린|프락토올리고/i }, { k: '옥타코사놀', re: /옥타코사놀/i }, { k: '프로폴리스', re: /프로폴리스|총\s*플라보노이드/i },
];
export function classify(label: string): string | null { for (const c of CLS) if (c.re.test(label)) return c.k; return null; }

/**
 * 단위·수식어 정규화. `normalizeSource` 위에 단위 하드닝을 얹는다.
 * ⚠️ 수치는 변경하지 않는다(표기 정규화만).
 */
export function normalizeSpecText(raw: string): string {
  let s = normalizeSource(raw ?? '');
  s = s.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
  s = s.replace(/㎎/g, 'mg').replace(/㎍/g, 'μg').replace(/µ/g, 'μ');
  // 깨진 α-TE 변형: "mga-TE" / "mgα-TE" / 단독 "a-TE" → "mg α-TE" / "α-TE"
  // ⚠️ 숫자 인접(`7mga-TE`·`3.3mga-TE`)은 `\b`(mg 앞) 가 digit-m 사이에서 성립하지 않아 정규화 실패 →
  //    비타민E spec 누락(과소추출). `\b` 대신 **문자 접합만 배제**(digit/공백/괄호/시작 앞은 허용).
  s = s.replace(/(?<![A-Za-z가-힣])mg\s*[aα]\s*-\s*TE\b/gi, 'mg α-TE');
  s = s.replace(/(?<![A-Za-zα])a\s*-\s*TE\b/gi, 'α-TE');
  // ASCII u 단위: 숫자/공백/괄호 뒤의 "ug" → "μg" (단어 내부 오탐 방지)
  // 단위 수식어 결합형(`700ugRAE`·`210 ugRE`)은 g 뒤가 단어문자라 `\b` 가 성립하지 않아 정규화 실패 →
  // spec 전체 누락(과소추출)했다. 수식어(RAE|RE|NE|DFE|α-TE) 선행도 경계로 인정한다.
  s = s.replace(/(?<=[\d\s(])u\s*g(?=\s*(?:RAE|RE|NE|DFE|α-?TE)\b|\b)/gi, 'μg');
  return s.replace(/\s+/g, ' ');
}

/**
 * 표시량 spec 추출.
 *  라벨(내부 공백 1회 허용) : [표시량] [(] 값 단위 [수식어] / 기준량 단위 [)] [의 x~y% | 이상]
 *  ratio 는 필수(오탐 방지 — `납(mg/kg) : 1.0 이하` 류 배제).
 */
const SPEC_RE = new RegExp(
  '([가-힣A-Za-z0-9()\\-·]{1,20}(?:\\s[가-힣A-Za-z0-9()\\-·]{1,12})?)' + // 라벨(공백 1회 허용)
  '\\s*[:：]\\s*' +
  '(?:표시량\\s*)?\\(?\\s*' +                                            // 표시량 접두 누락 + 선행 괄호 허용
  '([\\d][\\d,.]*)\\s*(mg|g|μg|mcg|IU)' +                                // 값 + 단위
  '\\s*(?:RAE|RE|α-?TE|NE|DFE)?\\s*' +                                   // 수식어(선택)
  '\\/\\s*([\\d][\\d,.]*)\\s*(mg|g)\\s*\\)?' +                           // 기준량
  // 비율(필수). 표준형 `)의 X~Y%` + 괄호형 `(표시량의 X~Y%)`(기준량 뒤 괄호 안에 표시량의+비율) 모두 허용.
  '\\s*\\(?\\s*(?:의\\s*)?(?:표시량의\\s*)?(?:([\\d.]+\\s*[~∼\\-]\\s*[\\d.]+)\\s*%|(이상))\\s*\\)?', // 비율(필수)
  'gi',
);
const uNorm = (u: string): string => { const x = u.replace(/\s/g, ''); if (/^(mcg|μg)$/i.test(x)) return 'μg'; if (/^iu$/i.test(x)) return 'IU'; return x.toLowerCase() === 'g' ? 'g' : 'mg'; };
const numOf = (s: string): number => parseFloat(s.replace(/,/g, ''));

export interface SpecParse { byKey: Map<string, Spec>; unknownLabels: string[] }

// 느슨한 spec-like 탐지: `라벨 [함량] : [표시량] 값단위[수식어] / 기준단위` — 비율 tail 불요.
// 기준량이 mg|g 인 것만(오염물 `/kg` 라인 배제). SPEC_RE 가 잡지 못한 규격 라인 검출용(안전망).
const LOOSE_SPEC_RE = new RegExp(
  '([가-힣A-Za-z0-9()\\-·]{1,20}(?:\\s[가-힣A-Za-z0-9()\\-·]{1,12})?)' +
  '\\s*[:：]\\s*(?:표시량\\s*)?\\(?\\s*' +
  '[\\d][\\d,.]*\\s*(?:mg|g|μg|mcg|IU)\\s*(?:RAE|RE|α-?TE|NE|DFE)?\\s*' +
  '\\/\\s*[\\d][\\d,.]*\\s*(?:mg|g)\\b',
  'gi',
);

export function parseSpecs(base: string): SpecParse {
  const b = normalizeSpecText(base);
  const byKey = new Map<string, Spec>(); const unknownLabels: string[] = [];
  const matchedSpans: Array<[number, number]> = [];
  SPEC_RE.lastIndex = 0; let m: RegExpExecArray | null;
  while ((m = SPEC_RE.exec(b)) !== null) {
    matchedSpans.push([m.index, m.index + m[0].length]);
    const label = m[1].trim(); if (NONFUNC.test(label)) continue;
    const k = classify(label); if (!k) { unknownLabels.push(label); continue; }
    if (byKey.has(k)) continue;
    byKey.set(k, { value: numOf(m[2]), unit: uNorm(m[3]), basisAmount: numOf(m[4]), basisUnit: uNorm(m[5]), ratio: m[6] ? `${m[6].replace(/\s/g, '').replace(/[∼\-]/g, '~')}%` : '표시량 이상', evidence: m[0].trim() });
  }
  // 안전망: 값/기준 규격을 가졌으나 SPEC_RE 가 캡처하지 못한 라인은 소실시키지 않고 unknownLabels 로 강제 편입한다.
  // (비율 포맷을 아무리 늘려도 미지 변이는 남으므로 «파싱 못한 규격 라인 있으면 HOLD» 가 안전한 기본값.)
  LOOSE_SPEC_RE.lastIndex = 0; let lm: RegExpExecArray | null;
  while ((lm = LOOSE_SPEC_RE.exec(b)) !== null) {
    const label = lm[1].trim(); if (NONFUNC.test(label)) continue;
    const start = lm.index, end = lm.index + lm[0].length;
    if (matchedSpans.some(([s, e]) => start < e && end > s)) continue; // SPEC_RE 가 이미 처리
    unknownLabels.push(label); // 규격 라인이나 미파싱 → HOLD 유발
  }
  return { byKey, unknownLabels };
}

/** 기능성 문장 분리(인라인 폴백용) */
export function splitFunctions(mainFn: string): string[] {
  // `[원료]` 브래킷은 원료 라벨 경계다. 공백 치환하면 `[곰피추출물]간건강…(May help)   [비타민B1] 탄수화물…`
  // 처럼 앞 문장이 `)` 로 끝나 다음 분리자에 안 걸려 다음 원료로 기능성이 끌려간다(허위 귀속).
  // → 브래킷을 하드 경계 sentinel(U+0001)로 치환하고 그 경계로도 분리한다.
  const SENT = String.fromCharCode(1);
  let t = normalizeSpecText(mainFn); t = t.replace(/\[[^\]]*\]/g, SENT);
  return [...new Set(t.split(new RegExp(
    SENT + '|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]|\\((?:가|나|다|라|마|바|사|\\d+)\\)|(?:^|\\s)\\d+[).]|' +
    '(?<=필요|있음|줌|도움|보호|유지|생성|합성|발달|개선|억제|완화|증진)\\s*[.,。、/]?\\s+(?=[가-힣])'))
    .map((x) => x.trim().replace(/^[-•*\s:：·,，]+/, '').replace(/[.。,，、·\s]+$/, '').replace(/^[가-힣A-Za-z0-9()\-]{2,25}\s*[:：]\s*(?=.*(도움|개선|필요|유지|억제|완화|증진|보호))/, '').trim())
    .filter((x) => x.length >= 5 && /도움|개선|필요|유지|억제|완화|증진|보호|생성|합성/.test(x)))];
}

export type FnMode = 'bracket' | 'numbered' | 'colon' | 'inline' | 'none';
export interface FnParse { mode: FnMode; byKey: Map<string, string[]>; unattributed: string[]; unknownLabels: string[] }

/**
 * MAIN_FNCTN → 원료별 기능성 귀속.
 *  1) `[원료] 기능성…` 브래킷   2) `1) 원료 : 기능성…` 번호목록   3) `원료 : 기능성…` 콜론 라벨(2건 이상)
 *     → **명시 구조 우선**(임의 다중귀속 없음). 3형식 모두 원문 라벨에만 근거하며 추정 귀속을 하지 않는다.
 *  4) 구조 없으면 인라인 폴백(registry `fnBelongsTo`) — 이때만 한 기능성이 복수 원료에 걸칠 수 있어 호출부가 REVIEW 처리해야 한다.
 */
export function parseFnAttribution(mainFn: string): FnParse {
  const t = normalizeSpecText(mainFn);
  const byKey = new Map<string, string[]>(); const unknownLabels: string[] = [];
  const pushFns = (k: string, seg: string): void => {
    // 구분자: 원문자 · 번호 · 슬래시(`A 필요 / B 필요`) · 열거 쉼표
    const fns = seg.split(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]|(?:^|\s)\d+[).]\s*|\s*\/\s*|,\s*(?=[가-힣].{0,40}(?:필요|도움|유지|보호))/)
      .map((x) => x.trim().replace(/^[-•*\s:：·,，]+/, '').replace(/[.。,，、·\s]+$/, '').trim())
      .filter((x) => x.length >= 5 && /도움|개선|필요|유지|억제|완화|증진|보호|생성|합성/.test(x));
    if (fns.length) byKey.set(k, [...(byKey.get(k) ?? []), ...fns]);
  };

  // 1) 브래킷
  const brackets = [...t.matchAll(/\[([^\]]+)\]/g)];
  if (brackets.length >= 1) {
    for (let i = 0; i < brackets.length; i++) {
      const label = brackets[i][1].trim();
      const start = (brackets[i].index ?? 0) + brackets[i][0].length;
      const end = i + 1 < brackets.length ? (brackets[i + 1].index ?? t.length) : t.length;
      const k = classify(label); if (!k) { unknownLabels.push(label); continue; }
      pushFns(k, t.slice(start, end));
    }
    if (byKey.size) return { mode: 'bracket', byKey, unattributed: [], unknownLabels };
  }

  // 2) 번호목록 `1) 원료 : 기능성`
  const numbered = [...t.matchAll(/(?:^|\s)(\d+)\)\s*([가-힣A-Za-z0-9()\-·\s]{2,25}?)\s*[:：]\s*/g)];
  if (numbered.length >= 2) {
    for (let i = 0; i < numbered.length; i++) {
      const label = numbered[i][2].trim();
      const start = (numbered[i].index ?? 0) + numbered[i][0].length;
      const end = i + 1 < numbered.length ? (numbered[i + 1].index ?? t.length) : t.length;
      const k = classify(label); if (!k) { unknownLabels.push(label); continue; }
      pushFns(k, t.slice(start, end));
    }
    if (byKey.size) return { mode: 'numbered', byKey, unattributed: [], unknownLabels };
  }

  // 3) 콜론 라벨 `원료 : 기능성…` (번호 없는 명시 구조 — 3형식 중 ③)
  //    inline(registry 추정) 폴백보다 **먼저** 인정해야 한다. 미인정 시 콜론형이 폴백으로 떨어져
  //    원문에 없는 원료(구리·망간·비타민C·셀레늄 등)로 추정 귀속되는 오귀속이 발생했다.
  //    라벨 클래스에 공백을 넣지 않아(번호 앵커가 없어 과다 캡처 위험) 2건 이상일 때만 인정 → 미달 시 기존 동작 유지.
  const colon = [...t.matchAll(/(?:^|\s)([가-힣A-Za-z0-9()\-·]{2,25})\s*[:：]\s*/g)];
  if (colon.length >= 2) {
    for (let i = 0; i < colon.length; i++) {
      const label = colon[i][1].trim();
      const start = (colon[i].index ?? 0) + colon[i][0].length;
      const end = i + 1 < colon.length ? (colon[i + 1].index ?? t.length) : t.length;
      const k = classify(label); if (!k) { unknownLabels.push(label); continue; }
      pushFns(k, t.slice(start, end));
    }
    if (byKey.size) return { mode: 'colon', byKey, unattributed: [], unknownLabels };
  }

  // 4) 인라인 폴백(registry 귀속)
  const all = splitFunctions(mainFn); const attributed = new Set<string>();
  for (const c of CLS) {
    const fns = all.filter((f) => fnBelongsTo(f, c.k));
    if (fns.length) { byKey.set(c.k, fns); fns.forEach((f) => attributed.add(f)); }
  }
  const unattributed = all.filter((f) => !attributed.has(f));
  return { mode: byKey.size ? 'inline' : 'none', byKey, unattributed, unknownLabels };
}
