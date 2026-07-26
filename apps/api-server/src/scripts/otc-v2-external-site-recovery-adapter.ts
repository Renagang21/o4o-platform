/**
 * WO-O4O-OTC-EXTERNAL-SITE-RECOVERABLE-V2-RUNNER-ADAPTER-V1 — 외용 적용부위 회수분 입력 어댑터
 *
 * 작성: 에이전트 다. 가·나·다 **공용** 자산 — Shared Module Change Protocol 적용.
 *
 * ── 무엇인가 ──────────────────────────────────────────────────────────────────────
 * V2 census 는 일반명코드 접미 CLQ/CDS/CSI 를 "적용부위 미확정"으로 보고 READY 에서 제외했다
 * (같은 CLQ 안에 관장액·질세정액·가글액·피부소독액이 공존한다). 라 에이전트가 **공식 e약은요
 * 용법·용량 원문**에서 적용부위가 정확히 1종만 확인되는 대상만 회수해 승인 SSOT 로 확정했다
 * (`172a792fd`, 47 fp / 278 master).
 *
 * 본 어댑터는 그 승인 SSOT 를 기존 V2 공용 러너가 **안전하게** 소비하도록 입력을 변환한다.
 *   · route 는 **승인 SSOT 값**만 쓴다. 제품명으로 재추정하지 않는다(SSOT productionRules).
 *   · fingerprint·sourceRef·canonical 계약은 V2 공용 러너 것을 **그대로** 재사용한다.
 *   · V2 READY 트랙과 **원장·manifest·순서 게이트를 분리**한다(교차 오염 차단).
 *
 * ── 왜 별도 admission 이 필요한가 ────────────────────────────────────────────────
 * 공용 러너의 `admissionCheck` 는 CLQ/CDS/CSI 를 하드 차단한다(V2 계약). 그 차단은 옳다 —
 * "접미만 보고" 경로를 정할 수 없기 때문이다. 본 트랙은 접미가 아니라 **원문 근거(evidence)**
 * 로 경로가 확정된 건만 통과시킨다. 따라서 차단을 푸는 것이 아니라 **근거를 요구**한다.
 *
 * ⚠️ 현 단계: **dry-run 전용**. LIVE apply 경로 없음 · DB write 0.
 *
 * Usage(apps/api-server):
 *   ../../node_modules/.bin/tsx src/scripts/otc-v2-external-site-recovery-adapter.ts --selftest
 *   ../../node_modules/.bin/tsx src/scripts/otc-v2-external-site-recovery-adapter.ts \
 *       --track=external-site-recovery --shard=ga --dry-run
 *   ... --shard=ga --emit-sample --per-route=2
 *   ... --shard=ga --apply-readiness
 *
 * 접속: Cloud SQL Auth Proxy 127.0.0.1:5442. env: DB_HOST DB_PORT DB_USERNAME DB_PASSWORD DB_NAME.
 *   (자격증명 값은 열람·출력하지 않는다. 루트 .env 미사용.)
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  officialAxes, fingerprintV2, fpToUuidV2,
  composeKo, renderEn, buildGroupKo, fetchTargetState, verifyGroupMasters,
  numericTokens, missingNumerics, normalize,
  NONORAL_REWRITE, ORAL_VERB_RE, EN_ORAL_VERB_RE,
  AUTHORED_SOURCES, BLOCKED_MASTER_IDS, BLOCKED_FPS,
  readLedger, type ApplyLedger, type RouteProfile, type V2Group, type TargetState,
} from './otc-v2-store-leaflet-runner.shared.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const SSOT_PATH = path.join(DATA_DIR, 'otc-external-site-recovery-approved-ssot-v1.json');
const AUDIT_PATH = path.join(DATA_DIR, 'otc-external-site-recovery-audit-v1.json');
const V2_SSOT_PATH = path.join(DATA_DIR, 'otc-remaining-shard-assignment-ssot-v2.json');
const LEDGER_PATH = path.join(DATA_DIR, 'otc-v2-recovery-apply-order.json');

export const TRACK = 'external-site-recovery';
const WO = 'WO-O4O-OTC-EXTERNAL-SITE-RECOVERABLE-V2-RUNNER-ADAPTER-V1';
const APPROVAL_COMMIT = '172a792fd';

/** 본 트랙의 모집단 = V2 가 적용부위 미확정으로 보류한 접미. 이 밖의 접미는 입력 자체를 거부한다. */
const RECOVERY_SUFFIXES = new Set(['CLQ', 'CDS', 'CSI']);

/** WO 확정 대상 — SSOT 실측과 불일치하면 중지한다. */
export const EXPECTED = {
  total: { fp: 47, master: 278 },
  shards: { ga: { fp: 17, master: 93 }, na: { fp: 16, master: 93 }, da: { fp: 14, master: 92 } },
  routeTotals: { cutaneous: 162, oromucosal: 58, nasal: 45, rectal: 7, vaginal: 6 },
  write: {
    ga: { master: 93, ko: 372, en: 186, total: 558 },
    na: { master: 93, ko: 372, en: 186, total: 558 },
    da: { master: 92, ko: 368, en: 184, total: 552 },
  },
} as const;

/** V2 READY 트랙 규모 — 교집합 0 게이트의 기준값. */
const V2_READY = { fp: 716, master: 2517 };
const V2_APPLIED_MASTERS = 2509;

