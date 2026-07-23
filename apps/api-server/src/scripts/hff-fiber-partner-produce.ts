/**
 * 식이섬유+동반원료 Combo — compose+guard→target (B 소유 도메인만). DB write 0(generate까지).
 *   PROXY_PORT=5437 npx tsx src/scripts/hff-fiber-partner-produce.ts --domain <partner-domain-B.json> --out <dir>
 *
 * WO-...-FIBER-PARTNER-COMBO-MAX-PRODUCTION-B-V1 B-03/05~08.
 * 완전성 가드: MAIN_FNCTN 의 **모든** 기능성 문장이 (fiber 섹션 | 동반원료 카드) 중 하나에 렌더되고 EN 매핑돼야 PASS.
 * 하나라도 미렌더/미매핑 → HOLD(개별). 표시량 = 원료별 라인 보존(parseSpecs + parseFiberSources), 교차연결 0.
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { normalizeSpecText, parseSpecs, parseFiberSources, splitFunctions, parseFnAttribution } from './hff-source-parse.js';
import { parseServing, isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { mapFunctionEn, fnBelongsTo, NUTRIENT_META, FUNCTIONAL_META } from './hff-nutrient-registry.js';
import { runGuard } from '../modules/content-guard/product-description-guard.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const DOM = arg('domain'); const OUT = arg('out'); if (!DOM || !OUT) throw new Error('--domain --out 필요');
fs.mkdirSync(OUT, { recursive: true });
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5437', 10);
const FIBER_FNRE = /배변활동|장내\s*유익균|식후\s*혈당|혈중\s*콜레스테롤|식이섬유/;
const SRC_EN: Record<string, string> = { '차전자피': 'Psyllium husk', '난소화성말토덱스트린': 'Indigestible maltodextrin', '프락토올리고당': 'Fructooligosaccharide', '폴리덱스트로스': 'Polydextrose', '자일로올리고당': 'Xylooligosaccharide', '이눌린': 'Inulin', '치커리': 'Chicory extract', '귀리': 'Oat fibre' };
const meta = (k: string): { ko: string; en: string } => { const m = NUTRIENT_META[k] ?? FUNCTIONAL_META[k]; return m ? { ko: m.displayKo, en: m.displayEn } : { ko: k, en: SRC_EN[k] ?? k }; };
const esc = (s: string): string => (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const COUNTER: Record<string, { ko: string; en: string }> = { 포: { ko: '포', en: 'stick' }, 스틱: { ko: '포', en: 'stick' }, 캡슐: { ko: '캡슐', en: 'capsule' }, 캅셀: { ko: '캡슐', en: 'capsule' }, 정: { ko: '정', en: 'tablet' }, 환: { ko: '환', en: 'pill' } };
function appearance(base: string): string {
  const t = normalizeSpecText(base); const m = t.match(/성상\s*[:：]\s*([^\n]+?)(?=\s*\d+\s*[).]|\s*[①②③④⑤]|\s*[가-힣]{2,10}\s*[:：]|$)/);
  if (!m) return ''; let a = m[1].trim().replace(/\s+/g, ' ').replace(/[\s(·,［]+$/, '').trim();
  if ((a.match(/\(/g) || []).length > (a.match(/\)/g) || []).length) a = a.split('(')[0].trim(); return a;
}
function cautionParts(raw: string): { ko: string[]; en: string[] } {
  const s = normalizeSource(raw); const ko: string[] = [], en: string[] = [];
  if (/임산부|임신|수유/.test(s)) { ko.push('임산부·수유부는 섭취 전 전문가와 상담'); en.push('Pregnant or breastfeeding women should consult a professional before use'); }
  if (/의약품|질환|질병|치료/.test(s)) { ko.push('질환이 있거나 의약품 복용 시 전문가와 상담'); en.push('Consult a professional if you have a medical condition or take medication'); }
  if (/알레르기|알러지|과민/.test(s)) { ko.push('알레르기 체질 등은 개인에 따라 과민반응 가능'); en.push('Allergic reactions may occur in sensitive individuals'); }
  if (/물|수분/.test(s)) { ko.push('충분한 물과 함께 섭취'); en.push('Take with plenty of water'); }
  if (/이상사례|이상반응|부작용|중단/.test(s)) { ko.push('이상사례 발생 시 섭취를 중단하고 전문가와 상담'); en.push('Stop use and consult a professional if adverse effects occur'); }
  if (!ko.length) { ko.push('섭취 전 제품 표시사항을 확인'); en.push('Refer to the official labelling before use'); }
  return { ko, en };
}

async function main(): Promise<void> {
  const dom = JSON.parse(fs.readFileSync(DOM, 'utf8')) as Array<{ statementNo: string; candidateId: string }>;
  const stmts = dom.map((d) => String(d.statementNo));
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const rows: Array<{ id: string; stmt: string; name: string; maker: string; sungsang: string; srv: string; fn: string; base: string; shelf: string; storage: string; caution: string }> = await ds.query(
      `SELECT id, raw_payload->'source'->>'STTEMNT_NO' stmt, coalesce(raw_payload->'source'->>'PRDUCT','') name,
         coalesce(raw_payload->'source'->>'ENTRPS','') maker, coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang,
         coalesce(raw_payload->'source'->>'SRV_USE','') srv, coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn,
         coalesce(raw_payload->'source'->>'BASE_STANDARD','') base,
         coalesce(raw_payload->'source'->>'DISTB_PD','') shelf, coalesce(raw_payload->'source'->>'PRSRV_PD','') storage,
         coalesce(raw_payload->'source'->>'INTAKE_HINT1','') caution
       FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
         AND raw_payload->'source'->>'STTEMNT_NO' = ANY($1) AND matched_product_master_id IS NULL`, [stmts]);

    const target: unknown[] = []; const holds: Array<{ statementNo: string; name: string; reason: string }> = [];
    const bySize: Record<number, number> = {}; const byCombo: Record<string, number> = {};
    for (const r of rows) {
      const stmt = String(r.stmt).trim();
      const fp = parseFiberSources(r.base, r.fn);
      const partners = [...parseSpecs(r.base).byKey.entries()].filter(([k]) => k !== '식이섬유');
      const srvP = parseServing(r.srv); const bulk = isBulkMaterial(r.srv);
      if (srvP.kind !== 'PARSED' || bulk.bulk) { holds.push({ statementNo: stmt, name: r.name.trim(), reason: srvP.kind !== 'PARSED' ? `SERVING_${srvP.kind}` : 'BULK' }); continue; }
      // ── 기능성 귀속 + 완전성 가드 ──
      const allFns = splitFunctions(r.fn).filter((f) => !/^[A-Za-z0-9 ,.'()-]+$/.test(f)); // (영문) 인라인 블록은 KO 정본과 중복이라 별도 계상 안 함
      const fa = parseFnAttribution(r.fn);
      const fiberFns: string[] = []; const partnerFns = new Map<string, string[]>(); const unrendered: string[] = [];
      for (const f of allFns) {
        if (FIBER_FNRE.test(f)) { fiberFns.push(f); continue; }
        let ownerKey: string | null = null;
        if (fa.mode === 'bracket' || fa.mode === 'numbered') { for (const [k, v] of fa.byKey) if (k !== '식이섬유' && v.some((x) => x.includes(f) || f.includes(x))) { ownerKey = k; break; } }
        if (!ownerKey) for (const [k] of partners) if (fnBelongsTo(f, k)) { ownerKey = k; break; }
        if (ownerKey) partnerFns.set(ownerKey, [...(partnerFns.get(ownerKey) ?? []), f]);
        else unrendered.push(f);
      }
      if (!fiberFns.length) { holds.push({ statementNo: stmt, name: r.name.trim(), reason: 'FIBER_FN_MISSING' }); continue; }
      if (unrendered.length) { holds.push({ statementNo: stmt, name: r.name.trim(), reason: `FN_UNRENDERED:${unrendered[0].slice(0, 30)}` }); continue; }
      // 동반원료: 표시량은 있는데 기능성이 없으면(부원료) 카드 제외가 아니라 스펙만 표기. 기능성 있는데 표시량 없으면 HOLD.
      for (const k of partnerFns.keys()) if (!partners.some(([pk]) => pk === k)) { unrendered.push(`SPECLESS:${k}`); }
      if (unrendered.length) { holds.push({ statementNo: stmt, name: r.name.trim(), reason: unrendered[0] }); continue; }
      // EN 매핑(전 렌더 문장)
      const enOf = (f: string): string | null => mapFunctionEn(f);
      const fiberEn = fiberFns.map(enOf); const partnerEn = new Map([...partnerFns].map(([k, v]) => [k, v.map(enOf)]));
      if (fiberEn.some((e) => e == null) || [...partnerEn.values()].some((v) => v.some((e) => e == null))) { holds.push({ statementNo: stmt, name: r.name.trim(), reason: 'FN_EN_PENDING' }); continue; }
      // ── compose ──
      const s = srvP.value; const ct = (s.unitType && COUNTER[s.unitType]) || COUNTER['포'];
      const perKo = s.unitsPerServing != null ? `${s.unitsPerServing}${ct.ko}` : null;
      const perEn = s.unitsPerServing != null ? `${s.unitsPerServing} ${ct.en}${(s.unitsPerServing ?? 0) > 1 ? 's' : ''}` : null;
      const sd = s.servingsPerDay ?? 1; const dayKo = `1일 ${sd}회`, dayEn = sd === 1 ? 'Once a day' : `${sd} times a day`;
      const app = appearance(r.base); const coli = /대장균군\s*[:：]?\s*음성/.test(normalizeSpecText(r.base));
      const caut = cautionParts(r.caution); const water = /물|음용수/.test(normalizeSource(r.srv)) && !/물\s*없이/.test(normalizeSource(r.srv));
      const li = (a: string[]): string => a.map((x) => `<li>${x}</li>`).join('');
      const fiberKoName = fp.sources.length ? fp.sources.join('·') : '식이섬유';
      const fiberEnName = fp.sources.length ? fp.sources.map((x) => SRC_EN[x] ?? x).join(' · ') : 'Dietary fibre';
      const ingKoList = [fiberKoName, ...[...partnerFns.keys()].map((k) => meta(k).ko)];
      const ingEnList = [fiberEnName, ...[...partnerFns.keys()].map((k) => meta(k).en)];
      const cardsKo = [`<li><b>${esc(fiberKoName)}</b><ul class="sd-why">${li(fiberFns.map(esc))}</ul></li>`,
        ...[...partnerFns].map(([k, v]) => `<li><b>${esc(meta(k).ko)}</b><ul class="sd-why">${li(v.map(esc))}</ul></li>`)];
      const cardsEn = [`<li><b>${esc(fiberEnName)}</b><ul class="sd-why">${li((fiberEn as string[]).map(esc))}</ul></li>`,
        ...[...partnerEn].map(([k, v]) => `<li><b>${esc(meta(k).en)}</b><ul class="sd-why">${li((v as string[]).map(esc))}</ul></li>`)];
      const specKo: string[] = []; const specEn: string[] = [];
      for (const [src, specs] of fp.bySource) for (const sp of specs) { specKo.push(`<div class="sd-item"><b>${esc(src)}</b> ${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit} (${esc(sp.ratio)})</div>`); specEn.push(`<div class="sd-item"><b>${esc(SRC_EN[src] ?? src)}</b> ${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit} (${esc(sp.ratio)})</div>`); }
      for (const sp of fp.generic) { specKo.push(`<div class="sd-item"><b>식이섬유</b> ${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit} (${esc(sp.ratio)})</div>`); specEn.push(`<div class="sd-item"><b>Dietary fibre</b> ${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit} (${esc(sp.ratio)})</div>`); }
      for (const sp of fp.aggregate) { specKo.push(`<div class="sd-item"><b>총 식이섬유</b> ${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit}</div>`); specEn.push(`<div class="sd-item"><b>Total dietary fibre</b> ${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit}</div>`); }
      for (const [k, sp] of partners) { specKo.push(`<div class="sd-item"><b>${esc(meta(k).ko)}</b> 표시량(${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit})의 ${esc(sp.ratio)}</div>`); specEn.push(`<div class="sd-item"><b>${esc(meta(k).en)}</b> labelled (${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit}), ${esc(sp.ratio)}</div>`); }
      if (app) { specKo.push(`<div class="sd-item"><b>성상</b> ${esc(app)}</div>`); specEn.push(`<div class="sd-item"><b>Appearance</b> ${esc(app)}</div>`); }
      if (coli) { specKo.push('<div class="sd-item"><b>대장균군</b> 음성</div>'); specEn.push('<div class="sd-item"><b>Coliform</b> Negative</div>'); }
      const shelf = normalizeSource(r.shelf), storage = normalizeSource(r.storage);
      if (shelf) { specKo.push(`<div class="sd-item"><b>유통기한</b> ${esc(shelf)}</div>`); specEn.push(`<div class="sd-item"><b>Shelf life</b> ${esc(shelf)}</div>`); }
      if (storage) { specKo.push(`<div class="sd-item"><b>보관</b> ${esc(storage)}</div>`); specEn.push(`<div class="sd-item"><b>Storage</b> ${esc(storage)}</div>`); }
      const chipsKo = [`<span class="sd-tag">${dayKo}</span>`]; if (perKo) chipsKo.push(`<span class="sd-tag">1회 ${perKo}</span>`); if (water) chipsKo.push('<span class="sd-tag">물과 함께</span>');
      const chipsEn = [`<span class="sd-tag">${dayEn}</span>`]; if (perEn) chipsEn.push(`<span class="sd-tag">${perEn} per serving</span>`); if (water) chipsEn.push('<span class="sd-tag">With water</span>');
      const ko = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges"><span class="sd-badge">건강기능식품</span>${ingKoList.map((x) => `<span class="sd-badge is-solid">${esc(x)}</span>`).join('')}<span class="sd-badge">${dayKo}</span></div>
  <h1>${esc(r.name.trim())}<small>${esc(ingKoList.join(' · '))}</small></h1><p class="sd-meta">${esc(r.maker.trim())} 제조 · ${dayKo}${perKo ? ` 1회 ${perKo}` : ''}</p></div>
  <div class="sd-body"><p class="sd-intro">이 제품은 <b>${esc(ingKoList.join(', '))}</b>를 담은 복합 건강기능식품입니다. 원료별 공식 인정 기능성은 아래와 같습니다.</p>
  <h2>원료별 공식 인정 기능성</h2><ul class="sd-func">${cardsKo.join('')}</ul>
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${chipsKo.join('')}</span></div>
  <h2>표시 기준</h2><div class="sd-spec">${specKo.join('')}</div>
  <h2>이런 분께</h2><ul class="sd-who"><li>${esc(ingKoList.join(' · '))} 섭취를 함께 챙기고 싶은 분</li><li>${esc(ct.ko)} 형태를 선호하는 분</li></ul></div><div class="sd-foot"><b>섭취 시 주의사항</b> · ${caut.ko.join(' · ')}</div></div>`;
      const en = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges"><span class="sd-badge">Health Functional Food</span>${ingEnList.map((x) => `<span class="sd-badge is-solid">${esc(x)}</span>`).join('')}<span class="sd-badge">${dayEn}</span></div>
  <h1>${esc(r.name.trim())}<small>${esc(ingEnList.join(' · '))}</small></h1><p class="sd-meta">Made by ${esc(r.maker.trim())} · ${dayEn}${perEn ? ` · ${perEn} per serving` : ''}</p></div>
  <div class="sd-body"><p class="sd-intro">This product combines <b>${esc(ingEnList.join(', '))}</b>. The officially recognised functions of each are listed below.</p>
  <h2>Officially recognised functions by ingredient</h2><ul class="sd-func">${cardsEn.join('')}</ul>
  <h2>Directions (exactly as officially stated)</h2><div class="sd-intake"><span class="sd-chips">${chipsEn.join('')}</span></div>
  <h2>Labelled standard</h2><div class="sd-spec">${specEn.join('')}</div>
  <h2>Who it suits</h2><ul class="sd-who"><li>Those who want to take ${esc(ingEnList.join(' · '))} together</li><li>Those who prefer ${ct.en}s</li></ul></div><div class="sd-foot"><b>Precautions</b> · ${caut.en.join(' · ')}</div></div>`;
      const gi = { candidateId: r.id, productName: r.name.trim(), productNameEn: r.name.trim(), manufacturer: r.maker.trim(), manufacturerEn: null, statementNo: stmt, category: 'hff',
        source: { mainFunction: r.fn.trim(), baseStandard: r.base.trim(), intake: r.srv.trim(), caution: r.caution.trim(), dosageForm: r.sungsang.trim(), storage: r.storage.trim(), shelfLife: r.shelf.trim() },
        grounding: { declaredAmount: null, serving: null, calculationAllowed: false, ageBandsRaw: null }, drafts: { ko, en } };
      const g = runGuard(gi as never, { phase: 'all' });
      const blocked = g.findings.filter((f) => f.status === 'BLOCKED');
      if (blocked.length) { holds.push({ statementNo: stmt, name: r.name.trim(), reason: `BLOCKED:${blocked.map((f) => f.ruleId).join(',')}` }); continue; }
      if (g.overallStatus === 'REVIEW_REQUIRED') { holds.push({ statementNo: stmt, name: r.name.trim(), reason: `REVIEW:${g.findings.filter((f) => f.status === 'REVIEW_REQUIRED').map((f) => f.ruleId).join(',')}` }); continue; }
      const size = 1 + partnerFns.size + Math.max(0, fp.sources.length - 1);
      bySize[size] = (bySize[size] ?? 0) + 1;
      const sig = [...fp.sources, ...[...partnerFns.keys()]].sort().join('+'); byCombo[sig] = (byCombo[sig] ?? 0) + 1;
      target.push(gi);
    }
    fs.writeFileSync(path.join(OUT, 'fiber-partner-target.json'), JSON.stringify(target, null, 1));
    fs.writeFileSync(path.join(OUT, 'fiber-partner-holds.json'), JSON.stringify(holds, null, 1));
    console.log('JSON_FPP_BEGIN');
    console.log(JSON.stringify({ input: rows.length, targetPass: target.length, holds: holds.length, bySize, topCombos: Object.entries(byCombo).sort((a, b) => b[1] - a[1]).slice(0, 12) }, null, 2));
    console.log('JSON_FPP_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
