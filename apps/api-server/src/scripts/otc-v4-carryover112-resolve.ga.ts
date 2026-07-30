/**
 * WO-O4O-OTC-EASY-DRUG-V4-ROUTE-CARRYOVER-112-BULK-FINAL-RESOLUTION-V1
 *   — route 이월 112 master 일괄 최종 판정 (에이전트 가 · READ-ONLY · DB write 0)
 *
 * 입력: otc-v4-route-673-carryover-ledger.ga.json 중
 *       TRUE_MULTI_ROUTE 46 · ROUTE_SOURCE_CONFLICT 31 · HOLD_UNRESOLVED 35 = 112
 *
 * 판정 원칙 (WO 본문):
 *   - 제품명만으로 route 를 정하지 않는다. 공식 용법·용량이 최우선 근거다.
 *   - 효능·효과 / 제형 / 적용 부위 / 사용 동사 / 표준코드(ATC·제형구분)는 보조 근거다.
 *   - 공식 원문에 복수 route 가 실제로 존재하면 하나로 억지 축소하지 않는다.
 *   - 단순 데이터 중복·이형이면 근거를 명시해 해소하고, 실제 의미 충돌이면 terminal 을 유지한다.
 *   - 다른 master 의 원문을 대표값으로 쓰지 않는다. 공식 원문에 없는 의료 사실을 생성하지 않는다.
 *
 * 최종 분류 7종:
 *   RECOVERABLE_SINGLE_ROUTE / RECOVERABLE_MULTI_ROUTE_CONTENT / REQUIRES_NEW_ROUTE_PROFILE /
 *   SOURCE_CONFLICT_RESOLVED / TERMINAL_SOURCE_CONFLICT / TERMINAL_UNRESOLVED / EXCLUDE_NON_HUMAN_USE
 *
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-v4-carryover112-resolve.ga.ts --port 5495
 *      (--probe 를 주면 판정 분포·근거 표본만 출력하고 원장을 쓰지 않는다)
 */
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { DATA_DIR, md5, sixSectionsRaw, CONTENT_SECTIONS, masterRefV4 } from './otc-v4-master-leaflet-contract.ga.js';

const WO = 'WO-O4O-OTC-EASY-DRUG-V4-ROUTE-CARRYOVER-112-BULK-FINAL-RESOLUTION-V1';
const P = (f: string): string => path.join(DATA_DIR, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const has = (n: string): boolean => process.argv.includes(n);

const IN_CLASSES = new Set(['TRUE_MULTI_ROUTE', 'ROUTE_SOURCE_CONFLICT', 'HOLD_UNRESOLVED']);

/** 기존 composer 가 route profile 을 이미 보유한 경로 (nr26 으로 nasal·rectal 추가 완료). */
const PROFILED = new Set(['oral', 'topical', 'ophthalmic', 'oromucosal', 'vaginal', 'nasal', 'rectal']);
/** profile 자체가 없는 경로. */
const NO_PROFILE = new Set(['otic', 'inhalation']);

// ────────────────────────────── 공식 원문 route 추출 ──────────────────────────────
// 절(clause) 단위로 본다. 회피·금지 절은 투여 근거에서 제외한다("눈에 들어가지 않도록" 등).
const NEG = /지\s*(?:마|말|않)|피하[여고십]|금지|삼가|닿지|들어가지/;

/** 부위 단독으로는 근거가 되지 않는다. 부위(적용 부위·적응 부위) + 투여 동사 동시 출현을 요구한다. */
const SITE: Array<{ route: string; site: RegExp; verb: RegExp }> = [
  { route: 'ophthalmic', site: /눈\s*(?:에|안|속|의|꺼풀)|안구|결막|각막|안검|눈물/, verb: /점안|넣|점적|투여|바르|도포|적하/ },
  { route: 'otic', site: /귀\s*(?:에|안|속|의)|외이도|이도\s*(?:내|에)|고막|중이염|외이염/, verb: /점이|넣|점적|투여|적하|떨어[뜨트]/ },
  { route: 'nasal', site: /코\s*(?:에|안|속|점막)|비강|비내|콧속|콧구멍|비점막|비염/, verb: /뿌리|분무|넣|점적|투여|바르|주입/ },
  { route: 'oromucosal', site: /구강|구내염|입\s*(?:안|속|에)|잇몸|치은|치육|치아|설하|혀\s*(?:에|밑)|인후|인두|목\s*(?:안|구멍)|편도|아프타/, verb: /바르|발라|도포|뿌리|붙이|넣|투여|머금|가글|양치|함수|물[고게]|녹여|적시/ },
  { route: 'vaginal', site: /질\s*(?:내|안|강)?\s*(?:에|을|으로|로|입구)|질\s*(?:세균|염|칸디다|트리코모나스)|외음|질좌|질정/, verb: /삽입|넣|주입|바르|투여|정치|세척/ },
  { route: 'rectal', site: /항문|직장\s*(?:내|에|으로)?|에네마|관장|치핵|치질|배변/, verb: /삽입|넣|주입|투여|관장|바르|짜\s*넣/ },
  { route: 'topical', site: /피부|환부|국소|병변|두피|손발|각질|사마귀|무좀|상처|화상|창상|아픈 부위|해당\s*부위|부위\s*에/, verb: /바르|발라|붙이|도포|문지|뿌리|투여|적용|부착|세척|씻/ },
  { route: 'inhalation', site: /기관지|폐\s*(?:에|로)|호흡기|네뷸라이저|흡입기|기도/, verb: /흡입|들이마|투여/ },
];

/** 부위 없이도 경로가 확정되는 경로 특이 동사. */
const STRONG: Array<{ route: string; re: RegExp }> = [
  { route: 'oral', re: /복용|내복|삼키|먹[어는습]|경구\s*투여|경구용|물과 함께|씹어/ },
  { route: 'ophthalmic', re: /점안/ },
  { route: 'otic', re: /점이하/ },
  { route: 'oromucosal', re: /가글|양치|함수하|머금/ },
  { route: 'rectal', re: /관장|좌약을?\s*삽입|좌제를?\s*삽입/ },
  { route: 'inhalation', re: /흡입하|흡입시키|네뷸라이|분무흡입/ },
  { route: 'nasal', re: /비강내|점비하/ },
];

/** 부위가 함께 나오지 않을 때만 인정하는 약한(부위 비특이) 동사 — 국소 외용 추정. */
const WEAK_TOPICAL = /도포하|바르십시오|바릅니다|발라\s*주|문질러|첩부|부착하|붙입니다/;

function decodeHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/** 문장 단위(부위–동사 인접성 보존). 절 단위 분해는 부정문 판정에만 쓴다. */
function clauses(text: string): string[] {
  return decodeHtml(text).split(/[.\n。]|(?<=습니다)\s|(?<=하십시오)\s/).map((s) => s.trim()).filter(Boolean);
}
function subClauses(sentence: string): string[] {
  return sentence.split(/,|;|、|·|(?<=하고)\s|(?<=하며)\s/).map((s) => s.trim()).filter(Boolean);
}
/** 부위/동사 표현이 부정·회피 절 안에서만 등장하면 투여 근거로 세지 않는다. */
function affirmative(sentence: string, re: RegExp): boolean {
  const subs = subClauses(sentence).filter((s) => re.test(s));
  if (!subs.length) return false;
  return subs.some((s) => !NEG.test(s));
}

interface RouteHit { route: string; clause: string; kind: 'site+verb' | 'strong' | 'weak-topical' }

function routeHits(text: string): { hits: RouteHit[]; routes: string[]; negatedRoutes: string[] } {
  const hits: RouteHit[] = [];
  const negated = new Set<string>();
  for (const cl of clauses(text)) {
    const local: RouteHit[] = [];
    for (const s of SITE) {
      if (!s.site.test(cl) || !s.verb.test(cl)) continue;
      if (affirmative(cl, s.site)) local.push({ route: s.route, clause: cl, kind: 'site+verb' });
      else negated.add(s.route);
    }
    for (const s of STRONG) {
      if (!s.re.test(cl)) continue;
      if (affirmative(cl, s.re)) local.push({ route: s.route, clause: cl, kind: 'strong' });
      else negated.add(s.route);
    }
    // 부위 비특이 동사(바르다/붙이다)는 그 문장에 다른 부위 근거가 전혀 없을 때만 topical 로 인정한다.
    if (local.length === 0 && WEAK_TOPICAL.test(cl) && !SITE.some((s) => s.site.test(cl)) && affirmative(cl, WEAK_TOPICAL)) {
      local.push({ route: 'topical', clause: cl, kind: 'weak-topical' });
    }
    hits.push(...local);
  }
  const routes = [...new Set(hits.map((h) => h.route))].sort();
  return { hits, routes, negatedRoutes: [...negated].sort() };
}

// ────────────────────────────── 보조축 ──────────────────────────────
function atcRoute(atc: string | null): string | null {
  if (!atc) return null;
  const a = atc.toUpperCase();
  if (/^A06AG/.test(a)) return 'rectal';          // enemas
  if (/^A06AD/.test(a)) return 'oral';            // osmotic laxatives (경구)
  if (/^B05/.test(a)) return null;                // 관류·수액·용해제 — 인체 투여 경로가 아니다
  if (/^R01B/.test(a)) return 'oral';             // 전신 비충혈제거제 = 경구
  if (/^S01/.test(a)) return 'ophthalmic';
  if (/^S02/.test(a)) return 'otic';
  if (/^S03/.test(a)) return 'ophthalmic';
  if (/^R01/.test(a)) return 'nasal';
  if (/^R03/.test(a)) return 'inhalation';
  if (/^(R02|A01)/.test(a)) return 'oromucosal';
  if (/^G01/.test(a)) return 'vaginal';
  if (/^D(0[2456890]|1[01])/.test(a)) return 'topical';
  if (/^M02/.test(a)) return 'topical';
  if (/^(A0[234567]|N02|N05|M01|R05|R06)/.test(a)) return 'oral';
  return null;
}
function formRoute(forms: string[]): string | null {
  const f = forms.join(' ');
  if (/점안|안연고/.test(f)) return 'ophthalmic';
  if (/점이/.test(f)) return 'otic';
  if (/점비|비강/.test(f)) return 'nasal';
  if (/좌제|좌약|관장/.test(f)) return /질/.test(f) ? 'vaginal' : 'rectal';
  if (/질정|질좌/.test(f)) return 'vaginal';
  if (/(크림|겔|연고|로션|카타플|플라스타|첩부|파스|외용|액제\(외용\)|에어로솔\(외용\))/.test(f)) return 'topical';
  if (/(흡입)/.test(f)) return 'inhalation';
  if (/(정제|경질캡슐|연질캡슐|산제|과립|시럽|현탁|환제|정|캡슐)/.test(f)) return 'oral';
  return null;
}

// ────────────────────────────── 적격성 필터 ──────────────────────────────
/** 부위 언급(동사 없이 부위만) — 효능·이상반응 등 보조 축에서만 쓴다. */
function siteMentions(text: string): string[] {
  const t = decodeHtml(text);
  const out = new Set<string>();
  for (const s of SITE) if (s.site.test(t)) out.add(s.route);
  return [...out].sort();
}

interface Elig { excluded: boolean; code?: string; evidence?: string }
function eligibility(name: string, eff: string, dos: string, st: Struct): Elig {
  const text = decodeHtml(`${eff}\n${dos}`);
  const dosT = decodeHtml(dos);
  const bodySite = SITE.some((s) => s.site.test(text)) || STRONG.some((s) => s.re.test(text));
  if (st.kinds.length && st.kinds.every((k) => /전문/.test(k))) return { excluded: true, code: 'PRESCRIPTION_ONLY', evidence: `전문일반구분=${st.kinds.join('/')}` };
  if (st.codeCount > 0 && st.cancelled === st.codeCount) return { excluded: true, code: 'CANCELLED_PERMIT', evidence: `표준코드 ${st.codeCount}건 전부 취소일자 존재` };
  if (/수출용|비매품|수출\s*전용/.test(name)) return { excluded: true, code: 'EXPORT_OR_NON_SALE', evidence: `제품명 표기: ${name}` };
  if (/한방건강보험용/.test(text)) {
    return { excluded: true, code: 'HERBAL_INSURANCE_DISPENSING_ONLY',
      evidence: '공식 효능·효과 및 용법·용량 원문이 "이 약은 한방건강보험용입니다" 뿐 — 한방 조제용이며 매장 소비자 OTC 설명서 분모 밖' };
  }
  const irr = /관류|관주/.exec(text);
  if (irr && routeHits(dosT).routes.length === 0) {
    return { excluded: true, code: 'PROCEDURE_IRRIGATION_DILUENT',
      evidence: `공식 효능="${decodeHtml(eff).replace(/\s+/g, ' ').trim().slice(0, 60)}" · 용법="${dosT.replace(/\s+/g, ' ').trim().slice(0, 60)}" — 관류/관주·세정·희석 용도이며 인체 투여 부위·동사 없음${st.atcs[0] ? ` · ATC ${st.atcs[0]}` : ''}` };
  }
  const dev = /멸균기|카트리지|장착|의료기기|기구\s*(?:소독|멸균|세척)|기계|용기\s*소독|세척기|린스\s*소독|치과\s*유닛|투석기/.exec(text);
  if (dev && !bodySite) {
    return { excluded: true, code: 'DEVICE_STERILANT_NON_HUMAN', evidence: `용법·효능에 기구/기기 대상 표현("${dev[0]}") · 인체 적용 부위·동사 없음` };
  }
  const nonhuman = /동물(?:용|에)|축산|가축|어류|수의|인체에 사용하지/.exec(text);
  if (nonhuman) return { excluded: true, code: 'NON_HUMAN_USE', evidence: `비인체 적용 표현: ${nonhuman[0]}` };
  const proc = /수술\s*(?:부위\s*)?(?:전|시)\s*(?:소독|처치)|시술\s*전\s*소독|무균조작|주사\s*부위\s*소독|의료인이 사용/.exec(text);
  if (proc) {
    const body = /환부|피부에 바르|상처/.test(dos);
    if (!body) return { excluded: true, code: 'PROCEDURE_ONLY', evidence: `수술·시술 전용 표현: ${proc[0]}` };
  }
  return { excluded: false };
}

// ────────────────────────────── DB ──────────────────────────────
interface Struct { forms: string[]; atcs: string[]; kinds: string[]; gencodes: string[]; codeCount: number; cancelled: number }
interface Live { name: string; productCode: string | null; easyRows: Array<{ id: string; status: string; content: string; hash: string }>; struct: Struct }

async function fetchLive(pool: Pool, ids: string[]): Promise<Map<string, Live>> {
  const out = new Map<string, Live>();
  const pm = await pool.query(`SELECT id::text, name, mfds_permit_number FROM product_masters WHERE id = ANY($1::uuid[])`, [ids]);
  for (const r of pm.rows) out.set(r.id, { name: r.name, productCode: r.mfds_permit_number ?? null, easyRows: [], struct: { forms: [], atcs: [], kinds: [], gencodes: [], codeCount: 0, cancelled: 0 } });

  const spd = await pool.query(
    `SELECT master_id::text mid, id::text, status, content
       FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE'
        AND source_type='mfds_easy_drug' AND deleted_at IS NULL
        AND COALESCE(language,'ko')='ko'
      ORDER BY master_id, length(content) DESC`, [ids]);
  for (const r of spd.rows) out.get(r.mid)?.easyRows.push({ id: r.id, status: r.status, content: r.content || '', hash: md5(r.content || '') });

  const st = await pool.query(
    `SELECT pi.product_master_id::text mid,
            MIN(pi.identifier_value) AS product_code,
            COUNT(*) AS code_count,
            COUNT(*) FILTER (WHERE COALESCE(pc.raw_payload->'source'->>'취소일자','') <> '') AS cancelled,
            array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'제형구분','')), NULL) AS forms,
            array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'국제표준코드(ATC코드)','')), NULL) AS atcs,
            array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'전문일반구분','')), NULL) AS kinds,
            array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) AS gencodes
       FROM product_identifiers pi
       JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
        AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
      WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL
        AND pi.product_master_id = ANY($1::uuid[])
      GROUP BY 1`, [ids]);
  for (const r of st.rows) {
    const o = out.get(r.mid); if (!o) continue;
    o.productCode = r.product_code;
    o.struct = {
      forms: (r.forms || []).filter(Boolean), atcs: (r.atcs || []).filter(Boolean),
      kinds: (r.kinds || []).filter(Boolean), gencodes: (r.gencodes || []).filter(Boolean),
      codeCount: Number(r.code_count), cancelled: Number(r.cancelled),
    };
  }

  // productCode 보강: 표준코드 조인이 없으면 MFDS_CODE identifier 만이라도 채운다.
  const pid = await pool.query(
    `SELECT product_master_id::text mid, MIN(identifier_value) code FROM product_identifiers
      WHERE product_master_id = ANY($1::uuid[]) AND identifier_type='MFDS_CODE' AND deleted_at IS NULL
      GROUP BY 1`, [ids]);
  for (const r of pid.rows) { const o = out.get(r.mid); if (o && !o.productCode) o.productCode = r.code; }
  return out;
}

/** 이미 authored canonical 이 존재하는 master (SKIP_COMPLETE 분리용). */
async function fetchAuthored(pool: Pool, ids: string[]): Promise<Map<string, { ko: number; en: number }>> {
  const r = await pool.query(
    `SELECT master_id::text mid,
            COUNT(*) FILTER (WHERE COALESCE(language,'ko')='ko') ko,
            COUNT(*) FILTER (WHERE COALESCE(language,'ko')='en') en
       FROM shared_product_descriptions
      WHERE master_id = ANY($1::uuid[]) AND description_type='STORE'
        AND source_type='mfds_drug_otc' AND status='canonical' AND deleted_at IS NULL
      GROUP BY master_id`, [ids]);
  return new Map(r.rows.map((x: any) => [x.mid, { ko: Number(x.ko), en: Number(x.en) }]));
}

/** sourceRef LIVE 점유 확인 (write 0 이지만 재투입 원장의 충돌 0 을 증명). */
async function fetchRefOccupancy(pool: Pool, refs: string[]): Promise<Set<string>> {
  const r = await pool.query(
    `SELECT DISTINCT source_ref_id::text ref FROM shared_product_descriptions
      WHERE source_ref_id = ANY($1::uuid[]) AND deleted_at IS NULL`, [refs]);
  return new Set(r.rows.map((x: any) => x.ref));
}

// ────────────────────────────── 판정 ──────────────────────────────
interface Row {
  masterId: string; productCode: string | null; productName: string;
  priorClassification: string; finalClassification: string;
  resolvedRoute: string | null; routeSet: string[] | null;
  officialBasis: string; officialSourceHash: string | null;
  sectionPresence: Record<string, number>; sectionCount: number;
  composerProfile: string | null; profileStatus: 'EXISTING' | 'NEW_REQUIRED' | 'NEW_REQUIRED_CONFIG_ONLY' | 'N/A';
  profileSpec?: Record<string, unknown>; precondition?: string;
  sourceRef: string | null; expectedWrite: number; productionEligible: boolean;
  terminalCode?: string; reviewableWhen?: string; conflictDetail?: string;
  evidence: {
    dosageRoutes: string[]; dosageHits: Array<{ route: string; kind: string; clause: string }>;
    negatedRoutes: string[]; efficacyRoutes: string[];
    formRoute: string | null; atcRoute: string | null; forms: string[]; atcs: string[];
    easyRowCount: number; easyDistinctContent: number; nameOnlyDecision: false;
  };
  dbWrite: 0; fabrication: 'NONE';
  skipComplete?: boolean;
}

function decide(mid: string, prior: string, live: Live | undefined): Row {
  const base = {
    masterId: mid, productCode: live?.productCode ?? null, productName: live?.name ?? '(unknown)',
    priorClassification: prior, dbWrite: 0 as const, fabrication: 'NONE' as const,
    expectedWrite: 0, productionEligible: false, sourceRef: null as string | null,
    composerProfile: null as string | null, profileStatus: 'N/A' as const,
    resolvedRoute: null as string | null, routeSet: null as string[] | null,
  };
  const empty = { dosageRoutes: [], dosageHits: [], negatedRoutes: [], efficacyRoutes: [], formRoute: null, atcRoute: null, forms: [], atcs: [], easyRowCount: 0, easyDistinctContent: 0, nameOnlyDecision: false as const };

  if (!live || live.easyRows.length === 0) {
    return { ...base, finalClassification: 'TERMINAL_UNRESOLVED', terminalCode: 'OFFICIAL_SOURCE_ABSENT',
      officialBasis: '공식 easy-drug 원문 행 0 — 판정 근거 자체가 없다', officialSourceHash: null,
      sectionPresence: {}, sectionCount: 0,
      reviewableWhen: '공식 e약은요/허가사항 원문이 적재되면 재판정 가능',
      conflictDetail: '원문 부재', evidence: empty } as Row;
  }

  // 원문 버전 다중성: 내용이 실제로 다른 행이 2개 이상이면 source 충돌 후보
  const distinct = [...new Set(live.easyRows.map((r) => r.hash))];
  const primary = live.easyRows[0]; // 가장 긴 원문 = 절단본이 아닌 완본
  const sec = sixSectionsRaw(primary.content);
  const presence: Record<string, number> = {};
  for (const k of CONTENT_SECTIONS) presence[k] = sec[k] && sec[k].trim() ? 1 : 0;
  const sectionCount = Object.values(presence).reduce((a, b) => a + b, 0);
  const dos = sec['용법·용량'] || '';
  const eff = sec['효능·효과'] || '';

  const el = eligibility(live.name, eff, dos, live.struct);
  const dh = routeHits(dos);
  const eh = routeHits(eff);
  const fr = formRoute(live.struct.forms);
  const ar = atcRoute(live.struct.atcs[0] || null);
  const ev = {
    dosageRoutes: dh.routes, dosageHits: dh.hits.map((h) => ({ route: h.route, kind: h.kind, clause: h.clause.slice(0, 120) })),
    negatedRoutes: dh.negatedRoutes, efficacyRoutes: eh.routes,
    formRoute: fr, atcRoute: ar, forms: live.struct.forms, atcs: live.struct.atcs,
    easyRowCount: live.easyRows.length, easyDistinctContent: distinct.length, nameOnlyDecision: false as const,
  };
  const common = { ...base, productName: live.name, officialSourceHash: primary.hash, sectionPresence: presence, sectionCount, evidence: ev };

  if (el.excluded) {
    return { ...common, finalClassification: 'EXCLUDE_NON_HUMAN_USE', terminalCode: el.code,
      officialBasis: `적격성 제외 — ${el.evidence}`, reviewableWhen: '적격성(인체 적용 OTC) 자체가 성립하지 않으므로 재검토 대상 아님',
      conflictDetail: el.evidence } as Row;
  }

  // 필수 섹션 부재 → 저작 불가
  if (!presence['효능·효과'] || !presence['용법·용량']) {
    const miss = CONTENT_SECTIONS.filter((k) => !presence[k]);
    return { ...common, finalClassification: 'TERMINAL_UNRESOLVED', terminalCode: 'MANDATORY_SECTION_MISSING',
      officialBasis: `필수 섹션 부재: ${miss.join(', ')} — 원문 없이 생성 금지`,
      reviewableWhen: '공식 원문에 해당 섹션이 적재되면 재판정 가능', conflictDetail: `누락 섹션 ${miss.join('/')}` } as Row;
  }

  // 원문 의미 충돌(내용이 다른 복수 원문 행이 서로 다른 route 를 지시)
  if (distinct.length >= 2) {
    const perRow = live.easyRows.map((r) => routeHits(sixSectionsRaw(r.content)['용법·용량'] || '').routes.join('+'));
    const uniq = [...new Set(perRow.filter(Boolean))];
    if (uniq.length >= 2) {
      return { ...common, finalClassification: 'TERMINAL_SOURCE_CONFLICT', terminalCode: 'MULTI_SOURCE_ROUTE_DISAGREEMENT',
        officialBasis: `동일 master 에 내용이 다른 공식 원문 ${distinct.length}종이 존재하고 용법이 서로 다른 경로를 지시한다(${uniq.join(' vs ')}). 임의 선택 금지.`,
        reviewableWhen: 'master↔허가품목 연결 정정 또는 공식 원문 단일화 후 재판정',
        conflictDetail: `원문 ${distinct.length}종 · 경로 ${uniq.join(' vs ')}` } as Row;
    }
    // 같은 route 를 지시하면 단순 버전 중복 → 해소하고 계속 진행
    ev.easyDistinctContent = distinct.length;
  }

  const routes = dh.routes;

  // ── 용법 근거 0 → 보조축으로 복구 시도 (서로 다른 축 2개 이상이 같은 경로를 지시할 때만 인정)
  if (routes.length === 0) {
    const advSites = siteMentions(sec['이상반응'] || '');
    const effSites = siteMentions(eff);
    const axes: Array<{ axis: string; route: string }> = [];
    if (fr) axes.push({ axis: `제형구분(${live.struct.forms.join('/')})`, route: fr });
    if (ar) axes.push({ axis: `ATC(${live.struct.atcs[0]})`, route: ar });
    for (const r of eh.routes) axes.push({ axis: '효능·효과 내 투여 동사', route: r });
    // 이상반응 부위 언급은 적용 부위 특이성이 높은 경로(직장·질)만 1표로 계산한다.
    // (발진·구강건조·안구건조 등 전신 이상반응이 부위어로 오검출되는 것을 막는다.)
    for (const r of advSites.filter((x) => x === 'rectal' || x === 'vaginal')) axes.push({ axis: '이상반응 적용부위 언급', route: r });
    if (!axes.length && effSites.length === 1) axes.push({ axis: '효능·효과 부위 언급', route: effSites[0] });

    const tally = new Map<string, number>();
    for (const v of axes) tally.set(v.route, (tally.get(v.route) || 0) + 1);
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const axisDesc = axes.map((a) => `${a.axis}→${a.route}`).join(' / ') || '없음';
    if (best.length && best[0][1] >= 2 && (best.length === 1 || best[0][1] > best[1][1])) {
      const r = best[0][0];
      return single(common, r, `공식 용법·용량에 투여 부위+동사 조합 미검출. 서로 다른 보조축 ${best[0][1]}개가 동일 경로를 지시: ${axisDesc} → ${r} (제품명 미사용)`, prior);
    }
    const nonInstructional = decodeHtml(dos).replace(/\s+/g, ' ').trim().length < 40;
    return { ...common, finalClassification: 'TERMINAL_UNRESOLVED',
      terminalCode: best.length >= 2
        ? (nonInstructional ? 'USAGE_NON_INSTRUCTIONAL_MULTI_USE' : 'SUPPORTING_AXIS_DISAGREEMENT')
        : 'NO_ROUTE_EVIDENCE',
      officialBasis: `공식 용법·용량에 투여 부위+동사 조합이 없고, 보조축도 단일 경로로 수렴하지 않는다(${axisDesc}). 제품명 단독 판정·창작 모두 금지.`,
      reviewableWhen: '공식 용법 원문 보강 또는 표준코드(제형구분·ATC) 적재 후 재판정',
      conflictDetail: `경로 근거 부족 · 보조축=${axisDesc}` } as Row;
  }

  if (routes.length === 1) return single(common, routes[0], `공식 용법·용량 절 단위 근거: ${dh.hits[0].kind} — "${dh.hits[0].clause.slice(0, 80)}"`, prior);

  // ── 복수 route: 공식 원문에 실제로 존재 → 축소 금지
  const hasOral = routes.includes('oral');
  const set = routes;
  const noProfile = set.filter((r) => NO_PROFILE.has(r));
  const basis = `공식 용법·용량에 서로 다른 투여 경로 ${set.length}종이 절 단위로 실재: ` +
    set.map((r) => `${r}("${(dh.hits.find((h) => h.route === r)?.clause || '').slice(0, 40)}")`).join(' / ');

  if (noProfile.length) {
    return { ...common, finalClassification: 'REQUIRES_NEW_ROUTE_PROFILE',
      resolvedRoute: null, routeSet: set, officialBasis: basis,
      composerProfile: `multi-${set.join('+')}`, profileStatus: 'NEW_REQUIRED',
      sourceRef: masterRefV4(mid), expectedWrite: 6, productionEligible: false,
      conflictDetail: `profile 미보유 경로 포함: ${noProfile.join(',')}` } as Row;
  }
  if (hasOral) {
    // 경구 + 비경구 혼재: 기존 비경구 profile 은 ORAL_VERB_RE 를 금지어로 두므로 원문 보존 불가.
    return { ...common, finalClassification: 'REQUIRES_NEW_ROUTE_PROFILE',
      resolvedRoute: null, routeSet: set, officialBasis: basis,
      composerProfile: 'multi-oral-nonoral', profileStatus: 'NEW_REQUIRED',
      sourceRef: masterRefV4(mid), expectedWrite: 6, productionEligible: false,
      conflictDetail: '경구+비경구 혼재 — 기존 비경구 profile 의 경구 동사 금지 규칙과 충돌(원문 손실 위험)' } as Row;
  }
  // 전부 비경구: 기존 비경구 profile 계열과 동일 규칙(사용 안내 + 비경구 동사 재작성 + 경구 동사 금지)으로
  // 원문을 손실 없이 보존할 수 있다. 다만 EN 사용 안내 라벨만 경로 중립 문구가 필요하다(설정 1건 추가).
  return { ...common, finalClassification: 'RECOVERABLE_MULTI_ROUTE_CONTENT',
    resolvedRoute: null, routeSet: set, officialBasis: basis,
    composerProfile: 'multi-nonoral', profileStatus: 'NEW_REQUIRED_CONFIG_ONLY',
    profileSpec: MULTI_NONORAL_SPEC,
    precondition: '배치 로컬 profile 주입(composeKoV3/renderEnV3 의 기존 profiles seam) — 공유 composer·V3/V4 정본 미변경',
    sourceRef: masterRefV4(mid), expectedWrite: 6, productionEligible: true,
    conflictDetail: '' } as Row;
}

function single(common: any, route: string, basis: string, prior: string): Row {
  const cls = prior === 'ROUTE_SOURCE_CONFLICT' ? 'SOURCE_CONFLICT_RESOLVED' : 'RECOVERABLE_SINGLE_ROUTE';
  if (NO_PROFILE.has(route)) {
    return { ...common, finalClassification: 'REQUIRES_NEW_ROUTE_PROFILE', resolvedRoute: route, routeSet: [route],
      officialBasis: basis, composerProfile: route, profileStatus: 'NEW_REQUIRED',
      sourceRef: masterRefV4(common.masterId), expectedWrite: 6, productionEligible: false,
      conflictDetail: `${route} profile 미보유` } as Row;
  }
  return { ...common, finalClassification: cls, resolvedRoute: route, routeSet: [route],
    officialBasis: basis, composerProfile: route, profileStatus: PROFILED.has(route) ? 'EXISTING' : 'NEW_REQUIRED',
    sourceRef: masterRefV4(common.masterId), expectedWrite: 6, productionEligible: true } as Row;
}

/**
 * 복수 비경구 경로 설명서용 profile 사양.
 * 기존 비경구 profile(oromucosal/topical/vaginal/rectal/nasal/ophthalmic)과 규칙이 동일하고
 * EN 사용 안내 라벨만 경로 중립으로 둔다. 특정 경로 라벨을 쓰면 다른 경로 내용을 오도하기 때문이다.
 */
const MULTI_NONORAL_SPEC = {
  key: 'multi-nonoral',
  koUsageLabel: '사용 안내',
  enUsageLabel: 'How to use it',
  koVerbRewrite: 'NONORAL_REWRITE (기존 상수 재사용)',
  koForbidden: 'ORAL_VERB_RE (기존 상수 재사용)',
  enForbidden: 'EN_ORAL_VERB_RE (기존 상수 재사용)',
  routeGate: '경로별 자기 표현 보존 검사를 routeSet 전체에 대해 OR 로 적용 · 타 경로 역전 검사는 routeSet 밖 경로에만 적용',
  injection: 'composeKoV3(..., profiles) / renderEnV3(..., profiles) 배치 로컬 주입 — 공유 composer 수정 없음',
};

const RECOVERABLE = new Set(['RECOVERABLE_SINGLE_ROUTE', 'RECOVERABLE_MULTI_ROUTE_CONTENT', 'SOURCE_CONFLICT_RESOLVED']);

// ────────────────────────────── 혼입 가드 ──────────────────────────────
/** 유효 GREEN 3,404 = 생산 원장 합계 3,407 − 비인체 기구멸균제 철회 3. */
const GREEN_LEDGERS = [
  'otc-v4-pilot-100-green-ledger.ga.json',
  'otc-v4-pilot-500-green-ledger.apply-run1.ga.json',
  'otc-v4-next2000-green-ledger.run-20260729T154307.ga.json',
  'otc-v4-finalall-green-ledger.run-20260729T201556.ga.json',
  'otc-v4-route535-green-ledger.run-ROUTE535FINAL.ga.json',
  'otc-v4-nr26-green-nasal-unit-1.ga.json',
  'otc-v4-nr26-green-rectal-unit-1.ga.json',
];

function guardSets(): { green: Set<string>; sterilant: Set<string>; sourceTerminal: Set<string>; exclude: Set<string> } {
  const sterilant = new Set<string>((J('otc-v4-route535-withdraw-nonhuman.ga.json').rows as any[]).map((r) => r.masterId));
  const green = new Set<string>();
  for (const f of GREEN_LEDGERS) for (const r of J(f).rows as any[]) green.add(r.masterId);
  for (const s of sterilant) green.delete(s); // 철회분은 유효 GREEN 이 아니다
  const sourceTerminal = new Set<string>(
    (J('otc-v4-exception-consolidated-na.ga.json').rows as any[]).filter((r) => r.group === 'source').map((r) => r.masterId),
  );
  const exclude = new Set<string>((J('otc-easy-drug-remaining-3809-exclude-ledger-v1.json').masters as any[]).map((m) => m.mid));
  return { green, sterilant, sourceTerminal, exclude };
}

/** 입력 112 가 기존 확정 집합과 겹치지 않는지 · master 중복이 없는지 점검한다. */
function contaminationGuard(ids: string[]): string[] {
  const msgs: string[] = [];
  const seen = new Set<string>();
  const dup = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
  if (dup.length) msgs.push(`master 중복 ${dup.length} (${dup.slice(0, 3).join(',')})`);

  const s = guardSets();
  const idset = new Set(ids);
  const check: Array<[string, Set<string>, number]> = [
    ['기존 유효 GREEN', s.green, 3404],
    ['source terminal', s.sourceTerminal, 24],
    ['기구 멸균제', s.sterilant, 3],
    ['exclude', s.exclude, 266],
  ];
  for (const [label, set, expect] of check) {
    if (set.size !== expect) msgs.push(`${label} 기준집합 크기 ${set.size} ≠ ${expect}`);
    const hit = [...set].filter((m) => idset.has(m));
    if (hit.length) msgs.push(`${label} 혼입 ${hit.length} (${hit.slice(0, 3).join(',')})`);
  }
  return msgs;
}

// ────────────────────────────── main ──────────────────────────────
async function main(): Promise<void> {
  const carry = J('otc-v4-route-673-carryover-ledger.ga.json');
  const rowsIn = (carry.rows as any[]).filter((r) => IN_CLASSES.has(r.classification));
  const ids = [...new Set(rowsIn.map((r) => r.masterId))].sort();
  if (ids.length !== 112) throw new Error(`SYSTEM STOP: 입력 ${ids.length} ≠ 112`);

  const port = parseInt(arg('--port') || process.env.PROXY_PORT || '5495', 10);
  const pool = new Pool({ host: '127.0.0.1', port, user: 'o4o_api', database: 'o4o_platform', password: process.env.PGPASSWORD || undefined, max: 3 });
  await pool.query('SET default_transaction_read_only = on');

  const live = await fetchLive(pool, ids);
  const authored = await fetchAuthored(pool, ids);
  const occupied = await fetchRefOccupancy(pool, ids.map(masterRefV4));

  const priorOf = new Map(rowsIn.map((r) => [r.masterId, r.classification]));
  const rows: Row[] = ids.map((id) => decide(id, priorOf.get(id)!, live.get(id)));

  // 이미 GREEN/ canonical 존재 → SKIP_COMPLETE
  for (const r of rows) {
    const a = authored.get(r.masterId);
    if (a && a.ko > 0) {
      r.skipComplete = true; r.productionEligible = false;
      r.officialBasis += ` | SKIP_COMPLETE: authored canonical 이미 존재(ko=${a.ko}, en=${a.en})`;
    } else if (r.sourceRef && occupied.has(r.sourceRef)) {
      r.skipComplete = true; r.productionEligible = false;
      r.officialBasis += ' | SKIP_COMPLETE: sourceRef LIVE 점유 존재';
    }
  }
  await pool.end();

  const byFinal: Record<string, number> = {};
  for (const r of rows) byFinal[r.finalClassification] = (byFinal[r.finalClassification] || 0) + 1;
  const byPriorFinal: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    (byPriorFinal[r.priorClassification] ||= {});
    byPriorFinal[r.priorClassification][r.finalClassification] = (byPriorFinal[r.priorClassification][r.finalClassification] || 0) + 1;
  }
  const byRoute: Record<string, number> = {};
  for (const r of rows) {
    const k = r.routeSet ? r.routeSet.join('+') : '(none)';
    byRoute[k] = (byRoute[k] || 0) + 1;
  }

  if (has('--probe')) {
    console.log(JSON.stringify({ input: rows.length, byFinal, byPriorFinal, byRoute }, null, 1));
    const only = arg('--show');
    for (const c of Object.keys(byFinal)) {
      if (only && c !== only) continue;
      const s = rows.filter((r) => r.finalClassification === c);
      console.log('\n== ' + c + ' (' + s.length + ')');
      for (const r of s.slice(0, only ? 100 : 3)) {
        const dos = live.get(r.masterId) ? sixSectionsRaw(live.get(r.masterId)!.easyRows[0].content)['용법·용량'] || '' : '';
        console.log(' -', r.productName, '|', r.resolvedRoute || (r.routeSet || []).join('+'), '|', r.officialBasis.slice(0, 130));
        if (only) console.log('    용법:', decodeHtml(dos).replace(/\s+/g, ' ').slice(0, 220));
      }
    }
    return;
  }

  // ── 혼입 가드 (원장 생성 전 자체 점검 · 독립검증기에서 다시 확인한다)
  const guard = contaminationGuard(ids);
  if (guard.length) throw new Error(`SYSTEM STOP: 혼입 감지 — ${guard.join(' / ')}`);

  const reentry = rows.filter((r) => RECOVERABLE.has(r.finalClassification) && !r.skipComplete);
  const newProfile = rows.filter((r) => r.finalClassification === 'REQUIRES_NEW_ROUTE_PROFILE');
  const terminal = rows.filter((r) => r.finalClassification.startsWith('TERMINAL_') || r.finalClassification === 'EXCLUDE_NON_HUMAN_USE');
  const skip = rows.filter((r) => r.skipComplete);

  const meta = { wo: WO, agent: 'ga', readOnly: true, dbWrite: 0, fabrication: 'NONE' };

  write('otc-v4-carryover112-resolution-ledger.ga.json', {
    ...meta, kind: 'resolution-ledger',
    input: { source: 'otc-v4-route-673-carryover-ledger.ga.json', classes: [...IN_CLASSES], total: rows.length },
    byFinal, byPriorFinal, byRouteSet: byRoute,
    counts: { reentry: reentry.length, requiresNewProfile: newProfile.length, terminal: terminal.length, skipComplete: skip.length },
    rows,
  });

  write('otc-v4-carryover112-agent-ga-reentry.ga.json', {
    ...meta, kind: 'agent-ga-reentry-ledger',
    contract: 'RECOVERABLE 계열 전량 · 별도 Queue WO 없이 agent-ga 가 최종 생산한다. expectedWrite=6T/master.',
    total: reentry.length,
    expectedWriteTotal: reentry.length * 6,
    rows: reentry.map((r) => ({
      masterId: r.masterId, productCode: r.productCode, productName: r.productName,
      priorClassification: r.priorClassification, finalClassification: r.finalClassification,
      resolvedRoute: r.resolvedRoute, routeSet: r.routeSet,
      officialBasis: r.officialBasis, officialSourceHash: r.officialSourceHash,
      officialSectionPresence: r.sectionPresence, officialSectionCount: r.sectionCount,
      composerProfile: r.composerProfile, profileStatus: r.profileStatus,
      profileSpec: r.profileSpec ?? null, precondition: r.precondition ?? null,
      sourceRef: r.sourceRef, expectedWrite: 6, productionEligible: true,
    })),
    profileAddition: { spec: MULTI_NONORAL_SPEC, appliesTo: reentry.filter((r) => r.composerProfile === 'multi-nonoral').length },
    skipComplete: skip.map((r) => ({ masterId: r.masterId, productName: r.productName, reason: r.officialBasis.split('| ').pop() })),
    requiresNewProfile: newProfile.map((r) => ({
      masterId: r.masterId, productName: r.productName, routeSet: r.routeSet, resolvedRoute: r.resolvedRoute,
      requiredProfile: r.composerProfile, why: r.conflictDetail, officialBasis: r.officialBasis,
      sourceRef: r.sourceRef, expectedWrite: 6, productionEligible: false,
    })),
  });

  write('otc-v4-carryover112-terminal-ledger.ga.json', {
    ...meta, kind: 'terminal-ledger',
    contract: 'TERMINAL 계열은 agent-ga 재투입 금지. DB write 0. 원문에 없는 내용 생성 금지.',
    total: terminal.length,
    byCode: terminal.reduce((a: Record<string, number>, r) => { a[r.terminalCode || r.finalClassification] = (a[r.terminalCode || r.finalClassification] || 0) + 1; return a; }, {}),
    rows: terminal.map((r) => ({
      masterId: r.masterId, productCode: r.productCode, productName: r.productName,
      priorClassification: r.priorClassification, finalClassification: r.finalClassification,
      terminalCode: r.terminalCode, officialBasis: r.officialBasis,
      missingOrConflicting: r.conflictDetail, reviewableWhen: r.reviewableWhen,
      officialSectionPresence: r.sectionPresence, dbWrite: 0, fabricationAllowed: false,
    })),
  });

  console.log(JSON.stringify({ input: rows.length, byFinal, reentry: reentry.length, newProfile: newProfile.length, terminal: terminal.length, skip: skip.length }));
}

function write(name: string, obj: any): void {
  fs.writeFileSync(P(name), JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

main().catch((e) => { console.error(e); process.exit(1); });
