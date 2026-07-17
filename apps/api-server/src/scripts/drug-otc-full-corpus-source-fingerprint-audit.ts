/**
 * WO-O4O-OTC-FULL-CORPUS-SOURCE-FINGERPRINT-GROUPING-AUDIT-V1
 *
 * OTC 전수 원문 지문 그룹화 read-only 감사. **DB write 0 · draft/canonical 0 · 번역 0.**
 * 식약처 e약은요(MFDS_EASY_DRUG_INFO) 원문을 기준으로 실질 동일 제품을 자동 그룹화하고
 * 자동 처리 가능 범위(대표 설명서 수·커버리지)를 산출한다.
 *
 * 원문 = product_candidates(source_label='MFDS_EASY_DRUG_INFO').raw_payload.source
 *   efcyQesitm(효능)/useMethodQesitm(용법)/atpnQesitm(주의)/atpnWarnQesitm(경고)/intrcQesitm(상호작용)/seQesitm(이상반응)
 * 매핑 = product_masters(drug_category='otc') → product_identifiers(MFDS_CODE=itemSeq) → easy candidate.
 * 성분축 = ATC_CODE identifier + 함량(specification 첫 필드). 제형/경로 = specification+원문 파생.
 *
 * 접속: 로컬 Cloud SQL Auth Proxy(127.0.0.1:PROXY_PORT). SELECT only.
 * Usage: PROXY_PORT=5442 npx tsx src/scripts/drug-otc-full-corpus-source-fingerprint-audit.ts
 * 산출: src/scripts/data/otc-full-corpus-fingerprint-{summary,groups,exceptions}-v1.json
 *   + (대용량, 미커밋) scratchpad/otc/rows.json — 재현은 본 스크립트로 가능.
 */
import '../env-loader.js';
import { DataSource } from 'typeorm';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const sha = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 16);
const PORT = parseInt(process.env.PROXY_PORT ?? '5442', 10);
const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const ROWS_OUT = process.env.OTC_ROWS_OUT ?? '';

