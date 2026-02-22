/**
 * Policy Gate — Snapshot type permission & state rules
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1
 */

import type { StoreAssetItem } from '../types/snapshot';

/** Is the forced injection currently within its valid period? */
export function isForcedActive(item: StoreAssetItem): boolean {
  if (!item.isForced) return false;
  const now = new Date();
  if (item.forcedStartAt && new Date(item.forcedStartAt) > now) return false;
  if (item.forcedEndAt && new Date(item.forcedEndAt) < now) return false;
  return true;
}

/** Has the forced injection period passed? */
export function isForcedExpired(item: StoreAssetItem): boolean {
  if (!item.isForced || !item.forcedEndAt) return false;
  return new Date(item.forcedEndAt) < new Date();
}

/** user_copy | template_seed → editable */
export function canEdit(item: StoreAssetItem): boolean {
  return item.snapshotType === 'user_copy' || item.snapshotType === 'template_seed';
}

/** user_copy | campaign_push → publish status toggleable */
export function canToggleStatus(item: StoreAssetItem): boolean {
  return item.snapshotType === 'user_copy' || item.snapshotType === 'campaign_push';
}
