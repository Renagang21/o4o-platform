/**
 * POP V2 Handoff Contract — WO-O4O-POP-HUB-LIBRARY-HANDOFF-TO-V2-CANONICAL-V1
 *
 * HUB / 자료함 / 제작 자료 / 매장 자체 상품 화면에서 "POP 만들기" 를 눌렀을 때
 * POP V2 편집기로 넘기는 **최소** 계약이다.
 *
 * 이 계약이 `ProductionRouterState` 의 복제가 아닌 이유 (§3·§4):
 *   - `production.target`        → V2 route 자체가 target 이므로 불필요 (LEGACY_ONLY)
 *   - `production.source.fromLibrary` → 진입 탭 표시용일 뿐 V2 seed 에 쓰이지 않는다 (UNUSED)
 *   - `items[].title/description` → 서버 source resolver 가 다시 읽는다 (DERIVABLE_IN_V2)
 *   - `selectedTemplateId`       → V2 는 adapter 의 defaultTemplateId 를 쓴다 (LEGACY_ONLY)
 *   - `items[]` 배열              → V2 문서는 진입 시 1개 source 로 시작하고,
 *                                  나머지는 편집기 안의 콘텐츠 선택으로 이어붙인다.
 *
 * 원칙
 *   - 원본 Content SSOT 를 수정하지 않는다. handoff 는 **새 POP Document 의 초기값 제안**일 뿐이다.
 *   - 본문 전체를 router state 에 싣지 않는다. **식별자만** 넘기고 서버가 다시 해석한다.
 *   - 저장 전에는 canonical POP Document 가 아니다.
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import type { PopV2SourceOrigin } from './types';

/** 콘텐츠 축 origin — V2 source resolver 가 읽을 수 있는 매장 원장만 허용한다. */
export type PopV2HandoffContentOrigin = Extract<
  PopV2SourceOrigin,
  'direct' | 'snapshot' | 'library' | 'store_pop'
>;

/** 상품 축 origin — V2 product source resolver 의 sourceType 과 같은 어휘. */
export type PopV2HandoffProductOrigin = 'listing' | 'local';

export interface PopV2HandoffContentInput {
  sourceKind: 'content';
  origin: PopV2HandoffContentOrigin;
  /** 해당 원장의 식별자. 본문·이미지는 싣지 않는다. */
  sourceId: string;
  /** 표시용 hint. 신뢰 대상이 아니며 서버 해석 결과가 우선한다. */
  suggestedTitle?: string;
}

export interface PopV2HandoffProductInput {
  sourceKind: 'product';
  origin: PopV2HandoffProductOrigin;
  sourceId: string;
  suggestedTitle?: string;
}

export type PopV2HandoffInput = PopV2HandoffContentInput | PopV2HandoffProductInput;

/** router state 안의 키 — 기존 `production` 키와 섞이지 않게 별도 이름을 쓴다. */
export const POP_V2_HANDOFF_STATE_KEY = 'popV2Handoff' as const;

export interface PopV2HandoffRouterState {
  popV2Handoff: PopV2HandoffInput;
}

export function buildPopV2HandoffState(input: PopV2HandoffInput): PopV2HandoffRouterState {
  return { popV2Handoff: input };
}

const CONTENT_ORIGINS: readonly string[] = ['direct', 'snapshot', 'library', 'store_pop'];
const PRODUCT_ORIGINS: readonly string[] = ['listing', 'local'];

/**
 * location.state → handoff 파서.
 * 알 수 없는 origin 은 조용히 무시한다(잘못된 원장을 참조한 채 저장되는 것보다 안전하다).
 */
export function parsePopV2HandoffState(locationState: unknown): PopV2HandoffInput | undefined {
  const raw: unknown = (locationState as Record<string, unknown> | null)?.[
    POP_V2_HANDOFF_STATE_KEY
  ];
  if (!raw || typeof raw !== 'object') return undefined;
  const { sourceKind, origin, sourceId, suggestedTitle } = raw as Record<string, unknown>;
  if (typeof sourceId !== 'string' || !sourceId) return undefined;
  const title = typeof suggestedTitle === 'string' ? suggestedTitle : undefined;
  if (sourceKind === 'content' && typeof origin === 'string' && CONTENT_ORIGINS.includes(origin)) {
    return {
      sourceKind: 'content',
      origin: origin as PopV2HandoffContentOrigin,
      sourceId,
      suggestedTitle: title,
    };
  }
  if (sourceKind === 'product' && typeof origin === 'string' && PRODUCT_ORIGINS.includes(origin)) {
    return {
      sourceKind: 'product',
      origin: origin as PopV2HandoffProductOrigin,
      sourceId,
      suggestedTitle: title,
    };
  }
  return undefined;
}

/**
 * POP V2 편집기의 canonical 진입 route.
 *
 * KPA · K-Cosmetics 는 `/store/*` 트리를 공유하므로 이 값이 그대로 맞다.
 * Pharmacy-Hub 는 `/store-owner/*` 트리라 이 상수를 쓰지 않는다 — 공통 컴포넌트에서
 * 해당 액션을 `null` 로 숨기거나 서비스 override 로 교체한다.
 * **공통 Core 에 serviceKey 분기를 넣지 않는다.**
 */
export const CANONICAL_STORE_POP_V2_ROUTE = '/store/marketing/pop-v2';

/**
 * router state 의 handoff 를 **1회만** 소비하는 hook.
 *
 * 읽은 뒤 history state 를 지운다. 그렇게 하지 않으면 저장 후 목록으로 돌아가
 * "새 POP" 을 눌렀을 때 같은 소스가 다시 주입된다.
 */
export function usePopV2Handoff(): PopV2HandoffInput | undefined {
  const location = useLocation();
  const navigate = useNavigate();
  const [handoff] = useState(() => parsePopV2HandoffState(location.state));

  useEffect(() => {
    if (!handoff) return;
    navigate(location.pathname + location.search, { replace: true, state: null });
    // 최초 1회만 — location 이 바뀌어도 재실행하지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return handoff;
}

/**
 * 자료함/제작자료 화면의 `ProductionSourceItem` → POP V2 handoff 변환.
 *
 * `origin='local'` 은 매장 자체 상품이므로 상품 축으로 넘어간다.
 * 나머지는 콘텐츠 축이며 V2 source resolver 가 같은 어휘로 읽는다.
 * 본문·설명은 옮기지 않는다 — 제목만 표시용 hint 로 남긴다.
 */
export function popV2HandoffFromProductionItem(item: {
  id: string;
  title?: string | null;
  origin: 'snapshot' | 'direct' | 'library' | 'local';
}): PopV2HandoffInput {
  const suggestedTitle = item.title || undefined;
  if (item.origin === 'local') {
    return { sourceKind: 'product', origin: 'local', sourceId: item.id, suggestedTitle };
  }
  return { sourceKind: 'content', origin: item.origin, sourceId: item.id, suggestedTitle };
}
