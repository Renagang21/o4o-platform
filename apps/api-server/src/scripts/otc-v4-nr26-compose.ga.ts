/**
 * WO-O4O-OTC-EASY-DRUG-V4-NASAL14-RECTAL12-ROUTE-PROFILE-FINAL-READINESS-V1
 *   — nasal · rectal 전용 composer 래퍼 (에이전트 가). DB 접근 0.
 *
 * V4 composer(otc-v4-master-leaflet-composer.ga.ts)와 구조는 같고 주입값만 다르다.
 *   - ROUTE_PROFILE → NR_ROUTE_PROFILE (nasal/rectal 전용)
 *   - ROUTE_FORM_KO/EN 결손 보완 → NR_FORM_KO/EN
 *   - V3 게이트(수치·경구동사·필수섹션) 위에 **§6·§7 경로 게이트**를 추가한다.
 *
 * 공용 composer 파일은 한 줄도 고치지 않는다. `profiles` 파라미터만 쓴다
 * (선행 LIVE 배치 3,378건 산출물의 재현성 보존).
 */
import {
  composeKoV3, buildKoV3Html, renderEnV3, toPlain,
  type KoV3Source, type EnV3Payload, type BuildResult, type EnV3RenderResult,
} from './otc-v3-content-leaflet-composer.na.js';
import { CONTENT_SECTIONS } from './otc-v4-master-leaflet-contract.ga.js';
import {
  NR_ROUTE_PROFILE, nrFormKo, nrFormEn, routeGate, type RouteGateResult,
} from './otc-v4-nr26-profile.ga.js';

export interface NrIdentity {
  masterId: string;
  productName: string;
  permitCode: string | null;
  gencode: string | null;
  gencodeCount: number;
  dosageForm: string | null;
  route: string;
}

export interface KoNrResult {
  source: KoV3Source; anomalies: string[]; build: BuildResult; gate: RouteGateResult | null;
}

/** 공식 6섹션 raw → 평문 전체(경로 게이트 대조 기준). */
export function officialAll(sec: Record<string, string>): string {
  return CONTENT_SECTIONS.map((k) => toPlain(sec[k] || '')).filter(Boolean).join('\n');
}

/** 제품별 KO 저작. sec = 해당 master 자기 공식 6섹션 raw. 타 master 원문 혼입 0. */
export function composeKoNR(sec: Record<string, string>, m: NrIdentity): KoNrResult {
  const form = nrFormKo(m.route, m.dosageForm);
  const r = composeKoV3(
    sec, m.route, form,
    m.gencode && m.gencodeCount === 1 ? m.gencode : '__NO_GENCODE__',
    NR_ROUTE_PROFILE,
  );
  const anomalies = [...r.anomalies];
  const st = r.source.summaryTable;
  if (st['선택 포인트'] && st['선택 포인트'].includes('__NO_GENCODE__')) {
    st['선택 포인트'] = m.permitCode
      ? `이 설명서는 품목기준코드 ${m.permitCode} 제품의 공식 허가사항을 기준으로 작성했습니다. 제품 선택 시 성분과 함량을 확인하세요.`
      : '이 설명서는 해당 제품의 공식 허가사항을 기준으로 작성했습니다. 제품 선택 시 성분과 함량을 확인하세요.';
  }
  const build = buildKoV3Html(r.source, { title: m.productName });
  if (build.missing.length) anomalies.push(`KO 필수필드 누락 ${build.missing.join(',')}`);
  // 타 master 혼입 검사 — 본문에 자기 품목기준코드 외 허가코드가 없어야 한다.
  if (build.html) {
    const alien = [...build.html.matchAll(/\b(19|20)\d{7}\b/g)].map((x) => x[0]).filter((c) => c !== m.permitCode);
    if (alien.length) anomalies.push(`타 제품 허가코드 혼입 의심: ${[...new Set(alien)].slice(0, 3).join(',')}`);
  }
  // ── §6·§7 경로 게이트 ────────────────────────────────────────────────────────
  let gate: RouteGateResult | null = null;
  if (build.html) {
    gate = routeGate(
      m.route, 'ko',
      { usage: sec['용법·용량'] || '', all: officialAll(sec) },
      { usage: r.source.usage, all: toPlain(build.html) },
    );
    anomalies.push(...gate.anomalies.map((a) => `KO ${a}`));
  }
  return { source: r.source, anomalies, build, gate };
}

export interface EnNrResult extends EnV3RenderResult { gate: RouteGateResult | null }

/** 제품별 EN 저작 검증. TM 조립 payload 를 nasal/rectal 프로파일로 검증·렌더. */
export function renderEnNR(
  t: Omit<EnV3Payload, 'usageLabel'>,
  route: string,
  sec: Record<string, string>,
): EnNrResult {
  const res = renderEnV3(t, route, sec['용법·용량'] || '', NR_ROUTE_PROFILE);
  let gate: RouteGateResult | null = null;
  const anomalies = [...res.anomalies];
  if (res.html) {
    gate = routeGate(
      route, 'en',
      { usage: sec['용법·용량'] || '', all: officialAll(sec) },
      { usage: t.usage, all: toPlain(res.html) },
    );
    anomalies.push(...gate.anomalies.map((a) => `EN ${a}`));
  }
  return { html: res.html, anomalies, gate };
}

export { nrFormEn };
export type { KoV3Source, EnV3Payload };
