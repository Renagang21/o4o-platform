/**
 * WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-FINAL-PRODUCTION-V1 — 경구 미생산 Unit 2 생산 실행기
 *
 * 단일 DB write-owner: **agent-da**. Unit 2 전체(374 fp / 1,849 master)를 하나의 승인 생산 단위로 실행한다.
 *
 * Unit 1 러너(`otc-unproduced-oral-unit1-production.ts`)의 **사본**이다. Unit 1 산출물은 GREEN 마감 후
 * 동결이라 수정할 수 없으므로 공용화 대신 분리 파일로 둔다. 차이는 입력 상수·기대 수치·Unit 1 교집합
 * 게이트뿐이며, write 계약·트랜잭션·rollback·사후검증 구조는 동일하다.
 *
 * ── 입력 계약 ────────────────────────────────────────────────────────────────────
 * 생산 입력은 **Unit 2 승인 SSOT** + **가 에이전트 최종 EN JSON** 둘뿐이다.
 * 두 파일 모두 **읽기 전용**이며 본 러너는 쓰지 않는다. EN JSON 은 md5 로 동일성을 확인한다.
 * Unit 1 SSOT 는 **교집합 0 검증 목적으로만** 읽는다(대상에 포함하지 않는다).
 *
 * ── 지문 계약 ────────────────────────────────────────────────────────────────────
 *   fp = H([indication, dosage, caution, numeric, age, duration, contraindication,
 *           codeIngredientStrength, codeForm, route])        ← 10축 안전지문
 *   sourceRef = fpToUuidV2(fp)                                ← 기존 경구 러너와 동일 앵커 함수
 * fingerprintV2·fpToUuidV2 **산식은 변경하지 않는다**. 본 트랙은 10축 fp 를 그룹 키로 쓰고,
 * 앵커 생성은 기존 함수를 그대로 호출한다.
 *
 * ── write 계약 ──────────────────────────────────────────────────────────────────
 *   KO 4T/master: easy_drug ko canonical → deprecated / authored ko INSERT / canonical 전환 / audit
 *   EN 2T/master: authored en INSERT / canonical 전환
 *   INSERT-only · 기존 canonical 본문 UPDATE 재사용 없음 · 단일 트랜잭션 · 커밋 전 사후검증 → 실패 시 전량 rollback.
 *
 * Usage(apps/api-server):
 *   tsx src/scripts/otc-unproduced-oral-unit2-production.ts --mode=dry-run --lang=ko|en
 *   tsx ... --rollback-test                              # 강제 실패 주입 → 전량 rollback 확인
 *   OTC_ORAL_U2_KO_CONFIRM=YES tsx ... --mode=apply --lang=ko --apply
 *   OTC_ORAL_U2_EN_CONFIRM=YES tsx ... --mode=apply --lang=en --apply
 *   tsx ... --verify
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fpToUuidV2, renderEn, normalize, ROUTE_PROFILE } from './otc-v2-store-leaflet-runner.shared.js';
import { buildDrugOtcConsumerHtml } from '../modules/neture/drug-import/drug-otc-description-consumer-html.js';

const md5 = (s: string): string => crypto.createHash('md5').update(s).digest('hex');
const H = (s: string): string => md5(s).slice(0, 16);
const arg = (k: string): string => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const retRows = <T>(r: unknown): T[] => (Array.isArray(r) && Array.isArray(r[0]) ? r[0] : (r as unknown[])) as T[];

const DATA_DIR = path.resolve(process.cwd(), 'src/scripts/data');
const SSOT = path.join(DATA_DIR, 'otc-unproduced-oral-unit2-approved-ssot-v1.json');
const UNIT1_SSOT = path.join(DATA_DIR, 'otc-unproduced-oral-unit1-approved-ssot-v1.json');
const ORDER_LEDGER = path.join(DATA_DIR, 'otc-unproduced-oral-execution-order-v1.json');
const UNIT1_RUN_LEDGER = path.join(DATA_DIR, 'otc-unproduced-oral-unit1-apply-order.json');
/** 가 에이전트 최종 EN 산출물 — **읽기 전용 입력**. 본 러너는 이 파일을 쓰지 않는다. */
const EN_PATH = path.join(DATA_DIR, 'otc-unit2-en-config-ga-all.json');
const EN_MD5 = 'f48856404bbf95c8bf58850dddbc414d';
const RUN_LEDGER = path.join(DATA_DIR, 'otc-unproduced-oral-unit2-apply-order.json');
const WO = 'WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-FINAL-PRODUCTION-V1';
const UNIT = 'oral-unit-2';
const AUTHORED_SOURCE = 'mfds_drug_otc';
const AUTHORED_SOURCES = ['mfds_drug_otc', 'mfds_drug_otc_nutrition_combo', 'nutrition_combo'];
const EXPECTED = { fp: 374, master: 1849, ko: 7396, en: 3698, write: 11094 };

