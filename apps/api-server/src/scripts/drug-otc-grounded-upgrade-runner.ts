/**
 * WO-O4O-OTC-GROUNDED-UPGRADE-RUNNER-HARDENING-DA-V1
 *
 * 범용 Grounded Upgrade Runner — e약은요(mfds_easy_drug) canonical → authored canonical 교체를
 *   Track A 후속 그룹에 재사용하기 위한 실행 안정성 보강판.
 *
 * 기준: 에르도스테인 300mg 정 파일럿(drug-otc-erdosteine-300mg-canonical-upgrade-pilot.ts, 26건 LIVE 완료).
 *   본 파일은 그 파일럿의 fingerprint 산식과 정책(89379627d Option A)을 **변경 없이** 재사용하고,
 *   실행 안정성만 공통화한다. 파일럿 스크립트 자체·에르도스테인 대상/결과는 건드리지 않는다.
 *
 * 하드닝 항목(설계):
 *   1) 현재 canonical 이 이미 authored → ALREADY_UPGRADED 로 **정상 종료**(ABORT 아님, write 0).
 *   2) TypeORM query() 반환값 정규화 헬퍼(retRows) 공통 적용.
 *   3) dry-run 실패/중단 시에도 진단 JSON 보존(PASS 산출물은 clobber 하지 않음).
 *   4) target/exclude/other·교집합 게이트 공통화(classifyByFingerprint).
 *   5) SPD write 와 audit write 분리 보고(writePlan / writeActual).
 *   6) 단일 write-owner 식별값 + 실행 groupKey 로그.
 *   7) typecheck + 로컬 비DB self-test(--selftest, DB 미접속).
 *
 * ⚠️ fingerprint·정책 변경 금지 / 실제 DB write 금지(본 WO 범위 = 범용 runner 설계까지).
 *    후보(candidate/target_fp/exclude_fp)는 에이전트 가 결과로만 GROUP_REGISTRY 에 등재한다.
 *
 * dry-run 기본(read-only·DB write 0). apply 이중게이트: --apply + DRUG_OTC_GROUNDED_UPGRADE_CONFIRM=YES.
 *
 * Usage(apps/api-server):
 *   npx tsx src/scripts/drug-otc-grounded-upgrade-runner.ts --group=<key> [--apply]
 *   npx tsx src/scripts/drug-otc-grounded-upgrade-runner.ts --selftest   # DB 미접속 로컬 검증
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const OUT_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);

const AUTHORED_SOURCES = ['mfds_drug_otc', 'nutrition_combo'] as const;
const EASY_SOURCE = 'mfds_easy_drug';

// ── (하드닝 2) TypeORM query() 반환값 정규화 공통 헬퍼 ──────────────────────────
// query() 의 UPDATE/INSERT ... RETURNING 결과는 드라이버에 따라 `[rows, affected]` 또는 `rows` 로 온다.
// (guide Gotcha #3) rows 만 정규화 반환. 순수 SELECT(res=행 배열)도 방어적으로 통과.
const retRows = <T = { id?: string }>(res: unknown): T[] =>
  (Array.isArray(res) && Array.isArray(res[0]) ? res[0] : (res as unknown[])) as T[];
// 단일 집계 SELECT 행 정규화(방어적).
const firstRow = <T = Record<string, unknown>>(res: unknown): T | undefined => retRows<T>(res)[0];

// ── fingerprint = bridge 정본(f2c819451) 함수 VERBATIM(파일럿과 동일, 산식 변경 없음) ──────────
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
/** bridge groupKeyOf VERBATIM: H([norm_ind, norm_dos, norm_cau, H(성분|함량), H(제형), route]) */
function fingerprintOf(name: string, spec: string, content: string): { fp: string; route: string; form: string; ingredient: string } {
  let sec = easySections(content || '');
  if (Object.keys(sec).length === 0) sec = freeSections(content || '');
  const { ind, dos, cau } = bucketSections(sec);
  const ingredient = ingredientOf(name); const strength = strengthOf(spec); const form = formOf(name); const route = routeSig(name);
  const fp = H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), H(`${ingredient}|${strength}`), H(form), route].join('|'));
  return { fp, route, form, ingredient };
}

