/**
 * WO-O4O-OTC-SAFETY-MISMATCH-HYBRID-AUTHORING-AND-BATCH-APPLY-NA-V3 — 에이전트 나. DB 미접속(파일 전용).
 * 남은 277 subgroup KO+EN 저작 파이프라인 (translation-memory 방식):
 *   - KO 본문 = 공식 원문 버킷(코퍼스) 결정론 전개(줄→문단) + 약사 footer. 원문 외 의료사실 0.
 *   - EN 본문 = 라인 단위 TM(에이전트 나 저작, 원문 라인 1:1 충실 번역) 조립 + footer.
 *   - summaryTable = 그룹 meta + 효능문/금기문 해시 키 저작 요약(원문 부분집합).
 * 모드:
 *   --skeleton            : 그룹별 미저작 라인/요약 스켈레톤 생성(src/scripts/data/otc-safety-subgroup-tm-na/<slug>.skeleton.json)
 *   --build [--group s]   : 저작 완료 subgroup 의 authoring JSON 생성(otc-safety-subgroup-authoring/<slug>.json) + 정적 게이트
 * 게이트(빌드 시): KO/EN 빌더 missing·<table>·주석·sd-warn / EN 한글 0 / 수치 보존(양방향) / masterIds 교집합 0 / sourceRef·slug 유일.
 * 실행: npx tsx src/scripts/otc-safety-subgroup-authoring-build-na.ts --skeleton | --build
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';
import { buildDrugOtcEnConsumerHtml, type DrugOtcEnTranslation } from '../modules/neture/drug-import/drug-otc-en-consumer-html.js';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const CORPUS = path.join(DATA_DIR, 'otc-safety-subgroup-source-corpus-na-v1.json');
const TM_DIR = path.join(DATA_DIR, 'otc-safety-subgroup-tm-na');
const OUT_DIR = path.join(DATA_DIR, 'otc-safety-subgroup-authoring');
const REPORT = path.join(DATA_DIR, 'otc-safety-subgroup-authoring-build-report-na-v1.json');

const KO_FOOT = '이 설명서는 제품 선택을 돕기 위한 안내이며, 정확한 복용법과 주의사항은 매장 내 약사 등 전문가와 상의하십시오.';
const EN_FOOT = 'This leaflet is provided to help with product selection; for exact dosing and precautions, consult a pharmacist or other expert in the store.';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H8 = (s: string): string => md5(s).slice(0, 8);
/** 결정론 provenance UUID (safetyFp + easy md5 kind) — 유효 UUID 형식(v4 nibble). */
function mintSourceRef(safetyFp: string, easyMd5: string): string {
  const h = md5(`otc-safety-subgroup:${safetyFp}:${easyMd5}`).split('');
  h[12] = '4'; h[16] = '8';
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

/** 그룹 우선순위(마스터수 desc) + slugBase. 44 그룹 전량. */
const GROUPS: Array<{ gk: string; slug: string }> = [
  { gk: '덱시부프로펜|300밀리그램|정', slug: 'dexibuprofen300' },
  { gk: '나프록센나트륨|275밀리그램|정', slug: 'naproxenna275' },
  { gk: '알마게이트|500밀리그램|정', slug: 'almagate500' },
  { gk: '나프록센|250밀리그램|연질캡슐', slug: 'naproxen250cap' },
  { gk: '아세트아미노펜|650밀리그램|정', slug: 'acetaminophen650' },
  { gk: '브로멜라인|100밀리그램|정', slug: 'bromelain100' },
  { gk: '트리메부틴말레산염|100밀리그램|정', slug: 'trimebutine100' },
  { gk: '디오스민|600밀리그램|정', slug: 'diosmin600' },
  { gk: '알벤다졸|400밀리그램|정', slug: 'albendazole400' },
  { gk: '이부프로펜|200밀리그램|연질캡슐', slug: 'ibuprofen200cap' },
  { gk: '바실루스리케니포르미스균|250밀리그램|캡슐', slug: 'bacillus250' },
  { gk: '펙소페나딘염산염|120밀리그램|정', slug: 'fexofenadine120' },
  { gk: '트리메부틴말레산염|200밀리그램|정', slug: 'trimebutine200' },
  { gk: '클로닉신리시네이트|125밀리그램|정', slug: 'clonixin125' },
  { gk: '이부프로펜|400밀리그램|연질캡슐', slug: 'ibuprofen400cap' },
  { gk: '엘카르니틴|330밀리그램|정', slug: 'elcarnitine330' },
  { gk: '트리메부틴말레산염|150밀리그램|정', slug: 'trimebutine150' },
  { gk: '세티리진염산염|10밀리그램|연질캡슐', slug: 'cetirizine10cap' },
  { gk: '알파칼시돌|0.5마이크로그램|연질캡슐', slug: 'alfacalcidol05cap' },
  { gk: '독시라민숙신산염|25밀리그램|정', slug: 'doxylamine25' },
  { gk: '로페라미드염산염|2밀리그램|캡슐', slug: 'loperamide2' },
  { gk: '비오틴|5밀리그램|정', slug: 'biotin5' },
  { gk: '덱스판테놀|100밀리그램|정', slug: 'dexpanthenol100' },
  { gk: '니푸록사지드|200밀리그램|캡슐', slug: 'nifuroxazide200' },
  { gk: '디펜히드라민염산염|50밀리그램|연질캡슐', slug: 'diphenhydramine50cap' },
  { gk: '탄산수소나트륨|500밀리그램|정', slug: 'sodbicarbonate500' },
  { gk: '폴산|1밀리그램|정', slug: 'folicacid1' },
  { gk: '이부프로펜|200밀리그램|정', slug: 'ibuprofen200tab' },
  { gk: '아세틸시스테인|100밀리그램|캡슐', slug: 'acetylcysteine100' },
  { gk: '시트룰린말산염|500밀리그램|정', slug: 'citrulline500' },
  { gk: '브로멜라인|45밀리그램|정', slug: 'bromelain45' },
  { gk: '디오스민|300밀리그램|캡슐', slug: 'diosmin300cap' },
  { gk: '아세트아미노펜|325밀리그램|연질캡슐', slug: 'acetaminophen325cap' },
  { gk: '폴리사카리드철착염|326.1밀리그램|캡슐', slug: 'ironpolysaccharide326' },
  { gk: 'L-시스틴|500밀리그램|연질캡슐', slug: 'lcystine500cap' },
  { gk: '은행엽건조엑스|80밀리그램|정', slug: 'ginkgo80' },
  { gk: '에르도스테인|300밀리그램|정', slug: 'erdosteine300' },
  { gk: '알파칼시돌|1마이크로그램|연질캡슐', slug: 'alfacalcidol1cap' },
  { gk: '사카로마이세스보울라르디균|282.5밀리그램|캡슐', slug: 'saccharomyces282cap' },
  { gk: '플루벤다졸|500밀리그램|정', slug: 'flubendazole500' },
  { gk: '포도엽건조엑스|180밀리그램|캡슐', slug: 'grapeleaf180cap' },
  { gk: '로라타딘|10밀리그램|정', slug: 'loratadine10' },
  { gk: '니자티딘|75밀리그램|정', slug: 'nizatidine75' },
  { gk: '클로닉신리시네이트|125밀리그램|연질캡슐', slug: 'clonixin125cap' },
];
const slugOf = new Map(GROUPS.map((g) => [g.gk, g.slug]));
const orderOf = new Map(GROUPS.map((g, i) => [g.gk, i + 2])); // order 1 = magnesium500(완결)

interface Authored {
  groupKey?: string;
  meta?: { titleKo: string; titleEn: string; ingKo: string; ingEn: string; actionKo: string; actionEn: string };
  en?: Record<string, string>; // h8(라인) → EN
  effSummaries?: Record<string, { symKo: string; symEn: string; pointKo: string; pointEn: string }>;
  cauSummaries?: Record<string, { watchKo: string; watchEn: string }>;
  numAllow?: Record<string, string[]>; // h8(라인) → EN 측 허용 추가 숫자(단어수사 번역 등)
}

function loadAuthored(): { en: Map<string, string>; eff: Map<string, any>; cau: Map<string, any>; meta: Map<string, any>; numAllow: Map<string, string[]> } {
  const en = new Map<string, string>(); const eff = new Map<string, any>(); const cau = new Map<string, any>(); const meta = new Map<string, any>(); const numAllow = new Map<string, string[]>();
  if (!existsSync(TM_DIR)) return { en, eff, cau, meta, numAllow };
  for (const f of readdirSync(TM_DIR).filter((x) => x.endsWith('.authored.json')).sort()) {
    const a: Authored = JSON.parse(readFileSync(path.join(TM_DIR, f), 'utf8'));
    for (const [k, v] of Object.entries(a.en || {})) if (v && v.trim()) en.set(k, v.trim());
    for (const [k, v] of Object.entries(a.effSummaries || {})) eff.set(k, v);
    for (const [k, v] of Object.entries(a.cauSummaries || {})) cau.set(k, v);
    for (const [k, v] of Object.entries(a.numAllow || {})) numAllow.set(k, v);
    if (a.groupKey && a.meta) meta.set(a.groupKey, a.meta);
  }
  return { en, eff, cau, meta, numAllow };
}

const linesOf = (s: string): string[] => s.split('\n').map((x) => x.trim()).filter(Boolean);
const numsOf = (s: string): Set<string> => new Set((s.replace(/(\d),(\d)/g, '$1$2').match(/\d+(?:\.\d+)?/g) || []));

function main(): void {
  const corpus = JSON.parse(readFileSync(CORPUS, 'utf8'));
  const authored = loadAuthored();
  const mode = process.argv.includes('--skeleton') ? 'skeleton' : process.argv.includes('--build') ? 'build' : '';
  const only = (() => { const i = process.argv.indexOf('--group'); return i >= 0 ? process.argv[i + 1] : undefined; })();
  if (!mode) { console.error('--skeleton 또는 --build 필요'); process.exit(2); }
  mkdirSync(TM_DIR, { recursive: true });

  if (mode === 'skeleton') {
    let pendingLines = 0, pendingGroups = 0;
    for (const g of corpus.groups) {
      const slug = slugOf.get(g.groupKey); if (!slug) { console.error(`slug 미정의: ${g.groupKey}`); continue; }
      if (only && slug !== only) continue;
      const lineMap = new Map<string, { ko: string; freq: number; fields: Set<string> }>();
      const effMap = new Map<string, string>(); const cauMap = new Map<string, string>();
      for (const s of g.subgroups) {
        for (const f of ['efficacy', 'usage', 'caution'] as const) {
          for (const ln of linesOf(s.source[f])) {
            const h = H8(ln); const e = lineMap.get(h) || { ko: ln, freq: 0, fields: new Set<string>() };
            e.freq++; e.fields.add(f); lineMap.set(h, e);
          }
        }
        const effKey = H8(s.source.efficacy.trim()); if (!authored.eff.has(effKey)) effMap.set(effKey, s.source.efficacy.trim());
        const cau1 = linesOf(s.source.caution)[0] || ''; const cauKey = H8(cau1); if (cau1 && !authored.cau.has(cauKey)) cauMap.set(cauKey, cau1);
      }
      const missingLines = [...lineMap.entries()].filter(([h]) => !authored.en.has(h))
        .map(([h, v]) => ({ h8: h, freq: v.freq, fields: [...v.fields].sort().join(','), ko: v.ko }))
        .sort((a, b) => b.freq - a.freq || (a.h8 < b.h8 ? -1 : 1));
      const skel = {
        groupKey: g.groupKey, slugBase: slug, subgroups: g.subgroups.length, masters: g.subgroups.reduce((a: number, x: any) => a + x.T, 0),
        metaAuthored: authored.meta.has(g.groupKey),
        missingLineCount: missingLines.length, missingLines,
        missingEffSummaries: [...effMap.entries()].map(([h8, ko]) => ({ h8, ko })).sort((a, b) => (a.h8 < b.h8 ? -1 : 1)),
        missingCauSummaries: [...cauMap.entries()].map(([h8, ko]) => ({ h8, ko })).sort((a, b) => (a.h8 < b.h8 ? -1 : 1)),
      };
      writeFileSync(path.join(TM_DIR, `${slug}.skeleton.json`), JSON.stringify(skel, null, 2), 'utf8');
      if (missingLines.length) { pendingGroups++; pendingLines += missingLines.length; }
      console.log(`${slug}: missing lines ${missingLines.length} / eff ${skel.missingEffSummaries.length} / cau ${skel.missingCauSummaries.length} / meta ${skel.metaAuthored ? 'OK' : 'MISSING'}`);
    }
    console.log(`\npendingGroups=${pendingGroups} pendingLines=${pendingLines}`);
    return;
  }

  // ── build ──
  mkdirSync(OUT_DIR, { recursive: true });
  const report: any = { wo: 'WO-O4O-OTC-SAFETY-MISMATCH-HYBRID-AUTHORING-AND-BATCH-APPLY-NA-V3', agent: '나', built: [], holds: [], missingTm: [] };
  const seenIds = new Set<string>(); const seenRefs = new Set<string>(); const seenSlugs = new Set<string>();
  let builtFiles = 0, builtMasters = 0;
  for (const g of corpus.groups) {
    const slug = slugOf.get(g.groupKey)!; const order = orderOf.get(g.groupKey)!;
    if (only && slug !== only) continue;
    const meta = authored.meta.get(g.groupKey);
    const subsSorted = [...g.subgroups].sort((a: any, b: any) => b.T - a.T || (a.safetyFp < b.safetyFp ? -1 : 1));
    let idx = 0;
    for (const s of subsSorted) {
      idx++;
      const baseSlug = `${slug}-${String(idx).padStart(2, '0')}`;
      // TM 완비 확인
      const need = { efficacy: linesOf(s.source.efficacy), usage: linesOf(s.source.usage), caution: linesOf(s.source.caution) };
      const missing: string[] = [];
      for (const f of ['efficacy', 'usage', 'caution'] as const) for (const ln of need[f]) if (!authored.en.has(H8(ln))) missing.push(H8(ln));
      const effKey = H8(s.source.efficacy.trim()); const cauKey = H8(need.caution[0] || '');
      const effSum = authored.eff.get(effKey); const cauSum = authored.cau.get(cauKey);
      if (!meta || missing.length || !effSum || !cauSum) {
        report.missingTm.push({ slug: baseSlug, groupKey: g.groupKey, safetyFp: s.safetyFp, T: s.T, missingLines: [...new Set(missing)].length, effSum: !!effSum, cauSum: !!cauSum, meta: !!meta });
        continue;
      }
      // KO 본문(결정론): 라인→문단 + footer
      const ko = {
        efficacy: need.efficacy.join('\n\n'),
        usage: need.usage.join('\n\n'),
        usageLabel: '복용 안내',
        caution: [...need.caution, KO_FOOT].join('\n\n'),
        summaryTable: { '분류': '일반의약품', '성분': meta.ingKo, '작용': meta.actionKo, '주요 증상': effSum.symKo, '주의 대상': cauSum.watchKo, '선택 포인트': effSum.pointKo },
      };
      const en = {
        title: meta.titleEn,
        usageLabel: 'How to take it',
        efficacy: need.efficacy.map((l) => authored.en.get(H8(l))!).join(' '),
        usage: need.usage.map((l) => authored.en.get(H8(l))!).join(' '),
        caution: [...need.caution.map((l) => authored.en.get(H8(l))!), EN_FOOT].join(' '),
        summaryTable: { 'Category': 'Over-the-counter', 'Ingredient': meta.ingEn, 'How it works': meta.actionEn, 'Main symptoms': effSum.symEn, 'Caution for': cauSum.watchEn, 'Why this one': effSum.pointEn },
      };
      // 게이트
      const gates: string[] = [];
      const bK = buildDrugOtcConsumerHtml(ko, { title: meta.titleKo });
      if (bK.missing.length || !bK.html || bK.html.includes('<table') || bK.html.includes('<!--') || !bK.html.includes('sd-warn')) gates.push('KO html 게이트');
      const tr: DrugOtcEnTranslation = { groupKey: s.safetyFp, title: en.title, usageLabel: en.usageLabel, efficacy: en.efficacy, usage: en.usage, caution: en.caution, summaryTable: en.summaryTable };
      const bE = buildDrugOtcEnConsumerHtml(tr);
      if (bE.missing.length || !bE.html || bE.html.includes('<table') || bE.html.includes('<!--') || !bE.html.includes('sd-warn')) gates.push('EN html 게이트');
      if (/[가-힣]/.test(bE.html)) gates.push('EN 한글 잔존');
      // 수치 보존(필드별 양방향, numAllow 예외)
      for (const f of ['efficacy', 'usage', 'caution'] as const) {
        const koN = numsOf(need[f].join(' ')); const enN = numsOf(en[f]);
        const allow = new Set(need[f].flatMap((l) => authored.numAllow.get(H8(l)) || []));
        for (const n of koN) if (!enN.has(n)) gates.push(`수치누락(${f}):${n}`);
        for (const n of enN) if (!koN.has(n) && !allow.has(n)) gates.push(`수치추가(${f}):${n}`);
      }
      if (gates.length) { report.holds.push({ slug: baseSlug, safetyFp: s.safetyFp, gates: [...new Set(gates)] }); continue; }
      // md5 kind 별 apply-unit 분할 (runner easy md5 단일 게이트)
      const kinds = s.md5Kinds.length > 1 ? s.md5Kinds : [{ md5: s.md5Kinds[0].md5, ids: s.master_ids, n: s.T }];
      let ki = 0;
      for (const kind of kinds) {
        const unitSlug = kinds.length > 1 ? `${baseSlug}${String.fromCharCode(97 + ki)}` : baseSlug; ki++;
        const ids = [...kind.ids].sort();
        for (const id of ids) { if (seenIds.has(id)) { gates.push(`master 교집합 ${id}`); } seenIds.add(id); }
        const sourceRef = mintSourceRef(s.safetyFp, kind.md5);
        if (seenRefs.has(sourceRef) || seenSlugs.has(unitSlug)) { gates.push('sourceRef/slug 충돌'); }
        seenRefs.add(sourceRef); seenSlugs.add(unitSlug);
        if (gates.length) { report.holds.push({ slug: unitSlug, safetyFp: s.safetyFp, gates: [...new Set(gates)] }); continue; }
        const file = {
          _doc: 'WO-O4O-OTC-SAFETY-MISMATCH-HYBRID-AUTHORING-AND-BATCH-APPLY-NA-V3 — 안전 subgroup 저작(에이전트 나). 공식 원문(mfds_easy_drug) grounded, 원문 외 의료사실 0. KO=원문 결정론 전개+약사footer, EN=라인 TM 충실 번역. runner=otc-safety-subgroup-apply.ts',
          slug: unitSlug, order: order * 100 + idx,
          groupKey: g.groupKey, safetyFp: s.safetyFp, sourceRef, sensitive: false,
          title: meta.titleKo, expectEasyMd5: kind.md5,
          masterIds: ids,
          sourceBasis: { sourceType: 'mfds_easy_drug', easyMd5: kind.md5, names: s.names, note: '효능/용법/주의 버킷 전량 보존(안전지문 SSOT)' },
          writePlan: { ko: 4 * ids.length, en: 2 * ids.length, total: 6 * ids.length },
          gates: { builderKo: 'PASS', builderEn: 'PASS', hangulFreeEn: true, numbersPreserved: true, hold: false },
          ko, en,
        };
        writeFileSync(path.join(OUT_DIR, `${unitSlug}.json`), JSON.stringify(file, null, 2), 'utf8');
        builtFiles++; builtMasters += ids.length;
        report.built.push({ slug: unitSlug, groupKey: g.groupKey, safetyFp: s.safetyFp, T: ids.length, order: file.order, sourceRef, koHtmlLen: bK.html.length, enHtmlLen: bE.html.length });
      }
    }
  }
  report.summary = { builtFiles, builtMasters, holds: report.holds.length, missingTm: report.missingTm.length };
  writeFileSync(REPORT, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify(report.summary, null, 2));
  if (report.holds.length) console.log('HOLDS:', JSON.stringify(report.holds.slice(0, 10), null, 2));
}
main();
