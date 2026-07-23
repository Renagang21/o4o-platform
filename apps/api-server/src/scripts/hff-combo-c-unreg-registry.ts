/**
 * Agent C — 미등록 라벨 Combo 전용 additive registry (runtime injection seam).
 * WO-O4O-HFF-COMBO-UNREGISTERED-C-EYE-CIRCULATION-V1.
 *
 * 공용 `hff-source-parse.CLS` / `hff-nutrient-registry.FUNCTIONAL_META` 를 **편집하지 않고**(A/B 병렬 WIP 충돌 회피),
 * 프로세스 로컬 런타임 주입으로 C 도메인 미등록 원료(포스파티딜세린·홍국·라이코펜·헤마토코쿠스(아스타잔틴)·나토균 등)를
 * classify/meta/귀속 대상에 additive 확장한다. 각 스크립트는 독립 `npx tsx` 프로세스라 타 에이전트 무영향.
 *
 * 원칙: 임의 의학 사실 생성 0. 아래 KO 기능성은 실 MAIN_FNCTN(공식 원문)에서 grounded 추출한 표준 문구이며,
 *       EN 은 hff-sf-c-en-overlay.mapFunctionEnC(원자 분해 매핑, 미매핑=null→PENDING)로 확정한다.
 *       라벨(spec label)은 지표성분명일 수 있으나(모나콜린K=홍국 지표, 아스타잔틴=헤마토코쿠스 지표),
 *       displayKo 는 기능성 인정 원료명으로 표기한다.
 */
import { CLS } from './hff-source-parse.js';
import { FUNCTIONAL_META, normFn, type NutrientMeta } from './hff-nutrient-registry.js';

export interface CUnregEntry {
  key: string;
  meta: NutrientMeta;
  /** spec/label classify 정규식 (BASE_STANDARD 규격 라벨 · MAIN_FNCTN 라벨) */
  cls: RegExp;
  /** G-MULTI-AMOUNT-SOURCE 원문 라벨 위치 탐지 정규식 (수치 이동 방어) */
  srcLabel: RegExp;
  /** 공식 기능성 KO 세트(grounded, MAIN_FNCTN 추출). normFn 매칭 귀속용. */
  fns: string[];
}

/**
 * C 미등록 원료 정의. 각 fns 는 실제 공식 MAIN_FNCTN 문구(grounded).
 * displayKo=기능성 인정 원료명. spec 라벨(지표성분)과 다를 수 있음(주석 명시).
 */
export const C_UNREG: CUnregEntry[] = [
  {
    key: '포스파티딜세린',
    meta: { key: '포스파티딜세린', slug: 'phosphatidylserine', displayKo: '포스파티딜세린', displayEn: 'Phosphatidylserine', kind: 'functional' },
    cls: /포스파티딜세린/i,
    srcLabel: /포스파티딜세린/i,
    fns: [
      '노화로 인해 저하된 인지력 개선·자외선에 의한 피부 손상으로부터 피부 건강 유지·피부보습에 도움을 줄 수 있음',
      '노화로 인해 저하된 인지력 개선에 도움을 줄 수 있음',
    ],
  },
  {
    key: '홍국',
    // spec 라벨 = 모나콜린K(지표성분). 기능성 인정 원료 = 홍국.
    meta: { key: '홍국', slug: 'red-yeast-rice', displayKo: '홍국', displayEn: 'Red yeast rice (Monascus)', kind: 'functional' },
    cls: /모나콜린/i,
    srcLabel: /모나콜린/i,
    fns: ['혈중 콜레스테롤 개선에 도움을 줄 수 있음'],
  },
  {
    key: '라이코펜',
    meta: { key: '라이코펜', slug: 'lycopene', displayKo: '라이코펜', displayEn: 'Lycopene', kind: 'functional' },
    cls: /라이코펜/i,
    srcLabel: /라이코펜/i,
    fns: ['항산화에 도움을 줄 수 있음'],
  },
  {
    key: '아스타잔틴',
    // spec 라벨 = 아스타잔틴(헤마토코쿠스추출물 지표). 기능성 인정 원료 = 헤마토코쿠스추출물.
    meta: { key: '아스타잔틴', slug: 'haematococcus-astaxanthin', displayKo: '헤마토코쿠스추출물(아스타잔틴)', displayEn: 'Haematococcus extract (astaxanthin)', kind: 'functional' },
    cls: /아스타잔틴|헤마토코쿠스/i,
    srcLabel: /아스타잔틴|헤마토코쿠스/i,
    fns: [
      '눈의 피로도 개선에 도움을 줄 수 있음',
      '눈의 피로도 개선에 도움을 줌',
    ],
  },
  {
    key: '나토균배양분말',
    meta: { key: '나토균배양분말', slug: 'natto-culture', displayKo: '나토균 배양분말', displayEn: 'Natto culture powder', kind: 'functional' },
    cls: /나토균|나토배양|낫토균/i,
    srcLabel: /나토균|나토배양|낫토균|나토/i,
    fns: [
      '혈압이 높은 사람에게 도움을 줄 수 있음',
      '혈소판 응집억제를 통한 혈행개선에 도움을 줄 수 있음',
      '혈소판응집 억제를 통한 혈행 개선에 도움을 줄 수 있음',
    ],
  },
];

export const C_KEYS = new Set(C_UNREG.map((e) => e.key));
export const C_SRC_LABEL: Record<string, RegExp> = Object.fromEntries(C_UNREG.map((e) => [e.key, e.srcLabel]));
const C_FN_NORM: Record<string, Set<string>> = {};
for (const e of C_UNREG) C_FN_NORM[e.key] = new Set(e.fns.map(normFn));

let injected = false;
/** 공용 CLS/FUNCTIONAL_META 에 C 미등록 원료를 런타임 additive 주입(프로세스 로컬, 멱등). */
export function injectC(): void {
  if (injected) return;
  for (const e of C_UNREG) {
    if (!FUNCTIONAL_META[e.key]) FUNCTIONAL_META[e.key] = e.meta;
    // 공용 CLS 뒤에 append → 기존(shared) 매칭이 우선. C 라벨은 shared 미충돌만 등재.
    CLS.push({ k: e.key, re: e.cls });
  }
  injected = true;
}

/** C 미등록 원료 기능성 귀속(normFn 매칭). 공용 fnBelongsTo 와 동일 정책(정규화 + 양방향 substring). */
export function belongsC(koFn: string, key: string): boolean {
  const set = C_FN_NORM[key];
  if (!set) return false;
  const n = normFn(koFn);
  if (set.has(n)) return true;
  for (const e of set) if (n.includes(e) || e.includes(n)) return true;
  return false;
}
