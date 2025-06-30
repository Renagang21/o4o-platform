import React, { useState } from 'react'
import { Settings, Play, Video } from 'lucide-react'

interface VideoEmbedProps {
  data: {
    url: string
    provider?: 'youtube' | 'vimeo' | 'direct'
    aspectRatio: '16:9' | '4:3' | '1:1'
    autoplay: boolean
    controls: boolean
    muted: boolean
    poster?: string
    title?: string
  }
  onChange: (data: any) => void
  isSelected?: boolean
}

const VideoEmbed: React.FC<VideoEmbedProps> = ({
  data,
  onChange,
  isSelected
}) => {
  const [showSettings, setShowSettings] = useState(false)

  const updateData = (key: string, value: any) => {
    onChange({ ...data, [key]: value })
  }

  const getEmbedUrl = () => {
    if (!data.url) return ''

    // YouTube URL processing
    if (data.url.includes('youtube.com') || data.url.includes('youtu.be')) {
      let videoId = ''
      
      if (data.url.includes('youtu.be/')) {
        videoId = data.url.split('youtu.be/')[1].split('?')[0]
      } else if (data.url.includes('watch?v=')) {
        videoId = data.url.split('watch?v=')[1].split('&')[0]
      }
      
      if (videoId) {
        const params = new URLSearchParams()
        if (data.autoplay) params.append('autoplay', '1')
        if (data.muted) params.append('mute', '1')
        if (!data.controls) params.append('controls', '0')
        
        return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
      }
    }

    // Vimeo URL processing
    if (data.url.includes('vimeo.com')) {
      const videoId = data.url.split('/').pop()?.split('?')[0]
      if (videoId) {
        const params = new URLSearchParams()
        if (data.autoplay) params.append('autoplay', '1')
        if (data.muted) params.append('muted', '1')
        
        return `https://player.vimeo.com/video/${videoId}?${params.toString()}`
      }
    }

    // Direct video URL
    return data.url
  }

  const detectProvider = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube'
    } else if (url.includes('vimeo.com')) {
      return 'vimeo'
    } else {
      return 'direct'
    }
  }

  const getAspectRatioClass = () => {
    switch (data.aspectRatio) {
      case '4:3': return 'aspect-[4/3]'
      case '1:1': return 'aspect-square'
      default: return 'aspect-video' // 16:9
    }
  }

  const getThumbnail = () => {
    if (data.poster) return data.poster

    // YouTube thumbnail
    if (data.provider === 'youtube' && data.url) {
      let videoId = ''
      if (data.url.includes('youtu.be/')) {
        videoId = data.url.split('youtu.be/')[1].split('?')[0]
      } else if (data.url.includes('watch?v=')) {
        videoId = data.url.split('watch?v=')[1].split('&')[0]
      }
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      }
    }

    return null
  }

  const embedUrl = getEmbedUrl()
  const thumbnail = getThumbnail()

  return (
    <div className={`relative ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      {/* Settings Button */}
      {isSelected && (
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="absolute top-2 right-2 z-10 bg-white rounded-full p-2 shadow-md hover:shadow-lg"
        >
          <Settings className="w-4 h-4" />
        </button>
      )}

      <div className="p-8">
        {!data.url ? (
          /* Empty State */
          <div className="text-center py-12">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">동영상 삽입</h3>
            <p className="text-gray-500 mb-6">YouTube, Vimeo 또는 직접 동영상 URL을 입력하세요.</p>
            {isSelected && (
              <input
                type="url"
                placeholder="동영상 URL을 입력하세요"
                onChange={(e) => {
                  const url = e.target.value
                  updateData('url', url)
                  updateData('provider', detectProvider(url))
                }}
                className="w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            )}
          </div>
        ) : (
          /* Video Player */
          <div className="max-w-4xl mx-auto">
            {/* Title */}
            {data.title && (
              <h3 
                className="text-xl font-semibold text-gray-900 mb-4 text-center"
                contentEditable={isSelected}
                suppressContentEditableWarning
                onBlur={(e) => updateData('title', e.currentTarget.textContent)}
              >
                {data.title}
              </h3>
            )}

            {/* Video Container */}
            <div className={`relative ${getAspectRatioClass()} bg-gray-900 rounded-lg overflow-hidden`}>
              {data.provider === 'direct' ? (
                /* Direct Video */
                <video
                  src={embedUrl}
                  poster={thumbnail || undefined}
                  controls={data.controls}
                  autoPlay={data.autoplay}
                  muted={data.muted}
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Embedded Video */
                <iframe
                  src={embedUrl}
                  title={data.title || 'Video'}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              )}

              {/* Custom Play Button Overlay */}
              {!data.autoplay && thumbnail && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                  <button className="bg-white bg-opacity-90 rounded-full p-4 hover:bg-opacity-100 transition-all">
                    <Play className="w-8 h-8 text-gray-900 ml-1" />
                  </button>
                </div>
              )}
            </div>

            {/* URL Edit */}
            {isSelected && (
              <div className="mt-4">
                <input
                  type="url"
                  value={data.url}
                  onChange={(e) => {
                    const url = e.target.value
                    updateData('url', url)
                    updateData('provider', detectProvider(url))
                  }}
                  placeholder="동영상 URL"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && isSelected && (
        <div className="absolute top-12 right-2 z-20 bg-white rounded-lg shadow-xl p-4 w-64">
          <h3 className="font-medium text-gray-900 mb-4">동영상 설정</h3>
          
          <div className="space-y-4">
            {/* Aspect Ratio */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">비율</label>
              <select
                value={data.aspectRatio}
                onChange={(e) => updateData('aspectRatio', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="16:9">16:9 (와이드)</option>
                <option value="4:3">4:3 (표준)</option>
                <option value="1:1">1:1 (정사각형)</option>
              </select>
            </div>

            {/* Video Options */}
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.autoplay}
                  onChange={(e) => updateData('autoplay', e.target.checked)}
                  className="rounded mr-2"
                />
                <span className="text-sm font-medium text-gray-700">자동 재생</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.controls}
                  onChange={(e) => updateData('controls', e.target.checked)}
                  className="rounded mr-2"
                />
                <span className="text-sm font-medium text-gray-700">컨트롤 표시</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={data.muted}
                  onChange={(e) => updateData('muted', e.target.checked)}
                  className="rounded mr-2"
                />
                <span className="text-sm font-medium text-gray-700">음소거</span>
              </label>
            </div>

            {/* Title */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">제목</label>
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => updateData('title', e.target.value)}
                placeholder="동영상 제목"
                className="w-full rounded border-gray-300"
              />
            </div>

            {/* Poster Image */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">포스터 이미지</label>
              <input
                type="url"
                value={data.poster || ''}
                onChange={(e) => updateData('poster', e.target.value)}
                placeholder="썸네일 이미지 URL"
                className="w-full rounded border-gray-300"
              />
            </div>

            {/* Provider Info */}
            {data.provider && (
              <div className="text-xs text-gray-500">
                제공업체: {data.provider === 'youtube' ? 'YouTube' : data.provider === 'vimeo' ? 'Vimeo' : '직접 업로드'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoEmbed