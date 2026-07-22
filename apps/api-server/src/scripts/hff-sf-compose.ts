/**
 * HFF 단일 기능성(비-CFU) — 결정적 grounded composer (표시량/기능성 기반 sd-card).
 * 프로바이오틱스 compose 구조를 비-CFU 로 일반화. 값 전부 원문 grounding, EN 은 registry mapFunctionEn 재사용(임의생성 0).
 */
import { parseServing, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import type { SfIngredient } from './hff-sf-registry.js';

export interface SfSeed {
  statementNo: string; candidateId: string; productName: string; manufacturer: string;
  functionsKo: string[]; functionsEn: string[];
  source: { mainFunction: string; baseStandard: string; intake: string; dosageForm: string; shelfLife: string; storage: string; caution: string };
}
const esc = (s: string): string => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const COUNTER: Record<string, { ko: string; en: string }> = { 포: { ko: '포', en: 'stick' }, 스틱: { ko: '포', en: 'stick' }, 캡슐: { ko: '캡슐', en: 'capsule' }, 캅셀: { ko: '캡슐', en: 'capsule' }, 정: { ko: '정', en: 'tablet' }, 병: { ko: '병', en: 'bottle' }, 환: { ko: '환', en: 'pill' } };
function counter(unit: string | null, form: string): { ko: string; en: string } {
  if (unit && COUNTER[unit]) return COUNTER[unit];
  if (/캡슐|캅셀/.test(form)) return COUNTER['캡슐']; if (/정제|정\b/.test(form)) return COUNTER['정']; return COUNTER['포'];
}
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
  return { ko, en };
}

