/**
 * WO-O4O-HFF-UNREGISTERED-INDICATOR-REMAINDER-A-V1 — registry 미등록 **지표성분형** 원료 A 전용 additive 빌더.
 *
 * 직전 [[미등록 원료]] WO(`hff-ui-a-build.ts`)가 남긴 `LABEL_UNMAPPED` 잔여 중, 라벨이 공식 기준·규격에서
 * **원료·지표성분이 명확한 단일 원료**(예: 보스웰리아추출물→AKBA/KBA · 콘드로이친→Chondroitin sulfate ·
 * 폴리코사놀→옥타코사놀 · 아스타잔틴 · 마늘→알리인 · 참당귀추출분말→데커신 · 영지버섯자실체추출물→베타글루칸 ·
 * 석류→엘라그산)를 추가 개방한다. 개별인정형 "…등복합물" 처럼 조성이 불명확한 혼합물은 매핑하지 않는다.
 *
 * 직전 빌더(hff-ui-a-build.ts) 대비 확장:
 *   ① `UI_MAP` 에 지표성분이 공식 규격에 명시된 단일 원료 라벨을 추가(INDICATOR EXTENSION 블록).
 *   ② **액상 HOLD 게이트** — 신규 원료(anyUi) 제품이 `[액상]`·액제·드링크·음료·시럽이면 `LIQUID_FORM` HOLD.
 *      (WO 요구: 액상·하한 비율·충돌 데이터는 HOLD.)
 *
 * 유지되는 계약(직전 WO 와 동일):
 *   - 라벨 충실 파서: 블록을 하나도 버리지 않는다. 매핑 실패·빈 기능성 블록·키 접힘·첫 라벨 앞 잔여 →
 *     제품 전체 HOLD. 최종적으로 원문 기능성 원자 전량 렌더 확인(`FN_ATOM_UNRENDERED`).
 *   - 규격 근거 게이트: 신규 매핑 원료는 `BASE_STANDARD` 에 원료명 또는 공식 지표성분이 실재해야 함.
 *   - EN 은 공용 매퍼(`mapFunctionEnC ?? mapFunctionEn`)로만 만든다. 미매핑 = 공식 EN 정본 없음 → HOLD.
 *   - 공식 기능성 문장은 원문 그대로. 삭제·순화·추가 0. 표시량 미기재. 전문가 상담 footer 유지.
 *   - 공용 parser·registry·composer·apply 무수정. **본 파일은 A 전용이며 hff-ui-a-build.ts 도 수정하지 않는다.**
 *
 *   PROXY_PORT=5442 npx tsx src/scripts/hff-ind-a-build.ts --out <dir> [--chunk N] [--census]
 * DB write 0. 산출: <dir>/ind-a-target-<i>.json (hff-sf-apply.ts 입력) · ind-a-{pool,hold,selfcheck}.json
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { parseServing, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { classify, normalizeSpecText, splitFunctions } from './hff-source-parse.js';
import { SF_INGREDIENTS } from './hff-sf-registry.js';
import { NUTRIENT_META, FUNCTIONAL_META, mapFunctionEn } from './hff-nutrient-registry.js';
import { mapFunctionEnC } from './hff-sf-c-en-overlay.js';

function stableHash(s: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
const esc = (s: string): string => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cmp = (s: string): string => s.replace(/[\s.,。、·:：;()[\]/]/g, '');

// ── A 전용 additive mapping: registry 미등록 **실재** 기능성 원료만 ──────────────────
// 원료로 특정되지 않는 조각(추출물·유지·내용·제품·B1 등)은 의도적으로 넣지 않는다(오귀속 방지).
interface UiMeta { key: string; ko: string; en: string; basis?: RegExp }
const UI_MAP: Array<{ re: RegExp; m: UiMeta }> = [
  { re: /^프로바이오틱스$/, m: { key: 'ui_probiotics', ko: '프로바이오틱스', en: 'Probiotics' , basis: /프로바이오틱스|유산균|CFU|균수/ } },
  { re: /^철$/, m: { key: 'ui_iron', ko: '철', en: 'Iron' , basis: /철/ } },
  { re: /^히알루론산$/, m: { key: 'ui_hyaluronic', ko: '히알루론산', en: 'Hyaluronic acid' , basis: /히알루론산/ } },
  { re: /^바나바잎추출물$/, m: { key: 'ui_banaba', ko: '바나바잎추출물', en: 'Banaba leaf extract' , basis: /코로솔산|바나바/ } },
  { re: /^쏘팔메토열매추출물$/, m: { key: 'ui_sawpalmetto', ko: '쏘팔메토 열매추출물', en: 'Saw palmetto fruit extract' , basis: /로르산|라우르산|쏘팔메토/ } },
  { re: /^홍삼(원료성)?$/, m: { key: 'ui_redginseng', ko: '홍삼', en: 'Korean red ginseng' , basis: /진세노사이드|Rg1|Rb1|홍삼/ } },
  { re: /^인삼$/, m: { key: 'ui_ginseng', ko: '인삼', en: 'Korean ginseng' , basis: /진세노사이드|인삼/ } },
  { re: /^포스파티딜세린$/, m: { key: 'ui_ps', ko: '포스파티딜세린', en: 'Phosphatidylserine' , basis: /포스파티딜세린/ } },
  { re: /^홍경천추출물$/, m: { key: 'ui_rhodiola', ko: '홍경천추출물', en: 'Rhodiola rosea extract' , basis: /로사빈|살리드로사이드|홍경천/ } },
  { re: /^헤마토코쿠스추출물$/, m: { key: 'ui_haematococcus', ko: '헤마토코쿠스 추출물', en: 'Haematococcus extract (astaxanthin)' , basis: /아스타잔틴|헤마토코쿠스/ } },
  { re: /^홍국$/, m: { key: 'ui_redyeast', ko: '홍국', en: 'Red yeast rice' , basis: /모나콜린|홍국/ } },
  { re: /^폴리감마글루탐산$/, m: { key: 'ui_pgga', ko: '폴리감마글루탐산', en: 'Poly-gamma-glutamic acid' , basis: /폴리감마글루탐산|γ-PGA|감마피지에이/ } },
  { re: /^회화나무열매추출물$/, m: { key: 'ui_sophora', ko: '회화나무열매추출물', en: 'Sophora japonica fruit extract' , basis: /이소플라본|회화나무/ } },
  { re: /^단백질$/, m: { key: 'ui_protein', ko: '단백질', en: 'Protein' , basis: /조단백질|단백질/ } },
  { re: /^대두이소플라본$/, m: { key: 'ui_isoflavone', ko: '대두이소플라본', en: 'Soy isoflavones' , basis: /이소플라본/ } },
  { re: /^알로에겔$/, m: { key: 'ui_aloegel', ko: '알로에 겔', en: 'Aloe gel' , basis: /알로에/ } },
  { re: /^콜레우스포스콜리추출물$/, m: { key: 'ui_coleus', ko: '콜레우스포스콜리추출물', en: 'Coleus forskohlii extract' , basis: /포스콜린|콜레우스/ } },
  { re: /^감마오리자놀$/, m: { key: 'ui_oryzanol', ko: '감마-오리자놀', en: 'Gamma-oryzanol' , basis: /오리자놀/ } },
  { re: /^감마리놀렌산$/, m: { key: 'ui_gla', ko: '감마리놀렌산', en: 'Gamma-linolenic acid' , basis: /감마리놀렌산|γ-리놀렌산/ } },
  { re: /^공액리놀레산$/, m: { key: 'ui_cla', ko: '공액리놀레산', en: 'Conjugated linoleic acid' , basis: /공액리놀레산|CLA/ } },
  { re: /^락토페린$/, m: { key: 'ui_lactoferrin', ko: '락토페린', en: 'Lactoferrin' , basis: /락토페린/ } },
  { re: /^크레아틴$/, m: { key: 'ui_creatine', ko: '크레아틴', en: 'Creatine' , basis: /크레아틴/ } },
  { re: /^저분자콜라겐펩타이드(AG|GT)?$/, m: { key: 'ui_collagenpep', ko: '저분자콜라겐펩타이드', en: 'Low-molecular-weight collagen peptide' , basis: /콜라겐/ } },
  { re: /^곤약감자추출물$/, m: { key: 'ui_konjac', ko: '곤약감자추출물', en: 'Konjac extract' , basis: /글루코만난|곤약/ } },
  { re: /^그린커피빈(주정)?추출물$/, m: { key: 'ui_greencoffee', ko: '그린커피빈추출물', en: 'Green coffee bean extract' , basis: /클로로겐산|그린커피/ } },
  { re: /^돌외잎(주정)?추출(분말)?$/, m: { key: 'ui_gynostemma', ko: '돌외잎주정추출분말', en: 'Gynostemma pentaphyllum leaf extract' , basis: /돌외|진세노사이드/ } },
  { re: /^토마토추출물$/, m: { key: 'ui_tomato', ko: '토마토추출물', en: 'Tomato extract' , basis: /라이코펜|리코펜|토마토/ } },
  { re: /^키토산$/, m: { key: 'ui_chitosan', ko: '키토산', en: 'Chitosan' , basis: /키토산|키토올리고당/ } },
  { re: /^빌베리추출물$/, m: { key: 'ui_bilberry', ko: '빌베리추출물', en: 'Bilberry extract' , basis: /안토시아닌|빌베리/ } },
  { re: /^(HK)?나토(균)?배양(물|분말)$/, m: { key: 'ui_natto', ko: '나토균 배양물', en: 'Bacillus subtilis natto culture' , basis: /나토|바실루스/ } },
  { re: /^자일로올리고당$/, m: { key: 'ui_xos', ko: '자일로올리고당', en: 'Xylooligosaccharide' , basis: /자일로올리고당|자일로스/ } },
  { re: /^(리프리놀-)?초록입홍합추출오일$/, m: { key: 'ui_mussel', ko: '초록입홍합추출오일', en: 'Green-lipped mussel extract oil' , basis: /초록입홍합/ } },
  { re: /^유단백가수분해물(락티움)?$/, m: { key: 'ui_lactium', ko: '유단백가수분해물', en: 'Milk protein hydrolysate' , basis: /유단백|락티움|카조제핀/ } },
  { re: /^미숙여주(주정)?추출(분말)?$/, m: { key: 'ui_bittermelon', ko: '미숙여주주정추출분말', en: 'Unripe bitter melon extract' , basis: /여주|카라틴/ } },
  { re: /^모로오렌지추출(분말)?$/, m: { key: 'ui_moro', ko: '모로오렌지추출분말', en: 'Moro orange extract' , basis: /모로오렌지|안토시아닌/ } },
  { re: /^유산균발효굴추출물$/, m: { key: 'ui_oyster', ko: '유산균발효굴추출물', en: 'Fermented oyster extract' , basis: /굴추출|발효굴/ } },
  { re: /^HK표고버섯균사체$/, m: { key: 'ui_shiitake', ko: '표고버섯균사체', en: 'Shiitake mycelium' , basis: /표고버섯|균사체/ } },
  { re: /^아쉬아간다\s?추출물$/, m: { key: 'ui_ashwagandha', ko: '아슈와간다 추출물', en: 'Ashwagandha extract' , basis: /아쉬아간다|아슈와간다|위타놀라이드/ } },
  { re: /^스피루리나$/, m: { key: 'ui_spirulina', ko: '스피루리나', en: 'Spirulina' , basis: /스피루리나|엽록소/ } },
  { re: /^클로렐라$/, m: { key: 'ui_chlorella', ko: '클로렐라', en: 'Chlorella' , basis: /클로렐라|엽록소/ } },
  { re: /^구아바잎추출물$/, m: { key: 'ui_guava', ko: '구아바잎추출물', en: 'Guava leaf extract' , basis: /구아바/ } },
  { re: /^달맞이꽃종자유$/, m: { key: 'ui_epo', ko: '달맞이꽃종자유', en: 'Evening primrose oil' , basis: /감마리놀렌산|달맞이꽃/ } },
  { re: /^쏘팔메토$/, m: { key: 'ui_sawpalmetto', ko: '쏘팔메토 열매추출물', en: 'Saw palmetto fruit extract' , basis: /로르산|라우르산|쏘팔메토/ } },
  { re: /^칼륨$/, m: { key: 'ui_potassium', ko: '칼륨', en: 'Potassium', basis: /칼륨/ } },
  { re: /^오메가-?3지방산함유유지$/, m: { key: 'ui_omega3', ko: '오메가-3 지방산 함유 유지', en: 'Omega-3 fatty acid containing oil', basis: /EPA|DHA|오메가/ } },
  { re: /^스페인감초추출물$/, m: { key: 'ui_licorice', ko: '스페인감초추출물', en: 'Spanish licorice extract', basis: /감초|글라브리딘/ } },
  { re: /^아프리카망고종자추출물$/, m: { key: 'ui_africanmango', ko: '아프리카망고종자추출물', en: 'African mango seed extract', basis: /아프리카망고|망고/ } },
  { re: /^시서스추출물$/, m: { key: 'ui_cissus', ko: '시서스추출물', en: 'Cissus quadrangularis extract', basis: /시서스/ } },
  // ── INDICATOR EXTENSION (WO-...-INDICATOR-REMAINDER-A-V1) : 지표성분이 공식 규격에 명시된 단일 원료 ──
  { re: /^보스웰리아추출물$/, m: { key: 'ui_boswellia', ko: '보스웰리아추출물', en: 'Boswellia extract', basis: /보스웰|boswellic|AKBA|KBA/i } },
  { re: /^콘드로이친(황산(염|나트륨)?)?$/, m: { key: 'ui_chondroitin', ko: '콘드로이친', en: 'Chondroitin', basis: /chondroitin|콘드로이친/i } },
  { re: /^폴리코사놀-?사탕수수왁스알코올$/, m: { key: 'ui_policosanol', ko: '폴리코사놀(사탕수수왁스알코올)', en: 'Policosanol (sugarcane wax alcohol)', basis: /octacosanol|옥타코사놀|policosanol|폴리코사놀|hexacosanol/i } },
  { re: /^아스타잔틴$/, m: { key: 'ui_astaxanthin', ko: '아스타잔틴', en: 'Astaxanthin', basis: /아스타잔틴|astaxanthin/i } },
  { re: /^마늘$/, m: { key: 'ui_garlic', ko: '마늘', en: 'Garlic', basis: /알리인|alliin|마늘/i } },
  { re: /^참당귀추출(분말)?$/, m: { key: 'ui_angelica', ko: '참당귀추출분말', en: 'Angelica gigas root extract', basis: /데커신|decursin|당귀/i } },
  { re: /^영지버섯자실체추출물$/, m: { key: 'ui_reishi', ko: '영지버섯자실체추출물', en: 'Ganoderma lucidum fruiting body extract', basis: /베타글루칸|영지|ganoderma/i } },
  { re: /^석류(농축|추출)(분말|물|액)?$/, m: { key: 'ui_pomegranate', ko: '석류추출물', en: 'Pomegranate extract', basis: /엘라그산|ellagic|석류/i } },
];
/** 라벨 정규화: 고시번호·®·™·"제품"·공백 변이 제거 후 UI_MAP 매칭. */
function normLabel(raw: string): string {
  let s = (raw ?? '').replace(/[®™©]/g, '').replace(/\((?:제)?\s*\d{4}\s*-\s*\d+\s*호\)?/g, '');
  s = s.replace(/\([^)]*\)?/g, '').replace(/\[[^\]]*\]?/g, '');
  s = s.replace(/\s*(?:제품|원료|분말|함유\s*제품)$/g, '');
  return s.replace(/\s+/g, '').trim();
}
function uiClassify(label: string): UiMeta | null {
  const n = normLabel(label); if (!n) return null; // 1글자 원료명(철 등)도 유효 — UI_MAP 은 완전일치만 허용
  for (const e of UI_MAP) if (e.re.test(n)) return e.m;
  return null;
}

