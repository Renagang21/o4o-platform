/**
 * Tablet idle_media block — config 검증 + dual-read resolver
 *
 * WO-O4O-KPA-TABLET-IDLE-BLOCK-INTEGRATION-V1
 *   "대기화면 = screen set 안의 idle_media block" 원칙의 호환 통합 단계.
 *   - parseIdleMediaConfig: PUT /store/screen-sets/:id/blocks 의 idle_media config 검증/정규화.
 *   - resolveIdleMediaItems: source 별 실효 idle 항목 산출 (순수 함수, DI). **public runtime 미연결** —
 *     이후 PUBLIC-RUNTIME-READ WO 가 legacy 소스를 주입해 재사용한다. 여기선 데이터 이전/DB 접근 없음.
 */

export const IDLE_MEDIA_SOURCES = ['legacy_idle_playlist', 'operator_common', 'custom_media'] as const;
export type IdleMediaSource = (typeof IDLE_MEDIA_SOURCES)[number];

// 기존 idle playlist 항목 타입과 정합 (validateIdlePlaylistItems ALLOWED_TYPES).
export const IDLE_MEDIA_TYPES = ['image', 'video', 'youtube', 'vimeo'] as const;
export type IdleMediaType = (typeof IDLE_MEDIA_TYPES)[number];

const DURATION_MIN_MS = 500;
const DURATION_MAX_MS = 3_600_000; // 1h

export interface IdleMediaItem {
  mediaType: IdleMediaType;
  url: string;
  durationMs?: number;
}

export interface NormalizedIdleMedia {
  source: IdleMediaSource;
  /** block-level 전환/재생 시간 (항목별 durationMs 미지정 시 fallback) */
  durationMs?: number;
  /** custom_media 전용 항목 */
  items?: IdleMediaItem[];
}

export type ParseIdleMediaResult =
  | { ok: true; value: NormalizedIdleMedia }
  | { ok: false; error: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function isValidDuration(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= DURATION_MIN_MS && v <= DURATION_MAX_MS;
}

/**
 * idle_media block config 검증 + 정규화.
 * 규칙: source 필수(허용값), durationMs optional(범위), custom_media 는 items(≥1, mediaType/url) 필수.
 */
export function parseIdleMediaConfig(config: unknown): ParseIdleMediaResult {
  if (!isPlainObject(config)) return { ok: false, error: 'config must be an object' };

  const source = config.source;
  if (typeof source !== 'string' || !IDLE_MEDIA_SOURCES.includes(source as IdleMediaSource)) {
    return { ok: false, error: `config.source must be one of ${IDLE_MEDIA_SOURCES.join(', ')}` };
  }

  const out: NormalizedIdleMedia = { source: source as IdleMediaSource };

  if (config.durationMs !== undefined) {
    if (!isValidDuration(config.durationMs)) {
      return { ok: false, error: `config.durationMs must be a number in [${DURATION_MIN_MS}, ${DURATION_MAX_MS}]` };
    }
    out.durationMs = config.durationMs as number;
  }

  if (source === 'custom_media') {
    const items = config.items;
    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, error: 'config.items must be a non-empty array for custom_media' };
    }
    const normItems: IdleMediaItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!isPlainObject(it)) return { ok: false, error: `config.items[${i}] must be an object` };
      if (typeof it.mediaType !== 'string' || !IDLE_MEDIA_TYPES.includes(it.mediaType as IdleMediaType)) {
        return { ok: false, error: `config.items[${i}].mediaType must be one of ${IDLE_MEDIA_TYPES.join(', ')}` };
      }
      if (typeof it.url !== 'string' || it.url.trim().length === 0) {
        return { ok: false, error: `config.items[${i}].url must be a non-empty string` };
      }
      const item: IdleMediaItem = { mediaType: it.mediaType as IdleMediaType, url: it.url.trim() };
      if (it.durationMs !== undefined) {
        if (!isValidDuration(it.durationMs)) return { ok: false, error: `config.items[${i}].durationMs must be a number in [${DURATION_MIN_MS}, ${DURATION_MAX_MS}]` };
        item.durationMs = it.durationMs as number;
      }
      normItems.push(item);
    }
    out.items = normItems;
  }

  return { ok: true, value: out };
}

/** dual-read 소스 (caller 가 legacy 저장소에서 읽어 주입 — 이 모듈은 DB 접근 없음). */
export interface IdleMediaResolveSources {
  /** store_tablets.idle_playlist_items 에서 변환한 항목 */
  legacyIdlePlaylist?: IdleMediaItem[];
  /** operator common selection 에서 변환한 항목 (0..1) */
  operatorCommon?: IdleMediaItem[];
}

/**
 * 정규화된 idle_media block + 주입된 legacy 소스로 실효 idle 항목 산출.
 * **순수 함수** — public runtime WO 가 재사용. block-level durationMs 는 항목별 미지정 시 fallback.
 */
export function resolveIdleMediaItems(
  normalized: NormalizedIdleMedia,
  sources: IdleMediaResolveSources,
): IdleMediaItem[] {
  let base: IdleMediaItem[];
  switch (normalized.source) {
    case 'legacy_idle_playlist':
      base = sources.legacyIdlePlaylist ?? [];
      break;
    case 'operator_common':
      base = sources.operatorCommon ?? [];
      break;
    case 'custom_media':
      base = normalized.items ?? [];
      break;
    default:
      base = [];
  }
  if (normalized.durationMs !== undefined) {
    return base.map((it) => (it.durationMs === undefined ? { ...it, durationMs: normalized.durationMs } : it));
  }
  return base;
}
