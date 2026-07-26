/**
 * WO-O4O-OTC-EXTERNAL-SITE-PRODUCIBLE-SHARD-APPROVAL-V2 — 에이전트 라 (조사 전용)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · apply 0.
 *
 * 목적: commit `3719b8280` 의 전문용 분리 감사를 반영해 생산 가능한
 *       **42 fingerprint / 199 master** 를 최종 승인 SSOT 로 확정한다.
 *
 * 원본 보존(수정 금지):
 *   · `otc-external-site-recovery-approved-ssot-v1.json`      (V1 승인 SSOT, 172a792fd)
 *   · `otc-external-site-recovery-adjusted-proposal-v1.json`  (조정 proposal, 3719b8280)
 *   · `otc-external-site-professional-use-audit-v1.json`      (전문용 분리 감사, 3719b8280)
 *   본 스크립트는 신규 파일 `otc-external-site-final-approved-ssot-v1.json` 만 생성한다.
 *
 * 게이트:
 *   F1 총계 42fp/199m · shard 가 15/68 · 나 15/85 · 다 12/46
 *   F2 shard 내·상호 fp/master 교집합 0
 *   F3 V2 LIVE apply 완료분(2,509 master) 과 fp/master 교집합 0
 *   F4 HOLD_PROFESSIONAL_USE(5fp/79m) 가 승인 SSOT 에 **미포함**
 *   F5 199 전건의 route·officialSite·evidence 보존 — DB 원문에서 재도출해 V1 승인값과 일치 확인
 *   F6 예상 write 확정 — 가 408T · 나 510T · 다 276T · 계 1,194T (master 당 ko 4T + en 2T)
 *   F7 DB 실사 — 199 중 authored STORE canonical(ko/en) 보유 0
 *   F8 199 ⊂ V1 승인 278 · 제외분 정확히 79
 *   F9 cutaneous 83 전건이 PRODUCIBLE_STORE verdict
 *
 * 결정론: 타임스탬프 미포함 · 모든 배열 정렬 · 2회 실행 byte-identical.
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442. env 는 process.env 로만 전달(값 열람·출력 0).
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-external-site-final-approval.ts
 * 산출: src/scripts/data/otc-external-site-final-approved-ssot-v1.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const P_V1_SSOT = path.join(OUT_DIR, 'otc-external-site-recovery-approved-ssot-v1.json');
const P_ADJUSTED = path.join(OUT_DIR, 'otc-external-site-recovery-adjusted-proposal-v1.json');
const P_PROF = path.join(OUT_DIR, 'otc-external-site-professional-use-audit-v1.json');
const P_V2_CENSUS = path.join(OUT_DIR, 'otc-remaining-full-corpus-census-v2.json');
const OUT_SSOT = path.join(OUT_DIR, 'otc-external-site-final-approved-ssot-v1.json');

// ── 원문 파싱 · 적용부위 탐지 (선행 감사와 동일 규칙) ──────────────────────────────
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
const SITE_PATTERNS: Array<{ site: Site; re: RegExp }> = [
  { site: 'rectal', re: /항문|직장\s?내|직장에|관장/ },
  { site: 'vaginal', re: /질\s?내|질강|질에|질세정|질\s?점막/ },
  { site: 'oromucosal', re: /구강|입\s?안|양치|가글|함수|인후|인두|목구멍|헹구|씹어|잇몸/ },
  { site: 'ophthalmic', re: /결막낭|눈에|안구|점안/ },
  { site: 'nasal', re: /비강|콧\s?속|코\s?안|코에/ },
  { site: 'otic', re: /귀\s?안|귓\s?속|외이도/ },
  { site: 'cutaneous', re: /피부|환부|患部|상처\s?부위|도포|바른다|바르고|바를|문지르|씻어\s?낸다|씻어\s?내고|소독한다|소독하여|닦아\s?낸다|국소\s?부위/ },
];
function detectSites(dosageText: string): Array<{ site: Site; evidence: string }> {
  const t = normalize(dosageText);
  const found: Array<{ site: Site; evidence: string }> = [];
  for (const p of SITE_PATTERNS) {
    const m = t.match(p.re);
    if (!m) continue;
    const i = Math.max(0, (m.index ?? 0) - 25);
    found.push({ site: p.site, evidence: t.slice(i, (m.index ?? 0) + m[0].length + 35).trim() });
  }
  return found;
}

const WRITE_PER_MASTER = { ko: 4, en: 2, total: 6 };
const SH = ['ga', 'na', 'da'] as const;

async function main(): Promise<void> {
  const v1 = JSON.parse(fs.readFileSync(P_V1_SSOT, 'utf8'));
  const adj = JSON.parse(fs.readFileSync(P_ADJUSTED, 'utf8'));
  const prof = JSON.parse(fs.readFileSync(P_PROF, 'utf8'));
  const v2Census = JSON.parse(fs.readFileSync(P_V2_CENSUS, 'utf8'));

  // 최종 shard (조정 proposal)
  const shardFps: Record<string, string[]> = {};
  const shardMasters: Record<string, string[]> = {};
  const shardHoldFps: Record<string, string[]> = {};
  for (const k of SH) {
    shardFps[k] = [...(adj.shards[k].fingerprintList as string[])].sort();
    shardMasters[k] = [...(adj.shards[k].masterIds as string[])].sort();
    shardHoldFps[k] = [...(adj.shards[k].holdFingerprints as string[])].sort();
  }
  const allFps = SH.flatMap((k) => shardFps[k]);
  const allMasters = SH.flatMap((k) => shardMasters[k]);
  const shardOf = new Map<string, string>();
  for (const k of SH) for (const id of shardMasters[k]) shardOf.set(id, k);

  // V1 승인 SSOT — route/officialSite/evidence 원천
  const v1ById = new Map<string, any>((v1.masters as any[]).map((m) => [m.masterId, m]));
  const v1Masters = new Set<string>((v1.masters as any[]).map((m) => m.masterId));

  // 전문용 분리 감사 — verdict
  const profById = new Map<string, any>((prof.masters as any[]).map((m) => [m.masterId, m]));
  const holdMasters = new Set<string>((prof.masters as any[]).filter((m) => m.verdict === 'HOLD_PROFESSIONAL_USE').map((m) => m.masterId));
  const holdFps = new Set<string>((prof.masters as any[]).filter((m) => m.verdict === 'HOLD_PROFESSIONAL_USE').map((m) => m.fp));

  // V2 LIVE apply 완료분(2,509)
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
  const rows: Array<{ id: string; name: string; content: string | null }> = await ds.query(`
    SELECT pm.id::text id, pm.name, es.content
    FROM product_masters pm
    LEFT JOIN LATERAL (
      SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1
    ) es ON true
    WHERE pm.id = ANY(${idList}) ORDER BY pm.id`);
  const authored: Array<{ id: string }> = await ds.query(`
    SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      AND source_type = ANY(ARRAY['mfds_drug_otc','nutrition_combo','mfds_drug_otc_nutrition_combo'])
      AND master_id = ANY(${idList}) ORDER BY 1`);
  await ds.destroy();
  const dbById = new Map(rows.map((r) => [r.id, r]));

  // ── F5 근거 재도출 · 보존 ────────────────────────────────────────────────────────
  type Rec = {
    masterId: string; name: string; shard: string; fp: string;
    gencode: string; suffix: string; route: string; officialSite: string;
    evidence: string; evidenceSection: string;
    professionalUseVerdict: string | null; storeSignals: string[] | null;
  };
  const masters: Rec[] = [];
  const mismatch: string[] = [], sourceMissing: string[] = [], notInV1: string[] = [];

  for (const id of [...allMasters].sort()) {
    const base = v1ById.get(id);
    if (!base) { notInV1.push(id); continue; }
    const row = dbById.get(id);
    if (!row || !row.content) { sourceMissing.push(id); continue; }
    const dos = sections(row.content)['용법·용량'] || '';
    const found = detectSites(dos);
    const distinct = [...new Set(found.map((s) => s.site))];
    const site = distinct.length === 1 ? distinct[0] : '';
    if (site !== base.route || site !== base.officialSite) { mismatch.push(id); continue; }
    const p = profById.get(id);
    masters.push({
      masterId: id, name: base.name, shard: shardOf.get(id) || '', fp: base.fp,
      gencode: base.gencode, suffix: base.suffix, route: base.route, officialSite: base.officialSite,
      evidence: found.find((s) => s.site === site)?.evidence || base.evidence,
      evidenceSection: '용법·용량',
      professionalUseVerdict: p ? p.verdict : null,
      storeSignals: p && Array.isArray(p.storeSignals) ? [...p.storeSignals].sort() : null,
    });
  }
  masters.sort((a, b) => (a.masterId < b.masterId ? -1 : 1));

  // ── 집계 ────────────────────────────────────────────────────────────────────────
  const sorted = (o: Record<string, number>): Record<string, number> =>
    Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
  const routeTotals: Record<string, number> = {};
  for (const m of masters) routeTotals[m.route] = (routeTotals[m.route] || 0) + 1;
  const shardRoute: Record<string, Record<string, number>> = { ga: {}, na: {}, da: {} };
  for (const m of masters) shardRoute[m.shard][m.route] = (shardRoute[m.shard][m.route] || 0) + 1;

  const writePlan = Object.fromEntries(SH.map((k) => [k, {
    masters: shardMasters[k].length,
    ko: shardMasters[k].length * WRITE_PER_MASTER.ko,
    en: shardMasters[k].length * WRITE_PER_MASTER.en,
    total: shardMasters[k].length * WRITE_PER_MASTER.total,
  }]));
  const writeTotal = SH.reduce((a, k) => a + shardMasters[k].length * WRITE_PER_MASTER.total, 0);

  const inter = (a: string[], b: string[]): number => { const s = new Set(b); return a.filter((x) => s.has(x)).length; };
  const cutaneous = masters.filter((m) => m.route === 'cutaneous');

  const gates = {
    F1_fingerprints: allFps.length, F1_masters: allMasters.length,
    F1_totalsMatchWO: allFps.length === 42 && allMasters.length === 199,
    F1_shardMatchWO: shardFps.ga.length === 15 && shardMasters.ga.length === 68
      && shardFps.na.length === 15 && shardMasters.na.length === 85
      && shardFps.da.length === 12 && shardMasters.da.length === 46,
    F2_shardFpIntersection: allFps.length - new Set(allFps).size,
    F2_shardMasterIntersection: allMasters.length - new Set(allMasters).size,
    F2_pairwise: {
      'ga∩na_fp': inter(shardFps.ga, shardFps.na), 'ga∩da_fp': inter(shardFps.ga, shardFps.da), 'na∩da_fp': inter(shardFps.na, shardFps.da),
      'ga∩na_master': inter(shardMasters.ga, shardMasters.na), 'ga∩da_master': inter(shardMasters.ga, shardMasters.da), 'na∩da_master': inter(shardMasters.na, shardMasters.da),
    },
    F3_v2AppliedMasterIntersection: allMasters.filter((m) => v2AppliedMasters.has(m)).length,
    F3_v2AppliedFpIntersection: allFps.filter((f) => v2AppliedFps.has(f)).length,
    F3_v2AppliedTotal: v2AppliedMasters.size,
    F4_holdMasterInApproved: allMasters.filter((m) => holdMasters.has(m)).length,
    F4_holdFpInApproved: allFps.filter((f) => holdFps.has(f)).length,
    F4_holdMasterTotal: holdMasters.size, F4_holdFpTotal: holdFps.size,
    F5_evidenceReDerived: masters.length,
    F5_routeMismatch: mismatch.length, F5_sourceMissing: sourceMissing.length, F5_notInV1Ssot: notInV1.length,
    F5_allHaveEvidence: masters.every((m) => m.evidence.length > 0),
    F6_writeTotal: writeTotal,
    F6_writeMatchWO: writePlan.ga.total === 408 && writePlan.na.total === 510 && writePlan.da.total === 276 && writeTotal === 1194,
    F7_authoredCanonicalPresent: authored.length,
    F8_subsetOfV1Approved: allMasters.every((m) => v1Masters.has(m)),
    F8_removedFromV1: v1.masters.length - allMasters.length,
    F9_cutaneousAllProducible: cutaneous.every((m) => m.professionalUseVerdict === 'PRODUCIBLE_STORE'),
    F9_cutaneousCount: cutaneous.length,
    dbWrite: 0,
  };
  const allPass = gates.F1_totalsMatchWO && gates.F1_shardMatchWO
    && gates.F2_shardFpIntersection === 0 && gates.F2_shardMasterIntersection === 0
    && gates.F3_v2AppliedMasterIntersection === 0 && gates.F3_v2AppliedFpIntersection === 0
    && gates.F4_holdMasterInApproved === 0 && gates.F4_holdFpInApproved === 0
    && gates.F5_routeMismatch === 0 && gates.F5_sourceMissing === 0 && gates.F5_notInV1Ssot === 0
    && gates.F5_allHaveEvidence && gates.F6_writeMatchWO
    && gates.F7_authoredCanonicalPresent === 0 && gates.F8_subsetOfV1Approved
    && gates.F8_removedFromV1 === 79 && gates.F9_cutaneousAllProducible;

  const ssot = {
    wo: 'WO-O4O-OTC-EXTERNAL-SITE-PRODUCIBLE-SHARD-APPROVAL-V2',
    artifact: 'final-production-approval-ssot',
    status: allPass ? 'APPROVED_FOR_PRODUCTION' : 'BLOCKED_GATE_FAILURE',
    agent: 'la', readOnly: true, dbWrite: 0,
    supersedes: {
      file: 'otc-external-site-recovery-approved-ssot-v1.json',
      commit: '172a792fd',
      status: 'SUPERSEDED_BY_FINAL',
      note: 'V1 승인 SSOT(47fp/278m) 는 전문용 분리 반영 전 상태다. 파일은 수정하지 않았다.',
    },
    basedOn: {
      professionalUseAudit: 'otc-external-site-professional-use-audit-v1.json',
      adjustedProposal: 'otc-external-site-recovery-adjusted-proposal-v1.json',
      commit: '3719b8280',
      note: '조정 proposal 원본도 수정하지 않았다. 본 파일이 최종 생산 승인 SSOT 다.',
    },
    approvalBasis: [
      '공식 e약은요 용법·용량 원문에서 적용부위가 정확히 1종만 확인됨',
      '제품명으로 경로를 추정하지 않음',
      'cutaneous 는 전문용 분리 감사에서 PRODUCIBLE_STORE 로 판정된 건만 포함',
      'HOLD_PROFESSIONAL_USE 5fp/79m 전량 제외 — fp 단위 전체 승격으로 혼재 없음',
      'V2 LIVE apply 완료분(2,509m) 과 fp/master 교집합 0',
      'shard 상호 fp/master 교집합 0',
    ],
    exclusions: {
      HOLD_PROFESSIONAL_USE: { fingerprints: holdFps.size, masters: holdMasters.size },
      SPLIT_REQUIRED: 0,
      note: 'V1 승인 278 → 최종 199. 제외 79 는 전량 HOLD_PROFESSIONAL_USE 다.',
      reasonBreakdown: prof.reasonBreakdown,
    },
    totals: { fingerprints: allFps.length, masters: allMasters.length },
    routeTotals: sorted(routeTotals),
    writePlan: { perMaster: WRITE_PER_MASTER, byShard: writePlan, total: writeTotal },
    gates, allGatesPass: allPass,
    productionRules: [
      'fp 는 정확히 한 shard',
      '각 shard 는 KO+EN 을 함께 책임',
      'LIVE apply 는 단일 write-owner 순차',
      '적용부위(route)는 본 SSOT 값을 사용하고 제품명으로 재추정하지 않는다',
      'cutaneous 는 매장용(PRODUCIBLE_STORE) 만 대상 — 수술부위·술자 손소독·도포기구 용도는 생산 금지',
    ],
    shards: Object.fromEntries(SH.map((k) => [k, {
      fingerprints: shardFps[k].length,
      masters: shardMasters[k].length,
      routes: sorted(shardRoute[k]),
      writePlan: writePlan[k],
      removedByProfessionalUse: adj.shards[k].removed,
      holdFingerprints: shardHoldFps[k],
      fingerprintList: shardFps[k],
      masterIds: shardMasters[k],
    }])),
    masters,
    integrityLists: { routeMismatch: mismatch.sort(), sourceMissing: sourceMissing.sort(), notInV1Ssot: notInV1.sort() },
  };

  fs.writeFileSync(OUT_SSOT, JSON.stringify(ssot, null, 2) + '\n', 'utf8');

  console.log('=== OTC EXTERNAL SITE — FINAL PRODUCTION APPROVAL SSOT (read-only · dbWrite=0) ===');
  console.log('status =', ssot.status);
  console.log('totals =', JSON.stringify(ssot.totals));
  console.log('routeTotals =', JSON.stringify(ssot.routeTotals, null, 2));
  console.log('shards =', JSON.stringify(Object.fromEntries(SH.map((k) => [k, { fp: ssot.shards[k].fingerprints, masters: ssot.shards[k].masters, routes: ssot.shards[k].routes, write: ssot.shards[k].writePlan.total }])), null, 2));
  console.log('writePlan total =', writeTotal, 'T');
  console.log('gates =', JSON.stringify(gates, null, 2));
  console.log('OUT:', OUT_SSOT);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
