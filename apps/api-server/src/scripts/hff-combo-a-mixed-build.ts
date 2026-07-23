/**
 * WO-O4O-HFF-CROSS-DOMAIN-COMBO-RESOLUTION-A-V1 — Agent A 전용 additive 교차도메인 build. DB write 0.
 * A(관절·피부) 기능성 원료 + B/C 기능성이 함께 있는 MIXED_NONA 를, **비-A 기능성 삭제 없이 병기**하여 렌더.
 *   - A 기능성: A registry FN(canonical, 원문 보존).
 *   - 비-A 기능성: MAIN_FNCTN 문장 추출(extractFunctionsKo) → 공용 mapFunctionEn 로 EN(임의생성 0).
 *   - **완전성 가드**: MAIN_FNCTN 의 모든 기능성 문장이 (A 렌더 ∪ 비-A mapFunctionEn 렌더) 로 커버되지 않으면 HOLD(삭제 방지).
 * 공용 parser/registry/classify/composer/apply/Guard rules 무수정.
 *   PROXY_PORT=5436 npx tsx src/scripts/hff-combo-a-mixed-build.ts --out <dir>
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { parseServing, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { A_INGREDIENTS, FN, NONA_FUNC, LIQUID } from './hff-combo-a-unregistered-registry.js';
import { attributeFunctions, type Assigned } from './hff-combo-a-classify.js';
import { mapFunctionEn } from './hff-nutrient-registry.js';
import { splitFunctions } from './hff-source-parse.js'; // parser 보강(74c9e8f2d 기준): 원자 분리·라벨경계·라벨접두 스트립

const esc = (s: string): string => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUTDIR = arg('out'); if (!OUTDIR) throw new Error('--out 필요'); fs.mkdirSync(OUTDIR, { recursive: true });
const INCLUDE_LIQUID = process.argv.includes('--include-liquid');
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5436', 10);

function appearance(base: string): string { const t = normalizeSource(base); const m = t.match(/성상\s*[:：]\s*([^\n]+?)(?=\s*\d+\s*[).]|\s*[①②③④⑤]|\s*[가-힣]{2,10}\s*[:：]|$)/); if (!m) return ''; let a = m[1].trim().replace(/\s+/g, ' ').replace(/[\s(·,［]+$/, '').trim(); if ((a.match(/\(/g) || []).length > (a.match(/\)/g) || []).length) a = a.split('(')[0].trim(); return a; }
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
function counter(unit: string | null, form: string): { ko: string; en: string } { if (unit && COUNTER[unit]) return COUNTER[unit]; if (/캡슐|캅셀|연질/.test(form)) return COUNTER['캡슐']; if (/정제|정\b/.test(form)) return COUNTER['정']; if (/분말|포/.test(form)) return COUNTER['포']; return COUNTER['정']; }

interface Seed { statementNo: string; candidateId: string; productName: string; manufacturer: string; aIngs: Assigned[]; nonAFns: Array<{ ko: string; en: string }>; source: { mainFunction: string; baseStandard: string; intake: string; dosageForm: string; shelfLife: string; storage: string; caution: string } }

function compose(seed: Seed): { ko: string; en: string } | { error: string } {
  const srv = parseServing(seed.source.intake); if (srv.kind !== 'PARSED') return { error: `SERVING_${srv.kind}` };
  const s = srv.value; const ct = counter(s.unitType, seed.source.dosageForm);
  const perServeKo = s.unitsPerServing != null ? `${s.unitsPerServing}${ct.ko}` : null; const perServeEn = s.unitsPerServing != null ? `${s.unitsPerServing} ${ct.en}${s.unitsPerServing > 1 ? 's' : ''}` : null;
  const sd = s.servingsPerDay ?? 1; const dayKo = `1일 ${sd}회`, dayEn = sd === 1 ? 'Once a day' : `${sd} times a day`;
  const app = appearance(seed.source.baseStandard); const coli = coliformNeg(seed.source.baseStandard);
  const shelf = normalizeSource(seed.source.shelfLife), storage = normalizeSource(seed.source.storage);
  const caut = cautionParts(seed.source.caution); const li = (a: string[]): string => a.map((x) => `<li>${x}</li>`).join('');
  const waterInSource = /물|음용수/.test(normalizeSource(seed.source.intake)) && !/물\s*없이/.test(normalizeSource(seed.source.intake));
  const aIngs = seed.aIngs; const titleKo = aIngs.map((a) => a.ing.displayKo).join(' · '), titleEn = aIngs.map((a) => a.ing.displayEn).join(' · ');
  const badgeKo = `<span class="sd-badge">건강기능식품</span>` + aIngs.map((a) => `<span class="sd-badge is-solid">${esc(a.ing.displayKo)}</span>`).join('') + `<span class="sd-badge">${dayKo}</span>`;
  const badgeEn = `<span class="sd-badge">Health Functional Food</span>` + aIngs.map((a) => `<span class="sd-badge is-solid">${esc(a.ing.displayEn)}</span>`).join('') + `<span class="sd-badge">${dayEn}</span>`;
  const metaKo = `${esc(seed.manufacturer)} 제조 · ${dayKo}${perServeKo ? ` 1회 ${perServeKo}` : ''}`; const metaEn = `Made by ${esc(seed.manufacturer)} · ${dayEn}${perServeEn ? ` · ${perServeEn} per serving` : ''}`;
  const introKo = `이 제품은 ${aIngs.map((a) => `<b>${esc(a.ing.displayKo)}</b>`).join(', ')} 등 공식 인정 기능성 원료를 담은 복합 건강기능식품입니다. 공식 섭취방법은 <b>${dayKo}${perServeKo ? `, 1회 ${perServeKo}` : ''}</b>이며, 아래 공식 인정 기능성을 <b>삭제 없이 모두</b> 안내합니다.`;
  const introEn = `This product combines officially recognised functional ingredients including ${aIngs.map((a) => `<b>${esc(a.ing.displayEn)}</b>`).join(', ')}. The official directions are <b>${dayEn}${perServeEn ? `, ${perServeEn} per serving` : ''}</b>. All officially recognised functions are presented below without omission.`;
  const whyKo = [`관절·피부 기능성 원료: ${aIngs.map((a) => `<b>${esc(a.ing.displayKo)}</b>`).join(', ')}`]; if (coli) whyKo.push('대장균군 음성 — 식약처 신고 기준 적합'); whyKo.push(`${app ? esc(app) + ' · ' : ''}${esc(seed.manufacturer)} 제조`);
  const whyEn = [`Joint/skin functional ingredients: ${aIngs.map((a) => `<b>${esc(a.ing.displayEn)}</b>`).join(', ')}`]; if (coli) whyEn.push('Coliform negative — meets its MFDS notified standard'); whyEn.push(`Made by ${esc(seed.manufacturer)}`);
  // A 원료별 기능성
  const aFnKo = aIngs.map((a) => `<li><b>${esc(a.ing.displayKo)}</b><ul class="sd-why">${li(a.funcs.map((k) => esc(FN[k].ko)))}</ul></li>`).join('');
  const aFnEn = aIngs.map((a) => `<li><b>${esc(a.ing.displayEn)}</b><ul class="sd-why">${li(a.funcs.map((k) => esc(FN[k].en)))}</ul></li>`).join('');
  // 비-A 공식 기능성(병기, 삭제 없음)
  const nonAKo = seed.nonAFns.length ? `<h2>함께 표시된 공식 기능성 (원문 보존)</h2><ul class="sd-why">${li(seed.nonAFns.map((f) => esc(f.ko)))}</ul>` : '';
  const nonAEn = seed.nonAFns.length ? `<h2>Other officially stated functions (preserved)</h2><ul class="sd-why">${li(seed.nonAFns.map((f) => esc(f.en)))}</ul>` : '';
  const chipsKo = [`<span class="sd-tag">${dayKo}</span>`]; if (perServeKo) chipsKo.push(`<span class="sd-tag">1회 ${perServeKo}</span>`); if (waterInSource) chipsKo.push('<span class="sd-tag">물과 함께</span>');
  const chipsEn = [`<span class="sd-tag">${dayEn}</span>`]; if (perServeEn) chipsEn.push(`<span class="sd-tag">${perServeEn} per serving</span>`); if (waterInSource) chipsEn.push('<span class="sd-tag">With water</span>');
  const specKo: string[] = []; if (app) specKo.push(`<div class="sd-item"><b>성상</b> ${esc(app)}</div>`); if (coli) specKo.push('<div class="sd-item"><b>대장균군</b> 음성</div>'); if (shelf) specKo.push(`<div class="sd-item"><b>유통기한</b> ${esc(shelf)}</div>`); if (storage) specKo.push(`<div class="sd-item"><b>보관</b> ${esc(storage)}</div>`);
  const specEn: string[] = []; if (app) specEn.push(`<div class="sd-item"><b>Appearance</b> ${esc(app)}</div>`); if (coli) specEn.push('<div class="sd-item"><b>Coliform</b> Negative</div>'); if (shelf) specEn.push(`<div class="sd-item"><b>Shelf life</b> ${esc(shelf)}</div>`); if (storage) specEn.push(`<div class="sd-item"><b>Storage</b> ${esc(storage)}</div>`);
  const whoKo = [`관절·피부와 함께 여러 기능성을 챙기고 싶은 분`, `${ct.ko} 형태를 선호하는 분`];
  const whoEn = [`Those who want joint/skin plus multiple functions`, `Those who prefer ${ct.en}s`];
  const ko = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeKo}</div>
  <h1>${esc(seed.productName)}<small>${esc(titleKo)}</small></h1><p class="sd-meta">${metaKo}</p></div>
  <div class="sd-body"><p class="sd-intro">${introKo}</p>
  <h2>왜 이 제품인가</h2><ul class="sd-why">${li(whyKo)}</ul>
  <h2>관절·피부 원료별 공식 인정 기능성</h2><ul class="sd-func">${aFnKo}</ul>
  ${nonAKo}
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${chipsKo.join('')}</span></div>${specKo.length ? `
  <h2>표시 기준</h2><div class="sd-spec">${specKo.join('')}</div>` : ''}
  <h2>이런 분께</h2><ul class="sd-who">${li(whoKo)}</ul></div><div class="sd-foot"><b>섭취 시 주의사항</b> · ${caut.ko.join(' · ')}</div></div>`;
  const en = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges">${badgeEn}</div>
  <h1>${esc(seed.productName)}<small>${esc(titleEn)}</small></h1><p class="sd-meta">${metaEn}</p></div>
  <div class="sd-body"><p class="sd-intro">${introEn}</p>
  <h2>Why this product</h2><ul class="sd-why">${li(whyEn)}</ul>
  <h2>Officially recognised functions by joint/skin ingredient</h2><ul class="sd-func">${aFnEn}</ul>
  ${nonAEn}
  <h2>Directions (exactly as officially stated)</h2><div class="sd-intake"><span class="sd-chips">${chipsEn.join('')}</span></div>${specEn.length ? `
  <h2>Labelled standard</h2><div class="sd-spec">${specEn.join('')}</div>` : ''}
  <h2>Who it suits</h2><ul class="sd-who">${li(whoEn)}</ul></div><div class="sd-foot"><b>Precautions</b> · ${caut.en.join(' · ')}</div></div>`;
  return { ko, en };
}

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(`SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; maker: string; sungsang: string; srv: string; fn: string; base: string; shelf: string; storage: string; caution: string }> = await ds.query(
      `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt, coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'ENTRPS','') maker, coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang, coalesce(raw_payload->'source'->>'SRV_USE','') srv, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, coalesce(raw_payload->'source'->>'BASE_STANDARD','') base, coalesce(raw_payload->'source'->>'DISTB_PD','') shelf, coalesce(raw_payload->'source'->>'PRSRV_PD','') storage, coalesce(raw_payload->'source'->>'INTAKE_HINT1','') caution
       FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND coalesce(raw_payload->'source'->>'BASE_STANDARD','') ~ '뮤코다당|점액다당|글루코사민|MSM|엠에스엠|메틸설포닐|디메틸설폰|히알루[론룬]산|하이알루론|세라마이드|보스웰|유니베스틴|초록입홍합|리프리놀|콜라겐|엘라스틴'`);
    const funnel = { mixed: 0, aAttrFail: 0, liquid: 0, takenOrPromoted: 0, incomplete: 0, servingHold: 0, guardBlock: 0, guardReview: 0, target: 0 };
    const target: unknown[] = []; const hold: unknown[] = []; const pool: unknown[] = []; const seen = new Set<string>();
    for (const r of rows) {
      const base = r.base || '', mf = r.fn || '';
      const present = A_INGREDIENTS.filter((a) => a.mark.test(base)); if (!present.length) continue;
      if (!(NONA_FUNC.test(mf) || NONA_FUNC.test(base))) continue; funnel.mixed++;
      const stmt = String(r.stmt).trim(); if (!stmt || seen.has(stmt)) continue; seen.add(stmt);
      if (r.mid != null || taken.has(stmt)) { funnel.takenOrPromoted++; continue; }
      if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`) && !INCLUDE_LIQUID) { funnel.liquid++; hold.push({ stmt, reason: 'LIQUID' }); continue; }
      const attr = attributeFunctions(present, mf); if (attr.ok === false) { funnel.aAttrFail++; hold.push({ stmt, reason: `A_${attr.reason}` }); continue; }
      // 완전성: MAIN_FNCTN 전 기능성 문장이 A(FN) ∪ 비-A(mapFunctionEn) 로 커버되는지.
      // parser 보강: splitFunctions(원자·라벨경계·라벨접두 스트립). 이중언어 (영문) 블록 사전 제거(국문만 추출).
      const mfKo = mf.replace(/\(영문\)[^()]*(?:\([^)]*\)[^()]*)*/g, ' ').replace(/\(국문\)/g, ' ');
      const allFns = splitFunctions(mfKo);
      const nonAFns: Array<{ ko: string; en: string }> = []; let incomplete = false, enPending = false; const uncovered: string[] = [];
      for (const f of allFns) {
        const isA = Object.values(FN).some((v) => v.re.test(f));
        if (isA) continue; // A 는 A 블록에서 렌더
        // 클린니스(잔여): 콜론(미스트립 라벨) 또는 원료명 잔재가 남은 문장 → 정제 불가 → 완전성 실패(가비지 렌더 방지)
        if (/[:：]|함유\s*유지|\bEPA\b|\bDHA\b|\bNAG\b|프로바이오틱|유산균|아세틸글루코사민|정제어유|추출물\b/i.test(f)) { incomplete = true; uncovered.push('DIRTY:' + f.slice(0, 25)); continue; }
        const en = mapFunctionEn(f);
        if (en == null) { enPending = true; uncovered.push('EN_PENDING:' + f.slice(0, 30)); continue; }
        if (!nonAFns.some((x) => x.ko === f)) nonAFns.push({ ko: f, en });
      }
      if (incomplete) { funnel.incomplete++; hold.push({ stmt, reason: 'INCOMPLETE_NONA_RENDER', uncovered }); continue; }
      if (enPending) { funnel.incomplete++; hold.push({ stmt, reason: 'FN_EN_PENDING', uncovered }); continue; }
      const seed: Seed = { statementNo: stmt, candidateId: r.id, productName: r.name.trim(), manufacturer: r.maker.trim(), aIngs: attr.assigned, nonAFns, source: { mainFunction: mf.trim(), baseStandard: base.trim(), intake: r.srv.trim(), dosageForm: r.sungsang.trim(), shelfLife: r.shelf.trim(), storage: r.storage.trim(), caution: r.caution.trim() } };
      const c = compose(seed); if ('error' in c) { funnel.servingHold++; hold.push({ stmt, reason: `COMPOSE_${c.error}` }); continue; }
      const gi = { candidateId: r.id, productName: seed.productName, productNameEn: seed.productName, manufacturer: seed.manufacturer, manufacturerEn: null, statementNo: stmt, category: 'hff', source: { mainFunction: seed.source.mainFunction, baseStandard: seed.source.baseStandard, intake: seed.source.intake, caution: seed.source.caution, dosageForm: seed.source.dosageForm, storage: seed.source.storage, shelfLife: seed.source.shelfLife }, grounding: { declaredAmount: null, serving: null, calculationAllowed: false, ageBandsRaw: null }, drafts: { ko: c.ko, en: c.en } };
      const g = runGuard(gi as never, { phase: 'all' });
      const bl = g.findings.filter((f) => f.status === 'BLOCKED'); if (bl.length) { funnel.guardBlock++; hold.push({ stmt, reason: `GUARD_BLOCKED:${bl.map((f) => f.ruleId).join(',')}` }); continue; }
      if (g.overallStatus === 'REVIEW_REQUIRED') { funnel.guardReview++; hold.push({ stmt, reason: `GUARD_REVIEW:${g.findings.filter((f) => f.status === 'REVIEW_REQUIRED').map((f) => f.ruleId).join(',')}` }); continue; }
      const sig = attr.assigned.map((a) => a.ing.key).sort().join('+') + '|nonA:' + nonAFns.length;
      target.push(gi); pool.push({ stmt, name: seed.productName, aIngs: attr.assigned.map((a) => a.ing.key), aFuncs: attr.assigned.flatMap((a) => a.funcs), nonAFns: nonAFns.map((f) => f.ko), sig }); funnel.target++;
    }
    const w = (nm: string, d: unknown) => fs.writeFileSync(path.join(OUTDIR, `mixed-a-${nm}.json`), JSON.stringify(d, null, 1));
    w('target', target); w('hold', hold); w('pool', pool);
    console.log('JSON_MIXBUILD_BEGIN'); console.log(JSON.stringify({ funnel, targetTotal: target.length, holdTotal: hold.length, targetStmts: (pool as Array<{ stmt: string }>).map((p) => p.stmt) }, null, 2)); console.log('JSON_MIXBUILD_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
