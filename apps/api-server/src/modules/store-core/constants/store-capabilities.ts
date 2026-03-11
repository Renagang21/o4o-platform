/**
 * Store Capability Keys
 * WO-O4O-STORE-CAPABILITY-SYSTEM-V1
 *
 * 매장(Store) 단위로 사용 가능한 기능을 정의한다.
 * Capability는 서비스(KPA/GlycoPharm 등)가 아니라 Store 기준으로 관리한다.
 */

export const StoreCapability = {
  B2C_COMMERCE: 'B2C_COMMERCE',
  TABLET: 'TABLET',
  KIOSK: 'KIOSK',
  QR_MARKETING: 'QR_MARKETING',
  POP_PRINT: 'POP_PRINT',
  SIGNAGE: 'SIGNAGE',
  BLOG: 'BLOG',
  LIBRARY: 'LIBRARY',
  AI_CONTENT: 'AI_CONTENT',
  LOCAL_PRODUCTS: 'LOCAL_PRODUCTS',
} as const;

export type StoreCapabilityKey = (typeof StoreCapability)[keyof typeof StoreCapability];

/** 매장 생성 시 기본 활성화되는 Capability */
export const DEFAULT_CAPABILITIES: StoreCapabilityKey[] = [
  StoreCapability.B2C_COMMERCE,
  StoreCapability.QR_MARKETING,
  StoreCapability.POP_PRINT,
];

/** Capability → Channel 매핑 (capability가 false이면 해당 channel 생성 불가) */
export const CAPABILITY_CHANNEL_MAP: Record<string, string | null> = {
  [StoreCapability.B2C_COMMERCE]: 'B2C',
  [StoreCapability.TABLET]: 'TABLET',
  [StoreCapability.KIOSK]: 'KIOSK',
  [StoreCapability.SIGNAGE]: 'SIGNAGE',
  [StoreCapability.QR_MARKETING]: null,
  [StoreCapability.POP_PRINT]: null,
  [StoreCapability.BLOG]: null,
  [StoreCapability.LIBRARY]: null,
  [StoreCapability.AI_CONTENT]: null,
  [StoreCapability.LOCAL_PRODUCTS]: null,
};

export type CapabilitySource = 'system' | 'admin' | 'plan';
