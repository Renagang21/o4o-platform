import { useRef, useEffect, useState } from 'react'
import type { ChannelContent } from '@/api/channels'

interface ContentRendererProps {
  content: ChannelContent
  onVideoEnded?: (durationSec?: number) => void
}

export default function ContentRenderer({ content, onVideoEnded }: ContentRendererProps) {
  const contentType = content.content.contentType
  const contentData = content.content

  switch (contentType) {
    case 'image':
      return <ImageContent content={contentData} />
    case 'video':
      return <VideoContent content={contentData} onEnded={onVideoEnded} />
    case 'html':
      return <HtmlContent content={contentData} />
    case 'rich_text':
    case 'text':
      return <TextContent content={contentData} />
    default:
      return <FallbackContent content={contentData} />
  }
}

// Image content renderer
function ImageContent({ content }: { content: ChannelContent['content'] }) {
  const [loaded, setLoaded] = useState(false)
  const imageUrl = content.featuredImage || (content.metadata?.imageUrl as string)

  if (!imageUrl) {
    return <FallbackContent content={content} />
  }

  return (
    <div className="player-container" style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s' }}>
      <img
        src={imageUrl}
        alt={content.title}
        className="content-image"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          console.error('Image failed to load:', imageUrl)
          e.currentTarget.style.display = 'none'
        }}
      />
    </div>
  )
}

// Video content renderer
function VideoContent({
  content,
  onEnded,
}: {
  content: ChannelContent['content']
  onEnded?: (durationSec?: number) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoUrl = (content.metadata?.videoUrl as string) || content.featuredImage

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Attempt to play the video
    const playPromise = video.play()
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.error('Auto-play was prevented:', error)
        // Try muted autoplay as fallback
        video.muted = true
        video.play().catch(console.error)
      })
    }
  }, [videoUrl])

  const handleVideoEnded = () => {
    const video = videoRef.current
    if (video && onEnded) {
      // Pass the actual video duration in seconds
      const durationSec = Math.round(video.duration || 0)
      onEnded(durationSec)
    }
  }

  if (!videoUrl) {
    return <FallbackContent content={content} />
  }

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      className="content-video"
      autoPlay
      muted
      playsInline
      onEnded={handleVideoEnded}
      onError={(e) => {
        console.error('Video failed to load:', videoUrl, e)
      }}
    />
  )
}

// HTML/iframe content renderer
function HtmlContent({ content }: { content: ChannelContent['content'] }) {
  const htmlUrl = (content.metadata?.htmlUrl as string) || (content.metadata?.url as string)
  const htmlBody = content.body

  // If we have a URL, use iframe
  if (htmlUrl) {
    return (
      <iframe
        src={htmlUrl}
        className="content-html"
        title={content.title}
        sandbox="allow-scripts allow-same-origin"
      />
    )
  }

  // If we have HTML body, render in a sandboxed iframe
  if (htmlBody) {
    const blob = new Blob([htmlBody], { type: 'text/html' })
    const blobUrl = URL.createObjectURL(blob)

    return (
      <iframe
        src={blobUrl}
        className="content-html"
        title={content.title}
        sandbox="allow-scripts"
        onLoad={() => URL.revokeObjectURL(blobUrl)}
      />
    )
  }

  return <FallbackContent content={content} />
}

// Text/Rich text content renderer
function TextContent({ content }: { content: ChannelContent['content'] }) {
  const text = content.body || content.excerpt || content.title

  // Check for custom styling in metadata
  const styles: React.CSSProperties = {
    backgroundColor: (content.metadata?.backgroundColor as string) || '#000',
    color: (content.metadata?.textColor as string) || '#fff',
    fontSize: (content.metadata?.fontSize as string) || '2rem',
    textAlign: (content.metadata?.textAlign as 'left' | 'center' | 'right') || 'center',
  }

  return (
    <div className="content-text" style={styles}>
      {content.body ? (
        <div dangerouslySetInnerHTML={{ __html: content.body }} />
      ) : (
        <p>{text}</p>
      )}
    </div>
  )
}

// Fallback for unknown content types
function FallbackContent({ content }: { content: ChannelContent['content'] }) {
  return (
    <div className="content-text">
      <div>
        <h2 style={{ marginBottom: '1rem' }}>{content.title}</h2>
        {content.excerpt && <p style={{ opacity: 0.7 }}>{content.excerpt}</p>}
      </div>
    </div>
  )
}
