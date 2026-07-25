/**
 * WO-O4O-OTC-EXTERNAL-SITE-OF-APPLICATION-RECOVERY-AUDIT-V1 — 에이전트 라 (조사 전용)
 *
 * ⚠️ READ-ONLY · DB write 0 · 설명서 생성 0 · apply 0 · V2 READY shard 미수정.
 *
 * 목적: V2 census(`otc-remaining-full-corpus-census-v2.json`) 에서 적용부위 미확정으로
 *       READY 에서 제외한 CLQ/CDS/CSI 계열 651 master 를 **공식 용법 원문**으로
 *       피부/구강/질/직장/점안/비강 등 적용부위별 재분류한다.
 *
 * ── 판정 원칙 (WO 명시) ───────────────────────────────────────────────────────────
 *  · 공식 용법 원문(e약은요 canonical `용법·용량`)에 적용부위가 **명시된** 대상만 RECOVERABLE.
 *  · 제품명만으로 경로를 추정하지 않는다. 제품명은 EXCLUDE 판정에만 쓰인다.
 *  · 외용 대분류 코드([7]=C)만으로는 생산 대상으로 올리지 않는다.
 *  · 서로 다른 적용부위가 2개 이상 명시되면 상충 → HOLD_ROUTE 유지.
 *  · 적용부위 표현이 0개면 불명확 → HOLD_ROUTE 유지.
 *  · 수출·비매품·비소매 대용량은 EXCLUDE 로 분리한다.
 *
 * ── 모집단 재현 ──────────────────────────────────────────────────────────────────
 *  V2 의 분류 우선순위를 그대로 재현하여 `external_site_ambiguous` 버킷을 복원한다.
 *  재현 결과가 V2 census 의 `siteAmbiguousDeferredMasters` 와 다르면 게이트 FAIL 로 보고한다.
 *
 * 결정론: 타임스탬프 미포함 · 모든 배열 정렬 · 2회 실행 byte-identical.
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442. env: DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_NAME.
 *   (에이전트는 자격증명 값을 열람·출력·수정하지 않는다. process.env 로만 전달.)
 * Usage(apps/api-server): ../../node_modules/.bin/tsx src/scripts/otc-external-site-recovery-audit.ts
 * 산출: src/scripts/data/otc-external-site-recovery-audit-v1.json
 *       src/scripts/data/otc-external-site-recovery-shard-proposal-v1.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const V2_CENSUS = path.join(OUT_DIR, 'otc-remaining-full-corpus-census-v2.json');
const V2_SHARD = path.join(OUT_DIR, 'otc-remaining-shard-assignment-ssot-v2.json');
const OUT_AUDIT = path.join(OUT_DIR, 'otc-external-site-recovery-audit-v1.json');
const OUT_SHARD = path.join(OUT_DIR, 'otc-external-site-recovery-shard-proposal-v1.json');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

const AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo', 'mfds_drug_otc_nutrition_combo'];
const EXCLUDE_RE =
  /수출\s*명|수출\s*용|수출\s*전용|전량\s*수출|for\s*export|export\s*only|군납|군납명|보건소\s*용|보건소\s*납품|비매품|임상\s*시험\s*용|샘플\s*용|견본\s*품|별첨/i;
/** V2 에서 적용부위 미확정으로 보류한 접미 */
const SITE_AMBIGUOUS = new Set(['CLQ', 'CDS', 'CSI']);

// ── 원문 파싱 (V2 VERBATIM) ───────────────────────────────────────────────────────
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

