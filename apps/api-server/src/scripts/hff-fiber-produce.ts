/**
 * 식이섬유 원료 식별 제품 — select+compose+generate (B 전용, 공용 parser 무수정). DB write 0(generate까지).
 *   PROXY_PORT=5436 npx tsx src/scripts/hff-fiber-produce.ts --out <dir> [--max 800]
 *
 * WO-O4O-HFF-DIETARY-FIBER-COMBO-PRODUCTION-B-V1 B-07/08.
 * 대상: 식이섬유 기능성 제품 중 `parseFiberSources` 로 **원료 식별 가능**(generic-only 제외) · **pure-fiber**
 *       (타도메인 기능성 없음 — 동반원료 제품은 combo 라인 대상으로 HOLD) · 고형 · 미승격 · not-taken.
 * 원칙: 원료별 표시량 보존(bySource) · 총량(aggregate) 별도 표기 · 기능성 KO=MAIN_FNCTN 원문 · EN=mapFunctionEn(임의생성 0).
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { normalizeSpecText, parseFiberSources } from './hff-source-parse.js';
import { parseServing, isBulkMaterial, normalizeSource } from '../modules/content-guard/source-grounding-parser.js';
import { mapFunctionEn } from './hff-nutrient-registry.js';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { extractFunctionsKo } from './hff-sf-registry.js';

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const OUT = arg('out'); if (!OUT) throw new Error('--out 필요'); fs.mkdirSync(OUT, { recursive: true });
const MAX = parseInt(arg('max', '800'), 10);
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5436', 10);
const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;
const FIBER_FN = /배변활동|장내\s*유익균|식후\s*혈당|혈중\s*콜레스테롤/;
// 타도메인 동반(있으면 combo 라인 대상 → HOLD)
const PARTNER = /바나바|코로솔산|키토산|홍국|가르시니아|녹차|카테킨|알로에|프로바이오틱|유산균|비타민|아연|칼슘|마그네슘|은행잎|밀크씨슬|루테인|오메가|EPA|DHA|테아닌|홍삼|인삼/;
const SRC_EN: Record<string, string> = { '차전자피': 'Psyllium husk', '난소화성말토덱스트린': 'Indigestible maltodextrin', '프락토올리고당': 'Fructooligosaccharide', '폴리덱스트로스': 'Polydextrose', '자일로올리고당': 'Xylooligosaccharide', '이눌린': 'Inulin', '치커리': 'Chicory extract', '귀리': 'Oat fibre' };
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
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));

    const target: unknown[] = []; const holds: Array<{ statementNo: string; name: string; reason: string }> = [];
    const bySrcCount: Record<number, number> = {}; const byCombo: Record<string, number> = {};
    const funnel = { scanned: 0, fiberFn: 0, identified: 0, pureFiber: 0, solidFresh: 0, ready: 0, guardPass: 0 };
    const seen = new Set<string>();

    let after = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; maker: string; sungsang: string; srv: string; fn: string; base: string; shelf: string; storage: string; caution: string }> = await ds.query(
        `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
           coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'ENTRPS','') maker,
           coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang, coalesce(raw_payload->'source'->>'SRV_USE','') srv,
           coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, coalesce(raw_payload->'source'->>'BASE_STANDARD','') base,
           coalesce(raw_payload->'source'->>'DISTB_PD','') shelf, coalesce(raw_payload->'source'->>'PRSRV_PD','') storage,
           coalesce(raw_payload->'source'->>'INTAKE_HINT1','') caution
         FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL AND id > $1 ORDER BY id ASC LIMIT 3000`, [after]);
      if (rows.length === 0) break;
      for (const r of rows) {
        funnel.scanned++;
        const fnN = normalizeSpecText(r.fn);
        if (!FIBER_FN.test(fnN)) continue; funnel.fiberFn++;
        const fp = parseFiberSources(r.base, r.fn);
        if (fp.sources.length === 0) continue;                 // generic-only 제외(비추정)
        funnel.identified++;
        if (PARTNER.test(normalizeSpecText(`${r.base} ${r.fn}`))) { holds.push({ statementNo: String(r.stmt).trim(), name: r.name.trim(), reason: 'PARTNER_COMBO_ROUTE' }); continue; }
        funnel.pureFiber++;
        const stmt = String(r.stmt).trim(); if (!stmt || seen.has(stmt)) continue;
        if (LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`)) { holds.push({ statementNo: stmt, name: r.name.trim(), reason: 'LIQUID' }); continue; }
        if (r.mid != null || taken.has(stmt)) continue;
        funnel.solidFresh++; seen.add(stmt);
        // grounding
        const srvP = parseServing(r.srv); const bulk = isBulkMaterial(r.srv);
        if (srvP.kind !== 'PARSED' || bulk.bulk) { holds.push({ statementNo: stmt, name: r.name.trim(), reason: srvP.kind !== 'PARSED' ? `SERVING_${srvP.kind}` : 'BULK' }); continue; }
        const fnsKo = extractFunctionsKo(r.fn).filter((f) => FIBER_FN.test(f) || /배변|유익균|혈당|콜레스테롤/.test(f));
        const fnsEn = fnsKo.map((f) => mapFunctionEn(f));
        if (!fnsKo.length || fnsEn.some((e) => e == null)) { holds.push({ statementNo: stmt, name: r.name.trim(), reason: 'FN_EN_PENDING' }); continue; }
        funnel.ready++;
        // ── compose (원료별 표시량 보존) ──
        const s = srvP.value; const ct = (s.unitType && COUNTER[s.unitType]) || COUNTER['포'];
        const perKo = s.unitsPerServing != null ? `${s.unitsPerServing}${ct.ko}` : null;
        const perEn = s.unitsPerServing != null ? `${s.unitsPerServing} ${ct.en}${(s.unitsPerServing ?? 0) > 1 ? 's' : ''}` : null;
        const sd = s.servingsPerDay ?? 1; const dayKo = `1일 ${sd}회`, dayEn = sd === 1 ? 'Once a day' : `${sd} times a day`;
        const app = appearance(r.base); const coli = /대장균군\s*[:：]?\s*음성/.test(normalizeSpecText(r.base));
        const caut = cautionParts(r.caution); const water = /물|음용수/.test(normalizeSource(r.srv)) && !/물\s*없이/.test(normalizeSource(r.srv));
        const li = (a: string[]): string => a.map((x) => `<li>${x}</li>`).join('');
        const srcKo = fp.sources.join(' · '); const srcEn = fp.sources.map((x) => SRC_EN[x] ?? x).join(' · ');
        const specRows: string[] = []; const specRowsEn: string[] = [];
        for (const [src, specs] of fp.bySource) for (const sp of specs) { specRows.push(`<div class="sd-item"><b>${esc(src)}</b> ${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit} (${esc(sp.ratio)})</div>`); specRowsEn.push(`<div class="sd-item"><b>${esc(SRC_EN[src] ?? src)}</b> ${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit} (${esc(sp.ratio)})</div>`); }
        for (const sp of fp.generic) { specRows.push(`<div class="sd-item"><b>식이섬유</b> ${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit} (${esc(sp.ratio)})</div>`); specRowsEn.push(`<div class="sd-item"><b>Dietary fibre</b> ${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit} (${esc(sp.ratio)})</div>`); }
        for (const sp of fp.aggregate) { specRows.push(`<div class="sd-item"><b>총 식이섬유</b> ${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit}</div>`); specRowsEn.push(`<div class="sd-item"><b>Total dietary fibre</b> ${sp.value}${sp.unit}/${sp.basisAmount}${sp.basisUnit}</div>`); }
        if (app) { specRows.push(`<div class="sd-item"><b>성상</b> ${esc(app)}</div>`); specRowsEn.push(`<div class="sd-item"><b>Appearance</b> ${esc(app)}</div>`); }
        if (coli) { specRows.push('<div class="sd-item"><b>대장균군</b> 음성</div>'); specRowsEn.push('<div class="sd-item"><b>Coliform</b> Negative</div>'); }
        const shelf = normalizeSource(r.shelf), storage = normalizeSource(r.storage);
        if (shelf) { specRows.push(`<div class="sd-item"><b>유통기한</b> ${esc(shelf)}</div>`); specRowsEn.push(`<div class="sd-item"><b>Shelf life</b> ${esc(shelf)}</div>`); }
        if (storage) { specRows.push(`<div class="sd-item"><b>보관</b> ${esc(storage)}</div>`); specRowsEn.push(`<div class="sd-item"><b>Storage</b> ${esc(storage)}</div>`); }
        const chipsKo = [`<span class="sd-tag">${dayKo}</span>`]; if (perKo) chipsKo.push(`<span class="sd-tag">1회 ${perKo}</span>`); if (water) chipsKo.push('<span class="sd-tag">물과 함께</span>');
        const chipsEn = [`<span class="sd-tag">${dayEn}</span>`]; if (perEn) chipsEn.push(`<span class="sd-tag">${perEn} per serving</span>`); if (water) chipsEn.push('<span class="sd-tag">With water</span>');
        const ko = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges"><span class="sd-badge">건강기능식품</span><span class="sd-badge is-solid">${esc(srcKo)}</span><span class="sd-badge">${dayKo}</span></div>
  <h1>${esc(r.name.trim())}<small>식이섬유 · ${esc(srcKo)}</small></h1><p class="sd-meta">${esc(r.maker.trim())} 제조 · ${dayKo}${perKo ? ` 1회 ${perKo}` : ''}</p></div>
  <div class="sd-body"><p class="sd-intro">이 제품은 <b>${esc(srcKo)}</b> 식이섬유를 담은 건강기능식품입니다. 공식 섭취방법은 <b>${dayKo}${perKo ? `, 1회 ${perKo}` : ''}</b>입니다. 공식 인정 기능성은 아래와 같습니다.</p>
  <h2>공식 인정 기능성</h2><ul class="sd-why">${li(fnsKo.map(esc))}</ul>
  <h2>섭취방법 (공식 표기 그대로)</h2><div class="sd-intake"><span class="sd-chips">${chipsKo.join('')}</span></div>
  <h2>표시 기준</h2><div class="sd-spec">${specRows.join('')}</div>
  <h2>이런 분께</h2><ul class="sd-who"><li>식이섬유 섭취를 챙기고 싶은 분</li><li>${esc(ct.ko)} 형태를 선호하는 분</li></ul></div><div class="sd-foot"><b>섭취 시 주의사항</b> · ${caut.ko.join(' · ')}</div></div>`;
        const en = `<div class="sd-card sd-theme-green"><div class="sd-hero">
  <div class="sd-badges"><span class="sd-badge">Health Functional Food</span><span class="sd-badge is-solid">${esc(srcEn)}</span><span class="sd-badge">${dayEn}</span></div>
  <h1>${esc(r.name.trim())}<small>Dietary fibre · ${esc(srcEn)}</small></h1><p class="sd-meta">Made by ${esc(r.maker.trim())} · ${dayEn}${perEn ? ` · ${perEn} per serving` : ''}</p></div>
  <div class="sd-body"><p class="sd-intro">This product provides dietary fibre from <b>${esc(srcEn)}</b>. The official directions are <b>${dayEn}${perEn ? `, ${perEn} per serving` : ''}</b>. Its officially recognised functions are listed below.</p>
  <h2>Officially recognised functions</h2><ul class="sd-why">${li((fnsEn as string[]).map(esc))}</ul>
  <h2>Directions (exactly as officially stated)</h2><div class="sd-intake"><span class="sd-chips">${chipsEn.join('')}</span></div>
  <h2>Labelled standard</h2><div class="sd-spec">${specRowsEn.join('')}</div>
  <h2>Who it suits</h2><ul class="sd-who"><li>Those who want to take dietary fibre daily</li><li>Those who prefer ${ct.en}s</li></ul></div><div class="sd-foot"><b>Precautions</b> · ${caut.en.join(' · ')}</div></div>`;
        const gi = { candidateId: r.id, productName: r.name.trim(), productNameEn: r.name.trim(), manufacturer: r.maker.trim(), manufacturerEn: null, statementNo: stmt, category: 'hff',
          source: { mainFunction: r.fn.trim(), baseStandard: r.base.trim(), intake: r.srv.trim(), caution: r.caution.trim(), dosageForm: r.sungsang.trim(), storage: r.storage.trim(), shelfLife: r.shelf.trim() },
          grounding: { declaredAmount: null, serving: null, calculationAllowed: false, ageBandsRaw: null }, drafts: { ko, en } };
        const g = runGuard(gi as never, { phase: 'all' });
        const blocked = g.findings.filter((f) => f.status === 'BLOCKED');
        if (blocked.length) { holds.push({ statementNo: stmt, name: r.name.trim(), reason: `BLOCKED:${blocked.map((f) => f.ruleId).join(',')}` }); continue; }
        if (g.overallStatus === 'REVIEW_REQUIRED') { holds.push({ statementNo: stmt, name: r.name.trim(), reason: `REVIEW:${g.findings.filter((f) => f.status === 'REVIEW_REQUIRED').map((f) => f.ruleId).join(',')}` }); continue; }
        funnel.guardPass++;
        const nSrc = fp.sources.length; bySrcCount[nSrc] = (bySrcCount[nSrc] ?? 0) + 1;
        const comboSig = [...fp.sources].sort().join('+'); byCombo[comboSig] = (byCombo[comboSig] ?? 0) + 1;
        target.push(gi);
        if (target.length >= MAX) break;
      }
      if (target.length >= MAX) break;
      after = rows[rows.length - 1].id;
    }
    fs.writeFileSync(path.join(OUT, 'fiber-target.json'), JSON.stringify(target, null, 1));
    fs.writeFileSync(path.join(OUT, 'fiber-holds.json'), JSON.stringify(holds, null, 1));
    console.log('JSON_FIBERPROD_BEGIN');
    console.log(JSON.stringify({ funnel, guardPass: funnel.guardPass, bySourceCount: bySrcCount, byCombo: Object.entries(byCombo).sort((a, b) => b[1] - a[1]).slice(0, 15), holds: holds.length }, null, 2));
    console.log('JSON_FIBERPROD_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
