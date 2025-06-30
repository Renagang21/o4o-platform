import React, { useState } from 'react'
import { Settings, Image, Palette, Type, Link, AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import MediaSelector from '@/pages/media/components/MediaSelector'
import { MediaFile } from '@/types/content'

interface HeroSectionProps {
  data: {
    title: string
    subtitle: string
    backgroundImage?: string
    backgroundType: 'image' | 'color' | 'gradient'
    backgroundColor?: string
    ctaText?: string
    ctaLink?: string
    ctaStyle?: 'primary' | 'secondary' | 'outline'
    alignment: 'left' | 'center' | 'right'
    height: 'small' | 'medium' | 'large' | 'full'
    overlay?: boolean
    overlayOpacity?: number
  }
  onChange: (data: any) => void
  isSelected?: boolean
}

const HeroSection: React.FC<HeroSectionProps> = ({
  data,
  onChange,
  isSelected
}) => {
  const [showSettings, setShowSettings] = useState(false)
  const [showMediaSelector, setShowMediaSelector] = useState(false)

  const updateData = (key: string, value: any) => {
    onChange({ ...data, [key]: value })
  }

  const handleImageSelect = (files: MediaFile[]) => {
    if (files.length > 0) {
      updateData('backgroundImage', files[0].url)
    }
    setShowMediaSelector(false)
  }

  const getHeightClass = () => {
    switch (data.height) {
      case 'small': return 'h-64'
      case 'medium': return 'h-96'
      case 'large': return 'h-[32rem]'
      case 'full': return 'h-screen'
      default: return 'h-96'
    }
  }

  const getAlignmentClass = () => {
    switch (data.alignment) {
      case 'left': return 'text-left items-start'
      case 'right': return 'text-right items-end'
      default: return 'text-center items-center'
    }
  }

  const getBackgroundStyle = () => {
    if (data.backgroundType === 'image' && data.backgroundImage) {
      return {
        backgroundImage: `url(${data.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    } else if (data.backgroundType === 'gradient') {
      return {
        background: `linear-gradient(135deg, ${data.backgroundColor || '#3b82f6'} 0%, ${data.backgroundColor || '#3b82f6'}dd 100%)`
      }
    } else {
      return {
        backgroundColor: data.backgroundColor || '#3b82f6'
      }
    }
  }

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

      {/* Hero Content */}
      <div 
        className={`relative ${getHeightClass()} flex items-center justify-center overflow-hidden`}
        style={getBackgroundStyle()}
      >
        {/* Overlay */}
        {data.overlay && data.backgroundType === 'image' && (
          <div 
            className="absolute inset-0 bg-black"
            style={{ opacity: (data.overlayOpacity || 40) / 100 }}
          />
        )}

        {/* Content */}
        <div className={`relative z-10 max-w-4xl mx-auto px-6 py-12 flex flex-col ${getAlignmentClass()}`}>
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateData('title', e.currentTarget.textContent)}
          >
            {data.title || '멋진 제목을 입력하세요'}
          </h1>
          
          <p 
            className="text-xl md:text-2xl text-white/90 mb-8"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateData('subtitle', e.currentTarget.textContent)}
          >
            {data.subtitle || '부제목을 입력하세요'}
          </p>

          {data.ctaText && (
            <a 
              href={data.ctaLink || '#'}
              className={`inline-block px-8 py-3 rounded-lg font-medium transition-all ${
                data.ctaStyle === 'secondary' 
                  ? 'bg-white text-gray-900 hover:bg-gray-100'
                  : data.ctaStyle === 'outline'
                  ? 'border-2 border-white text-white hover:bg-white hover:text-gray-900'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {data.ctaText}
            </a>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && isSelected && (
        <div className="absolute top-12 right-2 z-20 bg-white rounded-lg shadow-xl p-4 w-80">
          <h3 className="font-medium text-gray-900 mb-4">히어로 섹션 설정</h3>
          
          <div className="space-y-4">
            {/* Background Type */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">배경 타입</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateData('backgroundType', 'color')}
                  className={`flex-1 p-2 rounded border ${
                    data.backgroundType === 'color' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <Palette className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => updateData('backgroundType', 'gradient')}
                  className={`flex-1 p-2 rounded border ${
                    data.backgroundType === 'gradient' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  그라데이션
                </button>
                <button
                  onClick={() => {
                    updateData('backgroundType', 'image')
                    setShowMediaSelector(true)
                  }}
                  className={`flex-1 p-2 rounded border ${
                    data.backgroundType === 'image' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <Image className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>

            {/* Background Color */}
            {(data.backgroundType === 'color' || data.backgroundType === 'gradient') && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">배경색</label>
                <input
                  type="color"
                  value={data.backgroundColor || '#3b82f6'}
                  onChange={(e) => updateData('backgroundColor', e.target.value)}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
            )}

            {/* Overlay (for images) */}
            {data.backgroundType === 'image' && (
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={data.overlay || false}
                    onChange={(e) => updateData('overlay', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">오버레이 사용</span>
                </label>
                {data.overlay && (
                  <div className="mt-2">
                    <label className="text-xs text-gray-600">투명도</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={data.overlayOpacity || 40}
                      onChange={(e) => updateData('overlayOpacity', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Alignment */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">정렬</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateData('alignment', 'left')}
                  className={`flex-1 p-2 rounded border ${
                    data.alignment === 'left' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <AlignLeft className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => updateData('alignment', 'center')}
                  className={`flex-1 p-2 rounded border ${
                    data.alignment === 'center' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <AlignCenter className="w-4 h-4 mx-auto" />
                </button>
                <button
                  onClick={() => updateData('alignment', 'right')}
                  className={`flex-1 p-2 rounded border ${
                    data.alignment === 'right' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <AlignRight className="w-4 h-4 mx-auto" />
                </button>
              </div>
            </div>

            {/* Height */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">높이</label>
              <select
                value={data.height}
                onChange={(e) => updateData('height', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="small">작게 (16rem)</option>
                <option value="medium">보통 (24rem)</option>
                <option value="large">크게 (32rem)</option>
                <option value="full">전체 화면</option>
              </select>
            </div>

            {/* CTA Button */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">CTA 버튼</label>
              <input
                type="text"
                placeholder="버튼 텍스트"
                value={data.ctaText || ''}
                onChange={(e) => updateData('ctaText', e.target.value)}
                className="w-full mb-2 rounded border-gray-300"
              />
              <input
                type="text"
                placeholder="링크 URL"
                value={data.ctaLink || ''}
                onChange={(e) => updateData('ctaLink', e.target.value)}
                className="w-full mb-2 rounded border-gray-300"
              />
              <select
                value={data.ctaStyle || 'primary'}
                onChange={(e) => updateData('ctaStyle', e.target.value)}
                className="w-full rounded border-gray-300"
              >
                <option value="primary">기본</option>
                <option value="secondary">보조</option>
                <option value="outline">윤곽선</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Media Selector */}
      {showMediaSelector && (
        <MediaSelector
          allowedTypes={['image']}
          multiple={false}
          onSelect={handleImageSelect}
          onClose={() => setShowMediaSelector(false)}
        />
      )}
    </div>
  )
}

export default HeroSection