// ════════════════════════════════════════════════════════════════════════════════
// 1. route 표현 — WO 명시. 경구 'take/복용' 은 어떤 경로에도 쓰지 않는다.
// ════════════════════════════════════════════════════════════════════════════════
const nonOral = (koLabel: string, enLabel: string): RouteProfile => ({
  koUsageLabel: koLabel, enUsageLabel: enLabel,
  koVerbRewrite: NONORAL_REWRITE, koForbidden: ORAL_VERB_RE, enForbidden: EN_ORAL_VERB_RE,
});

/** 본 트랙 전용 프로파일. 공용 러너의 ROUTE_PROFILE 은 건드리지 않는다(V2 READY 계약 불변). */
export const RECOVERY_ROUTE_PROFILE: Record<string, RouteProfile> = {
  cutaneous: nonOral('사용 안내', 'How to apply it to the affected area'),
  oromucosal: nonOral('사용 안내', 'How to use it in the mouth or throat as directed'),
  nasal: nonOral('사용 안내', 'How to use it in the nostril'),
  rectal: nonOral('사용 안내', 'How to use it rectally'),
  vaginal: nonOral('사용 안내', 'How to use it vaginally'),
};
export const RECOVERY_ROUTES = Object.keys(RECOVERY_ROUTE_PROFILE);

/** 제형(form)은 CLQ/CDS/CSI 에서 확정되지 않는다 → 경로 라벨을 쓴다(없는 제형을 단정하지 않는다). */
export const ROUTE_LABEL_KO: Record<string, string> = {
  cutaneous: '피부 외용', oromucosal: '구강·인후', nasal: '비강', rectal: '직장', vaginal: '질',
};

/**
 * 근거 텍스트 ↔ 경로 합치 검증 패턴 — **라 감사 `sitePatterns` VERBATIM**.
 *
 * 처음에는 패턴을 직접 재도출했는데, 그 판(判)이 라 정본보다 좁아 수술자 손소독 스크럽
 * (`문지르`·`씻어내고`)을 거짓 FAIL 로 떨어뜨렸다. 승인 판정의 근거가 된 패턴과 다른 잣대로
 * 재검증하면 검증이 아니라 **다른 기준의 재판정**이 된다. 따라서 정본을 그대로 쓰고,
 * selftest 가 감사 파일과 일치하는지 교차 확인한다(패턴 drift 탐지).
 */
export const SITE_PATTERN_SRC: Record<string, string> = {
  rectal: '항문|직장\\s?내|직장에|관장',
  vaginal: '질\\s?내|질강|질에|질세정|질\\s?점막',
  oromucosal: '구강|입\\s?안|양치|가글|함수|인후|인두|목구멍|헹구|씹어|잇몸',
  nasal: '비강|콧\\s?속|코\\s?안|코에',
  cutaneous: '피부|환부|患部|상처\\s?부위|도포|바른다|바르고|바를|문지르|씻어\\s?낸다|씻어\\s?내고|소독한다|소독하여|닦아\\s?낸다|국소\\s?부위',
};
export const SITE_PATTERN: Record<string, RegExp> = Object.fromEntries(
  Object.entries(SITE_PATTERN_SRC).map(([k, v]) => [k, new RegExp(v)]),
);

// ════════════════════════════════════════════════════════════════════════════════
// 2. 승인 SSOT 로더
// ════════════════════════════════════════════════════════════════════════════════
export interface ApprovedMaster {
  masterId: string; name: string; shard: string; fp: string; gencode: string; suffix: string;
  route: string; officialSite: string; evidence: string; evidenceSection: string;
}
export interface RecoveryShard {
  shard: string; groups: V2Group[]; byMaster: Map<string, ApprovedMaster>;
  declared: { fp: number; master: number; routes: Record<string, number> };
}

function readSsot(): any {
  const j = JSON.parse(fs.readFileSync(SSOT_PATH, 'utf8'));
  if (j.status !== 'APPROVED_FOR_PRODUCTION') throw new Error(`승인 SSOT 아님(status=${j.status})`);
  if (j.allGatesPass !== true) throw new Error('승인 SSOT allGatesPass=false');
  return j;
}

/**
 * 승인 SSOT → 공용 러너가 먹는 V2Group[].
 * route 는 SSOT 값 그대로. form 은 경로 라벨(제형 미확정이므로 단정하지 않는다).
 */
export function loadRecoveryShard(shard: string): RecoveryShard {
  const j = readSsot();
  const s = j.shards?.[shard];
  if (!s) throw new Error(`shard '${shard}' 없음 (가능: ${Object.keys(j.shards || {}).join(',')})`);

  const mine: ApprovedMaster[] = (j.masters as ApprovedMaster[]).filter((m) => m.shard === shard);
  const byMaster = new Map(mine.map((m) => [m.masterId, m]));
  const fpSet = new Set<string>(s.fingerprintList);

  const byFp = new Map<string, ApprovedMaster[]>();
  for (const m of mine) {
    if (!byFp.has(m.fp)) byFp.set(m.fp, []);
    byFp.get(m.fp)!.push(m);
  }
  const groups: V2Group[] = [...byFp.entries()].map(([fp, arr]) => ({
    fp, gencode: arr[0].gencode, route: arr[0].route,
    form: ROUTE_LABEL_KO[arr[0].route] || arr[0].route,
    size: arr.length, masterIds: arr.map((x) => x.masterId).sort(),
  })).sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : a.fp > b.fp ? 1 : 0));

  // SSOT 자체 정합 — 선언과 실측이 다르면 즉시 중지
  if (groups.length !== s.fingerprints) throw new Error(`${shard} fp 선언 ${s.fingerprints} != 실측 ${groups.length}`);
  const mSum = groups.reduce((t, g) => t + g.size, 0);
  if (mSum !== s.masters) throw new Error(`${shard} master 선언 ${s.masters} != 실측 ${mSum}`);
  for (const g of groups) if (!fpSet.has(g.fp)) throw new Error(`${shard} fp ${g.fp} 가 fingerprintList 밖`);
  const declaredIds = new Set<string>(s.masterIds);
  for (const m of mine) if (!declaredIds.has(m.masterId)) throw new Error(`${shard} master ${m.masterId} 가 masterIds 밖`);

  return { shard, groups, byMaster, declared: { fp: s.fingerprints, master: s.masters, routes: s.routes } };
}

