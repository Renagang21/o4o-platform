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
  [/^콜레스테롤\s*개선$/, 'improving blood cholesterol'],
  [/^유익균의?\s*증식$/, 'the growth of beneficial bacteria'],
  [/^유해균의?\s*억제$/, 'inhibiting harmful bacteria'],
  [/^배변활동$/, 'smooth bowel movements'],
  [/^면역기능\s*증진$/, 'supporting immune function'],
  // B-GUT-REMAINDER: 간건강·체지방·면역력 공식 기능성 EN 정적 보강(MFDS 표준 영문 표현, 임의생성 0)
  [/^간\s*건강$/, 'liver health'],
  [/^체지방\s*감소$/, 'reducing body fat'],
  [/^면역력\s*증진$/, 'boosting immunity'],
  // B-BASIS-UNLOCK: GROUNDING_PENDING_EN false-negative 보완. 전부 MFDS 공식 단일 기능성의 표준 영문(임의생성 0).
  // 공식 문구 파서(콤마/중점/(가)(나)) 미분해로 미매핑되던 grounded 기능성만 anchored-exact 로 정적 보강.
  [/^식후\s*혈당\s*상승\s*억제$/, 'suppressing the rise in blood sugar after meals'],
  [/^식후\s*혈당상승\s*억제$/, 'suppressing the rise in blood sugar after meals'],
  [/^혈중\s*중성지질\s*개선$/, 'improving blood triglyceride levels'],
  [/^유산균\s*증식$/, 'the growth of lactic acid bacteria'],
  [/^장내\s*유익균의?\s*증식$/, 'the growth of beneficial intestinal bacteria'],
  [/^유익균의?\s*증식$/, 'the growth of beneficial bacteria'],
  [/^혈중\s*콜레스테롤\s*개선$/, 'improving blood cholesterol'],
  // B-BASIS-UNLOCK discovery(대사): CLA·폴리코사놀·솔잎증류농축액 공식 기능성(MFDS 표준 영문, 임의생성 0)
  [/^과체중인?\s*성인의?\s*체지방\s*감소$/, 'reducing body fat in overweight adults'],
  [/^(?:높은\s*)?혈중\s*콜레스테롤\s*수치의?\s*개선$/, 'improving blood cholesterol levels'],
  [/^건강한\s*혈당의?\s*유지$/, 'maintaining healthy blood sugar levels'],
];
function bJoin(a: string[]): string { return a.length <= 1 ? (a[0] ?? '') : a.length === 2 ? `${a[0]} and ${a[1]}` : `${a.slice(0, -1).join(', ')}, and ${a[a.length - 1]}`; }
function mapComponentB(ko: string): string | null { const c = ko.replace(/\s+/g, ' ').trim(); for (const [re, en] of B_COMPONENT) if (re.test(c)) return en; return null; }
/**
 * 공용 mapFunctionEn 1차 → 미매핑 시 공식 기능성 문구를 fragment 분해 + B_COMPONENT anchored-exact 정적 매핑.
 * 각 fragment 는 반드시 B_COMPONENT 정규식에 정확히 일치해야 하며, 하나라도 미매핑이면 전체 null(pending) — **임의 EN 생성 0**.
 * 분해 규칙: MFDS 분류 꼬리표((기타기능II)/고시형)·따옴표·(가)(나) 라벨 제거 후, '…에 도움을 줄 수 있음' 완결구를
 * 경계(콤마화)로 치환하고 콤마/중점/및/과/와 로 분해. false-negative(grounded 기능성 미분해) 만 복구.
 */