// ── 10축 안전지문 재현기 (승인 SSOT 계약) ───────────────────────────────────────
function sections(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<p><strong>([^<]+)<\/strong><br\/?>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out[m[1].trim()] = m[2].trim();
  return out;
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
/**
 * 금기 선행 문맥 signature.
 * 경구 트랙은 금기 표현이 "복용하지 마십시오" 다 — 외용 트랙 패턴(사용/투여/바르지)만 쓰면
 * 절단 지점이 달라져 fp 가 재현되지 않는다. 승인 SSOT 와 대조해 `복용하지` 를 선두에 둔다.
 */
function contraSig(caution: string): string {
  const t = normalize(caution);
  const m = t.match(/(.*?)(복용하지\s?(마|않)|사용하지\s?(마|않)|투여하지\s?(마|말)|바르지\s?(마|않)|사용해서는\s?안)/);
  return H(normalize(m ? m[1] : t.slice(0, 240)));
}
function tenAxis(ind: string, dos: string, cau: string, codeIS: string, codeForm: string, route: string): { fp: string; axes: Record<string, string> } {
  const axes = {
    indication: H(normalize(ind)), dosage: H(normalize(dos)), caution: H(normalize(cau)),
    numeric: numericSig(dos), age: ageSig(`${dos}\n${cau}`),
    duration: durationSig(`${dos}\n${cau}`), contraindication: contraSig(cau),
    codeIngredientStrength: codeIS, codeForm, route,
  };
  const fp = H([axes.indication, axes.dosage, axes.caution, axes.numeric, axes.age, axes.duration,
    axes.contraindication, axes.codeIngredientStrength, axes.codeForm, axes.route].join('|'));
  return { fp, axes };
}

interface SsotMaster {
  masterId: string; name: string; fp: string; gencode: string; suffix: string;
  ingredientStrengthCode: string; form: string; route: string;
  safetyFingerprint: Record<string, string>;
  official: { indication: string; dosage: string; caution: string };
}
interface SsotGroup { fp: string; gencode: string; suffix: string; form: string; ingredientStrengthCode: string; size: number; masterIds: string[] }

function loadSsot(): { groups: SsotGroup[]; byMaster: Map<string, SsotMaster>; raw: any } {
  const j = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
  if (j.status !== 'APPROVED_FOR_PRODUCTION') throw new Error(`SSOT status=${j.status}`);
  if (j.unitId !== UNIT) throw new Error(`SSOT unitId=${j.unitId} != ${UNIT}`);
  if (j.totals.fingerprints !== EXPECTED.fp || j.totals.masters !== EXPECTED.master) {
    throw new Error(`총계 ${j.totals.fingerprints}/${j.totals.masters} != ${EXPECTED.fp}/${EXPECTED.master}`);
  }
  const groups: SsotGroup[] = (j.groups as SsotGroup[]).map((g) => ({ ...g, masterIds: [...g.masterIds].sort() }))
    .sort((a, b) => b.size - a.size || (a.fp < b.fp ? -1 : 1));
  return { groups, byMaster: new Map((j.masters as SsotMaster[]).map((m) => [m.masterId, m])), raw: j };
}

async function connect(): Promise<any> {
  const { DataSource } = await import('typeorm');
  const ds = new DataSource({
    type: 'postgres', host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5442', 10),
    username: process.env.DB_USERNAME, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'o4o_platform',
    entities: [], synchronize: false, logging: ['error'], extra: { statement_timeout: 1800000 },
  });
  await ds.initialize();
  return ds;
}

/** KO 소비자 HTML — 승인 SSOT 의 공식 원문만 사용(제품명 미개입). */
function buildKo(m: SsotMaster): { html: string; summary: string | null; missing: string[] } {
  const plain = (s: string): string => s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ').split('\n').map((l) => l.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const efficacy = plain(m.official.indication);
  const usage = plain(m.official.dosage);
  const caution = plain(m.official.caution);
  const src = {
    summaryTable: {
      분류: `일반의약품 · ${m.form}`,
      작용: efficacy.split('\n')[0]?.slice(0, 120) || '',
      '선택 포인트': `동일 일반명코드(${m.gencode}) 제품은 성분·함량·제형이 같습니다. 제품명이 아니라 성분과 함량으로 확인하세요.`,
      '주의 대상': caution ? '아래 주의사항 대상에 해당하면 매장 약사에게 먼저 문의하세요.' : '',
    } as Record<string, string>,
    efficacy, usage, usageLabel: ROUTE_PROFILE.oral.koUsageLabel, caution,
  };
  for (const k of Object.keys(src.summaryTable)) if (!src.summaryTable[k]) delete src.summaryTable[k];
  const built = buildDrugOtcConsumerHtml(src as never, { title: `${m.form} (${m.gencode})` });
  return { html: built.html, summary: src.summaryTable['작용'] ?? null, missing: built.missing };
}

interface GState {
  g: SsotGroup; anomalies: string[]; fpOk: number; bad: number;
  easy1: number; authoredKo: number; enCanon: number;
  koHtml: string; koSummary: string | null; officialDosage: string; rep: SsotMaster;
}

async function prepare(ds: any, stage: 'ko' | 'en'): Promise<{ states: GState[]; allIds: string[]; canonicalDup: number; extra: any }> {
  const { groups, byMaster } = loadSsot();
  const allIds = [...new Set(groups.flatMap((g) => g.masterIds))].sort();

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
        AND COALESCE(s.language,'ko')='ko' AND s.status='canonical' AND s.language='en' AND s.deleted_at IS NULL)::text encanon
    FROM unnest($1::uuid[]) m(mid) ORDER BY 1`, [allIds, AUTHORED_SOURCES]));
  const slotBy = new Map(slots.map((r) => [r.mid, r]));

  const dup = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM (
      SELECT master_id, COALESCE(language,'ko') l, count(*) c FROM shared_product_descriptions
      WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND status='canonical' AND deleted_at IS NULL
      GROUP BY 1,2 HAVING count(*)>1) d`, [allIds]));

  // sourceRef 사전 충돌 — 본 트랙 앵커가 이미 DB에 존재하면 중단
  const refs = groups.map((g) => fpToUuidV2(g.fp));
  const refHit = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM shared_product_descriptions WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [refs]));
  // EN 단계에서는 KO apply 가 만든 본 트랙 앵커가 이미 존재한다.
  // 게이트를 끄지 않고, "앵커 전량이 본 트랙 KO authored 행" 임을 확인하는 쪽으로 기대값을 뒤집는다.
  const refOwn = retRows<{ n: string }>(await ds.query(`
    SELECT count(*)::text n FROM shared_product_descriptions
    WHERE source_ref_id=ANY($1::uuid[]) AND deleted_at IS NULL
      AND description_type='STORE' AND source_type=$2 AND COALESCE(language,'ko')='ko' AND status='canonical'
      AND master_id=ANY($3::uuid[])`, [refs, AUTHORED_SOURCE, allIds]));

  // ── 가 에이전트 EN 입력 검증 (읽기 전용) ─────────────────────────────────────
  // 단계와 무관하게 항상 검증한다 — KO apply 전에 EN 불가 사유를 미리 드러내야 한다.
  const enRaw = fs.readFileSync(EN_PATH, 'utf8');
  const enCfg = JSON.parse(enRaw) as { groups: EnEntry[] };
  const enByFp = new Map<string, EnEntry>(enCfg.groups.map((e) => [e.fp, e]));
  const enExtra = {
    md5: md5(enRaw), md5Match: md5(enRaw) === EN_MD5,
    entries: enCfg.groups.length, dupFp: enCfg.groups.length - enByFp.size,
    matched: 0, missing: [] as string[], orphan: [] as string[], anomalies: [] as string[],
  };
  for (const g of groups) if (!enByFp.has(g.fp)) enExtra.missing.push(g.fp);
  const ssotFp = new Set(groups.map((g) => g.fp));
  for (const e of enCfg.groups) if (!ssotFp.has(e.fp)) enExtra.orphan.push(e.fp);

  const states: GState[] = groups.map((g) => {
    const anomalies: string[] = [];
    let fpOk = 0, bad = 0, easy1 = 0, authoredKo = 0, enCanon = 0;
    for (const mid of g.masterIds) {
      const m = byMaster.get(mid);
      if (!m) { anomalies.push(`SSOT 밖 master ${mid}`); bad++; continue; }
      if (m.route !== 'oral') { anomalies.push(`route!=oral ${mid}`); bad++; continue; }
      if (m.fp !== g.fp || m.gencode !== g.gencode) { anomalies.push(`그룹 상충 ${mid}`); bad++; continue; }
      if (!m.official.indication || !m.official.dosage || !m.official.caution) { anomalies.push(`공식 원문 결손 ${mid}`); bad++; continue; }
      const c = contentByMid.get(mid);
      if (!c) { anomalies.push(`DB 원문 부재 ${mid}`); bad++; continue; }
      const sec = sections(c);
      const ind = sec['효능·효과'] || '';
      const dos = sec['용법·용량'] || '';
      const cau = [sec['경고'], sec['사용상 주의사항'], sec['상호작용']].filter(Boolean).join('\n');
      const t = tenAxis(ind, dos, cau, m.ingredientStrengthCode, m.suffix, 'oral');
      if (t.fp !== g.fp) { anomalies.push(`fp 재현 실패 ${mid}`); bad++; continue; }
      for (const k of Object.keys(t.axes)) {
        if (m.safetyFingerprint[k] !== (t.axes as any)[k]) { anomalies.push(`안전지문 축 ${k} mismatch ${mid}`); break; }
      }
      fpOk++;
      const s = slotBy.get(mid);
      if (s) { if (+s.easy1 === 1) easy1++; authoredKo += +s.authored; enCanon += +s.encanon; }
    }
    const rep = byMaster.get(g.masterIds[0])!;
    const ko = buildKo(rep);
    if (ko.missing.length) anomalies.push(`KO 필수필드 누락 ${ko.missing.join(',')}`);
    if (ko.html.includes('<table') || ko.html.includes('<!--')) anomalies.push('KO html 계약 위반');
    if (stage === 'ko') {
      if (easy1 !== g.size) anomalies.push(`easy ko canonical 정확히1 아님 ${easy1}/${g.size}`);
      if (authoredKo !== 0) anomalies.push(`기존 authored ko ${authoredKo}`);
      if (enCanon !== 0) anomalies.push(`기존 en canonical ${enCanon}`);
    } else {
      if (authoredKo !== g.size) anomalies.push(`authored ko ${authoredKo}/${g.size} — KO 선행 필요`);
      if (enCanon !== 0) anomalies.push(`en canonical 이미 ${enCanon}`);
    }
    // EN 렌더 게이트 — 한글 잔존·경구 동사·수치/연령/횟수/간격/기간 mismatch 를 사전 검사한다.
    const e = enByFp.get(g.fp);
    if (e) {
      const en = renderEn({ groupKey: g.fp, title: e.title, efficacy: e.efficacy, usage: e.usage,
        caution: e.caution, summaryTable: e.summaryTable }, 'oral', rep.official.dosage);
      if (en.anomalies.length) { enExtra.anomalies.push(`[${g.fp}] ${en.anomalies.join('; ')}`); anomalies.push(`EN 렌더 ${en.anomalies[0]}`); }
      else enExtra.matched++;
    }
    return { g, anomalies, fpOk, bad, easy1, authoredKo, enCanon,
      koHtml: ko.html, koSummary: ko.summary, officialDosage: rep.official.dosage, rep };
  });

  // ── Unit 1 교집합 (fp / master / sourceRef) — 전부 0 이어야 한다 ──────────────
  const u1 = JSON.parse(fs.readFileSync(UNIT1_SSOT, 'utf8'));
  const u1Fp = new Set<string>((u1.groups as SsotGroup[]).map((g) => g.fp));
  const u1Ids = new Set<string>((u1.groups as SsotGroup[]).flatMap((g) => g.masterIds));
  const u1Refs = new Set<string>((u1.groups as SsotGroup[]).map((g) => fpToUuidV2(g.fp)));
  return { states, allIds, canonicalDup: +dup[0].n,
    extra: {
      sourceRefPreexisting: +refHit[0].n, sourceRefOwnKo: +refOwn[0].n,
      u1FpIntersect: groups.filter((g) => u1Fp.has(g.fp)).length,
      u1MasterIntersect: allIds.filter((x) => u1Ids.has(x)).length,
      u1RefIntersect: refs.filter((r) => u1Refs.has(r)).length,
      u1Masters: u1Ids.size, en: enExtra,
    } };
}

