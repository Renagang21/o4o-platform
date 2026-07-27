/**
 * WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-253-FINAL-READINESS-V1 — 점안 ophthalmic-unit-1 생산 실행기 (write-owner agent-ga)
 *
 * ⚠️ 본 WO 범위: **dry-run · rollback 시험까지만.** LIVE DB write 는 하지 않는다.
 *    apply 경로는 write-owner 인계 직후 즉시 실행 가능하도록 **3중 게이트**로만 열린다.
 *      1) --apply 플래그
 *      2) 확인 env  (OTC_OPH_U1_KO_CONFIRM / OTC_OPH_U1_EN_CONFIRM = YES)
 *      3) 인계 env  (OTC_OPH_U1_HANDOFF = topical-unit-1-GREEN)  ← 선행 unit GREEN 인계 잠금
 *
 * ── 기준 (승인 commit 0b7b25447) ─────────────────────────────────────────────────
 *   승인 SSOT   otc-easy-drug-ready-1134-approved-for-production-ssot-v1.json (본 실행기는 읽지 않음)
 *   unit 원장   otc-easy-drug-ready-1134-unit-ledger-v1.json                  (본 실행기는 읽지 않음)
 *   실행순서    otc-easy-drug-ready-1134-execution-order-v1.json               ← **읽기 전용** preflight
 *   본 유닛 입력  otc-easy-drug-ready-ophthalmic-253-approved-ssot-v1.json      (ssot-build 산출 · md5 freeze)
 *              otc-easy-drug-ready-ophthalmic-253-en-config-v1.json           (EN 저작 12건 · md5 freeze)
 *
 * ── 지문 계약 ────────────────────────────────────────────────────────────────────
 *   fp        = 일반명코드(gencode) · READY master 당 유일 · 같은 gencode = 하나의 authored 설명서
 *   sourceRef = fpToUuidV2(gencode)                                          ← 공용 함수 그대로
 *   10축 안전축은 grouping 아님. gencode 내부 정량 동질성 가드(방울 수)로만 사용.
 *
 * ── write 계약 (master 당 6T) ────────────────────────────────────────────────────
 *   KO 4T: easy_drug ko canonical → deprecated / authored ko INSERT(needs_review) / canonical flip / audit
 *   EN 2T: authored en INSERT(needs_review) / canonical flip
 *   INSERT-only · 단일 트랜잭션 · 커밋 전 사후검증 → 실패 시 전량 rollback.
 *   점안 12 fp / 253 master → KO 1,012T + EN 506T = 1,518T.
 *   AUTHORED_SOURCE = 'mfds_drug_otc'.
 *
 * ── KO/EN 렌더 정책 ──────────────────────────────────────────────────────────────
 *   KO 는 **master 별**로 자기 자신의 공식 원문에서 composeKo 한다(대표 1건 복제 아님).
 *     같은 gencode 라도 brand 별 주의 문구(병용 간격·보관·오염 주의)가 달라 각 master 원문을 보존한다.
 *   EN 은 gencode 당 1건(공식 원문 grounding). 단, **그룹의 모든 master** 공식 용법·주의에 대해
 *     방울 수·1일 횟수·간격·기간·연령·한쪽/양쪽 눈·콘택트렌즈·용기 끝 접촉·다른 점안제 간격 축을
 *     per-master 로 검증하여 단일 EN 이 전 master 를 커버함을 보장한다.
 *
 * ── 공용 파일 무수정 계약 ────────────────────────────────────────────────────────
 *   otc-v2-store-leaflet-runner.shared.ts / otc-unproduced-nonoral-unit2-ophthalmic-profile.ga.ts
 *   / otc-unproduced-nonoral-unit2-ophthalmic-production.ga.ts 는 **import 만** 한다. 수정 0.
 *
 * 결정론: 타임스탬프 미포함 · 배열 정렬 · dry-run 2회 byte-identical.
 *
 * Usage(apps/api-server):
 *   DB_PORT=5455 ../../node_modules/.bin/tsx src/scripts/otc-easy-drug-ready-ophthalmic-253-production.ga.ts --mode=dry-run
 *   DB_PORT=5455 ../../node_modules/.bin/tsx ... --rollback-test
 *   # 인계 후에만 (3중 게이트):
 *   OTC_OPH_U1_HANDOFF=topical-unit-1-GREEN OTC_OPH_U1_KO_CONFIRM=YES DB_PORT=5455 tsx ... --mode=apply --lang=ko --apply
 *   OTC_OPH_U1_HANDOFF=topical-unit-1-GREEN OTC_OPH_U1_EN_CONFIRM=YES DB_PORT=5455 tsx ... --mode=apply --lang=en --apply
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  AUTHORED_SOURCES,
  composeKo,
  fpToUuidV2,
  missingNumerics,
  officialAxes,
  renderEn,
  resolveRoute,
} from './otc-v2-store-leaflet-runner.shared.js';
import {
  OPHTHALMIC_PROFILE,
  OPHTHALMIC_ROUTE,
  OPHTHALMIC_SUFFIXES,
  hasOphthalmicRouteEn,
  missingDropCountsEn,
  missingEyeSideEn,
  missingEyeCautionEn,
  oralVerbsEn,
} from './otc-unproduced-nonoral-unit2-ophthalmic-profile.ga.js';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];

const WO = 'WO-O4O-OTC-EASY-DRUG-READY-OPHTHALMIC-253-FINAL-READINESS-V1';
const UNIT = 'ophthalmic-unit-1';
const AUTHORED_SOURCE = 'mfds_drug_otc';
const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const SSOT = path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-approved-ssot-v1.json');
const EN_PATH = path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-en-config-v1.json');
const ORDER_LEDGER = path.join(DATA_DIR, 'otc-easy-drug-ready-1134-execution-order-v1.json');
const OUT_MANIFEST = arg('out') || path.join(DATA_DIR, 'otc-easy-drug-ready-ophthalmic-253-dryrun-manifest-v1.json');
const EXPECTED = { fp: 12, master: 253, ko: 1012, en: 506, write: 1518 };
const APPROVAL_COMMIT = '0b7b25447';
/** 입력 해시 freeze — 변경 시 즉시 중지(preflight). */
const SSOT_MD5 = '0bf40362b6340e1b1b005ac0f3f2b3bc';
const EN_MD5 = 'd13e39f3de522b9cdea06f29aa4c7c8b';