// ── 로컬 라벨 블록 파서(공용 parseFnAttribution 무수정 · 블록 보존 · 단일 브래킷 허용) ──
type UiMode = 'bracket1' | 'bracket' | 'numbered' | 'colon' | 'none';
interface Block { label: string; seg: string }
interface LabelParse { mode: UiMode; blocks: Block[]; preamble: string }
function cut(t: string, ms: RegExpMatchArray[], labelOf: (m: RegExpMatchArray) => string): Block[] {
  const out: Block[] = [];
  for (let i = 0; i < ms.length; i++) {
    const start = (ms[i].index ?? 0) + ms[i][0].length;
    const end = i + 1 < ms.length ? (ms[i + 1].index ?? t.length) : t.length;
    out.push({ label: labelOf(ms[i]).trim(), seg: t.slice(start, end) });
  }
  return out;
}
function parseLabelBlocks(mainFn: string): LabelParse {
  const t = normalizeSpecText(mainFn);
  const brackets = [...t.matchAll(/\[([^\]]+)\]/g)];
  if (brackets.length >= 1) {
    return { mode: brackets.length === 1 ? 'bracket1' : 'bracket', blocks: cut(t, brackets, (m) => m[1]), preamble: t.slice(0, brackets[0].index ?? 0) };
  }
  const numbered = [...t.matchAll(/(?:^|\s)(\d+)\)\s*([가-힣A-Za-z0-9()\-·\s]{2,25}?)\s*[:：]\s*/g)];
  if (numbered.length >= 2) return { mode: 'numbered', blocks: cut(t, numbered, (m) => m[2]), preamble: t.slice(0, numbered[0].index ?? 0) };
  const colon = [...t.matchAll(/(?:^|\s)([가-힣A-Za-z0-9()\-·]{2,25})\s*[:：]\s*/g)];
  if (colon.length >= 2) return { mode: 'colon', blocks: cut(t, colon, (m) => m[1]), preamble: t.slice(0, colon[0].index ?? 0) };
  return { mode: 'none', blocks: [], preamble: t };
}