const BULK_RE = /(\d[\d,.]*)\s*(밀리리터|㎖|ml|리터|ℓ|l|그램|그람|g|킬로그램|㎏|kg|갤런|gallon)\b/gi;
function isNonRetailBulk(...texts: Array<string | null | undefined>): boolean {
  for (const raw of texts) {
    const t = (raw || '').normalize('NFKC');
    if (!t) continue;
    if (/갤런|gallon/i.test(t)) return true;
    BULK_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BULK_RE.exec(t))) {
      const v = Number(m[1].replace(/,/g, ''));
      if (!Number.isFinite(v)) continue;
      const u = m[2].toLowerCase();
      if (/^(밀리리터|㎖|ml)$/.test(u) && v >= 1000) return true;
      if (/^(리터|ℓ|l)$/.test(u) && v >= 1) return true;
      if (/^(그램|그람|g)$/.test(u) && v >= 1000) return true;
      if (/^(킬로그램|㎏|kg)$/.test(u) && v >= 1) return true;
    }
  }
  return false;
}

// ── 적용부위 탐지 — 공식 용법 원문에 명시된 표현만 채택 ────────────────────────────
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

async function loadSet(ds: any, q: string): Promise<Set<string>> {
  const r: Array<{ id: string }> = await ds.query(q);
  return new Set(r.map((x) => x.id));
}

