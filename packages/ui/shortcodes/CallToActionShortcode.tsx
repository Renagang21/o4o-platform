/**
 * [call-to-action] 숏코드 컴포넌트
 */

import React from 'react';
import { ShortcodeRendererProps } from '../../lib/shortcode/renderer';

const CallToActionShortcode: React.FC<ShortcodeRendererProps> = ({
  shortcode,
  editorMode = false
}) => {
  const {
    text = '시작하기',
    link = '#',
    style = 'primary',
    size = 'medium',
    title = '',
    description = '',
    bg_color = '',
    text_color = '',
    alignment = 'center',
    full_width = false,
    target = '_self',
    className = ''
  } = shortcode.attributes;

  const getButtonStyle = (): string => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const styleMap: { [key: string]: string } = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
      secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
      success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
      warning: 'bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-500',
      danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
      outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white focus:ring-blue-500',
      ghost: 'text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
      gradient: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white focus:ring-blue-500'
    };

    return `${baseClasses} ${styleMap[style] || styleMap.primary}`;
  };

  const getButtonSize = (): string => {
    const sizeMap: { [key: string]: string } = {
      small: 'px-4 py-2 text-sm',
      medium: 'px-6 py-3 text-base',
      large: 'px-8 py-4 text-lg',
      xl: 'px-10 py-5 text-xl'
    };
    return sizeMap[size] || sizeMap.medium;
  };

  const getAlignment = (): string => {
    const alignMap: { [key: string]: string } = {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right'
    };
    return alignMap[alignment] || 'text-center';
  };

  const containerStyle: React.CSSProperties = {
    backgroundColor: bg_color || undefined,
    color: text_color || undefined
  };

  const hasContent = title || description;

  return (
    <div 
      className={`call-to-action-shortcode ${editorMode ? 'editor-mode' : ''} ${className}`}
      style={containerStyle}
    >
      <div className={`cta-container ${hasContent ? 'py-12 px-6' : 'py-6'} ${getAlignment()}`}>
        {/* Content Section */}
        {hasContent && (
          <div className="cta-content mb-8 max-w-2xl mx-auto">
            {title && (
              <h2 className="cta-title text-3xl md:text-4xl font-bold mb-4">
                {title}
              </h2>
            )}
            
            {description && (
              <p className="cta-description text-lg md:text-xl opacity-90 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Button Section */}
        <div className="cta-button-container">
          <a
            href={link}
            target={target}
            rel={target === '_blank' ? 'noopener noreferrer' : undefined}
            className={`cta-button ${getButtonStyle()} ${getButtonSize()} ${full_width ? 'w-full' : ''}`}
          >
            <span>{text}</span>
            
            {/* Arrow Icon */}
            <svg 
              className="w-5 h-5 ml-2" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 7l5 5m0 0l-5 5m5-5H6" 
              />
            </svg>
          </a>
        </div>
      </div>

      {editorMode && (
        <div className="shortcode-editor-overlay">
          <div className="shortcode-info bg-blue-500 text-white text-xs px-2 py-1 rounded">
            CTA: {text} ({style} - {size})
          </div>
        </div>
      )}
    </div>
  );
};

export default CallToActionShortcode;