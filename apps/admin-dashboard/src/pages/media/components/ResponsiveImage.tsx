import React, { useState, useEffect, useRef } from 'react'
import { MediaFile } from '@/types/content'
import { ContentApi } from '@/api/contentApi'

interface ResponsiveImageProps {
  mediaId: string
  alt?: string
  className?: string
  sizes?: string
  loading?: 'lazy' | 'eager'
  priority?: boolean
  quality?: number
  format?: 'auto' | 'webp' | 'avif' | 'jpg'
  fallback?: string
  onLoad?: () => void
  onError?: (error: Error) => void
  
  // Size constraints
  width?: number
  height?: number
  maxWidth?: number
  maxHeight?: number
  aspectRatio?: string
  
  // Responsive behavior
  breakpoints?: {
    mobile?: string
    tablet?: string
    desktop?: string
  }
  
  // Advanced options
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none'
  objectPosition?: string
  placeholder?: 'blur' | 'empty' | string
  placeholderColor?: string
}

interface ImageSizes {
  thumbnail: string  // 150x150
  small: string     // 300px max
  medium: string    // 768px max
  large: string     // 1200px max
  original: string  // 2400px max
}

interface ImageFormats {
  webp: ImageSizes
  avif?: ImageSizes
  jpg: ImageSizes
}

