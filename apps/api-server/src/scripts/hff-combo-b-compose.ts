/**
 * Agent B 소유 사본 — 공용 `hff-combo-compose.ts` 와 **두 곳만 다르다**.
 *   (1) `meta()` 가 B additive registry(`hff-b-ingredient-registry.ts`)까지 조회
 *   (2) `runComboGuard` 의 `SRC_LABEL` 에 B 원료의 원문 지표성분 라벨 추가
 * 그 외 문안·가드 규칙·HTML 구조는 공용과 byte-equivalent 하게 유지한다(공용 파일은 수정 금지).
 *
 * HFF M2/M3 복합형 매장 설명서 — 결정적 grounded 다중원료 composer + G-MULTI 가드
 *
 * WO-...-LARGE-FUNCTION-GROUPS-...-V1 PART B §1~§3
 * 원료별 표시량·기능성을 **독립 카드**로 렌더(수치·기능성 혼입 0). ko/en 원료 순서·개수 동일.
 * 편익 매핑·물·per-unit 미생성은 단일 라인과 동일 원칙.
 */
import { bMeta, B_SRC_LABEL } from './hff-b-ingredient-registry.js';

export interface ComboIngredient {
  key: string; labelKo: string; labelEn: string;
  declaredAmount: { value: number; unit: string; basisAmount: number; basisUnit: string; ratio: string };
  functionsKo: string[]; functionsEn: string[];
}
export interface ComboSeed {
  statementNo: string; productName: string; manufacturer: string;
  ingredients: ComboIngredient[];
  source: { mainFunction: string; baseStandard: string; intake: string; caution: string; dosageForm: string; storage: string; shelfLife: string };
  serving: { unitType: string; servingUnitKo: string | null; unitsPerServing: number | null; servingsPerDay: number | null };
  compose: { hasColiform: boolean; directGrounded: boolean };
  flags: { waterInSource: boolean; chew: boolean; melt: boolean };
}

