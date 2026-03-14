/**
 * Store Capability Registry — SSOT
 * WO-O4O-CAPABILITY-REGISTRY-V1
 *
 * 모든 Capability 정의, 라벨, 카테고리, 채널 매핑의 단일 출처.
 */

import type { CapabilityMeta, CapabilitySource } from './types.js';

// ─── Capability Keys ─────────────────────────────────────────

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

// ─── Registry (10 entries) ───────────────────────────────────

export const CAPABILITY_REGISTRY: readonly CapabilityMeta[] = [
  { key: StoreCapability.B2C_COMMERCE,  label: '온라인 스토어',     category: 'commerce',  channelType: 'B2C',    defaultEnabled: true,  sortOrder: 1 },
  { key: StoreCapability.TABLET,        label: '태블릿 주문',       category: 'device',    channelType: 'TABLET', defaultEnabled: false, sortOrder: 2 },
  { key: StoreCapability.KIOSK,         label: '키오스크',          category: 'device',    channelType: 'KIOSK',  defaultEnabled: false, sortOrder: 3 },
  { key: StoreCapability.SIGNAGE,       label: '사이니지',          category: 'device',    channelType: 'SIGNAGE',defaultEnabled: false, sortOrder: 4 },
  { key: StoreCapability.QR_MARKETING,  label: 'QR 마케팅',        category: 'marketing', channelType: null,     defaultEnabled: true,  sortOrder: 5 },
  { key: StoreCapability.POP_PRINT,     label: 'POP 출력',         category: 'marketing', channelType: null,     defaultEnabled: true,  sortOrder: 6 },
  { key: StoreCapability.BLOG,          label: '블로그',            category: 'content',   channelType: null,     defaultEnabled: false, sortOrder: 7 },
  { key: StoreCapability.LIBRARY,       label: '자료실',            category: 'content',   channelType: null,     defaultEnabled: false, sortOrder: 8 },
  { key: StoreCapability.AI_CONTENT,    label: 'AI 콘텐츠',        category: 'content',   channelType: null,     defaultEnabled: false, sortOrder: 9 },
  { key: StoreCapability.LOCAL_PRODUCTS,label: '지역 특산물',       category: 'commerce',  channelType: null,     defaultEnabled: false, sortOrder: 10 },
] as const;

// ─── Derived Lookups ─────────────────────────────────────────

export const CAPABILITY_MAP = new Map<string, CapabilityMeta>(
  CAPABILITY_REGISTRY.map((m) => [m.key, m]),
);

export const DEFAULT_CAPABILITIES: StoreCapabilityKey[] =
  CAPABILITY_REGISTRY.filter((m) => m.defaultEnabled).map((m) => m.key as StoreCapabilityKey);

export const CAPABILITY_CHANNEL_MAP: Record<string, string | null> = Object.fromEntries(
  CAPABILITY_REGISTRY.map((m) => [m.key, m.channelType]),
);

export const CAPABILITY_LABELS: Record<string, string> = Object.fromEntries(
  CAPABILITY_REGISTRY.map((m) => [m.key, m.label]),
);

// ─── Helpers ─────────────────────────────────────────────────

export function getCapabilityMeta(key: string): CapabilityMeta | undefined {
  return CAPABILITY_MAP.get(key);
}

export function getCapabilityLabel(key: string): string {
  return CAPABILITY_MAP.get(key)?.label ?? key;
}

export type { CapabilitySource };
