/**
 * WO-O4O-HFF-COMBO-COMPLETION-A-JOINT-SKIN-V1 — Agent A 전용 additive 복합형(관절·피부) build.
 *
 * 병렬 세션이 공용 hff-combo-{select,compose,generate}.ts / hff-nutrient-registry.ts 를 수정 중이므로 본 파일은 자기완결.
 * 공용 combo composer(hff-combo-compose.ts)는 **표시량 기반**(원료별 declaredAmount + SRC_LABEL)이라 A 관절·피부
 * 기능성 원료(글루코사민/MSM/NAG/뮤코다당·단백/히알루론/세라마이드)에 미등록·부적합. 본 빌더는 composeSf 와 동일한
 * **기능성 기반**(원료 mg량 draft 미기재)으로 다원료 매장 설명서를 렌더한다. 원료 mg 을 지어내지 않으므로 안전.
 *
 * 귀속 원칙(WO 분류·매장설명서 원칙):
 *   ① BASE_STANDARD 에 존재하는 A 기능성 원료 집합을 signature 로 사용(부원료 비타민/미네랄은 귀속 불방해·미렌더).
 *   ② 원료별 공식 기능성은 **레지스트리 canonical 문구**로 지정하고 MAIN_FNCTN 에 문구가 존재함을 grounding 검증.
 *   ③ 원료별 기능성 귀속은 `[원료] 문구` 라벨 블록에서만 수행(무라벨 다원료는 귀속 모호 → HOLD). 단일(N==1)은 무라벨 허용.
 *   ④ 비-A 기능성 원료(강황/루테인/오메가/홍삼/유산균 등)가 기능성으로 선언되면 혼합형 → HOLD.
 *   ⑤ 공식 기능성(관절·연골/피부보습/자외선 피부손상)은 순화·삭제 없이 원문 보존. 원문 밖 치료·예방 주장 미생성. 전문가 상담 footer 유지.
 *
 *   PROXY_PORT=5442 npx tsx src/scripts/hff-combo-a-build.ts --out <dir> [--single] [--include-liquid]
 * DB write 0. 산출: <dir>/combo-a-target.json (apply 입력·hff-sf-apply.ts 호환) · -pool/-hold/-selfcheck.json
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { parseServing, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';

// ── A 기능성 canonical 문구(원문 보존·순화 금지) ──
type FnKey = 'joint' | 'jointOnly' | 'skinMoist' | 'skinUV';
const FN: Record<FnKey, { ko: string; en: string; re: RegExp }> = {
  joint:     { ko: '관절 및 연골 건강에 도움을 줄 수 있음', en: 'May help with joint and cartilage health', re: /관절\s*(?:및|,|·)?\s*연골|연골\s*건강|관절\s*연골/ },
  jointOnly: { ko: '관절 건강에 도움을 줄 수 있음', en: 'May help with joint health', re: /관절\s*건강/ },
  skinMoist: { ko: '피부보습에 도움을 줄 수 있음', en: 'May help to moisturise the skin', re: /피부\s*보습|피부\s*수분/ },
  skinUV:    { ko: '자외선에 의한 피부손상으로부터 피부건강을 유지하는데 도움을 줄 수 있음', en: 'May help to maintain skin health from skin damage caused by UV radiation', re: /자외선.*피부\s*손상|자외선에\s*의한\s*피부/ },
};

interface AIng {
  key: string; displayKo: string; displayEn: string;
  mark: RegExp;                 // BASE_STANDARD 에서 원료(지표) 탐지
  labelRe: RegExp;             // MAIN_FNCTN 의 [라벨] ↔ 원료 매칭
  funcs: FnKey[];              // 원료가 주장 가능한 A 기능성(canonical). 제품별 실제 주장분만 부여.
  singleAllowed?: boolean;     // N==1 SF 로도 생산 허용(기존 SF 트랙 미포함 원료만).
}

// 글루코사민 real = 아세틸 선행 아님(N-아세틸글루코사민 내부 substring 오검출 방지, lookbehind).
const A_INGREDIENTS: AIng[] = [
  { key: '뮤코다당·단백', displayKo: '뮤코다당·단백(콘드로이친)', displayEn: 'Mucopolysaccharide-protein (chondroitin)', mark: /뮤코다당|점액다당/, labelRe: /뮤코다당|점액다당|콘드로이/, funcs: ['joint'], singleAllowed: true },
  { key: 'MSM',          displayKo: 'MSM(엠에스엠·디메틸설폰)', displayEn: 'MSM (Methylsulfonylmethane)', mark: /\bMSM\b|엠에스엠|메틸설포닐메탄|디메틸설폰/i, labelRe: /\bMSM\b|엠에스엠|메틸설포닐메탄|디메틸설폰/i, funcs: ['joint'] },
  { key: 'N아세틸글루코사민', displayKo: 'N-아세틸글루코사민', displayEn: 'N-Acetylglucosamine', mark: /N-?\s*아세틸글루코사민|아세틸글루코사민|\bNAG\b/i, labelRe: /아세틸글루코사민|\bNAG\b/i, funcs: ['joint', 'skinMoist'] },
  { key: '글루코사민',     displayKo: '글루코사민', displayEn: 'Glucosamine', mark: /(?<!아세틸)글루코사민/, labelRe: /(?<!아세틸)글루코사민/, funcs: ['joint'] },
  { key: '히알루론산',     displayKo: '히알루론산', displayEn: 'Hyaluronic acid', mark: /히알루[론룬]산|하이알루론/, labelRe: /히알루[론룬]산|하이알루론/, funcs: ['skinMoist', 'skinUV'] },
  { key: '세라마이드',     displayKo: '세라마이드', displayEn: 'Ceramide', mark: /글루코실세라마이드|세라마이드/, labelRe: /글루코실세라마이드|세라마이드/, funcs: ['skinMoist'] },
  { key: '보스웰리아',     displayKo: '보스웰리아추출물', displayEn: 'Boswellia serrata extract', mark: /보스웰|유니베스틴/, labelRe: /보스웰|유니베스틴/, funcs: ['jointOnly'] },
  { key: '콜라겐',        displayKo: '콜라겐펩타이드', displayEn: 'Collagen peptide', mark: /콜라겐/, labelRe: /콜라겐/, funcs: ['skinMoist', 'skinUV', 'joint'] },
  { key: '엘라스틴',       displayKo: '엘라스틴', displayEn: 'Elastin', mark: /엘라스틴/, labelRe: /엘라스틴/, funcs: ['skinMoist'] },
];

// 비-A **기능성** 원료(개별인정/타 고시). 기능성으로 선언되면 혼합형 → HOLD. (비타민/미네랄 부원료는 제외)
const NONA_FUNC = /강황|커큐민|터마신|보스웰(?!리아)|루테인|지아잔틴|은행잎|홍삼|인삼|프로바이오틱|유산균|가르시니아|HCA|hydroxycitric|밀크씨슬|실리마린|코엔자임|Q10|초록입홍합|리프리놀|쏘팔메토|감마리놀렌|테아닌|프로폴리스|보이차|녹차추출|카테킨|난소화성|차전자|백수오|회화나무|정제어유|오메가|EPA|DHA|폴리코사놀|옥타코사놀|시트룰린|아르기닌|크레아틴|엘더베리|아로니아|빌베리|크랜베리|프락토올리고|difructose|자일리톨|매스틱|헤마토코쿠스|아스타잔틴/i;

const esc = (s: string): string => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|앰플|스프레이|스포이드|농축액|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;

interface Assigned { ing: AIng; funcs: FnKey[] }

// MAIN_FNCTN → [라벨] 블록 파싱. 라벨 없으면 [] (무라벨).
function parseLabelBlocks(mf: string): Array<{ label: string; text: string }> {
  const t = String(mf).replace(/\r/g, '');
  const out: Array<{ label: string; text: string }> = [];
  const re = /\[([^\]]{1,40})\]([^\[]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) out.push({ label: m[1].trim(), text: m[2].trim() });
  return out;
}

// 성상(dosage form) 추출 — composeSf appearance 와 동일 계약.
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

interface ComboSeed {
  statementNo: string; candidateId: string; productName: string; manufacturer: string;
  ings: Assigned[];
  source: { mainFunction: string; baseStandard: string; intake: string; dosageForm: string; shelfLife: string; storage: string; caution: string };
  serving: { unitType: string | null; unitsPerServing: number | null; servingsPerDay: number | null };
}

const COUNTER: Record<string, { ko: string; en: string }> = { 포: { ko: '포', en: 'sachet' }, 스틱: { ko: '포', en: 'sachet' }, 캡슐: { ko: '캡슐', en: 'capsule' }, 캅셀: { ko: '캡슐', en: 'capsule' }, 정: { ko: '정', en: 'tablet' }, 병: { ko: '병', en: 'bottle' }, 환: { ko: '환', en: 'pill' } };
function counter(unit: string | null, form: string): { ko: string; en: string } {
  if (unit && COUNTER[unit]) return COUNTER[unit];
  if (/캡슐|캅셀|연질/.test(form)) return COUNTER['캡슐']; if (/정제|정\b/.test(form)) return COUNTER['정']; if (/분말|포/.test(form)) return COUNTER['포']; return COUNTER['정'];
}

function composeComboA(seed: ComboSeed): { ko: string; en: string } | { error: string } {
  const srv = parseServing(seed.source.intake); if (srv.kind !== 'PARSED') return { error: `SERVING_${srv.kind}` };
  const s = srv.value; const ct = counter(s.unitType, seed.source.dosageForm);
  const perServeKo = s.unitsPerServing != null ? `${s.unitsPerServing}${ct.ko}` : null;
  const perServeEn = s.unitsPerServing != null ? `${s.unitsPerServing} ${ct.en}${s.unitsPerServing > 1 ? 's' : ''}` : null;
  const sd = s.servingsPerDay ?? 1; const dayKo = `1일 ${sd}회`, dayEn = sd === 1 ? 'Once a day' : `${sd} times a day`;
  const app = appearance(seed.source.baseStandard); const coli = coliformNeg(seed.source.baseStandard);
  const shelf = normalizeSource(seed.source.shelfLife), storage = normalizeSource(seed.source.storage);
  const caut = cautionParts(seed.source.caution); const li = (a: string[]): string => a.map((x) => `<li>${x}</li>`).join('');
  const waterInSource = /물|음용수/.test(normalizeSource(seed.source.intake)) && !/물\s*없이/.test(normalizeSource(seed.source.intake));
  const ings = seed.ings;
  const titleKo = ings.map((a) => a.ing.displayKo).join(' · '), titleEn = ings.map((a) => a.ing.displayEn).join(' · ');
  const isSingle = ings.length === 1;

  const badgeKo = `<span class="sd-badge">건강기능식품</span>` + ings.map((a) => `<span class="sd-badge is-solid">${esc(a.ing.displayKo)}</span>`).join('') + `<span class="sd-badge">${dayKo}</span>`;
  const badgeEn = `<span class="sd-badge">Health Functional Food</span>` + ings.map((a) => `<span class="sd-badge is-solid">${esc(a.ing.displayEn)}</span>`).join('') + `<span class="sd-badge">${dayEn}</span>`;
  const metaKo = `${esc(seed.manufacturer)} 제조 · ${dayKo}${perServeKo ? ` 1회 ${perServeKo}` : ''}`;
  const metaEn = `Made by ${esc(seed.manufacturer)} · ${dayEn}${perServeEn ? ` · ${perServeEn} per serving` : ''}`;
  const introKo = isSingle
    ? `이 제품은 <b>${esc(ings[0].ing.displayKo)}</b>을(를) 주원료로 한 건강기능식품입니다. 공식 섭취방법은 <b>${dayKo}${perServeKo ? `, 1회 ${perServeKo}` : ''}</b>입니다. 공식 인정 기능성은 아래와 같습니다.`
    : `이 제품은 ${ings.map((a) => `<b>${esc(a.ing.displayKo)}</b>`).join(', ')}를 주원료로 한 ${ings.length}원료 복합 건강기능식품입니다. 공식 섭취방법은 <b>${dayKo}${perServeKo ? `, 1회 ${perServeKo}` : ''}</b>이며, 각 원료의 공식 인정 기능성은 아래와 같습니다.`;
  const introEn = isSingle
    ? `This product features <b>${esc(ings[0].ing.displayEn)}</b> as its functional ingredient. The official directions are <b>${dayEn}${perServeEn ? `, ${perServeEn} per serving` : ''}</b>. Its officially recognised functions are listed below.`
    : `This product combines ${ings.map((a) => `<b>${esc(a.ing.displayEn)}</b>`).join(', ')} as its ${ings.length} functional ingredients. The official directions are <b>${dayEn}${perServeEn ? `, ${perServeEn} per serving` : ''}</b>. The officially recognised functions of each are listed below.`;

  const whyKo = [`주원료: ${ings.map((a) => `<b>${esc(a.ing.displayKo)}</b>`).join(', ')}`]; if (coli) whyKo.push('대장균군 음성 — 식약처 신고 기준 적합'); whyKo.push(`${app ? esc(app) + ' · ' : ''}${esc(seed.manufacturer)} 제조`);
  const whyEn = [`Functional ingredients: ${ings.map((a) => `<b>${esc(a.ing.displayEn)}</b>`).join(', ')}`]; if (coli) whyEn.push('Coliform negative — meets its MFDS notified standard'); whyEn.push(`Made by ${esc(seed.manufacturer)}`);

  // 원료별 기능성 (독립 블록) — canonical 문구, 원문 보존.
  const fnKo = ings.map((a) => `<li><b>${esc(a.ing.displayKo)}</b><ul class="sd-why">${li(a.funcs.map((k) => esc(FN[k].ko)))}</ul></li>`).join('');
  const fnEn = ings.map((a) => `<li><b>${esc(a.ing.displayEn)}</b><ul class="sd-why">${li(a.funcs.map((k) => esc(FN[k].en)))}</ul></li>`).join('');

  const chipsKo = [`<span class="sd-tag">${dayKo}</span>`]; if (perServeKo) chipsKo.push(`<span class="sd-tag">1회 ${perServeKo}</span>`); if (waterInSource) chipsKo.push('<span class="sd-tag">물과 함께</span>');
  const chipsEn = [`<span class="sd-tag">${dayEn}</span>`]; if (perServeEn) chipsEn.push(`<span class="sd-tag">${perServeEn} per serving</span>`); if (waterInSource) chipsEn.push('<span class="sd-tag">With water</span>');
  const specKo: string[] = []; if (app) specKo.push(`<div class="sd-item"><b>성상</b> ${esc(app)}</div>`); if (coli) specKo.push('<div class="sd-item"><b>대장균군</b> 음성</div>'); if (shelf) specKo.push(`<div class="sd-item"><b>유통기한</b> ${esc(shelf)}</div>`); if (storage) specKo.push(`<div class="sd-item"><b>보관</b> ${esc(storage)}</div>`);
  const specEn: string[] = []; if (app) specEn.push(`<div class="sd-item"><b>Appearance</b> ${esc(app)}</div>`); if (coli) specEn.push('<div class="sd-item"><b>Coliform</b> Negative</div>'); if (shelf) specEn.push(`<div class="sd-item"><b>Shelf life</b> ${esc(shelf)}</div>`); if (storage) specEn.push(`<div class="sd-item"><b>Storage</b> ${esc(storage)}</div>`);
  const whoKo = [`매일 ${titleKo} 섭취를 함께 챙기고 싶은 분`, `${ct.ko} 형태를 선호하는 분`]; if (!isSingle) whoKo.push('여러 원료를 간편하게 함께 관리하고 싶은 분');
  const whoEn = [`Those who want to take ${titleEn} daily`, `Those who prefer ${ct.en}s`]; if (!isSingle) whoEn.push('Those who want a convenient way to manage multiple ingredients');

  const fnHeadingKo = isSingle ? '공식 인정 기능성' : '원료별 공식 인정 기능성';
  const fnHeadingEn = isSingle ? 'Officially recognised functions' : 'Officially recognised functions by ingredient';
  const ko = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeKo}</div>
  <h1>${esc(seed.productName)}<small>${esc(titleKo)}</small></h1><p class="sd-meta">${metaKo}</p></div>
  <div class="sd-body"><p class="sd-intro">${introKo}</p>
  <h2>왜 이 제품인가</h2><ul class="sd-why">${li(whyKo)}</ul>
  <h2>${fnHeadingKo}</h2><ul class="sd-func">${fnKo}</ul>
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${chipsKo.join('')}</span></div>${specKo.length ? `
  <h2>표시 기준</h2><div class="sd-spec">${specKo.join('')}</div>` : ''}
  <h2>이런 분께</h2><ul class="sd-who">${li(whoKo)}</ul></div><div class="sd-foot"><b>섭취 시 주의사항</b> · ${caut.ko.join(' · ')}</div></div>`;
  const en = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeEn}</div>
  <h1>${esc(seed.productName)}<small>${esc(titleEn)}</small></h1><p class="sd-meta">${metaEn}</p></div>
  <div class="sd-body"><p class="sd-intro">${introEn}</p>
  <h2>Why this product</h2><ul class="sd-why">${li(whyEn)}</ul>
  <h2>${fnHeadingEn}</h2><ul class="sd-func">${fnEn}</ul>
  <h2>Directions (exactly as officially stated)</h2><div class="sd-intake"><span class="sd-chips">${chipsEn.join('')}</span></div>${specEn.length ? `
  <h2>Labelled standard</h2><div class="sd-spec">${specEn.join('')}</div>` : ''}
  <h2>Who it suits</h2><ul class="sd-who">${li(whoEn)}</ul></div><div class="sd-foot"><b>Precautions</b> · ${caut.en.join(' · ')}</div></div>`;
  return { ko, en };
}

// A 전용 combo guard: 원료 카드 수 ko=en=N · 원료별 기능성 ko=en 개수 · 기능성 문구 draft 포함 · 원료 키 중복 0.
function comboAGuard(seed: ComboSeed, ko: string, en: string): string[] {
  const out: string[] = []; const n = seed.ings.length;
  const koCards = (ko.match(/<li><b>[^<]+<\/b><ul class="sd-why">/g) || []).length;
  const enCards = (en.match(/<li><b>[^<]+<\/b><ul class="sd-why">/g) || []).length;
  if (koCards !== n || enCards !== n) out.push(`G-A-CARD-COUNT: n${n}/ko${koCards}/en${enCards}`);
  for (const a of seed.ings) {
    if (!a.funcs.length) out.push(`G-A-FUNC-EMPTY:${a.ing.key}`);
    for (const k of a.funcs) { if (!ko.includes(esc(FN[k].ko))) out.push(`G-A-KO-MISSING:${a.ing.key}:${k}`); if (!en.includes(esc(FN[k].en))) out.push(`G-A-EN-MISSING:${a.ing.key}:${k}`); }
  }
  const keys = seed.ings.map((a) => a.ing.key);
  if (new Set(keys).size !== keys.length) out.push(`G-A-DUP:${keys.join(',')}`);
  return out;
}

const arg = (nm: string, d = ''): string => { const i = process.argv.indexOf(`--${nm}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out'); if (!OUTDIR) throw new Error('--out <dir> 필요');
const SINGLE = process.argv.includes('--single');            // N==1 (뮤코다당 등 singleAllowed) 포함
const INCLUDE_LIQUID = process.argv.includes('--include-liquid');
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5442', 10);
fs.mkdirSync(OUTDIR, { recursive: true });

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));

    // A 원료 마커 OR 조건으로 broad fetch (관절·피부 기능성 원료 이름/지표 등장 후보).
    const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; maker: string; sungsang: string; srv: string; fn: string; base: string; shelf: string; storage: string; caution: string }> = await ds.query(
      `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
         coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'ENTRPS','') maker,
         coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang, coalesce(raw_payload->'source'->>'SRV_USE','') srv,
         coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, coalesce(raw_payload->'source'->>'BASE_STANDARD','') base,
         coalesce(raw_payload->'source'->>'DISTB_PD','') shelf, coalesce(raw_payload->'source'->>'PRSRV_PD','') storage,
         coalesce(raw_payload->'source'->>'INTAKE_HINT1','') caution
       FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
         AND coalesce(raw_payload->'source'->>'BASE_STANDARD','') ~ '뮤코다당|점액다당|글루코사민|MSM|엠에스엠|메틸설포닐|디메틸설폰|히알루[론룬]산|하이알루론|세라마이드|보스웰|유니베스틴|콜라겐|엘라스틴'`);

    const funnel = { scanned: rows.length, aPresent2plus: 0, single: 0, mixedNonA: 0, unlabeledMulti: 0, unresolvedLabel: 0, noFuncMatch: 0, liquidHeld: 0, promoted: 0, taken: 0, dup: 0, servingHold: 0, composeHold: 0, guardBlock: 0, guardReview: 0, comboGuardFail: 0, target: 0 };
    const target: unknown[] = []; const pool: unknown[] = []; const hold: unknown[] = [];
    const seen = new Set<string>(); const distSig: Record<string, number> = {};

    for (const r of rows) {
      const base = r.base || ''; const mf = r.fn || '';
      // 1) BASE 에 존재하는 A 기능성 원료
      const present = A_INGREDIENTS.filter((a) => a.mark.test(base));
      if (!present.length) continue;
      // 2) 비-A 기능성 원료 선언 → 혼합형 HOLD
      if (NONA_FUNC.test(mf) || NONA_FUNC.test(base)) { hold.push({ stmt: r.stmt, name: r.name.trim(), reason: 'MIXED_NONA' }); funnel.mixedNonA++; continue; }
      const n = present.length;
      if (n === 1 && !(SINGLE && present[0].singleAllowed)) { funnel.single++; continue; }
      if (n >= 2) funnel.aPresent2plus++;

      // 3) 원료별 기능성 귀속
      const blocks = parseLabelBlocks(mf);
      const assigned: Assigned[] = [];
      let attrFail = '';
      if (n === 1) {
        const a = present[0];
        const fk = a.funcs.filter((k) => FN[k].re.test(mf));
        if (!fk.length) { attrFail = 'NO_FUNC_MATCH'; } else assigned.push({ ing: a, funcs: fk });
      } else if (blocks.length >= n && present.every((a) => blocks.some((b) => a.labelRe.test(b.label)))) {
        // 라벨 완전 해소: 원료별 라벨 블록에서만 기능성 귀속(정밀·무모호).
        for (const a of present) {
          const blk = blocks.find((b) => a.labelRe.test(b.label))!;
          const fk = a.funcs.filter((k) => FN[k].re.test(blk.text));
          if (!fk.length) { attrFail = `NO_FUNC_IN_LABEL:${a.key}`; break; }
          assigned.push({ ing: a, funcs: fk });
        }
      } else if (present.every((a) => a.funcs.length === 1)) {
        // 무라벨/부분라벨 다원료라도 모든 원료가 단일-기능성이면 귀속 무모호(각 원료의 유일 공식 기능성).
        // 각 원료의 유일 기능성이 MAIN_FNCTN 에 실제 선언되어야 함(grounding). 다기능 원료(NAG/HA/콜라겐)가 있으면 HOLD.
        for (const a of present) {
          const k = a.funcs[0];
          if (!FN[k].re.test(mf)) { attrFail = `NO_FUNC_MATCH:${a.key}`; break; }
          assigned.push({ ing: a, funcs: [k] });
        }
      } else {
        attrFail = 'UNLABELED_MULTI';
      }
      if (attrFail) {
        if (attrFail === 'UNLABELED_MULTI') funnel.unlabeledMulti++;
        else if (attrFail.startsWith('UNRESOLVED')) funnel.unresolvedLabel++;
        else funnel.noFuncMatch++;
        hold.push({ stmt: r.stmt, name: r.name.trim(), reason: attrFail, present: present.map((p) => p.key) }); continue;
      }

      // 4) 액상/승격/선점/중복
      const stmt = String(r.stmt).trim(); if (!stmt || seen.has(stmt)) { funnel.dup++; continue; }
      const isLiq = LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`);
      if (isLiq && !INCLUDE_LIQUID) { hold.push({ stmt, name: r.name.trim(), reason: 'LIQUID' }); funnel.liquidHeld++; continue; }
      seen.add(stmt);
      if (r.mid != null) { hold.push({ stmt, name: r.name.trim(), reason: 'ALREADY_PROMOTED' }); funnel.promoted++; continue; }
      if (taken.has(stmt)) { hold.push({ stmt, name: r.name.trim(), reason: 'TAKEN' }); funnel.taken++; continue; }

      const seed: ComboSeed = { statementNo: stmt, candidateId: r.id, productName: r.name.trim(), manufacturer: r.maker.trim(), ings: assigned,
        source: { mainFunction: mf.trim(), baseStandard: base.trim(), intake: r.srv.trim(), dosageForm: r.sungsang.trim(), shelfLife: r.shelf.trim(), storage: r.storage.trim(), caution: r.caution.trim() },
        serving: { unitType: null, unitsPerServing: null, servingsPerDay: null } };
      const c = composeComboA(seed);
      if ('error' in c) { hold.push({ stmt, name: r.name.trim(), reason: `COMPOSE_${c.error}` }); funnel.composeHold++; continue; }
      const cg = comboAGuard(seed, c.ko, c.en);
      if (cg.length) { hold.push({ stmt, name: r.name.trim(), reason: `COMBOGUARD:${cg.join('|')}` }); funnel.comboGuardFail++; continue; }

      const gi = { candidateId: r.id, productName: seed.productName, productNameEn: seed.productName, manufacturer: seed.manufacturer, manufacturerEn: null, statementNo: stmt, category: 'hff',
        source: { mainFunction: seed.source.mainFunction, baseStandard: seed.source.baseStandard, intake: seed.source.intake, caution: seed.source.caution, dosageForm: seed.source.dosageForm, storage: seed.source.storage, shelfLife: seed.source.shelfLife },
        grounding: { declaredAmount: null, serving: null, calculationAllowed: false, ageBandsRaw: null }, drafts: { ko: c.ko, en: c.en } };
      const g = runGuard(gi as never, { phase: 'all' });
      const blocked = g.findings.filter((f) => f.status === 'BLOCKED');
      if (blocked.length) { funnel.guardBlock++; hold.push({ stmt, name: r.name.trim(), reason: `GUARD_BLOCKED:${blocked.map((f) => f.ruleId).join(',')}` }); continue; }
      if (g.overallStatus === 'REVIEW_REQUIRED') { funnel.guardReview++; hold.push({ stmt, name: r.name.trim(), reason: `GUARD_REVIEW:${g.findings.filter((f) => f.status === 'REVIEW_REQUIRED').map((f) => f.ruleId).join(',')}` }); continue; }

      const sig = assigned.map((a) => a.ing.key).sort().join('+');
      distSig[sig] = (distSig[sig] ?? 0) + 1;
      target.push(gi); pool.push({ stmt, name: seed.productName, sig, funcs: assigned.map((a) => `${a.ing.key}:${a.funcs.join(',')}`) });
      funnel.target++;
    }

    const w = (nm: string, d: unknown): void => fs.writeFileSync(path.join(OUTDIR, `combo-a-${nm}.json`), JSON.stringify(d, null, 1));
    w('target', target); w('pool', pool); w('hold', hold);
    w('selfcheck', { funnel, distSig, targetStmts: (pool as Array<{ stmt: string }>).map((p) => p.stmt) });
    console.log('JSON_A_COMBO_BEGIN');
    console.log(JSON.stringify({ funnel, distSig, targetTotal: target.length, holdTotal: hold.length }, null, 2));
    console.log('JSON_A_COMBO_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