// ════════════════════════════════════════════════════════════════════════════════
// 3. 본 트랙 admission — 접미 차단을 푸는 것이 아니라 **원문 근거를 요구**한다
// ════════════════════════════════════════════════════════════════════════════════
export function admissionCheckRecovery(g: V2Group, byMaster: Map<string, ApprovedMaster>): string[] {
  const bad: string[] = [];
  if (BLOCKED_FPS.has(g.fp)) bad.push(`차단 fp(${g.fp})`);
  const blocked = g.masterIds.filter((id) => BLOCKED_MASTER_IDS.has(id));
  if (blocked.length) bad.push(`차단 master ${blocked.length}건`);
  if (!RECOVERY_ROUTE_PROFILE[g.route]) bad.push(`미지원 route(${g.route})`);

  for (const id of g.masterIds) {
    const m = byMaster.get(id);
    if (!m) { bad.push(`승인 SSOT 밖 master ${id}`); continue; }
    if (!RECOVERY_SUFFIXES.has(m.suffix)) bad.push(`모집단 밖 접미 ${m.suffix} (${id})`);
    if (m.gencode !== g.gencode) bad.push(`gencode 상충 ${id}`);
    if (m.gencode.slice(6, 9).toUpperCase() !== m.suffix) bad.push(`suffix↔gencode 불일치 ${id}`);
    if (m.route !== g.route) bad.push(`route 상충 ${id}`);
    if (m.officialSite !== m.route) bad.push(`officialSite != route ${id}`);
    if (!m.evidence || !m.evidence.trim()) bad.push(`근거 결손 ${id}`);
    if (m.evidenceSection !== '용법·용량') bad.push(`근거 섹션 비정상(${m.evidenceSection}) ${id}`);
    const pat = SITE_PATTERN[m.route];
    if (pat && !pat.test(m.evidence)) bad.push(`근거↔route 불합치 ${id}(${m.route})`);
  }
  return [...new Set(bad)];
}

// ════════════════════════════════════════════════════════════════════════════════
// 4. 별도 순서 게이트 — V2 READY 원장과 분리
// ════════════════════════════════════════════════════════════════════════════════
export const RECOVERY_ORDER = ['ga', 'na', 'da'] as const;

export function recoveryLedger(): ApplyLedger {
  if (fs.existsSync(LEDGER_PATH)) return readLedger(LEDGER_PATH);
  const status: ApplyLedger['status'] = {};
  for (const s of RECOVERY_ORDER) status[s] = { koApplied: false, enApplied: false, independentVerified: false };
  return { wo: WO, order: [...RECOVERY_ORDER], status };
}

