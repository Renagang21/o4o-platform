/**
 * WO-O4O-OTC-NEXT-BATCH-AUDIT-AND-KO-EN-COMPLETE-GA-V1 — 다음 Track A 단일성분 후보 감사 (read-only, DB write 0)
 *
 * 기완료 groupKey(ko runner GROUP_REGISTRY 24종)를 제외하고, bridge full-content fingerprint 정본으로
 * 다음 READY 후보를 최대 6개 감사한다. 상위 3개를 ko→en 연속 완결 실행 대상으로 확정.
 *
 * 제외: 기완료 groupKey · 비경구 · 민감 약효군 · ingredient 빈 복합제(atc: 키) · 안전지문 불일치(target fp 재현 실패)
 * 후보별: groupKey · source_ref_id · target fp · target/exclude/other · target master IDs ·
 *         easy STORE ko canonical 정확히1/master · authored ko/en canonical·needs_review 충돌 ·
 *         route/함량/제형/안전지문(fp) 동질성 · source_ref 공유 범위 · reviewed EN sibling · 예상 write
 * write 산식: ko = 4T (nr INSERT T + easy demote T + flip T + audit T) · en = 2T · 총 6T
 *
 * 결정론: 정렬 고정(count desc, pharmKey asc, fp asc · master id asc).
 * Usage(apps/api-server): DB_HOST=127.0.0.1 DB_PORT=5442 ... npx tsx src/scripts/drug-otc-next-batch-audit-v2.ts
 * 산출: src/scripts/data/otc-next-batch-audit-v2.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const BRIDGE = path.resolve(OUT_DIR, 'otc-full-corpus-authored-bridge-groups-v1.json');
const BUCKET = 'authored그대로확장';
const REPORT_MAX = 6;
const PICK = 3;
const EVAL_LIMIT = 10;
const SENSITIVE_RE = /아스피린|아세틸살리실산|와파린|클로피도그렐|헤파린|덱사메타손|프레드니솔론|하이드로코르티손|모르핀|코데인|메칠페니데이트|인슐린|레보티록신/;
const AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo'];

/** 기완료 groupKey — ko runner GROUP_REGISTRY key 필드 (2026-07-21 기준 24종) */
const DONE_GROUPKEYS = new Set([
  '에르도스테인|300밀리그램|정', '트리메부틴말레산염|100밀리그램|정', '바실루스리케니포르미스균|250밀리그램|캡슐',
  '로라타딘|10밀리그램|정', '알벤다졸|400밀리그램|정', '알마게이트|500밀리그램|정', '디오스민|300밀리그램|캡슐',
  '클로닉신리시네이트|125밀리그램|연질캡슐', '트리메부틴말레산염|150밀리그램|정', '브로멜라인|100밀리그램|정',
  '클로닉신리시네이트|125밀리그램|정', '아세트아미노펜|325밀리그램|연질캡슐', '나프록센|250밀리그램|연질캡슐',
  '니자티딘|75밀리그램|정', '엘카르니틴|330밀리그램|정', '소브레롤|200밀리그램|캡슐',
  '락토바실루스아시도필루스균|300밀리그램|캡슐', '알파칼시돌|0.5마이크로그램|연질캡슐', '아세틸시스테인|100밀리그램|캡슐',
  '나프록센나트륨|275밀리그램|정', '트리메부틴말레산염|200밀리그램|정', '메코발라민|500마이크로그램|캡슐',
  '덱스판테놀|100밀리그램|정', '폴산|1밀리그램|정',
]);

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