const esc = (s: string): string => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const PROMO = /안심하고|(?<![가-힣])순한|입문용|처음\s*시작|이제\s*막\s*챙|살아남|효과가\s*좋|휴대\s*가?\s*(편|간편)|부담\s*이?\s*(적|없)|프리미엄|고품질|믿고/;
function sanitizeOfficial(raw: string): string {
  const s = (raw ?? '').replace(/\s+/g, ' ').trim(); if (!s) return '';
  const parts = s.split(/(?<=[.。])\s+|(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫])/).map((x) => x.trim()).filter(Boolean);
  return parts.filter((p) => !PROMO.test(p)).join(' ').replace(/\s+/g, ' ').trim();
}
function cautionKo(raw: string): string {
  const s = (raw ?? '').replace(/\s+/g, ' '); const out: string[] = [];
  if (/임산부|임신|수유/.test(s)) out.push('임산부·수유부는 섭취 전 전문가와 상담');
  if (/고칼슘혈증/.test(s)) out.push('고칼슘혈증이 있거나 의약품 복용 시 전문가와 상담');
  else if (/의약품|질환|질병|치료/.test(s)) out.push('질환이 있거나 의약품 복용 시 전문가와 상담');
  if (/알레르기|알러지|과민/.test(s)) out.push('알레르기 체질 등은 개인에 따라 과민반응 가능');
  if (/이상사례|이상반응|부작용|중단/.test(s)) out.push('이상사례 발생 시 섭취를 중단하고 전문가와 상담');
  if (/어린이|소아/.test(s)) out.push('어린이 손이 닿지 않는 곳에 보관');
  if (!out.length) out.push('섭취 전 제품 표시사항을 확인');
  out.push('자세한 주의사항은 제품 표시사항을 확인하십시오'); return out.join(' · ');
}
function cautionEn(raw: string): string {
  const s = (raw ?? '').replace(/\s+/g, ' '); const out: string[] = [];
  if (/임산부|임신|수유/.test(s)) out.push('Pregnant or breastfeeding women should consult a professional before use');
  if (/고칼슘혈증/.test(s)) out.push('Consult a professional if you have hypercalcaemia or take medication');
  else if (/의약품|질환|질병|치료/.test(s)) out.push('Consult a professional if you have a condition or take medication');
  if (/알레르기|알러지|과민/.test(s)) out.push('Allergic reactions may occur in sensitive individuals');
  if (/이상사례|이상반응|부작용|중단/.test(s)) out.push('Stop use and consult a professional if adverse effects occur');
  if (/어린이|소아/.test(s)) out.push('Keep out of reach of children');
  out.push('Refer to the official cautions printed on the product'); return out.join(' · ');
}
const meta = (k: string) => { const m = bMeta(k); if (!m) throw new Error(`meta 미등록 원료 키: ${k}`); return m; };
function amtStr(a: ComboIngredient['declaredAmount']): string { return `${a.value}${a.unit === 'IU' ? ' IU' : a.unit}`; }
function counterKo(s: ComboSeed): string { const r = s.serving.servingUnitKo; if (r) return r === '캅셀' ? '캡슐' : r; const t = s.serving.unitType; return t === 'softgel' || t === 'capsule' ? '캡슐' : t === 'gummy' ? '젤리' : t === 'film' ? '매' : t === 'powder' ? '포' : '정'; }
function counterEn(s: ComboSeed): string { const t = s.serving.unitType, ko = s.serving.servingUnitKo; if (ko === '포' || ko === '스틱' || t === 'powder') return 'sachet'; if (t === 'gummy' || ko === '젤리') return 'gummy'; if (t === 'film' || ko === '매') return 'film'; if (t === 'softgel' || t === 'capsule' || ko === '캡슐' || ko === '캅셀') return 'capsule'; return 'tablet'; }
function methodChip(s: ComboSeed): { ko: string | null; en: string | null } {
  if (s.flags.waterInSource) return { ko: '물과 함께', en: 'With water' };
  if (s.flags.chew) return { ko: '씹어 섭취', en: 'Chew to take' };
  if (s.compose.directGrounded) return { ko: '그대로 섭취', en: 'Take as is' };
  if (s.flags.melt) return { ko: '녹여 섭취', en: 'Let it dissolve' };
  return { ko: null, en: null };
}

