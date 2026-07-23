/**
 * HFF 단일 기능성(비-CFU) — Agent B 독립 소유 원료 registry (장·배변·대사 영역).
 *   WO-O4O-HFF-INDEPENDENT-MAX-PRODUCTION-B-V1.
 *
 * 공용 `hff-sf-registry.ts`(SF_INGREDIENTS)는 다른 세션(Agent C) 미커밋 WIP 상태 → 동시편집 금지.
 * 따라서 Agent B 소유 원료는 본 **별도 파일**에 additive 로 선언하고, CLEAN 한 파이프라인
 * (hff-sf-b-select / hff-sf-b-generate → hff-sf-apply → hff-sf-verify)로 생산한다. 공용 파일 편집 0.
 *
 * 기능성 KO = 제품 MAIN_FNCTN 원문(grounded). EN = 공용 `mapFunctionEn` 재사용(임의생성 0) —
 * resolveFunctions 가 제품별 EN 완전성 검증, 미충족 시 GROUNDING_PENDING → REVIEW_LATER.
 * classify() 가 '식이섬유' 로 귀속하는 라벨(차전자피/난소화성말토덱스트린)은 combo 파이프라인 EXC_ALWAYS(식이섬유 전면 제외)
 * 대상이라 combo LIVE 와 교집합 0. pure-single 소유는 allowClassified 로 select classify 제외를 우회.
 */
import type { SfIngredient } from './hff-sf-registry.js';
import { extractFunctionsKo } from './hff-sf-registry.js';      // 공용 read-only (KO 추출)
import { mapFunctionEn } from './hff-nutrient-registry.js';     // 공용 read-only (EN 1차 매핑)

/**
 * B 전용 기능성 EN 컴포넌트 (장·프리바이오틱 계열). MFDS 공식 기능성 표현을 mapFunctionEn 의 COMPONENT 문체
 * (소문자 명사구, 'May help with …' 결합)와 동일하게 **정적** 선언한다. 임의 LLM EN 생성 0.
 * 공용 mapFunctionEn 이 미커버(null)하는 프락토올리고당 등의 편익만 additive 로 보강하며, 공용 파일은 편집하지 않는다.
 */
const B_COMPONENT: Array<[RegExp, string]> = [
  [/^장내\s*유익균\s*증식$/, 'the growth of beneficial intestinal bacteria'],
  [/^유익균\s*증식$/, 'the growth of beneficial bacteria'],
  [/^유해균\s*억제$/, 'inhibiting harmful bacteria'],
  [/^칼슘\s*흡수$/, 'calcium absorption'],
  [/^배변활동\s*원활$/, 'smooth bowel movements'],
  [/^장\s*건강$/, 'intestinal health'],
  [/^피부\s*건강$/, 'skin health'],
  [/^혈중\s*콜레스테롤\s*개선$/, 'improving blood cholesterol'],
];
function bJoin(a: string[]): string { return a.length <= 1 ? (a[0] ?? '') : a.length === 2 ? `${a[0]} and ${a[1]}` : `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`; }
function mapComponentB(ko: string): string | null { const c = ko.replace(/\s+/g, ' ').trim(); for (const [re, en] of B_COMPONENT) if (re.test(c)) return en; return null; }
/** 공용 mapFunctionEn 1차 시도 → 미매핑 시 '및/·' 분해 + B_COMPONENT 로 정적 보강. 전 컴포넌트 매핑 성공시만 반환(임의생성 0). */
function mapFunctionEnB(ko: string): string | null {
  const direct = mapFunctionEn(ko); if (direct) return direct;
  const m = ko.replace(/\s+/g, ' ').trim().match(/^(.*?)에?\s*도움을?\s*(?:줄\s*수\s*있(?:음|습니다)|줌|주는)/);
  if (!m) return null;
  const parts = m[1].split(/[·･・‧]|\s*및\s*/).map((b) => b.trim()).filter(Boolean);
  const mapped = parts.map(mapComponentB);
  if (mapped.length && mapped.every((x) => x != null)) return `May help with ${bJoin(mapped as string[])}`;
  return null;
}
/** 공용 resolveFunctions 대체(B). KO=공용 extractFunctionsKo grounded, EN=mapFunctionEnB(공용 1차 + B 정적 보강). 미매핑=pending. */
export function resolveFunctionsB(ing: SfIngredient, mainFn: string): { ko: string[]; en: string[]; pending: boolean } {
  const kos = extractFunctionsKo(mainFn);
  const ko: string[] = [], en: string[] = []; let pending = false;
  for (const k of kos) { const norm = ing.fnNormalize ? ing.fnNormalize(k) : k; const e = mapFunctionEnB(norm); ko.push(k); en.push(e ?? ''); if (e == null) pending = true; }
  if (!ko.length) pending = true;
  return { ko, en, pending };
}

