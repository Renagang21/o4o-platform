/**
 * WO-O4O-OTC-GROUNDED-UPGRADE-NEXT-BATCH-8-AUDIT-NA-V1 — Agent 나. READ-ONLY, DB write 0.
 *
 * NEXT-5 감사(otc-next-5-audit.ts)의 machinery 를 재사용해, bridge SSOT 의 authored그대로확장 fp-entry 를
 * bridge_n desc 로 walk 하며 (완료/진행 groupKey + pilot + 민감약효군 + 비경구 + empty-ingredient 제외)
 * 동일 gate pipeline 으로 최대 8개의 clean Track A READY 후보를 선정한다.
 *
 * 제외 groupKey (완료/진행): 아래 EXCLUDE. + pilot fp 4b4e162690065e8e. + SENSITIVE_RE. + route!=oral.
 * empty-ingredient(다성분 콤보, ingredientOf()='' → LIKE '%()' 부적용)는 이 coarse-by-(ingredient) 파이프라인
 *   대상 아님 → skip(사유 기록).
 *
 * gate (NEXT-5 VERBATIM): fp 재현(target===bridge_n) · easy STORE ko canonical 정확히1/master==target ·
 *   authored canonical 충돌 0 · target 전원 oral · safety(cau) 균일 · source_ref cross-group leak 0.
 *   source_ref out-of-target 이 동일 성분·용량·제형(easy demote 된 선행완료 형제)이면 benign(scope 분리 가능).
 *
 * 산출: src/scripts/data/otc-next-batch-8-audit-v1.json (deterministic: master id asc, fp n desc→fp asc,
 *   후보 target desc→groupKey asc). 콘솔 요약. 2회 실행 byte-compare 외부에서.
 * Usage(apps/api-server): npx tsx src/scripts/otc-next-batch-8-audit.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const BRIDGE = path.resolve(OUT_DIR, 'otc-full-corpus-authored-bridge-groups-v1.json');
const BUCKET = 'authored그대로확장';
const PILOT_FP = '4b4e162690065e8e';
const AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo'];
const SENSITIVE_RE = /아스피린|아세틸살리실산|와파린|클로피도그렐|헤파린|덱사메타손|프레드니솔론|하이드로코르티손|모르핀|코데인|메칠페니데이트|인슐린|레보티록신/;
const WANT_READY = 8;
const MAX_EXAMINE = 30;

// 완료/진행 groupKey (ingredient|strength|form) — 제안 금지
const EXCLUDE = new Set<string>([
  '에르도스테인|300밀리그램|정',
  '트리메부틴말레산염|100밀리그램|정', '트리메부틴말레산염|150밀리그램|정',
  '바실루스리케니포르미스균|250밀리그램|캡슐',
  '디오스민|300밀리그램|캡슐',
  '로라타딘|10밀리그램|정',
  '알벤다졸|400밀리그램|정',
  '알마게이트|500밀리그램|정',
  '클로닉신리시네이트|125밀리그램|연질캡슐', '클로닉신리시네이트|125밀리그램|정',
  '브로멜라인|100밀리그램|정',
  '아세트아미노펜|325밀리그램|연질캡슐',
  '나프록센|250밀리그램|연질캡슐',
  '니자티딘|75밀리그램|정', '엘카르니틴|330밀리그램|정', '소브레롤|200밀리그램|캡슐',
]);

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

// ── fingerprintOf 정본 VERBATIM (drug-otc-grounded-upgrade-runner / bridge integration) ──
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
function fingerprintOf(name: string, spec: string, content: string): { fp: string; route: string; form: string; cauHash: string } {
  let sec = easySections(content || '');
  if (Object.keys(sec).length === 0) sec = freeSections(content || '');
  const { ind, dos, cau } = bucketSections(sec);
  const ingredient = ingredientOf(name); const strength = strengthOf(spec); const form = formOf(name); const route = routeSig(name);
  const cauHash = H(normalize(cau));
  const fp = H([H(normalize(ind)), H(normalize(dos)), cauHash, H(`${ingredient}|${strength}`), H(form), route].join('|'));
  return { fp, route, form, cauHash };
}

type Entry = { groupKey: string; pharmKey: string; fp: string; bridge_n: number; ingredient: string; strength: string; form: string; route: string; atc: string; sample: string };

async function evaluate(ds: any, e: Entry): Promise<any> {
  const t = { ingredient: e.ingredient, strength: e.strength, form: e.form };
  const groupKey = e.groupKey; const bridgeFp = e.fp; const bridge_n = e.bridge_n;
  const sensitive = SENSITIVE_RE.test(t.ingredient);

  // STEP 1: authored draft (source_ref)
  const drafts: Array<{ cid: string }> = await ds.query(
    `SELECT candidate_id::text cid FROM product_candidate_description_drafts
     WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL AND seed_json->>'groupKey'=$1 ORDER BY candidate_id`, [groupKey]);
  const authoredSourceRef = drafts[0]?.cid ?? null;
  const draftCount = drafts.length;

  // STEP 2-4: coarse (runner VERBATIM: LATERAL 최장 easy STORE ko canonical)
  const coarse: Array<{ id: string; name: string; spec: string; content: string }> = await ds.query(
    `SELECT pm.id::text id, pm.name, pm.specification spec, es.content
     FROM product_masters pm
     JOIN LATERAL (SELECT content FROM shared_product_descriptions s
         WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
           AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
         ORDER BY length(s.content) DESC LIMIT 1) es ON true
     WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
     ORDER BY pm.id`, [t.ingredient, t.strength, t.form]);

  const withFp = coarse.map((r) => ({ ...r, ...fingerprintOf(r.name, r.spec, r.content) }));
  const target = withFp.filter((r) => r.fp === bridgeFp);
  const nonTarget = withFp.filter((r) => r.fp !== bridgeFp);
  const masterIds = target.map((r) => r.id).sort();
  const rollbackIds = [...masterIds];

  const fpDist = Object.entries(withFp.reduce((a: Record<string, { n: number; form: string; route: string; sample: string }>, r) => {
    const x = a[r.fp] || (a[r.fp] = { n: 0, form: r.form, route: r.route, sample: r.name }); x.n++; return a;
  }, {})).map(([fp, d]) => ({ fp, n: d.n, form: d.form, route: d.route, sample: d.sample, target: fp === bridgeFp }))
    .sort((x, y) => y.n - x.n || (x.fp < y.fp ? -1 : x.fp > y.fp ? 1 : 0));
  const excludeFormBreak = nonTarget.reduce((a: Record<string, number>, r) => { a[r.form] = (a[r.form] || 0) + 1; return a; }, {});

  const distinctForms = [...new Set(target.map((r) => r.form))].sort();
  const distinctRoutes = [...new Set(target.map((r) => r.route))].sort();
  const distinctCauHashes = [...new Set(target.map((r) => r.cauHash))];
  const distinctStrengths = [...new Set(target.map((r) => strengthOf(r.spec)))].sort();
  const nonOralInTarget = target.filter((r) => r.route !== 'oral').map((r) => r.name);

  // STEP 4/5: slot state (target)
  let easyExactly1 = 0, easyCanonicalTotal = 0, authoredConflict = 0, existingNr = 0;
  if (masterIds.length) {
    const slot: Array<{ easy: string; authored_canon: string; authored_nr: string }> = await ds.query(`
      SELECT count(*) FILTER (WHERE src='mfds_easy_drug' AND st='canonical')::text easy,
             count(*) FILTER (WHERE src=ANY($2) AND st='canonical')::text authored_canon,
             count(*) FILTER (WHERE src=ANY($2) AND st='needs_review')::text authored_nr
      FROM (SELECT s.source_type src, s.status st FROM shared_product_descriptions s
            WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) t`,
      [masterIds, AUTHORED_SOURCES]);
    easyCanonicalTotal = parseInt(slot[0].easy, 10); authoredConflict = parseInt(slot[0].authored_canon, 10); existingNr = parseInt(slot[0].authored_nr, 10);
    const per: Array<{ n: string }> = await ds.query(
      `SELECT count(*)::text n FROM unnest($1::uuid[]) mid
       WHERE (SELECT count(*) FROM shared_product_descriptions s
          WHERE s.master_id=mid AND s.source_type='mfds_easy_drug' AND s.status='canonical'
            AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1`, [masterIds]);
    easyExactly1 = parseInt(per[0].n, 10);
  }

  // STEP 9: source_ref out-of-target — same-group(benign) vs cross-group(HOLD)
  let refScopeMasters = 0; const refOutOfTarget: string[] = []; let outSameGroup = 0, outCrossGroup = 0; const crossGroupSamples: string[] = [];
  if (authoredSourceRef) {
    const rs: Array<{ n: string }> = await ds.query(
      `SELECT count(DISTINCT master_id)::text n FROM shared_product_descriptions
       WHERE source_ref_id=$1::uuid AND source_type=ANY($2) AND description_type='STORE'
         AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [authoredSourceRef, AUTHORED_SOURCES]);
    refScopeMasters = parseInt(rs[0].n, 10);
    if (masterIds.length) {
      const ro: Array<{ mid: string; name: string; spec: string }> = await ds.query(
        `SELECT DISTINCT s.master_id::text mid, pm.name, pm.specification spec
         FROM shared_product_descriptions s JOIN product_masters pm ON pm.id=s.master_id
         WHERE s.source_ref_id=$1::uuid AND s.source_type=ANY($2) AND s.description_type='STORE'
           AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL
           AND s.master_id <> ALL($3::uuid[]) ORDER BY 1`, [authoredSourceRef, AUTHORED_SOURCES, masterIds]);
      for (const r of ro) {
        refOutOfTarget.push(r.mid);
        const same = ingredientOf(r.name) === t.ingredient && strengthOf(r.spec) === t.strength && formOf(r.name) === t.form;
        if (same) outSameGroup++; else { outCrossGroup++; if (crossGroupSamples.length < 5) crossGroupSamples.push(`${r.name} [${r.spec}]`); }
      }
    }
  }

  // STEP 10: existing EN for target + reusable reviewed EN from ref
  let mastersWithEn = 0, enCanonical = 0, enNeedsReview = 0;
  if (masterIds.length) {
    const en: Array<{ mwe: string; canon: string; nr: string }> = await ds.query(`
      SELECT count(DISTINCT master_id)::text mwe, count(*) FILTER (WHERE status='canonical')::text canon, count(*) FILTER (WHERE status='needs_review')::text nr
      FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL`, [masterIds]);
    mastersWithEn = parseInt(en[0].mwe, 10); enCanonical = parseInt(en[0].canon, 10); enNeedsReview = parseInt(en[0].nr, 10);
  }
  let reusableEnFromRef = 0, reusableEnMd5Count = 0;
  if (authoredSourceRef) {
    const rEn: Array<{ n: string; md5c: string }> = await ds.query(`
      SELECT count(*)::text n, count(DISTINCT md5(content))::text md5c
      FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL`, [authoredSourceRef]);
    reusableEnFromRef = parseInt(rEn[0].n, 10); reusableEnMd5Count = parseInt(rEn[0].md5c, 10);
  }
  // byte-identical EN reconstruction feasible = reusable EN exists and is uniform (single md5)
  const enReuseFeasible = reusableEnFromRef > 0 && reusableEnMd5Count === 1;

  const reproduced = target.length === bridge_n;
  // 정본 write 산식 (coordinator 확정): T = target master 수
  //   ko = 4T : authored needs_review INSERT + easy demote + authored canonical flip + audit
  //   en = 2T : en needs_review INSERT + en canonical flip
  //   총  = 6T
  const T = masterIds.length;
  const authoredNrInsert = T;
  const koWriteTotal = 4 * T;
  const enNrInsert = T, enCanonFlip = T;
  const enWriteTarget = 2 * T;

  const reasons: string[] = [];
  if (sensitive) reasons.push('민감 약효군');
  if (nonOralInTarget.length) reasons.push(`target 비경구 혼입 ${nonOralInTarget.length}`);
  if (!authoredSourceRef) reasons.push('authored draft 없음');
  if (draftCount > 1) reasons.push(`authored draft 다중 ${draftCount}`);
  if (authoredConflict > 0) reasons.push(`authored canonical 충돌 ${authoredConflict}`);
  if (masterIds.length === 0) reasons.push('target master 0');
  if (!reproduced) reasons.push(`fp 재현 불일치(target ${target.length} !== bridge ${bridge_n})`);
  if (masterIds.length && easyExactly1 !== masterIds.length) reasons.push(`easy canonical 정확히1 아님(${easyExactly1}/${masterIds.length})`);
  if (distinctCauHashes.length > 1) reasons.push(`target safety 불균일(${distinctCauHashes.length})`);
  if (outCrossGroup > 0) reasons.push(`source_ref cross-group leak ${outCrossGroup} (${crossGroupSamples.join('; ')})`);
  const verdict = sensitive || nonOralInTarget.length ? 'EXCLUDED' : reasons.length ? 'HOLD' : 'READY';

  return {
    verdict, groupKey, pharmKey: e.pharmKey, sample: e.sample, atc: e.atc,
    bridgeFp, bridge_n, coarseTotal: coarse.length,
    target_master: target.length, target_reproduced: reproduced,
    exclude_nonTarget: nonTarget.length, excludeFormBreak, fpDistribution: fpDist,
    easyCanonicalExactly1: easyExactly1, easyCanonicalTotal, authoredConflict, existingAuthoredNeedsReview: existingNr,
    homogeneity: { distinctForms, distinctRoutes, distinctStrengths, distinctCauHashCount: distinctCauHashes.length, nonOralInTarget },
    sensitive, authored_source_ref_id: authoredSourceRef, authored_draft_count: draftCount,
    source_ref_scope: { masters_sharing_ref: refScopeMasters, out_of_target_total: refOutOfTarget.length, out_same_group_already_applied: outSameGroup, out_cross_group_leak: outCrossGroup, cross_group_samples: crossGroupSamples, scope_separable: outCrossGroup === 0 },
    existing_en: { masters_with_en: mastersWithEn, en_canonical: enCanonical, en_needs_review: enNeedsReview, reusable_reviewed_en_from_ref: reusableEnFromRef, reusable_en_distinct_md5: reusableEnMd5Count, byte_identical_en_reuse_feasible: enReuseFeasible },
    write_formula: 'ko=4T (authored NR INSERT + easy demote + authored flip + audit) · en=2T (en NR INSERT + en canonical flip) · total=6T',
    target_T: T,
    expected_ko_write: { STEP_A_authored_needs_review_INSERT: authoredNrInsert, STEP_B_easy_canonical_demote: T, STEP_B_authored_canonical_flip: T, audit_canonical_replaced: T, ko_total: koWriteTotal },
    expected_en_write: { en_needs_review_INSERT: enNrInsert, en_canonical_flip: enCanonFlip, en_total: enWriteTarget },
    total_write: koWriteTotal + enWriteTarget,
    stop_reason: reasons,
    target_master_ids: masterIds,
    rollback_master_ids: rollbackIds,
  };
}

async function main(): Promise<void> {
  const bridge = JSON.parse(readFileSync(BRIDGE, 'utf8'));
  const barr: any[] = bridge.groups || bridge;
  // authored그대로확장 entry (fp group) — pharmKey 당 max bucket 로 dedupe
  const byPk = new Map<string, any>();
  for (const g of barr) {
    const n = (g.counts || {})[BUCKET] || 0; if (n <= 0) continue;
    const prev = byPk.get(g.pharmKey);
    if (!prev || n > ((prev.counts || {})[BUCKET] || 0)) byPk.set(g.pharmKey, g);
  }
  let pool: Entry[] = [...byPk.values()].map((g) => ({
    groupKey: `${g.ingredient}|${g.strength}|${g.form}`, pharmKey: g.pharmKey, fp: g.fingerprint, bridge_n: g.counts[BUCKET],
    ingredient: g.ingredient, strength: g.strength, form: g.form, route: g.route, atc: g.atc_code, sample: g.sampleName,
  }));
  // 제외: pilot fp · route!=oral · empty-ingredient · EXCLUDE groupKey · SENSITIVE
  const skipped: any[] = [];
  pool = pool.filter((e) => {
    if (e.fp === PILOT_FP) { skipped.push({ groupKey: e.groupKey, reason: 'pilot' }); return false; }
    if (e.route !== 'oral') { skipped.push({ groupKey: e.groupKey, reason: `non-oral(${e.route})` }); return false; }
    if (!e.ingredient) { skipped.push({ groupKey: e.groupKey, reason: 'empty-ingredient(다성분 콤보 — coarse-by-(ingredient) 부적용)', bridge_n: e.bridge_n }); return false; }
    if (EXCLUDE.has(e.groupKey)) { skipped.push({ groupKey: e.groupKey, reason: 'excluded(완료/진행)' }); return false; }
    if (SENSITIVE_RE.test(e.ingredient)) { skipped.push({ groupKey: e.groupKey, reason: '민감 약효군' }); return false; }
    return true;
  });
  pool.sort((a, b) => b.bridge_n - a.bridge_n || (a.pharmKey < b.pharmKey ? -1 : a.pharmKey > b.pharmKey ? 1 : 0));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();

  const examined: any[] = []; const ready: any[] = [];
  try {
    for (const e of pool) {
      if (ready.length >= WANT_READY) break;
      if (examined.length >= MAX_EXAMINE) break;
      const r = await evaluate(ds, e);
      examined.push(r);
      if (r.verdict === 'READY') ready.push(r);
    }
  } finally { if (ds.isInitialized) await ds.destroy(); }

  // 후보 정렬: target desc → groupKey asc (deterministic)
  const readySorted = [...ready].sort((a, b) => b.target_master - a.target_master || (a.groupKey < b.groupKey ? -1 : a.groupKey > b.groupKey ? 1 : 0));
  readySorted.forEach((r, i) => { r.recommended_run_order = i + 1; });

  // 두 실행 묶음 제안 (balance by total write, zero-exclude 우선 낮은 위험)
  // greedy: total write desc 로 정렬 후, 두 bin 에 번갈아(합 작은 쪽에) 배치 — 최대 4 그룹/bin
  const forBundling = [...readySorted].sort((a, b) => b.total_write - a.total_write || (a.groupKey < b.groupKey ? -1 : 1));
  const bundleGa: any[] = [], bundleDa: any[] = []; let sumGa = 0, sumDa = 0;
  for (const r of forBundling) {
    const item = { groupKey: r.groupKey, target: r.target_master, ko: r.expected_ko_write.ko_total, en: r.expected_en_write.en_total, total: r.total_write, zeroExclude: r.exclude_nonTarget === 0 };
    if ((sumGa <= sumDa && bundleGa.length < 4) || bundleDa.length >= 4) { bundleGa.push(item); sumGa += r.total_write; }
    else { bundleDa.push(item); sumDa += r.total_write; }
  }
  const sortBundle = (arr: any[]) => arr.sort((a, b) => b.target - a.target || (a.groupKey < b.groupKey ? -1 : 1));
  sortBundle(bundleGa); sortBundle(bundleDa);

  const out = {
    wo: 'WO-O4O-OTC-GROUNDED-UPGRADE-NEXT-BATCH-8-AUDIT-NA-V1', agent: '나', readOnly: true, dbWrite: 0,
    track: 'A (grounded upgrade: e약은요 STORE ko canonical → authored canonical 교체 + EN 동반)',
    basis: 'bridge authored그대로확장 fp-entry walk(bridge_n desc) — 완료/진행+pilot+민감+비경구+empty-ingredient 제외, NEXT-5 gate VERBATIM',
    generatedAt_note: 'deterministic — no timestamps (byte-stable)',
    poolSize: pool.length, examinedCount: examined.length, wantReady: WANT_READY,
    excludedGroupKeys: [...EXCLUDE].sort(),
    skippedTopSample: skipped.filter((s) => s.reason.startsWith('empty')).sort((a, b) => (b.bridge_n || 0) - (a.bridge_n || 0)).slice(0, 8),
    candidates_examined: examined,
    write_formula: 'T=target master 수 · ko=4T · en=2T · total=6T',
    grand_totals: {
      target_T: readySorted.reduce((a, r) => a + r.target_master, 0),
      ko: readySorted.reduce((a, r) => a + r.expected_ko_write.ko_total, 0),
      en: readySorted.reduce((a, r) => a + r.expected_en_write.en_total, 0),
      total: readySorted.reduce((a, r) => a + r.total_write, 0),
    },
    ready_selected: readySorted.map((r) => ({ order: r.recommended_run_order, groupKey: r.groupKey, targetFp: r.bridgeFp, target: r.target_master, exclude: r.exclude_nonTarget, ko: r.expected_ko_write.ko_total, en: r.expected_en_write.en_total, total: r.total_write, source_ref_id: r.authored_source_ref_id, reusable_en: r.existing_en.reusable_reviewed_en_from_ref, en_reuse_feasible: r.existing_en.byte_identical_en_reuse_feasible })),
    bundles: {
      에이전트가: { groups: bundleGa, group_count: bundleGa.length, total_write: sumGa },
      에이전트다: { groups: bundleDa, group_count: bundleDa.length, total_write: sumDa },
    },
    summary: {
      READY: ready.length, HOLD: examined.filter((r) => r.verdict === 'HOLD').length, EXCLUDED: examined.filter((r) => r.verdict === 'EXCLUDED').length,
      selected: readySorted.length,
    },
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, 'otc-next-batch-8-audit-v1.json'), JSON.stringify(out, null, 2), 'utf8');

  console.log('JSON_SUMMARY_BEGIN');
  console.log(JSON.stringify({
    poolSize: pool.length, examined: examined.length, summary: out.summary,
    examined_lines: examined.map((c) => `${c.verdict} | ${c.groupKey} [fp ${c.bridgeFp}] target ${c.target_master}/bridge ${c.bridge_n} coarse ${c.coarseTotal} exclude ${c.exclude_nonTarget}${JSON.stringify(c.excludeFormBreak)} easy1 ${c.easyCanonicalExactly1} 충돌 ${c.authoredConflict} nr ${c.existingAuthoredNeedsReview} ref ${c.authored_source_ref_id ? c.authored_source_ref_id.slice(0, 8) : 'none'} refScope ${c.source_ref_scope.masters_sharing_ref}(same ${c.source_ref_scope.out_same_group_already_applied}/cross ${c.source_ref_scope.out_cross_group_leak}) reuseEN ${c.existing_en.reusable_reviewed_en_from_ref}(md5 ${c.existing_en.reusable_en_distinct_md5},feasible ${c.existing_en.byte_identical_en_reuse_feasible}) ko ${c.expected_ko_write.ko_total} en ${c.expected_en_write.en_total} total ${c.total_write}${c.stop_reason.length ? ' STOP:' + c.stop_reason.join(';') : ''}`),
    grand_totals: out.grand_totals,
    ready_selected: out.ready_selected,
    bundles: out.bundles,
  }, null, 2));
  console.log('JSON_SUMMARY_END');
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