export interface Composed { ko: string; en: string }
export function composeCombo(seed: ComboSeed): Composed {
  const ings = seed.ingredients;
  const ck = counterKo(seed), ce = counterEn(seed);
  const ups = seed.serving.unitsPerServing, sd = seed.serving.servingsPerDay ?? 1;
  const perServeKo = ups != null ? `${ups}${ck}` : null, perServeEn = ups != null ? `${ups} ${ce}${ups > 1 ? 's' : ''}` : null;
  const dayKo = `1일 ${sd}회`, dayEn = sd === 1 ? 'Once a day' : `${sd} times a day`;
  const chip = methodChip(seed); const t = seed.serving.unitType; const coliform = seed.compose.hasColiform;
  const formKoName = t === 'softgel' ? '연질캡슐' : t === 'capsule' ? '캡슐' : t === 'chewable' ? '츄어블정' : t === 'gummy' ? '젤리' : t === 'film' ? '필름' : t === 'powder' ? '분말' : '정제';
  const dosage = sanitizeOfficial(seed.source.dosageForm) || formKoName;
  const storage = sanitizeOfficial(seed.source.storage), shelfLife = sanitizeOfficial(seed.source.shelfLife);
  const li = (a: string[]) => a.map((x) => `<li>${x}</li>`).join('');

  const badgeKo = `<span class="sd-badge">건강기능식품</span>` + ings.map((g) => `<span class="sd-badge is-solid">${esc(meta(g.key).displayKo)} ${amtStr(g.declaredAmount)}</span>`).join('') + `<span class="sd-badge">${dayKo}</span>`;
  const badgeEn = `<span class="sd-badge">Health Functional Food</span>` + ings.map((g) => `<span class="sd-badge is-solid">${esc(meta(g.key).displayEn)} ${amtStr(g.declaredAmount)}</span>`).join('') + `<span class="sd-badge">${dayEn}</span>`;
  const titleKo = ings.map((g) => meta(g.key).displayKo).join(' · '), titleEn = ings.map((g) => meta(g.key).displayEn).join(' · ');

  const introKo = `이 제품은 ${ings.map((g) => `${esc(meta(g.key).displayKo)} <b>${amtStr(g.declaredAmount)}</b>`).join(', ')}를 표시량으로 담은 ${ings.length}원료 복합 건강기능식품입니다. 각 원료의 공식 인정 기능성은 아래와 같습니다.`;
  const introEn = `This product combines ${ings.map((g) => `<b>${amtStr(g.declaredAmount)}</b> of ${esc(meta(g.key).displayEn)}`).join(', ')} as labelled amounts. The officially recognised functions of each are listed below.`;

  const whyKo = [`${dayKo}${perServeKo ? `(${perServeKo})` : ''} 섭취로 ${ings.map((g) => `${esc(meta(g.key).displayKo)} <b>${amtStr(g.declaredAmount)}</b>`).join(', ')}`];
  if (coliform) whyKo.push('대장균군 음성 — 식약처 신고 기준 적합');
  whyKo.push(`${esc(dosage)} · ${esc(seed.manufacturer)} 제조`);
  const whyEn = [`${dayEn}${perServeEn ? ` (${perServeEn})` : ''}: ${ings.map((g) => `<b>${amtStr(g.declaredAmount)}</b> ${esc(meta(g.key).displayEn)}`).join(', ')}`];
  if (coliform) whyEn.push('Coliform negative — meets its MFDS notified standard');
  whyEn.push(`Made by ${esc(seed.manufacturer)}`);

  // 원료별 기능성 (독립 블록)
  const fnKo = ings.map((g) => `<li><b>${esc(meta(g.key).displayKo)}</b><ul class="sd-why">${li(g.functionsKo.map(esc))}</ul></li>`).join('');
  const fnEn = ings.map((g) => `<li><b>${esc(meta(g.key).displayEn)}</b><ul class="sd-why">${li(g.functionsEn.map(esc))}</ul></li>`).join('');

  const chipsKo = [`<span class="sd-tag">${dayKo}</span>`]; if (perServeKo) chipsKo.push(`<span class="sd-tag">1회 ${perServeKo}</span>`); if (chip.ko) chipsKo.push(`<span class="sd-tag">${chip.ko}</span>`);
  const chipsEn = [`<span class="sd-tag">${dayEn}</span>`]; if (perServeEn) chipsEn.push(`<span class="sd-tag">${perServeEn} per serving</span>`); if (chip.en) chipsEn.push(`<span class="sd-tag">${chip.en}</span>`);

  const specKo = ings.map((g) => `<div class="sd-item"><b>${esc(meta(g.key).displayKo)}</b> 표시량(${amtStr(g.declaredAmount)}/${g.declaredAmount.basisAmount}${g.declaredAmount.basisUnit})의 ${g.declaredAmount.ratio}</div>`);
  specKo.push(`<div class="sd-item"><b>성상</b> ${esc(dosage)}</div>`);
  if (coliform) specKo.push('<div class="sd-item"><b>대장균군</b> 음성</div>');
  if (shelfLife) specKo.push(`<div class="sd-item"><b>유통기한</b> ${esc(shelfLife)}</div>`);
  if (storage) specKo.push(`<div class="sd-item"><b>보관</b> ${esc(storage)}</div>`);
  const specEn = ings.map((g) => `<div class="sd-item"><b>${esc(meta(g.key).displayEn)}</b> labelled (${amtStr(g.declaredAmount)} / ${g.declaredAmount.basisAmount}${g.declaredAmount.basisUnit}), ${g.declaredAmount.ratio}</div>`);
  specEn.push(`<div class="sd-item"><b>Appearance</b> ${esc(dosage)}</div>`);
  if (coliform) specEn.push('<div class="sd-item"><b>Coliform</b> Negative</div>');
  if (shelfLife) specEn.push(`<div class="sd-item"><b>Shelf life</b> ${esc(shelfLife)}</div>`);
  if (storage) specEn.push(`<div class="sd-item"><b>Storage</b> ${esc(storage)}</div>`);

  const whoKo = [`매일 ${titleKo} 섭취를 함께 챙기고 싶은 분`, `${formKoName} 형태를 선호하는 분`, '간편하게 여러 영양을 함께 관리하고 싶은 분'];
  const whoEn = [`Those who want to take ${titleEn} together daily`, 'Those who prefer this form', 'Those who want a convenient way to manage multiple nutrients'];

  const ko = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeKo}</div>
  <h1>${esc(seed.productName)}<small>${esc(titleKo)}</small></h1><p class="sd-meta">${esc(seed.manufacturer)} 제조 · ${dayKo}${perServeKo ? ` ${perServeKo}` : ''}</p></div>
  <div class="sd-body"><p class="sd-intro">${introKo}</p>
  <h2>왜 이 제품인가</h2><ul class="sd-why">${li(whyKo)}</ul>
  <h2>원료별 공식 인정 기능성</h2><ul class="sd-func">${fnKo}</ul>
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${chipsKo.join('')}</span></div>
  <h2>표시 기준</h2><div class="sd-spec">${specKo.join('')}</div>
  <h2>이런 분께</h2><ul class="sd-who">${li(whoKo)}</ul></div><div class="sd-foot"><b>섭취 시 주의사항</b> · ${esc(cautionKo(seed.source.caution))}</div></div>`;
  const en = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeEn}</div>
  <h1>${esc(seed.productName)}<small>${esc(titleEn)}</small></h1><p class="sd-meta">Made by ${esc(seed.manufacturer)} · ${dayEn}${perServeEn ? ` · ${perServeEn}` : ''}</p></div>
  <div class="sd-body"><p class="sd-intro">${introEn}</p>
  <h2>Why this product</h2><ul class="sd-why">${li(whyEn)}</ul>
  <h2>Officially recognised functions by ingredient</h2><ul class="sd-func">${fnEn}</ul>
  <h2>Directions (exactly as officially stated)</h2><div class="sd-intake"><span class="sd-chips">${chipsEn.join('')}</span></div>
  <h2>Labelled standard</h2><div class="sd-spec">${specEn.join('')}</div>
  <h2>Who it suits</h2><ul class="sd-who">${li(whoEn)}</ul></div><div class="sd-foot"><b>Precautions</b> · ${esc(cautionEn(seed.source.caution))}</div></div>`;
  return { ko, en };
}