// ── fingerprintOf = bridge/runner 정본 VERBATIM ──
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
function bucketSections(sec: Record<string, string>): { ind: string; dos: string; cau: string } {
  let ind = '', dos = '', cau = '';
  for (const [t, b] of Object.entries(sec)) {
    if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b;
    else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b;
    else if (/상호\s*작용|병용/.test(t)) { /* itx 제외 */ }
    else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t)) cau += (cau ? '\n' : '') + b;
  }
  return { ind, dos, cau };
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
  if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(name)) return 'oral';
  return 'unknown';
}
const ingredientOf = (name: string): string => (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (spec: string): string => (spec || '').split(' / ')[0].trim();
function fingerprintOf(name: string, spec: string, content: string): { fp: string; route: string; form: string } {
  let sec = easySections(content || '');
  if (Object.keys(sec).length === 0) sec = freeSections(content || '');
  const { ind, dos, cau } = bucketSections(sec);
  const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${ingredientOf(name)}|${strengthOf(spec)}`), H(formOf(name)), routeSig(name)].join('|'));
  return { fp, route: routeSig(name), form: formOf(name) };
}

async function main(): Promise<void> {
  const bridge = JSON.parse(fs.readFileSync(BRIDGE, 'utf8'));
  const arr: any[] = bridge.groups || bridge;
  // authored그대로확장 fp-entry → groupKey 별 dominant fp 대표
  const entries = arr.filter((x) => (x.counts || {})[BUCKET] > 0)
    .map((x) => ({ fp: x.fingerprint as string, pharmKey: x.pharmKey as string, groupKey: `${x.ingredient}|${x.strength}|${x.form}`, ingredient: x.ingredient as string, strength: x.strength as string, form: x.form as string, route: x.route as string, atc: x.atc_code as string, bridge_n: x.counts[BUCKET] as number, sample: x.sampleName as string }));
  const byGroup = new Map<string, typeof entries[number]>();
  for (const e of entries) { const cur = byGroup.get(e.groupKey); if (!cur || e.bridge_n > cur.bridge_n || (e.bridge_n === cur.bridge_n && e.fp < cur.fp)) byGroup.set(e.groupKey, e); }
  const reps = [...byGroup.values()]
    .filter((g) => !DONE_GROUPKEYS.has(g.groupKey))
    .filter((g) => !!g.ingredient && g.ingredient.trim().length > 0)   // ingredient 빈 복합제(atc: 키) 제외
    .filter((g) => g.route === 'oral')                                  // 비경구 제외
    .filter((g) => !SENSITIVE_RE.test(g.ingredient))                    // 민감 약효군 제외
    .sort((a, b) => b.bridge_n - a.bridge_n || (a.pharmKey < b.pharmKey ? -1 : a.pharmKey > b.pharmKey ? 1 : 0) || (a.fp < b.fp ? -1 : 1));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST || '127.0.0.1', port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();

  const evaluated: any[] = [];
  for (const g of reps.slice(0, EVAL_LIMIT)) {
    const coarse: Array<{ id: string; name: string; spec: string; content: string }> = await ds.query(
      `SELECT pm.id::text id, pm.name, pm.specification spec, es.content
       FROM product_masters pm
       JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true
       WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
       ORDER BY pm.id`, [g.ingredient, g.strength, g.form]);
    const withFp = coarse.map((r) => ({ ...r, ...fingerprintOf(r.name, r.spec, r.content) }));
    const target = withFp.filter((r) => r.fp === g.fp);
    const nonTarget = withFp.filter((r) => r.fp !== g.fp);
    const masterIds = target.map((r) => r.id).sort();
    const excludeFps = [...new Set(nonTarget.map((r) => r.fp))].sort();
    const T = masterIds.length;

    const groupKey = g.groupKey;
    const drafts: Array<{ cid: string }> = await ds.query(
      `SELECT candidate_id::text cid FROM product_candidate_description_drafts WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL AND seed_json->>'groupKey'=$1 ORDER BY candidate_id`, [groupKey]);
    const candidate = drafts[0]?.cid ?? null;

    let easyExactly1 = 0, koAuthoredConflict = 0, koNr = 0, enConflict = 0, enNr = 0;
    let shareKo = 0, outMasters = 0, enSibling: any = null;
    if (T) {
      const slot: any[] = await ds.query(`
        SELECT count(*) FILTER (WHERE lang='ko' AND src=ANY($2) AND st='canonical')::int ko_canon,
               count(*) FILTER (WHERE lang='ko' AND src=ANY($2) AND st='needs_review')::int ko_nr,
               count(*) FILTER (WHERE lang='en' AND st='canonical')::int en_canon,
               count(*) FILTER (WHERE lang='en' AND st='needs_review')::int en_nr
        FROM (SELECT COALESCE(s.language,'ko') lang, s.source_type src, s.status st FROM shared_product_descriptions s
              WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND s.deleted_at IS NULL) t`, [masterIds, AUTHORED_SOURCES]);
      koAuthoredConflict = slot[0].ko_canon; koNr = slot[0].ko_nr; enConflict = slot[0].en_canon; enNr = slot[0].en_nr;
      const per: any[] = await ds.query(
        `SELECT count(*)::int n FROM unnest($1::uuid[]) mid WHERE (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.source_type='mfds_easy_drug' AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1`, [masterIds]);
      easyExactly1 = per[0].n;
      if (candidate) {
        const sh: any[] = await ds.query(
          `SELECT count(DISTINCT master_id)::int n FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [candidate]);
        shareKo = sh[0].n;
        const om: any[] = await ds.query(
          `SELECT count(DISTINCT master_id)::int n FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND description_type='STORE' AND deleted_at IS NULL AND NOT master_id=ANY($2::uuid[])`, [candidate, masterIds]);
        outMasters = om[0].n;
        const sib: any[] = await ds.query(
          `SELECT md5(content) h, summary, count(*)::int n FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND NOT master_id=ANY($2::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2`, [candidate, masterIds]);
        enSibling = sib.length === 1 ? { md5: sib[0].h, summary: sib[0].summary, n: sib[0].n, uniform: true } : (sib.length ? { variants: sib.length, uniform: false } : null);
      }
    }

    const doses = [...new Set(target.map((r) => strengthOf(r.spec)))];
    const forms = [...new Set(target.map((r) => r.form))];
    const routes = [...new Set(target.map((r) => r.route))];
    const nonOral = target.filter((r) => r.route !== 'oral').length;

    const reasons: string[] = [];
    if (!candidate) reasons.push('authored draft 없음');
    if (drafts.length > 1) reasons.push(`authored draft 다중 ${drafts.length}`);
    if (T === 0) reasons.push('target master 0');
    if (T !== g.bridge_n) reasons.push(`fp 재현 불일치(target ${T} !== bridge ${g.bridge_n})`);
    if (easyExactly1 !== T) reasons.push(`easy canonical 정확히1 아님(${easyExactly1}/${T})`);
    if (koAuthoredConflict > 0) reasons.push(`ko authored canonical 충돌 ${koAuthoredConflict}`);
    if (koNr > 0) reasons.push(`ko authored needs_review 선존재 ${koNr}`);
    if (enConflict > 0) reasons.push(`target 내 en canonical 선존재 ${enConflict}`);
    if (enNr > 0) reasons.push(`target 내 en needs_review 선존재 ${enNr}`);
    if (nonOral > 0) reasons.push(`target 비경구 혼입 ${nonOral}`);
    if (doses.length !== 1) reasons.push(`함량 비동질 ${JSON.stringify(doses)}`);
    if (forms.length !== 1) reasons.push(`제형 비동질 ${JSON.stringify(forms)}`);
    if (routes.length !== 1 || routes[0] !== 'oral') reasons.push(`경로 비동질 ${JSON.stringify(routes)}`);
    const verdict = reasons.length ? 'EXCLUDED' : 'READY';

    evaluated.push({
      groupKey, pharmKey: g.pharmKey, targetFp: g.fp, sample: g.sample, atc: g.atc, route: g.route,
      bridge_n: g.bridge_n, coarseTotal: coarse.length, target: T, exclude: nonTarget.length, other: 0,
      excludeFps, excludeFpCount: excludeFps.length,
      candidate, easyCanonicalExactly1: easyExactly1,
      koAuthoredConflict, koAuthoredNeedsReview: koNr, enCanonicalInTarget: enConflict, enNeedsReviewInTarget: enNr,
      homogeneity: { dose: doses, form: forms, route: routes },
      sourceRefScope: { koCanonicalSharing: shareKo, outOfScopeMasters: outMasters },
      reviewedEnSibling: enSibling,
      enStrategy: enSibling?.uniform ? 'reuse(out en byte-identical 재구성)' : (candidate ? 'ko canonical 충실 번역(신규)' : 'N/A'),
      예상write: { ko_4T: T * 4, en_2T: T * 2, total_6T: T * 6, breakdown: { ko_nr_INSERT: T, easy_demote: T, authored_flip: T, audit: T, en_nr_INSERT: T, en_flip: T } },
      target_master_ids: masterIds,
      verdict, excludeReasons: reasons,
    });
    if (evaluated.filter((e) => e.verdict === 'READY').length >= PICK && evaluated.length >= REPORT_MAX) break;
  }
  await ds.destroy();

  const report = evaluated.slice(0, REPORT_MAX);
  const ready = report.filter((c) => c.verdict === 'READY');
  const picked = ready.slice(0, PICK);
  const out = {
    wo: 'WO-O4O-OTC-NEXT-BATCH-AUDIT-AND-KO-EN-COMPLETE-GA-V1', readOnly: true, dbWrite: 0,
    basis: 'bridge full-content fingerprint (fingerprintOf 정본) — groupKey별 dominant fp 대표, target fp 하위 그룹만',
    excludedDoneGroupKeys: DONE_GROUPKEYS.size,
    candidates: report.map((c) => ({ ...c, target_master_ids: `[${c.target_master_ids.length} ids]` })),
    picked: picked.map((c) => ({ groupKey: c.groupKey, targetFp: c.targetFp, candidate: c.candidate, target: c.target, exclude: c.exclude, excludeFps: c.excludeFps, enStrategy: c.enStrategy, reviewedEnSibling: c.reviewedEnSibling, 예상write: c.예상write, target_master_ids: c.target_master_ids })),
    summary: { evaluated: report.length, READY: ready.length, picked: picked.length },
  };
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'otc-next-batch-audit-v2.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({
    summary: out.summary,
    candidates: report.map((c) => `${c.groupKey} [fp ${c.targetFp}]: ${c.verdict}${c.excludeReasons.length ? '(' + c.excludeReasons.join(',') + ')' : ''} — T ${c.target}/bridge ${c.bridge_n}, coarse ${c.coarseTotal}, exclude ${c.exclude}(${c.excludeFpCount}fp), easy1 ${c.easyCanonicalExactly1}, ko충돌 ${c.koAuthoredConflict}, en선존재 ${c.enCanonicalInTarget}, ref ${c.candidate ? c.candidate.slice(0, 8) : 'none'}, enSib ${c.reviewedEnSibling ? (c.reviewedEnSibling.uniform ? c.reviewedEnSibling.n + '건 uniform' : 'non-uniform') : '없음'}`),
    picked: picked.map((c) => `${c.groupKey}: T=${c.target} (ko ${c.예상write.ko_4T} + en ${c.예상write.en_2T} = ${c.예상write.total_6T}) · ${c.enStrategy}`),
  }, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