async function main(): Promise<void> {
  const v2Census = JSON.parse(fs.readFileSync(V2_CENSUS, 'utf8'));
  const v2Shard = JSON.parse(fs.readFileSync(V2_SHARD, 'utf8'));
  const v2ExpectedDeferred: number = v2Census.fieldCoverage?.siteAmbiguousDeferredMasters ?? -1;
  const v2ReadyMasters = new Set<string>(
    (['ga', 'na', 'da'] as const).flatMap((k) => (v2Shard.shards?.[k]?.masterIds || []) as string[]));
  const v2ReadyFps = new Set<string>(
    (['ga', 'na', 'da'] as const).flatMap((k) => (v2Shard.shards?.[k]?.fingerprintList || []) as string[]));

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'],
    extra: { statement_timeout: 900000 },
  });
  await ds.initialize();

  const otc: Array<{ id: string; name: string; spec: string | null }> = await ds.query(`
    SELECT DISTINCT pm.id::text id, pm.name, pm.specification spec
    FROM product_masters pm
    JOIN product_drug_extensions e
      ON e.product_master_id = pm.id AND e.drug_category = 'otc' AND e.deleted_at IS NULL
    ORDER BY 1`);

  const AUTHORED_SQL = `ARRAY['${AUTHORED_SOURCES.join("','")}']`;
  const easyKo = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND source_type='mfds_easy_drug' AND status='canonical'
      AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`);
  const authoredKo = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND source_type = ANY(${AUTHORED_SQL}) AND status='canonical'
      AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`);
  const enCanon = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='en' AND deleted_at IS NULL`);
  const needsReview = await loadSet(ds, `SELECT DISTINCT master_id::text id FROM shared_product_descriptions
    WHERE description_type='STORE' AND source_type = ANY(${AUTHORED_SQL})
      AND status='needs_review' AND deleted_at IS NULL`);

  const stdRows: Array<{ mid: string; gencodes: string[] | null; specs: string[] | null }> = await ds.query(`
    SELECT pi.product_master_id::text mid,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes,
           array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'약품규격','')), NULL) specs
    FROM product_identifiers pi
    JOIN product_drug_extensions e
      ON e.product_master_id = pi.product_master_id AND e.drug_category='otc' AND e.deleted_at IS NULL
    JOIN product_candidates pc
      ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
     AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
    WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
    GROUP BY 1 ORDER BY 1`);
  const stdByMid = new Map(stdRows.map((r) => [r.mid, r]));

  const easyContentRows: Array<{ id: string; content: string }> = await ds.query(`
    SELECT pop.id, es.content
    FROM (
      SELECT DISTINCT pm.id::text id
      FROM product_masters pm
      JOIN product_drug_extensions e ON e.product_master_id=pm.id AND e.drug_category='otc' AND e.deleted_at IS NULL
    ) pop
    JOIN LATERAL (
      SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status='canonical' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY length(s.content) DESC LIMIT 1
    ) es ON true`);
  await ds.destroy();

  const contentByMid = new Map<string, string>();
  for (const r of easyContentRows) contentByMid.set(r.id, r.content);

  // ── 1) 모집단 재현 (V2 우선순위 그대로) ──────────────────────────────────────────
  type Target = {
    id: string; name: string; spec: string | null; gencode: string; suffix: string;
    ind: string; dos: string; cau: string;
    exclude: boolean; bulk: boolean;
    sites: Array<{ site: Site; label: string; evidence: string }>;
    verdict?: string; reason?: string; site?: Site | null;
    fp?: string | null; identityKey?: string | null;
  };
  const targets: Target[] = [];
  for (const m of otc) {
    const std = stdByMid.get(m.id);
    const gencodes = (std?.gencodes || []).filter(Boolean).sort();
    if (gencodes.length !== 1) continue;
    const gencode = gencodes[0];
    if (gencode.length < 9) continue;
    const suffix = gencode.slice(6, 9).toUpperCase();
    if (!SITE_AMBIGUOUS.has(suffix)) continue;

    const exclude = EXCLUDE_RE.test(m.name) || EXCLUDE_RE.test(m.spec || '');
    const bulk = isNonRetailBulk(m.name, m.spec, ...(std?.specs || []));
    if (exclude || bulk) continue;                       // V2: EXCLUDE / EXCLUDE_NONRETAIL 선행
    if (authoredKo.has(m.id) && enCanon.has(m.id)) continue; // ALREADY_COMPLETE
    if (authoredKo.has(m.id) && !enCanon.has(m.id)) continue; // KO_ONLY
    if (needsReview.has(m.id)) continue;                 // NEEDS_REVIEW
    if (!easyKo.has(m.id)) continue;                     // not grounded

    const content = contentByMid.get(m.id);
    if (!content) continue;
    const sec = sections(content);
    const ind = sec['효능·효과'] || '';
    const dos = sec['용법·용량'] || '';
    const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
    if (!ind && !dos && !cau) continue;                  // parseFail → HOLD_SOURCE
    if (!ind || !dos) continue;                          // 원문 2축 필수 → HOLD_SOURCE

    targets.push({
      id: m.id, name: m.name, spec: m.spec, gencode, suffix,
      ind, dos, cau, exclude, bulk, sites: detectSites(dos),
    });
  }

  // EXCLUDE 재검토(WO 요구) — 모집단 진입 전에 걸러졌으므로 사유별로 별도 집계
  const excludeRows = otc.filter((m) => {
    const std = stdByMid.get(m.id);
    const gencodes = (std?.gencodes || []).filter(Boolean);
    if (gencodes.length !== 1 || gencodes[0].length < 9) return false;
    if (!SITE_AMBIGUOUS.has(gencodes[0].slice(6, 9).toUpperCase())) return false;
    return EXCLUDE_RE.test(m.name) || EXCLUDE_RE.test(m.spec || '')
      || isNonRetailBulk(m.name, m.spec, ...(std?.specs || []));
  }).map((m) => {
    const std = stdByMid.get(m.id);
    const keyword = EXCLUDE_RE.test(m.name) || EXCLUDE_RE.test(m.spec || '');
    const bulk = isNonRetailBulk(m.name, m.spec, ...(std?.specs || []));
    const hit = (m.name.match(EXCLUDE_RE) || (m.spec || '').match(EXCLUDE_RE) || [])[0] || null;
    return {
      id: m.id, name: m.name,
      reason: keyword && bulk ? 'keyword+bulk' : keyword ? 'non_retail_keyword' : 'bulk_package',
      keywordHit: keyword ? hit : null,
    };
  }).sort((a, b) => (a.id < b.id ? -1 : 1));
  const excludedFromPopulation = excludeRows.map((r) => r.id);
  const excludeReasons: Record<string, number> = {};
  for (const r of excludeRows) excludeReasons[r.reason] = (excludeReasons[r.reason] || 0) + 1;

  // ── 2) 판정 ─────────────────────────────────────────────────────────────────────
  for (const t of targets) {
    const distinct = [...new Set(t.sites.map((s) => s.site))].sort();
    if (distinct.length === 0) { t.verdict = 'HOLD_ROUTE'; t.reason = 'site_not_stated_in_official_dosage'; t.site = null; continue; }
    if (distinct.length > 1) { t.verdict = 'HOLD_ROUTE'; t.reason = `site_conflict(${distinct.join('/')})`; t.site = null; continue; }
    t.verdict = 'RECOVERABLE'; t.site = distinct[0]; t.reason = `site_stated(${distinct[0]})`;
    const normInd = H(normalize(t.ind)), normDos = H(normalize(t.dos)), normCau = H(normalize(t.cau));
    t.fp = H([normInd, normDos, normCau, t.gencode, t.site].join('|'));
    t.identityKey = `${t.gencode}|${t.site}`;
  }

  const recoverable = targets.filter((t) => t.verdict === 'RECOVERABLE');
  const held = targets.filter((t) => t.verdict === 'HOLD_ROUTE');

  // identity 분산 → SPLIT_REQUIRED 분리 (V2 규칙 동일)
  const identityFps = new Map<string, Set<string>>();
  for (const t of recoverable) {
    if (!identityFps.has(t.identityKey!)) identityFps.set(t.identityKey!, new Set());
    identityFps.get(t.identityKey!)!.add(t.fp!);
  }
  const splitTargets = recoverable.filter((t) => (identityFps.get(t.identityKey!)?.size ?? 1) > 1);
  const splitIds = new Set(splitTargets.map((t) => t.id));
  const shardable = recoverable.filter((t) => !splitIds.has(t.id));

  // ── 3) 적용부위별 fp/master 집계 ────────────────────────────────────────────────
  const bySite: Record<string, { masters: number; fps: Set<string>; suffixes: Record<string, number> }> = {};
  for (const t of recoverable) {
    const k = t.site!;
    if (!bySite[k]) bySite[k] = { masters: 0, fps: new Set(), suffixes: {} };
    bySite[k].masters++; bySite[k].fps.add(t.fp!);
    bySite[k].suffixes[t.suffix] = (bySite[k].suffixes[t.suffix] || 0) + 1;
  }
  const siteBreakdown = Object.fromEntries(
    Object.entries(bySite).sort((a, b) => b[1].masters - a[1].masters || (a[0] < b[0] ? -1 : 1))
      .map(([k, v]) => [k, { masters: v.masters, fingerprints: v.fps.size, bySuffix: v.suffixes }]));

  // ── 4) fp 그룹 & 3-shard 제안 (shardable 만) ────────────────────────────────────
  type FpGroup = { fp: string; gencode: string; site: Site; suffix: string; size: number; masterIds: string[] };
  const fpMap = new Map<string, FpGroup>();
  for (const t of shardable) {
    let g = fpMap.get(t.fp!);
    if (!g) { g = { fp: t.fp!, gencode: t.gencode, site: t.site!, suffix: t.suffix, size: 0, masterIds: [] }; fpMap.set(t.fp!, g); }
    g.size++; g.masterIds.push(t.id);
  }
  const fpGroups = [...fpMap.values()];
  for (const g of fpGroups) g.masterIds.sort();
  fpGroups.sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : a.fp > b.fp ? 1 : 0));

  const SHARDS = ['ga', 'na', 'da'] as const;
  const shardAssign: Record<string, { fps: string[]; masters: number; masterIds: string[]; sites: Record<string, number> }> = {
    ga: { fps: [], masters: 0, masterIds: [], sites: {} },
    na: { fps: [], masters: 0, masterIds: [], sites: {} },
    da: { fps: [], masters: 0, masterIds: [], sites: {} },
  };
  for (const g of fpGroups) {
    const target = [...SHARDS].sort((a, b) =>
      shardAssign[a].masters - shardAssign[b].masters ||
      shardAssign[a].fps.length - shardAssign[b].fps.length ||
      (a < b ? -1 : 1))[0];
    const s = shardAssign[target];
    s.fps.push(g.fp); s.masters += g.size; s.masterIds.push(...g.masterIds);
    s.sites[g.site] = (s.sites[g.site] || 0) + g.size;
  }
  for (const k of SHARDS) { shardAssign[k].masterIds.sort(); shardAssign[k].fps.sort(); }
  const allFps = SHARDS.flatMap((k) => shardAssign[k].fps);
  const allMasters = SHARDS.flatMap((k) => shardAssign[k].masterIds);

  // ── 5) 게이트 ───────────────────────────────────────────────────────────────────
  const gates = {
    populationMatchesV2Deferred: targets.length + excludedFromPopulation.length === v2ExpectedDeferred
      || targets.length === v2ExpectedDeferred,
    v2DeferredDeclared: v2ExpectedDeferred,
    populationReproduced: targets.length,
    excludedBeforePopulation: excludedFromPopulation.length,
    verdictSumEqualsPopulation: recoverable.length + held.length === targets.length,
    shardFpIntersection: allFps.length - new Set(allFps).size,
    shardMasterIntersection: allMasters.length - new Set(allMasters).size,
    shardFpSumEqualsGroups: allFps.length === fpGroups.length,
    shardMasterSumEqualsShardable: allMasters.length === shardable.length,
    disjointFromV2ReadyMasters: allMasters.every((id) => !v2ReadyMasters.has(id)),
    disjointFromV2ReadyFps: allFps.every((fp) => !v2ReadyFps.has(fp)),
    noNameDerivedRoute: true,
    excludeReviewedCount: excludedFromPopulation.length,
    dbWrite: 0,
  };

  const holdReasons: Record<string, number> = {};
  for (const t of held) holdReasons[t.reason!] = (holdReasons[t.reason!] || 0) + 1;

  const audit = {
    wo: 'WO-O4O-OTC-EXTERNAL-SITE-OF-APPLICATION-RECOVERY-AUDIT-V1',
    agent: 'la', readOnly: true, dbWrite: 0,
    source: {
      census: 'otc-remaining-full-corpus-census-v2.json',
      shard: 'otc-remaining-shard-assignment-ssot-v2.json',
      note: 'V2 READY shard 미수정. 본 감사는 V2 가 보류한 CLQ/CDS/CSI 만 대상으로 한다.',
    },
    principle: [
      '공식 용법 원문(e약은요 용법·용량)에 적용부위가 명시된 대상만 RECOVERABLE',
      '제품명으로 경로 추정 금지 — 제품명은 EXCLUDE 판정에만 사용',
      '외용 대분류 코드([7]=C)만으로 생산 대상 승격 금지',
      '적용부위 2개 이상 명시 → 상충 → HOLD_ROUTE 유지',
      '적용부위 미명시 → HOLD_ROUTE 유지',
    ],
    evidenceField: 'sites[].evidence — 정규화된 용법 원문에서 매칭 표현 전후 문맥을 그대로 인용',
    sitePatterns: SITE_PATTERNS.map((p) => ({ site: p.site, label: p.label, pattern: p.re.source })),
    totals: {
      population: targets.length,
      recoverable: recoverable.length,
      recoverableShardable: shardable.length,
      recoverableSplitRequired: splitTargets.length,
      holdRoute: held.length,
      excludeReviewed: excludedFromPopulation.length,
      fingerprints: fpGroups.length,
    },
    siteBreakdown,
    holdReasons: Object.fromEntries(Object.entries(holdReasons).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))),
    excludeVerdict: {
      total: excludeRows.length,
      byReason: Object.fromEntries(Object.entries(excludeReasons).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))),
      note: 'V2 에서 이미 EXCLUDE/EXCLUDE_NONRETAIL 로 분류된 건. 회수 대상 651 에 포함되지 않으며 본 감사에서도 회수하지 않는다.',
      sample: excludeRows.slice(0, 40),
    },
    gates,
    shardProposalSummary: {
      ga: { fp: shardAssign.ga.fps.length, masters: shardAssign.ga.masters, sites: shardAssign.ga.sites },
      na: { fp: shardAssign.na.fps.length, masters: shardAssign.na.masters, sites: shardAssign.na.sites },
      da: { fp: shardAssign.da.fps.length, masters: shardAssign.da.masters, sites: shardAssign.da.sites },
    },
    recoverableGroups: fpGroups.map((g) => ({
      fp: g.fp, gencode: g.gencode, suffix: g.suffix, site: g.site, size: g.size, masterIds: g.masterIds,
    })),
    recoverableEvidence: recoverable.slice(0, 120).map((t) => ({
      id: t.id, name: t.name, gencode: t.gencode, suffix: t.suffix, site: t.site,
      evidence: t.sites[0]?.evidence || '',
    })).sort((a, b) => (a.id < b.id ? -1 : 1)),
    holdSample: held.slice(0, 80).map((t) => ({
      id: t.id, name: t.name, gencode: t.gencode, suffix: t.suffix, reason: t.reason,
      sitesDetected: t.sites.map((s) => s.site).sort(),
    })).sort((a, b) => (a.id < b.id ? -1 : 1)),
    splitRequiredSample: splitTargets.slice(0, 60).map((t) => ({
      id: t.id, name: t.name, identityKey: t.identityKey, fp: t.fp,
    })).sort((a, b) => (a.id < b.id ? -1 : 1)),
  };

  const shardProposal = {
    wo: 'WO-O4O-OTC-EXTERNAL-SITE-OF-APPLICATION-RECOVERY-AUDIT-V1',
    artifact: 'shard-proposal',
    agent: 'la', readOnly: true, dbWrite: 0,
    status: 'PROPOSAL — 승인 전 생산 금지',
    sourceAudit: 'otc-external-site-recovery-audit-v1.json',
    relationToV2: {
      v2Shard: 'otc-remaining-shard-assignment-ssot-v2.json',
      note: 'V2 READY shard 와 fp·master 교집합 0. V2 shard 는 수정하지 않는다.',
      disjointFromV2ReadyMasters: gates.disjointFromV2ReadyMasters,
      disjointFromV2ReadyFps: gates.disjointFromV2ReadyFps,
    },
    principle: [
      'RECOVERABLE 이면서 identity 미분산인 fp 만 배정',
      'fp 는 정확히 한 shard',
      '적용부위는 공식 용법 원문 명시 근거로만 확정',
      'LIVE apply 는 단일 write-owner 순차',
    ],
    totals: { fingerprints: fpGroups.length, masters: shardable.length },
    invariants: {
      fpIntersection: gates.shardFpIntersection,
      masterIntersection: gates.shardMasterIntersection,
      fpSum: allFps.length,
      masterSum: allMasters.length,
    },
    shards: Object.fromEntries(SHARDS.map((k) => [k, {
      fingerprints: shardAssign[k].fps.length,
      masters: shardAssign[k].masters,
      sites: shardAssign[k].sites,
      fingerprintList: shardAssign[k].fps,
      masterIds: shardAssign[k].masterIds,
    }])),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_AUDIT, JSON.stringify(audit, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_SHARD, JSON.stringify(shardProposal, null, 2) + '\n', 'utf8');

  console.log('=== OTC EXTERNAL SITE-OF-APPLICATION RECOVERY AUDIT (read-only · dbWrite=0) ===');
  console.log('totals =', JSON.stringify(audit.totals, null, 2));
  console.log('siteBreakdown =', JSON.stringify(siteBreakdown, null, 2));
  console.log('holdReasons =', JSON.stringify(audit.holdReasons, null, 2));
  console.log('gates =', JSON.stringify(gates, null, 2));
  console.log('shardProposal =', JSON.stringify(audit.shardProposalSummary, null, 2));
  console.log('OUT:', OUT_AUDIT);
  console.log('OUT:', OUT_SHARD);
}
main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
