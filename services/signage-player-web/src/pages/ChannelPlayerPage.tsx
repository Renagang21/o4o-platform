import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  fetchChannel,
  fetchChannelByCode,
  fetchChannelContents,
  isChannelPlayable,
  getContentDuration,
  sendPlaybackLog,
  sendHeartbeat,
  type Channel,
  type ChannelContent,
} from '@/api/channels'
import ContentRenderer from '@/components/ContentRenderer'
import LoadingState from '@/components/LoadingState'
import EmptyState from '@/components/EmptyState'
import InactiveState from '@/components/InactiveState'
import ErrorState from '@/components/ErrorState'

type PlayerState = 'loading' | 'playing' | 'empty' | 'inactive' | 'error'

// Heartbeat interval in milliseconds (60 seconds)
const HEARTBEAT_INTERVAL_MS = 60000

export default function ChannelPlayerPage() {
  const { channelId, code } = useParams<{ channelId?: string; code?: string }>()

  const [playerState, setPlayerState] = useState<PlayerState>('loading')
  const [channel, setChannel] = useState<Channel | null>(null)
  const [contents, setContents] = useState<ChannelContent[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const refreshTimerRef = useRef<number | null>(null)
  const contentTimerRef = useRef<number | null>(null)

  // Playback logging refs (WO-P5-CHANNEL-PLAYBACK-LOG-P0)
  const playbackStartTimeRef = useRef<Date | null>(null)

  // Heartbeat refs (WO-P5-CHANNEL-HEARTBEAT-P1)
  const heartbeatTimerRef = useRef<number | null>(null)
  const playerStartTimeRef = useRef<number>(Date.now())

  // Load channel and contents
  const loadChannelData = useCallback(async () => {
    try {
      // Fetch channel by ID or code
      let channelData: Channel
      if (channelId) {
        channelData = await fetchChannel(channelId)
      } else if (code) {
        channelData = await fetchChannelByCode(code)
      } else {
        throw new Error('No channel ID or code provided')
      }

      setChannel(channelData)

      // Check if channel is playable
      if (!isChannelPlayable(channelData)) {
        setPlayerState('inactive')
        return
      }

      // Fetch contents
      const response = await fetchChannelContents(channelData.id)

      if (response.contents.length === 0) {
        setContents([])
        setPlayerState('empty')
        return
      }

      // Sort by displayOrder
      const sortedContents = [...response.contents].sort(
        (a, b) => a.displayOrder - b.displayOrder
      )

      setContents(sortedContents)
      setCurrentIndex(0)
      setPlayerState('playing')
      setError(null)
    } catch (err) {
      console.error('Failed to load channel:', err)
      setError(err instanceof Error ? err.message : 'Failed to load channel')
      setPlayerState('error')
    }
  }, [channelId, code])

  // Initial load
  useEffect(() => {
    loadChannelData()
  }, [loadChannelData])

  // Set up refresh interval
  useEffect(() => {
    if (!channel || !channel.autoplay) return

    const refreshInterval = channel.refreshIntervalSec * 1000
    if (refreshInterval <= 0) return

    refreshTimerRef.current = window.setInterval(() => {
      loadChannelData()
    }, refreshInterval)

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }
    }
  }, [channel, loadChannelData])

  // Track playback start time when content changes (WO-P5-CHANNEL-PLAYBACK-LOG-P0)
  useEffect(() => {
    if (playerState === 'playing' && contents.length > 0) {
      playbackStartTimeRef.current = new Date()
    }
  }, [playerState, currentIndex, contents.length])

  // Heartbeat effect (WO-P5-CHANNEL-HEARTBEAT-P1)
  useEffect(() => {
    if (!channel) return

    // Calculate uptime in seconds
    const getUptimeSec = () => Math.round((Date.now() - playerStartTimeRef.current) / 1000)

    // Send initial heartbeat immediately
    sendHeartbeat(channel.id, getUptimeSec())

    // Set up periodic heartbeat
    heartbeatTimerRef.current = window.setInterval(() => {
      sendHeartbeat(channel.id, getUptimeSec())
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
      }
    }
  }, [channel])

  // Send playback log helper
  const logPlayback = useCallback((completed: boolean, actualDurationSec?: number) => {
    if (!channel || contents.length === 0) return

    const currentContent = contents[currentIndex]
    if (!currentContent) return

    const startTime = playbackStartTimeRef.current
    if (!startTime) return

    // Calculate duration
    const durationSec = actualDurationSec ?? Math.round((Date.now() - startTime.getTime()) / 1000)

    // Send playback log (fire-and-forget)
    sendPlaybackLog(channel.id, {
      contentId: currentContent.content.id,
      durationSec,
      completed,
      playedAt: startTime.toISOString(),
    })
  }, [channel, contents, currentIndex])

  // Handle content advancement (for non-video content)
  const advanceToNextContent = useCallback((actualDurationSec?: number) => {
    if (contents.length === 0) return

    // Log the completed playback before advancing
    logPlayback(true, actualDurationSec)

    setCurrentIndex((prev) => (prev + 1) % contents.length)
  }, [contents.length, logPlayback])

  // Set up content timer (for image/text content)
  useEffect(() => {
    if (playerState !== 'playing' || contents.length === 0 || !channel) {
      return
    }

    const currentContent = contents[currentIndex]
    if (!currentContent) return

    // Video handles its own timing via onEnded
    if (currentContent.content.contentType === 'video') {
      return
    }

    const duration = getContentDuration(currentContent, channel.defaultDurationSec)
    if (duration <= 0) return

    const durationSec = Math.round(duration / 1000)

    contentTimerRef.current = window.setTimeout(() => {
      advanceToNextContent(durationSec)
    }, duration)

    return () => {
      if (contentTimerRef.current) {
        clearTimeout(contentTimerRef.current)
      }
    }
  }, [playerState, contents, currentIndex, channel, advanceToNextContent])

  // Handle video ended
  const handleVideoEnded = useCallback((videoDurationSec?: number) => {
    advanceToNextContent(videoDurationSec)
  }, [advanceToNextContent])

  // Render based on state
  if (playerState === 'loading') {
    return <LoadingState />
  }

  if (playerState === 'error') {
    return <ErrorState message={error || 'An error occurred'} onRetry={loadChannelData} />
  }

  if (playerState === 'inactive' && channel) {
    return <InactiveState channel={channel} />
  }

  if (playerState === 'empty') {
    return <EmptyState channelName={channel?.name} />
  }

  // Playing state
  const currentContent = contents[currentIndex]
  if (!currentContent) {
    return <EmptyState channelName={channel?.name} />
  }

  return (
    <div className="player-container">
      <ContentRenderer
        key={currentContent.id}
        content={currentContent}
        onVideoEnded={handleVideoEnded}
      />
    </div>
  )
}