interface SsotGroup {
  fp: string; gencode: string; suffix: string; route: string; form: string;
  size: number; sourceRef: string; masterIds: string[];
  dropCounts: string[]; dropCountHomogeneous: boolean; fullAxisHomogeneous: boolean;
}
interface EnEntry { fp: string; title: string; efficacy: string; usage: string; caution: string; summaryTable: Record<string, string> }

/** .env 의 DB_PASSWORD 원문(IAM 인증에선 빈 값이어도 무해). 값은 로그로 출력하지 않는다. */
function readPw(): string {
  try {
    const env = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
    const m = env.match(/^DB_PASSWORD=(.*)$/m);
    return m ? m[1].trim() : '';
  } catch { return ''; }
}

function loadSsot(): { groups: SsotGroup[]; raw: any } {
  const j = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
  if (j.status !== 'APPROVED_FOR_PRODUCTION') throw new Error(`SSOT status=${j.status}`);
  if (j.unitId !== UNIT) throw new Error(`SSOT unitId=${j.unitId} != ${UNIT}`);
  if (j.totals.fingerprints !== EXPECTED.fp || j.totals.masters !== EXPECTED.master) {
    throw new Error(`총계 ${j.totals.fingerprints}/${j.totals.masters} != ${EXPECTED.fp}/${EXPECTED.master}`);
  }
  if (j.writePlan.ko !== EXPECTED.ko || j.writePlan.en !== EXPECTED.en || j.writePlan.total !== EXPECTED.write) {
    throw new Error(`writePlan 불일치 ${JSON.stringify(j.writePlan)}`);
  }
  const groups: SsotGroup[] = (j.groups as SsotGroup[])
    .map((g) => ({ ...g, masterIds: [...g.masterIds].sort() }))
    .sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));
  return { groups, raw: j };
}

function loadEn(): Map<string, EnEntry> {
  const cfg = JSON.parse(fs.readFileSync(arg('en-config') || EN_PATH, 'utf8')) as { groups: EnEntry[] };
  const m = new Map<string, EnEntry>();
  for (const e of cfg.groups) m.set(e.fp, e);
  return m;
}

async function connect(): Promise<any> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5455', 10),
    username: process.env.DB_USERNAME || 'o4o_api', password: process.env.DB_PASSWORD || readPw(),
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 1800000 },
  });
  await ds.initialize();
  return ds;
}

/** master 자기 공식 원문 → KO 소비자 HTML. 제품명 미개입 · 점안 전용 프로파일. */
function buildKoFor(content: string, g: SsotGroup): { html: string; summary: string | null; usageLabel: string; anomalies: string[] } {
  const ax = officialAxes(content);
  const ko = composeKo(ax, OPHTHALMIC_ROUTE, g.form, g.gencode, OPHTHALMIC_PROFILE);
  const anomalies = [...ko.anomalies];
  if (missingNumerics(ax.dos, ko.source.usage).length) anomalies.push('KO 용법 수치 누락');
  const built = buildDrugOtcConsumerHtml(ko.source as never, { title: `${g.form} (${g.gencode})` });
  if (built.missing.length) anomalies.push(`KO 필수필드 누락 ${built.missing.join(',')}`);
  const dosN = ax.dos.replace(/<[^>]+>/g, ' ');
  if (/(복용|내복|경구|삼키)/.test(dosN) && !/(점안|눈|안구|결막|눈꺼풀)/.test(dosN)) anomalies.push('효능·용법 경로 충돌');
  return { html: built.html, summary: ko.source.summaryTable['작용'] ?? null, usageLabel: ko.source.usageLabel, anomalies };
}

interface KoMaster { mid: string; html: string; summary: string | null; anomalies: string[]; officialDosage: string; officialCaution: string }
interface GState {
  g: SsotGroup; anomalies: string[]; easy1: number; authoredKo: number; enCanon: number;
  koByMaster: Map<string, KoMaster>; repDosage: string; enOk: boolean; enAxisReport: any;
}