const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  mediaId,
  alt = '',
  className = '',
  sizes,
  loading = 'lazy',
  priority = false,
  quality: _quality = 85,
  format = 'auto',
  fallback,
  onLoad,
  onError,
  width,
  height,
  maxWidth,
  maxHeight,
  aspectRatio,
  breakpoints,
  objectFit = 'cover',
  objectPosition = 'center',
  placeholder = 'blur',
  placeholderColor = '#f3f4f6'
}) => {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null)
  const [imageFormats, setImageFormats] = useState<ImageFormats | null>(null)
  const [loadingState, setLoadingState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [currentSrc, setCurrentSrc] = useState<string>('')
  const [placeholderSrc, setPlaceholderSrc] = useState<string>('')
  const imgRef = useRef<HTMLImageElement>(null)
  const [isIntersecting, setIsIntersecting] = useState(!loading || priority)

  useEffect(() => {
    loadMediaFile()
  }, [mediaId])

  useEffect(() => {
    if (loading === 'lazy' && !priority) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true)
            observer.disconnect()
          }
        },
        { threshold: 0.1, rootMargin: '50px' }
      )

      if (imgRef.current) {
        observer.observe(imgRef.current)
      }

      return () => observer.disconnect()
    }
  }, [loading, priority])

  const loadMediaFile = async () => {
    try {
      const response = await ContentApi.getMediaFile(mediaId)
      const file = response.data
      
      setMediaFile(file)
      
      // Parse the available sizes and formats from the media file
      const formats = parseImageFormats(file)
      setImageFormats(formats)
      
      // Generate placeholder
      if (placeholder === 'blur') {
        setPlaceholderSrc(generatePlaceholder(file))
      }
      
    } catch (error) {
      console.error('Failed to load media file:', error)
      setLoadingState('error')
      onError?.(error as Error)
    }
  }

  const parseImageFormats = (file: MediaFile): ImageFormats => {
    // Parse the sizes JSON to extract all available formats and sizes
    const sizes = file.sizes || []
    
    const formats: ImageFormats = {
      webp: {
        thumbnail: '',
        small: '',
        medium: '',
        large: '',
        original: ''
      },
      jpg: {
        thumbnail: '',
        small: '',
        medium: '',
        large: '',
        original: ''
      }
    }

    // Build URLs for each format and size
    const baseUrl = '/uploads'
    const [year, month] = file.uploadedAt.split('-')
    const datePath = `${year}/${month.padStart(2, '0')}`

    // Generate URLs for each size and format
    const sizeNames = ['thumbnail', 'small', 'medium', 'large', 'original']
    
    sizeNames.forEach(sizeName => {
      const sizeData = sizes.find(s => s.name === sizeName)
      if (sizeData) {
        const filename = file.filename.replace(/\.[^/.]+$/, '') // Remove extension
        
        // WebP format
        formats.webp[sizeName as keyof ImageSizes] = 
          `${baseUrl}/${datePath}/${sizeName}/${filename}.webp`
        
        // AVIF format (if supported)
        if (supportsAVIF()) {
          if (!formats.avif) formats.avif = { thumbnail: '', small: '', medium: '', large: '', original: '' }
          formats.avif[sizeName as keyof ImageSizes] = 
            `${baseUrl}/${datePath}/${sizeName}/${filename}.avif`
        }
        
        // JPG fallback
        formats.jpg[sizeName as keyof ImageSizes] = 
          `${baseUrl}/${datePath}/${sizeName}/${filename}.jpg`
      }
    })

    return formats
  }

  const supportsAVIF = (): boolean => {
    // Check if browser supports AVIF
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/avif').indexOf('image/avif') !== -1
  }

  const supportsWebP = (): boolean => {
    // Check if browser supports WebP
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').indexOf('image/webp') !== -1
  }

  const generatePlaceholder = (file: MediaFile): string => {
    // Generate a low-quality placeholder image URL
    if (file.thumbnailUrl) {
      return file.thumbnailUrl
    }
    
    // Generate SVG placeholder
    const svg = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${placeholderColor}"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-size="12" font-family="system-ui">
          Loading...
        </text>
      </svg>
    `
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }

  const generateSrcSet = (): string => {
    if (!imageFormats) return ''
    
    // Determine optimal format based on browser support and user preference
    let formatToUse: keyof ImageFormats
    
    if (format === 'auto') {
      if (imageFormats.avif && supportsAVIF()) {
        formatToUse = 'avif'
      } else if (supportsWebP()) {
        formatToUse = 'webp'
      } else {
        formatToUse = 'jpg'
      }
    } else if (format === 'avif' && imageFormats.avif) {
      formatToUse = 'avif'
    } else if (format === 'webp') {
      formatToUse = 'webp'
    } else {
      formatToUse = 'jpg'
    }

    const selectedFormat = imageFormats[formatToUse]
    
    // Build srcset with different sizes
    const srcSetEntries = [
      `${selectedFormat?.small} 300w`,
      `${selectedFormat?.medium} 768w`,
      `${selectedFormat?.large} 1200w`,
      `${selectedFormat?.original} 2400w`
    ].filter(entry => !entry.includes('undefined'))

    return srcSetEntries.join(', ')
  }

  const generateSizes = (): string => {
    if (sizes) return sizes
    
    // Auto-generate sizes based on breakpoints or defaults
    if (breakpoints) {
      const sizeQueries = []
      
      if (breakpoints.mobile) {
        sizeQueries.push(`(max-width: 640px) ${breakpoints.mobile}`)
      }
      if (breakpoints.tablet) {
        sizeQueries.push(`(max-width: 1024px) ${breakpoints.tablet}`)
      }
      if (breakpoints.desktop) {
        sizeQueries.push(breakpoints.desktop)
      }
      
      return sizeQueries.join(', ') || '100vw'
    }
    
    // Default responsive sizes
    if (maxWidth) {
      return `(max-width: 640px) 100vw, (max-width: 1024px) 50vw, ${maxWidth}px`
    }
    
    return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
  }

  const generateSrc = (): string => {
    if (!imageFormats) return fallback || ''

    // Determine the best source for the src attribute
    let formatToUse: keyof ImageFormats = 'jpg' // Always fallback to JPG for src
    
    const selectedFormat = imageFormats[formatToUse]
    
    // Choose appropriate size based on specified dimensions
    if (width && width <= 150) return selectedFormat.thumbnail
    if (width && width <= 300) return selectedFormat.small
    if (width && width <= 768) return selectedFormat.medium
    if (width && width <= 1200) return selectedFormat.large
    
    return selectedFormat.medium // Default to medium size
  }

  const handleLoad = () => {
    setLoadingState('loaded')
    onLoad?.()
  }

  const handleError = () => {
    setLoadingState('error')
    if (fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback)
    } else {
      onError?.(new Error('Failed to load image'))
    }
  }

  useEffect(() => {
    if (isIntersecting && imageFormats) {
      setCurrentSrc(generateSrc())
    }
  }, [isIntersecting, imageFormats])

  const imageStyle: React.CSSProperties = {
    width,
    height,
    maxWidth,
    maxHeight,
    aspectRatio,
    objectFit,
    objectPosition,
    transition: 'opacity 0.3s ease-in-out',
    opacity: loadingState === 'loaded' ? 1 : 0
  }

  const placeholderStyle: React.CSSProperties = {
    ...imageStyle,
    opacity: loadingState === 'loaded' ? 0 : 1,
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  }

  if (!mediaFile) {
    return (
      <div 
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height, maxWidth, maxHeight, aspectRatio }}
      />
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height, maxWidth, maxHeight, aspectRatio }}>
      {/* Placeholder */}
      {placeholder && loadingState !== 'loaded' && (
        <img
          src={placeholderSrc || `data:image/svg+xml;base64,${btoa(`<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${placeholderColor}"/></svg>`)}`}
          alt=""
          style={placeholderStyle}
          className="blur-sm"
        />
      )}
      
      {/* Main Image */}
      {isIntersecting && (
        <picture>
          {/* AVIF format (most modern) */}
          {imageFormats?.avif && (
            <source
              srcSet={Object.entries(imageFormats.avif)
                .filter(([_, url]: any) => url)
                .map(([size, url]) => {
                  const widths = { thumbnail: 150, small: 300, medium: 768, large: 1200, original: 2400 }
                  return `${url} ${widths[size as keyof typeof widths]}w`
                })
                .join(', ')}
              sizes={generateSizes()}
              type="image/avif"
            />
          )}
          
          {/* WebP format (modern) */}
          {imageFormats?.webp && (
            <source
              srcSet={Object.entries(imageFormats.webp)
                .filter(([_, url]: any) => url)
                .map(([size, url]) => {
                  const widths = { thumbnail: 150, small: 300, medium: 768, large: 1200, original: 2400 }
                  return `${url} ${widths[size as keyof typeof widths]}w`
                })
                .join(', ')}
              sizes={generateSizes()}
              type="image/webp"
            />
          )}
          
          {/* JPG fallback */}
          <img
            ref={imgRef}
            src={currentSrc}
            srcSet={generateSrcSet()}
            sizes={generateSizes()}
            alt={alt || mediaFile.altText || mediaFile.name}
            style={imageStyle}
            loading={loading}
            onLoad={handleLoad}
            onError={handleError}
            decoding="async"
          />
        </picture>
      )}

      {/* Error state */}
      {loadingState === 'error' && (
        <div 
          className="flex items-center justify-center bg-gray-100 text-gray-400"
          style={{ width, height, maxWidth, maxHeight, aspectRatio }}
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  )
}

export default ResponsiveImage

// Utility function for easy usage
export const useResponsiveImage = (mediaId: string) => {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadMedia = async () => {
      try {
        setLoading(true)
        const response = await ContentApi.getMediaFile(mediaId)
        setMediaFile(response.data)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    if (mediaId) {
      loadMedia()
    }
  }, [mediaId])

  return { mediaFile, loading, error }
}

// Simple version for when you just need a basic responsive image
export const SimpleResponsiveImage: React.FC<{
  mediaId: string
  alt?: string
  className?: string
  width?: number
  height?: number
}> = ({ mediaId, alt, className, width, height }) => {
  return (
    <ResponsiveImage
      mediaId={mediaId}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading="lazy"
      format="auto"
      placeholder="blur"
    />
  )
}