function gatesOf(states: GState[], allIds: string[], canonicalDup: number, extra: any, stage: 'ko' | 'en'): Record<string, boolean> {
  const j = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
  const order = JSON.parse(fs.readFileSync(ORDER_LEDGER, 'utf8'));
  const u2 = order.sequence.find((s: any) => s.unitId === 'oral-unit-2');
  const fpOk = states.reduce((t, x) => t + x.fpOk, 0);
  const bad = states.reduce((t, x) => t + x.bad, 0);
  const elig = states.filter((x) => x.anomalies.length === 0);
  const eligM = elig.reduce((t, x) => t + x.g.size, 0);
  const u1Led = JSON.parse(fs.readFileSync(UNIT1_RUN_LEDGER, 'utf8'));
  const u1Green = u1Led.koApplied === true && u1Led.enApplied === true && u1Led.independentVerified === true;
  const st = (order.executionStatus?.units || []) as any[];
  const u1State = st.find((x) => x.unitId === 'oral-unit-1')?.state;
  const u2State = st.find((x) => x.unitId === 'oral-unit-2')?.state;
  const en = extra.en;
  return {
    'G1 Unit1=GREEN / Unit2=UNBLOCKED': u1Green && u1State === 'GREEN' && (u2State === 'UNBLOCKED' || u2State === 'GREEN'),
    'G2 SSOT status=APPROVED_FOR_PRODUCTION': j.status === 'APPROVED_FOR_PRODUCTION',
    'G3 총계 374fp/1,849master': states.length === EXPECTED.fp && allIds.length === EXPECTED.master
      && (u2 ? u2.fingerprints === EXPECTED.fp && u2.masters === EXPECTED.master : false),
    'G4 fp 재현 100%': bad === 0 && fpOk === EXPECTED.master,
    'G5 master 누락·중복 0': allIds.length === states.reduce((t, x) => t + x.g.size, 0),
    'G6 10축 안전지문 mismatch 0': !states.some((x) => x.anomalies.some((a) => /안전지문 축/.test(a))),
    'G7 공식 효능·용법·주의 결손 0': !states.some((x) => x.anomalies.some((a) => /원문 결손|원문 부재/.test(a))),
    'G8 route=oral 전건 일치': !states.some((x) => x.anomalies.some((a) => /route!=oral/.test(a))),
    'G9 EN 입력 무변형 (md5 일치)': en.md5Match,
    'G10 EN fp 매칭 374/374 · 중복·고아 0': en.entries === EXPECTED.fp && en.dupFp === 0
      && en.missing.length === 0 && en.orphan.length === 0,
    'G11 EN 한글·수치·연령·기간 mismatch 0': en.anomalies.length === 0 && en.matched === EXPECTED.fp,
    'G12 Unit 1 fp/master/sourceRef 교집합 0': extra.u1FpIntersect === 0
      && extra.u1MasterIntersect === 0 && extra.u1RefIntersect === 0 && extra.u1Masters === 1850,
    'G13 본 트랙 sourceRef 정합': stage === 'ko'
      ? extra.sourceRefPreexisting === 0
      : (extra.sourceRefPreexisting === EXPECTED.master && extra.sourceRefOwnKo === EXPECTED.master),
    'G14 authored canonical 상태 정합': stage === 'ko'
      ? states.every((x) => x.authoredKo === 0 && x.enCanon === 0)
      : states.every((x) => x.authoredKo === x.g.size && x.enCanon === 0),
    'G15 canonicalDup 0': canonicalDup === 0,
    'G16 예상 write': stage === 'ko'
      ? (eligM === EXPECTED.master && eligM * 4 === EXPECTED.ko)
      : (eligM === EXPECTED.master && eligM * 2 === EXPECTED.en),
    'G17 이상 그룹 0': !states.some((x) => x.anomalies.length),
  };
}