export const B_INGREDIENTS: Record<string, SfIngredient> = {
  // B-CURRENT 프락토올리고당 — 공식 기능성: 장내 유익균 증식 및 배변활동 원활 (공용 mapFunctionEn 미커버 → resolveFunctionsB 정적 보강)
  '프락토올리고당': { key: '프락토올리고당', slug: 'fructooligosaccharide', displayKo: '프락토올리고당', displayEn: 'Fructooligosaccharide', labelRe: /프락토\s*올리고당/, allowClassified: true, statusHint: 'READY' },
  // B-06/07 안전 복구: 지표성분(무수바바로인) basis 는 Guard REVIEW 로 자동 제외되고, 원료 기준량 basis 만 PASS. 겔·액상은 LIQUID 제외.
  '알로에': { key: '알로에', slug: 'aloe', displayKo: '알로에', displayEn: 'Aloe', labelRe: /알로에/, allowClassified: true, statusHint: 'READY' },
  '키토산': { key: '키토산', slug: 'chitosan', displayKo: '키토산', displayEn: 'Chitosan', labelRe: /키토산/, allowClassified: true, statusHint: 'READY' },
  // B-01 차전자피식이섬유 — 공식 기능성: 혈중 콜레스테롤 개선 · 배변활동 원활 (둘 다 mapFunctionEn HIT)
  '차전자피식이섬유': { key: '차전자피식이섬유', slug: 'psyllium-husk-fiber', displayKo: '차전자피식이섬유', displayEn: 'Psyllium husk dietary fiber', labelRe: /차전자피/, allowClassified: true, statusHint: 'READY' },
  // B-03 난소화성말토덱스트린 — 공식 기능성: 배변활동 원활 · 식후 혈당상승 억제 · 혈중 중성지질 개선 (전부 HIT)
  '난소화성말토덱스트린': { key: '난소화성말토덱스트린', slug: 'indigestible-maltodextrin', displayKo: '난소화성말토덱스트린', displayEn: 'Indigestible maltodextrin', labelRe: /난소화성\s*말토덱스트린/, allowClassified: true, statusHint: 'READY' },
  // ── Round 3: 대사(체지방·혈당·콜레스테롤)·장 계열 추가. 라벨 철자 변형은 단일 labelRe 로 흡수. combo EXC_ALWAYS(식이섬유·가르시니아 등) 대상이라 combo LIVE 교집합 0.
  '가르시니아캄보지아': { key: '가르시니아캄보지아', slug: 'garcinia-cambogia', displayKo: '가르시니아캄보지아 추출물', displayEn: 'Garcinia cambogia extract', labelRe: /가르시니아\s*캄보지아/, allowClassified: true, statusHint: 'READY' },
  '이눌린치커리': { key: '이눌린치커리', slug: 'inulin-chicory', displayKo: '이눌린/치커리추출물', displayEn: 'Inulin/chicory extract', labelRe: /이눌린|치커리/, allowClassified: true, statusHint: 'READY' },
  '귀리식이섬유': { key: '귀리식이섬유', slug: 'oat-fiber', displayKo: '귀리식이섬유', displayEn: 'Oat dietary fiber', labelRe: /귀리/, allowClassified: true, statusHint: 'READY' },
  '오비엑스': { key: '오비엑스', slug: 'ob-x', displayKo: '오비엑스(Ob-X)', displayEn: 'Ob-X', labelRe: /오비엑스|Ob-?X/i, allowClassified: true, statusHint: 'READY' },
  '피니톨': { key: '피니톨', slug: 'pinitol', displayKo: '피니톨', displayEn: 'Pinitol', labelRe: /피니톨/, allowClassified: true, statusHint: 'READY' },
  '레시틴': { key: '레시틴', slug: 'lecithin', displayKo: '레시틴', displayEn: 'Lecithin', labelRe: /레시틴/, allowClassified: true, statusHint: 'READY' },
};