export function recoveryOrderBlockers(shard: string, l: ApplyLedger = recoveryLedger()): string[] {
  const idx = l.order.indexOf(shard);
  if (idx < 0) return [`shard '${shard}' 는 순서(${l.order.join('→')})에 없다`];
  const out: string[] = [];
  for (const prev of l.order.slice(0, idx)) {
    const st = l.status[prev];
    if (!st?.koApplied) out.push(`선행 shard '${prev}' KO apply 미완료`);
    if (!st?.enApplied) out.push(`선행 shard '${prev}' EN apply 미완료`);
    if (!st?.independentVerified) out.push(`선행 shard '${prev}' 독립검증 미완료`);
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════
// 5. 오프라인 selftest
// ════════════════════════════════════════════════════════════════════════════════
const FIXTURE = (ind: string, dos: string, cau: string): string =>
  `<p><strong>효능·효과</strong><br/>${ind}</p><p><strong>용법·용량</strong><br/>${dos}</p>` +
  `<p><strong>사용상 주의사항</strong><br/>${cau}</p>`;

function selfTest(): void {
  const fail: string[] = [];
  const eq = (l: string, a: unknown, b: unknown): void => {
    if (JSON.stringify(a) !== JSON.stringify(b)) fail.push(`${l}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  };

  // (1) 승인 SSOT 총계·shard·route 합
  const j = readSsot();
  eq('SSOT 총계', j.totals, { fingerprints: EXPECTED.total.fp, masters: EXPECTED.total.master });
  eq('routeTotals', j.routeTotals, EXPECTED.routeTotals);
  for (const s of RECOVERY_ORDER) {
    const sh = loadRecoveryShard(s);
    eq(`${s} fp`, sh.groups.length, EXPECTED.shards[s].fp);
    eq(`${s} master`, sh.groups.reduce((t, g) => t + g.size, 0), EXPECTED.shards[s].master);
  }

  // (2) shard 교집합 0 · master 중복 0
  const all = RECOVERY_ORDER.map((s) => loadRecoveryShard(s));
  const fpAll = all.flatMap((x) => x.groups.map((g) => g.fp));
  const mAll = all.flatMap((x) => x.groups.flatMap((g) => g.masterIds));
  eq('fp 중복 0', fpAll.length - new Set(fpAll).size, 0);
  eq('master 중복 0', mAll.length - new Set(mAll).size, 0);
  eq('fp 합 47', new Set(fpAll).size, EXPECTED.total.fp);
  eq('master 합 278', new Set(mAll).size, EXPECTED.total.master);

  // (3) V2 READY 교집합 0
  const v2 = JSON.parse(fs.readFileSync(V2_SSOT_PATH, 'utf8'));
  const v2Fp = new Set<string>(), v2M = new Set<string>();
  for (const k of ['ga', 'na', 'da']) {
    for (const f of v2.shards[k].fingerprintList) v2Fp.add(f);
    for (const m of v2.shards[k].masterIds) v2M.add(m);
  }
  eq('V2 READY fp 규모', v2Fp.size, V2_READY.fp);
  eq('V2 READY master 규모', v2M.size, V2_READY.master);
  eq('V2 READY fp 교집합 0', fpAll.filter((f) => v2Fp.has(f)).length, 0);
  eq('V2 READY master 교집합 0', mAll.filter((m) => v2M.has(m)).length, 0);

  // (4) 차단 모집단(감사 샘플) 혼입 0 + sitePattern 정본 일치(drift 탐지)
  if (fs.existsSync(AUDIT_PATH)) {
    const a = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    for (const p of (a.sitePatterns || []) as Array<{ site: string; pattern: string }>) {
      if (!SITE_PATTERN_SRC[p.site]) continue; // 본 트랙 미사용 경로(ophthalmic/otic)는 대상 아님
      if (SITE_PATTERN_SRC[p.site] !== p.pattern) {
        fail.push(`sitePattern drift(${p.site}): 어댑터 "${SITE_PATTERN_SRC[p.site]}" != 감사 "${p.pattern}"`);
      }
    }
    for (const site of Object.keys(SITE_PATTERN_SRC)) {
      if (!(a.sitePatterns || []).some((p: any) => p.site === site)) fail.push(`감사에 없는 site 패턴 ${site}`);
    }
    const blockedIds = new Set<string>([
      ...(a.holdSample || []).map((x: any) => x.id),
      ...(a.splitRequiredSample || []).map((x: any) => x.id),
      ...((a.excludeVerdict?.sample) || []).map((x: any) => x.id),
    ]);
    eq('차단 샘플 혼입 0', mAll.filter((m) => blockedIds.has(m)).length, 0);
  }

  // (5) route 프로파일 — 경구 표현 금지 · 5 경로 지원
  eq('지원 route', RECOVERY_ROUTES.sort(), ['cutaneous', 'nasal', 'oromucosal', 'rectal', 'vaginal']);
  for (const [r, p] of Object.entries(RECOVERY_ROUTE_PROFILE)) {
    if (/take|orally|by mouth|swallow/i.test(p.enUsageLabel)) fail.push(`${r} EN 라벨에 경구 표현`);
    if (p.koUsageLabel !== '사용 안내') fail.push(`${r} KO 라벨이 '사용 안내' 아님`);
  }

  // (6) 경로별 KO 합성 — 경구 동사 소거 + 수치 보존
  const cases: Array<[string, string, string[]]> = [
    ['cutaneous', '1일 1~3회 환부에 적당량을 복용합니다. 7일간 계속 복용하십시오.', ['1일', '3회', '7일']],
    ['oromucosal', '1회 10mL를 입안에 머금고 30초간 가글한 뒤 복용하지 마십시오. 1일 4회.', ['10mL', '30초', '4회']],
    ['nasal', '1회 1~2번씩 좌우 비강내에 분무합니다. 1일 3회까지 복용 가능합니다.', ['1회', '2번', '3회']],
    ['rectal', '1회 1개를 항문에 삽입합니다. 1일 2회까지 복용합니다.', ['1개', '2회']],
    ['vaginal', '1일 1회 1정을 질 내에 삽입합니다. 7일간 복용하십시오.', ['1정', '7일']],
  ];
  for (const [route, dos, toks] of cases) {
    const ax = officialAxes(FIXTURE('적응증', dos, '이상 시 복용을 중지하고 상담'));
    const ko = composeKo(ax, route, ROUTE_LABEL_KO[route], 'D05200CLQ', RECOVERY_ROUTE_PROFILE);
    if (/복용|내복/.test(ko.source.usage)) fail.push(`${route} 용법에 경구 동사 잔존`);
    if (/복용|내복/.test(ko.source.caution)) fail.push(`${route} 주의에 경구 동사 잔존`);
    if (ko.source.usageLabel !== '사용 안내') fail.push(`${route} 라벨 오류`);
    const flat = ko.source.usage.replace(/\s+/g, '');
    for (const t of toks) if (!flat.includes(t.replace(/\s+/g, ''))) fail.push(`${route} 수치 누락 ${t}`);
    if (ko.anomalies.length) fail.push(`${route} 이상 ${ko.anomalies.join(';')}`);
    // 부위 표현 보존
    const pat = SITE_PATTERN[route];
    if (pat && !pat.test(ko.source.usage)) fail.push(`${route} 부위 표현 소실`);
  }

  // (7) EN 렌더 — 경로 라벨 주입 · 경구 동사 차단
  const enOk = renderEn({
    groupKey: 'r1', title: 'Test Solution', efficacy: 'For minor skin wounds.',
    usage: 'Apply an appropriate amount to the affected area 1 to 3 times a day for 7 days.',
    caution: 'Stop use if irritation occurs.', summaryTable: { Category: 'OTC · Cutaneous' },
  }, 'cutaneous', '1일 1~3회 환부에 적당량을 바릅니다. 7일간 계속 사용하십시오.', RECOVERY_ROUTE_PROFILE);
  eq('EN cutaneous 이상 0', enOk.anomalies, []);
  if (/[가-힣]/.test(enOk.html)) fail.push('EN 한글 잔존');
  const enBad = renderEn({
    groupKey: 'r2', title: 'Test Solution', efficacy: 'For wounds.',
    usage: 'Take 1 to 3 times a day for 7 days.', caution: 'Stop if irritated.',
    summaryTable: { Category: 'OTC' },
  }, 'cutaneous', '1일 1~3회 7일간', RECOVERY_ROUTE_PROFILE);
  if (!enBad.anomalies.some((a) => /경구 동사/.test(a))) fail.push('EN 경구동사 게이트 미작동');

  // (8) admission — 근거 없는 CLQ 는 통과 불가
  const okM: ApprovedMaster = { masterId: 'm1', name: 'x', shard: 'ga', fp: 'f1', gencode: 'D05200CLQ',
    suffix: 'CLQ', route: 'cutaneous', officialSite: 'cutaneous', evidence: '1일 1회 환부에 바릅니다', evidenceSection: '용법·용량' };
  const g1: V2Group = { fp: 'f1', gencode: 'D05200CLQ', route: 'cutaneous', form: '피부 외용', size: 1, masterIds: ['m1'] };
  eq('근거 있는 CLQ 통과', admissionCheckRecovery(g1, new Map([['m1', okM]])), []);
  const noEv = { ...okM, evidence: '' };
  if (!admissionCheckRecovery(g1, new Map([['m1', noEv]])).some((b) => /근거 결손/.test(b))) fail.push('근거 결손 게이트 미작동');
  const mismatch = { ...okM, evidence: '1일 1회 콧속에 분무합니다' };
  if (!admissionCheckRecovery(g1, new Map([['m1', mismatch]])).some((b) => /불합치/.test(b))) fail.push('근거↔route 게이트 미작동');
  const badSuffix = { ...okM, gencode: 'D05200ATB', suffix: 'ATB' };
  const g2: V2Group = { ...g1, gencode: 'D05200ATB' };
  if (!admissionCheckRecovery(g2, new Map([['m1', badSuffix]])).some((b) => /모집단 밖/.test(b))) fail.push('모집단 게이트 미작동');
  const outside: V2Group = { ...g1, masterIds: ['zzz'] };
  if (!admissionCheckRecovery(outside, new Map([['m1', okM]])).some((b) => /SSOT 밖/.test(b))) fail.push('SSOT 밖 게이트 미작동');

  // (9) 순서 게이트 (V2 READY 원장과 분리)
  const fresh: ApplyLedger = { wo: 'test', order: ['ga', 'na', 'da'],
    status: { ga: { koApplied: false, enApplied: false, independentVerified: false },
      na: { koApplied: false, enApplied: false, independentVerified: false },
      da: { koApplied: false, enApplied: false, independentVerified: false } } };
  eq('ga 선행 없음', recoveryOrderBlockers('ga', fresh), []);
  if (!recoveryOrderBlockers('na', fresh).length) fail.push('na 순서 게이트 미작동');
  if (!recoveryOrderBlockers('da', fresh).length) fail.push('da 순서 게이트 미작동');

  // (10) 예상 write 산식
  for (const [s, e] of Object.entries(EXPECTED.write)) {
    if (e.ko !== e.master * 4 || e.en !== e.master * 2 || e.total !== e.master * 6) fail.push(`${s} write 산식 불일치`);
  }
  eq('총 write', Object.values(EXPECTED.write).reduce((t, e) => t + e.total, 0), 1668);
  eq('총 KO', Object.values(EXPECTED.write).reduce((t, e) => t + e.ko, 0), 1112);
  eq('총 EN', Object.values(EXPECTED.write).reduce((t, e) => t + e.en, 0), 556);

  if (fail.length) { console.error(`SELFTEST FAIL ${fail.length}건`); for (const f of fail) console.error('  - ' + f); process.exit(1); }
  console.log(`SELFTEST PASS — 승인 SSOT 47fp/278m · shard 17/93·16/93·14/92 · V2 READY 교집합 0 · 근거 게이트 · 경로별 KO/EN(${RECOVERY_ROUTES.join(',')}) · 순서 게이트 · write 1,668T. DB 미접속.`);
}

// ════════════════════════════════════════════════════════════════════════════════
// 6. DB read-only dry-run
// ════════════════════════════════════════════════════════════════════════════════
const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const retRows = <T>(res: unknown): T[] => (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];

async function connect(): Promise<any> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 900000 },
  });
  await ds.initialize();
  return ds;
}

interface DbChecks { canonicalDup: number; authoredCanonical: number; v2AppliedTotal: number; evidenceMismatch: string[] }

async function dbChecks(ds: any, allIds: string[], byMaster: Map<string, ApprovedMaster>, st: TargetState): Promise<DbChecks> {
  const dup = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM (
      SELECT master_id, COALESCE(language,'ko') lang, count(*) c FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1,2 HAVING count(*) > 1) d`, [allIds]));

  // 기존 authored STORE canonical ko/en 보유 — 0 이어야 한다(= LIVE 완료분과 교집합 0)
  const auth = retRows<{ n: string }>(await ds.query(`
    SELECT count(DISTINCT master_id)::text n FROM shared_product_descriptions
    WHERE master_id = ANY($1::uuid[]) AND description_type='STORE' AND status='canonical'
      AND source_type = ANY($2) AND deleted_at IS NULL`, [allIds, AUTHORED_SOURCES as unknown as string[]]));

  // V2 LIVE 완료 규모(전역) — 2,509 기준값 확인용
  const applied = retRows<{ n: string }>(await ds.query(`
    SELECT count(DISTINCT master_id)::text n FROM shared_product_descriptions
    WHERE description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko'
      AND source_type = ANY($1) AND deleted_at IS NULL`, [AUTHORED_SOURCES as unknown as string[]]));

  // 근거 대조 — SSOT evidence 가 실제 공식 용법 원문에서 재확인되는가
  // 라 감사는 **정규화된** 용법 원문에서 근거를 인용했다(audit.evidenceField).
  // 따라서 같은 normalize() 를 통과시킨 텍스트끼리 대조해야 like-for-like 가 된다.
  const evidenceMismatch: string[] = [];
  const squash = (s: string): string => s.replace(/\s+/g, '');
  for (const [mid, m] of byMaster) {
    const content = st.contentByMid.get(mid);
    if (!content) { evidenceMismatch.push(`${mid}: 원문 부재`); continue; }
    const dosRaw = officialAxes(content).dos;
    const dosNorm = squash(normalize(dosRaw));
    const head = squash(normalize(m.evidence)).slice(0, 24);
    if (head && !dosNorm.includes(head)) evidenceMismatch.push(`${mid}: 근거가 공식 용법 원문에 없음`);
    const pat = SITE_PATTERN[m.route];
    if (pat && !pat.test(normalize(dosRaw))) evidenceMismatch.push(`${mid}: 공식 용법에 ${m.route} 부위 표현 없음`);
  }

  return {
    canonicalDup: parseInt(dup[0]?.n || '0', 10),
    authoredCanonical: parseInt(auth[0]?.n || '0', 10),
    v2AppliedTotal: parseInt(applied[0]?.n || '0', 10),
    evidenceMismatch,
  };
}

async function dryRun(): Promise<void> {
  const shard = arg('shard');
  if (!shard) { console.error('--shard=ga|na|da 필요'); process.exit(2); }
  const outPath = arg('out') || path.join(DATA_DIR, `otc-v2-recovery-dryrun-manifest.${shard}.json`);
  const sh = loadRecoveryShard(shard);
  const allIds = [...new Set(sh.groups.flatMap((g) => g.masterIds))].sort();

  // 교집합 게이트 (파일 기반)
  const v2 = JSON.parse(fs.readFileSync(V2_SSOT_PATH, 'utf8'));
  const v2Fp = new Set<string>(), v2M = new Set<string>();
  for (const k of ['ga', 'na', 'da']) {
    for (const f of v2.shards[k].fingerprintList) v2Fp.add(f);
    for (const m of v2.shards[k].masterIds) v2M.add(m);
  }
  const otherShards = RECOVERY_ORDER.filter((s) => s !== shard).map((s) => loadRecoveryShard(s));
  const otherFp = new Set(otherShards.flatMap((x) => x.groups.map((g) => g.fp)));
  const otherM = new Set(otherShards.flatMap((x) => x.groups.flatMap((g) => g.masterIds)));

  let blockedSampleHit = 0;
  if (fs.existsSync(AUDIT_PATH)) {
    const a = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'));
    const ids = new Set<string>([...(a.holdSample || []).map((x: any) => x.id),
      ...(a.splitRequiredSample || []).map((x: any) => x.id),
      ...((a.excludeVerdict?.sample) || []).map((x: any) => x.id)]);
    blockedSampleHit = allIds.filter((m) => ids.has(m)).length;
  }

  const ds = await connect();
  const st = await fetchTargetState(ds, allIds);
  const dbc = await dbChecks(ds, allIds, sh.byMaster, st);
  await ds.destroy();

  const results: Array<Record<string, unknown>> = [];
  const anomaliesAll: string[] = [];
  let fpOkAll = 0, fpBadAll = 0, koPlan = 0, enPlan = 0, admitted = 0;
  const routeTally: Record<string, { fp: number; master: number }> = {};

  for (const g of sh.groups) {
    const anomalies: string[] = [...admissionCheckRecovery(g, sh.byMaster)];
    // fp 재현 — 공용 러너 계약 그대로. verifyGroupMasters 는 접미 allowlist 를 쓰므로
    // 본 트랙은 gencode/route 를 SSOT 값으로 고정해 직접 재현한다(산식은 동일 함수).
    let fpOk = 0, fpBad = 0, easy1 = 0;
    for (const mid of g.masterIds) {
      const gc = st.gencodeByMid.get(mid) ?? null;
      const content = st.contentByMid.get(mid);
      if (!gc) { anomalies.push(`gencode 연결 실패 ${mid}`); fpBad++; continue; }
      if (gc !== g.gencode) { anomalies.push(`gencode 상충 ${mid}: ${gc} vs ${g.gencode}`); fpBad++; continue; }
      if (!content) { anomalies.push(`원문 부재 ${mid}`); fpBad++; continue; }
      const ax = officialAxes(content);
      if (!ax.ind || !ax.dos) { anomalies.push(`공식 축 부족 ${mid}`); fpBad++; continue; }
      const fp = fingerprintV2(ax, gc, g.route);
      if (fp !== g.fp) { anomalies.push(`fp 불일치 ${mid}: ${fp} != ${g.fp}`); fpBad++; continue; }
      fpOk++;
      const slot = st.slotByMid.get(mid);
      if (slot && parseInt(slot.easy1, 10) === 1) easy1++;
    }

    const ko = buildGroupKo(g, st, RECOVERY_ROUTE_PROFILE);
    if (ko.source) anomalies.push(...ko.anomalies); else anomalies.push('대표 원문 없음');
    if (easy1 !== g.size) anomalies.push(`easy ko canonical 정확히1 아님 ${easy1}/${g.size}`);

    const per: Record<string, unknown> = {
      fp: g.fp, gencode: g.gencode, suffix: g.gencode.slice(6, 9), route: g.route, form: g.form,
      size: g.size, sourceRef: fpToUuidV2(g.fp), fpOk, fpBad, easyCanonical1: easy1,
      koWritePlan: 0, enWritePlan: 0, anomalies,
      koHtmlMd5: ko.source ? md5(ko.html) : null, koHtmlLen: ko.html.length,
    };
    if (anomalies.length === 0) {
      admitted++; koPlan += g.size * 4; enPlan += g.size * 2;
      per.koWritePlan = g.size * 4; per.enWritePlan = g.size * 2;
      routeTally[g.route] = routeTally[g.route] || { fp: 0, master: 0 };
      routeTally[g.route].fp++; routeTally[g.route].master += g.size;
    }
    fpOkAll += fpOk; fpBadAll += fpBad;
    if (anomalies.length) anomaliesAll.push(`[${g.fp}] ${anomalies.join(' | ')}`);
    results.push(per);
  }

  const exp = EXPECTED.write[shard as keyof typeof EXPECTED.write];
  const declared = EXPECTED.shards[shard as keyof typeof EXPECTED.shards];
  const ssot = readSsot();

  const gates: Record<string, boolean> = {
    'G1 SSOT 총계 47fp/278m': ssot.totals.fingerprints === EXPECTED.total.fp && ssot.totals.masters === EXPECTED.total.master,
    'G2 shard 선언 일치': sh.groups.length === declared.fp && allIds.length === declared.master,
    'G3 fp 재현 100%': fpBadAll === 0 && fpOkAll === declared.master,
    'G4 master 중복 0': allIds.length === sh.groups.reduce((t, g) => t + g.size, 0),
    'G5 shard 교집합 0': sh.groups.every((g) => !otherFp.has(g.fp)) && allIds.every((m) => !otherM.has(m)),
    'G6 V2 READY 교집합 0': sh.groups.every((g) => !v2Fp.has(g.fp)) && allIds.every((m) => !v2M.has(m)),
    'G7 LIVE 완료분 교집합 0': dbc.authoredCanonical === 0,
    'G8 authored canonical 보유 0': dbc.authoredCanonical === 0,
    'G9 route·근거 일치': dbc.evidenceMismatch.length === 0,
    'G10 근거 결손 0': [...sh.byMaster.values()].every((m) => !!m.evidence && m.evidenceSection === '용법·용량'),
    'G11 차단 모집단 혼입 0': blockedSampleHit === 0,
    'G12 canonicalDup 0': dbc.canonicalDup === 0,
    'G13 dry-run DB write 0': true,
    'G14 예상 write 일치': koPlan === exp.ko && enPlan === exp.en,
  };

  const manifest = {
    wo: WO, track: TRACK, adapter: 'otc-v2-external-site-recovery-adapter.ts',
    runner: 'otc-v2-store-leaflet-runner.shared.ts',
    approvedSsot: 'otc-external-site-recovery-approved-ssot-v1.json', approvalCommit: APPROVAL_COMMIT,
    shard, mode: 'dry-run', dbWrite: 0, apply: false,
    supportedRoutes: RECOVERY_ROUTES,
    declared: { fingerprints: declared.fp, masters: declared.master, routes: sh.declared.routes },
    processed: { fingerprints: sh.groups.length, masters: allIds.length },
    gates,
    metrics: {
      fpReproduced: fpOkAll, fpFailed: fpBadAll, admittedGroups: admitted,
      groupsWithAnomalies: results.filter((r) => (r.anomalies as string[]).length > 0).length,
      canonicalDup: dbc.canonicalDup, authoredCanonicalPresent: dbc.authoredCanonical,
      v2AppliedMastersGlobal: dbc.v2AppliedTotal, v2AppliedExpected: V2_APPLIED_MASTERS,
      blockedSampleHit, evidenceMismatch: dbc.evidenceMismatch.length,
      evidenceMismatchDetail: dbc.evidenceMismatch.slice(0, 40),
      v2ReadyFp: v2Fp.size, v2ReadyMaster: v2M.size,
    },
    writePlan: { ko_4T: koPlan, en_2T: enPlan, total: koPlan + enPlan },
    expectedWrite: exp,
    routeTally,
    orderBlockers: recoveryOrderBlockers(shard),
    groups: results,
    anomalies: anomaliesAll,
  };
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 1) + '\n', 'utf8');

  const failed = Object.entries(gates).filter(([, ok]) => !ok);
  console.log(`RECOVERY DRY-RUN ${shard} — fp ${sh.groups.length}/${declared.fp} · master ${allIds.length}/${declared.master}`);
  for (const [k, ok] of Object.entries(gates)) console.log(`  ${ok ? 'PASS' : '*** FAIL ***'}  ${k}`);
  console.log(`  fp 재현 ${fpOkAll}/${fpOkAll + fpBadAll} · 이상 그룹 ${manifest.metrics.groupsWithAnomalies} · writePlan KO ${koPlan} + EN ${enPlan} = ${koPlan + enPlan} (예상 ${exp.total})`);
  console.log(`  route: ${Object.entries(routeTally).map(([r, v]) => `${r} ${v.fp}fp/${v.master}m`).join(' · ')}`);
  console.log(`  manifest → ${outPath}`);
  if (anomaliesAll.length) console.log(`  ⚠ 이상 ${anomaliesAll.length}건`);
  if (failed.length) process.exitCode = 1;
}