async function dryRun(stage: 'ko' | 'en'): Promise<void> {
  const outPath = arg('out') || path.join(DATA_DIR,
    stage === 'ko' ? 'otc-unproduced-oral-unit2-dryrun.json' : 'otc-unproduced-oral-unit2-dryrun.en.json');
  const ds = await connect();
  const { states, allIds, canonicalDup, extra } = await prepare(ds, stage);
  await ds.destroy();
  const gates = gatesOf(states, allIds, canonicalDup, extra, stage);
  const elig = states.filter((x) => x.anomalies.length === 0);
  const eligM = elig.reduce((t, x) => t + x.g.size, 0);
  const manifest = {
    wo: WO, unitId: UNIT, producer: 'otc-unproduced-oral-unit2-production.ts',
    ssot: 'otc-unproduced-oral-unit2-approved-ssot-v1.json', approvalCommit: '8328047ac',
    writeOwner: 'agent-da (단일)', mode: 'dry-run', stage, dbWrite: 0, apply: false,
    declared: EXPECTED, processed: { fingerprints: states.length, masters: allIds.length },
    gates,
    metrics: { fpReproduced: states.reduce((t, x) => t + x.fpOk, 0), failed: states.reduce((t, x) => t + x.bad, 0),
      eligibleGroups: elig.length, eligibleMasters: eligM, canonicalDup,
      sourceRefPreexisting: extra.sourceRefPreexisting, sourceRefOwnKo: extra.sourceRefOwnKo,
      u1FpIntersect: extra.u1FpIntersect, u1MasterIntersect: extra.u1MasterIntersect,
      u1RefIntersect: extra.u1RefIntersect, u1Masters: extra.u1Masters,
      en: { md5: extra.en.md5, md5Match: extra.en.md5Match, entries: extra.en.entries,
        dupFp: extra.en.dupFp, matched: extra.en.matched,
        missing: extra.en.missing.length, orphan: extra.en.orphan.length,
        anomalies: extra.en.anomalies.length, anomalySample: extra.en.anomalies.slice(0, 5) },
      existingAuthoredKo: states.reduce((t, x) => t + x.authoredKo, 0),
      existingEnCanonical: states.reduce((t, x) => t + x.enCanon, 0),
      groupsWithAnomalies: states.filter((x) => x.anomalies.length).length },
    writePlan: stage === 'ko'
      ? { stage, ko_4T: eligM * 4, en_2T: eligM * 2, total: eligM * 6 }
      : { stage, en_2T: eligM * 2, total: eligM * 2 },
    groups: states.map((x) => ({ fp: x.g.fp, gencode: x.g.gencode, form: x.g.form, size: x.g.size,
      sourceRef: fpToUuidV2(x.g.fp), fpOk: x.fpOk, bad: x.bad, easyCanonical1: x.easy1,
      koHtmlMd5: md5(x.koHtml), koHtmlLen: x.koHtml.length, anomalies: x.anomalies })),
    anomalies: states.filter((x) => x.anomalies.length).slice(0, 50).map((x) => `[${x.g.fp}] ${x.anomalies.slice(0, 3).join(' | ')}`),
  };
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 1) + '\n', 'utf8');
  console.log(`UNIT2 DRY-RUN — fp ${states.length}/${EXPECTED.fp} · master ${allIds.length}/${EXPECTED.master}`);
  for (const [k, v] of Object.entries(gates)) console.log(`  ${v ? 'PASS' : '*** FAIL ***'}  ${k}`);
  console.log(stage === 'ko'
    ? `  적격 ${elig.length}fp/${eligM}m · writePlan KO ${eligM * 4} + EN ${eligM * 2} = ${eligM * 6} (예상 ${EXPECTED.write}) · dbWrite 0`
    : `  적격 ${elig.length}fp/${eligM}m · writePlan EN ${eligM * 2} (예상 ${EXPECTED.en}) · dbWrite 0`);
  console.log(`  manifest → ${outPath}`);
  if (Object.values(gates).some((v) => !v)) process.exitCode = 1;
}

