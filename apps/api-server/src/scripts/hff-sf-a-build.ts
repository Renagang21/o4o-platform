/**
 * WO-O4O-HFF-INDEPENDENT-UNLOCK-AND-PRODUCTION-A-V1 — Agent A 전용 additive config-driven build.
 * (콜라겐·초록입홍합 등 "지표성분이 타 원료로 오분류되는" 단일 기능성 원료를 fn-set + base-purity 로 안전 귀속)
 *
 * 병렬 세션이 공용 hff-sf-{registry,select,generate}.ts 수정 중 → 본 파일은 자기완결. clean 모듈만 read-only import.
 * 공용 파서(SPEC_RE 20자 cap·classify) 가 콜라겐 펩타이드 마커/초록입홍합 오메가3 지표를 못 잡는 구조 제약을,
 * MAIN_FNCTN 기능성 집합(원료 공식 기능성) + BASE_STANDARD 지표 순도(타 기능성 원료 지표 0) 로 우회.
 *
 * 귀속 게이트(WO 파싱 원칙): ① 모든 기능성 ∈ 원료 공식 기능성 집합(타 기능성 0) ② BASE_STANDARD 에 타 기능성 원료 지표 0
 *   ③ 비액상 ④ 미승격 ⑤ 미선점. functionsKo=소스 원문(래퍼 정규화), functionsEn=소스 (영문) 우선 → 공식 MFDS 영문 overlay.
 *
 *   PROXY_PORT=5442 npx tsx src/scripts/hff-sf-a-build.ts --ingredient collagen|glm --out <dir> [--include-liquid]
 * DB write 0. 산출: <dir>/<slug>-target.json (apply 입력) · -pool/-combo/-liquid/-hold/-selfcheck.json
 */
import '../env-loader.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DataSource } from 'typeorm';
import { runGuard } from '../modules/content-guard/product-description-guard.js';
import { composeSf, type SfSeed } from './hff-sf-compose.js';
import type { SfIngredient } from './hff-sf-registry.js';

interface FnRule { key: string; re: RegExp; en: string }
interface IngCfg {
  slug: string;
  // 제품별 display 라벨 결정(grounded, 원료 유형 반영).
  display: (label: string, base: string, name: string) => { ko: string; en: string };
  fnSet: FnRule[];         // 원료 공식 기능성 집합
  otherFn: RegExp;         // 타 기능성(복합형 신호)
  colMark: RegExp;         // 본 원료/지표 마커(BASE_STANDARD·name)
  otherMark: RegExp;       // 타 기능성 원료 지표(복합형 신호). 부원료(산화방지 비타민E 등)는 제외 설계.
  match: RegExp;           // 후보 SQL 매칭 정규식(원료명)
  fnNormalize?: (ko: string) => string; // 기능성 원문 래퍼 정규화(인정번호 prefix·따옴표·기타기능 suffix 제거)
}

const COMMON_OTHER_FN = /장\s*건강|배변|혈중\s*콜레스테롤|혈중\s*중성지방|콜레스테롤\s*개선|기억력|인지|눈\s*건강|망막|혈행|혈압|혈당|체지방|간\s*건강|피로개선|면역|항산화\s*작용|칼슘\s*흡수|뼈\s*건강|골밀도|전립선|요로|위\s*점막|긴장\s*완화|수면|갱년기|월경|정자|운동수행|근력|손발\s*시림|잇몸/;

// 관절/피부 단일 활성 원료는 서로 같은 기능성(관절·연골 건강)을 공유 → fn-set 만으로 단일/복합 구분 불가.
// BASE_STANDARD 지표 순도 게이트가 필수: 자기 원료(colMark) 외 타 활성이 지표로 등장하면 복합형.
const JOINT_SKIN_OTHER_MARK = /글루코사민|콘드로이[친틴]|메틸설포닐메탄|디메틸설폰|\bMSM\b|보스웰|유니베스틴|뮤코다당|점액다당|초록입홍합|리프리놀|콜라겐|히알루론|세라마이드|글루코실세라마이드|비타민\s?[ABCDEK]\d?|엽산|나이아신|판토텐산|비오틴|칼슘|마그네슘|아연|망간|셀레늄|구리|몰리브덴|크롬|프로바이오틱|유산균|오메가|EPA|DHA|루테인|지아잔틴|코엔자임|밀크씨슬|MSM|프로폴리스|홍삼|인삼|가르시니아|녹차|카테킨|폴리페놀|안토시아닌|소연골|상어연골/i;
const JOINT_FN: FnRule[] = [
  { key: 'joint', re: /관절\s*건강|관절\s*의?\s*건강|관절\s*(?:기능)?\s*(?:개선|유지)/, en: 'May help joint health' },
  { key: 'joint_cartilage', re: /관절\s*(?:및|,)?\s*연골|연골\s*건강|연골\s*보호/, en: 'May help joint and cartilage health' },
];
const SKIN_MOIST_FN: FnRule[] = [
  { key: 'skin_moist', re: /피부\s*보습|피부\s*수분/, en: 'May help to moisturise the skin' },
];
const jointDisplay = (koName: string, koEn: string) => () => ({ ko: koName, en: koEn });