function stripHtml(s: string) { return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' '); }
function normText(s: string | null, names: string[]) {
  let t = (s ?? '').normalize('NFKC');
  t = stripHtml(t);
  t = t.replace(/[①-⑳➀-➓⓵-⓾]/g, ' ').replace(/[·•▪◦‣∙・･]/g, ' ');
  for (const n of names) if (n && n.length > 1) t = t.split(n).join(' ');
  t = t.replace(/["'`~^]/g, ' ');
  t = t.replace(/(\d)\s+(mg|밀리그램|g|그램|mL|㎎|㎖|mcg|㎍)/gi, '$1$2');
  return t.replace(/\s+/g, ' ').trim();
}
const dosageNumeric = (u: string) => [...new Set((u.normalize('NFKC').match(/\d[\d.,]*\s?(mg|밀리그램|g|그램|mL|㎖|㎎|정|캡슐|포|병|알|방울|회|일|시간|세|개월)/gi) || []).map((x) => x.replace(/\s/g, '')))].sort().join('|');
const ageSig = (t: string) => [...new Set((t.match(/만\s?\d+\s?(세|개월)|\d+\s?(세|개월)\s?(이상|미만|이하)/g) || []).map((x) => x.replace(/\s/g, '')))].sort().join('|');
function routeSig(usem: string, form: string, name: string) {
  const t = `${usem} ${form} ${name}`; const r: string[] = [];
  if (/점안|눈에|결막|안구/.test(t)) r.push('ophthalmic');
  if (/점이|귀에|외이/.test(t)) r.push('otic');
  if (/코에|비강|점비/.test(t)) r.push('nasal');
  if (/질에|질정|질좌제/.test(t)) r.push('vaginal');
  if (/항문|직장|좌제/.test(t) && !/질정/.test(t)) r.push('rectal');
  if (/바르|도포|피부에|환부에|외용|연고|크림|로션|겔/.test(t)) r.push('topical');
  if (/흡입/.test(t)) r.push('inhalation');
  if (/구강\s?내|설하|입안에\s?머금|가글|함수/.test(t)) r.push('oromucosal');
  if (!r.length && /복용|드시|먹|섭취|정을|캡슐을|산을|시럽/.test(t)) r.push('oral');
  return r.length ? [...new Set(r)].sort().join('+') : 'unknown';
}
function doseForm(spec: string, name: string) {
  const t = `${spec} ${name}`.normalize('NFKC');
  const table: [RegExp, string][] = [[/좌제/, 'suppository'], [/질정/, 'vaginal-tab'], [/점안/, 'eyedrop'], [/점이/, 'eardrop'], [/시럽|현탁/, 'syrup'], [/연고/, 'ointment'], [/크림/, 'cream'], [/로션/, 'lotion'], [/겔|젤/, 'gel'], [/패치|첩부/, 'patch'], [/과립/, 'granule'], [/산제|[산가]루/, 'powder'], [/캡슐|캅셀/, 'capsule'], [/정(제|$| )/, 'tablet'], [/주사|주$/, 'injection'], [/액$|액제|드링크|내용액/, 'liquid']];
  for (const [re, f] of table) if (re.test(t)) return f;
  return 'other';
}

async function main() {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PORT,
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    entities: [], synchronize: false, logging: ['error'], ssl: false,
    extra: { max: 3, connectionTimeoutMillis: 12000, keepAlive: true, query_timeout: 300000, statement_timeout: 300000 } });
  await ds.initialize();
  const masters: any[] = await ds.query(`SELECT id, name, mfds_permit_number permit, representative_product_id rep, coalesce(specification,'') spec FROM product_masters WHERE drug_category ILIKE 'otc'`);
  const atcRows: any[] = await ds.query(`SELECT pi.product_master_id mid, pi.identifier_value atc FROM product_identifiers pi JOIN product_masters pm ON pm.id=pi.product_master_id AND pm.drug_category ILIKE 'otc' WHERE pi.identifier_type='ATC_CODE'`);
  const atc = new Map<string, string>(); for (const a of atcRows) if (!atc.has(a.mid)) atc.set(a.mid, a.atc);
  const wonmun: any[] = await ds.query(`
    SELECT pi.product_master_id mid, pc.identifier_value itemseq,
      pc.raw_payload->'source'->>'itemName' itemname, pc.raw_payload->'source'->>'entpName' entp,
      coalesce(pc.raw_payload->'source'->>'efcyQesitm','') efcy, coalesce(pc.raw_payload->'source'->>'useMethodQesitm','') usem,
      coalesce(pc.raw_payload->'source'->>'atpnQesitm','') atpn, coalesce(pc.raw_payload->'source'->>'atpnWarnQesitm','') warn,
      coalesce(pc.raw_payload->'source'->>'intrcQesitm','') intrc, coalesce(pc.raw_payload->'source'->>'seQesitm','') se
    FROM product_identifiers pi
    JOIN product_masters pm ON pm.id=pi.product_master_id AND pm.drug_category ILIKE 'otc'
    JOIN product_candidates pc ON pc.source_label='MFDS_EASY_DRUG_INFO' AND pc.identifier_value=pi.identifier_value
    WHERE pi.identifier_type='MFDS_CODE'`);
  const wm = new Map<string, any>(); for (const w of wonmun) if (!wm.has(w.mid)) wm.set(w.mid, w);
  const canon: any[] = await ds.query(`SELECT spd.master_id mid, spd.language lang, spd.source_type st FROM shared_product_descriptions spd JOIN product_masters pm ON pm.id=spd.master_id WHERE pm.drug_category ILIKE 'otc' AND spd.status='canonical' AND spd.description_type='STORE'`);
  const canonKo = new Map<string, string>(); const canonEn = new Set<string>();
  for (const c of canon) { if (c.lang === 'ko') canonKo.set(c.mid, c.st); if (c.lang === 'en') canonEn.add(c.mid); }

  const rows = masters.map((m) => {
    const w = wm.get(m.id); const names = [m.name, w?.itemname, w?.entp].filter(Boolean);
    const form = doseForm(m.spec, m.name); const route = routeSig(w?.usem ?? '', m.spec, m.name);
    const amount = String(m.spec).split('/')[0].trim(); const atcCode = atc.get(m.id) ?? 'NOATC';
    const ingSig = sha(`${atcCode}|${amount}`);
    const ingGroupKey = sha(`${atcCode}|${amount}|${form}|${route}`);
    const hasWonmun = !!w && !!(w.efcy || w.usem || w.atpn);
    let rawFull: string | null = null, normFull: string | null = null, axisH: string | null = null, dosageSig = '', ageS = '';
    if (hasWonmun) {
      rawFull = sha([w.efcy, w.usem, w.atpn, w.warn, w.intrc, w.se].join(''));
      const ne = normText(w.efcy, names), nu = normText(w.usem, names), na = normText(w.atpn, names);
      normFull = sha([ne, nu, na, normText(w.warn, names), normText(w.intrc, names), normText(w.se, names)].join(''));
      axisH = sha([sha(ne), sha(nu), sha(na)].sort().join(''));
      dosageSig = dosageNumeric(w.usem); ageS = ageSig(`${w.usem} ${w.atpn}`);
    }
    const safetyCore = [dosageSig, ageS, route, form, ingSig].join('#');
    return { id: m.id, name: m.name, permit: m.permit, rep: m.rep, form, route, atc: atcCode, hasWonmun, itemseq: w?.itemseq ?? null,
      rawFull, normFull, axisH, safetyCore, ingGroupKey, sfSafe: hasWonmun ? sha(`${normFull}::${safetyCore}`) : null,
      hasKo: canonKo.has(m.id), koSource: canonKo.get(m.id) ?? null, hasEn: canonEn.has(m.id) };
  });

  const withW = rows.filter((r) => r.hasWonmun); const noW = rows.filter((r) => !r.hasWonmun);
  const byNorm = new Map<string, any[]>(); for (const r of withW) { const a = byNorm.get(r.normFull!) ?? []; a.push(r); byNorm.set(r.normFull!, a); }
  const bySafe = new Map<string, any[]>(); for (const r of withW) { const a = bySafe.get(r.sfSafe!) ?? []; a.push(r); bySafe.set(r.sfSafe!, a); }
  let tier1 = 0, tier2 = 0, tier4Split = 0, tier4Groups = 0; const normGroupArr: any[] = [];
  for (const [k, mem] of byNorm) {
    const rawDistinct = new Set(mem.map((x) => x.rawFull)).size, safeDistinct = new Set(mem.map((x) => x.safetyCore)).size;
    if (safeDistinct > 1) { tier4Split += mem.length; tier4Groups++; } else if (rawDistinct === 1) tier1 += mem.length; else tier2 += mem.length;
    normGroupArr.push({ key: k, n: mem.length, rawDistinct, safeDistinct, itemseqs: new Set(mem.map((x) => x.itemseq)).size, anyCanon: mem.some((x) => x.hasKo), sample: mem[0].name });
  }
  normGroupArr.sort((a, b) => b.n - a.n);
  const safeArr = [...bySafe.entries()].map(([k, mem]) => ({ key: k, n: mem.length, anyCanon: mem.some((x) => x.hasKo), allCanon: mem.every((x) => x.hasKo), sample: mem[0].name, itemseqs: new Set(mem.map((x) => x.itemseq)).size })).sort((a, b) => b.n - a.n);

  const totalW = withW.length;
  const bk = (n: number) => n === 1 ? '1' : n <= 4 ? '2-4' : n <= 9 ? '5-9' : n <= 19 ? '10-19' : n <= 49 ? '20-49' : n <= 99 ? '50-99' : '100+';
  const sizeDist: Record<string, { groups: number; products: number }> = {};
  for (const g of safeArr) { const b = bk(g.n); (sizeDist[b] ??= { groups: 0, products: 0 }); sizeDist[b].groups++; sizeDist[b].products += g.n; }
  let cum = 0; const cov: Record<string, number> = {}; const tg = [0.5, 0.7, 0.8, 0.9]; let ti = 0;
  for (let i = 0; i < safeArr.length; i++) { cum += safeArr[i].n; while (ti < tg.length && cum >= totalW * tg[ti]) { cov[`groups_for_${tg[ti] * 100}pct`] = i + 1; ti++; } if (i + 1 === 10) cov.top10 = cum; if (i + 1 === 50) cov.top50 = cum; if (i + 1 === 100) cov.top100 = cum; if (i + 1 === 500) cov.top500 = cum; }
  const canonExtend = safeArr.filter((g) => g.anyCanon).reduce((s, g) => s + g.n, 0);
  const newGroups = safeArr.filter((g) => !g.anyCanon).length;
  const ingGroups = new Map<string, Set<string>>(); for (const r of withW) { const s = ingGroups.get(r.ingGroupKey) ?? new Set(); s.add(r.sfSafe!); ingGroups.set(r.ingGroupKey, s); }

  const summary = {
    wo: 'WO-O4O-OTC-FULL-CORPUS-SOURCE-FINGERPRINT-GROUPING-AUDIT-V1', mode: 'read-only', db_write: 0,
    q_answers: {
      '1_target_products': masters.length,
      '2_wonmun_products': withW.length,
      '3_source_fingerprint_groups(safe)': safeArr.length,
      '4_auto_groupable_products(multi-member)': safeArr.filter((g) => g.n > 1).reduce((s, g) => s + g.n, 0),
      '5_reps_for_coverage': cov,
      '6_canonical_extendable_products': canonExtend,
      '7_new_rep_groups_needed': newGroups,
      '8_manual_special_track_products': `${noW.length} (원문없음) + tier4 split ${tier4Split}`,
    },
    population: { otc_total: masters.length, distinct_representatives: new Set(masters.map((m) => m.rep)).size },
    wonmun: { with_wonmun: withW.length, without_wonmun: noW.length, rate: Number((withW.length / masters.length).toFixed(3)), distinct_itemseq: new Set(withW.map((r) => r.itemseq)).size, distinct_rawFull: new Set(withW.map((r) => r.rawFull)).size, distinct_normFull: byNorm.size },
    canonical: { has_ko: rows.filter((r) => r.hasKo).length, has_en: rows.filter((r) => r.hasEn).length },
    groups: { safe_rep_units: safeArr.length, normfull_groups: byNorm.size, multi_member_safe: safeArr.filter((g) => g.n > 1).length, singleton_safe: safeArr.filter((g) => g.n === 1).length },
    tiers: { tier1_raw_identical: tier1, tier2_normalized_merged: tier2, tier4_split_needed_products: tier4Split, tier4_groups: tier4Groups, tier5_no_wonmun: noW.length },
    size_distribution: sizeDist, coverage: { total_with_wonmun: totalW, ...cov },
    scenarios: {
      A_strict: { auto_products: tier1, rep_descriptions: safeArr.filter((g) => g.n > 1).length, coverage_of_total: Number((tier1 / masters.length).toFixed(3)) },
      B_semi: { auto_products: tier1 + tier2, rep_groups_to_review: safeArr.filter((g) => g.n > 1).length, coverage_of_total: Number(((tier1 + tier2) / masters.length).toFixed(3)) },
      C_max: { est_products: withW.length, est_rep_groups: safeArr.length, manual_split_products: tier4Split, separate_track_no_wonmun: noW.length },
    },
    relationships_5: { ingredient_groups: ingGroups.size, ingredient_group_split_across_sources: [...ingGroups.values()].filter((s) => s.size > 1).length },
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'otc-full-corpus-fingerprint-summary-v1.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'otc-full-corpus-fingerprint-groups-v1.json'), JSON.stringify(safeArr.slice(0, 500), null, 1));
  fs.writeFileSync(path.join(OUT_DIR, 'otc-full-corpus-fingerprint-exceptions-v1.json'), JSON.stringify({ no_wonmun: noW.length, no_wonmun_by_form: noW.reduce((a: any, r) => { a[r.form] = (a[r.form] ?? 0) + 1; return a; }, {}), tier4_split_groups: normGroupArr.filter((g) => g.safeDistinct > 1).slice(0, 40) }, null, 1));
  if (ROWS_OUT) fs.writeFileSync(ROWS_OUT, JSON.stringify(rows.map((r) => ({ id: r.id, name: r.name, permit: r.permit, itemseq: r.itemseq, hasWonmun: r.hasWonmun, form: r.form, route: r.route, atc: r.atc, sfSafe: r.sfSafe, ingGroupKey: r.ingGroupKey, hasKo: r.hasKo, koSource: r.koSource, hasEn: r.hasEn })), null, 0));
  console.log(JSON.stringify(summary, null, 2));
  await ds.destroy();
}
main().catch((e) => { console.error('[otc-fingerprint-audit] FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
