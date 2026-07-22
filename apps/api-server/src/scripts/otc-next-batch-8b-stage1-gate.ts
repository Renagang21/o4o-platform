/**
 * WO NEXT-BATCH-8B STAGE-1 PRE-EXECUTION GATE — Agent 나. READ-ONLY, DB write 0.
 *
 * 정본(SSOT) = otc-next-batch-8b-audit-v1.json (commit b82d7e7ed). 8B 생산 시작 전 게이트만 수행한다.
 *   1) 가용(앞4)·다용(뒤4) 묶음 명시 + 각 그룹 target master IDs 확정(감사 JSON에서)
 *   2) 가∪ ∩ 다∪ target master ID 교집합 == 0 확인 (+ 8그룹 전체 중복 0)
 *   3) 각 그룹 target/exclude fingerprint 고정(감사값 대조)
 *   4) 생산 전 canonical 기준선 스냅샷 — 8그룹 전 target master 의 현재 STORE ko/en 상태
 *      (easy-canonical exactly-1, authored ko canonical 0, en 0) LIVE 조회하여 JSON 기록
 *   5) T 산식 재확인 (T 59 · KO=4T=236 · EN=2T=118 · 총 6T=354)
 * 교집합>0 또는 감사 수량 불일치면 STOP.
 *
 * DB write 0 · runner 수정 0 · apply 0. Usage(apps/api-server): npx tsx src/scripts/otc-next-batch-8b-stage1-gate.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ENV_PATH = 'C:\\Users\\sohae\\o4o-platform\\apps\\api-server\\.env';
const readPw = (): string => readFileSync(ENV_PATH, 'utf8').match(/^DB_PASSWORD=(.*)$/m)![1].trim();
const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const SSOT = path.resolve(OUT_DIR, 'otc-next-batch-8b-audit-v1.json');
const SSOT_COMMIT = 'b82d7e7ed';

// 묶음 배정 (WO 지정) — groupKey 순서 = 실행 순서
const BUNDLE_GA = [
  '아르기닌티디아시케이트|200밀리그램|연질캡슐', '수산화마그네슘|500밀리그램|정',
  '이부프로펜|200밀리그램|연질캡슐', '덱시부프로펜|300밀리그램|정',
];
const BUNDLE_DA = [
  '사카로마이세스보울라르디균|282.5밀리그램|캡슐', '니푸록사지드|200밀리그램|캡슐',
  '디오스민|600밀리그램|정', '아세트아미노펜|650밀리그램|정',
];
const EXPECT = { T: 59, ko: 236, en: 118, total: 354 };

function intersect(a: string[], b: string[]): string[] { const s = new Set(a); return b.filter((x) => s.has(x)); }

async function main(): Promise<void> {
  const audit = JSON.parse(readFileSync(SSOT, 'utf8'));
  const byGk = new Map<string, any>();
  for (const c of audit.candidates_examined) byGk.set(c.groupKey, c);

  const stop: string[] = [];
  const warn: string[] = [];

  // 배정된 8 그룹이 모두 감사 JSON 에 존재하는지
  const allGroups = [...BUNDLE_GA, ...BUNDLE_DA];
  for (const gk of allGroups) if (!byGk.has(gk)) stop.push(`감사 JSON 에 그룹 없음: ${gk}`);
  // 감사 READY 8 == 배정 8 (누락/초과 없음)
  const auditReady = audit.ready_selected.map((r: any) => r.groupKey).sort();
  const assignedSorted = [...allGroups].sort();
  if (JSON.stringify(auditReady) !== JSON.stringify(assignedSorted)) warn.push(`배정 8 그룹 != 감사 READY 8 (audit=${JSON.stringify(auditReady)})`);

  const perGroup = allGroups.map((gk) => {
    const c = byGk.get(gk);
    return {
      groupKey: gk, bundle: BUNDLE_GA.includes(gk) ? '가' : '다',
      targetFp: c?.bridgeFp ?? null, bridge_n: c?.bridge_n ?? null, T: c?.target_master ?? null,
      excludeFps: c ? c.fpDistribution.filter((f: any) => !f.target).map((f: any) => f.fp).sort() : [],
      exclude_nonTarget: c?.exclude_nonTarget ?? null,
      target_master_ids: c ? [...c.target_master_ids].sort() : [],
      rollback_master_ids: c ? [...c.rollback_master_ids].sort() : [],
      rollback_equals_target: c ? JSON.stringify([...c.target_master_ids].sort()) === JSON.stringify([...c.rollback_master_ids].sort()) : false,
      audit_source_ref_id: c?.authored_source_ref_id ?? null,
    };
  });

  // fp/T 고정 대조 + rollback==target
  for (const g of perGroup) {
    if (!g.targetFp) stop.push(`${g.groupKey}: targetFp 없음`);
    if (g.T !== g.bridge_n) stop.push(`${g.groupKey}: fp 재현 불일치 T ${g.T} != bridge ${g.bridge_n}`);
    if (g.T !== g.target_master_ids.length) stop.push(`${g.groupKey}: T ${g.T} != target_master_ids ${g.target_master_ids.length}`);
    if (!g.rollback_equals_target) stop.push(`${g.groupKey}: rollback != target`);
    if (g.excludeFps.includes(g.targetFp)) stop.push(`${g.groupKey}: target fp 가 exclude 집합에 포함`);
  }

  // 교집합: 가∪ vs 다∪, + 전체 8그룹 pairwise 중복
  const gaIds = perGroup.filter((g) => g.bundle === '가').flatMap((g) => g.target_master_ids);
  const daIds = perGroup.filter((g) => g.bundle === '다').flatMap((g) => g.target_master_ids);
  const crossInter = intersect(gaIds, daIds);
  if (crossInter.length > 0) stop.push(`가∩다 교집합 ${crossInter.length} > 0`);
  // 전체 중복(같은 master 가 두 그룹에 등장?)
  const seen = new Map<string, string>(); const dupAll: Array<{ id: string; a: string; b: string }> = [];
  for (const g of perGroup) for (const id of g.target_master_ids) {
    if (seen.has(id)) dupAll.push({ id, a: seen.get(id)!, b: g.groupKey }); else seen.set(id, g.groupKey);
  }
  if (dupAll.length > 0) stop.push(`8그룹 전체 master 중복 ${dupAll.length}`);

  // T 산식 재확인
  const sumT = perGroup.reduce((a, g) => a + (g.T || 0), 0);
  const koCalc = 4 * sumT, enCalc = 2 * sumT, totalCalc = 6 * sumT;
  if (sumT !== EXPECT.T) stop.push(`T 합 ${sumT} != ${EXPECT.T}`);
  if (koCalc !== EXPECT.ko) stop.push(`KO ${koCalc} != ${EXPECT.ko}`);
  if (enCalc !== EXPECT.en) stop.push(`EN ${enCalc} != ${EXPECT.en}`);
  if (totalCalc !== EXPECT.total) stop.push(`총 ${totalCalc} != ${EXPECT.total}`);
  // 감사 JSON 자체 grand_totals 도 대조
  const gt = audit.grand_totals || {};
  if (gt.target_T !== EXPECT.T || gt.ko !== EXPECT.ko || gt.en !== EXPECT.en || gt.total !== EXPECT.total) warn.push(`감사 grand_totals 불일치 ${JSON.stringify(gt)}`);

  // ── 4) LIVE 기준선 스냅샷 (생산 전) ──
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 5433, username: 'o4o_api', password: readPw(), database: 'o4o_platform', entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 300000 } });
  await ds.initialize();
  const baseline: any[] = [];
  try {
    for (const g of perGroup) {
      if (!g.target_master_ids.length) { baseline.push({ groupKey: g.groupKey, error: 'no ids' }); continue; }
      const ids = g.target_master_ids;
      // per-master 상태 count (STORE)
      const rows: Array<{ mid: string; easy_canon: string; authored_canon: string; ko_canon_total: string; en_total: string; en_canon: string; en_nr: string }> = await ds.query(`
        SELECT mid::text mid,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.source_type='mfds_easy_drug' AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) easy_canon,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.source_type=ANY(ARRAY['mfds_drug_otc','nutrition_combo']) AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) authored_canon,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) ko_canon_total,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) en_total,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.status='canonical' AND s.deleted_at IS NULL) en_canon,
          (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND s.language='en' AND s.status='needs_review' AND s.deleted_at IS NULL) en_nr
        FROM unnest($1::uuid[]) mid ORDER BY mid`, [ids]);
      let easy1 = 0, authored0 = 0, en0 = 0; const deviations: string[] = [];
      for (const r of rows) {
        const ec = parseInt(r.easy_canon, 10), ac = parseInt(r.authored_canon, 10), et = parseInt(r.en_total, 10);
        if (ec === 1) easy1++; else deviations.push(`${r.mid.slice(0, 8)} easy_canon=${ec}`);
        if (ac === 0) authored0++; else deviations.push(`${r.mid.slice(0, 8)} authored_canon=${ac}`);
        if (et === 0) en0++; else deviations.push(`${r.mid.slice(0, 8)} en_total=${et}`);
      }
      const clean = easy1 === ids.length && authored0 === ids.length && en0 === ids.length;
      if (!clean) stop.push(`${g.groupKey}: 기준선 오염 (easy1 ${easy1}/${ids.length}, authored0 ${authored0}/${ids.length}, en0 ${en0}/${ids.length})`);
      baseline.push({
        groupKey: g.groupKey, bundle: g.bundle, T: ids.length,
        easy_canonical_exactly1: easy1, authored_ko_canonical_zero: authored0, en_zero: en0,
        pre_production_clean: clean, deviations: deviations.slice(0, 20),
      });
    }
  } finally { if (ds.isInitialized) await ds.destroy(); }

  const verdict = stop.length ? 'STOP' : 'PASS';
  const out = {
    wo: 'WO-O4O-OTC-GROUNDED-UPGRADE-NEXT-BATCH-8B-STAGE1-GATE-NA-V1', agent: '나', stage: 1,
    readOnly: true, dbWrite: 0, ssot_commit: SSOT_COMMIT, ssot_file: 'otc-next-batch-8b-audit-v1.json',
    verdict,
    formula_recheck: { T: sumT, ko: koCalc, en: enCalc, total: totalCalc, expected: EXPECT, match: sumT === EXPECT.T && koCalc === EXPECT.ko && enCalc === EXPECT.en && totalCalc === EXPECT.total },
    bundle_ga: perGroup.filter((g) => g.bundle === '가').map((g) => ({ groupKey: g.groupKey, T: g.T, targetFp: g.targetFp, exclude_nonTarget: g.exclude_nonTarget, excludeFpCount: g.excludeFps.length, target_master_ids: g.target_master_ids })),
    bundle_da: perGroup.filter((g) => g.bundle === '다').map((g) => ({ groupKey: g.groupKey, T: g.T, targetFp: g.targetFp, exclude_nonTarget: g.exclude_nonTarget, excludeFpCount: g.excludeFps.length, target_master_ids: g.target_master_ids })),
    disjointness: { ga_id_count: gaIds.length, da_id_count: daIds.length, cross_intersection_count: crossInter.length, cross_intersection_ids: crossInter, all8_duplicate_count: dupAll.length, all8_duplicates: dupAll, distinct_total: seen.size },
    fingerprints: perGroup.map((g) => ({ groupKey: g.groupKey, targetFp: g.targetFp, excludeFps: g.excludeFps })),
    baseline_snapshot: baseline,
    stop_reasons: stop, warnings: warn,
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, 'otc-next-batch-8b-stage1-gate-v1.json'), JSON.stringify(out, null, 2), 'utf8');

  console.log('JSON_SUMMARY_BEGIN');
  console.log(JSON.stringify({
    verdict, ssot_commit: SSOT_COMMIT,
    formula: out.formula_recheck,
    disjointness: { ga_ids: gaIds.length, da_ids: daIds.length, cross_intersection: crossInter.length, all8_dups: dupAll.length, distinct_total: seen.size },
    bundle_ga: out.bundle_ga.map((g: any) => `${g.groupKey} T=${g.T} fp=${g.targetFp} ids=${g.target_master_ids.length}`),
    bundle_da: out.bundle_da.map((g: any) => `${g.groupKey} T=${g.T} fp=${g.targetFp} ids=${g.target_master_ids.length}`),
    baseline: baseline.map((b: any) => `${b.bundle}|${b.groupKey}: easy1 ${b.easy_canonical_exactly1}/${b.T}, authored0 ${b.authored_ko_canonical_zero}/${b.T}, en0 ${b.en_zero}/${b.T} → ${b.pre_production_clean ? 'CLEAN' : 'DIRTY:' + b.deviations.join(',')}`),
    stop_reasons: stop, warnings: warn,
  }, null, 2));
  console.log('JSON_SUMMARY_END');
  if (verdict === 'STOP') process.exitCode = 2;
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