const INGREDIENTS: Record<string, IngCfg> = {
  collagen: {
    slug: 'collagen',
    display: (label, base, name) => {
      const s = `${label} ${base} ${name}`;
      if (/피쉬|fish/i.test(s)) return { ko: '피쉬콜라겐펩타이드', en: 'Fish collagen peptide' };
      if (/저분자/.test(s)) return { ko: '저분자콜라겐펩타이드', en: 'Low-molecular collagen peptide' };
      return { ko: '콜라겐펩타이드', en: 'Collagen peptide' };
    },
    fnSet: [
      { key: 'skin_moist', re: /피부\s*보습/, en: 'May help to moisturise the skin' },
      { key: 'skin_uv', re: /자외선.*피부\s*손상.*피부\s*건강|자외선에\s*의한\s*피부/, en: 'May help to maintain skin health from skin damage caused by UV radiation' },
      { key: 'hair', re: /모발\s*상태|모발상태/, en: 'May help to improve hair condition (luster and elasticity)' },
      { key: 'joint', re: /관절\s*(?:및|,)?\s*연골|관절\s*건강|연골\s*건강/, en: 'May help joint and cartilage health' },
    ],
    otherFn: COMMON_OTHER_FN,
    colMark: /콜라겐|Gly\s*-\s*Pro|Pro\s*-\s*Hyp|hydroxyprolyl|hydroxyproline/i,
    otherMark: /비타민\s?[ABCDEK]\d?|엽산|나이아신|판토텐산|비오틴|콜린|비타민|토코페롤|레티놀|아스코르브|칼슘|마그네슘|아연|철분?|셀레늄|구리|망간|요오드|몰리브덴|크롬|프로바이오틱|유산균|오메가|EPA|DHA|루테인|지아잔틴|코엔자임|밀크씨슬|실리마린|글루코사민|콘드로이틴|MSM|보스웰리아|히알루론|프로폴리스|홍삼|인삼|가르시니아|녹차|카테킨|GABA|테아닌|글루타치온|폴리페놀|안토시아닌|프락토올리고|이눌린|차전자|식이섬유|프리바이오/i,
    match: /콜라겐/,
  },
  glm: {
    slug: 'green-lipped-mussel',
    display: () => ({ ko: '초록입홍합추출오일', en: 'Green-lipped mussel oil extract' }),
    fnSet: [
      { key: 'joint', re: /관절\s*건강|관절\s*의?\s*건강/, en: 'May help joint health' },
      { key: 'joint_cartilage', re: /관절\s*(?:및|,)?\s*연골|연골\s*건강/, en: 'May help joint and cartilage health' },
    ],
    otherFn: COMMON_OTHER_FN,
    colMark: /초록입홍합|리프리놀|lyprinol|green.?lipped|perna|PCSO/i,
    // 초록입홍합 지표(DHA/EPA/DPA)는 otherMark 에서 제외 — 초록입홍합의 지표성분이므로. 비타민E=산화방지 부원료 제외.
    otherMark: /비타민\s?[ABCD]\d?|엽산|나이아신|판토텐산|비오틴|콜린|칼슘|마그네슘|아연|셀레늄|구리|망간|글루코사민|콘드로이틴|MSM|보스웰리아|히알루론|콜라겐|프로바이오틱|유산균|루테인|코엔자임|홍삼|인삼/i,
    match: /초록입홍합/,
    fnNormalize: (ko) => ko.replace(/^[""'\s]*/, '').replace(/[""'\s]*$/, '').replace(/\(기타기능\s*[IVX]+\)/g, '').replace(/^[^:：]*[:：]\s*/, '').replace(/\(제?\s*\d{4}-\d+호\)/g, '').replace(/\s+/g, ' ').trim(),
  },
  msm: {
    slug: 'msm',
    display: jointDisplay('MSM(엠에스엠·디메틸설폰)', 'MSM (Methylsulfonylmethane)'),
    fnSet: JOINT_FN, otherFn: COMMON_OTHER_FN,
    colMark: /MSM|메틸설포닐메탄|디메틸설폰|dimethyl\s*sulfone|methylsulfonylmethane/i,
    otherMark: JOINT_SKIN_OTHER_MARK,
    match: /MSM|메틸설포닐메탄|디메틸설폰/,
  },
  boswellia: {
    slug: 'boswellia',
    display: jointDisplay('보스웰리아추출물', 'Boswellia serrata extract'),
    fnSet: JOINT_FN, otherFn: COMMON_OTHER_FN,
    colMark: /보스웰|유니베스틴|boswell/i,
    otherMark: JOINT_SKIN_OTHER_MARK,
    match: /보스웰|유니베스틴/,
  },
  glucosamine: {
    slug: 'glucosamine',
    display: jointDisplay('글루코사민', 'Glucosamine'),
    fnSet: JOINT_FN, otherFn: COMMON_OTHER_FN,
    colMark: /(?<!아세틸)글루코사민|glucosamine/i,
    otherMark: JOINT_SKIN_OTHER_MARK,
    match: /(?<!아세틸)글루코사민/,
  },
  nag: {
    slug: 'n-acetyl-glucosamine',
    display: jointDisplay('N-아세틸글루코사민', 'N-Acetylglucosamine'),
    fnSet: [...JOINT_FN, ...SKIN_MOIST_FN], otherFn: COMMON_OTHER_FN,
    colMark: /아세틸글루코사민|acetylglucosamine|NAG\b/i,
    otherMark: JOINT_SKIN_OTHER_MARK,
    match: /아세틸글루코사민/,
  },
  ceramide: {
    slug: 'ceramide',
    display: jointDisplay('세라마이드', 'Ceramide'),
    fnSet: SKIN_MOIST_FN, otherFn: COMMON_OTHER_FN,
    colMark: /세라마이드|ceramide|글루코실세라마이드/i,
    otherMark: JOINT_SKIN_OTHER_MARK,
    match: /세라마이드/,
  },
};

