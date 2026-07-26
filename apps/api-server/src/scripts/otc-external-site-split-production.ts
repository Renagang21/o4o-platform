/**
 * WO-O4O-OTC-EXTERNAL-SITE-SPLIT-READY-FINAL-PRODUCTION-V1 — READY_SPLIT 생산 실행기
 *
 * 단일 DB write-owner: **agent-da**. 전체 90 master 를 **하나의 승인 생산 단위**로 처리한다.
 *
 * ── 기존 실행기와의 차이(최소 확장) ─────────────────────────────────────────────
 * 외부 적용부위 최종 생산기(`otc-external-site-final-production.ts`)와 write 계약·안전장치는
 * 동일하다. 다른 점은 **그룹 키가 9축 안전지문(newFp)** 이라는 것뿐이다.
 *   · 그룹 키 / sourceRef 앵커 : newFp  (fpToUuidV2(newFp))
 *   · V2 지문                   : v2Fp = fingerprintV2(ax, gencode, route) — 계약 변경 없이 그대로 재현 검증
 * 즉 fingerprintV2·fpToUuidV2 **산식은 손대지 않고**, 재현 대상만 2종으로 늘렸다.
 *
 * write 계약(불변): master당 KO 4T(easy demote → authored INSERT → canonical 전환 → audit) + EN 2T.
 * INSERT-only · 기존 canonical 본문 UPDATE 재사용 없음 · 단일 트랜잭션 · 커밋 전 사후검증 → 실패 시 전량 rollback.
 *
 * Usage(apps/api-server):
 *   tsx src/scripts/otc-external-site-split-production.ts --mode=dry-run
 *   OTC_SPLIT_KO_CONFIRM=YES tsx ... --mode=apply --lang=ko --apply
 *   OTC_SPLIT_EN_CONFIRM=YES tsx ... --mode=apply --lang=en --apply
 *   tsx ... --verify
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  officialAxes, fingerprintV2, fpToUuidV2, buildGroupKo, fetchTargetState, renderEn, normalize,
  type V2Group, type TargetState,
} from './otc-v2-store-leaflet-runner.shared.js';
import { RECOVERY_ROUTE_PROFILE, ROUTE_LABEL_KO, AUTHORED_SOURCE_V2 } from './otc-v2-external-site-recovery-adapter.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const SSOT_PATH = path.join(DATA_DIR, 'otc-external-site-split-final-approved-ssot-v1.json');
const EN_PATH = path.join(DATA_DIR, 'otc-external-site-split-final-en.json');
const LEDGER = path.join(DATA_DIR, 'otc-external-site-split-apply-order.json');
const WO = 'WO-O4O-OTC-EXTERNAL-SITE-SPLIT-READY-FINAL-PRODUCTION-V1';
const TRACK = 'external-site-split';
const EXPECTED = { fp: 24, master: 90, ko: 360, en: 180, write: 540 };
const EXPECTED_ROUTES: Record<string, number> = { cutaneous: 35, oromucosal: 22, nasal: 33 };

// ── 9축 안전지문 재현기 (SSOT 빌더 VERBATIM) ────────────────────────────────────
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
const SITE_PATTERNS: Array<{ site: string; re: RegExp }> = [
  { site: 'rectal', re: /항문|직장\s?내|직장에|관장/ },
  { site: 'vaginal', re: /질\s?내|질강|질에|질세정|질\s?점막/ },
  { site: 'oromucosal', re: /구강|입\s?안|양치|가글|함수|인후|인두|목구멍|헹구|씹어|잇몸/ },
  { site: 'ophthalmic', re: /결막낭|눈에|안구|점안/ },
  { site: 'nasal', re: /비강|콧\s?속|코\s?안|코에/ },
  { site: 'otic', re: /귀\s?안|귓\s?속|외이도/ },
  { site: 'cutaneous', re: /피부|환부|患部|상처\s?부위|도포|바른다|바르고|바를|문지르|씻어\s?낸다|씻어\s?내고|소독한다|소독하여|닦아\s?낸다|국소\s?부위/ },
];
const detectSites = (text: string): string[] => {
  const t = normalize(text);
  return [...new Set(SITE_PATTERNS.filter((p) => p.re.test(t)).map((p) => p.site))].sort();
};
function nineAxisFp(ind: string, dos: string, cau: string, gencode: string, site: string): string {
  return H([H(normalize(ind)), H(normalize(dos)), H(normalize(cau)), gencode, site,
    numericSig(dos), ageSig(`${dos}\n${cau}`), durationSig(`${dos}\n${cau}`), contraSig(cau)].join('|'));
}

interface SsotMaster {
  masterId: string; name: string; fp: string; v2Fp: string; gencode: string; suffix: string;
  route: string; officialSite: string; evidence: string; evidenceSection: string;
  indicationSites: string[]; professionalUseVerdict: string; shard: string;
}
interface SsotGroup { fp: string; v2Fp: string; gencode: string; route: string; size: number; masterIds: string[] }

function loadSsot(): { groups: V2Group[]; raw: SsotGroup[]; byMaster: Map<string, SsotMaster>; ssot: any } {
  const j = JSON.parse(fs.readFileSync(SSOT_PATH, 'utf8'));
  if (j.status !== 'APPROVED_FOR_PRODUCTION') throw new Error(`SSOT status=${j.status} — 생산 불가`);
  if (j.allGatesPass !== true) throw new Error('SSOT allGatesPass=false');
  if (j.totals.fingerprints !== EXPECTED.fp || j.totals.masters !== EXPECTED.master) {
    throw new Error(`SSOT 총계 ${j.totals.fingerprints}/${j.totals.masters} != ${EXPECTED.fp}/${EXPECTED.master}`);
  }
  const raw: SsotGroup[] = j.groups;
  const byMaster = new Map<string, SsotMaster>((j.masters as SsotMaster[]).map((m) => [m.masterId, m]));
  const groups: V2Group[] = raw.map((g) => ({
    fp: g.fp, gencode: g.gencode, route: g.route,
    form: ROUTE_LABEL_KO[g.route] || g.route, size: g.size, masterIds: [...g.masterIds].sort(),
  })).sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));
  return { groups, raw, byMaster, ssot: j };
}

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

interface GState {
  g: V2Group; v2Fp: string; anomalies: string[];
  v2Ok: number; nineOk: number; bad: number; easy1: number; authoredKo: number; enCanon: number;
  koHtml: string; koSummary: string | null; officialDosage: string;
}

async function prepare(ds: any, stage: 'ko' | 'en'): Promise<{ states: GState[]; allIds: string[]; canonicalDup: number; st: TargetState; raw: SsotGroup[] }> {
  const { groups, raw, byMaster } = loadSsot();
  const allIds = [...new Set(groups.flatMap((g) => g.masterIds))].sort();
  const st = await fetchTargetState(ds, allIds);
  const dup = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM (
      SELECT master_id, COALESCE(language,'ko') lang, count(*) c FROM shared_product_descriptions
      WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1,2 HAVING count(*)>1) d`, [allIds]));

  const states: GState[] = groups.map((g) => {
    const rawG = raw.find((r) => r.fp === g.fp)!;
    const anomalies: string[] = [];
    if (!RECOVERY_ROUTE_PROFILE[g.route]) anomalies.push(`미지원 route(${g.route})`);
    let v2Ok = 0, nineOk = 0, bad = 0, easy1 = 0, authoredKo = 0, enCanon = 0;
    for (const mid of g.masterIds) {
      const m = byMaster.get(mid);
      if (!m) { anomalies.push(`SSOT 밖 master ${mid}`); bad++; continue; }
      if (m.professionalUseVerdict !== 'PRODUCIBLE_STORE') { anomalies.push(`전문용 혼입 ${mid}`); bad++; continue; }
      const gc = st.gencodeByMid.get(mid) ?? null;
      const content = st.contentByMid.get(mid);
      if (!gc || gc !== g.gencode) { anomalies.push(`gencode 상충 ${mid}`); bad++; continue; }
      if (!content) { anomalies.push(`원문 부재 ${mid}`); bad++; continue; }
      const ax = officialAxes(content);
      if (!ax.ind || !ax.dos) { anomalies.push(`공식 축 부족 ${mid}`); bad++; continue; }
      // route 는 용법에서 도출하고 효능과 대조한다(제품명 미사용)
      const dosSites = detectSites(ax.dos);
      if (dosSites.length !== 1 || dosSites[0] !== g.route) { anomalies.push(`용법 부위 상충 ${mid}`); bad++; continue; }
      const indConflict = detectSites(ax.ind).filter((s) => s !== g.route);
      if (indConflict.length) { anomalies.push(`효능 부위 충돌 ${mid}(${indConflict.join(',')})`); bad++; continue; }
      if (fingerprintV2(ax, gc, g.route) !== rawG.v2Fp) { anomalies.push(`v2Fp 불일치 ${mid}`); bad++; continue; }
      v2Ok++;
      if (nineAxisFp(ax.ind, ax.dos, ax.cau, gc, g.route) !== g.fp) { anomalies.push(`9축 fp 불일치 ${mid}`); bad++; continue; }
      nineOk++;
      const slot = st.slotByMid.get(mid);
      if (slot) {
        if (parseInt(slot.easy1, 10) === 1) easy1++;
        authoredKo += parseInt(slot.authored, 10);
        enCanon += parseInt(slot.encanon, 10);
      }
    }
    const ko = buildGroupKo(g, st, RECOVERY_ROUTE_PROFILE);
    if (ko.source) anomalies.push(...ko.anomalies); else anomalies.push('대표 원문 없음');
    if (stage === 'ko') {
      if (easy1 !== g.size) anomalies.push(`easy ko canonical 정확히1 아님 ${easy1}/${g.size}`);
      if (authoredKo !== 0) anomalies.push(`기존 authored ko ${authoredKo} (예상 0)`);
      if (enCanon !== 0) anomalies.push(`기존 en canonical ${enCanon} (예상 0)`);
    } else {
      if (easy1 !== 0) anomalies.push(`KO 적용 후 easy canonical 잔존 ${easy1}`);
      if (authoredKo !== g.size) anomalies.push(`authored ko ${authoredKo}/${g.size} — KO 선행 필요`);
      if (enCanon !== 0) anomalies.push(`en canonical 이미 ${enCanon} — 중복 차단`);
    }
    return { g, v2Fp: rawG.v2Fp, anomalies, v2Ok, nineOk, bad, easy1, authoredKo, enCanon,
      koHtml: ko.html, koSummary: (ko.source?.summaryTable?.['작용'] as string) ?? null, officialDosage: ko.officialDosage };
  });

  return { states, allIds, canonicalDup: parseInt(dup[0]?.n || '0', 10), st, raw };
}

function gatesOf(states: GState[], allIds: string[], canonicalDup: number, stage: 'ko' | 'en'): Record<string, boolean> {
  const ssot = JSON.parse(fs.readFileSync(SSOT_PATH, 'utf8'));
  const v2Ok = states.reduce((t, x) => t + x.v2Ok, 0);
  const nineOk = states.reduce((t, x) => t + x.nineOk, 0);
  const bad = states.reduce((t, x) => t + x.bad, 0);
  const elig = states.filter((x) => x.anomalies.length === 0);
  const eligM = elig.reduce((t, x) => t + x.g.size, 0);
  const routeTally: Record<string, number> = {};
  for (const s of states) routeTally[s.g.route] = (routeTally[s.g.route] || 0) + s.g.size;
  return {
    'D1 최종 SSOT status·수량 일치': ssot.status === 'APPROVED_FOR_PRODUCTION'
      && states.length === EXPECTED.fp && allIds.length === EXPECTED.master,
    'D2 fp 재현 100%(v2Fp + 9축)': bad === 0 && v2Ok === EXPECTED.master && nineOk === EXPECTED.master,
    'D3 route·효능·용법 대조 mismatch 0': !states.some((x) => x.anomalies.some((a) => /부위 상충|부위 충돌/.test(a))),
    'D4 비경구 route 경구동사 0': !states.some((x) => x.anomalies.some((a) => /경구 동사/.test(a))),
    'D5 공식 수치·기간 누락 0': !states.some((x) => x.anomalies.some((a) => /수치 누락/.test(a))),
    'D6 HOLD·제외 혼입 0': !states.some((x) => x.anomalies.some((a) => /전문용|SSOT 밖/.test(a))),
    'D7 route별 수량 일치': Object.entries(EXPECTED_ROUTES).every(([r, n]) => routeTally[r] === n),
    'D8 authored canonical 상태 정합': stage === 'ko'
      ? states.every((x) => x.authoredKo === 0 && x.enCanon === 0)
      : states.every((x) => x.authoredKo === x.g.size && x.enCanon === 0),
    'D9 canonicalDup 0': canonicalDup === 0,
    'D10 예상 write 540T': stage === 'ko'
      ? (eligM === EXPECTED.master && eligM * 4 === EXPECTED.ko)
      : (eligM === EXPECTED.master && eligM * 2 === EXPECTED.en),
    'D11 이상 그룹 0': !states.some((x) => x.anomalies.length),
  };
}

async function dryRun(): Promise<void> {
  const outPath = arg('out') || path.join(DATA_DIR, 'otc-external-site-split-dryrun.json');
  const ds = await connect();
  const { states, allIds, canonicalDup, raw } = await prepare(ds, 'ko');
  await ds.destroy();
  const gates = gatesOf(states, allIds, canonicalDup, 'ko');
  const elig = states.filter((x) => x.anomalies.length === 0);
  const eligM = elig.reduce((t, x) => t + x.g.size, 0);
  const routeTally: Record<string, number> = {};
  for (const s of states) routeTally[s.g.route] = (routeTally[s.g.route] || 0) + s.g.size;

  const manifest = {
    wo: WO, track: TRACK, producer: 'otc-external-site-split-production.ts',
    ssot: 'otc-external-site-split-final-approved-ssot-v1.json', auditCommit: 'bab6b45f2',
    writeOwner: 'agent-da (단일)', mode: 'dry-run', dbWrite: 0, apply: false,
    declared: EXPECTED, processed: { fingerprints: states.length, masters: allIds.length },
    gates,
    metrics: { v2FpReproduced: states.reduce((t, x) => t + x.v2Ok, 0),
      nineAxisFpReproduced: states.reduce((t, x) => t + x.nineOk, 0),
      failed: states.reduce((t, x) => t + x.bad, 0),
      eligibleGroups: elig.length, eligibleMasters: eligM, canonicalDup,
      existingAuthoredKo: states.reduce((t, x) => t + x.authoredKo, 0),
      existingEnCanonical: states.reduce((t, x) => t + x.enCanon, 0), routeTally },
    writePlan: { ko_4T: eligM * 4, en_2T: eligM * 2, total: eligM * 6 },
    groups: states.map((x) => ({ fp: x.g.fp, v2Fp: x.v2Fp, gencode: x.g.gencode, route: x.g.route,
      size: x.g.size, sourceRef: fpToUuidV2(x.g.fp), v2Ok: x.v2Ok, nineOk: x.nineOk, bad: x.bad,
      easyCanonical1: x.easy1, koHtmlMd5: md5(x.koHtml), koHtmlLen: x.koHtml.length, anomalies: x.anomalies })),
    anomalies: states.filter((x) => x.anomalies.length).map((x) => `[${x.g.fp}] ${x.anomalies.join(' | ')}`),
  };
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 1) + '\n', 'utf8');
  console.log(`SPLIT DRY-RUN — fp ${states.length}/${EXPECTED.fp} · master ${allIds.length}/${EXPECTED.master}`);
  for (const [k, v] of Object.entries(gates)) console.log(`  ${v ? 'PASS' : '*** FAIL ***'}  ${k}`);
  console.log(`  route: ${Object.entries(routeTally).map(([r, n]) => `${r} ${n}`).join(' · ')}`);
  console.log(`  writePlan KO ${eligM * 4} + EN ${eligM * 2} = ${eligM * 6} (예상 ${EXPECTED.write}) · dbWrite 0`);
  console.log(`  manifest → ${outPath}`);
  if (Object.values(gates).some((v) => !v)) process.exitCode = 1;
}

interface EnEntry { fp: string; title: string; efficacy: string; usage: string; caution: string; summaryTable: Record<string, string> }

async function runApply(): Promise<void> {
  const lang = arg('lang') || 'ko';
  if (lang !== 'ko' && lang !== 'en') { console.error('--lang=ko|en'); process.exit(2); }
  const confirmEnv = lang === 'ko' ? 'OTC_SPLIT_KO_CONFIRM' : 'OTC_SPLIT_EN_CONFIRM';
  const ds = await connect();
  const { states, allIds, canonicalDup } = await prepare(ds, lang);
  const gates = gatesOf(states, allIds, canonicalDup, lang);
  const blockers = Object.entries(gates).filter(([, v]) => !v).map(([k]) => k);
  console.log(`SPLIT APPLY ${lang} — ${states.length}fp/${allIds.length}m · write-owner agent-da`);
  for (const [k, v] of Object.entries(gates)) console.log(`  ${v ? 'PASS' : '*** FAIL ***'}  ${k}`);
  if (blockers.length) { await ds.destroy(); throw new Error(`게이트 차단 ${blockers.length}건 → 중지: ${blockers.join(' / ')}`); }
  if (!process.argv.includes('--apply') || process.env[confirmEnv] !== 'YES') {
    await ds.destroy();
    console.log(`이중 게이트 미충족 — apply 하지 않았다. 필요: --apply 와 ${confirmEnv}=YES. dbWrite 0.`);
    return;
  }

  const enByFp = new Map<string, EnEntry>();
  if (lang === 'en') {
    const cfg = JSON.parse(fs.readFileSync(arg('en-config') || EN_PATH, 'utf8')) as { groups: EnEntry[] };
    for (const e of cfg.groups) enByFp.set(e.fp, e);
  }

  const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
  const per: any[] = []; let total = 0;
  try {
    for (const s of states) {
      const sourceRef = fpToUuidV2(s.g.fp);
      if (lang === 'ko') {
        let dep = 0, ins = 0, flip = 0, aud = 0;
        for (const mid of s.g.masterIds) {
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
            [mid, s.koHtml, s.koSummary, AUTHORED_SOURCE_V2, sourceRef]));
          if (row.length !== 1) throw new Error(`${mid} INSERT 실패`);
          ins++;
          if (retRows(await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE id=$1::uuid AND status='needs_review' RETURNING id`, [row[0].id])).length !== 1) throw new Error(`${mid} flip 실패`);
          flip++;
          await qr.query(
            `INSERT INTO shared_product_description_audit_logs (event_type, description_type, master_id, language, previous_description_id, new_description_id, previous_status, new_status, metadata, performed_at)
             VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb,now())`,
            [mid, easyId, row[0].id, JSON.stringify({ previousDemotedTo: 'deprecated', previousSource: 'mfds_easy_drug',
              newSource: AUTHORED_SOURCE_V2, source_ref_id: sourceRef, fp: s.g.fp, v2Fp: s.v2Fp,
              gencode: s.g.gencode, route: s.g.route, track: TRACK, wo: WO })]);
          aud++;
        }
        const t = dep + ins + flip + aud;
        if (t !== s.g.size * 4) throw new Error(`fp ${s.g.fp} KO ${t} != ${s.g.size * 4} → ROLLBACK`);
        total += t; per.push({ fp: s.g.fp, size: s.g.size, deprecated: dep, inserted: ins, flipped: flip, audited: aud, t });
      } else {
        const e = enByFp.get(s.g.fp);
        if (!e) throw new Error(`fp ${s.g.fp} EN 저작 페이로드 부재 → 중지`);
        const en = renderEn({ groupKey: s.g.fp, title: e.title, efficacy: e.efficacy, usage: e.usage,
          caution: e.caution, summaryTable: e.summaryTable }, s.g.route, s.officialDosage, RECOVERY_ROUTE_PROFILE);
        if (en.anomalies.length) throw new Error(`fp ${s.g.fp} EN 검증 실패: ${en.anomalies.join('; ')} → 중지`);
        const mids = retRows<{ id: string }>(await qr.query(
          `SELECT master_id::text id FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND source_type=$2
             AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL ORDER BY master_id`,
          [sourceRef, AUTHORED_SOURCE_V2])).map((r) => r.id);
        if (mids.length !== s.g.size) throw new Error(`fp ${s.g.fp} ko canonical ${mids.length} != ${s.g.size} → ROLLBACK`);
        let ins = 0, flip = 0;
        for (const mid of mids) {
          const d = retRows<{ n: string }>(await qr.query(
            `SELECT count(*)::text n FROM shared_product_descriptions WHERE master_id=$1::uuid AND description_type='STORE'
               AND language='en' AND status='canonical' AND deleted_at IS NULL`, [mid]));
          if (+d[0].n !== 0) throw new Error(`master ${mid} en canonical 이미 존재 → ROLLBACK`);
          const row = retRows<{ id: string }>(await qr.query(
            `INSERT INTO shared_product_descriptions (master_id, content, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
             VALUES ($1::uuid,$2,$3,$4::uuid,'needs_review','en','STORE',now(),now()) RETURNING id::text`,
            [mid, en.html, AUTHORED_SOURCE_V2, sourceRef]));
          if (row.length !== 1) throw new Error(`${mid} en INSERT 실패`);
          ins++;
          if (retRows(await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE id=$1::uuid AND status='needs_review' RETURNING id`, [row[0].id])).length !== 1) throw new Error(`${mid} en flip 실패`);
          flip++;
        }
        const t = ins + flip;
        if (t !== s.g.size * 2) throw new Error(`fp ${s.g.fp} EN ${t} != ${s.g.size * 2} → ROLLBACK`);
        total += t; per.push({ fp: s.g.fp, size: s.g.size, inserted: ins, flipped: flip, t, enHtmlMd5: md5(en.html) });
      }
    }
    const expT = lang === 'ko' ? EXPECTED.ko : EXPECTED.en;
    if (total !== expT) throw new Error(`writeActual ${total} != 예상 ${expT} → ROLLBACK`);

    // 커밋 전 사후검증
    if (lang === 'ko') {
      const p = retRows<{ c1: string; auth: string; easyleft: string; dup: string }>(await qr.query(`
        SELECT count(*) FILTER (WHERE cc=1)::text c1, count(*) FILTER (WHERE au)::text auth,
               count(*) FILTER (WHERE el)::text easyleft, count(*) FILTER (WHERE cc>1)::text dup FROM (
          SELECT mid,
            (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) cc,
            EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type=$2 AND s.deleted_at IS NULL) au,
            EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_easy_drug' AND s.deleted_at IS NULL) el
          FROM unnest($1::uuid[]) mid) t`, [allIds, AUTHORED_SOURCE_V2]));
      if (+p[0].c1 !== allIds.length || +p[0].auth !== allIds.length || +p[0].easyleft !== 0 || +p[0].dup !== 0) {
        throw new Error(`KO 사후검증 실패 ${JSON.stringify(p[0])} → ROLLBACK`);
      }
    } else {
      const p = retRows<{ c1: string; dup: string }>(await qr.query(`
        SELECT count(*) FILTER (WHERE cc=1)::text c1, count(*) FILTER (WHERE cc>1)::text dup FROM (
          SELECT mid, (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) cc
          FROM unnest($1::uuid[]) mid) t`, [allIds]));
      if (+p[0].c1 !== allIds.length || +p[0].dup !== 0) throw new Error(`EN 사후검증 실패 → ROLLBACK`);
    }
    await qr.commitTransaction();
  } catch (e) { await qr.rollbackTransaction(); await qr.release(); await ds.destroy(); throw e; }
  await qr.release();
  await ds.destroy();

  const l = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : { wo: WO, writeOwner: 'agent-da', koApplied: false, enApplied: false, independentVerified: false };
  if (lang === 'ko') l.koApplied = true; else l.enApplied = true;
  fs.writeFileSync(LEDGER, JSON.stringify(l, null, 1) + '\n', 'utf8');
  const runPath = path.join(DATA_DIR, `otc-external-site-split-apply-run.${lang}.json`);
  fs.writeFileSync(runPath, JSON.stringify({ wo: WO, lang, writeOwner: 'agent-da', groups: per.length,
    writeActual: total, writeExpected: lang === 'ko' ? EXPECTED.ko : EXPECTED.en, match: true, per }, null, 1) + '\n', 'utf8');
  console.log(`APPLIED ${lang} — ${per.length}그룹 · writeActual ${total} MATCH · run → ${runPath}`);
}

async function verify(): Promise<void> {
  const { groups } = loadSsot();
  const ids = [...new Set(groups.flatMap((g) => g.masterIds))].sort();
  const refs = groups.map((g) => fpToUuidV2(g.fp));
  const ext = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-external-site-final-approved-ssot-v1.json'), 'utf8'));
  const extIds = (ext.masters as any[]).map((m) => m.masterId);
  const audit = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'otc-external-site-split-required-audit-v1.json'), 'utf8'));
  const holdIds = (audit.masters as any[]).filter((m) => m.verdict !== 'READY_SPLIT').map((m) => m.masterId);

  const ds = await connect();
  const r = retRows<Record<string, string>>(await ds.query(`
    SELECT
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND source_type=$2 AND deleted_at IS NULL)::text ko_auth,
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND language='en' AND source_type=$2 AND deleted_at IS NULL)::text en_canon,
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='deprecated' AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::text easy_dep,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND source_type='mfds_easy_drug' AND deleted_at IS NULL)::text easy_left,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='needs_review' AND deleted_at IS NULL)::text nr,
      (SELECT count(*) FROM shared_product_description_audit_logs WHERE master_id=ANY($1::uuid[]) AND event_type='canonical_replaced' AND language='ko')::text audit,
      (SELECT count(*) FROM (SELECT master_id, COALESCE(language,'ko') l, count(*) c FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL GROUP BY 1,2 HAVING count(*)>1) d)::text dup,
      (SELECT count(*) FROM shared_product_descriptions WHERE source_ref_id=ANY($3::uuid[]) AND NOT (master_id=ANY($1::uuid[])) AND deleted_at IS NULL)::text ref_leak,
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND content ~ '[가-힣]' AND deleted_at IS NULL)::text en_hangul,
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE master_id=ANY($4::uuid[]) AND description_type='STORE' AND status='canonical' AND source_type=$2 AND deleted_at IS NULL)::text hold_written,
      (SELECT count(DISTINCT master_id) FROM shared_product_descriptions WHERE master_id=ANY($5::uuid[]) AND description_type='STORE' AND status='canonical' AND COALESCE(language,'ko')='ko' AND source_type=$2 AND deleted_at IS NULL)::text ext199
  `, [ids, AUTHORED_SOURCE_V2, refs, holdIds, extIds]));
  await ds.destroy();

  const v = { targetMasters: ids.length, koAuthoredCanonical: +r[0].ko_auth, enCanonical: +r[0].en_canon,
    easyDeprecated: +r[0].easy_dep, easyStillCanonical: +r[0].easy_left, needsReviewLeft: +r[0].nr,
    auditKo: +r[0].audit, canonicalDup: +r[0].dup, sourceRefLeak: +r[0].ref_leak, enHangul: +r[0].en_hangul,
    holdWritten: +r[0].hold_written, externalLive199Intact: +r[0].ext199 };
  const checks: Record<string, boolean> = {
    'KO authored canonical == 90': v.koAuthoredCanonical === EXPECTED.master,
    'EN canonical == 90': v.enCanonical === EXPECTED.master,
    'easy_drug deprecated == 90': v.easyDeprecated === EXPECTED.master,
    'easy_drug ko canonical 잔존 0': v.easyStillCanonical === 0,
    'needs_review 0': v.needsReviewLeft === 0,
    'audit == 90': v.auditKo === EXPECTED.master,
    'canonicalDup 0': v.canonicalDup === 0,
    'sourceRef 충돌 0': v.sourceRefLeak === 0,
    'EN 한글 0': v.enHangul === 0,
    'HOLD(MULTI_ROUTE+PROFESSIONAL) write 0': v.holdWritten === 0,
    '기존 외부 LIVE 199 불변': v.externalLive199Intact === 199,
  };
  console.log(`SPLIT INDEPENDENT VERIFY — ${JSON.stringify(v)}`);
  for (const [k, ok] of Object.entries(checks)) console.log(`  ${ok ? 'PASS' : '*** FAIL ***'}  ${k}`);
  const outPath = path.join(DATA_DIR, 'otc-external-site-split-verify.json');
  fs.writeFileSync(outPath, JSON.stringify({ wo: WO, dbWrite: 0, metrics: v, checks, allPass: Object.values(checks).every(Boolean) }, null, 1) + '\n', 'utf8');
  console.log(`  → ${outPath}`);
  if (Object.values(checks).some((x) => !x)) process.exitCode = 1;
}

async function main(): Promise<void> {
  if (process.argv.includes('--verify')) { await verify(); return; }
  const mode = arg('mode') || 'dry-run';
  if (mode === 'apply') { await runApply(); return; }
  if (mode === 'dry-run') { await dryRun(); return; }
  console.error('--mode=dry-run|apply · --lang=ko|en · --verify');
  process.exit(2);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
