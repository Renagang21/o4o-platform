/**
 * OTC 설명서 투여경로(route) 파생 — **제형명 추정 금지**
 *
 * WO-O4O-OTC-ROUTE-SIGNAL-ENRICHMENT-V1 · 규칙 **DR-019**
 *
 * 경로를 틀리면 질정을 "take/swallow" 로 옮기는 오역·오투여로 직결된다(G-01).
 * 따라서 **추정하지 않는다** — 명시적 신호가 없으면 `needs_review` 로 남긴다.
 *
 * 신호 우선순위 (실측 근거 = CHECK-O4O-OTC-ROUTE-SIGNAL-ENRICHMENT-V1):
 *   1. `groupKey` 의 route 축 (`drug_otc::{single|combo}::{route}::…`) — DR-010 규격. 명시값.
 *   2. `usageLabel` — 작성자가 경로에 따라 고른 값(복용 안내=경구 / 사용 안내=비경구). 추정이 아니라 저작 신호.
 *   3. `usageLabel='사용 안내'` 인 경우에 한해, 성분·제목의 **명시적 제형 토큰**(질정·좌제·점안액 등)으로 구체 경로 확정.
 *
 * 절대 쓰지 않는 것:
 *   - **`doseForm`** — 경로 정보가 없고 값도 불일치한다(실측: 정 38 / tablet 15 / 캡슐 15 / soft_capsule 7 / null 6 …).
 *     `doseForm='정'` 은 경구정과 질정을 구분하지 못한다.
 *   - **본문 키워드 매칭** — 오탐이 실증됐다(디오스민 경구정의 "항문검사" → rectal 오분류).
 *   - **translatorNote** — 내부 주석을 값으로 자동 저장하지 않는다(CR-021).
 */

/** 최소 경로값. 확장 시 이 union 과 ROUTE_TOKENS 를 함께 수정한다. */
export type OtcRoute =
  | 'oral'
  | 'vaginal'
  | 'topical'
  | 'ophthalmic'
  | 'rectal'
  | 'inhalation'
  | 'transdermal';

export type OtcRouteConfidence = 'group_key' | 'usage_label' | 'form_token' | 'needs_review';

export interface OtcRouteResult {
  /** 확정된 경로. 근거가 불충분하면 null (추정하지 않는다). */
  route: OtcRoute | null;
  /** 판별 근거. `needs_review` = 사람이 확인해야 함. */
  basis: OtcRouteConfidence;
  /** 사람이 볼 사유. needs_review 일 때 필수. */
  reason: string;
  /** 경로에 맞는 안내 라벨. route 미확정이면 null. */
  expectedUsageLabel: '복용 안내' | '사용 안내' | null;
  /** 초안의 usageLabel 이 경로와 어긋남 → 검토 대상. */
  usageLabelMismatch: boolean;
}

export interface OtcRouteSource {
  groupKey?: string | null;
  usageLabel?: string | null;
  summaryTable?: Record<string, string> | null;
  /** 그룹 대표 제목. 제형 토큰이 명시된 경우가 있다(예: "클로트리마졸 100mg 질정"). */
  title?: string | null;
}

/** groupKey route 축(DR-010) → OtcRoute */
const GROUP_KEY_ROUTE: Record<string, OtcRoute> = {
  oral: 'oral',
  vaginal: 'vaginal',
  topical: 'topical',
  ophthalmic: 'ophthalmic',
  rectal: 'rectal',
  inhalation: 'inhalation',
  transdermal: 'transdermal',
};

/**
 * **명시적 제형 토큰** → 경로. 본문 서술이 아니라 제형명이다.
 * 경구 제형(정·캡슐 등)은 여기 두지 않는다 — 질정도 '정' 이라 구분이 안 되기 때문(DR-019).
 */
const ROUTE_TOKENS: { pattern: RegExp; route: OtcRoute }[] = [
  { pattern: /질정/, route: 'vaginal' },
  { pattern: /좌제|좌약/, route: 'rectal' },
  { pattern: /점안(액|제)?/, route: 'ophthalmic' },
  { pattern: /연고|크림|겔제|외용액|외용제/, route: 'topical' },
  { pattern: /플라스타|패치|첩부/, route: 'transdermal' },
  { pattern: /흡입(액|제)?|분무제/, route: 'inhalation' },
];