const arg = (n: string, d = ''): string => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const ING = arg('ingredient'); const OUTDIR = arg('out');
if (!ING || !INGREDIENTS[ING]) throw new Error(`--ingredient 필요: ${Object.keys(INGREDIENTS).join(' / ')}`);
if (!OUTDIR) throw new Error('--out <dir> 필요');
const cfg = INGREDIENTS[ING];
const INCLUDE_LIQUID = process.argv.includes('--include-liquid');
const PROXY_PORT = parseInt(process.env.PROXY_PORT ?? '5442', 10);
fs.mkdirSync(OUTDIR, { recursive: true });

const LIQUID = /액상|드롭|드랍|시럽|액제|방울|점적|앰플|스프레이|스포이드|농축액|겔\b|겔상|젤리|구미|\bmL\b|\bml\b|㎖/;
const NONFUNC = /성상|대장균군|대장균|붕해|납|카드뮴|비소|수은|헥산|아플라톡신|세균수|산가|과산화물|타르색소|보존료|수분|회분|중금속|미생물|이산화황|벤조피렌|엽록소|총균|여시니아|살모넬라|리스테리아|클로스트리디움|보툴리눔|잔류농약|방사능|기준\s*및\s*규격/;

function baseLabels(base: string): string[] {
  const parts = String(base).replace(/\r/g, '').split(/\n|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]|(?:^|\s)\d+[).]\s|;/);
  const out: string[] = [];
  for (let p of parts) { p = p.trim(); if (p.length < 2 || NONFUNC.test(p)) continue; const l = (p.split(/[:：]/)[0] || '').trim(); if (l.length >= 2) out.push(l); }
  return out;
}
function sections(fn: string): { koSec: string; enSec: string } {
  const t = String(fn); const enIdx = t.search(/\(영\s*문\)|\(English\)/i);
  let koPart = t, enPart = '';
  if (enIdx >= 0) { koPart = t.slice(0, enIdx); enPart = t.slice(enIdx); }
  koPart = koPart.replace(/\(국\s*문\)/g, ' ').replace(/\[[^\]]*\]/g, ' ');
  enPart = enPart.replace(/\(영\s*문\)|\(English\)/gi, ' ').replace(/\[[^\]]*\]/g, ' ');
  return { koSec: koPart, enSec: enPart };
}
function splitList(sec: string, koMode: boolean): string[] {
  return sec.split(/[①②③④⑤⑥⑦⑧⑨⑩]|(?:^|\s)\(?\d+[).]|\s*[,·]\s*/)
    .map((x) => x.trim().replace(/^[-•*\s:：]+/, '').replace(/[.。\s]+$/, '').trim())
    .filter((x) => koMode ? (x.length >= 4 && /도움|개선|유지|보습|완화|증진|보호/.test(x)) : (x.length >= 5 && /May|help|maintain|improve|support/i.test(x)));
}

async function main(): Promise<void> {
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: PROXY_PORT, username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], ssl: false, extra: { max: 2, statement_timeout: 300000 } });
  await ds.initialize();
  try {
    const taken = new Set((await ds.query(
      `SELECT DISTINCT m.mfds_permit_number p FROM product_masters m JOIN shared_product_descriptions s ON s.master_id=m.id
       WHERE s.description_type='STORE' AND s.status='canonical' AND s.deleted_at IS NULL AND s.source_type='o4o_hff_generated' AND m.mfds_permit_number IS NOT NULL`)).map((r: { p: string }) => r.p));
    const src = cfg.match.source;
    const rows: Array<{ id: string; mid: string | null; stmt: string; name: string; maker: string; sungsang: string; srv: string; fn: string; base: string; shelf: string; storage: string; caution: string }> = await ds.query(
      `SELECT id, matched_product_master_id mid, coalesce(raw_payload->'source'->>'STTEMNT_NO','') stmt,
         coalesce(raw_payload->'source'->>'PRDUCT','') name, coalesce(raw_payload->'source'->>'ENTRPS','') maker,
         coalesce(raw_payload->'source'->>'SUNGSANG','') sungsang, coalesce(raw_payload->'source'->>'SRV_USE','') srv,
         coalesce(raw_payload->'source'->>'MAIN_FNCTN','') fn, coalesce(raw_payload->'source'->>'BASE_STANDARD','') base,
         coalesce(raw_payload->'source'->>'DISTB_PD','') shelf, coalesce(raw_payload->'source'->>'PRSRV_PD','') storage,
         coalesce(raw_payload->'source'->>'INTAKE_HINT1','') caution
       FROM product_candidates WHERE source_label='MFDS_HEALTH_FUNCTIONAL_FOOD' AND deleted_at IS NULL
         AND (coalesce(raw_payload->'source'->>'MAIN_FNCTN','') ~ $1
              OR coalesce(raw_payload->'source'->>'PRDUCT','') ~ $1
              OR coalesce(raw_payload->'source'->>'BASE_STANDARD','') ~ $1)`, [src]);

    const funnel = { scanned: rows.length, fnSetPass: 0, basePure: 0, baseCombo: 0, baseNoMark: 0, solid: 0, unpromoted: 0, notTaken: 0, target: 0, liquidHeld: 0, guardHold: 0, dup: 0 };
    const target: unknown[] = []; const pool: unknown[] = []; const combo: unknown[] = []; const liquid: unknown[] = []; const hold: unknown[] = [];
    const seen = new Set<string>(); const distSig: Record<string, number> = {}; const distDisplay: Record<string, number> = {};

    for (const r of rows) {
      const sec = sections(r.fn);
      let koList = [...new Set(splitList(sec.koSec, true))];
      if (cfg.fnNormalize) koList = [...new Set(koList.map(cfg.fnNormalize).filter((x) => x.length >= 4))];
      if (!koList.length) { funnel.baseNoMark++; continue; }
      if (koList.some((f) => cfg.otherFn.test(f))) { combo.push({ stmt: r.stmt, name: r.name.trim(), reason: 'OTHER_FN' }); funnel.baseCombo++; continue; }
      if (!koList.every((f) => cfg.fnSet.some((cf) => cf.re.test(f)))) { funnel.baseNoMark++; continue; }
      funnel.fnSetPass++;
      const labels = baseLabels(r.base);
      const hasMark = labels.some((l) => cfg.colMark.test(l)) || cfg.colMark.test(r.name) || cfg.colMark.test(r.fn);
      const other = labels.filter((l) => cfg.otherMark.test(l) && !cfg.colMark.test(l));
      if (!hasMark) { funnel.baseNoMark++; continue; }
      if (other.length) { combo.push({ stmt: r.stmt, name: r.name.trim(), otherLabels: other.slice(0, 4) }); funnel.baseCombo++; continue; }
      funnel.basePure++;
      const stmt = String(r.stmt).trim(); if (!stmt || seen.has(stmt)) { funnel.dup++; continue; }
      seen.add(stmt);
      const isLiq = LIQUID.test(`${r.name} ${r.sungsang} ${r.srv}`);
      if (isLiq && !INCLUDE_LIQUID) { liquid.push({ stmt, name: r.name.trim() }); funnel.liquidHeld++; continue; }
      if (!isLiq) funnel.solid++;
      if (r.mid != null) { hold.push({ stmt, name: r.name.trim(), reason: 'ALREADY_PROMOTED' }); continue; }
      funnel.unpromoted++;
      if (taken.has(stmt)) { hold.push({ stmt, name: r.name.trim(), reason: 'TAKEN' }); continue; }
      funnel.notTaken++;

      const enList = splitList(sec.enSec, false);
      const usedInline = enList.length === koList.length && enList.length > 0;
      const functionsEn: string[] = [];
      for (let i = 0; i < koList.length; i++) {
        if (usedInline) { functionsEn.push(enList[i]); continue; }
        const m = cfg.fnSet.find((cf) => cf.re.test(koList[i]));
        functionsEn.push(m ? m.en : '');
      }
      if (functionsEn.some((e) => !e)) { hold.push({ stmt, name: r.name.trim(), reason: 'EN_UNRESOLVED' }); continue; }

      const label0 = (r.fn.match(/\[([^\]]+?)\]/) || [, ''])[1] || '';
      const disp = cfg.display(label0, r.base, r.name);
      const ing = { key: cfg.slug, slug: cfg.slug, displayKo: disp.ko, displayEn: disp.en, labelRe: cfg.match, statusHint: 'READY' } as unknown as SfIngredient;
      const seed: SfSeed = { statementNo: stmt, candidateId: r.id, productName: r.name.trim(), manufacturer: r.maker.trim(),
        functionsKo: koList, functionsEn,
        source: { mainFunction: r.fn.trim(), baseStandard: r.base.trim(), intake: r.srv.trim(), dosageForm: r.sungsang.trim(), shelfLife: r.shelf.trim(), storage: r.storage.trim(), caution: r.caution.trim() } };
      const c = composeSf(ing, seed);
      if ('error' in c) { hold.push({ stmt, name: r.name.trim(), reason: `COMPOSE_${c.error}` }); continue; }
      const gi = { candidateId: r.id, productName: seed.productName, productNameEn: seed.productName, manufacturer: seed.manufacturer, manufacturerEn: null, statementNo: stmt, category: 'hff',
        source: { mainFunction: seed.source.mainFunction, baseStandard: seed.source.baseStandard, intake: seed.source.intake, caution: seed.source.caution, dosageForm: seed.source.dosageForm, storage: seed.source.storage, shelfLife: seed.source.shelfLife },
        grounding: { declaredAmount: null, serving: null, calculationAllowed: false, ageBandsRaw: null }, drafts: { ko: c.ko, en: c.en } };
      const g = runGuard(gi as never, { phase: 'all' });
      const blocked = g.findings.filter((f) => f.status === 'BLOCKED');
      if (blocked.length) { funnel.guardHold++; hold.push({ stmt, name: r.name.trim(), reason: `GUARD_BLOCKED:${blocked.map((f) => f.ruleId).join(',')}` }); continue; }
      if (g.overallStatus === 'REVIEW_REQUIRED') { funnel.guardHold++; hold.push({ stmt, name: r.name.trim(), reason: `GUARD_REVIEW:${g.findings.filter((f) => f.status === 'REVIEW_REQUIRED').map((f) => f.ruleId).join(',')}` }); continue; }

      const sig = koList.map((f) => { const m = cfg.fnSet.find((cf) => cf.re.test(f)); return m ? m.key : '?'; }).sort().join('+');
      distSig[sig] = (distSig[sig] ?? 0) + 1; distDisplay[disp.ko] = (distDisplay[disp.ko] ?? 0) + 1;
      target.push(gi); pool.push({ stmt, name: seed.productName, display: disp.ko, sig, enSource: usedInline ? 'inline' : 'overlay' });
      funnel.target++;
    }

    const w = (n: string, d: unknown): void => fs.writeFileSync(path.join(OUTDIR, `${cfg.slug}-${n}.json`), JSON.stringify(d, null, 1));
    w('target', target); w('pool', pool); w('combo', combo); w('liquid', liquid); w('hold', hold);
    w('selfcheck', { ingredient: ING, funnel, distSig, distDisplay, targetStmts: (pool as Array<{ stmt: string }>).map((p) => p.stmt) });
    console.log('JSON_A_BUILD_BEGIN');
    console.log(JSON.stringify({ ingredient: ING, slug: cfg.slug, funnel, distSig, distDisplay, targetTotal: target.length, comboTotal: combo.length, liquidHeld: liquid.length, holdTotal: hold.length }, null, 2));
    console.log('JSON_A_BUILD_END');
  } finally { await ds.destroy(); }
}
main().catch((e) => { console.error('FAILED:', e instanceof Error ? e.message : e); process.exit(1); });
