/**
 * Capability Registry Types
 * WO-O4O-CAPABILITY-REGISTRY-V1
 */

export type CapabilityCategory = 'commerce' | 'device' | 'marketing' | 'content';

/**
 * capability 가 부여된 근거.
 *
 * WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1 §7:
 *   `cafe24-b2b` = Cafe24 B2B 사업자가 거래처 매장에 후원(sponsored)한 기능.
 *   새 요금/권한 체계를 만들지 않고 기존 source 축에 값 하나만 추가한다.
 *   DB 컬럼은 varchar(20) 이며 CHECK 제약이 없어 추가는 순수 additive 다.
 */
export type CapabilitySource = 'system' | 'admin' | 'plan' | 'cafe24-b2b';

export interface CapabilityMeta {
  key: string;
  label: string;
  category: CapabilityCategory;
  channelType: string | null;
  defaultEnabled: boolean;
  sortOrder: number;
}

export type ServiceKey = 'kpa' | 'cosmetics' | 'glycopharm';