/** rollback 시험 — 실제 write 후 강제 실패를 주입해 전량 rollback 되는지 확인한다. DB 최종 상태 무변경. */
async function rollbackTest(): Promise<void> {
  const ds = await connect();
  const { states } = await prepare(ds, 'ko');
  const probe = states.slice(0, 2);
  const ids = probe.flatMap((s) => s.g.masterIds);
  const before = retRows<{ n: string }>(await ds.query(
    `SELECT count(*)::text n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [ids]));
  const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
  let inserted = 0;
  try {
    for (const s of probe) {
      const ref = fpToUuidV2(s.g.fp);
      for (const mid of s.g.masterIds.slice(0, 2)) {
        await qr.query(`INSERT INTO shared_product_descriptions (master_id, content, source_type, source_ref_id, status, language, description_type, created_at, updated_at)
          VALUES ($1::uuid,$2,$3,$4::uuid,'needs_review','ko','STORE',now(),now())`, [mid, '<p>rollback-test</p>', AUTHORED_SOURCE, ref]);
        inserted++;
      }
    }
    throw new Error('ROLLBACK TEST — 의도적 실패 주입');
  } catch (e) {
    await qr.rollbackTransaction(); await qr.release();
    const after = retRows<{ n: string }>(await ds.query(
      `SELECT count(*)::text n FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [ids]));
    await ds.destroy();
    const ok = before[0].n === after[0].n;
    console.log(`ROLLBACK TEST — 시도 INSERT ${inserted} · before ${before[0].n} → after ${after[0].n} · ${ok ? 'PASS (전량 rollback)' : '*** FAIL ***'}`);
    console.log(`  주입 사유: ${(e as Error).message}`);
    if (!ok) process.exitCode = 1;
    return;
  }
}

