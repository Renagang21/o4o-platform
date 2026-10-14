import { isForcedActive } from "@o4o/store-ui-core";
import type {
  StoreAssetItem,
  AssetPublishStatus,
  ChannelMap,
} from "../../../api/assetSnapshot";
import type { SignageMediaItem } from "../../../api/signageMedia";
import type { StorePlaylistItem } from "../../../api/storePlaylist";

/** Single-page video projection; snapshot and direct media retain separate source identities. */
export type SignageStatusFilter =
  | "all"
  | "published"
  | "draft"
  | "hidden"
  | "forced";
export type SignageSortKey = "newest" | "forced-first" | "published-first";
export interface UnifiedVideoItem {
  id: string;
  title: string;
  source: "snapshot" | "direct";
  sourceUrl?: string;
  sourceType?: string;
  publishStatus?: AssetPublishStatus;
  channelMap?: ChannelMap;
  isForced?: boolean;
  isLocked?: boolean;
  forcedStartAt?: string | null;
  forcedEndAt?: string | null;
  createdAt: string;
  _snapshot?: StoreAssetItem;
  _media?: SignageMediaItem;
}

export function buildSignageVideoList(
  snapshots: StoreAssetItem[],
  direct: SignageMediaItem[],
): UnifiedVideoItem[] {
  const copied: UnifiedVideoItem[] = snapshots.map((snapshot) => ({
    id: snapshot.id,
    title: snapshot.title,
    source: "snapshot",
    publishStatus: snapshot.publishStatus,
    channelMap: snapshot.channelMap,
    isForced: snapshot.isForced,
    isLocked: snapshot.isLocked,
    forcedStartAt: snapshot.forcedStartAt,
    forcedEndAt: snapshot.forcedEndAt,
    createdAt: snapshot.createdAt,
    _snapshot: snapshot,
  }));
  const uploaded: UnifiedVideoItem[] = direct.map((media) => ({
    id: `media_${media.id}`,
    title: media.name,
    source: "direct",
    sourceUrl: media.sourceUrl,
    sourceType: media.sourceType,
    createdAt: media.createdAt,
    _media: media,
  }));
  return [...copied, ...uploaded];
}

function matchesStatus(
  video: UnifiedVideoItem,
  status: SignageStatusFilter,
): boolean {
  if (status === "all") return true;
  if (video.source === "direct") return false;
  if (status === "forced")
    return !!video._snapshot && isForcedActive(video._snapshot);
  return video.publishStatus === status;
}
function compareVideos(
  a: UnifiedVideoItem,
  b: UnifiedVideoItem,
  sort: SignageSortKey,
): number {
  // Preserve the existing snapshot-only forced ordering; direct media has no forced policy.
  if (sort === "forced-first" && a._snapshot && b._snapshot) {
    const forcedDifference =
      Number(isForcedActive(b._snapshot)) - Number(isForcedActive(a._snapshot));
    if (forcedDifference) return forcedDifference;
  }
  if (sort === "published-first") {
    const order = { published: 0, draft: 1, hidden: 2 };
    const difference =
      (a.publishStatus ? (order[a.publishStatus] ?? 9) : 9) -
      (b.publishStatus ? (order[b.publishStatus] ?? 9) : 9);
    if (difference) return difference;
  }
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
export function filterSignageVideos(
  videos: UnifiedVideoItem[],
  filter: {
    status: SignageStatusFilter;
    sort: SignageSortKey;
    keyword: string;
  },
): UnifiedVideoItem[] {
  const keyword = filter.keyword.toLowerCase();
  return videos
    .filter((video) => matchesStatus(video, filter.status))
    .filter(
      (video) =>
        !filter.keyword.trim() || video.title.toLowerCase().includes(keyword),
    )
    .sort((a, b) => compareVideos(a, b, filter.sort));
}

export function summarizePlaylistDuration(
  items: ReadonlyArray<Pick<StorePlaylistItem, "contentJson">>,
) {
  let totalSec = 0,
    missingCount = 0;
  for (const item of items) {
    const duration = item.contentJson?.duration as number | undefined;
    if (duration && duration > 0) totalSec += Math.round(duration);
    else missingCount++;
  }
  return { totalSec, missingCount };
}
