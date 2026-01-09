/**
 * Channel API Client for Signage Player
 * WO-P5-SIGNAGE-PLAYER-WEB-P0
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr'

export type ChannelType = 'tv' | 'kiosk' | 'signage' | 'web'
export type ChannelStatus = 'active' | 'inactive' | 'maintenance'
export type Orientation = 'landscape' | 'portrait'

export interface Channel {
  id: string
  organizationId: string
  serviceKey: string
  name: string
  code: string
  description?: string
  type: ChannelType
  slotKey: string
  status: ChannelStatus
  resolution?: string
  orientation: Orientation
  autoplay: boolean
  refreshIntervalSec: number
  defaultDurationSec: number
  location?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ChannelContent {
  id: string
  slotId: string
  contentId: string
  slotKey: string
  scope: string
  displayOrder: number
  isActive: boolean
  startDate?: string
  endDate?: string
  content: {
    id: string
    title: string
    slug: string
    contentType: string
    status: string
    body?: string
    excerpt?: string
    featuredImage?: string
    metadata?: Record<string, unknown>
    publishedAt?: string
  }
}

export interface ChannelContentsResponse {
  channel: Channel
  contents: ChannelContent[]
  totalCount: number
}

/**
 * Fetch channel by ID
 */
export async function fetchChannel(channelId: string): Promise<Channel> {
  const response = await fetch(`${API_URL}/api/v1/channels/${channelId}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Channel not found')
    }
    throw new Error(`Failed to fetch channel: ${response.status}`)
  }

  return response.json()
}

/**
 * Fetch channel by code
 */
export async function fetchChannelByCode(code: string): Promise<Channel> {
  const response = await fetch(`${API_URL}/api/v1/channels?code=${encodeURIComponent(code)}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch channel: ${response.status}`)
  }

  const result = await response.json()

  if (!result.data || result.data.length === 0) {
    throw new Error('Channel not found')
  }

  return result.data[0]
}

/**
 * Fetch channel contents for playback
 */
export async function fetchChannelContents(channelId: string): Promise<ChannelContentsResponse> {
  const response = await fetch(`${API_URL}/api/v1/channels/${channelId}/contents`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Channel not found')
    }
    throw new Error(`Failed to fetch channel contents: ${response.status}`)
  }

  return response.json()
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