interface EnEntry { fp: string; title: string; efficacy: string; usage: string; caution: string; summaryTable: Record<string, string> }

async function runApply(): Promise<void> {
  const lang = arg('lang') || 'ko';
  if (lang !== 'ko' && lang !== 'en') { console.error('--lang=ko|en'); process.exit(2); }
  const confirmEnv = lang === 'ko' ? 'OTC_ORAL_U2_KO_CONFIRM' : 'OTC_ORAL_U2_EN_CONFIRM';
  const ds = await connect();
  const { states, allIds, canonicalDup, extra } = await prepare(ds, lang);
  const gates = gatesOf(states, allIds, canonicalDup, extra, lang);
  const blockers = Object.entries(gates).filter(([, v]) => !v).map(([k]) => k);
  console.log(`UNIT2 APPLY ${lang} — ${states.length}fp/${allIds.length}m · write-owner agent-da`);
  for (const [k, v] of Object.entries(gates)) console.log(`  ${v ? 'PASS' : '*** FAIL ***'}  ${k}`);
  if (blockers.length) { await ds.destroy(); throw new Error(`게이트 차단 ${blockers.length}건 → 중지: ${blockers.slice(0, 5).join(' / ')}`); }
  if (!process.argv.includes('--apply') || process.env[confirmEnv] !== 'YES') {
    await ds.destroy();
    console.log(`이중 게이트 미충족 — apply 하지 않았다. 필요: --apply 와 ${confirmEnv}=YES. dbWrite 0.`);
    return;
  }

  const enByFp = new Map<string, EnEntry>();
  if (lang === 'en') {
    const cfg = JSON.parse(fs.readFileSync(arg('en-config') || EN_PATH, 'utf8')) as { groups: EnEntry[] };
    for (const e of cfg.groups) enByFp.set(e.fp, e);
    const missing = states.filter((s) => !enByFp.has(s.g.fp));
    if (missing.length) { await ds.destroy(); throw new Error(`EN 저작 페이로드 부재 ${missing.length}그룹 → 중지`); }
  }

  const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
  let total = 0; const per: any[] = [];
  try {
    for (const s of states) {
      const ref = fpToUuidV2(s.g.fp);
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
            [mid, s.koHtml, s.koSummary, AUTHORED_SOURCE, ref]));
          if (row.length !== 1) throw new Error(`${mid} INSERT 실패`);
          ins++;
          if (retRows(await qr.query(`UPDATE shared_product_descriptions SET status='canonical', curated_at=now() WHERE id=$1::uuid AND status='needs_review' RETURNING id`, [row[0].id])).length !== 1) throw new Error(`${mid} flip 실패`);
          flip++;
          await qr.query(`INSERT INTO shared_product_description_audit_logs (event_type, description_type, master_id, language, previous_description_id, new_description_id, previous_status, new_status, metadata, performed_at)
            VALUES ('canonical_replaced','STORE',$1::uuid,'ko',$2::uuid,$3::uuid,'canonical','canonical',$4::jsonb,now())`,
            [mid, easyId, row[0].id, JSON.stringify({ previousDemotedTo: 'deprecated', previousSource: 'mfds_easy_drug',
              newSource: AUTHORED_SOURCE, source_ref_id: ref, fp: s.g.fp, gencode: s.g.gencode, route: 'oral', unit: UNIT, wo: WO })]);
          aud++;
        }
        const t = dep + ins + flip + aud;
        if (t !== s.g.size * 4) throw new Error(`fp ${s.g.fp} KO ${t} != ${s.g.size * 4} → ROLLBACK`);
        total += t; per.push({ fp: s.g.fp, size: s.g.size, deprecated: dep, inserted: ins, flipped: flip, audited: aud, t });
      } else {
        const e = enByFp.get(s.g.fp)!;
        const en = renderEn({ groupKey: s.g.fp, title: e.title, efficacy: e.efficacy, usage: e.usage,
          caution: e.caution, summaryTable: e.summaryTable }, 'oral', s.officialDosage);
        if (en.anomalies.length) throw new Error(`fp ${s.g.fp} EN 검증 실패: ${en.anomalies.join('; ')} → 중지`);
        const mids = retRows<{ id: string }>(await qr.query(
          `SELECT master_id::text id FROM shared_product_descriptions WHERE source_ref_id=$1::uuid AND source_type=$2
            AND description_type='STORE' AND COALESCE(language,'ko')='ko' AND status='canonical' AND deleted_at IS NULL ORDER BY master_id`,
          [ref, AUTHORED_SOURCE])).map((r) => r.id);
        if (mids.length !== s.g.size) throw new Error(`fp ${s.g.fp} ko canonical ${mids.length} != ${s.g.size} → ROLLBACK`);
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
    // 커밋 전 사후검증
    if (lang === 'ko') {
      const p = retRows<{ c1: string; auth: string; easyleft: string; dup: string }>(await qr.query(`
        SELECT count(*) FILTER (WHERE cc=1)::text c1, count(*) FILTER (WHERE au)::text auth,
               count(*) FILTER (WHERE el)::text easyleft, count(*) FILTER (WHERE cc>1)::text dup FROM (
          SELECT mid,
            (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.deleted_at IS NULL) cc,
            EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type=$2 AND s.deleted_at IS NULL) au,
            EXISTS(SELECT 1 FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND COALESCE(s.language,'ko')='ko' AND s.source_type='mfds_easy_drug' AND s.deleted_at IS NULL) el
          FROM unnest($1::uuid[]) mid) t`, [allIds, AUTHORED_SOURCE]));
      if (+p[0].c1 !== allIds.length || +p[0].auth !== allIds.length || +p[0].easyleft !== 0 || +p[0].dup !== 0) {
        throw new Error(`KO 사후검증 실패 ${JSON.stringify(p[0])} → ROLLBACK`);
      }
    } else {
      const p = retRows<{ c1: string; dup: string }>(await qr.query(`
        SELECT count(*) FILTER (WHERE cc=1)::text c1, count(*) FILTER (WHERE cc>1)::text dup FROM (
          SELECT mid, (SELECT count(*) FROM shared_product_descriptions s WHERE s.master_id=mid AND s.status='canonical' AND s.description_type='STORE' AND s.language='en' AND s.deleted_at IS NULL) cc
          FROM unnest($1::uuid[]) mid) t`, [allIds]));
      if (+p[0].c1 !== allIds.length || +p[0].dup !== 0) throw new Error('EN 사후검증 실패 → ROLLBACK');
    }
    await qr.commitTransaction();
  } catch (e) { await qr.rollbackTransaction(); await qr.release(); await ds.destroy(); throw e; }
  await qr.release(); await ds.destroy();

  const l = fs.existsSync(RUN_LEDGER) ? JSON.parse(fs.readFileSync(RUN_LEDGER, 'utf8'))
    : { wo: WO, unitId: UNIT, writeOwner: 'agent-da', koApplied: false, enApplied: false, independentVerified: false };
  if (lang === 'ko') l.koApplied = true; else l.enApplied = true;
  fs.writeFileSync(RUN_LEDGER, JSON.stringify(l, null, 1) + '\n', 'utf8');
  const runPath = path.join(DATA_DIR, `otc-unproduced-oral-unit2-apply-run.${lang}.json`);
  fs.writeFileSync(runPath, JSON.stringify({ wo: WO, unitId: UNIT, lang, writeOwner: 'agent-da',
    groups: per.length, writeActual: total, writeExpected: lang === 'ko' ? EXPECTED.ko : EXPECTED.en, match: true, per }, null, 1) + '\n', 'utf8');
  console.log(`APPLIED ${lang} — ${per.length}그룹 · writeActual ${total} MATCH · run → ${runPath}`);
}