// ── 그룹 후보 설정 ────────────────────────────────────────────────────────────
interface GroupUpgradeConfig {
  key: string;              // 실행 groupKey (성분|함량|제형)
  ingredient: string;       // coarse 필터: name LIKE '%(ingredient)'
  dose: string;             // coarse 필터: split_part(specification,' / ',1)=dose
  formKeyword: string;      // coarse 필터: name LIKE '%formKeyword%'
  candidate: string;        // authored draft candidate_id (= source_ref_id, 단일 write-owner)
  targetFp: string;         // bridge SSOT 그대로확장 fp
  excludeFp: string | string[]; // 비대상 fp — 단일(에르도스테인 안전지문불일치) 또는 다중(트리메부틴 비대상 11 fp)
  expected: number;         // 그대로확장 target 기대 수
  excludedExpected: number; // 비대상 exclude 기대 수(모든 excludeFp 합)
  authoredSource: string;   // authored INSERT source_type (mfds_drug_otc | nutrition_combo)
  outBase: string;          // 산출 JSON 파일 stem (runner 네임스페이스 — 파일럿 산출물과 분리)
}

/**
 * 등록된 그룹 = 에르도스테인 300mg 정(파일럿 완료본 · 레퍼런스/회귀 픽스처)만 유지.
 * 후속 Track A 후보는 **에이전트 가** dry-run 검증 결과로만 여기에 추가한다(임의 추가 금지).
 */
const GROUP_REGISTRY: Record<string, GroupUpgradeConfig> = {
  'erdosteine-300mg-jeong': {
    key: '에르도스테인|300밀리그램|정',
    ingredient: '에르도스테인',
    dose: '300밀리그램',
    formKeyword: '정',
    candidate: '03e0af9d-5236-460a-86d4-1af8b0c00c61',
    targetFp: '4b4e162690065e8e',
    excludeFp: 'd68b3eec1cb56646',
    expected: 26,
    excludedExpected: 4,
    authoredSource: 'mfds_drug_otc',
    outBase: 'otc-grounded-upgrade-erdosteine-300mg-jeong',
  },
  // 트리메부틴말레산염 100mg 정 — Track A 첫 범용 runner 파일럿(WO-...-TRIMEBUTINE-100MG-...-DA-V1).
  //   감사 커밋 c15c6bbb4(에이전트 가) 기준. target 단일 fp 66 · 비대상 11 fp 61(coarse 127).
  //   에르도스테인과 달리 exclude 가 다중 fp → excludeFp 배열.
  'trimebutine-100mg-jeong': {
    key: '트리메부틴말레산염|100밀리그램|정',
    ingredient: '트리메부틴말레산염',
    dose: '100밀리그램',
    formKeyword: '정',
    candidate: '003beef8-82c4-4897-a176-d0ea8a695699',
    targetFp: '7a4aab0b31b1ed19',
    excludeFp: [
      '1ca482b8150f601b', '388fc082fcc5203c', '306ce8c4a6793871', 'c9c0d242a5e4a273',
      '0e81c56580ba2501', '4b629892ee85ba89', 'ab9bf22ae1e54918', '4d59ddd48b0e1102',
      '890ef511d4d823e8', '8567020910ac8454', 'f276b94cff37e58f',
    ], // 비대상 11 fp = 12+11+9+7+4+4+4+3+3+2+2 = 61
    expected: 66,
    excludedExpected: 61,
    authoredSource: 'mfds_drug_otc',
    outBase: 'otc-grounded-upgrade-trimebutine-100mg-jeong',
  },
  // 바실루스리케니포르미스균 250mg 캡슐 — Track A 3번째(WO-...-BACILLUS-LICHENIFORMIS-250MG-KO-...-DA-V1).
  //   감사 커밋 c15c6bbb4(에이전트 가) 기준. target 단일 fp 56 · 비대상 7 fp 32(coarse 88).
  'bacillus-liche-250mg-capsule': {
    key: '바실루스리케니포르미스균|250밀리그램|캡슐',
    ingredient: '바실루스리케니포르미스균',
    dose: '250밀리그램',
    formKeyword: '캡슐',
    candidate: '022f4af0-1219-428b-bd69-fa39a5e7fe7f',
    targetFp: '13208b062a9c8c79',
    excludeFp: [
      '085e66182ccb8459', '14860d74206f81f7', '7ed92e6bd2891a28', 'a024d7fa8eaabc06',
      'b97a4eb486a66e60', '273d81582c3dcd4e', '8f001c52affcd167',
    ], // 비대상 7 fp = 6+6+5+5+4+3+3 = 32
    expected: 56,
    excludedExpected: 32,
    authoredSource: 'mfds_drug_otc',
    outBase: 'otc-grounded-upgrade-bacillus-liche-250mg-capsule',
  },
  // 로라타딘 10mg 정 — Track A(WO-O4O-OTC-LORATADINE-10MG-KO-UPGRADE-GA-V1, 준비 감사 270e3f8a6 · 에이전트 가).
  //   target 단일 fp 38 · 비대상 단일 fp 3(coarse 41, other 0). exclude 단일 fp → excludeFp 문자열.
  'loratadine-10mg-jeong': {
    key: '로라타딘|10밀리그램|정',
    ingredient: '로라타딘',
    dose: '10밀리그램',
    formKeyword: '정',
    candidate: '0a7dee0b-e578-4015-967a-fad092071eef',
    targetFp: '83bcf192525baa16',
    excludeFp: '168c9fc2508b87da',
    expected: 38,
    excludedExpected: 3,
    authoredSource: 'mfds_drug_otc',
    outBase: 'otc-grounded-upgrade-loratadine-10mg-jeong',
  },
  // 알벤다졸 400mg 정 — Track A(WO-O4O-OTC-ALBENDAZOLE-400MG-KO-EN-COMPLETE-GA-V1 · 에이전트 가).
  //   감사 커밋 fc66ec00f 기준. target 단일 fp 38 · 비대상 7 fp 54(coarse 92, other 0).
  //   비대상 = 안전지문불일치 47(160f299c19·10384de117·28d292014·7da304f94·4bc58b993) + 비대상 authored 7(44ef883e4·12dd978c3).
  'albendazole-400mg-jeong': {
    key: '알벤다졸|400밀리그램|정',
    ingredient: '알벤다졸',
    dose: '400밀리그램',
    formKeyword: '정',
    candidate: '0178f85b-94d7-4ac9-a061-ac4c2d9ad750',
    targetFp: '879d80e7afe2d0f4',
    excludeFp: [
      '10384de1b4730be8', '12dd978c6a15f077', '160f299c7741cdfa', '28d29201cd57742b',
      '44ef883e752951ce', '4bc58b995fe73f97', '7da304f9b51043b3',
    ], // 비대상 7 fp = 17+3+19+4+4+3+4 = 54
    expected: 38,
    excludedExpected: 54,
    authoredSource: 'mfds_drug_otc',
    outBase: 'otc-grounded-upgrade-albendazole-400mg-jeong',
  },
};

