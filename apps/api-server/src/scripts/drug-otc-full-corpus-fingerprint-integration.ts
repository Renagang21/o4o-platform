/**
 * WO-O4O-OTC-FULL-CORPUS-FINGERPRINT-INTEGRATION-V1
 *
 * shard 0(가)·1(나)·2(다) 결과를 병합해 원문 확보 OTC 19,131 master 전체의
 *   실제 재사용 가능 범위 / 신규 설명서 작성량 / 대량 apply 후보를 확정한다.
 *
 * ⚠️ read-only · DB write 0 · 순수 파일 병합(로컬 postgres 는 prod 모집단 미보유 → DB 재스캔 불가·불필요).
 *
 * 병합 단위 = fingerprint(원문 지문). 샤딩 키 = md5(item_seq)%3 → master 는 shard 간 배타이나
 *   fingerprint(정규화 효능·용법·주의 + 성분|함량|제형|경로 해시)는 item_seq 와 무관 → 동일 fingerprint 가
 *   여러 shard 에 산재. 통합의 본질 = 이 산재 fingerprint 를 shard 경계 없이 병합해 그룹/커버리지 재계산.
 *
 * 입력(shard 당): otc-fingerprint-shard-{0,1,2}-{summary,groups,bridge}-v1.json
 *   - 정본 per-group 스키마 = bridge 파일(3 shard 일관: fingerprint,tier,size,bridgeKey,ingredient,
 *     strength,form,route,groundedMasters,extendability,authoredSourceRefIds,authoredMasters).
 *     ※ groups 파일은 shard 0/1 이 bridgeKey/extendability 미포함(초기 스키마) → 병합엔 bridge 파일 사용.
 *   - ATC 안전지문 대조는 shard 별 방법론 상이(shard1=명명+무성분명 pool, shard2=무성분명·grounded-named,
 *     shard0=필드 부재) → 합산 불가. 대상 모집단만 정확 산출, 안전 매칭은 글로벌 재계산 대상으로 명시.
 *
 * 산출: otc-full-corpus-fingerprint-integrated-{summary,groups,bridge,exceptions}-v1.json
 */

import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const SHARDS = [0, 1, 2] as const;
const TIER_RANK: Record<string, number> = { Tier1: 1, Tier2: 2, Tier3: 3, Tier4: 4, Tier5: 5 };

type BridgeGroup = {
  fingerprint: string; tier: string; size: number; bridgeKey: string;
  ingredient: string; strength: string; form: string; route: string;
  groundedMasters: number; extendability: string;
  authoredSourceRefIds: string[]; authoredMasters: number; safetyVariants?: number;
};

const readJson = (f: string): any => JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));

