/**
 * Channel API Client for Signage Player
 * WO-P5-SIGNAGE-PLAYER-WEB-P0
 *
 * WO-O4O-SIGNAGE-PLAYER-CHANNEL-CODE-LOOKUP-CONTRACT-CLOSURE-V1
 *
 * 이 클라이언트는 `/api/v1/channels` (CMS channels 축)를 쓴다.
 * (`SignagePlayerPage` 계열이 쓰는 `/api/signage/:serviceKey/*` 는 다른 축이다.)
 *
 * 서버 계약(확정):
 *   - 목록 `GET /channels` 는 **enumeration** 이며 serviceKey 를 요구한다.
 *     player 는 serviceKey 를 갖지 않으므로 목록을 호출하지 않는다.
 *   - code 단건 조회는 `GET /channels/code/:code` 가 canonical 이다(익명 허용).
 *   - 모든 단건 응답은 `{ success, data }` envelope 이다.
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr'

export type ChannelType = 'tv' | 'kiosk' | 'signage' | 'web'
export type ChannelStatus = 'active' | 'inactive' | 'maintenance'
export type Orientation = 'landscape' | 'portrait'

export interface Channel {
  id: string
  organizationId: string | null
  serviceKey: string | null
  name: string
  code: string | null
  description?: string
  type: ChannelType
  slotKey: string
  status: ChannelStatus
  resolution?: string
  orientation: Orientation
  autoplay: boolean
  refreshIntervalSec: number | null
  defaultDurationSec: number
  location?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * player 가 실제로 사용하는 슬롯/콘텐츠 형태.
 *
 * 서버 `GET /channels/:id/contents` 는
 *   { slotId, sortOrder, startsAt, endsAt, content: { id, type, title, summary, body, imageUrl, ... } }
 * 를 돌려준다. 렌더러(ContentRenderer/getContentDuration)가 쓰는 이름과 다르므로
 * **adapter 에서 서버 필드를 그대로 옮겨 담는다** — 새 필드를 만들어내지 않는다.
 */
export interface ChannelContent {
  slotId: string
  displayOrder: number
  startDate: string | null
  endDate: string | null
  content: {
    id: string
    title: string
    contentType: string
    body?: string
    excerpt?: string
    featuredImage?: string
    metadata?: Record<string, unknown>
  }
}

export interface ChannelContentsResponse {
  channel: Channel
  contents: ChannelContent[]
  totalCount: number
}

/** 서버 공통 envelope. */
interface ApiEnvelope<T> {
  success: boolean
  data: T
  error?: { code: string; message: string }
}

/** 서버 `/channels/:id/contents` 원본 응답. */
interface ServerChannelContentsResponse {
  success: boolean
  data: Array<{
    slotId: string
    sortOrder: number
    startsAt: string | null
    endsAt: string | null
    content: {
      id: string
      type: string
      title: string
      summary: string | null
      body: string | null
      imageUrl: string | null
      linkUrl: string | null
      linkText: string | null
      metadata: Record<string, unknown>
    }
  }>
  channel: Channel
  meta: { total: number; fetchedAt?: string; message?: string }
}

/**
 * Fetch channel by ID
 */
export async function fetchChannel(channelId: string): Promise<Channel> {
  const response = await fetch(`${API_URL}/api/v1/channels/${encodeURIComponent(channelId)}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Channel not found')
    }
    throw new Error(`Failed to fetch channel: ${response.status}`)
  }

  return unwrapChannel(await response.json())
}

/**
 * Fetch channel by code — canonical exact lookup.
 *
 * 이전 구현은 `GET /channels?code=` 로 **목록 endpoint** 를 호출한 뒤 `data[0]` 을 썼다.
 * 서버에는 `code` 목록 필터가 구현된 적이 없어서 그 호출은 필터가 무시된 전체 목록의
 * 임의 첫 채널을 돌려주고 있었다(= 잘못된 채널 재생). 목록은 이제 serviceKey 를
 * 요구하므로 400 이기도 하다. 단건 주소 조회는 처음부터 존재하던 `/channels/code/:code`
 * 가 canonical 이다 — 목록 계약을 되살리지 않고 이쪽으로 수렴한다.
 */
export async function fetchChannelByCode(code: string): Promise<Channel> {
  const response = await fetch(`${API_URL}/api/v1/channels/code/${encodeURIComponent(code)}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Channel not found')
    }
    throw new Error(`Failed to fetch channel: ${response.status}`)
  }

  return unwrapChannel(await response.json())
}

/** 단건 응답 envelope 을 벗긴다. envelope 자체를 Channel 로 취급하면 id 가 undefined 가 된다. */
function unwrapChannel(payload: ApiEnvelope<Channel> | Channel): Channel {
  const channel = (payload as ApiEnvelope<Channel>)?.data ?? (payload as Channel)
  if (!channel || !channel.id) {
    throw new Error('Channel not found')
  }
  return channel
}

