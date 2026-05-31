/**
 * Event Offer Service Key Mapping
 *
 * WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
 * WO-O4O-GLYCOPHARM-EVENT-OFFER-SUPPLIER-PROPOSAL-MAPPING-V1: GlycoPharm 대상 활성화
 *
 * Frontend(공급자가 제안할 대상 서비스 선택)는 "platform target service key"를 사용한다.
 * Backend(OPL row)는 "event offer service key"를 사용한다.
 *
 * 두 키 체계는 서로 다르므로(예: K-Cosmetics 서비스 vs K-Cos Event Offer 컨텍스트)
 * 명시적 매핑 테이블을 통해서만 변환한다.
 */

import { SERVICE_KEYS } from './service-keys.js';

/** 공급자가 선택 가능한 platform-level 서비스 키 (UI에 노출) */
export type TargetServiceKey =
  | typeof SERVICE_KEYS.KPA_SOCIETY
  | typeof SERVICE_KEYS.K_COSMETICS
  | typeof SERVICE_KEYS.GLYCOPHARM;

/**
 * platform target → event offer service key 매핑.
 *
 * 신규 서비스 추가 시 이 맵에 항목 추가만으로 확장 가능.
 */
export const TARGET_TO_EVENT_OFFER_KEY: Record<TargetServiceKey, string> = {
  [SERVICE_KEYS.KPA_SOCIETY]:  SERVICE_KEYS.KPA_GROUPBUY,
  [SERVICE_KEYS.K_COSMETICS]:  SERVICE_KEYS.K_COSMETICS_EVENT_OFFER,
  [SERVICE_KEYS.GLYCOPHARM]:   SERVICE_KEYS.GLYCOPHARM_EVENT_OFFER,
};

export function isSupportedTargetServiceKey(key: string): key is TargetServiceKey {
  return key in TARGET_TO_EVENT_OFFER_KEY;
}

/** UI 표시용 라벨 (frontend도 동일 라벨 사용) */
export const TARGET_SERVICE_LABEL: Record<TargetServiceKey, string> = {
  [SERVICE_KEYS.KPA_SOCIETY]: 'KPA Society',
  [SERVICE_KEYS.K_COSMETICS]: 'K-Cosmetics',
  [SERVICE_KEYS.GLYCOPHARM]:  'GlycoPharm',
};
