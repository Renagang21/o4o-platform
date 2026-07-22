/**
 * HFF 프로바이오틱스 **고형 pure-single** — 결정적 grounded composer (LIVE 템플릿 재현).
 *
 * 기존 LIVE 드래프트(hff-probiotics-cp*.json)와 동형 sd-card. 값은 전부 원문 grounding:
 *   CFU=parseCfu · 기준량=parseBasis · 섭취=parseServing · 성상/대장균군=BASE_STANDARD · 유통/보관/주의=source.
 * 기능성 문구 = **프로바이오틱스 공식 인정 기능성**(표준). MAIN_FNCTN 이 표준과 다르면 호출부가 REVIEW_LATER.
 * EN = 조합 composer 표준과 동일하게 **한글 제품/제조사명 보존**(임의 음역 없음).
 */
import { parseCfu, parseBasis, parseServing, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';

export interface ProbioticSeed {
  statementNo: string; candidateId: string; productName: string; manufacturer: string;
  source: { mainFunction: string; baseStandard: string; intake: string; dosageForm: string; shelfLife: string; storage: string; caution: string };
}
const esc = (s: string): string => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 프로바이오틱스 공식 인정 기능성(표준). MAIN_FNCTN 이 이 집합 안이면 grounded.
const STD_FN_RE = /유산균\s*증식|유해균\s*억제|배변활동|장\s*건강/;
export function isStandardProbioticFn(mainFn: string): boolean {
  const t = normalizeSource(mainFn);
  if (!STD_FN_RE.test(t)) return false;
  // 표준 밖 추가 기능성 키워드가 있으면 pure-single 아님 → REVIEW
  const EXTRA = /면역|콜레스테롤|혈당|혈압|체지방|피부|관절|간\s*건강|눈|기억|인지|전립선|갱년기|칼슘|뼈/;
  return !EXTRA.test(t);
}

function cfuKo(abs: number): string {
  if (abs >= 1e8) { const eok = abs / 1e8; return `${Number.isInteger(eok) ? eok : parseFloat(eok.toFixed(2))}억 CFU`; }
  if (abs >= 1e4) return `${abs / 1e4}만 CFU`;
  return `${abs.toLocaleString()} CFU`;
}
function cfuEn(abs: number): string {
  if (abs >= 1e8) { const m = abs / 1e6; return `${Number.isInteger(m) ? m : parseFloat(m.toFixed(1))} million CFU`; }
  return `${abs.toLocaleString()} CFU`;
}
const COUNTER: Record<string, { ko: string; en: string }> = {
  포: { ko: '포', en: 'stick' }, 스틱: { ko: '포', en: 'stick' }, 캡슐: { ko: '캡슐', en: 'capsule' }, 캅셀: { ko: '캡슐', en: 'capsule' },
  정: { ko: '정', en: 'tablet' }, 병: { ko: '병', en: 'bottle' }, 환: { ko: '환', en: 'pill' }, 스푼: { ko: '스푼', en: 'spoon' }, 개: { ko: '개', en: 'piece' },
};
function counter(unit: string | null, form: string): { ko: string; en: string } {
  if (unit && COUNTER[unit]) return COUNTER[unit];
  if (/캡슐|캅셀/.test(form)) return COUNTER['캡슐']; if (/정제|정\b/.test(form)) return COUNTER['정'];
  return COUNTER['포'];
}
function appearance(base: string): string {
  const t = normalizeSource(base);
  const m = t.match(/성상\s*[:：]\s*([^\n]+?)(?=\s*\d+\s*[).]|\s*[①②③④⑤]|\s*[가-힣]{2,10}\s*[:：]|$)/);
  if (!m) return '';
  let a = m[1].trim().replace(/\s+/g, ' ').replace(/[\s(·,［]+$/, '').trim();
  // 괄호 불균형(열림>닫힘)이면 첫 '(' 앞까지만 — 잘린 부속 설명 방지
  if ((a.match(/\(/g) || []).length > (a.match(/\)/g) || []).length) a = a.split('(')[0].trim();
  return a;
}
function coliformNeg(base: string): boolean { return /대장균군\s*[:：]?\s*음성/.test(normalizeSource(base)); }
function cautionParts(raw: string): { ko: string[]; en: string[] } {
  const s = normalizeSource(raw); const ko: string[] = [], en: string[] = [];
  if (/임산부|임신|수유/.test(s)) { ko.push('임산부·수유부는 섭취 전 전문가와 상담'); en.push('Pregnant or breastfeeding women should consult a professional before use'); }
  if (/의약품|질환|질병|치료/.test(s)) { ko.push('질환이 있거나 의약품 복용 시 전문가와 상담'); en.push('Consult a professional if you have a medical condition or take medication'); }
  if (/알레르기|알러지|과민/.test(s)) { ko.push('알레르기 체질 등은 개인에 따라 과민반응 가능'); en.push('Allergic reactions may occur in sensitive individuals'); }
  if (/어린이|소아|유아/.test(s)) { ko.push('어린이가 함부로 섭취하지 않도록 일일섭취량·방법을 지도'); en.push('Keep out of reach of children and follow the stated daily intake'); }
  if (/이상사례|이상반응|부작용|중단/.test(s)) { ko.push('이상사례 발생 시 섭취를 중단하고 전문가와 상담'); en.push('Stop use and consult a professional if adverse effects occur'); }
  if (!ko.length) { ko.push('섭취 전 제품 표시사항을 확인'); en.push('Refer to the official labelling before use'); }
  return { ko, en };
}

export interface ComposeResult { ko: string; en: string; grounding: unknown; badgeKo: string }
export function composeProbiotic(seed: ProbioticSeed): ComposeResult | { error: string } {
  const cfu = parseCfu(seed.source.baseStandard); if (cfu.kind !== 'PARSED') return { error: `CFU_${cfu.kind}` };
  const basis = parseBasis(seed.source.baseStandard); if (basis.kind !== 'PARSED') return { error: `BASIS_${basis.kind}` };
  const srv = parseServing(seed.source.intake); if (srv.kind !== 'PARSED') return { error: `SERVING_${srv.kind}` };
  if (!isStandardProbioticFn(seed.source.mainFunction)) return { error: 'FN_NONSTANDARD' };

  const abs = cfu.value; const b = basis.value; const s = srv.value;
  const ck = cfuKo(abs), ce = cfuEn(abs);
  const basisKo = `${b.amount}${b.unit}당 ${ck} 이상`, basisEn = `at least ${ce} per ${b.amount}${b.unit}`;
  const ct = counter(s.unitType, seed.source.dosageForm);
  const perServeKo = s.unitsPerServing != null ? `${s.unitsPerServing}${ct.ko}` : null;
  const perServeEn = s.unitsPerServing != null ? `${s.unitsPerServing} ${ct.en}${s.unitsPerServing > 1 ? 's' : ''}` : null;
  const sd = s.servingsPerDay ?? 1; const dayKo = `1일 ${sd}회`, dayEn = sd === 1 ? 'Once a day' : `${sd} times a day`;
  const app = appearance(seed.source.baseStandard); const coli = coliformNeg(seed.source.baseStandard);
  const shelf = normalizeSource(seed.source.shelfLife), storage = normalizeSource(seed.source.storage);
  const caut = cautionParts(seed.source.caution);
  const li = (a: string[]): string => a.map((x) => `<li>${x}</li>`).join('');

  const badgeKo = `<span class="sd-badge">건강기능식품</span><span class="sd-badge is-solid">${basisKo}</span><span class="sd-badge">${dayKo}</span>`;
  const badgeEn = `<span class="sd-badge">Health Functional Food</span><span class="sd-badge is-solid">${basisEn}</span><span class="sd-badge">${dayEn}</span>`;
  const metaKo = `${esc(seed.manufacturer)} 제조 · ${dayKo}${perServeKo ? ` 1회 ${perServeKo}` : ''}`;
  const metaEn = `Made by ${esc(seed.manufacturer)} · ${dayEn}${perServeEn ? ` · ${perServeEn} per serving` : ''}`;
  const perUnitNoteKo = '<b>1' + ct.ko + '의 중량은 공식 표기에 없어</b> 단위당 균수는 계산하지 않았습니다';
  const perUnitNoteEn = `<b>The weight of one ${ct.en} is not stated in the official text</b>, so this page does not calculate a per-${ct.en} count`;

  const introKo = `이 제품의 표시 기준은 <b>${basisKo}</b>입니다. 공식 섭취방법은 <b>${dayKo}${perServeKo ? `, 1회 ${perServeKo}` : ''}</b>입니다. ${perUnitNoteKo}. 유산균 증식 및 유해균 억제, 배변활동 원활, 장 건강에 도움을 줄 수 있는 프로바이오틱스를 담았습니다.`;
  const introEn = `The labelled standard for this product is <b>${basisEn}</b>. The official directions are <b>${dayEn}${perServeEn ? `, ${perServeEn} per serving` : ''}</b>. ${perUnitNoteEn}. Probiotics are recognized by Korea's MFDS as an ingredient that may help promote lactic acid bacteria growth and suppress harmful bacteria, may help support smooth bowel movement, and may help support gut health.`;

  const whyKo = [`표시 기준: <b>${basisKo}</b>`, perUnitNoteKo];
  if (coli) whyKo.push('대장균군 음성 — 식약처 신고 기준 적합');
  whyKo.push(`${app ? esc(app) + ' · ' : ''}${esc(seed.manufacturer)} 제조`);
  const whyEn = [`The labelled standard is <b>${basisEn}</b>`, perUnitNoteEn];
  if (coli) whyEn.push('Coliform negative — meets its MFDS notified standard');
  whyEn.push(`Made by ${esc(seed.manufacturer)}`);

  // 물 chip 은 **원문 섭취방법에 물 근거가 있을 때만**(G-WATER-UNGROUNDED-003). 무근거 물 주장 금지.
  const waterInSource = /물|음용수/.test(normalizeSource(seed.source.intake)) && !/물\s*없이/.test(normalizeSource(seed.source.intake));
  const chipsKo = [`<span class="sd-tag">${dayKo}</span>`]; if (perServeKo) chipsKo.push(`<span class="sd-tag">1회 ${perServeKo}</span>`); if (waterInSource) chipsKo.push('<span class="sd-tag">물과 함께</span>');
  const chipsEn = [`<span class="sd-tag">${dayEn}</span>`]; if (perServeEn) chipsEn.push(`<span class="sd-tag">${perServeEn} per serving</span>`); if (waterInSource) chipsEn.push('<span class="sd-tag">With water</span>');

  const specKo = [`<div class="sd-item"><b>프로바이오틱스 수</b> 표시량 이상 ( ${basisKo} )</div>`];
  if (app) specKo.push(`<div class="sd-item"><b>성상</b> ${esc(app)}</div>`);
  if (coli) specKo.push('<div class="sd-item"><b>대장균군</b> 음성</div>');
  if (shelf) specKo.push(`<div class="sd-item"><b>유통기한</b> ${esc(shelf)}</div>`);
  if (storage) specKo.push(`<div class="sd-item"><b>보관</b> ${esc(storage)}</div>`);
  const specEn = [`<div class="sd-item"><b>Probiotic count</b> ${basisEn}</div>`];
  if (app) specEn.push(`<div class="sd-item"><b>Appearance</b> ${esc(app)}</div>`);
  if (coli) specEn.push('<div class="sd-item"><b>Coliform</b> Negative</div>');
  if (shelf) specEn.push(`<div class="sd-item"><b>Shelf life</b> ${esc(shelf)}</div>`);
  if (storage) specEn.push(`<div class="sd-item"><b>Storage</b> ${esc(storage)}</div>`);

  const whoKo = [`하루 ${sd === 1 ? '한' : sd} 번으로 관리하고 싶은 분`, `${ct.ko} 형태를 선호하는 분`];
  const whoEn = [`Those who prefer a ${sd === 1 ? 'once' : sd + '-times'} a day routine`, `Those who prefer ${ct.en}s`];

  const ko = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeKo}</div>
  <h1>${esc(seed.productName)}<small>프로바이오틱스 · 장 건강</small></h1><p class="sd-meta">${metaKo}</p></div>
  <div class="sd-body"><p class="sd-intro">${introKo}</p>
  <h2>왜 이 제품인가</h2><ul class="sd-why">${li(whyKo)}</ul>
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${chipsKo.join('')}</span></div>
  <h2>표시 기준</h2><div class="sd-spec">${specKo.join('')}</div>
  <h2>이런 분께</h2><ul class="sd-who">${li(whoKo)}</ul></div><div class="sd-foot"><b>섭취 시 주의사항</b> · ${caut.ko.join(' · ')}</div></div>`;
  const en = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeEn}</div>
  <h1>${esc(seed.productName)}<small>Probiotics · Gut health</small></h1><p class="sd-meta">${metaEn}</p></div>
  <div class="sd-body"><p class="sd-intro">${introEn}</p>
  <h2>Why this product</h2><ul class="sd-why">${li(whyEn)}</ul>
  <h2>Directions (exactly as officially stated)</h2><div class="sd-intake"><span class="sd-chips">${chipsEn.join('')}</span></div>
  <h2>Labelled standard</h2><div class="sd-spec">${specEn.join('')}</div>
  <h2>Who it suits</h2><ul class="sd-who">${li(whoEn)}</ul></div><div class="sd-foot"><b>Precautions</b> · ${caut.en.join(' · ')}</div></div>`;

  const grounding = {
    declaredCfu: { absolute: abs },
    declaredAmount: { value: parseFloat((abs / 1e8).toFixed(4)), unit: '억 CFU', basisAmount: b.amount, basisUnit: b.unit },
    serving: { unitType: ct.en === 'stick' ? 'stick' : ct.en === 'capsule' ? 'capsule' : ct.en === 'tablet' ? 'tablet' : 'stick', unitWeight: null, unitWeightUnit: null, unitsPerServing: s.unitsPerServing, servingTotalWeight: null, servingTotalWeightUnit: null, servingsPerDay: s.servingsPerDay, servingsPerDayMax: s.servingsPerDayMax ?? null },
    calculationAllowed: false, ageBandsRaw: null,
  };
  return { ko, en, grounding, badgeKo };
}