const FN_SPLIT = new RegExp(
  '[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]' +
  '|\\((?:가|나|다|라|마|바|사|\\d+)\\)' +
  '|(?:^|\\s)\\d+[).]' +
  '|\\s*/\\s*' +
  '|(?<=필요|있음|있습니다|줌|도움|보호|유지|생성|합성|발달|개선|억제|완화|증진)\\s*[.,。、]?\\s+(?=[가-힣])');

function blockFunctions(seg: string): string[] {
  let raw = (seg ?? '').replace(/[（]/g, '(').replace(/[）]/g, ')');
  raw = raw.replace(/\(?\s*영문\s*\)?[\s\S]*$/, '').replace(/May\s+help[\s\S]*$/i, '').replace(/\(?\s*국문\s*\)?/g, '');
  const t = normalizeSpecText(raw);
  return [...new Set(t.split(FN_SPLIT)
    .map((x) => x.trim().replace(/^[-•*\s:：·,，]+/, '').replace(/[.。,，、·\s]+$/, '').trim())
    .filter((x) => x.length >= 5 && /도움|개선|필요|유지|억제|완화|증진|보호|생성|합성/.test(x)))];
}

// ── 카드 구성(직전 WO 와 동일 레이아웃 계약 · 표시량 미기재 · N=1 문안 대응) ──
function appearance(base: string): string {
  const t = normalizeSource(base);
  const m = t.match(/성상\s*[:：]\s*([^\n]+?)(?=\s*\d+\s*[).]|\s*[①②③④⑤]|\s*[가-힣]{2,10}\s*[:：]|$)/);
  if (!m) return ''; let a = m[1].trim().replace(/\s+/g, ' ').replace(/[\s(·,［]+$/, '').trim();
  if ((a.match(/\(/g) || []).length > (a.match(/\)/g) || []).length) a = a.split('(')[0].trim(); return a;
}
const coliformNeg = (base: string): boolean => /대장균군\s*[:：]?\s*음성/.test(normalizeSource(base));
function cautionParts(raw: string): { ko: string[]; en: string[] } {
  const s = normalizeSource(raw); const ko: string[] = [], en: string[] = [];
  if (/임산부|임신|수유/.test(s)) { ko.push('임산부·수유부는 섭취 전 전문가와 상담'); en.push('Pregnant or breastfeeding women should consult a professional before use'); }
  if (/의약품|질환|질병|치료/.test(s)) { ko.push('질환이 있거나 의약품 복용 시 전문가와 상담'); en.push('Consult a professional if you have a medical condition or take medication'); }
  if (/알레르기|알러지|과민/.test(s)) { ko.push('알레르기 체질 등은 개인에 따라 과민반응 가능'); en.push('Allergic reactions may occur in sensitive individuals'); }
  if (/이상사례|이상반응|부작용|중단/.test(s)) { ko.push('이상사례 발생 시 섭취를 중단하고 전문가와 상담'); en.push('Stop use and consult a professional if adverse effects occur'); }
  if (!ko.length) { ko.push('섭취 전 제품 표시사항을 확인'); en.push('Refer to the official labelling before use'); }
  ko.push('건강기능식품은 질병의 예방·치료를 위한 의약품이 아니며, 궁금한 점은 매장 내 약사 등 전문가와 상담하십시오');
  en.push('This health functional food is not a drug for preventing or treating disease; consult a pharmacist or professional in store');
  return { ko, en };
}
const COUNTER: Record<string, { ko: string; en: string }> = { 포: { ko: '포', en: 'sachet' }, 스틱: { ko: '포', en: 'sachet' }, 캡슐: { ko: '캡슐', en: 'capsule' }, 캅셀: { ko: '캡슐', en: 'capsule' }, 정: { ko: '정', en: 'tablet' }, 병: { ko: '병', en: 'bottle' }, 환: { ko: '환', en: 'pill' } };
function counter(unit: string | null, form: string): { ko: string; en: string } {
  if (unit && COUNTER[unit]) return COUNTER[unit];
  if (/캡슐|캅셀|연질/.test(form)) return COUNTER['캡슐']; if (/정제|정\b/.test(form)) return COUNTER['정']; if (/분말|포/.test(form)) return COUNTER['포']; return COUNTER['정'];
}
/** 받침 유무에 따른 목적격 조사(을/를) — 원료명이 자음으로 끝나는 경우 대응. */
function josaEul(w: string): string {
  const m = (w ?? '').trim().replace(/[)\]\s]+$/, '');
  const ch = m.charCodeAt(m.length - 1);
  if (Number.isNaN(ch) || ch < 0xac00 || ch > 0xd7a3) return '를';
  return (ch - 0xac00) % 28 === 0 ? '를' : '을';
}
interface UiIng { key: string; label: string; displayKo: string; displayEn: string; fnKo: string[]; fnEn: string[]; viaUiMap: boolean }
function metaOf(key: string): { displayKo: string; displayEn: string } | null {
  const sf = Object.values(SF_INGREDIENTS).find((i) => i.key === key);
  if (sf) return { displayKo: sf.displayKo, displayEn: sf.displayEn };
  const m = FUNCTIONAL_META[key] ?? NUTRIENT_META[key];
  return m ? { displayKo: m.displayKo, displayEn: m.displayEn } : null;
}
interface UiSeed {
  statementNo: string; candidateId: string; productName: string; manufacturer: string; ings: UiIng[];
  source: { mainFunction: string; baseStandard: string; intake: string; dosageForm: string; shelfLife: string; storage: string; caution: string };
}
function composeUiCard(seed: UiSeed): { ko: string; en: string } | { error: string } {
  const srv = parseServing(seed.source.intake); if (srv.kind !== 'PARSED') return { error: `SERVING_${srv.kind}` };
  const s = srv.value; const ct = counter(s.unitType, seed.source.dosageForm);
  const perServeKo = s.unitsPerServing != null ? `${s.unitsPerServing}${ct.ko}` : null;
  const perServeEn = s.unitsPerServing != null ? `${s.unitsPerServing} ${ct.en}${s.unitsPerServing > 1 ? 's' : ''}` : null;
  const sd = s.servingsPerDay ?? 1; const dayKo = `1일 ${sd}회`, dayEn = sd === 1 ? 'Once a day' : `${sd} times a day`;
  const app = appearance(seed.source.baseStandard); const coli = coliformNeg(seed.source.baseStandard);
  const shelf = normalizeSource(seed.source.shelfLife), storage = normalizeSource(seed.source.storage);
  const caut = cautionParts(seed.source.caution); const li = (a: string[]): string => a.map((x) => `<li>${x}</li>`).join('');
  const waterInSource = /물|음용수/.test(normalizeSource(seed.source.intake)) && !/물\s*없이/.test(normalizeSource(seed.source.intake));
  const ings = seed.ings; const n = ings.length;
  const titleKo = ings.map((a) => a.displayKo).join(' · '), titleEn = ings.map((a) => a.displayEn).join(' · ');
  const badgeKo = '<span class="sd-badge">건강기능식품</span>' + ings.map((a) => `<span class="sd-badge is-solid">${esc(a.displayKo)}</span>`).join('') + `<span class="sd-badge">${dayKo}</span>`;
  const badgeEn = '<span class="sd-badge">Health Functional Food</span>' + ings.map((a) => `<span class="sd-badge is-solid">${esc(a.displayEn)}</span>`).join('') + `<span class="sd-badge">${dayEn}</span>`;
  const metaKo = `${esc(seed.manufacturer)} 제조 · ${dayKo}${perServeKo ? ` 1회 ${perServeKo}` : ''}`;
  const metaEn = `Made by ${esc(seed.manufacturer)} · ${dayEn}${perServeEn ? ` · ${perServeEn} per serving` : ''}`;
  const introKo = n === 1
    ? `이 제품은 <b>${esc(ings[0].displayKo)}</b>${josaEul(ings[0].displayKo)} 주원료로 한 건강기능식품입니다. 공식 섭취방법은 <b>${dayKo}${perServeKo ? `, 1회 ${perServeKo}` : ''}</b>이며, 공식 인정 기능성은 아래와 같습니다.`
    : `이 제품은 ${ings.map((a) => `<b>${esc(a.displayKo)}</b>`).join(', ')}${josaEul(ings[n - 1].displayKo)} 주원료로 한 ${n}원료 복합 건강기능식품입니다. 공식 섭취방법은 <b>${dayKo}${perServeKo ? `, 1회 ${perServeKo}` : ''}</b>이며, 각 원료의 공식 인정 기능성은 아래와 같습니다.`;
  const introEn = n === 1
    ? `This product features <b>${esc(ings[0].displayEn)}</b> as its functional ingredient. The official directions are <b>${dayEn}${perServeEn ? `, ${perServeEn} per serving` : ''}</b>. Its officially recognised functions are listed below.`
    : `This product combines ${ings.map((a) => `<b>${esc(a.displayEn)}</b>`).join(', ')} as its ${n} functional ingredients. The official directions are <b>${dayEn}${perServeEn ? `, ${perServeEn} per serving` : ''}</b>. The officially recognised functions of each are listed below.`;
  const whyKo = [`주원료: ${ings.map((a) => `<b>${esc(a.displayKo)}</b>`).join(', ')}`]; if (coli) whyKo.push('대장균군 음성 — 식약처 신고 기준 적합'); whyKo.push(`${app ? esc(app) + ' · ' : ''}${esc(seed.manufacturer)} 제조`);
  const whyEn = [`Functional ingredients: ${ings.map((a) => `<b>${esc(a.displayEn)}</b>`).join(', ')}`]; if (coli) whyEn.push('Coliform negative — meets its MFDS notified standard'); whyEn.push(`Made by ${esc(seed.manufacturer)}`);
  const fnKo = ings.map((a) => `<li><b>${esc(a.displayKo)}</b><ul class="sd-why">${li(a.fnKo.map(esc))}</ul></li>`).join('');
  const fnEn = ings.map((a) => `<li><b>${esc(a.displayEn)}</b><ul class="sd-why">${li(a.fnEn.map(esc))}</ul></li>`).join('');
  const chipsKo = [`<span class="sd-tag">${dayKo}</span>`]; if (perServeKo) chipsKo.push(`<span class="sd-tag">1회 ${perServeKo}</span>`); if (waterInSource) chipsKo.push('<span class="sd-tag">물과 함께</span>');
  const chipsEn = [`<span class="sd-tag">${dayEn}</span>`]; if (perServeEn) chipsEn.push(`<span class="sd-tag">${perServeEn} per serving</span>`); if (waterInSource) chipsEn.push('<span class="sd-tag">With water</span>');
  const specKo: string[] = []; if (app) specKo.push(`<div class="sd-item"><b>성상</b> ${esc(app)}</div>`); if (coli) specKo.push('<div class="sd-item"><b>대장균군</b> 음성</div>'); if (shelf) specKo.push(`<div class="sd-item"><b>유통기한</b> ${esc(shelf)}</div>`); if (storage) specKo.push(`<div class="sd-item"><b>보관</b> ${esc(storage)}</div>`);
  const specEn: string[] = []; if (app) specEn.push(`<div class="sd-item"><b>Appearance</b> ${esc(app)}</div>`); if (coli) specEn.push('<div class="sd-item"><b>Coliform</b> Negative</div>'); if (shelf) specEn.push(`<div class="sd-item"><b>Shelf life</b> ${esc(shelf)}</div>`); if (storage) specEn.push(`<div class="sd-item"><b>Storage</b> ${esc(storage)}</div>`);
  const whoKo = [`매일 ${titleKo} 섭취를 챙기고 싶은 분`, `${ct.ko} 형태를 선호하는 분`, n === 1 ? '공식 인정 기능성을 확인하고 선택하고 싶은 분' : '여러 원료를 간편하게 함께 관리하고 싶은 분'];
  const whoEn = [`Those who want to take ${titleEn} daily`, `Those who prefer ${ct.en}s`, n === 1 ? 'Those who want to check officially recognised functions before choosing' : 'Those who want a convenient way to manage multiple ingredients'];
  const ko = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeKo}</div>
  <h1>${esc(seed.productName)}<small>${esc(titleKo)}</small></h1><p class="sd-meta">${metaKo}</p></div>
  <div class="sd-body"><p class="sd-intro">${introKo}</p>
  <h2>왜 이 제품인가</h2><ul class="sd-why">${li(whyKo)}</ul>
  <h2>${n === 1 ? '공식 인정 기능성' : '원료별 공식 인정 기능성'}</h2><ul class="sd-func">${fnKo}</ul>
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${chipsKo.join('')}</span></div>${specKo.length ? `
  <h2>표시 기준</h2><div class="sd-spec">${specKo.join('')}</div>` : ''}
  <h2>이런 분께</h2><ul class="sd-who">${li(whoKo)}</ul></div><div class="sd-foot"><b>섭취 시 주의사항</b> · ${caut.ko.join(' · ')}</div></div>`;
  const en = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeEn}</div>
  <h1>${esc(seed.productName)}<small>${esc(titleEn)}</small></h1><p class="sd-meta">${metaEn}</p></div>
  <div class="sd-body"><p class="sd-intro">${introEn}</p>
  <h2>Why this product</h2><ul class="sd-why">${li(whyEn)}</ul>
  <h2>${n === 1 ? 'Officially recognised functions' : 'Officially recognised functions by ingredient'}</h2><ul class="sd-func">${fnEn}</ul>
  <h2>Directions (exactly as officially stated)</h2><div class="sd-intake"><span class="sd-chips">${chipsEn.join('')}</span></div>${specEn.length ? `
  <h2>Labelled standard</h2><div class="sd-spec">${specEn.join('')}</div>` : ''}
  <h2>Who it suits</h2><ul class="sd-who">${li(whoEn)}</ul></div><div class="sd-foot"><b>Precautions</b> · ${caut.en.join(' · ')}</div></div>`;
  return { ko, en };
}
function uiGuard(seed: UiSeed, ko: string, en: string): string[] {
  const out: string[] = []; const n = seed.ings.length;
  const koCards = (ko.match(/<li><b>[^<]+<\/b><ul class="sd-why">/g) || []).length;
  const enCards = (en.match(/<li><b>[^<]+<\/b><ul class="sd-why">/g) || []).length;
  if (koCards !== n || enCards !== n) out.push(`G-UI-CARD-COUNT: n${n}/ko${koCards}/en${enCards}`);
  for (const a of seed.ings) {
    if (!a.fnKo.length || a.fnKo.length !== a.fnEn.length) out.push(`G-UI-FUNC-COUNT:${a.key}`);
    for (const f of a.fnKo) if (!ko.includes(esc(f))) out.push(`G-UI-KO-MISSING:${a.key}`);
    for (const f of a.fnEn) if (!en.includes(esc(f))) out.push(`G-UI-EN-MISSING:${a.key}`);
  }
  const keys = seed.ings.map((a) => a.key);
  if (new Set(keys).size !== keys.length) out.push(`G-UI-DUP:${keys.join(',')}`);
  return out;
}

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out'); if (!OUTDIR) throw new Error('--out <dir> 필요');
const CHUNK = parseInt(arg('chunk', '250'), 10);
const CENSUS = process.argv.includes('--census');
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5442', 10);
fs.mkdirSync(OUTDIR, { recursive: true });

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: false, ssl: false, extra: { max: 2, statement_timeout: 600000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const hasMaster = new Set((await ds.query(`SELECT DISTINCT mfds_permit_number p FROM product_masters WHERE mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));

    const funnel = { scanned: 0, shard0: 0, skipped: 0, noStructure: 0, preambleResidue: 0, labelUnmapped: 0, emptyBlock: 0, dupKey: 0, fiberPending: 0, specBasisMissing: 0, enPending: 0, atomUnrendered: 0, composeHold: 0, guardFail: 0, guardBlock: 0, guardReview: 0, noUiIng: 0, liquidForm: 0, target: 0 };
    const target: unknown[] = []; const pool: unknown[] = []; const hold: Array<Record<string, unknown>> = [];
    const seen = new Set<string>(); const holdReason: Record<string, number> = {}; const distMode: Record<string, number> = {}; const distN: Record<string, number> = {};
    const byIng: Record<string, number> = {}; const unmapped: Record<string, number> = {};
    const H = (stmt: string, name: string, reason: string, extra: Record<string, unknown> = {}): void => {
      holdReason[reason.split(':')[0]] = (holdReason[reason.split(':')[0]] ?? 0) + 1;
      if (hold.length < 6000) hold.push({ stmt, name, reason, ...extra });
    };

    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; maker: string; sungsang: string; srv: string; fn: string; base: string; shelf: string; storage: string; caution: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
           coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'ENTRPS','') maker,
           coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang, coalesce(raw_payload->'source'->>'SRV_USE','') srv,
           coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, coalesce(raw_payload->'source'->>'BASE_STANDARD','') base,
           coalesce(raw_payload->'source'->>'DISTB_PD','') shelf, coalesce(raw_payload->'source'->>'PRSRV_PD','') storage,
           coalesce(raw_payload->'source'->>'INTAKE_HINT1','') caution
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1
         ORDER BY id ASC LIMIT 5000`, [after]);
      if (!rows.length) break;
      after = rows[rows.length - 1].id;

      for (const r of rows) {
        funnel.scanned++;
        const stmt = String(r.stmt).trim(); if (!stmt) continue;
        if (stableHash(stmt) % 3 !== 0) continue; funnel.shard0++;
        if (seen.has(stmt)) continue; seen.add(stmt);
        if (r.mid != null || taken.has(stmt) || hasMaster.has(stmt)) { funnel.skipped++; continue; }
        const mf = r.fn || ''; const name = r.name.trim();
        const baseNorm = normalizeSource(r.base || '').replace(/\s+/g, '');

        const lp = parseLabelBlocks(mf);
        if (lp.mode === 'none') { funnel.noStructure++; H(stmt, name, 'NO_EXPLICIT_STRUCTURE'); continue; }
        if (blockFunctions(lp.preamble).length) { funnel.preambleResidue++; H(stmt, name, 'RESIDUE_PREAMBLE', { mode: lp.mode }); continue; }

        const ings: UiIng[] = []; let hr = ''; const usedKeys = new Set<string>(); let anyUi = false;
        for (const b of lp.blocks) {
          const label = b.label.replace(/\s+/g, ' ').trim();
          const shared = classify(label);
          let key: string, dko: string, den: string, viaUi = false; let basis: RegExp | null = null;
          if (shared) {
            const meta = metaOf(shared); if (!meta) { hr = `NO_META:${shared}`; break; }
            key = shared; dko = meta.displayKo; den = meta.displayEn;
          } else {
            const ui = uiClassify(label);
            if (!ui) { hr = `LABEL_UNMAPPED:${normLabel(label).slice(0, 24)}`; unmapped[normLabel(label).slice(0, 24)] = (unmapped[normLabel(label).slice(0, 24)] ?? 0) + 1; funnel.labelUnmapped++; break; }
            key = ui.key; dko = ui.ko; den = ui.en; viaUi = true; anyUi = true; basis = ui.basis ?? null;
          }
          const fnKo = blockFunctions(b.seg);
          if (!fnKo.length) { hr = `EMPTY_FN_BLOCK:${label.slice(0, 24)}`; funnel.emptyBlock++; break; }
          if (usedKeys.has(key)) { hr = `DUP_KEY_LABELS:${key}`; funnel.dupKey++; break; }
          if (key === '식이섬유') { hr = 'PENDING_SHARED_FIBER'; funnel.fiberPending++; break; }
          usedKeys.add(key);
          // 규격 근거: **신규 매핑 원료**는 BASE_STANDARD(표시량·규격)에 원료명 또는 공식 지표성분이 실재해야 한다.
          // 공용 registry 원료는 기존 경로에서 이미 검증된 축이므로 본 게이트를 중복 적용하지 않는다.
          if (viaUi && basis && !basis.test(baseNorm)) { hr = `SPEC_BASIS_MISSING:${normLabel(label).slice(0, 20)}`; funnel.specBasisMissing++; break; }
          const fnEn: string[] = []; let enMiss = '';
          for (const f of fnKo) { const e = mapFunctionEnC(f) ?? mapFunctionEn(f); if (!e) { enMiss = f; break; } fnEn.push(e); }
          if (enMiss) { hr = `GROUNDING_PENDING_EN:${enMiss.slice(0, 40)}`; funnel.enPending++; break; }
          ings.push({ key, label, displayKo: dko, displayEn: den, fnKo, fnEn, viaUiMap: viaUi });
        }
        if (hr) { H(stmt, name, hr, { mode: lp.mode }); continue; }
        if (!ings.length) continue;
        // 본 WO 는 **registry 미등록 원료를 포함한 제품**만 대상으로 한다(기존 경로와 중복 생산 방지).
        if (!anyUi) { funnel.noUiIng++; continue; }
        // 액상 HOLD (WO 요구): 신규 원료 제품이 액상·액제·드링크·음료·시럽이면 제외.
        if (/액상|액제|드링크|음료|시럽/.test(baseNorm + normalizeSource(r.sungsang))) { funnel.liquidForm++; H(stmt, name, 'LIQUID_FORM', { mode: lp.mode }); continue; }

        const rendered = new Set(ings.flatMap((a) => a.fnKo).map(cmp));
        const missing = splitFunctions(mf).filter((a) => {
          const c = cmp(a); if (!c) return false;
          for (const rr of rendered) if (rr.includes(c) || c.includes(rr)) return false;
          return true;
        });
        if (missing.length) { funnel.atomUnrendered++; H(stmt, name, 'FN_ATOM_UNRENDERED', { mode: lp.mode, miss: missing.slice(0, 3) }); continue; }

        const seed: UiSeed = { statementNo: stmt, candidateId: r.id, productName: name, manufacturer: r.maker.trim(), ings,
          source: { mainFunction: mf.trim(), baseStandard: (r.base || '').trim(), intake: r.srv.trim(), dosageForm: r.sungsang.trim(), shelfLife: r.shelf.trim(), storage: r.storage.trim(), caution: r.caution.trim() } };
        const c = composeUiCard(seed);
        if ('error' in c) { funnel.composeHold++; H(stmt, name, `COMPOSE_${c.error}`); continue; }
        const cg = uiGuard(seed, c.ko, c.en);
        if (cg.length) { funnel.guardFail++; H(stmt, name, `UI_GUARD:${cg[0]}`); continue; }

        const gi = { candidateId: r.id, productName: name, productNameEn: name, manufacturer: seed.manufacturer, manufacturerEn: null, statementNo: stmt, category: 'hff',
          source: { mainFunction: seed.source.mainFunction, baseStandard: seed.source.baseStandard, intake: seed.source.intake, caution: seed.source.caution, dosageForm: seed.source.dosageForm, storage: seed.source.storage, shelfLife: seed.source.shelfLife },
          grounding: { declaredAmount: null, serving: null, calculationAllowed: false, ageBandsRaw: null }, drafts: { ko: c.ko, en: c.en } };
        const g = runGuard(gi as never, { phase: 'all' });
        const blocked = g.findings.filter((f) => f.status === 'BLOCKED');
        if (blocked.length) { funnel.guardBlock++; H(stmt, name, `GUARD_BLOCKED:${blocked.map((f) => f.ruleId).join(',')}`); continue; }
        if (g.overallStatus === 'REVIEW_REQUIRED') { funnel.guardReview++; H(stmt, name, `GUARD_REVIEW:${g.findings.filter((f) => f.status === 'REVIEW_REQUIRED').map((f) => f.ruleId).join(',')}`); continue; }

        distMode[lp.mode] = (distMode[lp.mode] ?? 0) + 1;
        distN[String(ings.length)] = (distN[String(ings.length)] ?? 0) + 1;
        for (const a of ings) if (a.viaUiMap) byIng[a.displayKo] = (byIng[a.displayKo] ?? 0) + 1;
        target.push(gi); pool.push({ stmt, name, mode: lp.mode, keys: ings.map((a) => a.key), ui: ings.filter((a) => a.viaUiMap).map((a) => a.displayKo) });
        funnel.target++;
      }
    }

    const chunks: number[] = [];
    if (!CENSUS) for (let i = 0, b = 0; i < target.length; i += CHUNK, b++) {
      fs.writeFileSync(path.join(OUTDIR, `ind-a-target-${b}.json`), JSON.stringify(target.slice(i, i + CHUNK), null, 1));
      chunks.push(Math.min(CHUNK, target.length - i));
    }
    const w = (nm: string, d: unknown): void => fs.writeFileSync(path.join(OUTDIR, `ind-a-${nm}.json`), JSON.stringify(d, null, 1));
    w('pool', pool); w('hold', hold); w('selfcheck', { funnel, distMode, distN, byIng, holdReason, chunks });
    w('unmapped', Object.entries(unmapped).sort((a, b) => b[1] - a[1]).slice(0, 200));
    console.log('JSON_UI_A_BEGIN');
    console.log(JSON.stringify({ funnel, distMode, distN, byIng, holdReason, targetTotal: target.length, chunks }, null, 2));
    console.log('JSON_UI_A_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