// ─── G-MULTI 가드 ───────────────────────────────────────────────────────────
export interface MultiFinding { rule: string; status: 'BLOCKED'; message: string }
export function runComboGuard(seed: ComboSeed, ko: string, en: string): MultiFinding[] {
  const out: MultiFinding[] = [];
  const n = seed.ingredients.length;
  const koText = ko.replace(/<[^>]+>/g, ' '), enText = en.replace(/<[^>]+>/g, ' ');
  // G-MULTI-INGREDIENT-COUNT: grounding=ko=en 원료 카드 수
  const koCards = (ko.match(/<li><b>[^<]+<\/b><ul class="sd-why">/g) || []).length;
  const enCards = (en.match(/<li><b>[^<]+<\/b><ul class="sd-why">/g) || []).length;
  if (koCards !== n || enCards !== n) out.push({ rule: 'G-MULTI-INGREDIENT-COUNT', status: 'BLOCKED', message: `원료 카드 수 불일치: grounding ${n} / ko ${koCards} / en ${enCards}` });
  // G-MULTI-FUNCTION-COVERAGE + G-MULTI-BILINGUAL(개수): 원료별 ko/en 기능성 개수 동일
  for (const g of seed.ingredients) {
    if (g.functionsKo.length !== g.functionsEn.length) out.push({ rule: 'G-MULTI-BILINGUAL', status: 'BLOCKED', message: `${g.key} ko/en 기능성 개수 불일치 ${g.functionsKo.length}/${g.functionsEn.length}` });
    if (g.functionsKo.length === 0) out.push({ rule: 'G-MULTI-FUNCTION-COVERAGE', status: 'BLOCKED', message: `${g.key} 기능성 0` });
    for (const f of g.functionsKo) if (!koText.includes(f)) out.push({ rule: 'G-MULTI-FUNCTION-COVERAGE', status: 'BLOCKED', message: `${g.key} 기능성 ko 누락: ${f.slice(0, 20)}` });
  }
  // G-MULTI-AMOUNT/BASIS-PAIRING: 각 원료 표시량 행이 자기 라벨과 함께, 정확히 자기 수치
  for (const g of seed.ingredients) {
    const lk = meta(g.key).displayKo, amt = amtStr(g.declaredAmount), basis = `${g.declaredAmount.basisAmount}${g.declaredAmount.basisUnit}`;
    const row = new RegExp(`<b>${lk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</b> 표시량\\(${amt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/${basis.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`);
    if (!row.test(ko)) out.push({ rule: 'G-MULTI-AMOUNT-PAIRING', status: 'BLOCKED', message: `${g.key} 표시량 행 미검출/수치 혼입: ${amt}/${basis}` });
  }
  // G-MULTI-AMOUNT-SOURCE: 각 원료 표시량이 BASE_STANDARD 에서 **자기 라벨**에 귀속되는가 (원료간 수치 이동 검출)
  const SRC_LABEL: Record<string, RegExp> = {
    '비타민D': /비타민\s?D/i, '비타민C': /비타민\s?C/i, '비타민A': /비타민\s?A\b|레티놀|베타카로/i, '비타민E': /비타민\s?E|토코페롤/i, '비타민K': /비타민\s?K/i,
    '비타민B1': /비타민\s?B\s?1\b|티아민/i, '비타민B2': /비타민\s?B\s?2|리보플라빈/i, '비타민B6': /비타민\s?B\s?6|피리독/i, '비타민B12': /비타민\s?B\s?12/i,
    '아연': /아연/i, '마그네슘': /마그네슘/i, '칼슘': /칼슘/i, '철': /철분|헴철|철\s*[:：(]|피로인산철/i, '셀레늄': /셀레늄|셀렌/i, '엽산': /엽산/i,
    '나이아신': /나이아신|니아신|니코틴/i, '판토텐산': /판토텐/i, '비오틴': /비오틴/i, '구리': /구리/i, '망간': /망간/i, '요오드': /요오드/i,
    'MSM': /MSM|엠에스엠|메틸설포닐|디메틸설폰/i, '글루코사민': /글루코사민/i, '루테인': /루테인|지아잔틴/i, '밀크씨슬': /실리마린|밀크씨슬/i,
    '코엔자임Q10': /코엔자임|코큐텐|Q10/i, '식이섬유': /식이섬유|차전자|난소화성/i, '옥타코사놀': /옥타코사놀/i,
    '오메가3': /EPA|DHA|정제어유/i, '가르시니아': /가르시니아|HCA|hydroxycitric|히드록시시트르/i, '녹차': /녹차|카테킨/i,
    '감마리놀렌산': /감마리놀렌/i, '프로폴리스': /프로폴리스|총\s*플라보노이드/i, '은행잎': /은행잎|플라보놀\s*배당체/i, '테아닌': /테아닌/i,
    ...B_SRC_LABEL, // B additive 원료의 원문 지표성분 라벨
  };
  // 천단위 구분 콤마(숫자 사이 콤마)만 제거 — declaredAmount.value 는 콤마 제거 정수라 "1500" vs 원문 "1,500" 오탐 방지.
  // list 콤마 등 비수치 콤마는 불변. 수치 이동 탐지 로직은 유지(값이 자기 라벨 구간에 없으면 여전히 BLOCKED).
  const srcNorm = (seed.source.baseStandard || '').replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)).replace(/㎎/g, 'mg').replace(/(?<=\d),(?=\d)/g, '').replace(/\s+/g, ' ');
  if (srcNorm) {
    // 모든 원료 라벨 위치 → 각 원료 window = [자기 라벨, 다음 라벨)
    const marks = seed.ingredients.map((g) => { const re = SRC_LABEL[g.key]; const m = re ? re.exec(srcNorm) : null; return { key: g.key, idx: m ? m.index : -1 }; });
    const positions = marks.filter((m) => m.idx >= 0).map((m) => m.idx).sort((a, b) => a - b);
    for (const g of seed.ingredients) {
      const mk = marks.find((m) => m.key === g.key)!;
      if (mk.idx < 0) { out.push({ rule: 'G-MULTI-AMOUNT-SOURCE', status: 'BLOCKED', message: `${g.key} 라벨 원문 미검출` }); continue; }
      const next = positions.find((p) => p > mk.idx) ?? srcNorm.length;
      const win = srcNorm.slice(mk.idx, Math.min(next, mk.idx + 80));
      const vStr = String(g.declaredAmount.value);
      if (!win.includes(vStr)) out.push({ rule: 'G-MULTI-AMOUNT-SOURCE', status: 'BLOCKED', message: `${g.key} 표시량 ${vStr} 이 원문 라벨 구간에 없음(수치 이동 의심)` });
    }
  }
  // G-MULTI-DUPLICATE: 원료 키 중복
  const keys = seed.ingredients.map((g) => g.key);
  if (new Set(keys).size !== keys.length) out.push({ rule: 'G-MULTI-DUPLICATE', status: 'BLOCKED', message: `원료 키 중복: ${keys.join(',')}` });
  // G-MULTI-BILINGUAL 순서: ko/en 원료 **기능성 카드** 순서가 seed 순서와 동일한가.
  // ⚠️ 원료명 raw indexOf 금지 — "칼슘"이 비타민 D 기능성("칼슘과 인이 흡수…")에 등장해 오탐(실측: mg+vd+ca).
  //    카드 마커(<li><b>라벨</b><ul class="sd-why">)로 위치를 잡는다.
  const cardPos = (html: string, label: string) => html.indexOf(`<li><b>${label}</b><ul class="sd-why">`);
  const koIdx = seed.ingredients.map((g) => cardPos(ko, meta(g.key).displayKo));
  const enIdx = seed.ingredients.map((g) => cardPos(en, meta(g.key).displayEn));
  const asc = (a: number[]) => a.every((v, i) => i === 0 || (v > a[i - 1] && v >= 0));
  if (!asc(koIdx) || !asc(enIdx)) out.push({ rule: 'G-MULTI-BILINGUAL', status: 'BLOCKED', message: `원료 카드 순서 ko/en seed 불일치 (ko ${JSON.stringify(koIdx)} en ${JSON.stringify(enIdx)})` });
  return out;
}