async function prepare(ds: any): Promise<{ states: GState[]; allIds: string[]; canonicalDup: number; refHit: number; enByFp: Map<string, EnEntry> }> {
  const { groups } = loadSsot();
  const enByFp = loadEn();
  const allIds = [...new Set(groups.flatMap((g) => g.masterIds))].sort();

  // 모든 master 공식 원문(easy_drug ko canonical/deprecated) — KO per-master 구성 + EN per-master 축 검증.
  const content = retRows<{ id: string; content: string }>(await ds.query(`
    SELECT pop.id, es.content FROM (SELECT unnest($1::uuid[])::text id) pop
    JOIN LATERAL (SELECT content FROM shared_product_descriptions s
      WHERE s.master_id=pop.id::uuid AND s.source_type='mfds_easy_drug' AND s.description_type='STORE'
        AND s.status IN ('canonical','deprecated') AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true`, [allIds]));
  const contentByMid = new Map(content.map((r) => [r.id, r.content]));

  const slots = retRows<{ mid: string; easy1: string; authored: string; encanon: string }>(await ds.query(`
    SELECT m.mid::text mid,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.source_type='mfds_easy_drug'
        AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)::text easy1,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND COALESCE(s.language,'ko')='ko' AND s.status IN ('canonical','needs_review') AND s.source_type=ANY($2) AND s.deleted_at IS NULL)::text authored,
      (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=m.mid AND s.description_type='STORE'
        AND s.status='canonical' AND s.language='en' AND s.deleted_at IS NULL)::text encanon
    FROM unnest($1::uuid[]) m(mid) ORDER BY 1`, [allIds, AUTHORED_SOURCES]));
  const slotBy = new Map(slots.map((r) => [r.mid, r]));

  const dup = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM (
      SELECT master_id, COALESCE(language,'ko') l, count(*) c FROM shared_product_descriptions
      WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1,2 HAVING count(*)>1) d`, [allIds]));

  const refs = groups.map((g) => fpToUuidV2(g.fp)).sort();
  const refHit = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [refs]));

  const states: GState[] = groups.map((g) => {
    const anomalies: string[] = [];
    // route 재해석 (제품명 미사용)
    const rr = resolveRoute(g.gencode);
    if (!rr.ok || rr.route !== OPHTHALMIC_ROUTE) anomalies.push(`route 상충 ${rr.ok ? rr.route : rr.reason}`);
    if (rr.ok && rr.form !== g.form) anomalies.push(`form 상충 ${rr.form} vs ${g.form}`);
    const suffix = String(g.gencode).slice(6, 9).toUpperCase();
    if (!(OPHTHALMIC_SUFFIXES as readonly string[]).includes(suffix)) anomalies.push(`점안 접미 아님(${suffix})`);
    if (fpToUuidV2(g.fp) !== g.sourceRef) anomalies.push('sourceRef 앵커 불일치');

    // ── KO: master 별 자기 원문에서 구성 ─────────────────────────────────────────
    const koByMaster = new Map<string, KoMaster>();
    for (const mid of g.masterIds) {
      const c = contentByMid.get(mid);
      if (!c) { anomalies.push(`공식 원문 부재 ${mid}`); continue; }
      const ax = officialAxes(c);
      if (!ax.ind || !ax.ind.trim()) anomalies.push(`효능 공란 ${mid}`);
      if (!ax.dos || !ax.dos.trim()) anomalies.push(`용법 공란 ${mid}`);
      const ko = buildKoFor(c, g);
      koByMaster.set(mid, { mid, html: ko.html, summary: ko.summary, anomalies: ko.anomalies, officialDosage: ax.dos, officialCaution: ax.cau });
      if (ko.anomalies.length) anomalies.push(...ko.anomalies.map((a) => `[${mid.slice(0, 8)}] ${a}`));
    }
    const rep = koByMaster.get(g.masterIds[0]);
    const repDosage = rep?.officialDosage ?? '';

    // ── EN: gencode 당 1건. 그룹의 모든 master 공식 원문에 대해 per-master 축 검증. ──
    const e = enByFp.get(g.fp);
    let enOk = false;
    const enAxisReport: any = { fp: g.fp, perMasterChecked: 0, dropMissing: [], eyeSideMissing: [], eyeCautionMissing: [], oralVerbs: [], routeOk: false, renderAnomalies: [] };
    if (!e) anomalies.push('EN 저작 페이로드 부재');
    else {
      const en = renderEn({ groupKey: g.fp, title: e.title, efficacy: e.efficacy, usage: e.usage, caution: e.caution, summaryTable: e.summaryTable },
        OPHTHALMIC_ROUTE, repDosage, OPHTHALMIC_PROFILE);
      const enAll = [e.title, e.efficacy, e.usage, e.caution, ...Object.entries(e.summaryTable || {}).flat()].join('\n');
      const enText = [e.usage, e.caution].join('\n');
      const oral = oralVerbsEn(enAll);
      const routeOk = hasOphthalmicRouteEn(e.usage);
      enAxisReport.renderAnomalies = en.anomalies;
      enAxisReport.oralVerbs = oral;
      enAxisReport.routeOk = routeOk;
      if (en.anomalies.length) anomalies.push(...en.anomalies.map((a) => `EN ${a}`));
      if (oral.length) anomalies.push(`EN 경구 동사 ${oral.length}`);
      if (!routeOk) anomalies.push('EN 점안 경로 표현 없음');
      // per-master 축 검증 — 단일 EN 이 전 master 를 커버해야 한다.
      for (const mid of g.masterIds) {
        const km = koByMaster.get(mid);
        if (!km) continue;
        enAxisReport.perMasterChecked++;
        const drops = missingDropCountsEn(km.officialDosage, e.usage);
        const side = missingEyeSideEn(km.officialDosage, e.usage);
        const cau = missingEyeCautionEn(km.officialCaution, enText);
        if (drops.length) { enAxisReport.dropMissing.push({ mid, drops }); anomalies.push(`EN 방울 수 누락 [${mid.slice(0, 8)}] ${drops.join(',')}`); }
        if (side.missing.length) { enAxisReport.eyeSideMissing.push({ mid, missing: side.missing }); anomalies.push(`EN 눈 방향 축 누락 [${mid.slice(0, 8)}] ${side.missing.join(',')}`); }
        if (cau.missing.length) { enAxisReport.eyeCautionMissing.push({ mid, missing: cau.missing }); anomalies.push(`EN 점안 주의 축 누락 [${mid.slice(0, 8)}] ${cau.missing.join(',')}`); }
      }
      enOk = en.anomalies.length === 0 && oral.length === 0 && routeOk && !!en.html
        && enAxisReport.dropMissing.length === 0 && enAxisReport.eyeSideMissing.length === 0 && enAxisReport.eyeCautionMissing.length === 0;
    }

    // 슬롯 상태
    let easy1 = 0, authoredKo = 0, enCanon = 0;
    for (const mid of g.masterIds) {
      const s = slotBy.get(mid);
      if (!s) { anomalies.push(`슬롯 조회 실패 ${mid}`); continue; }
      easy1 += +s.easy1 === 1 ? 1 : 0;
      authoredKo += +s.authored;
      enCanon += +s.encanon;
    }
    if (easy1 !== g.size) anomalies.push(`easy ko canonical 1건 아님 ${g.size - easy1}`);
    if (authoredKo) anomalies.push(`authored ko 기존 보유 ${authoredKo}`);
    if (enCanon) anomalies.push(`en canonical 기존 보유 ${enCanon}`);

    return { g, anomalies, easy1, authoredKo, enCanon, koByMaster, repDosage, enOk, enAxisReport };
  });

  return { states, allIds, canonicalDup: +dup[0].n, refHit: +refHit[0].n, enByFp };
}

function gatesOf(states: GState[], allIds: string[], canonicalDup: number, refHit: number, enByFp: Map<string, EnEntry>, stage: 'dry-run' | 'ko' | 'en' = 'dry-run'): Record<string, boolean> {
  const masterSum = states.reduce((a, s) => a + s.g.size, 0);
  const koComplete = states.every((s) => s.koByMaster.size === s.g.size && [...s.koByMaster.values()].every((k) => k.anomalies.length === 0));
  if (stage === 'en') {
    return {
      'G1 SSOT status·수량 일치 (12fp/253m)': states.length === EXPECTED.fp && allIds.length === EXPECTED.master && masterSum === EXPECTED.master,
      'G2 fp 재현 100% (SSOT 앵커 일치)': states.every((s) => fpToUuidV2(s.g.fp) === s.g.sourceRef),
      'G3 route·form·경로 mismatch 0': states.every((s) => !s.anomalies.some((a) => /route 상충|form 상충|경로 충돌|점안 접미 아님|KO 용법 수치 누락/.test(a))),
      'G4 EN 12/12 매칭·per-master 축 통과': states.every((s) => enByFp.has(s.g.fp) && s.enOk) && enByFp.size === EXPECTED.fp,
      'G5 KO authored canonical 253 (본 트랙 앵커)': states.every((s) => s.authoredKo === s.g.size) && refHit === EXPECTED.master,
      'G6 EN canonical 기존 0': states.every((s) => s.enCanon === 0),
      'G7 HOLD 혼입 0 (route=ophthalmic)': states.every((s) => s.g.route === OPHTHALMIC_ROUTE),
      'G8 canonicalDup 0': canonicalDup === 0,
      'G9 예상 EN write 506T': masterSum * 2 === EXPECTED.en,
      'G10 easy canonical 잔존 0': states.every((s) => s.easy1 === 0),
      'G11 EN 게이트(한글·경구동사·방울/눈축) 0': states.every((s) => !s.anomalies.some((a) => /^EN /.test(a))),
      'G12 write-owner agent-ga 단독': true,
    };
  }
  return {
    'G1 SSOT status·수량 일치 (12fp/253m)': states.length === EXPECTED.fp && allIds.length === EXPECTED.master && masterSum === EXPECTED.master,
    'G2 fp 재현 100% (SSOT 앵커 일치)': states.every((s) => fpToUuidV2(s.g.fp) === s.g.sourceRef),
    'G3 route·form·경로 mismatch 0': states.every((s) => !s.anomalies.some((a) => /route 상충|form 상충|경로 충돌|점안 접미 아님|KO 용법 수치 누락|효능 공란|용법 공란/.test(a))),
    'G4 EN 12/12 매칭·per-master 축 통과': states.every((s) => enByFp.has(s.g.fp) && s.enOk) && enByFp.size === EXPECTED.fp,
    'G5 기존 LIVE 교집합 0 (sourceRef)': refHit === 0,
    'G6 authored canonical 0 (ko/en)': states.every((s) => s.authoredKo === 0 && s.enCanon === 0),
    'G7 HOLD 혼입 0 (route=ophthalmic)': states.every((s) => s.g.route === OPHTHALMIC_ROUTE),
    'G8 canonicalDup 0': canonicalDup === 0,
    'G9 예상 write 1518T': masterSum * 6 === EXPECTED.write,
    'G10 이상 0': states.every((s) => s.anomalies.length === 0),
    'G11 easy ko canonical 슬롯 1건·KO 전 master 구성 완료': states.every((s) => s.easy1 === s.g.size) && koComplete,
    'G12 DB write 0': true,
  };
}

async function runDryRun(): Promise<void> {
  const ds = await connect();
  let out: any;
  try {
    const { states, allIds, canonicalDup, refHit, enByFp } = await prepare(ds);
    const gates = gatesOf(states, allIds, canonicalDup, refHit, enByFp);
    const masterSum = states.reduce((a, s) => a + s.g.size, 0);
    out = {
      wo: WO, agent: 'ga', unitId: UNIT, mode: 'dry-run', readOnly: true, dbWrite: 0, apply: 'NOT_PERFORMED',
      approvalCommit: APPROVAL_COMMIT,
      inputs: { ssot: path.basename(SSOT), ssotMd5: SSOT_MD5, enConfig: path.basename(EN_PATH), enMd5: EN_MD5 },
      routeContract: { route: OPHTHALMIC_ROUTE, koUsageLabel: OPHTHALMIC_PROFILE[OPHTHALMIC_ROUTE].koUsageLabel,
        enUsageLabel: OPHTHALMIC_PROFILE[OPHTHALMIC_ROUTE].enUsageLabel, sharedRunnerModified: false, profileModuleModified: false },
      totals: { fingerprints: states.length, masters: allIds.length },
      writePlan: { ko: masterSum * 4, en: masterSum * 2, total: masterSum * 6 },
      canonicalDup, liveSourceRefIntersection: refHit,
      preState: {
        authoredKoCanonical: states.reduce((a, s) => a + s.authoredKo, 0),
        enCanonical: states.reduce((a, s) => a + s.enCanon, 0),
        sourceRefConflict: refHit, canonicalDup,
        easyKoCanonical: states.reduce((a, s) => a + s.easy1, 0),
      },
      gates,
      allGatesPass: Object.values(gates).every(Boolean),
      groups: states.map((s) => ({
        fp: s.g.fp, gencode: s.g.gencode, form: s.g.form, size: s.g.size, sourceRef: s.g.sourceRef,
        dropCounts: s.g.dropCounts, fullAxisHomogeneous: s.g.fullAxisHomogeneous,
        easyKoCanonical: s.easy1, authoredKo: s.authoredKo, enCanonical: s.enCanon,
        koHtmlMd5ByMaster: Object.fromEntries([...s.koByMaster.entries()].sort().map(([mid, k]) => [mid, md5(k.html)])),
        koHtmlLenTotal: [...s.koByMaster.values()].reduce((a, k) => a + k.html.length, 0),
        enOk: s.enOk, enAxis: s.enAxisReport, anomalies: s.anomalies,
      })),
      anomalies: states.filter((s) => s.anomalies.length).map((s) => `[${s.g.fp}] ${s.anomalies.join(' | ')}`),
    };
    fs.writeFileSync(OUT_MANIFEST, JSON.stringify(out, null, 1) + '\n', 'utf8');
    console.log(`OPH-U1 DRY-RUN — fp ${states.length}/${EXPECTED.fp} · master ${allIds.length}/${EXPECTED.master}`);
    for (const [k, v] of Object.entries(gates)) console.log(`  ${v ? 'PASS' : '*** FAIL ***'}  ${k}`);
    console.log(`  writePlan KO ${masterSum * 4} + EN ${masterSum * 2} = ${masterSum * 6} (예상 ${EXPECTED.write}) · dbWrite 0`);
    console.log(`  preState authoredKo ${out.preState.authoredKoCanonical} · enCanon ${out.preState.enCanonical} · sourceRefConflict ${out.preState.sourceRefConflict} · canonicalDup ${out.preState.canonicalDup}`);
    console.log(`  manifest → ${OUT_MANIFEST}`);
    if (!out.allGatesPass) process.exitCode = 1;
  } finally {
    await ds.destroy();
  }
}

/** rollback 시험 — 실제 write 계약(KO 4T + EN 2T)을 표본 transaction 안에서 수행하고, 사후검증 후 무조건 rollback. 순 DB write 0. */
async function runRollbackTest(): Promise<void> {
  const ds = await connect();
  const { states } = await prepare(ds);
  const probe = states.slice().sort((a, b) => a.g.size - b.g.size).slice(0, 2); // 최소 그룹 2개로 표본
  const ids = probe.flatMap((s) => s.g.masterIds).sort();

  const snap = async (): Promise<{ total: string; easy: string; authored: string; en: string }> => {
    const r = retRows<{ total: string; easy: string; authored: string; en: string }>(await ds.query(`
      SELECT count(*)::text total,
        count(*) FILTER (WHERE source_type='mfds_easy_drug' AND status='canonical' AND description_type='STORE' AND COALESCE(language,'ko')='ko')::text easy,
        count(*) FILTER (WHERE source_type=$2 AND status='canonical' AND description_type='STORE' AND COALESCE(language,'ko')='ko')::text authored,
        count(*) FILTER (WHERE status='canonical' AND description_type='STORE' AND language='en')::text en
      FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [ids, AUTHORED_SOURCE]));
    return r[0];
  };
  const before = await snap();

  const enByFp = loadEn();
  const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
  let koT = 0, enT = 0; let postVerify = 'NOT_RUN'; let injected = '';
  try {
    for (const s of probe) {
      const e = enByFp.get(s.g.fp)!;
      const en = renderEn({ groupKey: s.g.fp, title: e.title, efficacy: e.efficacy, usage: e.usage,
        caution: e.caution, summaryTable: e.summaryTable }, OPHTHALMIC_ROUTE, s.repDosage, OPHTHALMIC_PROFILE);
      if (en.anomalies.length) throw new Error(`fp ${s.g.fp} EN 검증 실패: ${en.anomalies.join('; ')}`);
      for (const mid of s.g.masterIds) {
        const km = s.koByMaster.get(mid)!;
        // KO 4T — demote / insert / flip / audit (per-master html)
        const cur = retRows<{ id: string; source_type: string }>(await qr.query(
          `SELECT id::text id, source_type FROM shared_product_descriptions WHERE master_id=$1::uuid
            AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [mid]));
        if (cur.length !== 1) throw new Error(`master ${mid} ko canonical ${cur.length}건`);
        if (cur[0].source_type !== 'mfds_easy_drug') throw new Error(`master ${mid} source ${cur[0].source_type} 예상밖`);
        const easyId = cur[0].id;
        if (retRows(await qr.query(`UPDATE shared_product_descriptions SET status='deprecated', updated_at=now() WHERE id=$1::uuid AND status='canonical' RETURNING id`, [easyId])).length !== 1) throw new Error(`${mid} demote 실패`);
        koT++;
        const row = retRows<{ id: string }>(await qr.query(
          `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           VALUES ($1::uuid,$2,$3,$4,$5::uuid,'needs_review','ko','STORE',now(),now()) RETURNING id::text`,
          [mid, km.html, km.summary, AUTHORED_SOURCE, s.g.sourceRef]));
        if (row.length !== 1) throw new Error(`${mid} ko INSERT 실패`);
        koT++;
        if (retRows(await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE id=$1::uuid AND status='needs_review' RETURNING id`, [row[0].id])).length !== 1) throw new Error(`${mid} ko flip 실패`);
        koT++;
        await qr.query(`INSERT INTO shared_product_description_audit_logs (event_type, description_type, master_id, language, previous_description_id, new_description_id, previous_status, new_status, metadata, performed_at)
          VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb,now())`,
          [mid, easyId, row[0].id, JSON.stringify({ previousDemotedTo: 'deprecated', previousSource: 'mfds_easy_drug',
            newSource: AUTHORED_SOURCE, source_ref_id: s.g.sourceRef, fp: s.g.fp, gencode: s.g.gencode, route: OPHTHALMIC_ROUTE, unit: UNIT, wo: WO })]);
        koT++;
        // EN 2T — insert / flip
        const enRow = retRows<{ id: string }>(await qr.query(
          `INSERT INTO shared_product_descriptions (master_id, content, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           VALUES ($1::uuid,$2,$3,$4::uuid,'needs_review','en','STORE',now(),now()) RETURNING id::text`,
          [mid, en.html, AUTHORED_SOURCE, s.g.sourceRef]));
        if (enRow.length !== 1) throw new Error(`${mid} en INSERT 실패`);
        enT++;
        if (retRows(await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE id=$1::uuid AND status='needs_review' RETURNING id`, [enRow[0].id])).length !== 1) throw new Error(`${mid} en flip 실패`);
        enT++;
      }
    }
    const probeM = probe.reduce((a, s) => a + s.g.size, 0);
    if (koT !== probeM * 4) throw new Error(`KO ${koT} != ${probeM * 4}`);
    if (enT !== probeM * 2) throw new Error(`EN ${enT} != ${probeM * 2}`);
    const inTx = retRows<{ authored: string; en: string; easyCanon: string }>(await qr.query(`
      SELECT count(*) FILTER (WHERE source_type=$2 AND status='canonical' AND COALESCE(language,'ko')='ko' AND description_type='STORE')::text authored,
             count(*) FILTER (WHERE source_type=$2 AND status='canonical' AND language='en' AND description_type='STORE')::text en,
             count(*) FILTER (WHERE source_type='mfds_easy_drug' AND status='canonical' AND description_type='STORE')::text "easyCanon"
      FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [ids, AUTHORED_SOURCE]));
    if (+inTx[0].authored !== probeM) throw new Error(`tx내 authored ko ${inTx[0].authored} != ${probeM}`);
    if (+inTx[0].en !== probeM) throw new Error(`tx내 en canonical ${inTx[0].en} != ${probeM}`);
    if (+inTx[0].easyCanon !== 0) throw new Error(`tx내 easy canonical 잔존 ${inTx[0].easyCanon}`);
    postVerify = `PASS (authored ko ${inTx[0].authored} · en ${inTx[0].en} · easy canonical ${inTx[0].easyCanon})`;
    injected = 'ROLLBACK TEST — 사후검증 통과 후 무조건 rollback';
    throw new Error(injected);
  } catch (e) {
    injected = injected || (e as Error).message;
    await qr.rollbackTransaction(); await qr.release();
    const after = await snap();
    await ds.destroy();
    const unchanged = before.total === after.total && before.easy === after.easy
      && before.authored === after.authored && before.en === after.en;
    const ok = unchanged && postVerify.startsWith('PASS');
    console.log(`OPH-U1 ROLLBACK TEST — 표본 ${probe.length}fp/${ids.length}m · 시도 write KO ${koT} + EN ${enT} = ${koT + enT}T`);
    console.log(`  커밋 전 사후검증: ${postVerify}`);
    console.log(`  before total ${before.total} easy ${before.easy} authored ${before.authored} en ${before.en}`);
    console.log(`  after  total ${after.total} easy ${after.easy} authored ${after.authored} en ${after.en}`);
    console.log(`  rollback 사유: ${injected}`);
    console.log(`  판정: ${ok ? 'PASS (전량 rollback · easy/authored canonical 불변 · 순 DB write 0)' : '*** FAIL ***'}`);
    if (!ok) process.exitCode = 1;
  }
}