/**
 * Fetch channel contents for playback
 */
export async function fetchChannelContents(channelId: string): Promise<ChannelContentsResponse> {
  const response = await fetch(`${API_URL}/api/v1/channels/${encodeURIComponent(channelId)}/contents`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Channel not found')
    }
    throw new Error(`Failed to fetch channel contents: ${response.status}`)
  }

  const payload = (await response.json()) as ServerChannelContentsResponse

  // 서버 필드명을 렌더러가 쓰는 이름으로 옮긴다(값의 의미는 그대로다).
  const contents: ChannelContent[] = (payload.data ?? []).map((slot) => ({
    slotId: slot.slotId,
    displayOrder: slot.sortOrder,
    startDate: slot.startsAt,
    endDate: slot.endsAt,
    content: {
      id: slot.content.id,
      title: slot.content.title,
      contentType: slot.content.type,
      body: slot.content.body ?? undefined,
      excerpt: slot.content.summary ?? undefined,
      featuredImage: slot.content.imageUrl ?? undefined,
      metadata: slot.content.metadata,
    },
  }))

  return {
    channel: payload.channel,
    contents,
    totalCount: payload.meta?.total ?? contents.length,
  }
}

/**
 * Check if channel is playable
 */
export function isChannelPlayable(channel: Channel): boolean {
  return channel.status === 'active'
}

/**
 * Get effective duration for content
 */
export function getContentDuration(
  content: ChannelContent,
  defaultDurationSec: number
): number {
  // Check if content has custom duration in metadata
  const customDuration = content.content.metadata?.durationSec as number | undefined
  if (customDuration && customDuration > 0) {
    return customDuration * 1000 // Convert to ms
  }

  // Video content - use video duration (handled by video element)
  if (content.content.contentType === 'video') {
    return 0 // Signal to use video duration
  }

  // Default duration from channel settings
  return defaultDurationSec * 1000
}

// ============================================================================
// PLAYBACK LOGGING (WO-P5-CHANNEL-PLAYBACK-LOG-P0)
// ============================================================================

export interface PlaybackLogRequest {
  contentId: string
  durationSec: number
  completed: boolean
  playedAt: string
}

/**
 * Send playback log to server
 * Fire-and-forget: failures should not affect player operation
 */
export async function sendPlaybackLog(
  channelId: string,
  log: PlaybackLogRequest
): Promise<void> {
  try {
    await fetch(`${API_URL}/api/v1/channels/${channelId}/playback-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
    })
    // Intentionally ignore response - fire and forget
  } catch (error) {
    // Silently ignore errors - don't disrupt player operation
    console.debug('Playback log failed (ignored):', error)
  }
}

// ============================================================================
// HEARTBEAT (WO-P5-CHANNEL-HEARTBEAT-P1)
// ============================================================================

export interface HeartbeatRequest {
  playerVersion?: string
  deviceType?: string
  platform?: string
  uptimeSec?: number
  metrics?: Record<string, unknown>
}

// Player version constant
const PLAYER_VERSION = '1.0.0'

// Detect device type and platform
function detectDeviceInfo(): { deviceType: string; platform: string } {
  const ua = navigator.userAgent.toLowerCase()

  let deviceType = 'web'
  let platform = 'unknown'

  // Detect device type
  if (ua.includes('tizen')) {
    deviceType = 'tv'
    platform = 'tizen'
  } else if (ua.includes('webos')) {
    deviceType = 'tv'
    platform = 'webos'
  } else if (ua.includes('android')) {
    if (ua.includes('tv') || ua.includes('aftm') || ua.includes('aftb')) {
      deviceType = 'tv'
    } else {
      deviceType = 'kiosk'
    }
    platform = 'android'
  } else if (ua.includes('chrome')) {
    platform = 'chrome'
  } else if (ua.includes('firefox')) {
    platform = 'firefox'
  } else if (ua.includes('safari')) {
    platform = 'safari'
  } else if (ua.includes('edge')) {
    platform = 'edge'
  }

  return { deviceType, platform }
}

/**
 * Send heartbeat to server
 * Fire-and-forget: failures should not affect player operation
 */
export async function sendHeartbeat(
  channelId: string,
  uptimeSec: number
): Promise<void> {
  try {
    const { deviceType, platform } = detectDeviceInfo()

    const payload: HeartbeatRequest = {
      playerVersion: PLAYER_VERSION,
      deviceType,
      platform,
      uptimeSec,
      metrics: {
        // Basic browser metrics (if available)
        memoryMb: (performance as any).memory?.usedJSHeapSize
          ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
          : undefined,
      },
    }

    await fetch(`${API_URL}/api/v1/channels/${channelId}/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    // Intentionally ignore response - fire and forget
  } catch (error) {
    // Silently ignore errors - don't disrupt player operation
    console.debug('Heartbeat failed (ignored):', error)
  }
}