const ROUTE_LABEL: Record<OtcRoute, '복용 안내' | '사용 안내'> = {
  oral: '복용 안내',
  vaginal: '사용 안내',
  topical: '사용 안내',
  ophthalmic: '사용 안내',
  rectal: '사용 안내',
  inhalation: '사용 안내',
  transdermal: '사용 안내',
};

/** `drug_otc::combo::oral::A06AB52` → 'oral'. route 축이 없는 형식(`성분|함량|제형`)이면 null. */
function routeFromGroupKey(groupKey: string | null | undefined): OtcRoute | null {
  if (!groupKey || !groupKey.includes('::')) return null;
  for (const seg of groupKey.split('::')) {
    const r = GROUP_KEY_ROUTE[seg.trim().toLowerCase()];
    if (r) return r;
  }
  return null;
}

/** 성분 표기·제목의 명시적 제형 토큰 → 경로. 본문(usage/caution)은 보지 않는다(오탐 방지). */
function routeFromFormToken(src: OtcRouteSource): OtcRoute | null {
  const hay = [src.title ?? '', src.summaryTable?.['성분'] ?? ''].join(' ');
  for (const { pattern, route } of ROUTE_TOKENS) if (pattern.test(hay)) return route;
  return null;
}

/**
 * 투여경로 파생. 근거가 없으면 **추정하지 않고** `route=null, basis='needs_review'`.
 */
export function deriveOtcRoute(src: OtcRouteSource): OtcRouteResult {
  const label = (src.usageLabel ?? '').trim();
  const formToken = routeFromFormToken(src);

  // 1) groupKey route 축 = 명시값(최우선)
  const gkRoute = routeFromGroupKey(src.groupKey);
  if (gkRoute) {
    // 명시 제형 토큰과 어긋나면 자동 확정하지 않는다(예: groupKey=oral 인데 성분에 '질정').
    if (formToken && formToken !== gkRoute) {
      return {
        route: null,
        basis: 'needs_review',
        reason: `groupKey route='${gkRoute}' 와 제형 토큰='${formToken}' 불일치 — 사람 확인 필요`,
        expectedUsageLabel: null,
        usageLabelMismatch: false,
      };
    }
    return finish(gkRoute, 'group_key', `groupKey route 축='${gkRoute}'`, label);
  }

  // 2) 비경구(사용 안내) → 구체 경로는 명시 제형 토큰으로만 확정
  if (label === '사용 안내') {
    if (formToken) {
      return finish(formToken, 'form_token', `usageLabel='사용 안내' + 제형 토큰='${formToken}'`, label);
    }
    return {
      route: null,
      basis: 'needs_review',
      reason: "usageLabel='사용 안내'(비경구)이나 명시적 제형 토큰이 없어 구체 경로 미확정 — 추정하지 않음",
      expectedUsageLabel: '사용 안내',
      usageLabelMismatch: false,
    };
  }

  // 3) 경구(복용 안내) = 작성자 저작 신호
  if (label === '복용 안내') {
    // '복용 안내' 인데 비경구 제형 토큰이 보이면 모순 → 검토
    if (formToken) {
      return {
        route: null,
        basis: 'needs_review',
        reason: `usageLabel='복용 안내'(경구)이나 제형 토큰='${formToken}'(비경구) 모순 — 사람 확인 필요`,
        expectedUsageLabel: null,
        usageLabelMismatch: true,
      };
    }
    return finish('oral', 'usage_label', "usageLabel='복용 안내'", label);
  }

  return {
    route: null,
    basis: 'needs_review',
    reason: `경로 신호 없음(usageLabel=${label || 'null'}, groupKey route 축 없음) — doseForm 으로 추정하지 않음(DR-019)`,
    expectedUsageLabel: null,
    usageLabelMismatch: false,
  };
}

function finish(
  route: OtcRoute,
  basis: OtcRouteConfidence,
  reason: string,
  actualLabel: string,
): OtcRouteResult {
  const expected = ROUTE_LABEL[route];
  return {
    route,
    basis,
    reason,
    expectedUsageLabel: expected,
    usageLabelMismatch: actualLabel !== '' && actualLabel !== expected,
  };
}
