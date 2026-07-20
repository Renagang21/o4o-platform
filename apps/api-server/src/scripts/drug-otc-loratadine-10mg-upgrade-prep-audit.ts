/**
 * WO-O4O-OTC-LORATADINE-10MG-UPGRADE-PREP-AUDIT-GA-V1 — 로라타딘 10mg 정 38건 승격 실행 준비 최종 점검 (read-only, DB write 0)
 *
 * 다음 Track A 승격 후보(로라타딘 10mg 정)를 apply WO 전 최종 read-only 점검하고, 범용 runner(GROUP_REGISTRY)
 * 등재용 config 초안을 산출한다. **DB write 0 · runner 파일 미수정 · fingerprint/정책 변경 없음.**
 *
 * 점검 항목:
 *   1. target fp 83bcf192525baa16 → 38 master 재고정(fingerprintOf 정본).
 *   2. 비대상(exclude) fp 전량 열거 · target∩exclude 교집합 0 · other(미분류) 0.
 *   3. e약은요 STORE ko canonical 정확히 1/master.
 *   4. authored source_ref 0a7dee0b… draft 완성도(buildDrugOtcConsumerHtml: 필수필드·sd-warn·table/주석/이중escape 0).
 *   5. authored canonical/needs_review 충돌 0.
 *   6. 함량·제형·경로·안전지문 동질성(target 전건 dose/form/route 단일 + fp 단일 = 안전지문 동질).
 *   7. rollback master IDs 38 고정.
 *   8. 예상 SPD 114 / audit 38.
 *   9. GROUP_REGISTRY 등재용 config 초안(excludeFp 전량 명시 → runner other===0 게이트 충족).
 *
 * coarse 열거·fp 산식은 runner(drug-otc-grounded-upgrade-runner.ts) VERBATIM 재현(등재 시 byte-identical 보장).
 *
 * Usage(apps/api-server): DB_HOST=127.0.0.1 DB_PORT=5442 ... NODE_ENV= npx tsx src/scripts/drug-otc-loratadine-10mg-upgrade-prep-audit.ts
 * 산출: src/scripts/data/otc-loratadine-10mg-upgrade-prep-v1.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const retRows = <T = any>(res: unknown): T[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];

// ── 로라타딘 10mg 정 후보 (직전 감사 NEXT-BATCH-GA-V1 커밋 fc66ec00f 기준) ──
const CFG = {
  key: '로라타딘|10밀리그램|정',
  registryKey: 'loratadine-10mg-jeong',
  ingredient: '로라타딘',
  dose: '10밀리그램',
  formKeyword: '정',
  candidate: '0a7dee0b-e578-4015-967a-fad092071eef',
  targetFp: '83bcf192525baa16',
  expected: 38,
  excludedExpected: 3,
  authoredSource: 'mfds_drug_otc' as const,
  outBase: 'otc-grounded-upgrade-loratadine-10mg-jeong',
};

// ── fingerprintOf = runner/파일럿 정본 VERBATIM ──
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s || '').normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
}
function easySections(content: string): Record<string, string> {
  const out: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g; let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim(); return out;
}
function freeSections(content: string): Record<string, string> {
  const out: Record<string, string> = {}; const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi; let m: RegExpExecArray | null;
  while ((m = re.exec(content))) { const title = m[2].replace(/[:：]\s*$/, '').trim(); const body = m[3].trim(); if (title) out[title] = (out[title] ? out[title] + '\n' : '') + body; }
  return out;
}
function bucketSections(sec: Record<string, string>): { ind: string; dos: string; cau: string; itx: string } {
  let ind = '', dos = '', cau = '', itx = '';
  for (const [t, b] of Object.entries(sec)) {
    if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b;
    else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b;
    else if (/상호\s*작용|병용/.test(t)) itx += (itx ? '\n' : '') + b;
    else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t)) cau += (cau ? '\n' : '') + b;
  }
  return { ind, dos, cau, itx };
}
function formOf(name: string): string {
  return /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림'
    : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽'
    : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타';
}
function routeSig(name: string): string {
  if (/질정|질좌|질내정|질\s?삽입/.test(name)) return 'vaginal';
  if (/좌약|좌제/.test(name)) return 'rectal';
  if (/점안|안연고/.test(name)) return 'ophthalmic';
  if (/점이액|귀에/.test(name)) return 'otic';
  if (/점비|비강/.test(name)) return 'nasal';
  if (/크림|연고|로션|로숀|겔$|겔\(|겔제|젤$|젤\(|플라스타|플라스터|첩부|카타플|패취|패치|파스|파프|스왑|스틱|거즈|탈지면|솜|네일라카|라카|외용|도포|스프레이|에어로솔|에어졸|소독|폼$|폼\(|워시|카타플라스마/.test(name)) return 'topical';
  if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(name)) return 'oral';
  return 'unknown';
}
const ingredientOf = (name: string): string => (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (spec: string): string => (spec || '').split(' / ')[0].trim();
function fingerprintOf(name: string, spec: string, content: string): { fp: string; route: string; form: string } {
  let sec = easySections(content || '');
  if (Object.keys(sec).length === 0) sec = freeSections(content || '');
  const { ind, dos, cau } = bucketSections(sec);
  const ingredient = ingredientOf(name); const strength = strengthOf(spec); const form = formOf(name); const route = routeSig(name);
  const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${ingredient}|${strength}`), H(form), route].join('|'));
  return { fp, route, form };
}

async function main(): Promise<void> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();
  const report: any = { wo: 'WO-O4O-OTC-LORATADINE-10MG-UPGRADE-PREP-AUDIT-GA-V1', readOnly: true, dbWrite: 0, groupKey: CFG.key, candidate: CFG.candidate, anomalies: [] as string[] };
  try {
    // 1) draft(source_ref) 완성도
    const draft = retRows<{ candidate_id: string; title: string; content_json: Record<string, unknown> }>(await ds.query(
      `SELECT candidate_id::text, title, content_json FROM product_candidate_description_drafts WHERE candidate_id=$1::uuid AND deleted_at IS NULL LIMIT 1`, [CFG.candidate]));
    if (draft.length !== 1) throw new Error(`draft(candidate ${CFG.candidate}) ${draft.length} !== 1 → ABORT`);
    const d = draft[0];
    report.draftTitle = d.title;

    // 2) coarse 재열거 + fingerprint 재고정 (runner VERBATIM: canonical 우선, deprecated fallback)
    const coarse = retRows<{ id: string; name: string; spec: string; content: string }>(await ds.query(
      `SELECT pm.id::text id, pm.name, pm.specification spec, es.content
       FROM product_masters pm
       JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true
       WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
       ORDER BY pm.id`, [CFG.ingredient, CFG.dose, CFG.formKeyword]));
    const withFp = coarse.map((r) => ({ ...r, ...fingerprintOf(r.name, r.spec, r.content) }));
    const target = withFp.filter((r) => r.fp === CFG.targetFp);
    const nonTarget = withFp.filter((r) => r.fp !== CFG.targetFp);
    const masterIds = target.map((r) => r.id).sort();
    const excludeIds = nonTarget.map((r) => r.id).sort();
    const excludeFps = [...new Set(nonTarget.map((r) => r.fp))].sort();
    const intersection = masterIds.filter((id) => new Set(excludeIds).has(id)).length;
    const fpDistribution = Object.entries(withFp.reduce((a: Record<string, number>, r) => { a[r.fp] = (a[r.fp] || 0) + 1; return a; }, {}))
      .map(([fp, n]) => ({ fp, n, role: fp === CFG.targetFp ? 'target(그대로확장)' : '비대상(exclude)' })).sort((a, b) => b.n - a.n || (a.fp < b.fp ? -1 : 1));

    report.coarseTotal = coarse.length;
    report.target = target.length; report.excluded = nonTarget.length; report.other = 0; // exclude=nonTarget 전량 → other 0
    report.targetExcludeIntersection = intersection;
    report.excludeFps = excludeFps;
    report.fpDistribution = fpDistribution;
    report.target_master_ids = masterIds;
    report.rollback_master_ids = masterIds;
    report.exclude_master_ids = excludeIds;
    report.excludeDetail = nonTarget.map((r) => ({ id: r.id, name: r.name, fp: r.fp })).sort((a, b) => (a.id < b.id ? -1 : 1));

    // 6) 함량·제형·경로·안전지문(fp) 동질성
    const doses = [...new Set(target.map((r) => strengthOf(r.spec)))];
    const forms = [...new Set(target.map((r) => r.form))];
    const routes = [...new Set(target.map((r) => r.route))];
    const targetFpsDistinct = [...new Set(target.map((r) => r.fp))];
    report.homogeneity = { dose: doses, form: forms, route: routes, targetFpDistinct: targetFpsDistinct.length };
    const nonOralNames = target.filter((r) => r.route !== 'oral').map((r) => r.name);
    report.nonOralNames = nonOralNames;

    // 3·5) 슬롯: e약은요 ko canonical 정확히 1/master · authored 충돌 · 기존 needs_review
    let easyExactly1 = 0, authoredConflict = 0, existingNr = 0, easyTotal = 0;
    if (masterIds.length) {
      const slot = retRows<{ easy: string; authored_canon: string; authored_nr: string }>(await ds.query(`
        SELECT count(*) FILTER (WHERE src='mfds_easy_drug' AND st='canonical')::text easy,
               count(*) FILTER (WHERE src IN ('mfds_drug_otc','nutrition_combo') AND st='canonical')::text authored_canon,
               count(*) FILTER (WHERE src IN ('mfds_drug_otc','nutrition_combo') AND st='needs_review')::text authored_nr
        FROM (SELECT s.source_type src, s.status st FROM shared_product_descriptions s
              WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) t`, [masterIds]))[0];
      easyTotal = parseInt(slot.easy, 10); authoredConflict = parseInt(slot.authored_canon, 10); existingNr = parseInt(slot.authored_nr, 10);
      const per = retRows<{ n: string }>(await ds.query(
        `SELECT count(*)::text n FROM unnest($1::uuid[]) mid WHERE (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.source_type='mfds_easy_drug' AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1`, [masterIds]))[0];
      easyExactly1 = parseInt(per.n, 10);
    }
    report.easyCanonicalExactly1 = easyExactly1; report.easyCanonicalTotal = easyTotal;
    report.authoredCanonicalConflict = authoredConflict; report.existingAuthoredNeedsReview = existingNr;

    // 4) draft HTML 빌드·검증
    const built = buildDrugOtcConsumerHtml(d.content_json as never, { title: d.title });
    const draftChecks = {
      missingFields: built.missing, htmlLen: built.html.length, contentHash: md5(built.html),
      hasTable: built.html.includes('<table'), hasComment: built.html.includes('<!--'),
      doubleEscape: built.html.includes('&amp;lt;') || built.html.includes('&amp;gt;'),
      hasSdWarn: built.html.includes('sd-warn'),
    };
    report.draftChecks = draftChecks;
    report.summary = String((d.content_json as any)?.summaryTable?.['성분'] ?? '') || null;

    // 8) 예상 write (정책 §2-A · runner writePlan 동일 산식)
    const authoredNrInsert = CFG.expected - existingNr;
    report.writePlan = {
      spd: { STEP_A_authored_needs_review_INSERT: authoredNrInsert, STEP_B_easy_canonical_demote: CFG.expected, STEP_B_authored_canonical_flip: CFG.expected, total: authoredNrInsert + CFG.expected * 2 },
      audit: { canonical_replaced_INSERT: CFG.expected, total: CFG.expected },
      grand_total: authoredNrInsert + CFG.expected * 3,
    };

    // 9) GROUP_REGISTRY 등재용 config 초안 (excludeFp 전량 명시 → runner other===0 게이트 충족)
    report.groupRegistryDraft = {
      [CFG.registryKey]: {
        key: CFG.key, ingredient: CFG.ingredient, dose: CFG.dose, formKeyword: CFG.formKeyword,
        candidate: CFG.candidate, targetFp: CFG.targetFp,
        excludeFp: excludeFps.length === 1 ? excludeFps[0] : excludeFps,
        expected: CFG.expected, excludedExpected: CFG.excludedExpected,
        authoredSource: CFG.authoredSource, outBase: CFG.outBase,
      },
    };

    // ── 게이트 판정 ──
    if (target.length !== CFG.expected) report.anomalies.push(`target ${target.length} !== expected ${CFG.expected}`);
    if (nonTarget.length !== CFG.excludedExpected) report.anomalies.push(`excluded ${nonTarget.length} !== ${CFG.excludedExpected}`);
    if (new Set(masterIds).size !== masterIds.length) report.anomalies.push('target master 중복');
    if (intersection !== 0) report.anomalies.push(`target∩exclude ${intersection} !== 0`);
    if (easyExactly1 !== CFG.expected) report.anomalies.push(`e약은요 canonical 정확히1 아님 (${easyExactly1}/${CFG.expected})`);
    if (authoredConflict !== 0) report.anomalies.push(`authored canonical 충돌 ${authoredConflict}`);
    if (doses.length !== 1 || doses[0] !== CFG.dose) report.anomalies.push(`함량 비동질 ${JSON.stringify(doses)}`);
    if (forms.length !== 1 || forms[0] !== '정') report.anomalies.push(`제형 비동질 ${JSON.stringify(forms)}`);
    if (routes.length !== 1 || routes[0] !== 'oral') report.anomalies.push(`경로 비동질 ${JSON.stringify(routes)}`);
    if (targetFpsDistinct.length !== 1) report.anomalies.push(`안전지문(fp) 비동질 distinct ${targetFpsDistinct.length}`);
    if (nonOralNames.length) report.anomalies.push(`target 비경구 혼입 ${nonOralNames.length}`);
    if (draftChecks.missingFields.length) report.anomalies.push(`draft 필수필드 누락 ${draftChecks.missingFields.join(',')}`);
    if (draftChecks.hasTable) report.anomalies.push('draft <table>');
    if (draftChecks.hasComment) report.anomalies.push('draft 주석');
    if (draftChecks.doubleEscape) report.anomalies.push('draft 이중 escape');
    if (!draftChecks.hasSdWarn) report.anomalies.push('draft sd-warn 없음');
    if (report.writePlan.spd.total !== 114) report.anomalies.push(`예상 SPD ${report.writePlan.spd.total} !== 114`);
    if (report.writePlan.audit.total !== 38) report.anomalies.push(`예상 audit ${report.writePlan.audit.total} !== 38`);

    report.verdict = report.anomalies.length ? 'ABORT' : 'READY';
  } finally {
    await ds.destroy();
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'otc-loratadine-10mg-upgrade-prep-v1.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({
    verdict: report.verdict, anomalies: report.anomalies,
    target: `${report.target}/${CFG.expected}`, excluded: report.excluded, other: report.other, intersection: report.targetExcludeIntersection,
    excludeFps: report.excludeFps, homogeneity: report.homogeneity,
    easyExactly1: report.easyCanonicalExactly1, authoredConflict: report.authoredCanonicalConflict, existingNr: report.existingAuthoredNeedsReview,
    draftChecks: report.draftChecks, writePlan: report.writePlan,
    rollback_master_ids_count: report.rollback_master_ids.length,
    groupRegistryDraft: report.groupRegistryDraft,
  }, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
