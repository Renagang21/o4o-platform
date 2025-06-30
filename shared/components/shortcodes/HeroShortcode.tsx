/**
 * [hero] 숏코드 컴포넌트
 * 히어로 섹션 렌더링 with 배경 이미지 지원
 */

import React, { useState, useEffect } from 'react';
import { ShortcodeRendererProps } from '../../lib/shortcode/renderer';

interface MediaFile {
  id: string;
  url: string;
  formats?: {
    webp?: Record<string, { url: string }>;
    avif?: Record<string, { url: string }>;
    jpg?: Record<string, { url: string }>;
  };
}

const HeroShortcode: React.FC<ShortcodeRendererProps> = ({
  shortcode,
  apiClient,
  editorMode = false
}) => {
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    title = 'Welcome',
    subtitle = '',
    bg = '',
    bg_color = '',
    bg_overlay = '0.3',
    text_color = 'white',
    text_align = 'center',
    height = 'large',
    cta_text = '',
    cta_link = '',
    cta_style = 'primary',
    className = ''
  } = shortcode.attributes;

  useEffect(() => {
    if (bg && apiClient) {
      loadBackgroundImage();
    }
  }, [bg, apiClient]);

  const loadBackgroundImage = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/admin/media/${bg}`);
      
      if (response.data.success) {
        const mediaFile: MediaFile = response.data.data;
        
        // 최적화된 이미지 URL 선택 (large 사이즈 선호)
        let imageUrl = mediaFile.url;
        
        if (mediaFile.formats) {
          const formats = ['avif', 'webp', 'jpg'] as const;
          for (const format of formats) {
            const formatImages = mediaFile.formats[format];
            if (formatImages) {
              const largeImage = formatImages.large || formatImages.medium || Object.values(formatImages)[0];
              if (largeImage) {
                imageUrl = largeImage.url;
                break;
              }
            }
          }
        }
        
        setBackgroundImage(imageUrl);
      }
    } catch (err) {
      console.error('Error loading background image:', err);
    } finally {
      setLoading(false);
    }
  };

  const getHeightClass = (): string => {
    const heightMap: { [key: string]: string } = {
      small: 'h-64 md:h-80',
      medium: 'h-80 md:h-96',
      large: 'h-96 md:h-[32rem]',
      full: 'h-screen',
      auto: 'py-20 md:py-32'
    };
    return heightMap[height] || heightMap.large;
  };

  const getTextAlignClass = (): string => {
    const alignMap: { [key: string]: string } = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right'
    };
    return alignMap[text_align] || 'text-center';
  };

  const getTextColorClass = (): string => {
    const colorMap: { [key: string]: string } = {
      white: 'text-white',
      black: 'text-black',
      gray: 'text-gray-800',
      blue: 'text-blue-600',
      red: 'text-red-600',
      green: 'text-green-600'
    };
    return colorMap[text_color] || 'text-white';
  };

  const getCTAButtonClass = (): string => {
    const styleMap: { [key: string]: string } = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
      outline: 'border-2 border-white text-white hover:bg-white hover:text-gray-900',
      ghost: 'text-white hover:bg-white hover:bg-opacity-20'
    };
    return styleMap[cta_style] || styleMap.primary;
  };

  const backgroundStyle: React.CSSProperties = {
    backgroundColor: bg_color || undefined,
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };

  return (
    <section 
      className={`hero-shortcode relative ${getHeightClass()} ${editorMode ? 'editor-mode' : ''} ${className}`}
      style={backgroundStyle}
    >
      {/* Background Overlay */}
      {(backgroundImage || bg_color) && bg_overlay && Number(bg_overlay) > 0 && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: Number(bg_overlay) }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
        <div className={`hero-content w-full ${getTextAlignClass()}`}>
          {/* Title */}
          <h1 className={`hero-title text-4xl md:text-5xl lg:text-6xl font-bold mb-4 ${getTextColorClass()}`}>
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p className={`hero-subtitle text-lg md:text-xl lg:text-2xl mb-8 ${getTextColorClass()} opacity-90 max-w-3xl ${text_align === 'center' ? 'mx-auto' : ''}`}>
              {subtitle}
            </p>
          )}

          {/* CTA Button */}
          {cta_text && cta_link && (
            <div className="hero-cta">
              <a
                href={cta_link}
                className={`inline-block px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 transform hover:scale-105 ${getCTAButtonClass()}`}
              >
                {cta_text}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && (
        <div className="absolute top-4 right-4 z-20">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      )}

      {/* Editor Mode Overlay */}
      {editorMode && (
        <div className="shortcode-editor-overlay">
          <div className="shortcode-info bg-blue-500 text-white text-xs px-2 py-1 rounded">
            Hero: {title} {backgroundImage && '(with background)'}
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroShortcode;