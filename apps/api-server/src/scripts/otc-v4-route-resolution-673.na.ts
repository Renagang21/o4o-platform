/**
 * WO-O4O-OTC-EASY-DRUG-V4-ROUTE-EXCEPTION-673-BULK-RESOLUTION-V1
 *   — route 예외 673 master 원인별 일괄 판정 (에이전트 나, READ-ONLY)
 *
 * ⚠️ LIVE 설명서 생산·DB write 금지. 공식 원문 + 구조화 데이터 기반 read-only 판정만 수행한다.
 * ⚠️ 제품명은 **판정에 사용하지 않는다**(기록만). 타 master 의 route 를 대표값으로 쓰지 않는다.
 *
 * 근거 우선순위(WO 고정):
 *   1) 공식 용법·용량 원문  2) 공식 효능·효과 원문  3) 제형구분
 *   4) 투여 부위·사용 동사(그 외 섹션)  5) 품목 표준코드(ATC)  6) 기존 route composer 계약
 *
 * 분류: RECOVERABLE_ROUTE_CONFIRMED / REQUIRES_ROUTE_PROFILE / TRUE_MULTI_ROUTE
 *       / ROUTE_SOURCE_CONFLICT / HOLD_UNRESOLVED / EXCLUDE_CONFIRMED
 *
 * 실행: ../../node_modules/.bin/tsx src/scripts/otc-v4-route-resolution-673.na.ts --port 5506
 */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, sixSectionsRaw, CONTENT_SECTIONS, masterRefV4, connect, normalize } from './otc-v4-master-leaflet-contract.ga.js';

const WO = 'WO-O4O-OTC-EASY-DRUG-V4-ROUTE-EXCEPTION-673-BULK-RESOLUTION-V1';
const P = (f: string): string => path.join(DATA_DIR, f);
const J = (f: string): any => JSON.parse(fs.readFileSync(P(f), 'utf8'));
const arg = (n: string): string | undefined => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };

const OUT_LEDGER = P('otc-v4-route-673-resolution-ledger.na.json');
const OUT_GA = P('otc-v4-route-673-agent-ga-reentry.na.json');
const OUT_HOLD = P('otc-v4-route-673-hold-ledger.na.json');
const OUT_RULES = P('otc-v4-route-673-decision-rules.na.md');

/** 기존 composer 가 지원하는 route (otc-v4-master-leaflet-contract COMPOSER_ROUTES 와 동일 집합). */
const SUPPORTED = new Set(['oral', 'topical', 'ophthalmic', 'oromucosal', 'vaginal']);
/** composer profile 이 없는 정밀 route. 신규 profile 준비 대상. */
const UNSUPPORTED = new Set(['nasal', 'rectal', 'otic', 'inhalation']);
/**
 * 기존 profile 로 안전하게 매핑 가능한지에 대한 **참고 정보**(자동 편입 아님).
 * 근거: next2000 LIVE 에서 비강 스프레이·분무 흡입액이 topical profile 로 생산되어 독립검증 통과함
 * (frozen resolver 의 topical 정규식이 뿌리|분무 를 포함하기 때문). 판정은 사용자·후속 WO 몫으로 남긴다.
 */
const MAPPABLE_TO: Record<string, string | null> = { nasal: 'topical', inhalation: 'topical', otic: 'topical', rectal: null };

// ── 부위·동사 사전 (frozen resolver 보다 넓다. frozen 계약은 수정하지 않는다) ──────────
const SITE: Array<{ route: string; re: RegExp }> = [
  { route: 'ophthalmic', re: /점안|눈\s*에|눈에|결막|안구|눈꺼풀|눈\s*안/ },
  { route: 'otic', re: /귀\s*에|귀에|이도|외이|점이|귓/ },
  { route: 'nasal', re: /코\s*에|코에|비강|콧속|콧구멍|점비|코\s*안/ },
  { route: 'vaginal', re: /질\s*(내|강|안|점막)|질\s*에|질에|질\s*세(척|정)|질\s*깊/ },
  { route: 'rectal', re: /항문|직장\s*내|직장에|좌약|관장|치핵|치열/ },
  { route: 'inhalation', re: /흡입|네뷸라이저|기관\s*내|吸入/ },
  { route: 'oromucosal', re: /구강|입\s*안|입안|가글|양치|함수|트로키|설하|혀\s*밑|잇몸|치은|구내|인후\s*(에|를)|목\s*에/ },
  { route: 'topical', re: /바르|발라|도포|붙이|부착|환부|피부\s*에|피부에|문질러|적셔|씻어|닦아|소독|살포|뿌리|분무|스프레이|드레싱|거즈|반창고|파스|찜질|patch/ },
  { route: 'oral', re: /복용|먹|삼키|마시|섭취|경구|식후|식전|물과\s*함께/ },
];
const sitesIn = (t: string): string[] => {
  const n = normalize(t || '');
  return [...new Set(SITE.filter((s) => s.re.test(n)).map((s) => s.route))];
};

/** ATC → route (WHO ATC 1~3자리 표준 축). 명확한 것만 매핑하고 모호하면 null. */
function atcRoute(atc: string | null): { route: string | null; basis: string } {
  if (!atc) return { route: null, basis: 'ATC 부재' };
  const a = atc.toUpperCase();
  const p3 = a.slice(0, 3);
  if (/^D0[2468]|^D1[01]|^D0[59]/.test(p3)) return { route: 'topical', basis: `ATC ${p3} 피부과용` };
  if (p3 === 'M02') return { route: 'topical', basis: 'ATC M02 국소 근골격 통증' };
  if (p3 === 'S01') return { route: 'ophthalmic', basis: 'ATC S01 안과용' };
  if (p3 === 'S02') return { route: 'otic', basis: 'ATC S02 이과용' };
  if (p3 === 'R01') return { route: 'nasal', basis: 'ATC R01 비강용' };
  if (p3 === 'R02') return { route: 'oromucosal', basis: 'ATC R02 인후용' };
  if (p3 === 'A01') return { route: 'oromucosal', basis: 'ATC A01 구강용' };
  if (p3 === 'R03') return { route: 'inhalation', basis: 'ATC R03 흡입 기도용' };
  if (p3 === 'G01') return { route: 'vaginal', basis: 'ATC G01 부인과 항감염' };
  if (/^A0[2-7]|^N02|^N05|^M01|^R05|^R06/.test(p3)) return { route: 'oral', basis: `ATC ${p3} 전신·경구 계열` };
  return { route: null, basis: `ATC ${p3} route 특정 불가` };
}

/** 제형구분(실제로는 포장/제형 혼재 값)에서 route 힌트가 나오는 값만. */
function formRoute(forms: string[]): { route: string | null; basis: string } {
  const s = new Set(forms.filter(Boolean));
  if (s.has('크림') || s.has('겔')) return { route: 'topical', basis: '제형구분 크림/겔' };
  if (s.has('매')) return { route: 'topical', basis: '제형구분 매(첩부제)' };
  if (s.has('정') || s.has('산제') || s.has('포')) return { route: 'oral', basis: '제형구분 정/산제/포' };
  return { route: null, basis: forms.length ? `제형구분 ${[...s].join('/')} route 힌트 없음` : '제형구분 부재' };
}

interface Row { [k: string]: unknown }

async function main(): Promise<void> {
  const con = J('otc-v4-exception-consolidated-na.ga.json');
  const prodExc = con.rows.filter((r: any) => r.group === 'route');
  const selExc = con.selectionExcluded.filter((r: any) => r.group === 'route');
  const origin = new Map<string, { stage: string; code: string; detail: string | null }>();
  for (const r of prodExc) origin.set(r.masterId, { stage: 'production', code: r.exceptionCode, detail: r.detail ?? null });
  for (const r of selExc) if (!origin.has(r.masterId)) origin.set(r.masterId, { stage: 'selection', code: r.reason, detail: r.detail ?? null });
  const ids = [...origin.keys()].sort();

  // 혼입 금지 집합
  const sourceTerminal = new Set<string>(con.rows.filter((r: any) => r.group === 'source').map((r: any) => r.masterId));
  const excl266 = new Set<string>(J('otc-easy-drug-remaining-3809-exclude-ledger-v1.json').masters.map((m: any) => m.mid));
  const greenAll = new Set<string>([
    ...J('otc-v4-pilot-100-green-ledger.ga.json').rows.map((r: any) => r.masterId),
    ...J('otc-v4-pilot-500-green-ledger.apply-run1.ga.json').rows.map((r: any) => r.masterId),
    ...J('otc-v4-next2000-green-ledger.run-20260729T154307.ga.json').rows.map((r: any) => r.masterId),
    ...J('otc-v4-finalall-green-ledger.ga.json').rows.map((r: any) => r.masterId),
  ]);

  const db = await connect();
  const stop: string[] = [];
  try {
    const easy = await db.query(`
      SELECT master_id::text mid, content FROM shared_product_descriptions
       WHERE master_id = ANY($1::uuid[]) AND source_type='mfds_easy_drug' AND description_type='STORE'
         AND status IN ('canonical','deprecated') AND COALESCE(language,'ko')='ko' AND deleted_at IS NULL`, [ids]);
    const easyBy = new Map<string, string>();
    for (const r of easy as any[]) if (!easyBy.has(r.mid) || (r.content || '').length > (easyBy.get(r.mid) || '').length) easyBy.set(r.mid, r.content);

    const std = await db.query(`
      SELECT pi.product_master_id::text mid,
             array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'제형구분','')), NULL) forms,
             array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'국제표준코드(ATC코드)','')), NULL) atcs,
             array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'취소일자','')), NULL) cancels,
             array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'전문일반구분','')), NULL) kinds,
             array_remove(array_agg(DISTINCT NULLIF(pc.raw_payload->'source'->>'일반명코드(성분명코드)','')), NULL) gencodes
        FROM product_identifiers pi
        JOIN product_candidates pc ON pc.raw_payload->>'mfdsCode' = pi.identifier_value
         AND pc.source_label LIKE 'mfds-drug-master-standard-code%' AND pc.deleted_at IS NULL
       WHERE pi.identifier_type='MFDS_CODE' AND pi.deleted_at IS NULL AND pi.product_master_id = ANY($1::uuid[])
       GROUP BY 1`, [ids]);
    const stdBy = new Map(std.map((r: any) => [r.mid, r]));
    const names = await db.query(`SELECT id::text mid, name FROM product_masters WHERE id = ANY($1::uuid[])`, [ids]);
    const nameBy = new Map(names.map((r: any) => [r.mid, r.name]));

    const rows: Row[] = [];
    for (const mid of ids) {
      const content = easyBy.get(mid) ?? null;
      const sec = content ? sixSectionsRaw(content) : Object.fromEntries(CONTENT_SECTIONS.map((k) => [k, '']));
      const s = stdBy.get(mid) as any;
      const forms: string[] = s?.forms ?? [];
      const atcs: string[] = s?.atcs ?? [];
      const cancels: string[] = s?.cancels ?? [];
      const kinds: string[] = s?.kinds ?? [];

      // ── 근거 축별 수집 (우선순위 순서) ─────────────────────────────────────────
      const eDosage = sitesIn(sec['용법·용량']);                       // 1
      const eEffect = sitesIn(sec['효능·효과']);                       // 2
      const fr = formRoute(forms);                                      // 3
      const eOther = sitesIn([sec['경고'], sec['사용상 주의사항'], sec['이상반응'], sec['상호작용']].join('\n')); // 4
      const ar = atcRoute(atcs.length === 1 ? atcs[0] : (atcs.length ? atcs.slice().sort()[0] : null)); // 5

      const evidence = {
        dosageText: eDosage, effectText: eEffect,
        form: { route: fr.route, basis: fr.basis },
        otherSections: eOther,
        atc: { codes: atcs, route: ar.route, basis: ar.basis },
        officialSourcePresent: !!content,
        atcMultiple: atcs.length > 1,
      };

      let cls: string, route: string | null = null, basis = '', detail = '';
      /**
       * 상충 판정 시 후보를 여기에 옮기고 resolvedRoute 는 null 로 둔다.
       * resolvedRoute 에 값이 남아 있으면 하류가 "확정" 으로 오독하고, WO 의 "임의 선택 금지" 에 어긋난다.
       */
      let conflictingCandidates: string[] = [];

      // EXCLUDE — 전건취소 / 전문의약품
      const professional = kinds.some((k) => normalize(k).includes('전문'));
      const allCancelled = cancels.length > 0 && cancels.length >= Math.max(1, atcs.length) && forms.length === 0;
      if (professional) {
        cls = 'EXCLUDE_CONFIRMED'; basis = '전문일반구분=전문';
        detail = `전문의약품(${kinds.join('/')}) — 일반의약품 매장 설명서 대상 아님`;
      } else if (allCancelled) {
        cls = 'EXCLUDE_CONFIRMED'; basis = '표준코드 전건 취소';
        detail = `취소일자 ${cancels.join(',')}`;
      } else if (!content) {
        cls = 'HOLD_UNRESOLVED'; basis = '공식 원문 부재';
        detail = 'e약은요 원문이 없어 용법·효능 축 판정 불가';
      } else {
        // 우선순위 1: 용법 원문
        const nonOralDosage = eDosage.filter((r) => r !== 'oral');
        if (nonOralDosage.length === 1) {
          route = nonOralDosage[0]; basis = '용법 원문 부위·동사 단일';
          detail = `용법 축 ${eDosage.join('/')} → ${route}`;
        } else if (nonOralDosage.length === 0 && eDosage.includes('oral')) {
          route = 'oral'; basis = '용법 원문 경구 동사 단독';
          detail = '용법 축 oral';
        } else if (nonOralDosage.length >= 2) {
          // 실제 복수 경로인지 vs 표현 충돌인지 — 효능·ATC 로 좁힌다
          const narrowed = nonOralDosage.filter((r) => r === ar.route || r === fr.route || eEffect.includes(r));
          if (narrowed.length === 1) {
            route = narrowed[0]; basis = '용법 복수 후보 → 효능·ATC·제형 교차 단일화';
            detail = `용법 ${nonOralDosage.join('/')} 중 교차 일치 ${route}`;
          } else {
            cls = 'TRUE_MULTI_ROUTE'; basis = '용법 원문에 복수 투여 경로 실재';
            detail = `용법 축 ${nonOralDosage.join('/')} — 단일 route composer 강제 편입 금지`;
          }
        }
        // 우선순위 2: 효능 원문 (용법에서 못 정한 경우)
        if (!route && cls! === undefined) {
          const nonOralEffect = eEffect.filter((r) => r !== 'oral');
          if (nonOralEffect.length === 1) { route = nonOralEffect[0]; basis = '효능 원문 부위 단일'; detail = `효능 축 → ${route}`; }
        }
        // 우선순위 3~5: 제형 → 기타 섹션 → ATC. 단독으로는 확정하지 않고 **2축 이상 합치**를 요구한다.
        if (!route && cls! === undefined) {
          const votes: Record<string, string[]> = {};
          const add = (r: string | null, why: string) => { if (r) (votes[r] = votes[r] || []).push(why); };
          add(fr.route, fr.basis);
          for (const r of eOther) add(r, '기타 섹션 부위·동사');
          add(ar.route, ar.basis);
          const agreed = Object.entries(votes).filter(([, w]) => w.length >= 2);
          if (agreed.length === 1) {
            route = agreed[0][0]; basis = '보조 축 2개 이상 합치'; detail = `${agreed[0][1].join(' + ')}`;
          } else if (Object.keys(votes).length === 1 && ar.route && votes[ar.route]) {
            cls = 'HOLD_UNRESOLVED'; basis = 'ATC 단독 근거';
            detail = `${ar.basis} 만 있고 원문 부위·동사 근거 없음 — 단독 확정 금지`;
          } else if (Object.keys(votes).length > 1) {
            cls = 'ROUTE_SOURCE_CONFLICT'; basis = '보조 축 간 상충';
            detail = Object.entries(votes).map(([r, w]) => `${r}(${w.join(';')})`).join(' vs ');
            conflictingCandidates = Object.keys(votes).sort();
          } else {
            cls = 'HOLD_UNRESOLVED'; basis = '근거 축 전무';
            detail = '용법·효능·제형·기타섹션·ATC 어디에서도 route 근거 미검출';
          }
        }
        // 확정된 route 가 있으면 ATC 와의 상충 검사 → 임의 선택 금지
        if (route && cls! === undefined) {
          if (ar.route && ar.route !== route && !(SUPPORTED.has(route) && MAPPABLE_TO[ar.route] === route)) {
            cls = 'ROUTE_SOURCE_CONFLICT'; basis = '원문 route 와 ATC 상충';
            detail = `원문 ${route} vs ${ar.basis} — 임의 선택 금지`;
            conflictingCandidates = [route, ar.route];
            route = null;                                   // 확정하지 않는다
          } else {
            cls = SUPPORTED.has(route) ? 'RECOVERABLE_ROUTE_CONFIRMED'
              : UNSUPPORTED.has(route) ? 'REQUIRES_ROUTE_PROFILE' : 'HOLD_UNRESOLVED';
          }
        }
      }

      rows.push({
        masterId: mid,
        productName: nameBy.get(mid) ?? null,           // 기록 전용 — 판정에 미사용
        originStage: origin.get(mid)!.stage,
        originExceptionCode: origin.get(mid)!.code,
        classification: cls!,
        resolvedRoute: route,
        conflictingCandidates,
        composerSupported: route ? SUPPORTED.has(route) : false,
        mappableToExistingProfile: route && UNSUPPORTED.has(route) ? MAPPABLE_TO[route] : null,
        decisionBasis: basis,
        decisionDetail: detail,
        evidence,
        plannedSourceRef: masterRefV4(mid),
        productNameUsedInDecision: false,
      });
    }

    // ── 게이트 ────────────────────────────────────────────────────────────────
    if (rows.length !== 673) stop.push(`입력 673 != ${rows.length}`);
    if (new Set(rows.map((r) => r.masterId as string)).size !== rows.length) stop.push('master 중복');
    for (const r of rows) {
      if (greenAll.has(r.masterId as string)) stop.push(`기존 GREEN 혼입 ${r.masterId}`);
      if (sourceTerminal.has(r.masterId as string)) stop.push(`source terminal 혼입 ${r.masterId}`);
      if (excl266.has(r.masterId as string)) stop.push(`exclude 266 혼입 ${r.masterId}`);
      if (r.classification === 'RECOVERABLE_ROUTE_CONFIRMED' && !r.decisionBasis) stop.push(`근거 없는 확정 ${r.masterId}`);
    }

    const byClass: Record<string, number> = {};
    const byRoute: Record<string, number> = {};
    const recoverableByRoute: Record<string, number> = {};
    const profileNeedByRoute: Record<string, number> = {};
    for (const r of rows) {
      byClass[r.classification as string] = (byClass[r.classification as string] || 0) + 1;
      const k = (r.resolvedRoute as string) || 'unresolved';
      byRoute[k] = (byRoute[k] || 0) + 1;
      if (r.classification === 'RECOVERABLE_ROUTE_CONFIRMED') recoverableByRoute[k] = (recoverableByRoute[k] || 0) + 1;
      if (r.classification === 'REQUIRES_ROUTE_PROFILE') profileNeedByRoute[k] = (profileNeedByRoute[k] || 0) + 1;
    }
    const recoverable = rows.filter((r) => r.classification === 'RECOVERABLE_ROUTE_CONFIRMED');
    const hold = rows.filter((r) => ['HOLD_UNRESOLVED', 'ROUTE_SOURCE_CONFLICT', 'TRUE_MULTI_ROUTE', 'REQUIRES_ROUTE_PROFILE', 'EXCLUDE_CONFIRMED'].includes(r.classification as string));
    const mappable = rows.filter((r) => r.classification === 'REQUIRES_ROUTE_PROFILE' && r.mappableToExistingProfile);

    const summary = {
      wo: WO, agent: 'na', mode: 'READ-ONLY route resolution', liveDbWrite: 0,
      productNameNeverUsedInDecision: rows.every((r) => r.productNameUsedInDecision === false),
      input: { total: rows.length, fromProductionException: prodExc.length, fromSelectionExcluded: selExc.length },
      byClassification: byClass, byResolvedRoute: byRoute,
      recoverableByRoute, profileNeedByRoute,
      mappableToExistingProfileCount: mappable.length,
      evidencePriority: ['용법·용량 원문', '효능·효과 원문', '제형구분', '기타 섹션 부위·동사', 'ATC 표준코드', 'composer 계약'],
      systemStop: stop,
    };

    fs.writeFileSync(OUT_LEDGER, JSON.stringify({ ...summary, rows }, null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_GA, JSON.stringify({
      wo: WO, producer: 'agent-na', consumer: 'agent-ga', liveDbWrite: 0,
      kind: 'route-recovered-reentry-queue', total: recoverable.length,
      byRoute: recoverableByRoute,
      contract: 'agent-ga 정본 실행기 재투입. sourceRef 는 masterRefV4 로 동일 결정되므로 충돌 없음. route 는 resolvedRoute 를 사용한다.',
      masters: recoverable.map((r) => ({
        masterId: r.masterId, productName: r.productName, resolvedRoute: r.resolvedRoute,
        decisionBasis: r.decisionBasis, decisionDetail: r.decisionDetail,
        originExceptionCode: r.originExceptionCode, plannedSourceRef: r.plannedSourceRef,
      })),
    }, null, 2) + '\n', 'utf8');
    fs.writeFileSync(OUT_HOLD, JSON.stringify({
      wo: WO, producer: 'agent-na', liveDbWrite: 0, kind: 'route-hold-ledger', total: hold.length,
      byClassification: Object.fromEntries(Object.entries(byClass).filter(([k]) => k !== 'RECOVERABLE_ROUTE_CONFIRMED')),
      mappableToExistingProfile: mappable.map((r) => ({ masterId: r.masterId, resolvedRoute: r.resolvedRoute, mappableTo: r.mappableToExistingProfile })),
      rows: hold.map((r) => ({
        masterId: r.masterId, productName: r.productName, classification: r.classification,
        resolvedRoute: r.resolvedRoute, mappableToExistingProfile: r.mappableToExistingProfile,
        decisionBasis: r.decisionBasis, decisionDetail: r.decisionDetail, evidence: r.evidence,
      })),
    }, null, 2) + '\n', 'utf8');

    console.log(JSON.stringify(summary, null, 2));
    if (stop.length) { console.error('\n*** SYSTEM STOP ***'); process.exitCode = 2; }
  } finally { await db.destroy(); }
  void arg;
}
main().catch((e) => { console.error(e); process.exit(1); });
