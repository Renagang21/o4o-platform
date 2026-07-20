/**
 * WO-O4O-OTC-GROUNDED-UPGRADE-NEXT-BATCH-AUDIT-GA-V1 — 바실루스·디오스민 이후 Track A clean 후보 (read-only, DB write 0)
 *
 * 직전 감사(NEXT-CANDIDATES-GA-V1)에서 선정·배정된 groupKey 및 파일럿을 제외하고, bridge full-content fingerprint
 * 기준으로 다음 clean 후보 Top 5 를 추가 선정한다.
 *
 * 배정/제외 groupKey (groupKey 단위 제외 — 보조 fp 재선정 방지):
 *   에르도스테인|300밀리그램|정 (파일럿 26 LIVE) · 트리메부틴말레산염|100밀리그램|정 (에이전트 다 작업 중)
 *   · 바실루스리케니포르미스균|250밀리그램|캡슐 · 디오스민|300밀리그램|캡슐 (직전 Top3)
 *
 * 방법 (파일럿/직전 감사 verbatim 계승):
 *   1. bridge SSOT authored그대로확장 fp-entry → groupKey(성분|용량|제형)별 **dominant(최대 count) fp 1개**로 대표(직전 Top3 규약).
 *   2. 제외 groupKey 배제 후 count desc(동률 pharmKey asc, fp asc) 정렬.
 *   3. 각 후보: coarse e약은요 STORE ko canonical 열거 → fingerprintOf() 로 fp 재고정. target=fp===dominant fp.
 *      나머지 fp = carve-out(bridge bucket 으로 안전지문불일치/검토후확장/보조authored 분류). **coarse 전체 미적용.**
 *   4. 게이트: 민감 약효군(SENSITIVE_RE) 제외 · 비경구 제외 · authored draft(source_ref) 존재 · authored 충돌 0 ·
 *      e약은요 STORE ko canonical 정확히 1/master · fp 재현(target === bridge n). → 첫 READY 5 선정.
 *   5. 산출: group 별 target/exclude master IDs · source_ref_id · 예상 SPD/audit write.
 *
 * 금지: DB write · coarse 그룹 전체 적용 · 안전불일치 편입 · 기존 canonical 변경 · 배정 groupKey 개입.
 * 결정론: 정렬 고정. 재실행 byte-identical.
 *
 * Usage(apps/api-server): DB_HOST=127.0.0.1 DB_PORT=5442 ... NODE_ENV= npx tsx src/scripts/drug-otc-grounded-upgrade-next-batch-audit.ts
 * 산출: src/scripts/data/otc-grounded-upgrade-next-batch-v1.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const BRIDGE = path.resolve(OUT_DIR, 'otc-full-corpus-authored-bridge-groups-v1.json');
const BUCKET = 'authored그대로확장';
const PICK = 5;
const EVAL_LIMIT = 14; // 대표 groupKey 상위 몇 개까지 DB 평가 (첫 READY 5 확보 + 백업 여유)
// 배정/완료 groupKey (groupKey 단위 제외)
const EXCLUDE_GROUPKEYS = new Set([
  '에르도스테인|300밀리그램|정',
  '트리메부틴말레산염|100밀리그램|정',
  '바실루스리케니포르미스균|250밀리그램|캡슐',
  '디오스민|300밀리그램|캡슐',
]);
const SENSITIVE_RE = /아스피린|아세틸살리실산|와파린|클로피도그렐|헤파린|덱사메타손|프레드니솔론|하이드로코르티손|모르핀|코데인|메칠페니데이트|인슐린|레보티록신/;
const AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo'];

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

// ── fingerprintOf = bridge 정본 VERBATIM (파일럿/직전 감사 채용본) ──
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
function fingerprintOf(name: string, spec: string, content: string): { fp: string; route: string } {
  let sec = easySections(content || '');
  if (Object.keys(sec).length === 0) sec = freeSections(content || '');
  const { ind, dos, cau } = bucketSections(sec);
  const ingredient = ingredientOf(name); const strength = strengthOf(spec); const form = formOf(name); const route = routeSig(name);
  const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${ingredient}|${strength}`), H(form), route].join('|'));
  return { fp, route };
}

async function main(): Promise<void> {
  const bridge = JSON.parse(fs.readFileSync(BRIDGE, 'utf8'));
  const arr: any[] = bridge.groups || bridge;
  // bridge fp → bucket (carve-out 분류용)
  const fpBucket = new Map<string, string>();
  for (const x of arr) fpBucket.set(x.fingerprint, x.bucket);
  // authored그대로확장 fp-entry → groupKey 별 dominant(최대 count) fp 대표
  const entries = arr.filter((x) => (x.counts || {})[BUCKET] > 0)
    .map((x) => ({ fp: x.fingerprint as string, pharmKey: x.pharmKey as string, groupKey: `${x.ingredient}|${x.strength}|${x.form}`, ingredient: x.ingredient as string, strength: x.strength as string, form: x.form as string, route: x.route as string, atc: x.atc_code as string, bridge_n: x.counts[BUCKET] as number, sample: x.sampleName as string }));
  const byGroup = new Map<string, typeof entries[number]>();
  for (const e of entries) { const cur = byGroup.get(e.groupKey); if (!cur || e.bridge_n > cur.bridge_n || (e.bridge_n === cur.bridge_n && e.fp < cur.fp)) byGroup.set(e.groupKey, e); }
  const reps = [...byGroup.values()]
    .filter((g) => !EXCLUDE_GROUPKEYS.has(g.groupKey))
    .sort((a, b) => b.bridge_n - a.bridge_n || (a.pharmKey < b.pharmKey ? -1 : a.pharmKey > b.pharmKey ? 1 : 0) || (a.fp < b.fp ? -1 : 1));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();

  const evaluated: any[] = [];
  for (const g of reps.slice(0, EVAL_LIMIT)) {
    const sensitive = SENSITIVE_RE.test(g.ingredient);
    const coarse: Array<{ id: string; name: string; spec: string; content: string }> = await ds.query(
      `SELECT pm.id::text id, pm.name, pm.specification spec, es.content
       FROM product_masters pm
       JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) es ON true
       WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
       ORDER BY pm.id`, [g.ingredient, g.strength, g.form]);
    const withFp = coarse.map((r) => ({ ...r, ...fingerprintOf(r.name, r.spec, r.content) }));
    const target = withFp.filter((r) => r.fp === g.fp);
    const nonTarget = withFp.filter((r) => r.fp !== g.fp);
    const masterIds = target.map((r) => r.id).sort();
    const nonOralInTarget = target.filter((r) => r.route !== 'oral').map((r) => r.name);
    // carve-out 분류 (bridge bucket 기준)
    const excludeByBucket: Record<string, string[]> = {};
    for (const r of nonTarget) { const b = fpBucket.get(r.fp) || '미분류'; (excludeByBucket[b] ??= []).push(r.id); }
    for (const k of Object.keys(excludeByBucket)) excludeByBucket[k].sort();
    const excludeMasterIds = nonTarget.map((r) => r.id).sort();

    const groupKey = g.groupKey;
    const drafts: Array<{ cid: string }> = await ds.query(
      `SELECT candidate_id::text cid FROM product_candidate_description_drafts WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL AND seed_json->>'groupKey'=$1 ORDER BY candidate_id`, [groupKey]);
    const authoredSourceRef = drafts[0]?.cid ?? null;

    let easyExactly1 = 0, authoredConflict = 0, existingNr = 0, easyTotal = 0;
    if (masterIds.length) {
      const slot: Array<{ easy: string; authored_canon: string; authored_nr: string }> = await ds.query(`
        SELECT count(*) FILTER (WHERE src='mfds_easy_drug' AND st='canonical')::text easy,
               count(*) FILTER (WHERE src=ANY($2) AND st='canonical')::text authored_canon,
               count(*) FILTER (WHERE src=ANY($2) AND st='needs_review')::text authored_nr
        FROM (SELECT s.source_type src, s.status st FROM shared_product_descriptions s
              WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) t`,
        [masterIds, AUTHORED_SOURCES]);
      easyTotal = parseInt(slot[0].easy, 10); authoredConflict = parseInt(slot[0].authored_canon, 10); existingNr = parseInt(slot[0].authored_nr, 10);
      const per: Array<{ n: string }> = await ds.query(
        `SELECT count(*)::text n FROM unnest($1::uuid[]) mid WHERE (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.source_type='mfds_easy_drug' AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1`, [masterIds]);
      easyExactly1 = parseInt(per[0].n, 10);
    }

    const reproduced = target.length === g.bridge_n;
    const reasons: string[] = [];
    if (sensitive) reasons.push('민감 약효군');
    if (g.route !== 'oral') reasons.push(`비경구(${g.route})`);
    if (nonOralInTarget.length) reasons.push(`target 비경구 혼입 ${nonOralInTarget.length}`);
    if (!authoredSourceRef) reasons.push('authored draft 없음');
    if (drafts.length > 1) reasons.push(`authored draft 다중 ${drafts.length}`);
    if (authoredConflict > 0) reasons.push(`authored canonical 충돌 ${authoredConflict}`);
    if (masterIds.length === 0) reasons.push('target master 0');
    if (!reproduced) reasons.push(`fp 재현 불일치(target ${target.length} !== bridge ${g.bridge_n})`);
    if (easyExactly1 !== masterIds.length) reasons.push(`e약은요 canonical 정확히1 아님(${easyExactly1}/${masterIds.length})`);
    const verdict = reasons.length ? 'EXCLUDED' : 'READY';

    const authoredNrInsert = masterIds.length - existingNr;
    evaluated.push({
      groupKey, pharmKey: g.pharmKey, targetFp: g.fp, sample: g.sample, route: g.route, atc: g.atc,
      sameIngredientAsAssigned: g.ingredient === '트리메부틴말레산염',
      bridge_n: g.bridge_n, coarseTotal: coarse.length,
      target_master: target.length, target_reproduced: reproduced,
      exclude_nonTarget: nonTarget.length, exclude_byBucket: Object.fromEntries(Object.entries(excludeByBucket).map(([k, v]) => [k, v.length])),
      easyCanonicalExactly1: easyExactly1, easyCanonicalTotal: easyTotal,
      authoredConflict, existingAuthoredNeedsReview: existingNr,
      nonOralInTarget, sensitive, authored_source_ref_id: authoredSourceRef,
      verdict, excludeReasons: reasons,
      예상write: {
        STEP_A_authored_needs_review_INSERT: authoredNrInsert,
        STEP_B_easy_canonical_demote: masterIds.length,
        STEP_B_authored_canonical_flip: masterIds.length,
        audit_log_canonical_replaced: masterIds.length,
        SPD_write_total: authoredNrInsert + masterIds.length + masterIds.length,
        audit_write_total: masterIds.length,
        grand_total: authoredNrInsert + masterIds.length * 3,
      },
      target_master_ids: masterIds,
      exclude_master_ids: excludeMasterIds,
      exclude_master_ids_byBucket: excludeByBucket,
    });
  }
  await ds.destroy();

  const ready = evaluated.filter((c) => c.verdict === 'READY');
  const top5 = ready.slice(0, PICK);

  const out = {
    wo: 'WO-O4O-OTC-GROUNDED-UPGRADE-NEXT-BATCH-AUDIT-GA-V1', readOnly: true, dbWrite: 0,
    track: 'A (grounded upgrade: e약은요 canonical → authored canonical 교체)',
    basis: 'bridge full-content fingerprint (fingerprintOf 정본) — groupKey별 dominant fp 대표, target fp 하위 그룹만 추출',
    excludedGroupKeys: [...EXCLUDE_GROUPKEYS],
    evalLimit: EVAL_LIMIT, evaluated: evaluated.length,
    top5: top5.map((c) => ({
      groupKey: c.groupKey, targetFp: c.targetFp, sample: c.sample, atc: c.atc, route: c.route,
      sameIngredientAsAssigned: c.sameIngredientAsAssigned,
      승격대상_master: c.target_master, coarseTotal: c.coarseTotal, 편입제외_nonTarget: c.exclude_nonTarget, exclude_byBucket: c.exclude_byBucket,
      authored_source_ref_id: c.authored_source_ref_id, easyCanonicalExactly1: c.easyCanonicalExactly1, authoredConflict: c.authoredConflict,
      예상write: c.예상write, target_master_ids: c.target_master_ids, exclude_master_ids: c.exclude_master_ids, exclude_master_ids_byBucket: c.exclude_master_ids_byBucket,
    })),
    evaluatedSummary: evaluated.map((c) => ({ groupKey: c.groupKey, targetFp: c.targetFp, verdict: c.verdict, target_master: c.target_master, bridge_n: c.bridge_n, reasons: c.excludeReasons })),
    summary: { evaluated: evaluated.length, READY: ready.length, EXCLUDED: evaluated.filter((c) => c.verdict === 'EXCLUDED').length, selected: top5.length },
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'otc-grounded-upgrade-next-batch-v1.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({
    summary: out.summary,
    evaluated: evaluated.map((c) => `${c.groupKey} [fp ${c.targetFp}]: ${c.verdict}${c.excludeReasons.length ? '(' + c.excludeReasons.join(',') + ')' : ''} — target ${c.target_master}/bridge ${c.bridge_n}, coarse ${c.coarseTotal}, 제외 ${c.exclude_nonTarget}, easy1 ${c.easyCanonicalExactly1}, 충돌 ${c.authoredConflict}, ref ${c.authored_source_ref_id ? c.authored_source_ref_id.slice(0, 8) : 'none'}${c.sameIngredientAsAssigned ? ' ⚠동일성분' : ''}`),
    top5: top5.map((t) => `${t.groupKey}: 승격 ${t.target_master} (ref ${t.authored_source_ref_id?.slice(0, 8)})${t.sameIngredientAsAssigned ? ' ⚠동일성분(트리메부틴)' : ''}`),
  }, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