export interface SfComposeResult { ko: string; en: string }
export function composeSf(ing: SfIngredient, seed: SfSeed): SfComposeResult | { error: string } {
  const srv = parseServing(seed.source.intake); if (srv.kind !== 'PARSED') return { error: `SERVING_${srv.kind}` };
  if (!seed.functionsKo.length || seed.functionsEn.some((e) => !e)) return { error: 'FN_EN_MISSING' };
  const s = srv.value; const ct = counter(s.unitType, seed.source.dosageForm);
  const perServeKo = s.unitsPerServing != null ? `${s.unitsPerServing}${ct.ko}` : null;
  const perServeEn = s.unitsPerServing != null ? `${s.unitsPerServing} ${ct.en}${s.unitsPerServing > 1 ? 's' : ''}` : null;
  const sd = s.servingsPerDay ?? 1; const dayKo = `1일 ${sd}회`, dayEn = sd === 1 ? 'Once a day' : `${sd} times a day`;
  const app = appearance(seed.source.baseStandard); const coli = coliformNeg(seed.source.baseStandard);
  const shelf = normalizeSource(seed.source.shelfLife), storage = normalizeSource(seed.source.storage);
  const caut = cautionParts(seed.source.caution); const li = (a: string[]): string => a.map((x) => `<li>${x}</li>`).join('');
  const waterInSource = /물|음용수/.test(normalizeSource(seed.source.intake)) && !/물\s*없이/.test(normalizeSource(seed.source.intake));

  const badgeKo = `<span class="sd-badge">건강기능식품</span><span class="sd-badge is-solid">${esc(ing.displayKo)}</span><span class="sd-badge">${dayKo}</span>`;
  const badgeEn = `<span class="sd-badge">Health Functional Food</span><span class="sd-badge is-solid">${esc(ing.displayEn)}</span><span class="sd-badge">${dayEn}</span>`;
  const metaKo = `${esc(seed.manufacturer)} 제조 · ${dayKo}${perServeKo ? ` 1회 ${perServeKo}` : ''}`;
  const metaEn = `Made by ${esc(seed.manufacturer)} · ${dayEn}${perServeEn ? ` · ${perServeEn} per serving` : ''}`;
  const introKo = `이 제품은 <b>${esc(ing.displayKo)}</b>을(를) 주원료로 한 건강기능식품입니다. 공식 섭취방법은 <b>${dayKo}${perServeKo ? `, 1회 ${perServeKo}` : ''}</b>입니다. 공식 인정 기능성은 아래와 같습니다.`;
  const introEn = `This product features <b>${esc(ing.displayEn)}</b> as its functional ingredient. The official directions are <b>${dayEn}${perServeEn ? `, ${perServeEn} per serving` : ''}</b>. Its officially recognised functions are listed below.`;

  const whyKo = [`주원료: <b>${esc(ing.displayKo)}</b>`]; if (coli) whyKo.push('대장균군 음성 — 식약처 신고 기준 적합'); whyKo.push(`${app ? esc(app) + ' · ' : ''}${esc(seed.manufacturer)} 제조`);
  const whyEn = [`Functional ingredient: <b>${esc(ing.displayEn)}</b>`]; if (coli) whyEn.push('Coliform negative — meets its MFDS notified standard'); whyEn.push(`Made by ${esc(seed.manufacturer)}`);
  const fnKo = seed.functionsKo.map(esc), fnEn = seed.functionsEn.map(esc);
  const chipsKo = [`<span class="sd-tag">${dayKo}</span>`]; if (perServeKo) chipsKo.push(`<span class="sd-tag">1회 ${perServeKo}</span>`); if (waterInSource) chipsKo.push('<span class="sd-tag">물과 함께</span>');
  const chipsEn = [`<span class="sd-tag">${dayEn}</span>`]; if (perServeEn) chipsEn.push(`<span class="sd-tag">${perServeEn} per serving</span>`); if (waterInSource) chipsEn.push('<span class="sd-tag">With water</span>');
  const specKo: string[] = []; if (app) specKo.push(`<div class="sd-item"><b>성상</b> ${esc(app)}</div>`); if (coli) specKo.push('<div class="sd-item"><b>대장균군</b> 음성</div>'); if (shelf) specKo.push(`<div class="sd-item"><b>유통기한</b> ${esc(shelf)}</div>`); if (storage) specKo.push(`<div class="sd-item"><b>보관</b> ${esc(storage)}</div>`);
  const specEn: string[] = []; if (app) specEn.push(`<div class="sd-item"><b>Appearance</b> ${esc(app)}</div>`); if (coli) specEn.push('<div class="sd-item"><b>Coliform</b> Negative</div>'); if (shelf) specEn.push(`<div class="sd-item"><b>Shelf life</b> ${esc(shelf)}</div>`); if (storage) specEn.push(`<div class="sd-item"><b>Storage</b> ${esc(storage)}</div>`);
  const whoKo = [`${esc(ing.displayKo)} 섭취를 챙기고 싶은 분`, `${ct.ko} 형태를 선호하는 분`];
  const whoEn = [`Those who want to take ${esc(ing.displayEn)}`, `Those who prefer ${ct.en}s`];

  const ko = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeKo}</div>
  <h1>${esc(seed.productName)}<small>${esc(ing.displayKo)}</small></h1><p class="sd-meta">${metaKo}</p></div>
  <div class="sd-body"><p class="sd-intro">${introKo}</p>
  <h2>왜 이 제품인가</h2><ul class="sd-why">${li(whyKo)}</ul>
  <h2>공식 인정 기능성</h2><ul class="sd-why">${li(fnKo)}</ul>
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${chipsKo.join('')}</span></div>${specKo.length ? `
  <h2>표시 기준</h2><div class="sd-spec">${specKo.join('')}</div>` : ''}
  <h2>이런 분께</h2><ul class="sd-who">${li(whoKo)}</ul></div><div class="sd-foot"><b>섭취 시 주의사항</b> · ${caut.ko.join(' · ')}</div></div>`;
  const en = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeEn}</div>
  <h1>${esc(seed.productName)}<small>${esc(ing.displayEn)}</small></h1><p class="sd-meta">${metaEn}</p></div>
  <div class="sd-body"><p class="sd-intro">${introEn}</p>
  <h2>Why this product</h2><ul class="sd-why">${li(whyEn)}</ul>
  <h2>Officially recognised functions</h2><ul class="sd-why">${li(fnEn)}</ul>
  <h2>Directions (exactly as officially stated)</h2><div class="sd-intake"><span class="sd-chips">${chipsEn.join('')}</span></div>${specEn.length ? `
  <h2>Labelled standard</h2><div class="sd-spec">${specEn.join('')}</div>` : ''}
  <h2>Who it suits</h2><ul class="sd-who">${li(whoEn)}</ul></div><div class="sd-foot"><b>Precautions</b> · ${caut.en.join(' · ')}</div></div>`;
  return { ko, en };
}