/** 선행 게이트 — 실행순서 원장 상태 + 입력 해시 불변 + 인계 잠금. 원장은 읽기만 한다(수정 0). */
function preflightGates(lang: 'ko' | 'en'): Record<string, boolean> {
  const ledger = JSON.parse(fs.readFileSync(ORDER_LEDGER, 'utf8'));
  const seq: any[] = ledger.executionSequence || [];
  const mine = seq.find((u) => u.unit === UNIT);
  const predecessor = seq.find((u) => u.step === (mine?.step ?? 0) - 1);
  const handoff = process.env.OTC_OPH_U1_HANDOFF || '';
  return {
    'P1 실행순서 원장에 ophthalmic-unit-1 존재·APPROVED': mine?.status === 'APPROVED' && mine?.writeOwner === 'agent-ga' && mine?.expectedWrite === EXPECTED.write,
    'P2 선행 unit(topical-unit-1) GREEN 인계 env': predecessor?.unit === 'topical-unit-1' && handoff === 'topical-unit-1-GREEN',
    'P3 승인 SSOT md5 불변': md5(fs.readFileSync(SSOT, 'utf8')) === SSOT_MD5,
    'P4 EN JSON md5 불변': md5(fs.readFileSync(EN_PATH, 'utf8')) === EN_MD5,
    'P5 .env 존재': fs.existsSync(path.resolve(process.cwd(), '.env')),
  };
}

