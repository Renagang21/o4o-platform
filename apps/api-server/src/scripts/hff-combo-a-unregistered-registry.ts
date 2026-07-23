/**
 * WO-O4O-HFF-COMBO-UNREGISTERED-A-JOINT-SKIN-V1 — Agent A 전용 additive registry.
 *
 * 관절·연골·피부 기능성 원료(A 소유)의 canonical 기능성 문구 + 탐지/라벨 마커.
 * 공용 hff-nutrient-registry.ts 를 수정하지 않는 A 전용 seam. 선행 hff-combo-a-build.ts 인라인 정의를
 * 값 동등하게 이관(값 무변경) + 미등록 원료 마커 보강. 부원료 비타민/미네랄은 등재하지 않는다(미렌더·귀속 불방해).
 */

// ── A 기능성 canonical 문구(원문 보존·순화 금지) ──
export type FnKey = 'joint' | 'jointOnly' | 'skinMoist' | 'skinUV';
export const FN: Record<FnKey, { ko: string; en: string; re: RegExp }> = {
  joint:     { ko: '관절 및 연골 건강에 도움을 줄 수 있음', en: 'May help with joint and cartilage health', re: /관절\s*(?:및|,|·|과)?\s*연골|연골\s*건강|관절\s*연골/ },
  jointOnly: { ko: '관절 건강에 도움을 줄 수 있음', en: 'May help with joint health', re: /관절\s*건강/ },
  skinMoist: { ko: '피부보습에 도움을 줄 수 있음', en: 'May help to moisturise the skin', re: /피부\s*보습|피부\s*수분/ },
  skinUV:    { ko: '자외선에 의한 피부손상으로부터 피부건강을 유지하는데 도움을 줄 수 있음', en: 'May help to maintain skin health from skin damage caused by UV radiation', re: /자외선.*피부\s*손상|자외선에\s*의한\s*피부/ },
};

// A 기능성 원료. mark=BASE_STANDARD 지표 탐지 / labelRe=MAIN_FNCTN 원료명 앵커 / funcs=주장가능 canonical 기능성.
export interface AIng {
  key: string; displayKo: string; displayEn: string;
  mark: RegExp; labelRe: RegExp; funcs: FnKey[]; singleAllowed?: boolean;
}

// 글루코사민 real = 아세틸 선행 아님(N-아세틸글루코사민 내부 substring 오검출 방지, lookbehind).
export const A_INGREDIENTS: AIng[] = [
  { key: '뮤코다당·단백', displayKo: '뮤코다당·단백(콘드로이친)', displayEn: 'Mucopolysaccharide-protein (chondroitin)', mark: /뮤코다당|점액다당/, labelRe: /뮤코다당|점액다당|콘드로이/, funcs: ['joint'], singleAllowed: true },
  { key: 'MSM',          displayKo: 'MSM(엠에스엠·디메틸설폰)', displayEn: 'MSM (Methylsulfonylmethane)', mark: /\bMSM\b|엠에스엠|메틸설포닐메탄|디메틸설폰/i, labelRe: /\bMSM\b|엠에스엠|메틸설포닐메탄|디메틸설폰/i, funcs: ['joint'] },
  { key: 'N아세틸글루코사민', displayKo: 'N-아세틸글루코사민', displayEn: 'N-Acetylglucosamine', mark: /N-?\s*아세틸글루코사민|아세틸글루코사민|\bNAG\b/i, labelRe: /아세틸글루코사민|\bNAG\b/i, funcs: ['joint', 'skinMoist'] },
  { key: '글루코사민',     displayKo: '글루코사민', displayEn: 'Glucosamine', mark: /(?<!아세틸)글루코사민/, labelRe: /(?<!아세틸)글루코사민/, funcs: ['joint'] },
  { key: '히알루론산',     displayKo: '히알루론산', displayEn: 'Hyaluronic acid', mark: /히알루[론룬]산|하이알루론/, labelRe: /히알루[론룬]산|하이알루론/, funcs: ['skinMoist', 'skinUV'] },
  { key: '세라마이드',     displayKo: '세라마이드', displayEn: 'Ceramide', mark: /글루코실세라마이드|세라마이드/, labelRe: /글루코실세라마이드|세라마이드/, funcs: ['skinMoist'] },
  { key: '보스웰리아',     displayKo: '보스웰리아추출물', displayEn: 'Boswellia serrata extract', mark: /보스웰|유니베스틴/, labelRe: /보스웰|유니베스틴/, funcs: ['jointOnly'] },
  { key: '초록입홍합',     displayKo: '초록입홍합추출오일', displayEn: 'Green-lipped mussel extract oil', mark: /초록입홍합|리프리놀/, labelRe: /초록입홍합|리프리놀/, funcs: ['jointOnly'], singleAllowed: true },
  { key: '콜라겐',        displayKo: '콜라겐펩타이드', displayEn: 'Collagen peptide', mark: /콜라겐/, labelRe: /콜라겐/, funcs: ['skinMoist', 'skinUV', 'joint'] },
  { key: '엘라스틴',       displayKo: '엘라스틴', displayEn: 'Elastin', mark: /엘라스틴/, labelRe: /엘라스틴/, funcs: ['skinMoist'] },
];

// 비-A **기능성** 원료(개별인정/타 고시). 기능성으로 선언되면 혼합형. (비타민/미네랄 부원료는 제외)
export const NONA_FUNC = /강황|커큐민|터마신|보스웰(?!리아)|루테인|지아잔틴|은행잎|홍삼|인삼|프로바이오틱|유산균|가르시니아|HCA|hydroxycitric|밀크씨슬|실리마린|코엔자임|Q10|쏘팔메토|감마리놀렌|테아닌|프로폴리스|보이차|녹차추출|카테킨|난소화성|차전자|백수오|회화나무|정제어유|오메가|EPA|DHA|폴리코사놀|옥타코사놀|시트룰린|아르기닌|크레아틴|엘더베리|아로니아|빌베리|크랜베리|프락토올리고|difructose|자일리톨|매스틱|헤마토코쿠스|아스타잔틴|가바|GABA|헤스페리딘|디오스민/i;

export const LIQUID = /액상|드롭|드랍|시럽|액제|방울|앰플|스프레이|스포이드|농축액|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;
