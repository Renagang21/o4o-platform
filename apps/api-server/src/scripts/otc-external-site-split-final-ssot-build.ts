/**
 * WO-O4O-OTC-EXTERNAL-SITE-SPLIT-READY-FINAL-PRODUCTION-V1 — READY_SPLIT 최종 승인 SSOT 빌더
 *
 * ⚠️ READ-ONLY · DB write 0. 감사 proposal 원본(`bab6b45f2`)은 **수정하지 않는다**.
 *
 * 라 감사(`otc-external-site-split-required-audit-v1.json`)가 제안한 READY_SPLIT 24 fp / 90 master 를
 * DB 원문에서 **전부 재도출**해 대조하고, 통과분만 최종 승인 SSOT 로 확정한다.
 *
 * ── 재도출하는 것 ────────────────────────────────────────────────────────────────
 *  · gencode        : census 조인 계약 VERBATIM (raw_payload->>'mfdsCode')
 *  · ind/dos/cau    : e약은요 STORE ko canonical 원문 3축
 *  · site(route)    : **용법·용량 원문**에서 도출. 제품명 미사용. 정확히 1종이 아니면 탈락
 *  · 효능 대조      : 효능·효과에서 검출된 부위가 용법 부위와 충돌하면 탈락(WO 핵심 원칙)
 *  · 9축 안전지문   : indication·dosage·caution·gencode·site·numeric·age·duration·contraindication
 *  · oldFp(=V2 fp)  : H([H(ind),H(dos),H(cau),gencode,site]) — fingerprintV2 와 동일 산식
 *  · newFp          : 9축 해시. 그룹 키이자 sourceRef 앵커 입력
 *
 * 산출: src/scripts/data/otc-external-site-split-final-approved-ssot-v1.json
 * Usage(apps/api-server): tsx src/scripts/otc-external-site-split-final-ssot-build.ts
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const AUDIT = path.join(DATA_DIR, 'otc-external-site-split-required-audit-v1.json');
const PROPOSAL = path.join(DATA_DIR, 'otc-external-site-split-required-shard-proposal-v1.json');
const EXT_FINAL = path.join(DATA_DIR, 'otc-external-site-final-approved-ssot-v1.json');
const V2_SSOT = path.join(DATA_DIR, 'otc-remaining-shard-assignment-ssot-v2.json');
const OUT = path.join(DATA_DIR, 'otc-external-site-split-final-approved-ssot-v1.json');

const WO = 'WO-O4O-OTC-EXTERNAL-SITE-SPLIT-READY-FINAL-PRODUCTION-V1';
const AUDIT_COMMIT = 'bab6b45f2';
const EXT_LIVE_COMMIT = 'f8549e767';
const EXPECTED = { fp: 24, master: 90, ko: 360, en: 180, write: 540 };
const EXPECTED_ROUTES: Record<string, number> = { cutaneous: 35, oromucosal: 22, nasal: 33 };

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

// ── 감사 계약 VERBATIM ───────────────────────────────────────────────────────────
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
}
const stripTags = (s: string): string => s.replace(/<[^>]+>/g, ' ');
function normalize(s: string): string {
  return stripTags(s)
    .normalize('NFKC')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[·・∙•▪▶►\-–—]/g, ',')
    .replace(/^\s*\d+\)\s*/gm, '')
    .replace(/[，、]/g, ',').replace(/[．。]/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .trim();
}
const SITE_PATTERNS: Array<{ site: string; re: RegExp }> = [
  { site: 'rectal', re: /항문|직장\s?내|직장에|관장/ },
  { site: 'vaginal', re: /질\s?내|질강|질에|질세정|질\s?점막/ },
  { site: 'oromucosal', re: /구강|입\s?안|양치|가글|함수|인후|인두|목구멍|헹구|씹어|잇몸/ },
  { site: 'ophthalmic', re: /결막낭|눈에|안구|점안/ },
  { site: 'nasal', re: /비강|콧\s?속|코\s?안|코에/ },
  { site: 'otic', re: /귀\s?안|귓\s?속|외이도/ },
  { site: 'cutaneous', re: /피부|환부|患部|상처\s?부위|도포|바른다|바르고|바를|문지르|씻어\s?낸다|씻어\s?내고|소독한다|소독하여|닦아\s?낸다|국소\s?부위/ },
];
function detectSites(text: string): Array<{ site: string; evidence: string }> {
  const t = normalize(text);
  const found: Array<{ site: string; evidence: string }> = [];
  for (const p of SITE_PATTERNS) {
    const m = t.match(p.re);
    if (!m) continue;
    const i = Math.max(0, (m.index ?? 0) - 25);
    found.push({ site: p.site, evidence: t.slice(i, (m.index ?? 0) + m[0].length + 35).trim() });
  }
  return found;
}
function numericSig(s: string): string {
  const t = normalize(s);
  const n = (t.match(/[0-9][0-9,.]*\s*(mg|밀리그램|㎎|㎍|마이크로그램|g|그램|정|캡슐|매|포|회|시간|일|주|개월|mL|밀리리터|㎖|L|리터|IU|%)/gi) || [])
    .map((x) => x.replace(/\s+/g, '').toLowerCase()).sort();
  return H([...new Set(n)].join('|'));
}
function ageSig(s: string): string {
  const t = normalize(s);
  const a = (t.match(/(만\s?)?\d+\s*(세|개월)\s*(이상|이하|미만|초과)?|성인|소아|어린이|영아|유아|고령자|노인|임부|수유부/g) || [])
    .map((x) => x.replace(/\s+/g, '')).sort();
  return H([...new Set(a)].join('|'));
}
function durationSig(s: string): string {
  const t = normalize(s);
  const d = (t.match(/\d+\s*(주|일|개월|회|분|초)\s*(이상|이내|정도|간|연속)?/g) || [])
    .map((x) => x.replace(/\s+/g, '')).sort();
  return H([...new Set(d)].join('|'));
}
function contraSig(caution: string): string {
  const t = normalize(caution);
  const m = t.match(/(.*?)(사용하지\s?(마|않)|투여하지\s?(마|말)|바르지\s?(마|않)|사용해서는\s?안)/);
  return H(normalize(m ? m[1] : t.slice(0, 240)));
}