// ── (하드닝 4) target/exclude/other·교집합 게이트 공통화 ──────────────────────
interface FpRow { id: string; name: string; spec: string; content: string; fp: string; route: string; form: string; ingredient: string }
interface Classification {
  target: FpRow[]; excluded: FpRow[]; other: FpRow[];
  masterIds: string[]; excludeIds: Set<string>;
  intersection: number; duplicateTarget: boolean;
  fpDistribution: Array<{ fp: string; n: number; ssot: string }>;
  nonOralNames: string[];
  anomalies: string[];
}
const excludeSetOf = (cfg: GroupUpgradeConfig): Set<string> => new Set(Array.isArray(cfg.excludeFp) ? cfg.excludeFp : [cfg.excludeFp]);
function classifyByFingerprint(withFp: FpRow[], cfg: GroupUpgradeConfig): Classification {
  const excludeFps = excludeSetOf(cfg);
  const target = withFp.filter((r) => r.fp === cfg.targetFp);
  const excluded = withFp.filter((r) => excludeFps.has(r.fp));
  const other = withFp.filter((r) => r.fp !== cfg.targetFp && !excludeFps.has(r.fp));
  const masterIds = target.map((r) => r.id).sort();
  const excludeIds = new Set(excluded.map((r) => r.id));
  const intersection = masterIds.filter((id) => excludeIds.has(id)).length;
  const duplicateTarget = new Set(masterIds).size !== masterIds.length;
  const fpDistribution = Object.entries(withFp.reduce((a: Record<string, number>, r) => { a[r.fp] = (a[r.fp] || 0) + 1; return a; }, {}))
    .map(([fp, n]) => ({ fp, n, ssot: fp === cfg.targetFp ? '그대로확장' : excludeFps.has(fp) ? '비대상(exclude)' : '미분류' }));
  const nonOralNames = target.filter((r) => r.route !== 'oral').map((r) => r.name);

  const anomalies: string[] = [];
  if (target.length !== cfg.expected) anomalies.push(`target ${target.length} !== expected ${cfg.expected} (그대로확장 SSOT 재고정 불일치)`);
  if (excluded.length !== cfg.excludedExpected) anomalies.push(`excluded ${excluded.length} !== ${cfg.excludedExpected} (안전지문불일치 SSOT 재고정 불일치)`);
  if (duplicateTarget) anomalies.push('target master 중복');
  if (intersection !== 0) anomalies.push(`target∩exclude ${intersection} !== 0`);
  if (other.length !== 0) anomalies.push(`SSOT 미분류 fingerprint ${other.length} (coarse ${cfg.expected + cfg.excludedExpected} 외)`);
  if (nonOralNames.length) anomalies.push(`비경구 혼입 ${nonOralNames.length}`);
  return { target, excluded, other, masterIds, excludeIds, intersection, duplicateTarget, fpDistribution, nonOralNames, anomalies };
}

