/**
 * WO-O4O-OTC-EXTERNAL-SITE-RECOVERABLE-SHARD-APPROVAL-V1 — 에이전트 라 (조사 전용)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · apply 0.
 *
 * 목적: commit `3b1181145` 회수 감사의 RECOVERABLE 중 identity 미분산
 *       **47 fingerprint / 278 master** 를 생산 승인 SSOT 로 확정한다.
 *
 * 원본 보존:
 *   `otc-external-site-recovery-shard-proposal-v1.json` (status: PROPOSAL) 은 수정하지 않는다.
 *   본 스크립트는 신규 파일 `otc-external-site-recovery-approved-ssot-v1.json` 만 생성한다.
 *
 * 승인 근거(WO 명시):
 *   · 공식 e약은요 `용법·용량` 원문에서 적용부위가 정확히 1종만 확인됨
 *   · 제품명으로 경로를 추정하지 않음
 *   · 기존 V2 READY 와 fp/master 교집합 0
 *   · shard 상호 교집합 0
 *
 * 본 스크립트가 재검증하는 것:
 *   G1 proposal 총계 일치 (47 fp / 278 master)
 *   G2 가·나·다 fp 교집합 0 · master 교집합 0
 *   G3 V2 READY shard(2,517 master / 716 fp) 와 교집합 0
 *   G4 **V2 LIVE apply 완료분(2,509 master)** 과 교집합 0
 *      — apply-run 리포트의 fp 를 V2 census readyGroups 로 역산해 산출
 *   G5 적용부위 근거 재도출 — 278 전건을 원문에서 다시 판정해 proposal 의 route 와 일치 확인
 *   G6 DB 실사 — 278 중 authored STORE canonical(ko/en) 보유 0 (실제 미생산 확인)
 *   G7 EXCLUDE 키워드/대용량 혼입 0
 *
 * 결정론: 타임스탬프 미포함 · 모든 배열 정렬 · 2회 실행 byte-identical.
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442. env 는 process.env 로만 전달(값 열람·출력 0).
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-external-site-recovery-approval.ts
 * 산출: src/scripts/data/otc-external-site-recovery-approved-ssot-v1.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const P_PROPOSAL = path.join(OUT_DIR, 'otc-external-site-recovery-shard-proposal-v1.json');
const P_AUDIT = path.join(OUT_DIR, 'otc-external-site-recovery-audit-v1.json');
const P_V2_SHARD = path.join(OUT_DIR, 'otc-remaining-shard-assignment-ssot-v2.json');
const P_V2_CENSUS = path.join(OUT_DIR, 'otc-remaining-full-corpus-census-v2.json');
const OUT_SSOT = path.join(OUT_DIR, 'otc-external-site-recovery-approved-ssot-v1.json');

const EXCLUDE_RE =
  /수출\s*명|수출\s*용|수출\s*전용|전량\s*수출|for\s*export|export\s*only|군납|군납명|보건소\s*용|보건소\s*납품|비매품|임상\s*시험\s*용|샘플\s*용|견본\s*품|별첨/i;

// ── 원문 파싱 · 적용부위 탐지 (감사 스크립트와 동일 규칙) ──────────────────────────
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
type Site = 'cutaneous' | 'oromucosal' | 'vaginal' | 'rectal' | 'ophthalmic' | 'nasal' | 'otic';
const SITE_PATTERNS: Array<{ site: Site; re: RegExp; label: string }> = [
  { site: 'rectal', re: /항문|직장\s?내|직장에|관장/, label: '항문/직장/관장' },
  { site: 'vaginal', re: /질\s?내|질강|질에|질세정|질\s?점막/, label: '질내/질강' },
  { site: 'oromucosal', re: /구강|입\s?안|양치|가글|함수|인후|인두|목구멍|헹구|씹어|잇몸/, label: '구강/인후/양치' },
  { site: 'ophthalmic', re: /결막낭|눈에|안구|점안/, label: '결막낭/눈/점안' },
  { site: 'nasal', re: /비강|콧\s?속|코\s?안|코에/, label: '비강/코' },
  { site: 'otic', re: /귀\s?안|귓\s?속|외이도/, label: '외이도/귀' },
  { site: 'cutaneous', re: /피부|환부|患部|상처\s?부위|도포|바른다|바르고|바를|문지르|씻어\s?낸다|씻어\s?내고|소독한다|소독하여|닦아\s?낸다|국소\s?부위/, label: '피부/환부/도포/소독' },
];
function detectSites(dosageText: string): Array<{ site: Site; label: string; evidence: string }> {
  const t = normalize(dosageText);
  const found: Array<{ site: Site; label: string; evidence: string }> = [];
  for (const p of SITE_PATTERNS) {
    const m = t.match(p.re);
    if (!m) continue;
    const i = Math.max(0, (m.index ?? 0) - 25);
    found.push({ site: p.site, label: p.label, evidence: t.slice(i, (m.index ?? 0) + m[0].length + 35).trim() });
  }
  return found;
}

async function main(): Promise<void> {
  const proposal = JSON.parse(fs.readFileSync(P_PROPOSAL, 'utf8'));
  const audit = JSON.parse(fs.readFileSync(P_AUDIT, 'utf8'));
  const v2Shard = JSON.parse(fs.readFileSync(P_V2_SHARD, 'utf8'));
  const v2Census = JSON.parse(fs.readFileSync(P_V2_CENSUS, 'utf8'));

  const SH = ['ga', 'na', 'da'] as const;

  // proposal → shard별 fp/master
  const shardFps: Record<string, string[]> = {};
  const shardMasters: Record<string, string[]> = {};
  for (const k of SH) {
    shardFps[k] = [...(proposal.shards[k].fingerprintList as string[])].sort();
    shardMasters[k] = [...(proposal.shards[k].masterIds as string[])].sort();
  }
  const allFps = SH.flatMap((k) => shardFps[k]);
  const allMasters = SH.flatMap((k) => shardMasters[k]);
  const shardOf = new Map<string, string>();
  for (const k of SH) for (const id of shardMasters[k]) shardOf.set(id, k);

  // fp → 그룹 메타(감사 산출물)
  const groupByFp = new Map<string, any>((audit.recoverableGroups as any[]).map((g) => [g.fp, g]));
  const fpOfMaster = new Map<string, string>();
  for (const g of audit.recoverableGroups as any[]) for (const id of g.masterIds as string[]) fpOfMaster.set(id, g.fp);

  // V2 READY (2,517) / V2 LIVE apply 완료(2,509)
  const v2ReadyFps = new Set<string>(SH.flatMap((k) => v2Shard.shards[k].fingerprintList as string[]));
  const v2ReadyMasters = new Set<string>(SH.flatMap((k) => v2Shard.shards[k].masterIds as string[]));
  const fpToMasters = new Map<string, string[]>((v2Census.readyGroups as any[]).map((g) => [g.fp, g.masterIds]));
  const v2AppliedMasters = new Set<string>();
  const v2AppliedFps = new Set<string>();
  for (const k of SH) for (const lang of ['ko', 'en']) {
    const p = path.join(OUT_DIR, `otc-v2-apply-run.${k}.${lang}.json`);
    if (!fs.existsSync(p)) continue;
    for (const r of JSON.parse(fs.readFileSync(p, 'utf8')).reports as any[]) {
      v2AppliedFps.add(r.fp);
      for (const m of fpToMasters.get(r.fp) || []) v2AppliedMasters.add(m);
    }
  }

  // ── DB 실사 ─────────────────────────────────────────────────────────────────────
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'],
    extra: { statement_timeout: 600000 },
  });
  await ds.initialize();

  const idList = `ARRAY[${allMasters.map((i) => `'${i}'`).join(',')}]::uuid[]`;
  const rows: Array<{ id: string; name: string; spec: string | null; content: string | null }> = await ds.query(`
    SELECT pm.id::text id, pm.name, pm.specification spec, es.content
    FROM product_masters pm
    LEFT JOIN LATERAL (
      SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1
    ) es ON true
    WHERE pm.id = ANY(${idList}) ORDER BY pm.id`);

  const authored: Array<{ id: string; lang: string }> = await ds.query(`
    SELECT DISTINCT master_id::text id, COALESCE(language,'ko') lang
    FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      AND source_type = ANY(ARRAY['mfds_drug_otc','nutrition_combo','mfds_drug_otc_nutrition_combo'])
      AND master_id = ANY(${idList}) ORDER BY 1, 2`);
  await ds.destroy();

  const byId = new Map(rows.map((r) => [r.id, r]));

  // ── G5 적용부위 근거 재도출 (278 전건) ───────────────────────────────────────────
  type MasterRec = {
    masterId: string; name: string; shard: string; fp: string;
    gencode: string; suffix: string; route: string;
    officialSite: string; evidence: string; evidenceSection: string;
  };
  const masters: MasterRec[] = [];
  const routeMismatch: string[] = [];
  const missingSource: string[] = [];
  const excludeHit: string[] = [];

  for (const id of [...allMasters].sort()) {
    const row = byId.get(id);
    const fp = fpOfMaster.get(id) || '';
    const g = groupByFp.get(fp);
    if (!row || !row.content) { missingSource.push(id); continue; }
    if (EXCLUDE_RE.test(row.name) || EXCLUDE_RE.test(row.spec || '')) excludeHit.push(id);
    const dos = sections(row.content)['용법·용량'] || '';
    const found = detectSites(dos);
    const distinct = [...new Set(found.map((s) => s.site))];
    const site = distinct.length === 1 ? distinct[0] : '';
    // 감사 산출물의 적용부위 필드명은 `site` 다. 재도출 결과와 정확히 일치해야 한다.
    if (!g || site !== g.site) { routeMismatch.push(id); continue; }
    masters.push({
      masterId: id, name: row.name, shard: shardOf.get(id) || '', fp,
      gencode: g.gencode, suffix: g.suffix, route: g.site,
      officialSite: site,
      evidence: found.find((s) => s.site === site)?.evidence || '',
      evidenceSection: '용법·용량',
    });
  }
  masters.sort((a, b) => (a.masterId < b.masterId ? -1 : 1));

  // ── 게이트 ──────────────────────────────────────────────────────────────────────
  const inter = (a: string[], b: string[]): number => { const s = new Set(b); return a.filter((x) => s.has(x)).length; };
  const routeTotals: Record<string, number> = {};
  for (const m of masters) routeTotals[m.route] = (routeTotals[m.route] || 0) + 1;
  const shardRoute: Record<string, Record<string, number>> = {};
  for (const k of SH) shardRoute[k] = {};
  for (const m of masters) shardRoute[m.shard][m.route] = (shardRoute[m.shard][m.route] || 0) + 1;

  const gates = {
    G1_totalsMatchProposal: allFps.length === 47 && allMasters.length === 278
      && allFps.length === proposal.totals.fingerprints && allMasters.length === proposal.totals.masters,
    G1_fingerprints: allFps.length, G1_masters: allMasters.length,
    G2_shardFpIntersection: allFps.length - new Set(allFps).size,
    G2_shardMasterIntersection: allMasters.length - new Set(allMasters).size,
    G2_pairwise: {
      'ga∩na_fp': inter(shardFps.ga, shardFps.na), 'ga∩da_fp': inter(shardFps.ga, shardFps.da), 'na∩da_fp': inter(shardFps.na, shardFps.da),
      'ga∩na_master': inter(shardMasters.ga, shardMasters.na), 'ga∩da_master': inter(shardMasters.ga, shardMasters.da), 'na∩da_master': inter(shardMasters.na, shardMasters.da),
    },
    G3_v2ReadyFpIntersection: allFps.filter((f) => v2ReadyFps.has(f)).length,
    G3_v2ReadyMasterIntersection: allMasters.filter((m) => v2ReadyMasters.has(m)).length,
    G3_v2ReadyMasterTotal: v2ReadyMasters.size,
    G4_v2AppliedMasterIntersection: allMasters.filter((m) => v2AppliedMasters.has(m)).length,
    G4_v2AppliedMasterTotal: v2AppliedMasters.size,
    G4_v2AppliedFpIntersection: allFps.filter((f) => v2AppliedFps.has(f)).length,
    G5_evidenceReDerived: masters.length,
    G5_routeMismatch: routeMismatch.length,
    G5_sourceMissing: missingSource.length,
    G6_authoredCanonicalPresent: authored.length,
    G7_excludeKeywordHit: excludeHit.length,
    allMastersHaveEvidence: masters.every((m) => m.evidence.length > 0),
    dbWrite: 0,
  };
  const allPass = gates.G1_totalsMatchProposal && gates.G2_shardFpIntersection === 0
    && gates.G2_shardMasterIntersection === 0 && gates.G3_v2ReadyFpIntersection === 0
    && gates.G3_v2ReadyMasterIntersection === 0 && gates.G4_v2AppliedMasterIntersection === 0
    && gates.G5_routeMismatch === 0 && gates.G5_sourceMissing === 0
    && gates.G6_authoredCanonicalPresent === 0 && gates.G7_excludeKeywordHit === 0
    && gates.allMastersHaveEvidence;

  const ssot = {
    wo: 'WO-O4O-OTC-EXTERNAL-SITE-RECOVERABLE-SHARD-APPROVAL-V1',
    artifact: 'production-approval-ssot',
    status: allPass ? 'APPROVED_FOR_PRODUCTION' : 'BLOCKED_GATE_FAILURE',
    agent: 'la', readOnly: true, dbWrite: 0,
    approvedFrom: {
      auditCommit: '3b1181145',
      audit: 'otc-external-site-recovery-audit-v1.json',
      proposal: 'otc-external-site-recovery-shard-proposal-v1.json',
      note: 'proposal 원본은 수정하지 않는다. 본 파일이 생산 승인 SSOT 다.',
    },
    approvalBasis: [
      '공식 e약은요 용법·용량 원문에서 적용부위가 정확히 1종만 확인됨',
      '제품명으로 경로를 추정하지 않음 — 제품명은 EXCLUDE 판정에만 사용',
      '기존 V2 READY(716fp/2,517m) 와 fp/master 교집합 0',
      'V2 LIVE apply 완료분(2,509m) 과 master 교집합 0',
      'shard 상호 fp/master 교집합 0',
      '278 전건 적용부위 근거를 원문에서 재도출해 route 일치 확인',
    ],
    exclusions: {
      note: 'HOLD_ROUTE 194 = 적용부위 미명시 154 + 다부위 상충 40 (합산 관계)',
      SPLIT_REQUIRED: audit.totals.recoverableSplitRequired,
      HOLD_ROUTE_total: audit.totals.holdRoute,
      HOLD_ROUTE_siteNotStated: audit.holdReasons['site_not_stated_in_official_dosage'] ?? null,
      HOLD_ROUTE_siteConflict: Object.entries(audit.holdReasons)
        .filter(([k]) => k.startsWith('site_conflict')).reduce((a, [, v]) => a + (v as number), 0),
      EXCLUDE: audit.totals.excludeReviewed,
    },
    totals: { fingerprints: allFps.length, masters: allMasters.length },
    routeTotals: Object.fromEntries(Object.entries(routeTotals).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))),
    gates, allGatesPass: allPass,
    productionRules: [
      'fp 는 정확히 한 shard',
      '각 shard 는 KO+EN 을 함께 책임',
      'LIVE apply 는 단일 write-owner 순차',
      '적용부위(route)는 본 SSOT 값을 사용하고 제품명으로 재추정하지 않는다',
    ],
    shards: Object.fromEntries(SH.map((k) => [k, {
      fingerprints: shardFps[k].length,
      masters: shardMasters[k].length,
      routes: Object.fromEntries(Object.entries(shardRoute[k]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))),
      fingerprintList: shardFps[k],
      masterIds: shardMasters[k],
      groups: shardFps[k].map((fp) => {
        const g = groupByFp.get(fp);
        return { fp, gencode: g.gencode, suffix: g.suffix, route: g.site, size: g.size, masterIds: [...g.masterIds].sort() };
      }),
    }])),
    masters,
    integrityLists: { routeMismatch: routeMismatch.sort(), sourceMissing: missingSource.sort(), excludeKeywordHit: excludeHit.sort() },
  };

  fs.writeFileSync(OUT_SSOT, JSON.stringify(ssot, null, 2) + '\n', 'utf8');

  console.log('=== OTC EXTERNAL SITE RECOVERABLE — PRODUCTION APPROVAL SSOT (read-only · dbWrite=0) ===');
  console.log('status =', ssot.status);
  console.log('totals =', JSON.stringify(ssot.totals));
  console.log('routeTotals =', JSON.stringify(ssot.routeTotals, null, 2));
  console.log('shards =', JSON.stringify(Object.fromEntries(SH.map((k) => [k, { fp: ssot.shards[k].fingerprints, masters: ssot.shards[k].masters, routes: ssot.shards[k].routes }])), null, 2));
  console.log('gates =', JSON.stringify(gates, null, 2));
  console.log('masters with evidence =', masters.length);
  console.log('OUT:', OUT_SSOT);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
