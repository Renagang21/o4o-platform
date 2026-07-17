/**
 * HFF 단일 영양소 매장 설명서 — 결정적 grounded composer (nutrient-parameterized)
 *
 * WO-O4O-HFF-SINGLE-NUTRIENT-CONTINUOUS-END-TO-END-PRODUCTION-V1
 * 비타민 D 라인(hff-vd-compose)의 검증된 sd-* 템플릿을 영양소 일반화. 기능성 ko=원문 추출·en=레지스트리.
 * 물(G-WATER)·per-unit 미생성(calc=false)·ko/en 수치 동치·기능성 강화 0 보장.
 */
import { NUTRIENT_META, FUNCTIONAL_META } from './hff-nutrient-registry.js';

export interface NSeed {
  statementNo: string; productName: string; manufacturer: string; nutrient: string;
  source: { mainFunction: string; baseStandard: string; intake: string; caution: string; dosageForm: string; storage: string; shelfLife: string };
  grounding: { declaredAmount: { value: number; unit: string; basisAmount: number; basisUnit: string }; serving: { unitType: string; unitsPerServing: number | null; servingsPerDay: number | null; servingsPerDayMax: number | null } & Record<string, unknown>; calculationAllowed: boolean; ageBandsRaw: string | null };
  functions: { ko: string[]; en: string[] };
  compose: { servingUnitKo: string | null; ratio: string; hasColiform: boolean; directGrounded: boolean };
  flags: { hasIU: boolean; riskReduction: boolean; waterInSource: boolean; chew: boolean; melt: boolean } & Record<string, unknown>;
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
  if (out.length === 0) out.push('섭취 전 제품 표시사항을 확인');
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

function counterKo(seed: NSeed): string {
  const raw = seed.compose.servingUnitKo; if (raw) return raw === '캅셀' ? '캡슐' : raw;
  const t = seed.grounding.serving.unitType;
  return t === 'softgel' || t === 'capsule' ? '캡슐' : t === 'gummy' ? '젤리' : t === 'film' ? '매' : t === 'powder' ? '포' : '정';
}
function counterEn(seed: NSeed): string {
  const t = seed.grounding.serving.unitType; const ko = seed.compose.servingUnitKo;
  if (ko === '병') return 'bottle'; if (ko === '스푼') return 'spoonful'; if (ko === '매' || t === 'film') return 'film';
  if (t === 'gummy' || ko === '젤리' || ko === '구미') return 'gummy'; if (ko === '포' || ko === '스틱' || ko === '스쿱' || t === 'powder') return 'sachet';
  if (t === 'softgel' || t === 'capsule' || ko === '캡슐' || ko === '캅셀') return 'capsule'; if (ko === '개' && t === 'chewable') return 'piece';
  return 'tablet';
}
function formPrefKo(t: string): string {
  return t === 'softgel' || t === 'capsule' ? '캡슐 형태를 선호하는 분' : t === 'chewable' ? '씹어 먹는 형태를 선호하는 분' : t === 'gummy' ? '젤리 형태를 선호하는 분' : t === 'powder' ? '간편한 분말 형태를 선호하는 분' : t === 'film' ? '필름 형태를 선호하는 분' : '정 형태를 선호하는 분';
}
function formPrefEn(t: string): string {
  return t === 'softgel' || t === 'capsule' ? 'Those who prefer capsules' : t === 'chewable' ? 'Those who prefer a chewable form' : t === 'gummy' ? 'Those who prefer gummies' : t === 'powder' ? 'Those who prefer a convenient powder form' : t === 'film' ? 'Those who prefer a film form' : 'Those who prefer tablets';
}
function methodChip(seed: NSeed): { ko: string | null; en: string | null } {
  if (seed.flags.waterInSource) return { ko: '물과 함께', en: 'With water' };
  if (seed.flags.chew) return { ko: '씹어 섭취', en: 'Chew to take' };
  if (seed.compose.directGrounded) return { ko: '그대로 섭취', en: 'Take as is' };
  if (seed.flags.melt) return { ko: '녹여 섭취', en: 'Let it dissolve' };
  return { ko: null, en: null };
}

export interface Composed { ko: string; en: string }

export function composeNutrient(seed: NSeed): Composed {
  const meta = NUTRIENT_META[seed.nutrient] ?? FUNCTIONAL_META[seed.nutrient];
  const nameKo = meta.displayKo, nameEn = meta.displayEn;
  const funcKind = meta.kind === 'functional';
  const fnHdrKo = funcKind ? `${nameKo} 기능성 (공식 인정)` : `${nameKo} 영양기능 (공식 인정 기능성)`;
  const fnHdrEn = funcKind ? `${nameEn} functional claims (officially recognised)` : `${nameEn} nutritional functions (officially recognised)`;
  const da = seed.grounding.declaredAmount;
  const amt = `${da.value}${da.unit === 'IU' ? ' IU' : da.unit}`;
  const basis = `${da.basisAmount}${da.basisUnit}`;
  const ck = counterKo(seed), ce = counterEn(seed);
  const ups = seed.grounding.serving.unitsPerServing; const sd = seed.grounding.serving.servingsPerDay ?? 1;
  const perServeKo = ups != null ? `${ups}${ck}` : null;
  const perServeEn = ups != null ? `${ups} ${ce}${ups > 1 ? 's' : ''}` : null;
  const chip = methodChip(seed); const t = seed.grounding.serving.unitType; const coliform = seed.compose.hasColiform;
  const formKoName = t === 'softgel' ? '연질캡슐' : t === 'capsule' ? '캡슐' : t === 'chewable' ? '츄어블정' : t === 'gummy' ? '젤리' : t === 'film' ? '필름' : t === 'powder' ? '분말' : '정제';
  const dosage = sanitizeOfficial(seed.source.dosageForm) || formKoName;
  const storage = sanitizeOfficial(seed.source.storage); const shelfLife = sanitizeOfficial(seed.source.shelfLife);
  const ckKo = cautionKo(seed.source.caution), ckEn = cautionEn(seed.source.caution);
  const dayKo = `1일 ${sd}회`; const dayEn = sd === 1 ? 'Once a day' : `${sd} times a day`;

  const introKo = (sd === 1 && perServeKo)
    ? `이 제품은 1일 섭취량(1회 · ${perServeKo})에 ${nameKo} <b>${amt}</b>를 표시량으로 담았습니다(표시 기준 ${basis}당). ${nameKo}의 ${funcKind ? '기능성' : '영양기능'}은 아래 공식 인정 범위와 같습니다.`
    : `이 제품은 ${nameKo} <b>${amt}</b>를 표시량으로 담았습니다(표시 기준 ${basis}당). ${nameKo}의 ${funcKind ? '기능성' : '영양기능'}은 아래 공식 인정 범위와 같습니다.`;
  const introEn = (sd === 1 && perServeEn)
    ? `One daily serving (once a day, ${perServeEn}) provides <b>${amt}</b> of labelled ${nameEn} (per ${basis} of product). Its officially recognised functions are listed below.`
    : `This product provides <b>${amt}</b> of labelled ${nameEn} (per ${basis} of product). Its officially recognised functions are listed below.`;

  const whyKo = [`${dayKo}${perServeKo ? `(${perServeKo})` : ''} 섭취로 ${nameKo} <b>${amt}</b>`];
  if (coliform) whyKo.push('대장균군 음성 — 식약처 신고 기준 적합');
  whyKo.push(`${esc(dosage)} · ${esc(seed.manufacturer)} 제조`);
  const whyEn = [`<b>${amt}</b> of ${nameEn}${perServeEn ? ` per serving (${perServeEn})` : ' per serving'}`];
  if (coliform) whyEn.push('Coliform negative — meets its MFDS notified standard');
  whyEn.push(`Made by ${esc(seed.manufacturer)}`);

  const chipsKo = [`<span class="sd-tag">${dayKo}</span>`]; if (perServeKo) chipsKo.push(`<span class="sd-tag">1회 ${perServeKo}</span>`); if (chip.ko) chipsKo.push(`<span class="sd-tag">${chip.ko}</span>`);
  const chipsEn = [`<span class="sd-tag">${dayEn}</span>`]; if (perServeEn) chipsEn.push(`<span class="sd-tag">${perServeEn} per serving</span>`); if (chip.en) chipsEn.push(`<span class="sd-tag">${chip.en}</span>`);

  const specKo = [`<div class="sd-item"><b>${nameKo}</b> 표시량(${amt}/${basis})의 ${seed.compose.ratio}</div>`, `<div class="sd-item"><b>성상</b> ${esc(dosage)}</div>`];
  if (coliform) specKo.push('<div class="sd-item"><b>대장균군</b> 음성</div>');
  if (shelfLife) specKo.push(`<div class="sd-item"><b>유통기한</b> ${esc(shelfLife)}</div>`);
  if (storage) specKo.push(`<div class="sd-item"><b>보관</b> ${esc(storage)}</div>`);
  const specEn = [`<div class="sd-item"><b>${nameEn}</b> labelled (${amt} / ${basis}), ${seed.compose.ratio}</div>`, `<div class="sd-item"><b>Appearance</b> ${esc(dosage)}</div>`];
  if (coliform) specEn.push('<div class="sd-item"><b>Coliform</b> Negative</div>');
  if (shelfLife) specEn.push(`<div class="sd-item"><b>Shelf life</b> ${esc(shelfLife)}</div>`);
  if (storage) specEn.push(`<div class="sd-item"><b>Storage</b> ${esc(storage)}</div>`);

  const whoKo = [`매일 ${nameKo} 섭취를 챙기고 싶은 분`, formPrefKo(t), '간편하게 영양 균형을 관리하고 싶은 분'];
  const whoEn = [`Those who take ${nameEn} daily`, formPrefEn(t), 'Those who want a convenient way to support their nutrition'];

  const li = (a: string[]) => a.map((x) => `<li>${x}</li>`).join('');
  const badgeKo = `<span class="sd-badge">건강기능식품</span><span class="sd-badge is-solid">${nameKo} ${amt}</span><span class="sd-badge">${dayKo}</span>`;
  const badgeEn = `<span class="sd-badge">Health Functional Food</span><span class="sd-badge is-solid">${nameEn} ${amt}</span><span class="sd-badge">${dayEn}</span>`;

  const ko = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeKo}</div>
  <h1>${esc(seed.productName)}<small>${nameKo}</small></h1><p class="sd-meta">${esc(seed.manufacturer)} 제조 · ${dayKo}${perServeKo ? ` ${perServeKo}` : ''}</p></div>
  <div class="sd-body"><p class="sd-intro">${introKo}</p>
  <h2>왜 이 제품인가</h2><ul class="sd-why">${li(whyKo)}</ul>
  <h2>${fnHdrKo}</h2><ul class="sd-why">${li(seed.functions.ko.map(esc))}</ul>
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${chipsKo.join('')}</span></div>
  <h2>표시 기준</h2><div class="sd-spec">${specKo.join('')}</div>
  <h2>이런 분께</h2><ul class="sd-who">${li(whoKo)}</ul></div><div class="sd-foot"><b>섭취 시 주의사항</b> · ${esc(ckKo)}</div></div>`;

  const en = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeEn}</div>
  <h1>${esc(seed.productName)}<small>${nameEn}</small></h1><p class="sd-meta">Made by ${esc(seed.manufacturer)} · ${dayEn}${perServeEn ? ` · ${perServeEn}` : ''}</p></div>
  <div class="sd-body"><p class="sd-intro">${introEn}</p>
  <h2>Why this product</h2><ul class="sd-why">${li(whyEn)}</ul>
  <h2>${fnHdrEn}</h2><ul class="sd-why">${li(seed.functions.en.map(esc))}</ul>
  <h2>Directions (exactly as officially stated)</h2><div class="sd-intake"><span class="sd-chips">${chipsEn.join('')}</span></div>
  <h2>Labelled standard</h2><div class="sd-spec">${specEn.join('')}</div>
  <h2>Who it suits</h2><ul class="sd-who">${li(whoEn)}</ul></div><div class="sd-foot"><b>Precautions</b> · ${esc(ckEn)}</div></div>`;

  return { ko, en };
}

export function toGuardInput(seed: NSeed, slug: string) {
  const { ko, en } = composeNutrient(seed);
  return {
    candidateId: slug, productName: seed.productName, productNameEn: seed.productName,
    manufacturer: seed.manufacturer, manufacturerEn: null, statementNo: seed.statementNo, category: 'hff',
    source: seed.source,
    grounding: { declaredAmount: seed.grounding.declaredAmount, serving: { unitType: seed.grounding.serving.unitType, unitWeight: null, unitWeightUnit: null, unitsPerServing: seed.grounding.serving.unitsPerServing, servingTotalWeight: (seed.grounding.serving as Record<string, unknown>).servingTotalWeight ?? null, servingTotalWeightUnit: (seed.grounding.serving as Record<string, unknown>).servingTotalWeightUnit ?? null, servingsPerDay: seed.grounding.serving.servingsPerDay, servingsPerDayMax: seed.grounding.serving.servingsPerDayMax ?? null }, calculationAllowed: false, ageBandsRaw: seed.grounding.ageBandsRaw },
    drafts: { ko, en },
  };
}
