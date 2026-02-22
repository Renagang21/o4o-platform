/**
 * SnapshotTypeBadge — Snapshot type visual badge
 *
 * WO-O4O-STORE-HUB-CORE-EXTRACTION-V1
 */

import { SNAPSHOT_TYPE_CONFIG } from '../policy/mapping';
import type { SnapshotType } from '../types/snapshot';

export function SnapshotTypeBadge({ type }: { type: SnapshotType }) {
  const cfg = SNAPSHOT_TYPE_CONFIG[type] || SNAPSHOT_TYPE_CONFIG.user_copy;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