/** 본 트랙이 생산 가능한 경로 — 그 밖은 SSOT 에 올리지 않는다. */
const PRODUCIBLE_ROUTES = new Set(['cutaneous', 'oromucosal', 'nasal']);
const AUTHORED_SOURCES = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'nutrition_combo'];
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];

async function main(): Promise<void> {
  const audit = JSON.parse(fs.readFileSync(AUDIT, 'utf8'));
  const proposal = JSON.parse(fs.readFileSync(PROPOSAL, 'utf8'));
  if (audit.allGatesPass !== true) throw new Error('감사 allGatesPass=false');

  const ready = (audit.masters as any[]).filter((m) => m.verdict === 'READY_SPLIT');
  const holdMulti = (audit.masters as any[]).filter((m) => m.verdict === 'HOLD_MULTI_ROUTE').map((m) => m.masterId);
  const holdPro = (audit.masters as any[]).filter((m) => m.verdict === 'HOLD_PROFESSIONAL_USE').map((m) => m.masterId);
  if (ready.length !== EXPECTED.master) throw new Error(`READY_SPLIT ${ready.length} != ${EXPECTED.master}`);

  const ids = ready.map((m) => m.masterId).sort();
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 600000 },
  });
  await ds.initialize();

  const std = retRows<{ mid: string; gencodes: string[] | null }>(await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes
    FROM product_identifiers pi
    JOIN product_drug_extensions e ON e.product_master_id = pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
     AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL AND pi.product_master_id = ANY($1::uuid[])
    GROUP BY 1 ORDER BY 1`, [ids]));
  const gencodeByMid = new Map<string, string | null>();
  for (const r of std) { const g = (r.gencodes || []).filter(Boolean).sort(); gencodeByMid.set(r.mid, g.length === 1 ? g[0] : null); }

  const rows = retRows<{ id: string; name: string; content: string }>(await ds.query(`
    SELECT pop.id, pm.name, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN product_masters pm ON pm.id = pop.id::uuid
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1) es ON true`, [ids]));
  const byId = new Map(rows.map((r) => [r.id, r]));

  const authored = retRows<{ n: string }>(await ds.query(`
    SELECT count(DISTINCT master_id)::text n FROM shared_product_descriptions
    WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
      AND source_type=ANY($2) AND deleted_at IS NULL`, [ids, AUTHORED_SOURCES]));
  await ds.destroy();

  // ── 전건 재도출 + 대조 ─────────────────────────────────────────────────────────
  const out: any[] = [];
  const rejected: any[] = [];
  for (const m of ready) {
    const r = byId.get(m.masterId);
    const gc = gencodeByMid.get(m.masterId) ?? null;
    const reject = (why: string): void => { rejected.push({ masterId: m.masterId, name: m.name, why }); };
    if (!r) { reject('원문 부재'); continue; }
    if (!gc) { reject('gencode 연결 실패'); continue; }
    if (gc !== m.gencode) { reject(`gencode 상충 ${gc} vs ${m.gencode}`); continue; }
    const sec = sections(r.content);
    const ind = sec['효능·효과'] || '';
    const dos = sec['용법·용량'] || '';
    const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
    if (!ind || !dos) { reject('공식 효능·용법 축 부족'); continue; }

    const dosSites = [...new Set(detectSites(dos).map((s) => s.site))].sort();
    if (dosSites.length !== 1) { reject(`용법 부위 ${dosSites.length}종`); continue; }
    const site = dosSites[0];
    if (site !== m.route) { reject(`route 상충 재도출 ${site} vs 감사 ${m.route}`); continue; }
    if (!PRODUCIBLE_ROUTES.has(site)) { reject(`생산 불가 route ${site}`); continue; }

    // WO 핵심: 효능·효과와 반드시 대조 — 효능에 다른 부위가 있으면 생산하지 않는다.
    const indSites = [...new Set(detectSites(ind).map((s) => s.site))].sort();
    const indConflict = indSites.filter((s) => s !== site);
    if (indConflict.length) { reject(`효능 부위 충돌 ${indConflict.join(',')} vs 용법 ${site}`); continue; }

    const axes = {
      indication: H(normalize(ind)), dosage: H(normalize(dos)), caution: H(normalize(cau)),
      numeric: numericSig(dos), age: ageSig(`${dos}\n${cau}`),
      duration: durationSig(`${dos}\n${cau}`), contraindication: contraSig(cau),
      strengthFormCode: gc,
    };
    const newFp = H([axes.indication, axes.dosage, axes.caution, gc, site,
      axes.numeric, axes.age, axes.duration, axes.contraindication].join('|'));
    const v2Fp = H([axes.indication, axes.dosage, axes.caution, gc, site].join('|'));

    if (newFp !== m.newFp) { reject(`newFp 재현 실패 ${newFp} vs ${m.newFp}`); continue; }
    if (v2Fp !== m.oldFp) { reject(`v2Fp(oldFp) 재현 실패 ${v2Fp} vs ${m.oldFp}`); continue; }
    for (const [k, val] of Object.entries(axes)) {
      if ((m.axes as any)[k] !== val) { reject(`축 ${k} 불일치`); break; }
    }
    if (rejected.length && rejected[rejected.length - 1].masterId === m.masterId) continue;

    out.push({
      masterId: m.masterId, name: r.name, fp: newFp, v2Fp, gencode: gc, suffix: gc.slice(6, 9),
      route: site, officialSite: site,
      evidence: detectSites(dos).find((s) => s.site === site)?.evidence || '',
      evidenceSection: '용법·용량',
      indicationSites: indSites, axes,
      professionalUseVerdict: 'PRODUCIBLE_STORE',
      shard: (['ga', 'na', 'da'] as const).find((s) => (proposal.shards[s].masterIds as string[]).includes(m.masterId)) || 'ga',
    });
  }

  // ── 그룹 + shard ───────────────────────────────────────────────────────────────
  const byFp = new Map<string, any[]>();
  for (const m of out) { if (!byFp.has(m.fp)) byFp.set(m.fp, []); byFp.get(m.fp)!.push(m); }
  const groups = [...byFp.entries()].map(([fp, arr]) => ({
    fp, v2Fp: arr[0].v2Fp, gencode: arr[0].gencode, route: arr[0].route,
    size: arr.length, masterIds: arr.map((x) => x.masterId).sort(),
  })).sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));

  const shards: Record<string, any> = {};
  for (const s of ['ga', 'na', 'da']) {
    const mine = out.filter((m) => m.shard === s);
    const fps = [...new Set(mine.map((m) => m.fp))].sort();
    const routes: Record<string, number> = {};
    for (const m of mine) routes[m.route] = (routes[m.route] || 0) + 1;
    shards[s] = { fingerprints: fps.length, masters: mine.length, routes,
      writePlan: { masters: mine.length, ko: mine.length * 4, en: mine.length * 2, total: mine.length * 6 },
      fingerprintList: fps, masterIds: mine.map((m) => m.masterId).sort() };
  }

  // ── 교집합 ────────────────────────────────────────────────────────────────────
  const ext = JSON.parse(fs.readFileSync(EXT_FINAL, 'utf8'));
  const extM = new Set<string>((ext.masters as any[]).map((m) => m.masterId));
  const extFp = new Set<string>((ext.masters as any[]).map((m) => m.fp));
  const v2 = JSON.parse(fs.readFileSync(V2_SSOT, 'utf8'));
  const v2M = new Set<string>(); const v2Fps = new Set<string>();
  for (const k of ['ga', 'na', 'da']) { for (const x of v2.shards[k].masterIds) v2M.add(x); for (const f of v2.shards[k].fingerprintList) v2Fps.add(f); }

  const outIds = out.map((m) => m.masterId);
  const routeTally: Record<string, number> = {};
  for (const m of out) routeTally[m.route] = (routeTally[m.route] || 0) + 1;
  const axisHomogeneous = groups.every((g) => {
    const ms = g.masterIds.map((id) => out.find((x) => x.masterId === id)!);
    return new Set(ms.map((x) => JSON.stringify(x.axes))).size === 1
      && new Set(ms.map((x) => x.route)).size === 1;
  });

  const gates: Record<string, boolean> = {
    'S1 총계 24fp/90master': groups.length === EXPECTED.fp && out.length === EXPECTED.master,
    'S2 master 누락·중복 0': outIds.length === new Set(outIds).size && rejected.length === 0,
    'S3 fp 내부 9축 안전지문 일치': axisHomogeneous,
    'S4 fp 간 master 교집합 0': groups.flatMap((g) => g.masterIds).length === new Set(groups.flatMap((g) => g.masterIds)).size,
    'S5 외부 적용부위 LIVE 199 교집합 0': outIds.every((id) => !extM.has(id)) && groups.every((g) => !extFp.has(g.fp)),
    'S6 V2 LIVE 2,509 교집합 0': outIds.every((id) => !v2M.has(id)) && groups.every((g) => !v2Fps.has(g.fp)),
    'S7 HOLD_MULTI_ROUTE 포함 0': outIds.every((id) => !holdMulti.includes(id)),
    'S8 HOLD_PROFESSIONAL_USE 포함 0': outIds.every((id) => !holdPro.includes(id)),
    'S9 공식 효능·용법 근거 결손 0': out.every((m) => m.evidence && m.evidenceSection === '용법·용량'),
    'S10 route별 수량 일치': Object.entries(EXPECTED_ROUTES).every(([r, n]) => routeTally[r] === n),
    'S11 예상 write 540T': out.length * 4 === EXPECTED.ko && out.length * 2 === EXPECTED.en && out.length * 6 === EXPECTED.write,
    'S12 기존 authored canonical 보유 0': parseInt(authored[0]?.n || '0', 10) === 0,
    'S13 효능·용법 route 충돌 0': out.every((m) => m.indicationSites.every((s: string) => s === m.route)),
  };
  const allPass = Object.values(gates).every(Boolean);

  const ssot = {
    wo: WO, artifact: 'production-approval-ssot',
    status: allPass ? 'APPROVED_FOR_PRODUCTION' : 'BLOCKED',
    agent: 'da', writeOwner: 'agent-da', readOnly: true, dbWrite: 0,
    approvedFrom: { audit: 'otc-external-site-split-required-audit-v1.json', auditCommit: AUDIT_COMMIT,
      proposal: 'otc-external-site-split-required-shard-proposal-v1.json',
      note: '감사 proposal 원본은 수정하지 않았다. 본 파일이 생산 승인 SSOT 다.' },
    baseline: { externalFinalLiveCommit: EXT_LIVE_COMMIT, externalLiveMasters: 199, v2LiveMasters: 2509 },
    approvalBasis: [
      '공식 용법·용량 원문에서 적용부위 1종만 확인된 대상만 승인',
      '효능·효과에서 검출된 부위가 용법 부위와 다르면 생산하지 않음(복수 경로 병존 차단)',
      '9축 안전지문(효능·용법·주의·일반명코드·부위·수치·연령·기간·금기)을 DB 원문에서 전건 재도출해 대조',
      'oldFp(=V2 fingerprintV2 산식)와 newFp(9축) 를 모두 재현 확인',
      '제품명은 어떤 축 판정에도 사용하지 않음',
    ],
    fingerprintContract: {
      groupKey: 'newFp = H([indication, dosage, caution, gencode, site, numeric, age, duration, contraindication])',
      v2Fp: 'oldFp = H([indication, dosage, caution, gencode, site]) — fingerprintV2 와 동일 산식',
      sourceRefAnchor: 'fpToUuidV2(newFp)',
    },
    exclusions: { HOLD_MULTI_ROUTE: holdMulti.length, HOLD_PROFESSIONAL_USE: holdPro.length, HOLD_SOURCE: 0, EXCLUDE: 0 },
    totals: { fingerprints: groups.length, masters: out.length },
    routeTotals: routeTally,
    writePlan: { perMaster: { ko: 4, en: 2, total: 6 }, ko: out.length * 4, en: out.length * 2, total: out.length * 6 },
    gates, allGatesPass: allPass, rejected,
    shards, groups, masters: out.sort((a, b) => (a.masterId < b.masterId ? -1 : 1)),
  };
  fs.writeFileSync(OUT, JSON.stringify(ssot, null, 1) + '\n', 'utf8');

  console.log(`SPLIT FINAL SSOT — ${groups.length} fp / ${out.length} master · status ${ssot.status}`);
  console.log(`  route: ${Object.entries(routeTally).map(([r, n]) => `${r} ${n}`).join(' · ')}`);
  console.log(`  writePlan KO ${out.length * 4} + EN ${out.length * 2} = ${out.length * 6}`);
  for (const [k, v] of Object.entries(gates)) console.log(`  ${v ? 'PASS' : '*** FAIL ***'}  ${k}`);
  if (rejected.length) { console.log(`  탈락 ${rejected.length}:`); rejected.slice(0, 10).forEach((r) => console.log(`    - ${r.name}: ${r.why}`)); }
  console.log(`  → ${OUT}`);
  if (!allPass) process.exitCode = 1;
}

main().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
