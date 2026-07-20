/**
 * WO-O4O-OTC-GROUNDED-UPGRADE-NEXT-5-FINAL-AUDIT-NA-V1 — Agent 나. READ-ONLY, DB write 0.
 *
 * 5개 지정 후보(groupKey = ingredient|strength|form)에 대해 grounded-upgrade(Track A: e약은요 canonical → authored
 * canonical 교체) 승격 준비도를 감사한다. runner/bridge 정본 fingerprint 산식을 VERBATIM 복제하여(변경 시 감사 무효)
 * coarse 세트를 full-content fp 로 분리, bridge SSOT 의 target fingerprint / bridge_n 과 대조한다.
 *
 * 대상 5(연질캡슐/캡슐/정 form 정밀 구분 — coarse LIKE '%form%' 가 정/캡슐 변종을 삼키지 않는지 fpDistribution 로 확인):
 *   1) 니자티딘|75밀리그램|정
 *   2) 아세트아미노펜|325밀리그램|연질캡슐   (정 변종 제외)
 *   3) 엘카르니틴|330밀리그램|정
 *   4) 나프록센|250밀리그램|연질캡슐        (정 변종 + 나프록센나트륨275 제외)
 *   5) 소브레롤|200밀리그램|캡슐            (기타 form 제외)
 *
 * 산출: src/scripts/data/otc-next-5-audit-v1.json (결정론: master id asc, fp n desc→fp asc). 콘솔 요약 포함.
 * Usage(apps/api-server): npx tsx src/scripts/otc-next-5-audit.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const BRIDGE = path.resolve(OUT_DIR, 'otc-full-corpus-authored-bridge-groups-v1.json');
const BUCKET = 'authored그대로확장';
const AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo'];
const SENSITIVE_RE = /아스피린|아세틸살리실산|와파린|클로피도그렐|헤파린|덱사메타손|프레드니솔론|하이드로코르티손|모르핀|코데인|메칠페니데이트|인슐린|레보티록신/;

const TARGETS = [
  { ingredient: '니자티딘', strength: '75밀리그램', form: '정' },
  { ingredient: '아세트아미노펜', strength: '325밀리그램', form: '연질캡슐' },
  { ingredient: '엘카르니틴', strength: '330밀리그램', form: '정' },
  { ingredient: '나프록센', strength: '250밀리그램', form: '연질캡슐' },
  { ingredient: '소브레롤', strength: '200밀리그램', form: '캡슐' },
];

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

// ── fingerprintOf 정본(drug-otc-grounded-upgrade-runner / bridge integration) VERBATIM ──
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

async function main(): Promise<void> {
  // bridge SSOT: pharmKey 로 5개 target fp/bridge_n 조회
  const bridge = JSON.parse(readFileSync(BRIDGE, 'utf8'));
  const barr: any[] = bridge.groups || bridge;
  // NOTE: bridge is keyed by full-content FINGERPRINT — multiple entries share one pharmKey.
  // Per pharmKey pick the authored그대로확장 fp-group (counts[BUCKET] max, then largest bucket).
  const bridgeByPharmKey = new Map<string, any>();
  for (const g of barr) {
    if (!g.pharmKey) continue;
    const prev = bridgeByPharmKey.get(g.pharmKey);
    const gN = (g.counts || {})[BUCKET] || 0;
    const pN = prev ? (prev.counts || {})[BUCKET] || 0 : -1;
    if (!prev || gN > pN) bridgeByPharmKey.set(g.pharmKey, g);
  }

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();

  const results: any[] = [];
  try {
    for (const t of TARGETS) {
      const groupKey = `${t.ingredient}|${t.strength}|${t.form}`;
      const pharmKey = `ing:${t.ingredient}|${t.strength}|${t.form}|oral`;
      const b = bridgeByPharmKey.get(pharmKey);
      const bridgeFp: string | null = b?.fingerprint ?? null;
      const bridge_n: number = b?.counts?.[BUCKET] ?? 0;
      const sensitive = SENSITIVE_RE.test(t.ingredient);

      // ── STEP 1: authored draft (source_ref candidate) — groupKey 정확일치 ──
      const drafts: Array<{ cid: string }> = await ds.query(
        `SELECT candidate_id::text cid FROM product_candidate_description_drafts
         WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL AND seed_json->>'groupKey'=$1
         ORDER BY candidate_id`, [groupKey]);
      const authoredSourceRef = drafts[0]?.cid ?? null;
      const draftCount = drafts.length;

      // ── STEP 2-4: coarse (runner VERBATIM: LATERAL 최장 easy STORE ko canonical) ──
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
      const rollbackIds = [...masterIds]; // rollback = same set

      // full fp distribution (n desc → fp asc)
      const fpDist = Object.entries(withFp.reduce((a: Record<string, { n: number; form: string; route: string; sample: string }>, r) => {
        const e = a[r.fp] || (a[r.fp] = { n: 0, form: r.form, route: r.route, sample: r.name }); e.n++; return a;
      }, {})).map(([fp, d]) => ({ fp, n: d.n, form: d.form, route: d.route, sample: d.sample, target: fp === bridgeFp }))
        .sort((x, y) => y.n - x.n || (x.fp < y.fp ? -1 : x.fp > y.fp ? 1 : 0));

      // exclude form breakdown (non-target forms — 정/캡슐/기타 변종이 온전히 배제되는지)
      const excludeFormBreak = nonTarget.reduce((a: Record<string, number>, r) => { a[r.form] = (a[r.form] || 0) + 1; return a; }, {});

      // ── STEP 6: homogeneity within target ──
      const distinctForms = [...new Set(target.map((r) => r.form))].sort();
      const distinctRoutes = [...new Set(target.map((r) => r.route))].sort();
      const distinctCauHashes = [...new Set(target.map((r) => r.cauHash))];
      const distinctStrengths = [...new Set(target.map((r) => strengthOf(r.spec)))].sort();
      const nonOralInTarget = target.filter((r) => r.route !== 'oral').map((r) => r.name);

      // ── STEP 4/5: slot state (target 한정): easy canonical 정확히 1/master · authored 충돌 · 기존 needs_review ──
      let easyExactly1 = 0, easyCanonicalTotal = 0, authoredConflict = 0, existingNr = 0;
      if (masterIds.length) {
        const slot: Array<{ easy: string; authored_canon: string; authored_nr: string }> = await ds.query(`
          SELECT count(*) FILTER (WHERE src='mfds_easy_drug' AND st='canonical')::text easy,
                 count(*) FILTER (WHERE src=ANY($2) AND st='canonical')::text authored_canon,
                 count(*) FILTER (WHERE src=ANY($2) AND st='needs_review')::text authored_nr
          FROM (SELECT s.source_type src, s.status st FROM shared_product_descriptions s
                WHERE s.master_id=ANY($1::uuid[]) AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) t`,
          [masterIds, AUTHORED_SOURCES]);
        easyCanonicalTotal = parseInt(slot[0].easy, 10);
        authoredConflict = parseInt(slot[0].authored_canon, 10);
        existingNr = parseInt(slot[0].authored_nr, 10);
        const per: Array<{ n: string }> = await ds.query(
          `SELECT count(*)::text n FROM unnest($1::uuid[]) mid
           WHERE (SELECT count(*) FROM shared_product_descriptions s
              WHERE s.master_id=mid AND s.source_type='mfds_easy_drug' AND s.status='canonical'
                AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1`, [masterIds]);
        easyExactly1 = parseInt(per[0].n, 10);
      }

      // ── STEP 9: source_ref_id 공유 scope (현재 authored ko canonical SPD 중 이 draft를 source_ref 로 쓰는 master) ──
      // 신규 후보는 target 밖 SPD 가 존재할 수 있다: **동일 그룹의 이미 완료된 형제**(선행 적용, easy demote 되어 coarse 에서 제외됨).
      // 이는 benign(scope 분리 가능) — runner coarse(easy canonical 존재+fp) 가 target 18 만 선택, 완료 형제는 재접촉 없음.
      // GENUINE leak = 다른 그룹(성분/용량/제형 불일치)이 같은 ref 공유 → scope 분리 불가 → HOLD.
      let refScopeMasters = 0; const refOutOfTarget: string[] = [];
      let outSameGroup = 0, outCrossGroup = 0; const crossGroupSamples: string[] = [];
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
            const sameGroup = ingredientOf(r.name) === t.ingredient && strengthOf(r.spec) === t.strength && formOf(r.name) === t.form;
            if (sameGroup) outSameGroup++;
            else { outCrossGroup++; if (crossGroupSamples.length < 5) crossGroupSamples.push(`${r.name} [${r.spec}]`); }
          }
        }
      }

      // ── STEP 10: existing EN state for target masters ──
      let mastersWithEn = 0, enCanonical = 0, enNeedsReview = 0;
      const reviewedEnReusable: Array<{ source_ref_id: string; n: number }> = [];
      if (masterIds.length) {
        const en: Array<{ mwe: string; canon: string; nr: string }> = await ds.query(`
          SELECT count(DISTINCT master_id)::text mwe,
                 count(*) FILTER (WHERE status='canonical')::text canon,
                 count(*) FILTER (WHERE status='needs_review')::text nr
          FROM shared_product_descriptions
          WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND deleted_at IS NULL`, [masterIds]);
        mastersWithEn = parseInt(en[0].mwe, 10); enCanonical = parseInt(en[0].canon, 10); enNeedsReview = parseInt(en[0].nr, 10);
        const reuse: Array<{ src: string; n: string }> = await ds.query(`
          SELECT COALESCE(source_ref_id::text,'<null>') src, count(*)::text n
          FROM shared_product_descriptions
          WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL
          GROUP BY 1 ORDER BY 1`, [masterIds]);
        reuse.forEach((r) => reviewedEnReusable.push({ source_ref_id: r.src, n: parseInt(r.n, 10) }));
      }
      // reusable reviewed EN from already-applied same-group siblings (shared source_ref) — clonixin out-reuse pattern
      let reusableEnFromRef = 0; let reusableEnMd5Count = 0;
      if (authoredSourceRef) {
        const rEn: Array<{ n: string; md5c: string }> = await ds.query(`
          SELECT count(*)::text n, count(DISTINCT md5(content))::text md5c
          FROM shared_product_descriptions
          WHERE source_ref_id=$1::uuid AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL`, [authoredSourceRef]);
        reusableEnFromRef = parseInt(rEn[0].n, 10); reusableEnMd5Count = parseInt(rEn[0].md5c, 10);
      }

      // ── STEP 3: target/exclude/other ── (bridge fp = target; 나머지 fp = other/exclude)
      // "exclude" = 다른 form/route 변종(정/캡슐/기타) + 다른 safety fp. "other" 별도 개념 없어 nonTarget 전체 = exclude.
      const reproduced = bridgeFp != null && target.length === bridge_n;

      // ── STEP 11: expected write ──
      const authoredNrInsert = masterIds.length - existingNr;      // STEP_A authored needs_review INSERT
      const easyDemote = masterIds.length;                         // STEP_B easy demote
      const authoredFlip = masterIds.length;                       // authored canonical flip
      const auditRows = masterIds.length;                          // audit canonical_replaced
      const koWriteTotal = authoredNrInsert + easyDemote + authoredFlip + auditRows;
      const enWriteTarget = masterIds.length - enCanonical;        // target masters needing EN authored (reuse existing canonical)

      // ── verdict gates ──
      const reasons: string[] = [];
      if (sensitive) reasons.push('민감 약효군');
      if (!bridgeFp) reasons.push('bridge fp 없음');
      if (nonOralInTarget.length) reasons.push(`target 비경구 혼입 ${nonOralInTarget.length}`);
      if (!authoredSourceRef) reasons.push('authored draft 없음');
      if (draftCount > 1) reasons.push(`authored draft 다중 ${draftCount}`);
      if (authoredConflict > 0) reasons.push(`authored canonical 충돌 ${authoredConflict}`);
      if (masterIds.length === 0) reasons.push('target master 0');
      if (bridgeFp && !reproduced) reasons.push(`fp 재현 불일치(target ${target.length} !== bridge ${bridge_n})`);
      if (masterIds.length && easyExactly1 !== masterIds.length) reasons.push(`easy canonical 정확히1 아님(${easyExactly1}/${masterIds.length})`);
      if (distinctCauHashes.length > 1) reasons.push(`target safety 불균일(${distinctCauHashes.length})`);
      // GENUINE cross-group leak only → HOLD. same-group already-applied siblings are benign (scope 분리 가능).
      if (outCrossGroup > 0) reasons.push(`source_ref cross-group leak ${outCrossGroup} (${crossGroupSamples.join('; ')})`);
      const verdict = sensitive || nonOralInTarget.length ? 'EXCLUDED' : reasons.length ? 'HOLD' : 'READY';

      results.push({
        verdict, groupKey, pharmKey, sample: b?.sampleName ?? null, atc: b?.atc_code ?? null,
        bridgeFp, bridge_n, coarseTotal: coarse.length,
        target_master: target.length, target_reproduced: reproduced,
        exclude_nonTarget: nonTarget.length, excludeFormBreak, fpDistribution: fpDist,
        easyCanonicalExactly1: easyExactly1, easyCanonicalTotal, authoredConflict, existingAuthoredNeedsReview: existingNr,
        homogeneity: { distinctForms, distinctRoutes, distinctStrengths, distinctCauHashCount: distinctCauHashes.length, nonOralInTarget },
        sensitive, authored_source_ref_id: authoredSourceRef, authored_draft_count: draftCount,
        source_ref_scope: {
          masters_sharing_ref: refScopeMasters, out_of_target_total: refOutOfTarget.length,
          out_same_group_already_applied: outSameGroup, out_cross_group_leak: outCrossGroup,
          cross_group_samples: crossGroupSamples, scope_separable: outCrossGroup === 0,
        },
        existing_en: {
          masters_with_en: mastersWithEn, en_canonical: enCanonical, en_needs_review: enNeedsReview,
          reusable_by_source_ref: reviewedEnReusable,
          reusable_reviewed_en_from_ref: reusableEnFromRef, reusable_en_distinct_md5: reusableEnMd5Count,
        },
        expected_ko_write: { STEP_A_authored_needs_review_INSERT: authoredNrInsert, STEP_B_easy_canonical_demote: easyDemote, STEP_B_authored_canonical_flip: authoredFlip, audit_canonical_replaced: auditRows, ko_total: koWriteTotal },
        expected_en_write: { target_masters_needing_en: enWriteTarget },
        total_write: koWriteTotal + enWriteTarget,
        stop_reason: reasons,
        target_master_ids: masterIds,
        rollback_master_ids: rollbackIds,
      });
    }
  } finally { if (ds.isInitialized) await ds.destroy(); }

  // recommended run order: READY 우선, 큰 clean group 먼저 (target desc → groupKey asc)
  const ready = results.filter((r) => r.verdict === 'READY').sort((a, b) => b.target_master - a.target_master || (a.groupKey < b.groupKey ? -1 : 1));
  ready.forEach((r, i) => { r.recommended_run_order = i + 1; });
  for (const r of results) if (r.recommended_run_order == null) r.recommended_run_order = null;

  const out = {
    wo: 'WO-O4O-OTC-GROUNDED-UPGRADE-NEXT-5-FINAL-AUDIT-NA-V1', agent: '나', readOnly: true, dbWrite: 0,
    track: 'A (grounded upgrade: e약은요 STORE ko canonical → authored canonical 교체 + EN 동반)',
    basis: 'bridge full-content fingerprint (fingerprintOf 정본 VERBATIM) — coarse 를 fp 별 분리, bridge target fp/bridge_n 대조',
    generatedAt_note: 'deterministic — no timestamps embedded (byte-stable across runs)',
    candidates: results,
    ready_order: ready.map((r) => ({ order: r.recommended_run_order, groupKey: r.groupKey, target: r.target_master, ko: r.expected_ko_write.ko_total, en: r.expected_en_write.target_masters_needing_en })),
    summary: {
      READY: results.filter((r) => r.verdict === 'READY').length,
      HOLD: results.filter((r) => r.verdict === 'HOLD').length,
      EXCLUDED: results.filter((r) => r.verdict === 'EXCLUDED').length,
    },
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, 'otc-next-5-audit-v1.json'), JSON.stringify(out, null, 2), 'utf8');

  console.log('JSON_SUMMARY_BEGIN');
  console.log(JSON.stringify({
    summary: out.summary,
    candidates: results.map((c) => `${c.verdict} | ${c.groupKey} [fp ${c.bridgeFp}] target ${c.target_master}/bridge ${c.bridge_n} coarse ${c.coarseTotal} exclude ${c.exclude_nonTarget}${JSON.stringify(c.excludeFormBreak)} easy1 ${c.easyCanonicalExactly1} 충돌 ${c.authoredConflict} nr ${c.existingAuthoredNeedsReview} ref ${c.authored_source_ref_id ? c.authored_source_ref_id.slice(0, 8) : 'none'} refScope ${c.source_ref_scope.masters_sharing_ref}(sameGrp ${c.source_ref_scope.out_same_group_already_applied}/cross ${c.source_ref_scope.out_cross_group_leak}) reuseEN ${c.existing_en.reusable_reviewed_en_from_ref}(md5 ${c.existing_en.reusable_en_distinct_md5}) ko_write ${c.expected_ko_write.ko_total} en_write ${c.expected_en_write.target_masters_needing_en}${c.stop_reason.length ? ' STOP:' + c.stop_reason.join(';') : ''}`),
    ready_order: out.ready_order,
  }, null, 2));
  console.log('JSON_SUMMARY_END');
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
