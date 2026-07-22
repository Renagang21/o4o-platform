/**
 * WO-O4O-OTC-NEW-INCOMPLETE-GROUP-DISCOVERY-AUDIT-NA-V1 — Agent 나. READ-ONLY · DB write 0 · apply 0.
 *
 * 목적: bridge authored그대로확장 fp-entry 전체를 모집단으로, **이미 생산/배정된 그룹을 감사 前 전수 제거**한 뒤
 *       실제 미완료(never-produced) 신규 후보만 audit → 가/다 배정 manifest 생성.
 *
 * 제외 판정(DB 최우선 SSOT + repo 신호):
 *   - draft(source_ref) 의 authored ko canonical distinct master A_ko, en canonical A_en 를 DB 에서 집계.
 *   - A_ko>0 & A_en>0            → EXCLUDE_LIVE (완료; 라벨 무관 DB 로 확정 — 8B 재발 방지)
 *   - A_ko>0 & (A_en<A_ko)       → REVIEW_LATER_PARTIAL (KO만/부분 EN)
 *   - draft 없음                 → REVIEW_LATER_NO_DRAFT (runner 생산 불가, 선행 authoring 필요)
 *   - registry/bundle-config 등재 → EXCLUDE_ASSIGNED (DB 미반영이어도 배정/준비됨)
 *   - A_ko==0 & A_en==0 & draft 有 → NEW_PENDING → gate audit(coarse E·fp 단일·easy exactly-1·safety 균일·oral·sibling 분리)
 * gate 통과 → NEW_READY, 불확실 → REVIEW_LATER.
 *
 * 산출: src/scripts/data/otc-new-incomplete-discovery-v1.json (detail) — 채팅엔 수치만.
 * Usage(apps/api-server): npx tsx src/scripts/otc-new-incomplete-discovery-audit.ts
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const BRIDGE = path.resolve(OUT_DIR, 'otc-full-corpus-authored-bridge-groups-v1.json');
const RUNNER = path.resolve(process.cwd(), 'src/scripts/drug-otc-grounded-upgrade-runner.ts');
const BUCKET = 'authored그대로확장';
const AUTH = ['mfds_drug_otc', 'nutrition_combo'];
const SENSITIVE_RE = /아스피린|아세틸살리실산|와파린|클로피도그렐|헤파린|덱사메타손|프레드니솔론|하이드로코르티손|모르핀|코데인|메칠페니데이트|인슐린|레보티록신/;

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string { return stripTags(s || '').normalize('NFKC').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/[·・∙•▪▶►\-–—]/g, ',').replace(/^\s*\d+\)\s*/gm, '').replace(/[，、]/g, ',').replace(/[．。]/g, '.').replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').trim(); }
function easySections(content: string): Record<string, string> { const out: Record<string, string> = {}; const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g; let m: RegExpExecArray | null; while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim(); return out; }
function freeSections(content: string): Record<string, string> { const out: Record<string, string> = {}; const re = /<(h[1-4]|strong)[^>]*>\s*([^<]{2,40}?)\s*<\/\1>([\s\S]*?)(?=<(?:h[1-4]|strong)[^>]*>|$)/gi; let m: RegExpExecArray | null; while ((m = re.exec(content))) { const t = m[2].replace(/[:：]\s*$/, '').trim(); const b = m[3].trim(); if (t) out[t] = (out[t] ? out[t] + '\n' : '') + b; } return out; }
function bucketSections(sec: Record<string, string>): { ind: string; dos: string; cau: string } { let ind = '', dos = '', cau = ''; for (const [t, b] of Object.entries(sec)) { if (/효능|효과|적응|용도/.test(t)) ind += (ind ? '\n' : '') + b; else if (/용법|용량|복용|투여\s*방법|사용\s*방법|사용법/.test(t)) dos += (dos ? '\n' : '') + b; else if (/주의|경고|금기|부작용|이상\s*반응|임부|임신|수유/.test(t)) cau += (cau ? '\n' : '') + b; } return { ind, dos, cau }; }
const formOf = (name: string): string => /연질캡슐/.test(name) ? '연질캡슐' : /캡슐/.test(name) ? '캡슐' : /연고/.test(name) ? '연고' : /크림/.test(name) ? '크림' : /플라스타|첩부|패치|패취|카타플/.test(name) ? '첩부제' : /점안/.test(name) ? '점안액' : /시럽/.test(name) ? '시럽' : /과립|산\(/.test(name) ? '과립/산' : /정/.test(name) ? '정' : /액/.test(name) ? '액' : '기타';
function routeSig(name: string): string { if (/질정|질좌|질내정|질\s?삽입/.test(name)) return 'vaginal'; if (/좌약|좌제/.test(name)) return 'rectal'; if (/점안|안연고/.test(name)) return 'ophthalmic'; if (/점이액|귀에/.test(name)) return 'otic'; if (/점비|비강/.test(name)) return 'nasal'; if (/크림|연고|로션|로숀|겔$|겔\(|겔제|젤$|젤\(|플라스타|플라스터|첩부|카타플|패취|패치|파스|파프|스왑|스틱|거즈|탈지면|솜|네일라카|라카|외용|도포|스프레이|에어로솔|에어졸|소독|폼$|폼\(|워시|카타플라스마/.test(name)) return 'topical'; if (/정$|정\d|정\(|정밀리|정\[|캡슐|캅셀|캅셀|시럽|현탁|과립|산제|산\(|트로키|츄어|씹|저작|드링크|내복|환$|환\(|액$|액\(|액\[|물약|시럽제/.test(name)) return 'oral'; return 'unknown'; }
const ingredientOf = (name: string): string => (name.match(/\(([^()]+)\)\s*$/)?.[1] || '').trim();
const strengthOf = (spec: string): string => (spec || '').split(' / ')[0].trim();
function fingerprintOf(name: string, spec: string, content: string): { fp: string; route: string; form: string; cauHash: string } { let sec = easySections(content || ''); if (Object.keys(sec).length === 0) sec = freeSections(content || ''); const { ind, dos, cau } = bucketSections(sec); const cauHash = H(normalize(cau)); const fp = H([H(normalize(ind)), H(normalize(dos)), cauHash, H(`${ingredientOf(name)}|${strengthOf(spec)}`), H(formOf(name)), routeSig(name)].join('|')); return { fp, route: routeSig(name), form: formOf(name), cauHash }; }

function repoAssignedKeys(): Set<string> {
  const keys = new Set<string>();
  // GROUP_REGISTRY: key: '...'
  try { const txt = readFileSync(RUNNER, 'utf8'); for (const m of txt.matchAll(/key:\s*'([^']+)'/g)) keys.add(m[1]); } catch { /* noop */ }
  // bundle config JSON: .ko/.groups map → inner .key
  for (const f of readdirSync(OUT_DIR)) {
    if (!/otc.*bundle.*(config|summary)/i.test(f) && !/ko-en-bundle/i.test(f)) continue;
    try { const j = JSON.parse(readFileSync(path.join(OUT_DIR, f), 'utf8')); const map = j.ko ?? j.groups ?? {}; for (const v of Object.values<any>(map)) if (v && typeof v === 'object' && v.key) keys.add(v.key); if (Array.isArray(j.groups)) for (const g of j.groups) if (g?.key) keys.add(g.key); } catch { /* noop */ }
  }
  return keys;
}
function runJsonOutbases(): Set<string> { const s = new Set<string>(); for (const f of readdirSync(OUT_DIR)) { const m = f.match(/^(otc-grounded-upgrade-.+?)\.(run|dryrun-pass)\.json$/); if (m) s.add(m[1]); } return s; }

async function main(): Promise<void> {
  const bridge = JSON.parse(readFileSync(BRIDGE, 'utf8'));
  const barr: any[] = bridge.groups || bridge;
  const byPk = new Map<string, any>();
  for (const g of barr) { const n = (g.counts || {})[BUCKET] || 0; if (n <= 0) continue; const prev = byPk.get(g.pharmKey); if (!prev || n > ((prev.counts || {})[BUCKET] || 0)) byPk.set(g.pharmKey, g); }
  let pool = [...byPk.values()].map((g) => ({ groupKey: `${g.ingredient}|${g.strength}|${g.form}`, pharmKey: g.pharmKey, fp: g.fingerprint as string, bridge_n: g.counts[BUCKET] as number, ing: g.ingredient as string, strength: g.strength as string, form: g.form as string, route: g.route as string, atc: g.atc_code as string, sample: g.sampleName as string }));
  const preCounts = { total: pool.length } as any;
  pool = pool.filter((e) => e.route === 'oral' && e.ing && !SENSITIVE_RE.test(e.ing));
  preCounts.eligible_oral_realing_nonsensitive = pool.length;

  const assigned = repoAssignedKeys();
  const outbases = runJsonOutbases();

  const { DataSource } = await import('typeorm');
  // 기본 proxy 5433. 공유 proxy 장애 시 DISCOVERY_DB_PORT 로 전용 proxy(예: 5434) 지정.
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: parseInt(process.env.DISCOVERY_DB_PORT || '5433', 10), username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();

  const rows: any[] = [];
  try {
    // 1) drafts: groupKey → candidate_id (+multi)
    const gks = pool.map((p) => p.groupKey);
    const drafts: Array<{ gk: string; cid: string; n: string }> = await ds.query(
      `SELECT seed_json->>'groupKey' gk, min(candidate_id::text) cid, count(*)::text n
       FROM product_candidate_description_drafts WHERE source_label='MFDS_DRUG_OTC' AND deleted_at IS NULL AND seed_json->>'groupKey'=ANY($1) GROUP BY 1`, [gks]);
    const draftMap = new Map<string, { cid: string; n: number }>();
    for (const d of drafts) draftMap.set(d.gk, { cid: d.cid, n: parseInt(d.n, 10) });

    // 2) authored ko/en canonical distinct-master per source_ref (only for known cids)
    const cids = [...draftMap.values()].map((v) => v.cid);
    const prod = new Map<string, { ako: number; aen: number }>();
    if (cids.length) {
      const pr: Array<{ ref: string; ako: string; aen: string }> = await ds.query(
        `SELECT source_ref_id::text ref,
                count(DISTINCT master_id) FILTER (WHERE COALESCE(language,'ko')='ko' AND status='canonical' AND source_type=ANY($2))::text ako,
                count(DISTINCT master_id) FILTER (WHERE language='en' AND status='canonical')::text aen
         FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND description_type='STORE' AND deleted_at IS NULL GROUP BY 1`, [cids, AUTH]);
      for (const r of pr) prod.set(r.ref, { ako: parseInt(r.ako, 10), aen: parseInt(r.aen, 10) });
    }

    // 3) pre-classify (A_ko/A_en/draft/registry) — 최종 판정은 E_target(easy-canonical 미생산 target 잔량) 기준으로 4)에서
    for (const p of pool) {
      const d = draftMap.get(p.groupKey);
      const pr = d ? (prod.get(d.cid) || { ako: 0, aen: 0 }) : { ako: 0, aen: 0 };
      rows.push({ ...p, cid: d?.cid ?? null, draftCount: d?.n ?? 0, A_ko: pr.ako, A_en: pr.aen, inRegistry: assigned.has(p.groupKey), cls: 'PENDING_GATE' });
    }

    // 4) gate: **전 eligible 그룹**에 coarse-easy fingerprint → E_target(=gate.target, easy-canonical 미생산 target 잔량) 산출 후 분류.
    //    E_target>0 = 지금 생산 가능한 미완료 target 존재(형제 선행생산 A_ko>0 여도). E_target==0 & A_ko>0 = 완전 소진(EXCLUDE_LIVE).
    const pendings = rows;
    let done = 0;
    for (const r of pendings) {
     try {
      if (!ds.isInitialized) await ds.initialize();
      const coarse: Array<{ id: string; name: string; spec: string; content: string }> = await ds.query(
        `SELECT pm.id::text id, pm.name, pm.specification spec, es.content
         FROM product_masters pm
         JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL ORDER BY length(s.content) DESC LIMIT 1) es ON true
         WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%' ORDER BY pm.id`, [r.ing, r.strength, r.form]);
      const withFp = coarse.map((c) => ({ ...c, ...fingerprintOf(c.name, c.spec, c.content) }));
      const target = withFp.filter((c) => c.fp === r.fp);
      const nonTarget = withFp.filter((c) => c.fp !== r.fp);
      const ids = target.map((c) => c.id).sort();
      const distinctForms = [...new Set(target.map((c) => c.form))];
      const distinctRoutes = [...new Set(target.map((c) => c.route))];
      const distinctCau = [...new Set(target.map((c) => c.cauHash))];
      const nonOral = target.filter((c) => c.route !== 'oral').length;
      let easy1 = 0, authoredConflict = 0, enExisting = 0;
      if (ids.length) {
        const slot: Array<{ e1: string; ac: string; en: string }> = await ds.query(
          `SELECT (SELECT count(*) FROM unnest($1::uuid[]) m WHERE (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m AND s.source_type='mfds_easy_drug' AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1)::text e1,
                  (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.source_type=ANY($2) AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)::text ac,
                  (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=ANY($1::uuid[]) AND s.language='en' AND s.status='canonical' AND s.description_type='STORE' AND s.deleted_at IS NULL)::text en`, [ids, AUTH]);
        easy1 = parseInt(slot[0].e1, 10); authoredConflict = parseInt(slot[0].ac, 10); enExisting = parseInt(slot[0].en, 10);
      }
      const E_target = target.length; // easy-canonical 미생산 target 잔량
      r.gate = { coarseTotal: coarse.length, target: E_target, exclude: nonTarget.length, easy1, authoredConflict, enExisting, distinctForms, distinctRoutes, distinctCau: distinctCau.length, nonOral, target_master_ids: ids };
      r.T = E_target;
      // ── 분류 (E_target 기준) ──
      if (E_target === 0) {
        // 미생산 target 잔량 0 → 완전 소진 or 미착수(형제도 없음)
        r.cls = r.A_ko > 0 ? 'EXCLUDE_LIVE' : (r.inRegistry ? 'EXCLUDE_ASSIGNED' : 'REVIEW_LATER_NO_TARGET');
        r.gateReasons = [];
      } else {
        // 미생산 target 잔량 존재 → gate 정합성 검사
        const reasons: string[] = [];
        if (!r.cid) reasons.push('draft 없음');
        if (r.inRegistry) reasons.push('registry/config 배정됨');
        if (E_target !== r.bridge_n) reasons.push(`fp재현 ${E_target}!=${r.bridge_n}`);
        if (easy1 !== ids.length) reasons.push(`easy1 ${easy1}/${ids.length}`);
        if (authoredConflict > 0) reasons.push(`authored충돌 ${authoredConflict}`);
        if (enExisting > 0) reasons.push(`en기존 ${enExisting}`);
        if (distinctForms.length > 1) reasons.push('form 불균일');
        if (distinctRoutes.length > 1 || distinctRoutes[0] !== 'oral') reasons.push('route 불균일/비oral');
        if (nonOral > 0) reasons.push(`비oral ${nonOral}`);
        if (distinctCau.length > 1) reasons.push('safety 불균일');
        r.gateReasons = reasons;
        r.cls = reasons.length ? (reasons.length === 1 && reasons[0] === 'registry/config 배정됨' ? 'EXCLUDE_ASSIGNED' : 'REVIEW_LATER_GATE') : 'NEW_READY';
        r.remainderNote = r.A_ko > 0 ? `형제 선행생산 A_ko=${r.A_ko}, 미생산 target 잔량 ${E_target}` : `미착수, target ${E_target}`;
      }
     } catch (e) {
      r.cls = 'REVIEW_LATER_GATE'; r.gateReasons = [`query error: ${e instanceof Error ? e.message : e}`]; r.T = r.T ?? 0; r.gate = r.gate ?? { exclude: 0, target_master_ids: [] };
      try { if (ds.isInitialized) await ds.destroy(); } catch { /* noop */ }
      await new Promise((res) => setTimeout(res, 1500));
      await ds.initialize();
     }
     done++;
     if (done % 10 === 0) console.error(`  gate progress ${done}/${pendings.length}`);
    }
  } finally { if (ds.isInitialized) await ds.destroy(); }

  const by = (c: string) => rows.filter((r) => r.cls === c);
  const ready = by('NEW_READY').sort((a, b) => b.T - a.T || (a.groupKey < b.groupKey ? -1 : 1));
  // 배정: target desc greedy 2-bin balance (최대 8/bin, 최소 4 권장 — 물량 부족시 그대로)
  const A: any[] = [], B: any[] = []; let sa = 0, sb = 0;
  for (const r of ready) { if ((sa <= sb && A.length < 8) || B.length >= 8) { A.push(r); sa += r.T; } else { B.push(r); sb += r.T; } }
  const sortBin = (arr: any[]) => arr.sort((x, y) => (x.gate.exclude === 0 ? -1 : 0) - (y.gate.exclude === 0 ? -1 : 0) || y.T - x.T || (x.groupKey < y.groupKey ? -1 : 1));
  sortBin(A); sortBin(B);
  const aIds = new Set(A.flatMap((r) => r.gate.target_master_ids));
  const bIds = B.flatMap((r) => r.gate.target_master_ids);
  const inter = bIds.filter((id) => aIds.has(id));
  const sumT = (arr: any[]) => arr.reduce((a, r) => a + r.T, 0);

  const verdict = ready.length >= 4 ? 'READY_FOR_PRODUCTION' : ready.length > 0 ? 'READY_FOR_PRODUCTION_SMALL' : 'NO_NEW_BATCH';
  const out = {
    wo: 'WO-O4O-OTC-NEW-INCOMPLETE-GROUP-DISCOVERY-AUDIT-NA-V1', agent: '나', readOnly: true, dbWrite: 0,
    ssot: { origin_main_check: '92fc065f4', bridge: 'otc-full-corpus-authored-bridge-groups-v1.json' },
    preCounts, repoSignals: { registryOrConfigKeys: assigned.size, runJsonManifests: outbases.size },
    summary: {
      pool_eligible: pool.length,
      EXCLUDE_LIVE: by('EXCLUDE_LIVE').length, EXCLUDE_ASSIGNED: by('EXCLUDE_ASSIGNED').length,
      REVIEW_LATER_NO_TARGET: by('REVIEW_LATER_NO_TARGET').length, REVIEW_LATER_GATE: by('REVIEW_LATER_GATE').length,
      NEW_READY: ready.length,
    },
    formula: 'T=target master · ko=4T · en=2T · total=6T',
    bundle_A_ga: A.map((r) => ({ groupKey: r.groupKey, T: r.T, targetFp: r.fp, exclude: r.gate.exclude, cid: r.cid, ko: 4 * r.T, en: 2 * r.T, total: 6 * r.T, atc: r.atc })),
    bundle_B_da: B.map((r) => ({ groupKey: r.groupKey, T: r.T, targetFp: r.fp, exclude: r.gate.exclude, cid: r.cid, ko: 4 * r.T, en: 2 * r.T, total: 6 * r.T, atc: r.atc })),
    bundle_totals: { A_T: sumT(A), A_total: 6 * sumT(A), B_T: sumT(B), B_total: 6 * sumT(B), grand_T: sumT(ready), grand_total: 6 * sumT(ready) },
    crossBundleIntersection: inter.length,
    review_later: {
      gate: by('REVIEW_LATER_GATE').map((r) => ({ groupKey: r.groupKey, T: r.T, A_ko: r.A_ko, A_en: r.A_en, reasons: r.gateReasons, note: r.remainderNote })),
      no_target: by('REVIEW_LATER_NO_TARGET').map((r) => ({ groupKey: r.groupKey, A_ko: r.A_ko, A_en: r.A_en, hasDraft: !!r.cid })),
    },
    exclude_assigned: by('EXCLUDE_ASSIGNED').map((r) => ({ groupKey: r.groupKey, T: r.T, A_ko: r.A_ko, A_en: r.A_en })),
    ready_detail: ready.map((r) => ({ groupKey: r.groupKey, T: r.T, targetFp: r.fp, exclude: r.gate.exclude, cid: r.cid, target_master_ids: r.gate.target_master_ids })),
    verdict,
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, 'otc-new-incomplete-discovery-v1.json'), JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ preCounts, repoSignals: out.repoSignals, summary: out.summary, bundle_totals: out.bundle_totals, crossBundleIntersection: inter.length, verdict, A: out.bundle_A_ga.map((g: any) => `${g.groupKey} T${g.T}`), B: out.bundle_B_da.map((g: any) => `${g.groupKey} T${g.T}`) }, null, 2));
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
