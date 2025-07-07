// src/components/image/ResponsiveImageEnhanced.tsx
import React, { useState, useCallback, useEffect } from 'react'
import styled from 'styled-components'
import { ProcessedImage } from '../../services/image/types'
import { BlurManager } from '../../utils/blurUtils'
import { performanceMonitor } from '../../utils/performanceUtils'

interface ResponsiveImageProps {
  image: ProcessedImage
  alt: string
  className?: string
  priority?: boolean
  showOriginalToggle?: boolean
  enableBlurPlaceholder?: boolean
  onLoad?: () => void
  onError?: (error: Error) => void
}

const ImageContainer = styled.div`
  position: relative;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  border-radius: 8px;
`

const StyledImage = styled.img<{ 
  $isLoading: boolean
  $hasBlur: boolean
}>`
  max-width: 100%;
  height: auto;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: ${props => props.$isLoading ? 0 : 1};
  filter: ${props => props.$hasBlur && props.$isLoading ? 'blur(4px)' : 'none'};
  transform: ${props => props.$isLoading ? 'scale(1.02)' : 'scale(1)'};
  z-index: 2;
  position: relative;
`

const BlurPlaceholder = styled.div<{ 
  $aspectRatio: number
  $blurDataURL: string
  $isVisible: boolean
}>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url(${props => props.$blurDataURL});
  background-size: cover;
  background-position: center;
  filter: blur(20px);
  transform: scale(1.1);
  z-index: 1;
  opacity: ${props => props.$isVisible && props.$blurDataURL ? 1 : 0};
  transition: opacity 0.4s ease;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.1) 0%,
      rgba(255,255,255,0.2) 25%,
      rgba(255,255,255,0.1) 50%,
      rgba(255,255,255,0.2) 75%,
      rgba(255,255,255,0.1) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2s infinite ease-in-out;
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    50% { background-position: 100% 0; }
    100% { background-position: 200% 0; }
  }
`

const QualityToggle = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  z-index: 3;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: rgba(0, 0, 0, 0.8);
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`

const LoadingIndicator = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  color: #666;
  backdrop-filter: blur(10px);
  
  &::before {
    content: '';
    width: 16px;
    height: 16px;
    border: 2px solid #e0e0e0;
    border-top: 2px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`

const ErrorPlaceholder = styled.div<{ $aspectRatio: number }>`
  width: 100%;
  aspect-ratio: ${props => props.$aspectRatio};
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  border-radius: 8px;
  padding: 20px;
  
  .icon {
    font-size: 32px;
    margin-bottom: 8px;
    opacity: 0.5;
  }
  
  .message {
    font-size: 14px;
    text-align: center;
  }
`

export const ResponsiveImageEnhanced: React.FC<ResponsiveImageProps> = ({
  image,
  alt,
  className,
  priority = false,
  showOriginalToggle = false,
  enableBlurPlaceholder = true,
  onLoad,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [showOriginal, setShowOriginal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blurDataURL, setBlurDataURL] = useState<string>('')
  const [loadStartTime] = useState(performance.now())

  // Blur placeholder 생성
  useEffect(() => {
    if (enableBlurPlaceholder) {
      const blurManager = BlurManager.getInstance()
      const thumbnailSrc = image.variants.thumbnail || image.variants.mobile
      
      if (thumbnailSrc) {
        blurManager.getBlurPlaceholder(thumbnailSrc)
          .then(setBlurDataURL)
          .catch(() => setBlurDataURL(''))
      }
    }
  }, [image, enableBlurPlaceholder])

  const handleLoad = useCallback(() => {
    const loadTime = performance.now() - loadStartTime
    
    // 성능 메트릭 기록
    performanceMonitor.recordMetric('image-load-time', loadTime, 'ms', {
      src: currentSrc,
      hasBlur: !!blurDataURL,
      priority
    })
    
    setIsLoading(false)
    onLoad?.()
  }, [onLoad, loadStartTime, blurDataURL, priority])

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false)
    const errorMsg = '이미지를 불러올 수 없습니다.'
    setError(errorMsg)
    onError?.(new Error(errorMsg))
    
    // 에러 메트릭 기록
    performanceMonitor.recordMetric('image-error', 1, 'count', {
      src: currentSrc,
      alt
    })
  }, [onError, alt])

  const toggleOriginal = () => {
    setShowOriginal(!showOriginal)
    
    // 품질 변경 메트릭 기록
    performanceMonitor.recordMetric('quality-toggle', 1, 'count', {
      newQuality: !showOriginal ? 'original' : 'optimized'
    })
  }

  // 표시할 이미지 결정
  const currentSrc = showOriginal 
    ? image.original 
    : image.variants.desktop || image.variants.tablet || image.variants.mobile

  const generateSrcSet = () => {
    if (showOriginal) return undefined
    
    const srcSetParts: string[] = []
    
    if (image.variants.mobile) {
      srcSetParts.push(`${image.variants.mobile} 640w`)
    }
    if (image.variants.tablet) {
      srcSetParts.push(`${image.variants.tablet} 1024w`)
    }
    if (image.variants.desktop) {
      srcSetParts.push(`${image.variants.desktop} 1920w`)
    }
    
    return srcSetParts.length > 0 ? srcSetParts.join(', ') : undefined
  }

  const generateSizes = () => {
    if (showOriginal) return undefined
    return "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorPlaceholder $aspectRatio={image.metadata.aspectRatio}>
          <div className="icon">🖼️</div>
          <div className="message">이미지를 불러올 수 없습니다</div>
        </ErrorPlaceholder>
      </div>
    )
  }

  return (
    <ImageContainer className={className}>
      {/* Blur Placeholder */}
      {enableBlurPlaceholder && blurDataURL && (
        <BlurPlaceholder 
          $aspectRatio={image.metadata.aspectRatio}
          $blurDataURL={blurDataURL}
          $isVisible={isLoading}
        />
      )}
      
      {/* Loading Indicator */}
      {isLoading && priority && (
        <LoadingIndicator>
          고품질 이미지 로딩 중...
        </LoadingIndicator>
      )}
      
      {/* Main Image */}
      <StyledImage
        src={currentSrc}
        srcSet={generateSrcSet()}
        sizes={generateSizes()}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        onLoad={handleLoad}
        onError={handleError}
        $isLoading={isLoading}
        $hasBlur={enableBlurPlaceholder}
        decoding="async"
      />
      
      {/* Quality Toggle */}
      {showOriginalToggle && (
        <QualityToggle onClick={toggleOriginal}>
          {showOriginal ? '✨ 최적화' : '🔍 원본'}
        </QualityToggle>
      )}
    </ImageContainer>
  )
}

// 기존 컴포넌트 유지를 위한 별칭
export const ResponsiveImage = ResponsiveImageEnhanced