async function emitSample(): Promise<void> {
  const shard = arg('shard');
  if (!shard) { console.error('--shard=ga|na|da 필요'); process.exit(2); }
  const perRoute = arg('per-route') ? parseInt(arg('per-route'), 10) : 2;
  const outPath = arg('out') || path.join(DATA_DIR, `otc-v2-recovery-samples.${shard}.json`);
  const sh = loadRecoveryShard(shard);
  const picked: V2Group[] = []; const seen: Record<string, number> = {};
  for (const g of sh.groups) { seen[g.route] = seen[g.route] || 0; if (seen[g.route] < perRoute) { picked.push(g); seen[g.route]++; } }

  const ds = await connect();
  const st = await fetchTargetState(ds, picked.map((g) => g.masterIds[0]));
  await ds.destroy();

  const out = picked.map((g) => {
    const mid = g.masterIds[0];
    const m = sh.byMaster.get(mid)!;
    const content = st.contentByMid.get(mid) || '';
    const ax = officialAxes(content);
    const ko = composeKo(ax, g.route, g.form, g.gencode, RECOVERY_ROUTE_PROFILE);
    return {
      fp: g.fp, gencode: g.gencode, suffix: m.suffix, route: g.route, size: g.size,
      fpReproduced: fingerprintV2(ax, g.gencode, g.route) === g.fp,
      approvedEvidence: m.evidence, evidenceSection: m.evidenceSection,
      official: { dosage: ax.dos, indication: ax.ind },
      composedKo: ko.source,
      check: {
        usageLabel: ko.source.usageLabel,
        enUsageLabel: RECOVERY_ROUTE_PROFILE[g.route].enUsageLabel,
        oralVerbInUsage: /복용|내복/.test(ko.source.usage),
        oralVerbInCaution: /복용|내복/.test(ko.source.caution),
        sitePatternInUsage: SITE_PATTERN[g.route].test(ko.source.usage),
        officialNumerics: numericTokens(ax.dos),
        missingNumerics: missingNumerics(ax.dos, ko.source.usage),
      },
      anomalies: ko.anomalies,
    };
  });
  fs.writeFileSync(outPath, JSON.stringify({ track: TRACK, shard, perRoute, samples: out }, null, 1) + '\n', 'utf8');
  console.log(`RECOVERY SAMPLES ${shard} — ${out.length}건`);
  for (const s of out) {
    console.log(`  ${s.route.padEnd(11)} ${s.suffix} ${s.fp} ${String(s.size).padStart(3)}m · fp재현 ${s.fpReproduced} · "${s.check.usageLabel}" · 경구동사 용법 ${s.check.oralVerbInUsage}/주의 ${s.check.oralVerbInCaution} · 부위표현 ${s.check.sitePatternInUsage} · 수치누락 ${s.check.missingNumerics.length} · 이상 ${s.anomalies.length}`);
  }
  console.log(`  → ${outPath}`);
}

