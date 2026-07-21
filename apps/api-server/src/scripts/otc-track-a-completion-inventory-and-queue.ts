/**
 * WO-O4O-OTC-TRACK-A-COMPLETION-INVENTORY-AND-REMAINING-QUEUE-NA-V1 — Agent 나. READ-ONLY, DB write 0.
 *
 * 목적
 *  1) 현재까지 Track A(e약은요 STORE ko canonical → authored canonical 교체)로 완료된 모든 그룹을
 *     production 정본에서 재집계한다. Track A 판별 = audit `canonical_replaced` 중
 *     metadata.previousSource='mfds_easy_drug' AND metadata.newSource='mfds_drug_otc'.
 *     (canonical_replaced 는 supplier 등 타 흐름도 사용하므로 metadata 로 한정해야 한다.)
 *  2) bridge full-content fingerprint 정본(otc-full-corpus-authored-bridge-groups-v1.json,
 *     bucket='authored그대로확장')에서 완료/진행 groupKey 를 제외한 남은 후보를 상태별로 분류한다.
 *  3) READY_SINGLE 후보 상위 N(기본 12)에 대해 DB gate 를 적용해 실행 queue 를 만든다.
 *
 * write 산식(정정본 고정): T=target master 수 · ko=4T · en=2T · 총=6T.
 *
 * 결정론: 산출물에 타임스탬프 미포함. master IDs asc · fpDistribution n desc→fp asc ·
 *         queue target desc→groupKey asc · inventory trackAMasters desc→sourceRefId asc.
 *         2회 실행 byte-identical.
 *
 * 이식성: 홈/노트북 절대경로 하드코딩 금지. .env 는 repo 상대(apps/api-server/.env)로 해석한다.
 *
 * Usage(apps/api-server): npx tsx src/scripts/otc-track-a-completion-inventory-and-queue.ts
 *   env: DB_HOST(기본 127.0.0.1) DB_PORT(기본 5442) DB_USER(기본 o4o_api) DB_NAME(기본 o4o_platform)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Client } from 'pg';

// ── 경로(이식성): cwd=apps/api-server 기준, 없으면 상위 탐색 ──────────────────────────
function resolveApiServerDir(): string {
  let d = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(d, 'src', 'scripts')) && existsSync(path.join(d, 'package.json'))) return d;
    const cand = path.join(d, 'apps', 'api-server');
    if (existsSync(path.join(cand, 'src', 'scripts'))) return cand;
    d = path.dirname(d);
  }
  return process.cwd();
}
const API_DIR = resolveApiServerDir();
const OUT_DIR = path.join(API_DIR, 'src', 'scripts', 'data');
const BRIDGE = path.join(OUT_DIR, 'otc-full-corpus-authored-bridge-groups-v1.json');
const ENV_PATH = path.join(API_DIR, '.env');
const OUT_FILE = path.join(OUT_DIR, 'otc-track-a-completion-inventory-and-queue-v1.json');

const readEnv = (k: string): string | null => {
  if (!existsSync(ENV_PATH)) return null;
  const m = readFileSync(ENV_PATH, 'utf8').match(new RegExp(`^${k}=(.*)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
};

const BUCKET = 'authored그대로확장';
const AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo'];
const SENSITIVE_RE = /아스피린|아세틸살리실산|와파린|클로피도그렐|헤파린|덱사메타손|프레드니솔론|하이드로코르티손|모르핀|코데인|메칠페니데이트|인슐린|레보티록신/;
const WANT_QUEUE = Number(process.env.WANT_QUEUE ?? 12);
const MAX_EXAMINE = Number(process.env.MAX_EXAMINE ?? 40);

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

// ── fingerprintOf 정본 VERBATIM (bridge integration / grounded-upgrade runner) ─────────
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s || '').normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.')
    .replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim();
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
  if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(name)) return 'oral';
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

const q = async (c: Client, sql: string, params: any[] = []): Promise<any[]> => (await c.query(sql, params)).rows;

async function main(): Promise<void> {
  const client = new Client({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 5442),
    user: process.env.DB_USER ?? 'o4o_api',
    database: process.env.DB_NAME ?? 'o4o_platform',
    password: process.env.DB_PASSWORD ?? readEnv('DB_PASSWORD') ?? '',
  });
  await client.connect();
  await client.query("SET statement_timeout='240s'");

  // ── PHASE 1: Track A 완료 inventory (production 정본) ────────────────────────────
  const trackARows = await q(client, `
    WITH ta AS (
      SELECT DISTINCT master_id FROM shared_product_description_audit_logs
      WHERE event_type='canonical_replaced'
        AND metadata->>'previousSource'='mfds_easy_drug' AND metadata->>'newSource'='mfds_drug_otc'
    ), j AS (
      SELECT ta.master_id, k.source_ref_id,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=ta.master_id
          AND s.description_type='STORE' AND COALESCE(s.language,'ko')='en' AND s.status='canonical' AND s.deleted_at IS NULL) has_en,
        EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=ta.master_id
          AND s.description_type='STORE' AND s.source_type='mfds_easy_drug' AND s.status='deprecated' AND s.deleted_at IS NULL) has_dep,
        (SELECT count(*) FROM shared_product_description_audit_logs l WHERE l.master_id=ta.master_id
           AND l.event_type='canonical_replaced'
           AND l.metadata->>'previousSource'='mfds_easy_drug' AND l.metadata->>'newSource'='mfds_drug_otc') audit_n
      FROM ta
      LEFT JOIN LATERAL (SELECT s.source_ref_id FROM shared_product_descriptions s
        WHERE s.master_id=ta.master_id AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko'
          AND s.status='canonical' AND s.source_type='mfds_drug_otc' AND s.deleted_at IS NULL LIMIT 1) k ON true
    )
    SELECT COALESCE(source_ref_id::text,'(no-authored-ko)') source_ref_id,
      count(*)::int track_a_masters,
      count(*) FILTER (WHERE has_en)::int en_done,
      count(*) FILTER (WHERE NOT has_en)::int en_missing,
      count(*) FILTER (WHERE has_dep)::int easy_deprecated,
      sum(audit_n)::int audit_rows,
      (SELECT pm.name FROM j j2 JOIN product_masters pm ON pm.id=j2.master_id
        WHERE COALESCE(j2.source_ref_id::text,'(no-authored-ko)')=COALESCE(j.source_ref_id::text,'(no-authored-ko)')
        ORDER BY pm.name LIMIT 1) sample_name
    FROM j GROUP BY source_ref_id ORDER BY track_a_masters DESC, source_ref_id ASC`);

  const inventory = trackARows.map((r) => ({
    sourceRefId: r.source_ref_id,
    sampleName: r.sample_name,
    trackAMasters: r.track_a_masters,
    koCanonical: r.track_a_masters,
    enCanonical: r.en_done,
    enMissing: r.en_missing,
    easyDeprecated: r.easy_deprecated,
    auditCanonicalReplaced: r.audit_rows,
    auditOnePerMaster: r.audit_rows === r.track_a_masters,
    easyMatchesAudit: r.easy_deprecated === r.track_a_masters,
    enComplete: r.en_missing === 0,
  }));

  // 전역 정합 게이트
  const [gates] = await q(client, `
    SELECT
      (SELECT count(*) FROM (SELECT master_id, description_type, COALESCE(language,'ko') l
         FROM shared_product_descriptions WHERE status='canonical' AND deleted_at IS NULL
         GROUP BY 1,2,3 HAVING count(*)>1) d)::int dup_canonical,
      (SELECT count(*) FROM shared_product_descriptions WHERE description_type='STORE'
         AND source_type='mfds_drug_otc' AND status='needs_review' AND deleted_at IS NULL)::int authored_needs_review,
      (SELECT count(*) FROM shared_product_descriptions WHERE description_type='STORE'
         AND source_type='mfds_easy_drug' AND status='deprecated' AND deleted_at IS NULL)::int easy_deprecated_total,
      (SELECT count(*) FROM shared_product_description_audit_logs WHERE event_type='canonical_replaced')::int audit_all,
      (SELECT count(*) FROM shared_product_description_audit_logs WHERE event_type='canonical_replaced'
         AND metadata->>'previousSource'='mfds_easy_drug' AND metadata->>'newSource'='mfds_drug_otc')::int audit_track_a`);

  const completedGroupKeys = new Set<string>();
  // 완료 groupKey 역산: Track A master 의 (ingredient|strength|form)
  const doneKeys = await q(client, `
    WITH ta AS (
      SELECT DISTINCT master_id FROM shared_product_description_audit_logs
      WHERE event_type='canonical_replaced'
        AND metadata->>'previousSource'='mfds_easy_drug' AND metadata->>'newSource'='mfds_drug_otc')
    SELECT DISTINCT pm.name, pm.specification spec FROM ta JOIN product_masters pm ON pm.id=ta.master_id`);
  for (const r of doneKeys) {
    const k = `${ingredientOf(r.name)}|${strengthOf(r.spec)}|${formOf(r.name)}`;
    if (ingredientOf(r.name)) completedGroupKeys.add(k);
  }

  // ── PHASE 2: 남은 후보 분류 (bridge 정본) ──────────────────────────────────────
  const bridge = JSON.parse(readFileSync(BRIDGE, 'utf8'));
  const entries = (bridge.groups as any[])
    .filter((g) => g.bucket === BUCKET && g.keyType === 'ingredient')
    .map((g) => ({
      groupKey: `${g.ingredient}|${g.strength}|${g.form}`,
      pharmKey: g.pharmKey, fp: g.fingerprint, bridge_n: g.size,
      ingredient: g.ingredient ?? '', strength: g.strength ?? '', form: g.form ?? '',
      route: g.route ?? '', atc: g.atc_code ?? '', sample: g.sampleName ?? '',
    }))
    .sort((a, b) => b.bridge_n - a.bridge_n || (a.fp < b.fp ? -1 : a.fp > b.fp ? 1 : 0));

  const classified: any[] = [];
  const staticState = (e: typeof entries[number]): string | null => {
    if (completedGroupKeys.has(e.groupKey)) return 'COMPLETED';
    if (!e.ingredient) return 'HOLD_MULTI_INGREDIENT';
    if (SENSITIVE_RE.test(e.ingredient)) return 'HOLD_SENSITIVE';
    if (e.route !== 'oral') return 'HOLD_NON_ORAL';
    return null;
  };

  const queue: any[] = [];
  let examined = 0;
  for (const e of entries) {
    const st = staticState(e);
    if (st) { classified.push({ state: st, groupKey: e.groupKey, fp: e.fp, bridge_n: e.bridge_n, route: e.route, atc: e.atc, sample: e.sample }); continue; }
    if (examined >= MAX_EXAMINE || queue.length >= WANT_QUEUE) {
      classified.push({ state: 'PENDING_EXAMINATION', groupKey: e.groupKey, fp: e.fp, bridge_n: e.bridge_n, route: e.route, atc: e.atc, sample: e.sample });
      continue;
    }
    examined++;

    // authored draft(source_ref)
    const drafts = await q(client, `
      SELECT candidate_id::text cid FROM product_candidate_description_drafts
      WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL AND seed_json->>'groupKey'=$1 ORDER BY candidate_id`, [e.groupKey]);
    const authoredSourceRef: string | null = drafts[0]?.cid ?? null;

    // coarse (runner VERBATIM)
    const coarse = await q(client, `
      SELECT pm.id::text id, pm.name, pm.specification spec, es.content
      FROM product_masters pm
      JOIN LATERAL (SELECT content FROM shared_product_descriptions s
          WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
            AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
          ORDER BY length(s.content) DESC LIMIT 1) es ON true
      WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
      ORDER BY pm.id`, [e.ingredient, e.strength, e.form]);

    const withFp = coarse.map((r: any) => ({ ...r, ...fingerprintOf(r.name, r.spec, r.content) }));
    const target = withFp.filter((r: any) => r.fp === e.fp);
    const nonTarget = withFp.filter((r: any) => r.fp !== e.fp);
    const masterIds: string[] = target.map((r: any) => r.id).sort();
    const fpDistribution = Object.entries(withFp.reduce((a: any, r: any) => {
      const x = a[r.fp] || (a[r.fp] = { n: 0, form: r.form, route: r.route, sample: r.name }); x.n++; return a;
    }, {})).map(([fp, d]: any) => ({ fp, n: d.n, form: d.form, route: d.route, sample: d.sample, target: fp === e.fp }))
      .sort((x: any, y: any) => y.n - x.n || (x.fp < y.fp ? -1 : x.fp > y.fp ? 1 : 0));

    const targetReproduced = target.length === e.bridge_n;
    const distinctCau = [...new Set(target.map((r: any) => r.cauHash))];
    const nonOralInTarget = target.filter((r: any) => r.route !== 'oral').length;

    let easyExactly1 = 0, authoredConflict = 0, existingNr = 0, existingEn = 0;
    if (masterIds.length) {
      const [slot] = await q(client, `
        SELECT count(*) FILTER (WHERE src='mfds_easy_drug' AND st='canonical')::int easy,
               count(*) FILTER (WHERE src=ANY($2) AND st='canonical')::int authored_canon,
               count(*) FILTER (WHERE src=ANY($2) AND st='needs_review')::int authored_nr
        FROM (SELECT s.source_type src, s.status st FROM shared_product_descriptions s
              WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE'
                AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) t`, [masterIds, AUTHORED_SOURCES]);
      authoredConflict = slot.authored_canon; existingNr = slot.authored_nr;
      const [per] = await q(client, `
        SELECT count(*)::int n FROM unnest($1::uuid[]) mid
        WHERE (SELECT count(*) FROM shared_product_descriptions s
           WHERE s.master_id=mid AND s.source_type='mfds_easy_drug' AND s.status='canonical'
             AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1`, [masterIds]);
      easyExactly1 = per.n;
      const [en] = await q(client, `
        SELECT count(DISTINCT master_id)::int n FROM shared_product_descriptions
        WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND COALESCE(language,'ko')='en'
          AND status='canonical' AND deleted_at IS NULL`, [masterIds]);
      existingEn = en.n;
    }

    // source_ref 스코프(§0-C): 공유 master 수 / out-of-scope
    let refScopeMasters = 0, outOfScope = 0;
    if (authoredSourceRef) {
      const [rs] = await q(client, `
        SELECT count(DISTINCT master_id)::int n FROM shared_product_descriptions
        WHERE source_ref_id=$1::uuid AND source_type=ANY($2) AND description_type='STORE'
          AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [authoredSourceRef, AUTHORED_SOURCES]);
      refScopeMasters = rs.n;
      outOfScope = Math.max(0, refScopeMasters - masterIds.length);
    }

    let state = 'READY_SINGLE'; const stopReasons: string[] = [];
    if (!targetReproduced) { state = 'SAFETY_MISMATCH'; stopReasons.push(`fp 재현 실패 target=${target.length} bridge_n=${e.bridge_n}`); }
    else if (!authoredSourceRef) { state = 'HOLD_SOURCE'; stopReasons.push('authored draft(source_ref) 없음'); }
    else if (authoredConflict > 0 || existingNr > 0) { state = 'HOLD_CONFLICT'; stopReasons.push(`authored canonical ${authoredConflict} / needs_review ${existingNr}`); }
    else if (easyExactly1 !== target.length) { state = 'HOLD_CONFLICT'; stopReasons.push(`easy canonical 정확히1 ${easyExactly1}/${target.length}`); }
    else if (nonOralInTarget > 0) { state = 'HOLD_NON_ORAL'; stopReasons.push(`target 내 비경구 ${nonOralInTarget}`); }
    else if (distinctCau.length > 1) { state = 'SAFETY_MISMATCH'; stopReasons.push(`안전지문 불균일 ${distinctCau.length}`); }

    const T = target.length;
    const row = {
      state, groupKey: e.groupKey, pharmKey: e.pharmKey, sample: e.sample, atc: e.atc,
      bridgeFp: e.fp, bridge_n: e.bridge_n, coarseTotal: withFp.length,
      target: T, targetReproduced, exclude: nonTarget.length,
      other: withFp.length - T - nonTarget.length,
      intersectTargetExclude: 0,
      fpDistribution,
      easyCanonicalExactly1: easyExactly1, authoredConflict, existingAuthoredNeedsReview: existingNr,
      authoredSourceRefId: authoredSourceRef,
      sourceRefScopeMasters: refScopeMasters, sourceRefOutOfScope: outOfScope,
      existingEnCanonical: existingEn,
      safetyUniform: distinctCau.length <= 1,
      writeFormula: 'T=target · ko=4T · en=2T · total=6T',
      expectedKoWrite: 4 * T, expectedEnWrite: 2 * T, expectedTotalWrite: 6 * T,
      stopReasons, targetMasterIds: masterIds, rollbackMasterIds: masterIds,
    };
    classified.push({ state, groupKey: e.groupKey, fp: e.fp, bridge_n: e.bridge_n, route: e.route, atc: e.atc, sample: e.sample });
    if (state === 'READY_SINGLE') queue.push(row);
  }

  queue.sort((a, b) => b.target - a.target || (a.groupKey < b.groupKey ? -1 : a.groupKey > b.groupKey ? 1 : 0));
  queue.forEach((r, i) => { r.recommendedRunOrder = i + 1; });

  const byState = classified.reduce((a: Record<string, number>, r) => { a[r.state] = (a[r.state] || 0) + 1; return a; }, {});
  const totals = {
    trackAGroups: inventory.length,
    trackAMasters: inventory.reduce((s, r) => s + r.trackAMasters, 0),
    koCanonical: inventory.reduce((s, r) => s + r.koCanonical, 0),
    enCanonical: inventory.reduce((s, r) => s + r.enCanonical, 0),
    enMissing: inventory.reduce((s, r) => s + r.enMissing, 0),
    easyDeprecated: inventory.reduce((s, r) => s + r.easyDeprecated, 0),
    auditCanonicalReplaced: inventory.reduce((s, r) => s + r.auditCanonicalReplaced, 0),
    groupsEnComplete: inventory.filter((r) => r.enComplete).length,
    groupsEnIncomplete: inventory.filter((r) => !r.enComplete).length,
  };
  const anomalies: any[] = [];
  if (gates.dup_canonical !== 0) anomalies.push({ code: 'DUP_CANONICAL', value: gates.dup_canonical });
  if (gates.authored_needs_review !== 0) anomalies.push({ code: 'AUTHORED_NEEDS_REVIEW_RESIDUAL', value: gates.authored_needs_review });
  if (gates.easy_deprecated_total !== totals.easyDeprecated) anomalies.push({ code: 'EASY_DEPRECATED_TOTAL_MISMATCH', db: gates.easy_deprecated_total, inventory: totals.easyDeprecated });
  if (gates.audit_track_a !== totals.auditCanonicalReplaced) anomalies.push({ code: 'AUDIT_TRACK_A_MISMATCH', db: gates.audit_track_a, inventory: totals.auditCanonicalReplaced });
  for (const r of inventory) {
    if (!r.auditOnePerMaster) anomalies.push({ code: 'AUDIT_NOT_ONE_PER_MASTER', sourceRefId: r.sourceRefId, audit: r.auditCanonicalReplaced, masters: r.trackAMasters });
    if (!r.easyMatchesAudit) anomalies.push({ code: 'EASY_DEPRECATED_NOT_MATCHING', sourceRefId: r.sourceRefId, easy: r.easyDeprecated, masters: r.trackAMasters });
  }

  const report = {
    wo: 'WO-O4O-OTC-TRACK-A-COMPLETION-INVENTORY-AND-REMAINING-QUEUE-NA-V1',
    agent: 'na', readOnly: true, dbWrite: 0,
    trackADefinition: "audit canonical_replaced AND metadata.previousSource='mfds_easy_drug' AND metadata.newSource='mfds_drug_otc'",
    writeFormula: 'T=target master 수 · ko=4T · en=2T · total=6T',
    determinism: 'no timestamp · masterIds asc · fpDistribution n desc→fp asc · queue target desc→groupKey asc · inventory trackAMasters desc→sourceRefId asc',
    globalGates: gates,
    totals, anomalies,
    inventory,
    remainingByState: Object.fromEntries(Object.entries(byState).sort(([a], [b]) => (a < b ? -1 : 1))),
    remaining: classified.sort((a, b) => b.bridge_n - a.bridge_n || (a.fp < b.fp ? -1 : a.fp > b.fp ? 1 : 0)),
    queue,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log('=== Track A 완료 inventory ===');
  console.log(`groups=${totals.trackAGroups} masters=${totals.trackAMasters} ko=${totals.koCanonical} en=${totals.enCanonical} enMissing=${totals.enMissing}`);
  console.log(`easyDeprecated=${totals.easyDeprecated} audit=${totals.auditCanonicalReplaced} dupCanonical=${gates.dup_canonical} residualNR=${gates.authored_needs_review}`);
  console.log(`enComplete groups=${totals.groupsEnComplete} / enIncomplete=${totals.groupsEnIncomplete}`);
  console.log('anomalies=', JSON.stringify(anomalies));
  console.log('=== 남은 후보 상태별 ===');
  console.log(JSON.stringify(report.remainingByState));
  console.log(`=== READY_SINGLE queue (${queue.length}) ===`);
  for (const r of queue) console.log(`${r.recommendedRunOrder}. ${r.groupKey} T=${r.target} ko=${r.expectedKoWrite} en=${r.expectedEnWrite} total=${r.expectedTotalWrite} outOfScope=${r.sourceRefOutOfScope}`);
  console.log(`OUT: ${OUT_FILE}`);

  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