// ── (하드닝 3) 진단 JSON 보존: 매 실행은 <base>.run.json 에 기록(실패/ALREADY 포함),
//    dry-run PASS 만 <base>.dryrun-pass.json 에 별도 보존(PASS 산출물 clobber 방지) ──
function persistRun(cfg: GroupUpgradeConfig, report: Record<string, unknown>): void {
  fs.writeFileSync(path.join(OUT_DIR, `${cfg.outBase}.run.json`), JSON.stringify(report, null, 2), 'utf8');
  if (report.mode === 'dry-run' && report.status === 'PASS') {
    fs.writeFileSync(path.join(OUT_DIR, `${cfg.outBase}.dryrun-pass.json`), JSON.stringify(report, null, 2), 'utf8');
  }
}

// ── 실행 본체 ────────────────────────────────────────────────────────────────
async function runGroundedUpgrade(cfg: GroupUpgradeConfig, opts: { apply: boolean }): Promise<Record<string, unknown>> {
  const mode = opts.apply ? 'APPLY' : 'dry-run';
  const report: any = {
    wo: 'WO-O4O-OTC-GROUNDED-UPGRADE-RUNNER-HARDENING-DA-V1',
    mode,
    status: 'INIT',
    dbWrite: 0,
    groupKey: cfg.key,                                   // (하드닝 6) 실행 groupKey
    writeOwner: {                                        // (하드닝 6) 단일 write-owner 식별값
      kind: 'authored_source_ref_id',
      value: cfg.candidate,
      authoredSource: cfg.authoredSource,
      performedBy: null,                                 // batch/system (audit.performed_by NULL)
      wo: 'WO-O4O-OTC-GROUNDED-UPGRADE-RUNNER-HARDENING-DA-V1',
    },
    policy: '89379627d Option A',
    anomalies: [] as string[],
  };

  const { DataSource } = await import('typeorm');
  const ds = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT || '5442', 10), username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 120000 } });
  await ds.initialize();

  try {
    // draft
    const draft = retRows<{ candidate_id: string; title: string; content_json: Record<string, unknown> }>(await ds.query(
      `SELECT candidate_id::text, title, content_json FROM product_candidate_description_drafts WHERE candidate_id=$1::uuid AND deleted_at IS NULL LIMIT 1`, [cfg.candidate]));
    if (draft.length !== 1) throw new Error(`draft(candidate ${cfg.candidate}) ${draft.length} !== 1 → ABORT`);
    const d = draft[0];
    report.draftTitle = d.title;

    // coarse 재열거 + fingerprint 재고정.
    //   easy content 는 canonical 우선, 없으면 deprecated fallback(승격 후에도 fp 재현 → ALREADY 판정 가능).
    //   미승격 그룹은 canonical easy 가 항상 우선하므로 파일럿과 target 분류가 byte-identical(산식 불변).
    const coarse = retRows<{ id: string; name: string; spec: string; content: string }>(await ds.query(
      `SELECT pm.id::text id, pm.name, pm.specification spec, es.content
       FROM product_masters pm
       JOIN LATERAL (SELECT content FROM shared_product_descriptions s WHERE s.master_id=pm.id AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL ORDER BY (s.status='canonical') DESC, length(s.content) DESC LIMIT 1) es ON true
       WHERE pm.name LIKE '%('||$1||')' AND split_part(pm.specification,' / ',1)=$2 AND pm.name LIKE '%'||$3||'%'
       ORDER BY pm.id`, [cfg.ingredient, cfg.dose, cfg.formKeyword]));
    const withFp: FpRow[] = coarse.map((r) => { const f = fingerprintOf(r.name, r.spec, r.content); return { ...r, ...f }; });

    // (하드닝 4) 공통 분류·교집합 게이트
    const cls = classifyByFingerprint(withFp, cfg);
    const masterIds = cls.masterIds;
    report.coarseTotal = coarse.length;
    report.target = cls.target.length; report.excluded = cls.excluded.length; report.otherFp = cls.other.length;
    report.excludedDetail = cls.excluded.map((r) => ({ id: r.id, name: r.name, reason: `비대상(fp ${r.fp}, bridge SSOT)` }));
    report.target_master_ids = masterIds; report.rollback_master_ids = masterIds;
    report.targetExcludeIntersection = cls.intersection;
    report.fpDistribution = cls.fpDistribution;
    report.nonOralNames = cls.nonOralNames;
    report.anomalies.push(...cls.anomalies);

    // (하드닝 1) 승격 상태 프로브 — target master 의 현재 STORE ko canonical source
    let authoredCanonMasters = 0, easyCanonMasters = 0, noneCanonMasters = 0;
    if (masterIds.length) {
      const canonRows = retRows<{ mid: string; src: string }>(await ds.query(
        `SELECT s.master_id::text mid, s.source_type src
         FROM shared_product_descriptions s
         WHERE s.master_id = ANY($1::uuid[]) AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.deleted_at IS NULL`, [masterIds]));
      const byMaster = new Map<string, string>();
      for (const r of canonRows) if (!byMaster.has(r.mid)) byMaster.set(r.mid, r.src);
      for (const mid of masterIds) {
        const src = byMaster.get(mid);
        if (!src) noneCanonMasters += 1;
        else if ((AUTHORED_SOURCES as readonly string[]).includes(src)) authoredCanonMasters += 1;
        else if (src === EASY_SOURCE) easyCanonMasters += 1;
      }
    }
    report.upgradeState = { authoredCanonMasters, easyCanonMasters, noneCanonMasters };

    // ALREADY_UPGRADED: target 전부 이미 authored canonical → 정상 종료(ABORT 아님, write 0).
    //   fingerprint 재고정이 정상(anomalies 없음)일 때만 신뢰. anomaly 있으면 아래 ABORT 로.
    if (cls.anomalies.length === 0 && authoredCanonMasters === masterIds.length && masterIds.length > 0 && easyCanonMasters === 0) {
      report.status = 'ALREADY_UPGRADED';
      report.note = `target ${masterIds.length} 전부 authored canonical (${cfg.authoredSource}) — 이미 승격됨. write 0, 정상 종료.`;
      return report;
    }
    // 부분 승격(혼재) → 안전을 위해 ABORT 대상 anomaly
    if (authoredCanonMasters > 0 && authoredCanonMasters < masterIds.length) {
      report.anomalies.push(`부분 승격 상태 authored=${authoredCanonMasters}/${masterIds.length} (easy=${easyCanonMasters}, none=${noneCanonMasters}) → 수동 확인 필요`);
    }

    // 슬롯 상태: e약은요 STORE ko canonical 정확히 1 · authored canonical/needs_review 충돌
    const slot = firstRow<{ easy: string; authored_canon: string; authored_nr: string; anyc: string }>(masterIds.length ? await ds.query(`
      SELECT
        count(*) FILTER (WHERE src='mfds_easy_drug' AND st='canonical')::text easy,
        count(*) FILTER (WHERE src IN ('mfds_drug_otc','nutrition_combo') AND st='canonical')::text authored_canon,
        count(*) FILTER (WHERE src IN ('mfds_drug_otc','nutrition_combo') AND st='needs_review')::text authored_nr,
        count(DISTINCT mid) FILTER (WHERE st='canonical')::text anyc
      FROM (
        SELECT s.master_id mid, s.source_type src, s.status st
        FROM shared_product_descriptions s
        WHERE s.master_id = ANY($1::uuid[]) AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL
      ) t`, [masterIds]) : [{ easy: '0', authored_canon: '0', authored_nr: '0', anyc: '0' }]) || { easy: '0', authored_canon: '0', authored_nr: '0', anyc: '0' };
    const easyPer = firstRow<{ n: string }>(masterIds.length ? await ds.query(
      `SELECT count(*)::text n FROM unnest($1::uuid[]) mid WHERE (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.source_type='mfds_easy_drug' AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL)=1`, [masterIds]) : [{ n: '0' }]) || { n: '0' };
    report.easyCanonicalExactly1 = parseInt(easyPer.n, 10);
    report.authoredCanonicalConflict = parseInt(slot.authored_canon, 10);
    report.existingAuthoredNeedsReview = parseInt(slot.authored_nr, 10);
    report.easyCanonicalTotal = parseInt(slot.easy, 10);

    if (report.easyCanonicalExactly1 !== cfg.expected) report.anomalies.push(`e약은요 STORE ko canonical 정확히1 아닌 master (${report.easyCanonicalExactly1}/${cfg.expected})`);
    if (report.authoredCanonicalConflict !== 0) report.anomalies.push(`기존 authored canonical 충돌 ${report.authoredCanonicalConflict}`);

    // draft HTML 빌드·검증
    const built = buildDrugOtcConsumerHtml(d.content_json as never, { title: d.title });
    if (built.missing.length) report.anomalies.push(`필수필드 누락 ${built.missing.join(',')}`);
    if (!built.html) report.anomalies.push('빈 html');
    if (built.html.includes('<table')) report.anomalies.push('<table>');
    if (built.html.includes('<!--')) report.anomalies.push('주석');
    if (built.html.includes('&amp;lt;') || built.html.includes('&amp;gt;')) report.anomalies.push('이중 escape');
    if (!built.html.includes('sd-warn')) report.anomalies.push('sd-warn 없음');
    report.htmlLen = built.html.length; report.contentHash = md5(built.html);
    report.summary = String((d.content_json as any)?.summaryTable?.['성분'] ?? '') || null;

    // (하드닝 5) SPD write 와 audit write 분리 보고 — dry-run 산정(정책 §2-A)
    const authoredNrInsert = cfg.expected - report.existingAuthoredNeedsReview; // 신규 needs_review INSERT
    report.writePlan = {
      spd: {
        STEP_A_authored_needs_review_INSERT: authoredNrInsert,
        STEP_B_easy_canonical_demote: cfg.expected,
        STEP_B_authored_canonical_flip: cfg.expected,
        total: authoredNrInsert + cfg.expected + cfg.expected,
      },
      audit: {
        canonical_replaced_INSERT: cfg.expected,        // 엔티티 모델: 1행/교체(previous+new)
        total: cfg.expected,
      },
      grand_total: authoredNrInsert + cfg.expected + cfg.expected + cfg.expected,
    };
    report.auditCountFlag = {
      entity_model: `SharedProductDescriptionAuditLog canonical_replaced = 1행/교체(previous_description_id+new_description_id 동시) → ${cfg.expected}`,
      policy_2A: `audit 2/master = ${cfg.expected * 2} (demote 1 + flip 1)`,
      status: '불일치 — 엔티티는 1행/교체 설계. dry-run 은 엔티티 기준으로 산정.',
    };

    if (report.anomalies.length) { report.status = 'ABORT'; throw new Error(`이상 ${report.anomalies.length}건 → ABORT\n  ${report.anomalies.join('\n  ')}`); }

    // === APPLY (이중게이트 통과 시만) — 정책 §2 STEP A + STEP B ===
    if (opts.apply) {
      report.dbWrite = 1;
      const qr = ds.createQueryRunner(); await qr.connect();
      // STEP A: authored ko needs_review 준비(멱등)
      await qr.startTransaction();
      try {
        const insA = await qr.query(
          `INSERT INTO shared_product_descriptions (master_id, content, summary, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
           SELECT mid, $3, $5, $2, $4::uuid, 'needs_review', 'ko', 'STORE', now(), now()
           FROM unnest($1::uuid[]) mid
           WHERE NOT EXISTS (SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.status IN ('canonical','needs_review'))
           RETURNING id`, [masterIds, cfg.authoredSource, built.html, cfg.candidate, report.summary]);
        report.stepA_inserted = retRows(insA).length;
        await qr.commitTransaction();
      } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
      // STEP B: 단일 TX 슬롯 교체
      await qr.startTransaction();
      try {
        let demoted = 0, flipped = 0, audited = 0;
        for (const mid of masterIds) {
          const cur = retRows<{ id: string; source_type: string }>(await qr.query(
            `SELECT id::text id, source_type FROM shared_product_descriptions WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL`, [mid]));
          if (cur.length === 0) throw new Error(`master ${mid} canonical 0건 → ABORT`);
          if (cur.length > 1) throw new Error(`master ${mid} canonical ${cur.length}건 → ABORT`);
          if ((AUTHORED_SOURCES as readonly string[]).includes(cur[0].source_type)) continue; // 이미 authored → no-op
          if (cur[0].source_type !== EASY_SOURCE) throw new Error(`master ${mid} canonical source ${cur[0].source_type} 예상밖 → ABORT`);
          const easyId = cur[0].id;
          const demote = await qr.query(`UPDATE shared_product_descriptions SET status='deprecated', updated_at=now() WHERE id=$1::uuid AND status='canonical' RETURNING id`, [easyId]);
          if (retRows(demote).length !== 1) throw new Error(`master ${mid} easy demote ${retRows(demote).length}건 !== 1 → ABORT`);
          demoted += 1;
          const flip = await qr.query(
            `UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE master_id=$1::uuid AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND source_type IN ('mfds_drug_otc','nutrition_combo') AND status='needs_review' AND deleted_at IS NULL RETURNING id`, [mid]);
          const flipRows = retRows<{ id: string }>(flip);
          const newId = flipRows[0]?.id ?? null;
          if (flipRows.length !== 1 || !newId) throw new Error(`master ${mid} authored needs_review flip ${flipRows.length}건 → ABORT`);
          flipped += 1;
          await qr.query(
            `INSERT INTO shared_product_description_audit_logs (event_type, description_type, master_id, language, previous_description_id, new_description_id, previous_status, new_status, metadata, performed_at)
             VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb, now())`,
            [mid, easyId, newId, JSON.stringify({ previousDemotedTo: 'deprecated', previousSource: EASY_SOURCE, newSource: cfg.authoredSource, source_ref_id: cfg.candidate, groupKey: cfg.key, wo: report.wo })]);
          audited += 1;
        }
        // (하드닝 5) 실제 write 분리 보고
        report.writeActual = {
          spd: { stepA_inserted: report.stepA_inserted, demoted, flipped, total: (report.stepA_inserted || 0) + demoted + flipped },
          audit: { canonical_replaced_inserted: audited, total: audited },
        };
        // 사후검증
        const post = firstRow<{ canon1: string; authored: string; dep: string; dup: string }>(await qr.query(`
          SELECT
            count(*) FILTER (WHERE canoncnt=1)::text canon1,
            count(*) FILTER (WHERE authored_canon)::text authored,
            count(*) FILTER (WHERE dep_easy)::text dep,
            count(*) FILTER (WHERE canoncnt>1)::text dup
          FROM (
            SELECT mid,
              (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) canoncnt,
              EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type IN ('mfds_drug_otc','nutrition_combo') AND s.deleted_at IS NULL) authored_canon,
              EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='deprecated' AND s.source_type='mfds_easy_drug' AND s.description_type='STORE' AND s.deleted_at IS NULL) dep_easy
            FROM unnest($1::uuid[]) mid
          ) t`, [masterIds])) || { canon1: '0', authored: '0', dep: '0', dup: '0' };
        report.post = { canonical1: parseInt(post.canon1, 10), authored: parseInt(post.authored, 10), deprecatedEasy: parseInt(post.dep, 10), dup: parseInt(post.dup, 10) };
        if (report.post.canonical1 !== cfg.expected || report.post.authored !== cfg.expected || report.post.deprecatedEasy !== cfg.expected || report.post.dup !== 0)
          throw new Error(`사후검증 실패 canon1=${report.post.canonical1} authored=${report.post.authored} dep=${report.post.deprecatedEasy} dup=${report.post.dup} → ROLLBACK`);
        await qr.commitTransaction();
      } catch (e) { await qr.rollbackTransaction(); await qr.release(); throw e; }
      await qr.release();
      report.status = 'APPLIED';
    } else {
      report.status = 'PASS';
    }
    return report;
  } finally {
    await ds.destroy();
  }
}

