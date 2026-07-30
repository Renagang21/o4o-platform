/**
 * WO-O4O-OTC-EASY-DRUG-V4-CARRYOVER72-FINAL-PRODUCTION-V1
 *   — multi-nonoral(oromucosal + vaginal) **배치 로컬 profile** (에이전트 가)
 *
 * ⚠️ 공유 `ROUTE_PROFILE` · composer · V3/V4 정본을 수정하지 않는다.
 *    `composeKoV3`/`renderEnV3` 가 profiles 를 인자로 받는 seam 을 그대로 이용해
 *    이 배치에서만 쓰는 profile 을 주입한다(WO §8).
 *
 * 대상: 공식 용법에 **구강 내 사용법과 질내 사용법이 실제로 병기된** 30 master(폴리크레줄렌 계열).
 *
 * 설계 판정:
 *   - 두 경로 모두 비경구이므로 koVerbRewrite=NONORAL_REWRITE, 경구 동사는 금지어로 유지한다.
 *     → 어느 한 경로로 축소하지 않으면서 "복용" 류 표현이 새로 들어오는 것을 막는다.
 *   - **라벨은 경로 중립**으로 둔다. `How to use it in the mouth`(oromucosal) 나
 *     `How to insert it`(vaginal) 을 쓰면 다른 한 경로가 제목에서 사라진다.
 *   - enFormLabel/koFormLabel 은 `oromucosal+vaginal` 키가 없어 각각 'Medicine' / '일반의약품' 으로
 *     떨어지며, 이는 단일 경로로 단정하지 않는 중립 표기라 그대로 쓴다.
 */
import {
  composeKoV3, buildKoV3Html, renderEnV3,
  type EnV3Payload, type EnV3RenderResult,
} from './otc-v3-content-leaflet-composer.na.js';
import { ROUTE_PROFILE, type RouteProfile } from './otc-v2-store-leaflet-runner.shared.js';
import { koFormLabel, type MasterIdentity } from './otc-v4-master-leaflet-composer.ga.js';

export const MULTI_ROUTE_KEY = 'oromucosal+vaginal';

/** 경로 중립 라벨 — 두 경로 중 하나만 드러나는 표현을 쓰지 않는다. */
const MULTI_PROFILE: RouteProfile = {
  koUsageLabel: '사용 안내',
  enUsageLabel: 'How to use it',
  koVerbRewrite: ROUTE_PROFILE.vaginal.koVerbRewrite,
  koForbidden: ROUTE_PROFILE.vaginal.koForbidden,
  enForbidden: ROUTE_PROFILE.vaginal.enForbidden,
};

/** 배치 로컬 profiles — 공유 객체를 변형하지 않고 사본에 키만 추가한다. */
export const LOCAL_PROFILES: Record<string, RouteProfile> = { ...ROUTE_PROFILE, [MULTI_ROUTE_KEY]: MULTI_PROFILE };

/** composeKoV4 와 동일 계약. profiles 만 로컬 사본을 넘긴다. */
export function composeKoMulti(sec: Record<string, string>, m: MasterIdentity): { source: any; anomalies: string[]; build: any } {
  const form = koFormLabel(m);
  const r = composeKoV3(sec, m.route, form, m.gencode && m.gencodeCount === 1 ? m.gencode : '__NO_GENCODE__', LOCAL_PROFILES);
  const anomalies = [...r.anomalies];
  const st = r.source.summaryTable;
  if (st['선택 포인트'] && st['선택 포인트'].includes('__NO_GENCODE__')) {
    st['선택 포인트'] = m.permitCode
      ? `이 설명서는 품목기준코드 ${m.permitCode} 제품의 공식 허가사항을 기준으로 작성했습니다. 제품 선택 시 성분과 함량을 확인하세요.`
      : '이 설명서는 해당 제품의 공식 허가사항을 기준으로 작성했습니다. 제품 선택 시 성분과 함량을 확인하세요.';
  }
  const build = buildKoV3Html(r.source, { title: m.productName });
  if (build.missing.length) anomalies.push(`KO 필수필드 누락 ${build.missing.join(',')}`);
  if (build.html) {
    const codes = [...build.html.matchAll(/\b(19|20)\d{7}\b/g)].map((x) => x[0]);
    const alien = codes.filter((c) => c !== m.permitCode);
    if (alien.length) anomalies.push(`타 제품 허가코드 혼입 의심: ${[...new Set(alien)].slice(0, 3).join(',')}`);
  }
  return { source: r.source, anomalies, build };
}

/** renderEnV4 와 동일 계약. profiles 만 로컬 사본. */
export function renderEnMulti(t: Omit<EnV3Payload, 'usageLabel'>, route: string, officialDosage: string): EnV3RenderResult {
  return renderEnV3(t, route, officialDosage, LOCAL_PROFILES);
}
