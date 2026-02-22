/**
 * Expiring Soon — Forced content expiration warnings
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1
 */

import type { StoreAssetItem } from '../types/snapshot';

export const FORCED_WARN_DAYS = 7;

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function isForcedExpiringSoon(item: StoreAssetItem): boolean {
  if (!item.isForced || !item.forcedEndAt) return false;
  const days = daysUntil(item.forcedEndAt);
  return days >= 0 && days <= FORCED_WARN_DAYS;
}