// ── (하드닝 7) 로컬 비DB self-test — DB 미접속, 순수 로직 재현 ───────────────────
function selfTest(): void {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => { if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}: got ${JSON.stringify(got)} !== want ${JSON.stringify(want)}`); };

  // retRows 정규화: [rows, affected] / rows / [] 세 형태
  eq('retRows([[{id:a}],1])', retRows([[{ id: 'a' }], 1]), [{ id: 'a' }]);
  eq('retRows([{id:a}])', retRows([{ id: 'a' }]), [{ id: 'a' }]);
  eq('retRows([])', retRows([]), []);
  eq('firstRow([[{n:1}]])', firstRow([[{ n: 1 }]]), { n: 1 });

  // fingerprint 결정성(동일 입력 → 동일 fp) + route/form 분류
  const f1 = fingerprintOf('엘도테인정(에르도스테인)', '300밀리그램 / 1정', '<p><strong>효능효과</strong><br/>가래</p>');
  const f2 = fingerprintOf('엘도테인정(에르도스테인)', '300밀리그램 / 1정', '<p><strong>효능효과</strong><br/>가래</p>');
  eq('fingerprint 결정성', f1.fp, f2.fp);
  eq('route oral(정)', f1.route, 'oral');
  eq('form 정', f1.form, '정');
  eq('ingredientOf', f1.ingredient, '에르도스테인');
  eq('routeSig topical(연고)', routeSig('무슨연고(스테로이드)'), 'topical');

  // classifyByFingerprint 게이트: 합성 26 target + 4 exclude, 교집합 0
  const cfg = GROUP_REGISTRY['erdosteine-300mg-jeong'];
  const synth: FpRow[] = [];
  const exFp = Array.isArray(cfg.excludeFp) ? cfg.excludeFp[0] : cfg.excludeFp;
  for (let i = 0; i < cfg.expected; i++) synth.push({ id: `t${i}`, name: 'x(에르도스테인)', spec: '300밀리그램', content: '', fp: cfg.targetFp, route: 'oral', form: '정', ingredient: '에르도스테인' });
  for (let i = 0; i < cfg.excludedExpected; i++) synth.push({ id: `e${i}`, name: 'x(에르도스테인)', spec: '300밀리그램', content: '', fp: exFp, route: 'oral', form: '정', ingredient: '에르도스테인' });
  const cls = classifyByFingerprint(synth, cfg);
  eq('cls.target', cls.target.length, cfg.expected);
  eq('cls.excluded', cls.excluded.length, cfg.excludedExpected);
  eq('cls.other', cls.other.length, 0);
  eq('cls.intersection', cls.intersection, 0);
  eq('cls.anomalies(정상)', cls.anomalies.length, 0);

  // 게이트 이상 탐지: other 혼입 시 anomaly
  const bad = [...synth, { id: 'o1', name: 'x(에르도스테인)', spec: '300밀리그램', content: '', fp: 'deadbeefdeadbeef', route: 'oral', form: '정', ingredient: '에르도스테인' }];
  const clsBad = classifyByFingerprint(bad, cfg);
  eq('cls.other(혼입)>0 anomaly', clsBad.anomalies.some((a) => a.includes('미분류')), true);

  if (fails.length) { console.error('SELFTEST FAIL\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log(`SELFTEST PASS (${8 + 5 + 1}건) — retRows/firstRow · fingerprint 결정성·route/form · classifyByFingerprint 게이트·이상탐지. DB 미접속.`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) { selfTest(); return; }

  const groupArg = (argv.find((a) => a.startsWith('--group=')) || '').split('=')[1];
  if (!groupArg || !GROUP_REGISTRY[groupArg]) {
    console.error(`--group=<key> 필요. 등록된 그룹: ${Object.keys(GROUP_REGISTRY).join(', ')}\n(비DB 검증: --selftest)`);
    process.exit(2);
  }
  const cfg = GROUP_REGISTRY[groupArg];
  const apply = argv.includes('--apply') && process.env.DRUG_OTC_GROUNDED_UPGRADE_CONFIRM === 'YES';
  const mode = apply ? 'APPLY' : 'dry-run';

  let report: any = { wo: 'WO-O4O-OTC-GROUNDED-UPGRADE-RUNNER-HARDENING-DA-V1', mode, status: 'INIT', dbWrite: 0, groupKey: cfg.key, anomalies: [] };
  try {
    report = await runGroundedUpgrade(cfg, { apply });
  } catch (e) {
    // (하드닝 3) 실패/중단 시에도 진단 JSON 보존
    report.status = report.status && report.status !== 'INIT' ? report.status : 'FAIL';
    report.error = e instanceof Error ? e.message : String(e);
    persistRun(cfg, report);
    console.error('FATAL', report.error);
    console.log(`\n[${mode}] group=${cfg.key} status=${report.status} owner=${cfg.candidate} · 이상 ${(report.anomalies || []).length} · 진단 JSON 보존: ${cfg.outBase}.run.json`);
    process.exit(1);
  }
  persistRun(cfg, report);
  console.log(JSON.stringify(report, null, 2));
  console.log(`\n[${mode}] group=${cfg.key} owner=${cfg.candidate} status=${report.status} · target ${report.target ?? '-'}/${cfg.expected} · 이상 ${(report.anomalies || []).length}`);
  if (report.status === 'ALREADY_UPGRADED') console.log('  (이미 승격됨 — write 0, 정상 종료)');
  else if (!apply) console.log('  (dry-run — write 0. apply: --apply + DRUG_OTC_GROUNDED_UPGRADE_CONFIRM=YES, 별도 승인)');
}

main().catch((e) => { console.error('FATAL', e instanceof Error ? e.message : e); process.exit(1); });