/** combo seed → GuardProductInput (단일 가드용, 대표 원료 grounding) */
export function toGuardInput(seed: ComboSeed, slug: string) {
  const { ko, en } = composeCombo(seed);
  const g0 = seed.ingredients[0];
  return {
    candidateId: slug, productName: seed.productName, productNameEn: seed.productName,
    manufacturer: seed.manufacturer, manufacturerEn: null, statementNo: seed.statementNo, category: 'hff',
    source: { mainFunction: seed.source.mainFunction, baseStandard: seed.source.baseStandard, intake: seed.source.intake, caution: seed.source.caution, dosageForm: seed.source.dosageForm, storage: seed.source.storage, shelfLife: seed.source.shelfLife },
    grounding: { declaredAmount: { value: g0.declaredAmount.value, unit: g0.declaredAmount.unit, basisAmount: g0.declaredAmount.basisAmount, basisUnit: g0.declaredAmount.basisUnit }, serving: { unitType: seed.serving.unitType, unitWeight: null, unitWeightUnit: null, unitsPerServing: seed.serving.unitsPerServing, servingTotalWeight: null, servingTotalWeightUnit: null, servingsPerDay: seed.serving.servingsPerDay, servingsPerDayMax: null }, calculationAllowed: false, ageBandsRaw: null },
    drafts: { ko, en },
  };
}
