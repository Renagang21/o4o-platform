/**
 * [image] 숏코드 컴포넌트
 * 백엔드 Media API와 연동하여 최적화된 이미지 렌더링
 */

import React, { useState, useEffect } from 'react';
import { ShortcodeRendererProps } from '../../lib/shortcode/renderer';

interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  altText?: string;
  caption?: string;
  sizes?: Record<string, MediaSize>;
  formats?: ImageFormats;
}

interface MediaSize {
  name: string;
  width: number;
  height: number;
  url: string;
  fileSize: number;
  mimeType: string;
}

interface ImageFormats {
  webp: Record<string, MediaSize>;
  avif?: Record<string, MediaSize>;
  jpg: Record<string, MediaSize>;
}

const ImageShortcode: React.FC<ShortcodeRendererProps> = ({
  shortcode,
  apiClient,
  editorMode = false
}) => {
  const [mediaFile, setMediaFile] = useState<MediaFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    id,
    size = 'medium',
    alt,
    caption,
    link,
    target = '_self',
    className = '',
    lazy = true,
    format = 'auto'
  } = shortcode.attributes;

  useEffect(() => {
    if (!id || !apiClient) {
      setError('Image ID is required');
      setLoading(false);
      return;
    }

    loadMediaFile();
  }, [id, apiClient]);

  const loadMediaFile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get(`/admin/media/${id}`);
      if (response.data.success) {
        setMediaFile(response.data.data);
      } else {
        setError('Failed to load image');
      }
    } catch (err) {
      console.error('Error loading media file:', err);
      setError('Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  const getOptimizedImageUrl = (): string => {
    if (!mediaFile) return '';

    // 포맷 우선순위: AVIF > WebP > JPG
    const formatPriority = format === 'auto' 
      ? ['avif', 'webp', 'jpg'] 
      : [format, 'webp', 'jpg'];

    for (const fmt of formatPriority) {
      const formatImages = mediaFile.formats?.[fmt as keyof ImageFormats];
      if (formatImages && formatImages[size as string]) {
        return formatImages[size as string].url;
      }
    }

    // Fallback to original URL
    return mediaFile.url;
  };

  const getImageSrcSet = (): string => {
    if (!mediaFile?.formats) return '';
    
    const srcSets: string[] = [];
    const formats = ['avif', 'webp', 'jpg'] as const;
    
    for (const fmt of formats) {
      const formatImages = mediaFile.formats[fmt];
      if (formatImages) {
        Object.entries(formatImages).forEach(([sizeName, sizeData]) => {
          srcSets.push(`${sizeData.url} ${sizeData.width}w`);
        });
        break; // 첫 번째 사용 가능한 포맷만 사용
      }
    }
    
    return srcSets.join(', ');
  };

  const getImageSizes = (): string => {
    switch (size) {
      case 'thumbnail': return '(max-width: 150px) 100vw, 150px';
      case 'small': return '(max-width: 300px) 100vw, 300px';
      case 'medium': return '(max-width: 768px) 100vw, 768px';
      case 'large': return '(max-width: 1024px) 100vw, 1024px';
      case 'original': return '100vw';
      default: return '(max-width: 768px) 100vw, 768px';
    }
  };

  const handleImageError = () => {
    setError('Failed to load image');
  };

  if (loading) {
    return (
      <div className={`image-shortcode loading ${className}`}>
        <div className="image-placeholder animate-pulse bg-gray-200 rounded">
          <div className="flex items-center justify-center h-32">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  if (error || !mediaFile) {
    return (
      <div className={`image-shortcode error ${className}`}>
        <div className="image-error bg-red-50 border border-red-200 rounded p-4 text-center">
          <svg className="w-8 h-8 text-red-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-red-600 text-sm">{error || 'Image not found'}</p>
          {editorMode && (
            <p className="text-xs text-gray-500 mt-1">ID: {id}</p>
          )}
        </div>
      </div>
    );
  }

  const imageUrl = getOptimizedImageUrl();
  const srcSet = getImageSrcSet();
  const sizes = getImageSizes();
  const imageAlt = alt || mediaFile.altText || mediaFile.originalName || 'Image';

  const imageElement = (
    <img
      src={imageUrl}
      srcSet={srcSet || undefined}
      sizes={sizes}
      alt={imageAlt}
      className={`shortcode-image ${className}`}
      loading={lazy ? 'lazy' : 'eager'}
      onError={handleImageError}
      width={mediaFile.width}
      height={mediaFile.height}
    />
  );

  const content = (
    <figure className={`image-shortcode ${editorMode ? 'editor-mode' : ''}`}>
      {link ? (
        <a 
          href={link} 
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        >
          {imageElement}
        </a>
      ) : (
        imageElement
      )}
      
      {(caption || mediaFile.caption) && (
        <figcaption className="image-caption text-sm text-gray-600 mt-2 text-center">
          {caption || mediaFile.caption}
        </figcaption>
      )}
      
      {editorMode && (
        <div className="shortcode-editor-overlay">
          <div className="shortcode-info bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Image: {mediaFile.originalName} ({size})
          </div>
        </div>
      )}
    </figure>
  );

  return content;
};

export default ImageShortcode;