async function runApply(): Promise<void> {
  const lang = arg('lang');
  if (lang !== 'ko' && lang !== 'en') { console.error('--lang=ko|en'); process.exit(2); }
  const confirmEnv = lang === 'ko' ? 'OTC_OPH_U1_KO_CONFIRM' : 'OTC_OPH_U1_EN_CONFIRM';

  const pre = preflightGates(lang);
  console.log(`OPH-U1 APPLY ${lang} — write-owner agent-ga`);
  for (const [k, v] of Object.entries(pre)) console.log(`  ${v ? 'PASS' : '*** FAIL ***'}  ${k}`);
  const preBlock = Object.entries(pre).filter(([, v]) => !v).map(([k]) => k);
  if (preBlock.length) throw new Error(`선행 게이트 차단 ${preBlock.length}건 → 중지: ${preBlock.join(' / ')}`);

  const ds = await connect();
  const { states, allIds, canonicalDup, refHit, enByFp } = await prepare(ds);
  const gates = gatesOf(states, allIds, canonicalDup, refHit, enByFp, lang);
  for (const [k, v] of Object.entries(gates)) console.log(`  ${v ? 'PASS' : '*** FAIL ***'}  ${k}`);
  const blockers = Object.entries(gates).filter(([, v]) => !v).map(([k]) => k);
  if (blockers.length) { await ds.destroy(); throw new Error(`게이트 차단 ${blockers.length}건 → 중지: ${blockers.slice(0, 5).join(' / ')}`); }
  // ── 3중 게이트: --apply + 확인 env + 인계 env(preflight P2 에서 이미 검증) ──
  if (!process.argv.includes('--apply') || process.env[confirmEnv] !== 'YES') {
    await ds.destroy();
    console.log(`이중 게이트 미충족 — apply 하지 않았다. 필요: --apply 와 ${confirmEnv}=YES (+ 인계 env). dbWrite 0.`);
    return;
  }

  const refs = states.map((s) => s.g.sourceRef).sort();
  const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
  let total = 0; const per: any[] = [];
  let post: Record<string, number> = {};
  try {
    for (const s of states) {
      const ref = s.g.sourceRef;
      if (lang === 'ko') {
        let dep = 0, ins = 0, flip = 0, aud = 0;
        for (const mid of s.g.masterIds) {
          const km = s.koByMaster.get(mid)!;
          const cur = retRows<{ id: string; source_type: string }>(await qr.query(
            `SELECT id::text id, source_type FROM shared_product_descriptions WHERE master_id=$1::uuid
              AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [mid]));
          if (cur.length !== 1) throw new Error(`master ${mid} ko canonical ${cur.length}건 → ROLLBACK`);
          if (cur[0].source_type !== 'mfds_easy_drug') throw new Error(`master ${mid} source ${cur[0].source_type} 예상밖 → ROLLBACK`);
          const easyId = cur[0].id;
          if (retRows(await qr.query(`UPDATE shared_product_descriptions SET status='deprecated', updated_at=now() WHERE id=$1::uuid AND status='canonical' RETURNING id`, [easyId])).length !== 1) throw new Error(`${mid} demote 실패`);
          dep++;
          const row = retRows<{ id: string }>(await qr.query(
            `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
             VALUES ($1::uuid,$2,$3,$4,$5::uuid,'needs_review','ko','STORE',now(),now()) RETURNING id::text`,
            [mid, km.html, km.summary, AUTHORED_SOURCE, ref]));
          if (row.length !== 1) throw new Error(`${mid} ko INSERT 실패`);
          ins++;
          if (retRows(await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE id=$1::uuid AND status='needs_review' RETURNING id`, [row[0].id])).length !== 1) throw new Error(`${mid} ko flip 실패`);
          flip++;
          await qr.query(`INSERT INTO shared_product_description_audit_logs (event_type, description_type, master_id, language, previous_description_id, new_description_id, previous_status, new_status, metadata, performed_at)
            VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb,now())`,
            [mid, easyId, row[0].id, JSON.stringify({ previousDemotedTo: 'deprecated', previousSource: 'mfds_easy_drug',
              newSource: AUTHORED_SOURCE, source_ref_id: ref, fp: s.g.fp, gencode: s.g.gencode, route: OPHTHALMIC_ROUTE, unit: UNIT, wo: WO })]);
          aud++;
        }
        const t = dep + ins + flip + aud;
        if (t !== s.g.size * 4) throw new Error(`fp ${s.g.fp} KO ${t} != ${s.g.size * 4} → ROLLBACK`);
        total += t; per.push({ fp: s.g.fp, size: s.g.size, deprecated: dep, inserted: ins, flipped: flip, audited: aud, t });
      } else {
        const e = enByFp.get(s.g.fp)!;
        const en = renderEn({ groupKey: s.g.fp, title: e.title, efficacy: e.efficacy, usage: e.usage,
          caution: e.caution, summaryTable: e.summaryTable }, OPHTHALMIC_ROUTE, s.repDosage, OPHTHALMIC_PROFILE);
        if (en.anomalies.length) throw new Error(`fp ${s.g.fp} EN 검증 실패: ${en.anomalies.join('; ')} → 중지`);
        const enAll = [e.title, e.efficacy, e.usage, e.caution, ...Object.entries(e.summaryTable || {}).flat()].join('\n');
        if (oralVerbsEn(enAll).length) throw new Error(`fp ${s.g.fp} EN 경구 동사 잔존 → 중지`);
        if (!hasOphthalmicRouteEn(e.usage)) throw new Error(`fp ${s.g.fp} EN 점안 경로 표현 없음 → 중지`);
        // per-master 축 재검증 (방울/눈방향/점안주의)
        for (const [mid, km] of s.koByMaster) {
          const drops = missingDropCountsEn(km.officialDosage, e.usage);
          if (drops.length) throw new Error(`fp ${s.g.fp} master ${mid} EN 방울 수 누락 ${drops.join(',')} → 중지`);
          if (missingEyeSideEn(km.officialDosage, e.usage).missing.length) throw new Error(`fp ${s.g.fp} master ${mid} EN 눈 방향 축 누락 → 중지`);
          if (missingEyeCautionEn(km.officialCaution, [e.usage, e.caution].join('\n')).missing.length) throw new Error(`fp ${s.g.fp} master ${mid} EN 점안 주의 축 누락 → 중지`);
        }
        const mids = retRows<{ id: string }>(await qr.query(
          `SELECT master_id::text id FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND source_type=$2
            AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL ORDER BY master_id`,
          [ref, AUTHORED_SOURCE])).map((r) => r.id);
        if (mids.length !== s.g.size) throw new Error(`fp ${s.g.fp} ko canonical ${mids.length} != ${s.g.size} → ROLLBACK`);
        if (mids.join('|') !== s.g.masterIds.join('|')) throw new Error(`fp ${s.g.fp} sourceRef 앵커 master 불일치 → ROLLBACK`);
        let ins = 0, flip = 0;
        for (const mid of mids) {
          const d = retRows<{ n: string }>(await qr.query(`SELECT count(*)::text n FROM shared_product_descriptions WHERE master_id=$1::uuid AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL`, [mid]));
          if (+d[0].n !== 0) throw new Error(`master ${mid} en canonical 이미 존재 → ROLLBACK`);
          const row = retRows<{ id: string }>(await qr.query(
            `INSERT INTO shared_product_descriptions (master_id, content, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
             VALUES ($1::uuid,$2,$3,$4::uuid,'needs_review','en','STORE',now(),now()) RETURNING id::text`,
            [mid, en.html, AUTHORED_SOURCE, ref]));
          if (row.length !== 1) throw new Error(`${mid} en INSERT 실패`);
          ins++;
          if (retRows(await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE id=$1::uuid AND status='needs_review' RETURNING id`, [row[0].id])).length !== 1) throw new Error(`${mid} en flip 실패`);
          flip++;
        }
        const t = ins + flip;
        if (t !== s.g.size * 2) throw new Error(`fp ${s.g.fp} EN ${t} != ${s.g.size * 2} → ROLLBACK`);
        total += t; per.push({ fp: s.g.fp, size: s.g.size, inserted: ins, flipped: flip, t });
      }
    }
    const expT = lang === 'ko' ? EXPECTED.ko : EXPECTED.en;
    if (total !== expT) throw new Error(`writeActual ${total} != 예상 ${expT} → ROLLBACK`);

    // ── 커밋 전 사후검증 ───────────────────────────────────────────────────────────
    const pv = retRows<Record<string, string>>(await qr.query(`
      SELECT
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
          AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type=$2 AND deleted_at IS NULL)::text "koAuthoredCanonical",
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
          AND status='deprecated' AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::text "easyDeprecated",
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
          AND COALESCE(language,'ko')='ko' AND status='canonical' AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::text "easyStillCanonical",
        (SELECT count(*) FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND language='ko'
          AND description_type='STORE' AND metadata->>'wo'=$4)::text "auditKo",
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
          AND language='en' AND status='canonical' AND deleted_at IS NULL)::text "enCanonical",
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
          AND status='needs_review' AND deleted_at IS NULL)::text "needsReviewLeft",
        (SELECT count(*) FROM (SELECT master_id, COALESCE(language,'ko') l FROM shared_product_descriptions
          WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
          GROUP BY 1,2 HAVING count(*)>1) d)::text "canonicalDup",
        (SELECT count(*) FROM shared_product_descriptions WHERE source_ref_id=ANY($3::uuid[]) AND deleted_at IS NULL
          AND NOT (master_id=ANY($1::uuid[])))::text "sourceRefLeak",
        (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE'
          AND language='en' AND status='canonical' AND deleted_at IS NULL AND content ~ '[가-힣]')::text "enHangul"
      `, [allIds, AUTHORED_SOURCE, refs, WO]));
    post = Object.fromEntries(Object.entries(pv[0]).map(([k, v]) => [k, +v]));
    post.writeActual = total;

    const M = EXPECTED.master;
    const want = lang === 'ko'
      ? { koAuthoredCanonical: M, easyDeprecated: M, easyStillCanonical: 0, auditKo: M, enCanonical: 0, needsReviewLeft: 0, canonicalDup: 0, sourceRefLeak: 0, enHangul: 0 }
      : { koAuthoredCanonical: M, easyDeprecated: M, easyStillCanonical: 0, auditKo: M, enCanonical: M, needsReviewLeft: 0, canonicalDup: 0, sourceRefLeak: 0, enHangul: 0 };
    const bad = Object.entries(want).filter(([k, v]) => post[k] !== v).map(([k, v]) => `${k} ${post[k]} != ${v}`);
    if (bad.length) throw new Error(`postVerify 실패 → ROLLBACK: ${bad.join(' / ')}`);

    await qr.commitTransaction(); await qr.release();
  } catch (e) {
    await qr.rollbackTransaction(); await qr.release(); await ds.destroy();
    throw e;
  }
  await ds.destroy();

  const runPath = path.join(DATA_DIR, `otc-easy-drug-ready-ophthalmic-253-apply-run.${lang}.json`);
  fs.writeFileSync(runPath, JSON.stringify({
    wo: WO, agent: 'ga', unitId: UNIT, writeOwner: 'agent-ga', lang, applied: true,
    inputs: { ssot: path.basename(SSOT), ssotMd5: SSOT_MD5, enConfig: path.basename(EN_PATH), enMd5: EN_MD5 },
    totals: { fingerprints: states.length, masters: allIds.length },
    writeActual: total, writeExpected: lang === 'ko' ? EXPECTED.ko : EXPECTED.en,
    postVerify: post, perGroup: per,
  }, null, 1) + '\n', 'utf8');

  console.log(`  writeActual ${total}T (예상 ${lang === 'ko' ? EXPECTED.ko : EXPECTED.en}T) · COMMITTED`);
  for (const [k, v] of Object.entries(post)) console.log(`    ${k}: ${v}`);
  console.log(`  run ledger → ${runPath}`);
}

async function main(): Promise<void> {
  if (process.argv.includes('--rollback-test')) return runRollbackTest();
  const mode = arg('mode') || 'dry-run';
  if (mode === 'apply') return runApply();
  return runDryRun();
}

if (process.argv[1] && /otc-easy-drug-ready-ophthalmic-253-production\.ga\./.test(process.argv[1])) {
  void main();
}