async function applyReadiness(): Promise<void> {
  const shard = arg('shard');
  if (!shard) { console.error('--shard=ga|na|da 필요'); process.exit(2); }
  const mPath = path.join(DATA_DIR, `otc-v2-recovery-dryrun-manifest.${shard}.json`);
  if (!fs.existsSync(mPath)) { console.error(`dry-run manifest 부재: ${mPath} — 먼저 --dry-run 을 수행한다`); process.exit(2); }
  const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
  const blockers: string[] = Object.entries(m.gates).filter(([, ok]) => !ok).map(([k]) => k);
  const order = recoveryOrderBlockers(shard);
  blockers.push(...order);
  console.log(`RECOVERY APPLY-READINESS ${shard} — 적격 ${m.metrics.admittedGroups} fp / ${m.writePlan.total / 6} master`);
  console.log(`  dry-run 게이트 ${Object.values(m.gates).filter(Boolean).length}/${Object.keys(m.gates).length} PASS`);
  console.log(`  writePlan KO ${m.writePlan.ko_4T} + EN ${m.writePlan.en_2T} = ${m.writePlan.total} (예상 ${m.expectedWrite.total})`);
  if (order.length) for (const b of order) console.log(`  순서 차단: ${b}`);
  console.log(blockers.length === 0
    ? `READY — ${shard} 생산 착수 가능. 단, 본 WO 범위에서 LIVE apply 는 금지되어 있다(apply 경로 미구현).`
    : `NOT READY — 차단 ${blockers.length}건: ${blockers.join(' / ')}`);
  if (blockers.length) process.exitCode = 1;
}

async function main(): Promise<void> {
  if (process.argv.includes('--selftest')) { selfTest(); return; }
  const track = arg('track');
  if (track && track !== TRACK) { console.error(`--track 은 '${TRACK}' 만 지원한다 (받은 값: ${track})`); process.exit(2); }
  if (process.argv.includes('--emit-sample')) { await emitSample(); return; }
  if (process.argv.includes('--dry-run')) { await dryRun(); return; }
  if (process.argv.includes('--apply-readiness')) { await applyReadiness(); return; }
  console.error([
    '사용법 (track=external-site-recovery):',
    '  --selftest                                    오프라인 자기검증 (DB 미접속)',
    '  --track=external-site-recovery --shard=<s> --dry-run',
    '  --shard=<s> --emit-sample --per-route=<n>',
    '  --shard=<s> --apply-readiness',
    '  ※ 본 어댑터에 LIVE apply 경로는 없다 (DB write 0).',
  ].join('\n'));
  process.exit(2);
}

if (process.argv[1] && /otc-v2-external-site-recovery-adapter\./.test(process.argv[1])) {
  main().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
}
