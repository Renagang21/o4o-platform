/**
 * 숏코드 렌더러 시스템
 * React 컴포넌트로 숏코드 변환 및 렌더링
 */

import React from 'react';
import { ParsedShortcode, ShortcodeParser } from './parser';

export interface ShortcodeRendererProps {
  shortcode: ParsedShortcode;
  apiClient?: any;
  editorMode?: boolean;
}

export type ShortcodeComponent = React.ComponentType<ShortcodeRendererProps>;

export interface ShortcodeRegistry {
  [name: string]: {
    component: ShortcodeComponent;
    schema?: any;
    category?: string;
    description?: string;
    icon?: string;
    preview?: string;
  };
}

export class ShortcodeRenderer {
  private static registry: ShortcodeRegistry = {};

  /**
   * 숏코드 컴포넌트 등록
   */
  static register(
    name: string,
    component: ShortcodeComponent,
    options?: {
      schema?: any;
      category?: string;
      description?: string;
      icon?: string;
      preview?: string;
    }
  ) {
    this.registry[name.toLowerCase()] = {
      component,
      ...options
    };
  }

  /**
   * 등록된 숏코드 목록 조회
   */
  static getRegistry(): ShortcodeRegistry {
    return { ...this.registry };
  }

  /**
   * 특정 숏코드 정보 조회
   */
  static getShortcode(name: string) {
    return this.registry[name.toLowerCase()];
  }

  /**
   * 텍스트 콘텐츠를 React 컴포넌트로 렌더링
   */
  static render(
    content: string,
    options?: {
      apiClient?: any;
      editorMode?: boolean;
      onShortcodeClick?: (shortcode: ParsedShortcode) => void;
    }
  ): React.ReactNode[] {
    const { apiClient, editorMode = false, onShortcodeClick } = options || {};
    const shortcodes = ShortcodeParser.parseShortcodes(content);
    
    if (shortcodes.length === 0) {
      return [content];
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    shortcodes.forEach((shortcode, index) => {
      // 숏코드 이전의 텍스트 추가
      if (shortcode.position.start > lastIndex) {
        const textBefore = content.substring(lastIndex, shortcode.position.start);
        if (textBefore) {
          elements.push(<span key={`text-${index}-before`}>{textBefore}</span>);
        }
      }

      // 숏코드 렌더링
      const shortcodeInfo = this.registry[shortcode.name];
      if (shortcodeInfo) {
        const ShortcodeComponent = shortcodeInfo.component;
        elements.push(
          <div
            key={`shortcode-${index}`}
            className={`shortcode-wrapper ${editorMode ? 'shortcode-editor-mode' : ''}`}
            onClick={() => onShortcodeClick?.(shortcode)}
            data-shortcode={shortcode.name}
          >
            <ShortcodeComponent
              shortcode={shortcode}
              apiClient={apiClient}
              editorMode={editorMode}
            />
          </div>
        );
      } else {
        // 등록되지 않은 숏코드는 원본 텍스트로 표시
        elements.push(
          <span
            key={`unknown-shortcode-${index}`}
            className="shortcode-unknown"
            title={`Unknown shortcode: ${shortcode.name}`}
          >
            {shortcode.originalMatch}
          </span>
        );
      }

      lastIndex = shortcode.position.end;
    });

    // 마지막 숏코드 이후의 텍스트 추가
    if (lastIndex < content.length) {
      const textAfter = content.substring(lastIndex);
      if (textAfter) {
        elements.push(<span key="text-after">{textAfter}</span>);
      }
    }

    return elements;
  }

  /**
   * 숏코드를 플레인 텍스트로 렌더링 (SEO/RSS 등)
   */
  static renderToText(content: string): string {
    return ShortcodeParser.replaceShortcodes(content, (shortcode) => {
      const shortcodeInfo = this.registry[shortcode.name];
      
      if (shortcodeInfo && shortcodeInfo.preview) {
        return shortcodeInfo.preview;
      }
      
      // 기본 텍스트 변환
      switch (shortcode.name) {
        case 'image':
          return `[Image: ${shortcode.attributes.alt || 'Image'}]`;
        case 'product-grid':
          return `[Product Grid: ${shortcode.attributes.category || 'All Products'}]`;
        case 'hero':
          return shortcode.attributes.title || '[Hero Section]';
        case 'contact-form':
          return '[Contact Form]';
        default:
          return `[${shortcode.name}]`;
      }
    });
  }

  /**
   * 숏코드 카테고리별 그룹핑
   */
  static getShortcodesByCategory(): { [category: string]: string[] } {
    const categories: { [category: string]: string[] } = {};
    
    Object.entries(this.registry).forEach(([name, info]) => {
      const category = info.category || 'General';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(name);
    });
    
    return categories;
  }

  /**
   * 숏코드 검색
   */
  static searchShortcodes(query: string): string[] {
    const searchTerm = query.toLowerCase();
    return Object.entries(this.registry)
      .filter(([name, info]) => 
        name.includes(searchTerm) || 
        info.description?.toLowerCase().includes(searchTerm) ||
        info.category?.toLowerCase().includes(searchTerm)
      )
      .map(([name]) => name);
  }
}

/**
 * React Hook for shortcode rendering
 */
export function useShortcodeRenderer(
  content: string,
  options?: {
    apiClient?: any;
    editorMode?: boolean;
    onShortcodeClick?: (shortcode: ParsedShortcode) => void;
  }
) {
  return React.useMemo(() => {
    return ShortcodeRenderer.render(content, options);
  }, [content, options?.apiClient, options?.editorMode]);
}

/**
 * Shortcode Content Component
 */
export interface ShortcodeContentProps {
  content: string;
  apiClient?: any;
  editorMode?: boolean;
  onShortcodeClick?: (shortcode: ParsedShortcode) => void;
  className?: string;
}

export const ShortcodeContent: React.FC<ShortcodeContentProps> = ({
  content,
  apiClient,
  editorMode = false,
  onShortcodeClick,
  className = ''
}) => {
  const renderedContent = useShortcodeRenderer(content, {
    apiClient,
    editorMode,
    onShortcodeClick
  });

  return (
    <div className={`shortcode-content ${className}`}>
      {renderedContent}
    </div>
  );
};

export default ShortcodeRenderer;