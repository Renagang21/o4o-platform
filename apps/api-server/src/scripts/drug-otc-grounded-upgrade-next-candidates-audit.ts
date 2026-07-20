/**
 * WO-O4O-OTC-GROUNDED-UPGRADE-NEXT-CANDIDATES-AUDIT-GA-V1 — 다음 Track A 승격 후보 (read-only, DB write 0)
 *
 * 에르도스테인 파일럿(fp 4b4e162690065e8e, 26 LIVE) 제외 후, 기존 Top 10 authored그대로확장 fp-group 을
 * **bridge full-content fingerprint(fingerprintOf 정본)** 기준으로 다시 분리해 다음 clean 후보 Top 3 를 선정한다.
 *
 * 방법 (파일럿 verbatim 계승):
 *   1. bridge SSOT(otc-full-corpus-authored-bridge-groups-v1) 에서 authored그대로확장 fp-entry 를 count desc 정렬 → Top 10.
 *      각 entry = 하나의 full-content fingerprint group (bridge 재그룹핑 산물). 에르도스테인 fp 제외 → pool.
 *   2. 각 group: coarse(성분|용량|제형) e약은요 STORE ko canonical master 를 열거 → fingerprintOf() 로 fp 재고정.
 *      target = fp === bridge TARGET_FP → **authored 그대로확장 하위 그룹만 추출**. 나머지 fp = 편입 금지(carve-out).
 *   3. 게이트: 민감 약효군(SENSITIVE_RE) 제외 · 비경구 제외 · authored draft(source_ref) 존재 · authored 충돌 0 ·
 *      e약은요 STORE ko canonical 정확히 1/master · fp 재현(target === bridge n).
 *   4. clean(READY) 후보를 count desc 로 Top 3 선정. group 별 master IDs · source_ref_id · easy 상태 · 예상 write · rollback IDs.
 *
 * 금지: DB write · coarse 그룹 전체 적용 · 안전불일치 편입 · 기존 canonical 변경. (전부 read-only 계산.)
 * 결정론: 정렬 고정(count desc, pharmKey asc, fp asc / master id asc). --verify 로 2회 실행 비교는 외부에서.
 *
 * Usage(apps/api-server): DB_PORT=5442 NODE_ENV= npx tsx src/scripts/drug-otc-grounded-upgrade-next-candidates-audit.ts
 * 산출: src/scripts/data/otc-grounded-upgrade-next-candidates-v1.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const BRIDGE = path.resolve(OUT_DIR, 'otc-full-corpus-authored-bridge-groups-v1.json');
const BUCKET = 'authored그대로확장';
const PILOT_FP = '4b4e162690065e8e';          // 에르도스테인 300mg 정 (제외)
const TOP_N = 10;                              // 기존 Top 10 pool
const TOP_PICK = 3;
const SENSITIVE_RE = /아스피린|아세틸살리실산|와파린|클로피도그렐|헤파린|덱사메타손|프레드니솔론|하이드로코르티손|모르핀|코데인|메칠페니데이트|인슐린|레보티록신/;
const AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo'];

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

// ── fingerprintOf = bridge 정본(drug-otc-full-corpus-authored-bridge-integration.ts) VERBATIM (파일럿 채용본) ──
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
  const bridge = JSON.parse(fs.readFileSync(BRIDGE, 'utf8'));
  const arr: any[] = bridge.groups || bridge;
  // authored그대로확장 fp-entry (각 entry = 하나의 full-content fp group), count desc → Top 10, 에르도스테인 fp 제외
  const entries = arr.filter((x) => (x.counts || {})[BUCKET] > 0)
    .map((x) => ({ fp: x.fingerprint as string, pharmKey: x.pharmKey as string, ingredient: x.ingredient as string, strength: x.strength as string, form: x.form as string, route: x.route as string, atc: x.atc_code as string, bridge_n: x.counts[BUCKET] as number, size: x.size as number, sample: x.sampleName as string }))
    .sort((a, b) => b.bridge_n - a.bridge_n || (a.pharmKey < b.pharmKey ? -1 : a.pharmKey > b.pharmKey ? 1 : 0) || (a.fp < b.fp ? -1 : 1));
  const top10 = entries.slice(0, TOP_N);
  const pool = top10.filter((g) => g.fp !== PILOT_FP);

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();

  const candidates: any[] = [];
  for (const g of pool) {
    const sensitive = SENSITIVE_RE.test(g.ingredient);
    // coarse 열거 (파일럿 LATERAL: 최장 e약은요 STORE ko canonical content)
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
    const fpDist = Object.entries(withFp.reduce((a: Record<string, number>, r) => { a[r.fp] = (a[r.fp] || 0) + 1; return a; }, {}))
      .map(([fp, n]) => ({ fp, n, target: fp === g.fp })).sort((a, b) => b.n - a.n || (a.fp < b.fp ? -1 : 1));

    // authored draft(source_ref) — groupKey = ingredient|strength|form
    const groupKey = `${g.ingredient}|${g.strength}|${g.form}`;
    const drafts: Array<{ cid: string }> = await ds.query(
      `SELECT candidate_id::text cid FROM product_candidate_description_drafts WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL AND seed_json->>'groupKey'=$1 ORDER BY candidate_id`, [groupKey]);
    const authoredSourceRef = drafts[0]?.cid ?? null;
    const draftCount = drafts.length;

    // 슬롯 상태 (target 한정): e약은요 canonical 정확히 1/master · authored 충돌 · 기존 needs_review
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
    if (draftCount > 1) reasons.push(`authored draft 다중 ${draftCount}`);
    if (authoredConflict > 0) reasons.push(`authored canonical 충돌 ${authoredConflict}`);
    if (masterIds.length === 0) reasons.push('target master 0');
    if (!reproduced) reasons.push(`fp 재현 불일치(target ${target.length} !== bridge ${g.bridge_n})`);
    if (easyExactly1 !== masterIds.length) reasons.push(`e약은요 canonical 정확히1 아님(${easyExactly1}/${masterIds.length})`);
    const verdict = reasons.length ? 'EXCLUDED' : 'READY';

    const authoredNrInsert = masterIds.length - existingNr;
    candidates.push({
      pharmKey: g.pharmKey, groupKey, targetFp: g.fp, sample: g.sample, route: g.route, atc: g.atc,
      bridge_n: g.bridge_n, coarseTotal: coarse.length,
      target_master: target.length, target_reproduced: reproduced,
      nonTarget_excluded: nonTarget.length, fpDistribution: fpDist,
      easyCanonicalExactly1: easyExactly1, easyCanonicalTotal: easyTotal,
      authoredConflict, existingAuthoredNeedsReview: existingNr,
      nonOralInTarget, sensitive, authored_source_ref_id: authoredSourceRef, authored_draft_count: draftCount,
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
      rollback_master_ids: masterIds,
    });
  }
  await ds.destroy();

  const ready = candidates.filter((c) => c.verdict === 'READY');
  const top3 = ready.slice(0, TOP_PICK).map((c) => ({
    groupKey: c.groupKey, targetFp: c.targetFp, sample: c.sample, atc: c.atc,
    승격대상_master: c.target_master, coarseTotal: c.coarseTotal, 편입제외_nonTarget: c.nonTarget_excluded,
    authored_source_ref_id: c.authored_source_ref_id,
    easyCanonicalExactly1: c.easyCanonicalExactly1, authoredConflict: c.authoredConflict,
    예상write: c.예상write, rollback_master_ids: c.rollback_master_ids,
  }));

  const out = {
    wo: 'WO-O4O-OTC-GROUNDED-UPGRADE-NEXT-CANDIDATES-AUDIT-GA-V1', readOnly: true, dbWrite: 0,
    track: 'A (grounded upgrade: e약은요 canonical → authored canonical 교체)',
    basis: 'bridge full-content fingerprint (fingerprintOf 정본 verbatim) — coarse 그룹을 fp 별로 분리, authored그대로확장 fp-group 만 추출',
    excludedPilot: { groupKey: '에르도스테인|300밀리그램|정', fp: PILOT_FP, note: '이미 26건 LIVE 승격' },
    poolSize: pool.length, top10Fps: top10.map((g) => ({ fp: g.fp, pharmKey: g.pharmKey, bridge_n: g.bridge_n })),
    candidates: candidates.map((c) => ({ ...c, rollback_master_ids: `[${c.rollback_master_ids.length} ids — top3 에만 전개]` })),
    top3,
    summary: { READY: ready.length, EXCLUDED: candidates.filter((c) => c.verdict === 'EXCLUDED').length, selected: top3.length },
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'otc-grounded-upgrade-next-candidates-v1.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({
    poolSize: pool.length, summary: out.summary,
    candidates: candidates.map((c) => `${c.groupKey} [fp ${c.targetFp}]: ${c.verdict}${c.excludeReasons.length ? '(' + c.excludeReasons.join(',') + ')' : ''} — target ${c.target_master}/bridge ${c.bridge_n}, coarse ${c.coarseTotal}, easy1 ${c.easyCanonicalExactly1}, 충돌 ${c.authoredConflict}, ref ${c.authored_source_ref_id ? c.authored_source_ref_id.slice(0, 8) : 'none'}`),
    top3: top3.map((t) => `${t.groupKey}: 승격 ${t.승격대상_master} (ref ${t.authored_source_ref_id?.slice(0, 8)})`),
  }, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
