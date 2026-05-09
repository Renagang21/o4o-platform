/**
 * Snapshot Media Extractor
 *
 * WO-O4O-TABLET-IDLE-LIBRARY-SNAPSHOT-SUPPORT-V1
 *
 * 매장 자료함의 o4o_asset_snapshots 항목에서 tablet idle playlist 가 재생 가능한
 * image / video URL 만 추출한다. runtime 은 url 만 사용 — assetId 기반 lookup 미도입.
 *
 * 정책:
 *   - render-ready URL 만 반환 (.mp4 / .webm / 이미지 확장자 또는 절대/상대 경로)
 *   - 외부 embed (youtube 등) 는 즉시 재생 불가 → 제외
 *   - rich block parsing / AI block / nested lesson body 는 본 단계 미지원
 *   - text-only snapshot 은 빈 배열 반환
 *
 * 입력: Record<string, unknown> (contentJson) — 서비스/타입에 의존하지 않는 일반 형태
 * 출력: SnapshotMediaItem[] — LibraryAsset 와 구조적으로 호환
 *   ({ id, title, type: 'image'|'video', url, thumbnail? })
 */

export interface SnapshotMediaItem {
  id: string;
  title: string;
  type: 'image' | 'video';
  url: string;
  thumbnail?: string;
}

export interface SnapshotForMedia {
  id: string;
  assetType: string;
  title: string;
  contentJson: Record<string, unknown> | null | undefined;
}

const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;
const IMAGE_EXT_RE = /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp)(\?.*)?$/i;

function isLikelyValidUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('/');
}

function inferTypeFromUrl(url: string): 'image' | 'video' | null {
  if (VIDEO_EXT_RE.test(url)) return 'video';
  if (IMAGE_EXT_RE.test(url)) return 'image';
  return null;
}

function pickString(json: Record<string, unknown> | null | undefined, key: string): string | undefined {
  if (!json) return undefined;
  const v = json[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

/**
 * 단일 snapshot → SnapshotMediaItem[] (0..N).
 * 동일 snapshot 에서 thumbnail + sourceUrl 두 항목이 모두 추출될 수 있다.
 */
export function extractSnapshotMedia(snapshot: SnapshotForMedia): SnapshotMediaItem[] {
  const out: SnapshotMediaItem[] = [];
  const json = snapshot.contentJson ?? {};
  const baseTitle = snapshot.title || pickString(json, 'title') || '(제목 없음)';

  const push = (suffix: string, url: string, type: 'image' | 'video', titleOverride?: string, thumbnail?: string) => {
    out.push({
      id: `${snapshot.id}:${suffix}`,
      title: titleOverride ?? baseTitle,
      type,
      url,
      thumbnail,
    });
  };

  // signage: mediaType + sourceUrl + thumbnailUrl
  if (snapshot.assetType === 'signage') {
    const sourceType = pickString(json, 'sourceType') ?? '';
    const sourceUrl = pickString(json, 'sourceUrl');
    const thumbnailUrl = pickString(json, 'thumbnailUrl');
    const mediaType = pickString(json, 'mediaType');

    if (sourceUrl && isLikelyValidUrl(sourceUrl)) {
      const inferred = inferTypeFromUrl(sourceUrl);
      // 외부 embed (youtube/vimeo 등) 는 sourceType 으로 거른다 — render 불가.
      const isEmbed = /youtube|vimeo|embed|external/i.test(sourceType);
      if (!isEmbed) {
        const type =
          inferred ??
          (mediaType === 'video' ? 'video' : mediaType === 'image' ? 'image' : null);
        if (type) {
          push('source', sourceUrl, type, undefined, thumbnailUrl);
        }
      }
    }
    return out;
  }

  // cms: imageUrl
  if (snapshot.assetType === 'cms') {
    const imageUrl = pickString(json, 'imageUrl');
    if (imageUrl && isLikelyValidUrl(imageUrl) && inferTypeFromUrl(imageUrl) !== 'video') {
      push('cover', imageUrl, 'image');
    }
    return out;
  }

  // lesson: thumbnail (Reference Metadata, image only)
  if (snapshot.assetType === 'lesson') {
    const thumbnail = pickString(json, 'thumbnail');
    if (thumbnail && isLikelyValidUrl(thumbnail)) {
      push('cover', thumbnail, 'image');
    }
    return out;
  }

  // content / resource: thumbnailUrl + (sourceType=upload AND sourceUrl 미디어 확장자)
  if (snapshot.assetType === 'content' || snapshot.assetType === 'resource') {
    const thumbnailUrl = pickString(json, 'thumbnailUrl');
    if (thumbnailUrl && isLikelyValidUrl(thumbnailUrl) && inferTypeFromUrl(thumbnailUrl) !== 'video') {
      push('cover', thumbnailUrl, 'image', undefined, thumbnailUrl);
    }
    const sourceType = pickString(json, 'sourceType') ?? '';
    const sourceUrl = pickString(json, 'sourceUrl');
    if (sourceUrl && isLikelyValidUrl(sourceUrl)) {
      const isEmbed = /youtube|vimeo|embed|external/i.test(sourceType);
      const inferred = inferTypeFromUrl(sourceUrl);
      // upload/file/direct media 만 — text/외부링크는 제외
      if (!isEmbed && inferred) {
        push('source', sourceUrl, inferred, undefined, thumbnailUrl);
      }
    }
    return out;
  }

  return out;
}

/**
 * snapshot 배열 → SnapshotMediaItem[] (flatMap + dedupe by url)
 */
export function extractSnapshotMediaList(snapshots: SnapshotForMedia[]): SnapshotMediaItem[] {
  const seen = new Set<string>();
  const out: SnapshotMediaItem[] = [];
  for (const snap of snapshots) {
    for (const m of extractSnapshotMedia(snap)) {
      if (seen.has(m.url)) continue;
      seen.add(m.url);
      out.push(m);
    }
  }
  return out;
}
