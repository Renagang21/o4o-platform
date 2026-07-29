/**
 * WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-100-PRODUCTION-V1
 *   — V4 제품별(master 단위) KO·EN 저작 composer (에이전트 가)
 *
 * V3(content-fp 대표저작) composer 를 **재사용**하되, 제품별 identity 로만 치환한다.
 *   - 본문(효능·용법·안전 4섹션)은 V3 na composer 를 그대로 사용 → 검증된 수치보존·경로동사 게이트 승계.
 *   - 제목 = 해당 master 제품명(사실). 요약표 '선택 포인트' = 해당 master 품목기준코드 기준 문장.
 *     (gencode 다중 master 는 gencode 를 쓰지 않는다 — 타 제품 혼입 방지.)
 *   - 타 master 원문·대표값 사용 0.
 *
 * EN 제목은 한글 잔존 금지 계약상 제품명을 쓸 수 없으므로 route 기반 제형 라벨 + 품목기준코드로 구성한다
 * (원문에 없는 의료 사실 생성 0 — 둘 다 사실 식별자).
 */
import {
  composeKoV3, buildKoV3Html, renderEnV3,
  type KoV3Source, type EnV3Payload, type BuildResult, type EnV3RenderResult,
} from './otc-v3-content-leaflet-composer.na.js';
import { ROUTE_PROFILE } from './otc-v2-store-leaflet-runner.shared.js';

export interface MasterIdentity {
  masterId: string;
  productName: string;
  permitCode: string | null;
  gencode: string | null;
  gencodeCount: number;
  dosageForm: string | null;
  route: string;
}

export interface KoV4Result { source: KoV3Source; anomalies: string[]; build: BuildResult }

/** route → KO 요약표 '분류' 보조 라벨(원장 dosageForm 이 포장단위인 경우 대비). */
const ROUTE_FORM_KO: Record<string, string> = {
  oral: '내복약', oromucosal: '구강용제', topical: '외용제', ophthalmic: '점안제', vaginal: '질용제',
};
/** route → EN 제형 라벨. 제품명 음차 금지, 원문 밖 사실 생성 금지. */
const ROUTE_FORM_EN: Record<string, string> = {
  oral: 'Oral medicine', oromucosal: 'Oromucosal medicine', topical: 'Topical medicine',
  ophthalmic: 'Eye drops', vaginal: 'Vaginal medicine',
};

export function koFormLabel(m: MasterIdentity): string {
  const f = (m.dosageForm || '').trim();
  return f && !/^[0-9]+$/.test(f) && !['개', '통', '병', '포', '매', '없음'].includes(f)
    ? f
    : ROUTE_FORM_KO[m.route] || '일반의약품';
}
export function enFormLabel(route: string): string {
  return ROUTE_FORM_EN[route] || 'Medicine';
}

/** 제품별 KO 저작. sec = 해당 master 자기 공식 6섹션 raw. */
export function composeKoV4(sec: Record<string, string>, m: MasterIdentity): KoV4Result {
  const form = koFormLabel(m);
  // gencode 다중/부재 master 는 gencode 문구를 만들지 않는다(placeholder 로 넘기고 아래에서 치환).
  const r = composeKoV3(sec, m.route, form, m.gencode && m.gencodeCount === 1 ? m.gencode : '__NO_GENCODE__', ROUTE_PROFILE);
  const anomalies = [...r.anomalies];
  const st = r.source.summaryTable;
  if (st['선택 포인트'] && st['선택 포인트'].includes('__NO_GENCODE__')) {
    st['선택 포인트'] = m.permitCode
      ? `이 설명서는 품목기준코드 ${m.permitCode} 제품의 공식 허가사항을 기준으로 작성했습니다. 제품 선택 시 성분과 함량을 확인하세요.`
      : '이 설명서는 해당 제품의 공식 허가사항을 기준으로 작성했습니다. 제품 선택 시 성분과 함량을 확인하세요.';
  }
  const build = buildKoV3Html(r.source, { title: m.productName });
  if (build.missing.length) anomalies.push(`KO 필수필드 누락 ${build.missing.join(',')}`);
  // 타 master 혼입 검사(SYS-02) — 본문에 자기 품목기준코드 외 9자리 허가코드가 없어야 한다.
  if (build.html) {
    const codes = [...build.html.matchAll(/\b(19|20)\d{7}\b/g)].map((x) => x[0]);
    const alien = codes.filter((c) => c !== m.permitCode);
    if (alien.length) anomalies.push(`타 제품 허가코드 혼입 의심: ${[...new Set(alien)].slice(0, 3).join(',')}`);
  }
  return { source: r.source, anomalies, build };
}

/** 제품별 EN 저작 검증. TM 조립 결과 payload 를 route 프로파일로 검증·렌더. */
export function renderEnV4(
  t: Omit<EnV3Payload, 'usageLabel'>,
  route: string,
  officialDosage: string,
): EnV3RenderResult {
  return renderEnV3(t, route, officialDosage, ROUTE_PROFILE);
}

export type { KoV3Source, EnV3Payload };