function main(): void {
  // === 입력 로드 ===
  const summaries = SHARDS.map((n) => readJson(`otc-fingerprint-shard-${n}-summary-v1.json`));
  const bridges = SHARDS.map((n) => readJson(`otc-fingerprint-shard-${n}-bridge-v1.json`));
  const groupsFiles = SHARDS.map((n) => readJson(`otc-fingerprint-shard-${n}-groups-v1.json`));
  const bridgeGroups: BridgeGroup[][] = bridges.map((b) => b.groups as BridgeGroup[]);

  // === 통합 게이트 (불일치 시 중단) ===
  const gate: Record<string, unknown> = {};
  const perShardMasters = summaries.map((s) => s.shardMasters);
  const perShardExtractFail = summaries.map((s) => s.extractFail);
  const perShardBridgeSum = bridgeGroups.map((gs) => gs.reduce((a, g) => a + g.size, 0));
  const perShardGroupsSum = groupsFiles.map((gf) => (gf.groups as any[]).reduce((a, g) => a + g.size, 0));
  const totalMasters = perShardBridgeSum.reduce((a, b) => a + b, 0);

  gate.perShardMasters = perShardMasters;               // [6407,6452,6272]
  gate.threeShardSum = perShardMasters.reduce((a: number, b: number) => a + b, 0);
  gate.bridgeSizeSum = perShardBridgeSum;
  gate.groupsSizeSum = perShardGroupsSum;
  gate.totalMasters = totalMasters;
  gate.extractFail = perShardExtractFail;
  gate.gate_sum_19131 = gate.threeShardSum === 19131 && totalMasters === 19131;
  gate.gate_bridge_eq_summary = perShardBridgeSum.every((v, i) => v === perShardMasters[i]);
  gate.gate_groups_eq_summary = perShardGroupsSum.every((v, i) => v === perShardMasters[i]);
  gate.gate_extractFail_zero = perShardExtractFail.every((v: number) => v === 0);
  gate.dbWrite = 0;

  if (!gate.gate_sum_19131 || !gate.gate_bridge_eq_summary || !gate.gate_extractFail_zero) {
    console.error('GATE FAIL', JSON.stringify(gate, null, 2));
    process.exit(1);
  }

  // === fingerprint 병합 ===
  type Merged = {
    fingerprint: string; sizeByShard: number[]; size: number; shardsPresent: number[];
    tierByShard: string[]; tierMerged: string; tierInconsistent: boolean;
    bridgeKey: string; bridgeKeyInconsistent: boolean;
    ingredient: string; strength: string; form: string; route: string;
    extendability: string; extInconsistent: boolean;
    authoredRefs: Set<string>; authoredMastersByBk: number;
  };
  const merged = new Map<string, Merged>();
  for (let si = 0; si < SHARDS.length; si++) {
    for (const g of bridgeGroups[si]) {
      let m = merged.get(g.fingerprint);
      if (!m) {
        m = {
          fingerprint: g.fingerprint, sizeByShard: [0, 0, 0], size: 0, shardsPresent: [],
          tierByShard: [], tierMerged: g.tier, tierInconsistent: false,
          bridgeKey: g.bridgeKey, bridgeKeyInconsistent: false,
          ingredient: g.ingredient, strength: g.strength, form: g.form, route: g.route,
          extendability: g.extendability, extInconsistent: false,
          authoredRefs: new Set<string>(), authoredMastersByBk: 0,
        };
        merged.set(g.fingerprint, m);
      }
      m.sizeByShard[si] += g.size;
      m.size += g.size;
      if (!m.shardsPresent.includes(si)) m.shardsPresent.push(si);
      m.tierByShard.push(g.tier);
      if (TIER_RANK[g.tier] > TIER_RANK[m.tierMerged]) m.tierMerged = g.tier; // 보수적: 최악(가장 분열된) tier
      if (g.tier !== m.tierByShard[0]) m.tierInconsistent = true;
      if (g.bridgeKey !== m.bridgeKey) m.bridgeKeyInconsistent = true;
      if (g.extendability !== m.extendability) m.extInconsistent = true;
      for (const r of g.authoredSourceRefIds || []) m.authoredRefs.add(r);
      m.authoredMastersByBk = Math.max(m.authoredMastersByBk, g.authoredMasters || 0);
    }
  }
  const groups = [...merged.values()].sort((a, b) => b.size - a.size);

  // === fingerprint 규칙 동일성 검증 ===
  const collided = groups.filter((g) => g.shardsPresent.length > 1);
  const consistency = {
    perShardGroupRows: bridgeGroups.map((gs) => gs.length),
    integratedGroups: groups.length,
    mergedAway: bridgeGroups.reduce((a, gs) => a + gs.length, 0) - groups.length,
    collidedFingerprints: collided.length,
    collidedIn2Shards: groups.filter((g) => g.shardsPresent.length === 2).length,
    collidedIn3Shards: groups.filter((g) => g.shardsPresent.length === 3).length,
    bridgeKeyInconsistent: groups.filter((g) => g.bridgeKeyInconsistent).length,
    extendabilityInconsistent: groups.filter((g) => g.extInconsistent).length,
    tierInconsistentAcrossShards: groups.filter((g) => g.tierInconsistent).length,
    note: 'fingerprint 규칙 동일 근거: bridgeKey-inconsistent=0. tier-inconsistent 및 collided fp 의 Tier1/2/3 세부는 shard 경계 넘는 raw/norm-full 원문 비교가 필요 → 파일만으로 정밀 재계산 불가. 병합 tier 는 shard subgroup 중 최악(보수적)으로 표기하고, collided 수를 세부 불확실성 상한으로 명시.',
  };

  // === 커버리지 / singleton ===
  const sizes = groups.map((g) => g.size);
  const cumAt = (k: number): number => sizes.slice(0, k).reduce((a, b) => a + b, 0);
  const covGroups = (p: number): number => { let acc = 0, n = 0; for (const s of sizes) { acc += s; n += 1; if (acc / totalMasters >= p) break; } return n; };
  const topCoverage = [10, 50, 100, 500].map((k) => ({ topN: k, masters: cumAt(k), pct: +(cumAt(k) / totalMasters * 100).toFixed(2) }));
  const coverageGroupsNeeded = { '50%': covGroups(0.5), '70%': covGroups(0.7), '80%': covGroups(0.8), '90%': covGroups(0.9) };
  const singletonGroups = groups.filter((g) => g.size === 1).length;
  const sizeDist: Record<string, number> = { '1': 0, '2-5': 0, '6-20': 0, '21-50': 0, '51+': 0 };
  for (const g of groups) sizeDist[g.size === 1 ? '1' : g.size <= 5 ? '2-5' : g.size <= 20 ? '6-20' : g.size <= 50 ? '21-50' : '51+'] += 1;

  // === tier 분포(병합, 보수적 max) ===
  const tierDist: Record<string, { groups: number; masters: number }> = {};
  for (const g of groups) { (tierDist[g.tierMerged] ??= { groups: 0, masters: 0 }); tierDist[g.tierMerged].groups += 1; tierDist[g.tierMerged].masters += g.size; }

  // === 경구 / 비경구·복합 (master 단위 = per-shard 배타 합, 정확) ===
  let oralSingle = 0, nonOralOrMulti = 0;
  for (const gs of bridgeGroups) for (const g of gs) { if (g.tier === 'Tier5') nonOralOrMulti += g.size; else oralSingle += g.size; }

  // === 4구획 (master = per-shard 배타 합 / groups = 병합 fingerprint) ===
  const PARTS = ['검토후확장후보', '새설명서필요', '주성분코드필요(무성분명)', '비경구-별도트랙'];
  const partMasters: Record<string, number> = Object.fromEntries(PARTS.map((p) => [p, 0]));
  for (const gs of bridgeGroups) for (const g of gs) partMasters[g.extendability] += g.size;
  const partGroups: Record<string, number> = Object.fromEntries(PARTS.map((p) => [p, 0]));
  for (const g of groups) partGroups[g.extendability] = (partGroups[g.extendability] || 0) + 1;

  // === authored bridge (재사용 가능) ===
  const extendableAuthoredRefs = new Set<string>();
  for (const g of groups) if (g.extendability === '검토후확장후보') for (const r of g.authoredRefs) extendableAuthoredRefs.add(r);
  const authoredCorpus = {
    // authored canonical(전량) 은 shard 별 재로딩(비-샤딩) — 실행 시각 차로 소폭 drift.
    perShardKoCanonicalMasters: summaries.map((s) => s.authoredCorpus?.koCanonicalMasters ?? null),
    perShardBridgeKeys: summaries.map((s) => s.authoredCorpus?.bridgeKeys ?? null),
    note: 'authored OTC canonical 코퍼스는 각 shard 가 전량(shard 비제한) 재로딩 → item_seq 샤딩과 무관·중복. 통합 재사용 대표수는 검토후확장후보 fingerprint 의 authoredSourceRefIds 합집합으로 산정.',
  };

  // === ATC bridge — 방법론 drift 로 합산 불가. 대상만 정확, 안전매칭은 글로벌 재계산 대상. ===
  const noIngredientTotal = bridgeGroups.reduce((a, gs) => a + gs.filter((g) => !g.ingredient).reduce((x, g) => x + g.size, 0), 0);
  const atcBridge = {
    통합_무성분명경구단일_대상: partMasters['주성분코드필요(무성분명)'], // 7301 (정확)
    통합_무성분명_전체_경구비경구: noIngredientTotal,                    // 9622 (정확)
    perShard_안전매칭_방법론상이: summaries.map((s, i) => ({ shard: i, atc: s.atcBridge5 ?? s.atcBridge ?? null })),
    resolution: '安全 매칭(ATC후보있음/안전지문일치/불일치)은 shard 별 후보풀·대상 정의 상이(shard1=명명+무성분명 pool, shard2=무성분명·grounded-named, shard0=필드 부재) → 산술 합산 부당. 대상 모집단(무성분명 경구·단일 7,301)만 통합 확정. 안전지문 대조는 단일 규칙 글로벌 재계산(DB 백드 후속 WO)으로 확정. 고정 원칙 유지: ATC=후보 연결 키 / 안전지문=최종 분리 키.',
  };

  // === 대량 apply 후보 (커버리지 큰 fingerprint 우선) ===
  const applyCandidates = groups
    .filter((g) => g.extendability === '검토후확장후보' || g.extendability === '새설명서필요')
    .slice(0, 100)
    .map((g) => ({
      fingerprint: g.fingerprint, size: g.size, tier: g.tierMerged, bridgeKey: g.bridgeKey,
      route: g.route, extendability: g.extendability,
      authoredRefs: [...g.authoredRefs], authoredMastersByBk: g.authoredMastersByBk,
      shardsPresent: g.shardsPresent, crossShard: g.shardsPresent.length > 1,
    }));

  // === 산출 파일 ===
  const summary = {
    wo: 'WO-O4O-OTC-FULL-CORPUS-FINGERPRINT-INTEGRATION-V1', dbWrite: 0, readOnly: true,
    inputs: SHARDS.map((n) => `otc-fingerprint-shard-${n}-{summary,groups,bridge}-v1.json`),
    gate, consistency,
    totals: {
      groundedOtcMasters: totalMasters,        // 19,131
      fingerprintGroups: groups.length,        // 6,216
      singletonGroups,
      oralSingleMasters: oralSingle,           // 12,908
      nonOralOrMultiMasters: nonOralOrMulti,   // 6,223
      sizeDist,
    },
    tierDist,
    coverage: { topN: topCoverage, groupsNeededForCoverage: coverageGroupsNeeded },
    fourPartition: PARTS.map((p) => ({ partition: p, masters: partMasters[p], groups: partGroups[p] })),
    authoredReuse: {
      기존authored확장가능_제품수: partMasters['검토후확장후보'],           // 2,732
      확장가능_authored대표설명서수: extendableAuthoredRefs.size,            // distinct source_ref_id
      신규작성필요_그룹수: partGroups['새설명서필요'],
      신규작성필요_제품수: partMasters['새설명서필요'],
      비경구별도트랙_제품수: partMasters['비경구-별도트랙'],
    },
    authoredCorpus, atcBridge,
    top30: groups.slice(0, 30).map((g) => ({
      fp: g.fingerprint, size: g.size, tier: g.tierMerged, bridgeKey: g.bridgeKey,
      route: g.route, ext: g.extendability, crossShard: g.shardsPresent.length > 1, authoredMastersByBk: g.authoredMastersByBk,
    })),
  };

  fs.writeFileSync(path.join(DATA_DIR, 'otc-full-corpus-fingerprint-integrated-summary-v1.json'), JSON.stringify(summary, null, 2), 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'otc-full-corpus-fingerprint-integrated-groups-v1.json'), JSON.stringify({
    wo: summary.wo, totalMasters, fingerprintGroups: groups.length,
    groups: groups.map((g) => ({
      fingerprint: g.fingerprint, size: g.size, tier: g.tierMerged, tierInconsistent: g.tierInconsistent,
      bridgeKey: g.bridgeKey, ingredient: g.ingredient, strength: g.strength, form: g.form, route: g.route,
      extendability: g.extendability, sizeByShard: g.sizeByShard, shardsPresent: g.shardsPresent,
      crossShard: g.shardsPresent.length > 1, authoredRefs: [...g.authoredRefs], authoredMastersByBk: g.authoredMastersByBk,
    })),
  }, null, 1), 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'otc-full-corpus-fingerprint-integrated-bridge-v1.json'), JSON.stringify({
    wo: summary.wo,
    note: 'ATC=후보 연결 키 / 안전지문=최종 분리 키. authored bridge=성분|함량|제형|경로 일치(무성분명 제외). 안전 매칭은 글로벌 재계산 대상(atcBridge.resolution).',
    fourPartition: summary.fourPartition, authoredReuse: summary.authoredReuse,
    atcBridge, applyCandidatesTop100: applyCandidates,
  }, null, 1), 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'otc-full-corpus-fingerprint-integrated-exceptions-v1.json'), JSON.stringify({
    wo: summary.wo,
    extractFailPerShard: perShardExtractFail, extractFailTotal: perShardExtractFail.reduce((a: number, b: number) => a + b, 0),
    tierInconsistentFingerprints: groups.filter((g) => g.tierInconsistent).map((g) => ({ fp: g.fingerprint, tiers: g.tierByShard, bridgeKey: g.bridgeKey, size: g.size })),
    extendabilityInconsistentFingerprints: groups.filter((g) => g.extInconsistent).map((g) => ({ fp: g.fingerprint, bridgeKey: g.bridgeKey, size: g.size })),
    bridgeKeyInconsistentFingerprints: groups.filter((g) => g.bridgeKeyInconsistent).map((g) => ({ fp: g.fingerprint, size: g.size })),
    note: 'extract 실패 0. 예외 = shard 간 tier/extendability 미세 불일치(가·나·다 스크립트 진화 차) — collided fingerprint 세부 tier 재계산 필요 목록. bridgeKey-inconsistent=0(fingerprint 규칙 동일 확증).',
  }, null, 1), 'utf8');

  console.log(JSON.stringify({
    gate: gate.gate_sum_19131, totalMasters, fingerprintGroups: groups.length, singletonGroups,
    oralSingle, nonOralOrMulti, fourPartitionMasters: partMasters,
    확장가능authored대표설명서: extendableAuthoredRefs.size, collidedFingerprints: collided.length,
    coverage: coverageGroupsNeeded, topCoverage,
  }, null, 2));
}
main();