async function verify(): Promise<void> {
  const { groups } = loadSsot();
  const ids = [...new Set(groups.flatMap((g) => g.masterIds))].sort();
  const refs = groups.map((g) => fpToUuidV2(g.fp));
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
      (SELECT count(*) FROM shared_product_descriptions WHERE master_id=ANY($1::uuid[]) AND description_type='STORE' AND language='en' AND status='canonical' AND content ~ '[가-힣]' AND deleted_at IS NULL)::text en_hangul
  `, [ids, AUTHORED_SOURCE, refs]));
  await ds.destroy();
  const v = { targetMasters: ids.length, koAuthoredCanonical: +r[0].ko_auth, enCanonical: +r[0].en_canon,
    easyDeprecated: +r[0].easy_dep, easyStillCanonical: +r[0].easy_left, needsReviewLeft: +r[0].nr,
    auditKo: +r[0].audit, canonicalDup: +r[0].dup, sourceRefLeak: +r[0].ref_leak, enHangul: +r[0].en_hangul };
  const enDone = v.enCanonical === EXPECTED.master;
  const checks: Record<string, boolean> = {
    '대상 master 1,849': v.targetMasters === EXPECTED.master,
    'KO authored canonical 1,849': v.koAuthoredCanonical === EXPECTED.master,
    'easy_drug deprecated 1,849': v.easyDeprecated === EXPECTED.master,
    'easy_drug canonical 잔존 0': v.easyStillCanonical === 0,
    'audit 1,849': v.auditKo === EXPECTED.master,
    'needs_review 0': v.needsReviewLeft === 0,
    'canonicalDup 0': v.canonicalDup === 0,
    'sourceRef leak 0': v.sourceRefLeak === 0,
    'EN 한글 0': v.enHangul === 0,
    'EN canonical 1,849': enDone,
  };
  console.log(`UNIT2 INDEPENDENT VERIFY — ${JSON.stringify(v)}`);
  for (const [k, ok] of Object.entries(checks)) console.log(`  ${ok ? 'PASS' : '*** FAIL ***'}  ${k}`);
  const outPath = path.join(DATA_DIR, 'otc-unproduced-oral-unit2-verify.json');
  fs.writeFileSync(outPath, JSON.stringify({ wo: WO, unitId: UNIT, dbWrite: 0, metrics: v, checks,
    allPass: Object.values(checks).every(Boolean) }, null, 1) + '\n', 'utf8');
  console.log(`  → ${outPath}`);
  // 독립검증 전항목 PASS + KO/EN apply 완료일 때만 원장의 independentVerified 를 올린다.
  // (이 플래그가 Unit 2 착수 차단을 해제하는 유일한 스위치다.)
  if (Object.values(checks).every(Boolean) && fs.existsSync(RUN_LEDGER)) {
    const l = JSON.parse(fs.readFileSync(RUN_LEDGER, 'utf8'));
    if (l.koApplied === true && l.enApplied === true && l.independentVerified !== true) {
      l.independentVerified = true;
      fs.writeFileSync(RUN_LEDGER, JSON.stringify(l, null, 1) + '\n', 'utf8');
      console.log('  apply-order 원장 → independentVerified=true');
    }
  }
  if (Object.values(checks).some((x) => !x)) process.exitCode = 1;
}

async function main(): Promise<void> {
  if (process.argv.includes('--rollback-test')) { await rollbackTest(); return; }
  if (process.argv.includes('--verify')) { await verify(); return; }
  const mode = arg('mode') || 'dry-run';
  if (mode === 'apply') { await runApply(); return; }
  if (mode === 'dry-run') {
    const stage = arg('lang') || 'ko';
    if (stage !== 'ko' && stage !== 'en') { console.error('--lang=ko|en'); process.exit(2); }
    await dryRun(stage); return;
  }
  console.error('--mode=dry-run|apply · --lang=ko|en · --rollback-test · --verify');
  process.exit(2);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : String(e)); process.exit(1); });