function mapFunctionEnB(ko: string): string | null {
  const direct = mapFunctionEn(ko); if (direct) return direct;
  const cleaned = ko.replace(/\s+/g, ' ').trim()
    .replace(/[""“”]/g, '')
    .replace(/\s*\((?:기타기능\s*[IViv]+|고시형|개별인정형)\)\s*/g, ' ')
    .replace(/\s+/g, ' ').trim();
  // 단일 공식 기능성(완결구 없이 fnNormalize 로 이미 추출된 경우) 즉시 매핑
  const dc = mapComponentB(cleaned.replace(/^\s*\((?:가|나|다|라)\)\s*/, '')); if (dc) return `May help with ${dc}`;
  // 다중 클로즈: '…에 도움을 줄 수 있음' 완결구를 콤마 경계로 치환 → (가)(나) 다항 기능성 모두 보존
  const zone = cleaned.replace(/에?\s*도움을?\s*(?:줄\s*수\s*있(?:음|습니다)|줌|주는)\s*/g, ',');
  // 분해자: 콤마/중점/및 만(‘과/와’ 는 과체중 등 어절 내부를 오분할하므로 제외 — 미분해 fragment 는 pending 유지, 오생성 0)
  const parts = zone.split(/[·･・‧•∙․,，、]|\s*및\s*/)
    .map((b) => b.replace(/^\s*\((?:가|나|다|라)\)\s*/, '').trim()).filter(Boolean);
  if (!parts.length) return null;
  const mapped = parts.map(mapComponentB);
  if (mapped.every((x) => x != null)) return `May help with ${bJoin(mapped as string[])}`;
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
  // B-09/10 신규 발굴(장·대사·면역, 공용 mapFunctionEn 커버). displayEn=표준 영문명 정적 lookup. 기능성 EN=grounded(임의생성 0).
  '콜레우스포스콜리': { key: '콜레우스포스콜리', slug: 'coleus-forskohlii', displayKo: '콜레우스포스콜리 추출물', displayEn: 'Coleus forskohlii extract', labelRe: /콜레우스\s*포스콜리/, allowClassified: true, statusHint: 'READY' },
  '바나바잎': { key: '바나바잎', slug: 'banaba-leaf', displayKo: '바나바잎추출물', displayEn: 'Banaba leaf extract', labelRe: /바나바/, allowClassified: true, statusHint: 'READY' },
  '레몬밤': { key: '레몬밤', slug: 'lemon-balm', displayKo: '레몬밤 추출물 혼합분말', displayEn: 'Lemon balm extract blend', labelRe: /레몬\s*밤/, allowClassified: true, statusHint: 'READY' },
  '동결건조누에분말': { key: '동결건조누에분말', slug: 'silkworm-powder', displayKo: '동결건조누에분말', displayEn: 'Freeze-dried silkworm powder', labelRe: /누에분말/, allowClassified: true, statusHint: 'READY' },
  '그린커피빈': { key: '그린커피빈', slug: 'green-coffee-bean', displayKo: '그린커피빈추출물', displayEn: 'Green coffee bean extract', labelRe: /그린\s*커피\s*빈/, allowClassified: true, statusHint: 'READY' },
  'L-카르니틴': { key: 'L-카르니틴', slug: 'l-carnitine-tartrate', displayKo: 'L-카르니틴 타르트레이트', displayEn: 'L-carnitine tartrate', labelRe: /카르니틴/, allowClassified: true, statusHint: 'READY' },
  '락토페린': { key: '락토페린', slug: 'lactoferrin', displayKo: '락토페린', displayEn: 'Lactoferrin', labelRe: /락토페린/, allowClassified: true, statusHint: 'READY' },
  '돌외잎': { key: '돌외잎', slug: 'gynostemma-leaf', displayKo: '돌외잎주정추출분말', displayEn: 'Gynostemma pentaphyllum leaf extract', labelRe: /돌외잎/, allowClassified: true, statusHint: 'READY' },
  '알콕시글리세롤상어간유': { key: '알콕시글리세롤상어간유', slug: 'alkoxyglycerol-shark-liver-oil', displayKo: '알콕시글리세롤 함유 상어간유', displayEn: 'Alkoxyglycerol-containing shark liver oil', labelRe: /알콕시글리세롤/, allowClassified: true, statusHint: 'READY' },
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
  // B-10 프리바이오틱 올리고당·장·면역 계열 — 유익균 증식·유해균 억제·배변활동·면역기능 증진·콜레스테롤 EN 은 B_COMPONENT 정적 커버.
  '자일로올리고당': { key: '자일로올리고당', slug: 'xylooligosaccharide', displayKo: '자일로올리고당', displayEn: 'Xylooligosaccharide', labelRe: /자일로\s*올리고당/, allowClassified: true, statusHint: 'READY' },
  '라피노스': { key: '라피노스', slug: 'raffinose', displayKo: '라피노스', displayEn: 'Raffinose', labelRe: /라피노스/, allowClassified: true, statusHint: 'READY' },
  '갈락토올리고당': { key: '갈락토올리고당', slug: 'galactooligosaccharide', displayKo: '갈락토올리고당', displayEn: 'Galactooligosaccharide', labelRe: /갈락토\s*올리고당/, allowClassified: true, statusHint: 'READY' },
  '이소말토올리고당': { key: '이소말토올리고당', slug: 'isomaltooligosaccharide', displayKo: '이소말토올리고당', displayEn: 'Isomaltooligosaccharide', labelRe: /이소말토\s*올리고당/, allowClassified: true, statusHint: 'READY' },
  '폴리덱스트로스': { key: '폴리덱스트로스', slug: 'polydextrose', displayKo: '폴리덱스트로스', displayEn: 'Polydextrose', labelRe: /폴리덱스트로스/, allowClassified: true, statusHint: 'READY' },
  '키토올리고당': { key: '키토올리고당', slug: 'chitooligosaccharide', displayKo: '키토올리고당', displayEn: 'Chitooligosaccharide', labelRe: /키토올리고당/, allowClassified: true, statusHint: 'READY' },
  '베타글루칸': { key: '베타글루칸', slug: 'beta-glucan', displayKo: '베타글루칸', displayEn: 'Beta-glucan', labelRe: /베타글루칸/, allowClassified: true, statusHint: 'READY' },
  // B-GUT-REMAINDER 신규: 표고버섯균사체 — 공식 기능성 간건강 / 면역기능 증진(둘 다 B_COMPONENT 정적 EN 커버). 홍경천 등 combo(괄호 표기)는 pure-single 브래킷 필터로 자동 제외.
  '표고버섯균사체': { key: '표고버섯균사체', slug: 'shiitake-mycelium', displayKo: '표고버섯균사체', displayEn: 'Shiitake mushroom mycelium', labelRe: /표고/, allowClassified: true, statusHint: 'READY' },
  // B-GUT-REMAINDER discovery 라운드2 (장·대사·면역, A/C 미청구). 간(밀크씨슬)·항산화(녹차)·own-track(인삼/홍삼)은 도메인 경계로 HOLD.
  '청국장균배양정제물': { key: '청국장균배양정제물', slug: 'chungkookjang-culture', displayKo: '청국장균배양정제물', displayEn: 'Chungkookjang bacterial culture', labelRe: /청국장균/, allowClassified: true, statusHint: 'READY' },
  '풋사과추출물애플페논': { key: '풋사과추출물애플페논', slug: 'green-apple-applephenon', displayKo: '풋사과 추출물 애플페논', displayEn: 'Green apple extract (Applephenon)', labelRe: /풋사과/, allowClassified: true, statusHint: 'READY' },
  '홍국': { key: '홍국', slug: 'red-yeast-rice', displayKo: '홍국', displayEn: 'Red yeast rice', labelRe: /홍국/, allowClassified: true, statusHint: 'READY' },
  '미역등복합추출물': { key: '미역등복합추출물', slug: 'xanthigen', displayKo: '미역등복합추출물(잔티젠)', displayEn: 'Undaria/pomegranate complex extract (Xanthigen)', labelRe: /잔티젠|미역등복합/, allowClassified: true, statusHint: 'READY' },
  // B-BASIS-UNLOCK discovery(대사): A/C 미청구·own-track 아님. CLA=체지방(대사), 폴리코사놀·솔잎=콜레스테롤/혈당(대사).
  '공액리놀레산': { key: '공액리놀레산', slug: 'conjugated-linoleic-acid', displayKo: '공액리놀레산', displayEn: 'Conjugated linoleic acid (CLA)', labelRe: /공액리놀레산|공액\s*리놀레산/, allowClassified: true, statusHint: 'READY' },
  '폴리코사놀': { key: '폴리코사놀', slug: 'policosanol', displayKo: '폴리코사놀', displayEn: 'Policosanol', labelRe: /폴리코사놀/, allowClassified: true, statusHint: 'READY' },
  '솔잎증류농축액': { key: '솔잎증류농축액', slug: 'pine-needle-distillate', displayKo: '솔잎증류농축액', displayEn: 'Pine needle distillate concentrate', labelRe: /솔잎증류농축액|솔잎\s*증류/, allowClassified: true, statusHint: 'READY' },
};
